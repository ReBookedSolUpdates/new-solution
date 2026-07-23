import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (data: any, options: { status?: number; headers?: Record<string, string> } = {}) => {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    let requestBody;
    try {
      const rawBody = await req.text();
      requestBody = JSON.parse(rawBody);
    } catch (error) {
      return jsonResponse({
        success: false,
        error: "INVALID_JSON",
        details: {
          error_message: "Request body must be valid JSON",
          parsing_error: (error as Error).message
        },
      }, { status: 400 });
    }

    const {
      book_id,
      buyer_id,
      seller_id,
      amount,
      payment_reference,
      buyer_email,
      shipping_address
    } = requestBody;

    // Validate required fields
    const missingFields = [];
    if (!book_id) missingFields.push("book_id");
    if (!buyer_id) missingFields.push("buyer_id");
    if (!seller_id) missingFields.push("seller_id");
    if (!amount) missingFields.push("amount");
    if (!payment_reference) missingFields.push("payment_reference");

    if (missingFields.length > 0) {
      return jsonResponse({
        success: false,
        error: "MISSING_REQUIRED_FIELDS",
        details: {
          missing_fields: missingFields,
          provided_fields: Object.keys(requestBody),
          message: "Required fields are missing for book purchase"
        },
      }, { status: 400 });
    }

    // Validate amount format
    if (typeof amount !== "number" || amount <= 0) {
      return jsonResponse({
        success: false,
        error: "INVALID_AMOUNT_FORMAT",
        details: {
          amount_type: typeof amount,
          amount_value: amount,
          message: "Amount must be a positive number"
        },
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get item details and verify availability across all tables
    const findItem = async (id: string, sellerId: string) => {
      const tables = ['books', 'uniforms', 'school_supplies'];
      for (const table of tables) {
        const { data } = await supabase
          .from(table)
          .select("id, title, author, name, price, seller_id, sold, condition, category, image_url")
          .eq("id", id)
          .eq("seller_id", sellerId)
          .eq("sold", false)
          .maybeSingle();
        
        if (data) return { data, table };
      }
      return { data: null, table: null };
    };

    const { data: item, table: itemTable } = await findItem(book_id, seller_id);

    if (!item || !itemTable) {
      return jsonResponse({
        success: false,
        error: "ITEM_NOT_AVAILABLE",
        details: {
          item_id: book_id,
          seller_id,
          message: "Item not found or already sold"
        },
      }, { status: 404 });
    }

    const itemTitle = item.title || item.name || "Item";
    const itemReference = item.author || item.category || "General";

    // Validate amount matches item price
    if (Math.abs(amount - parseFloat(item.price)) > 0.01) {
      return jsonResponse({
        success: false,
        error: "AMOUNT_MISMATCH",
        details: {
          expected_amount: parseFloat(item.price),
          provided_amount: amount,
          message: "Amount does not match item price"
        },
      }, { status: 400 });
    }

    // Get buyer and seller profiles
    const [{ data: buyer, error: buyerError }, { data: seller, error: sellerError }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, phone_number, pickup_address, subaccount_code").eq("id", buyer_id).maybeSingle(),
      supabase.from("profiles").select("id, name, email, phone_number, pickup_address, subaccount_code, is_business, auto_commit, subscription_tier").eq("id", seller_id).maybeSingle()
    ]);

    if (buyerError || !buyer) {
      return jsonResponse({
        success: false,
        error: "BUYER_NOT_FOUND",
        details: {
          buyer_id,
          error_message: buyerError?.message || "Buyer profile not found"
        },
      }, { status: 404 });
    }

    if (sellerError || !seller) {
      return jsonResponse({
        success: false,
        error: "SELLER_NOT_FOUND",
        details: {
          seller_id,
          error_message: sellerError?.message || "Seller profile not found"
        },
      }, { status: 404 });
    }

    // Prevent self-purchase
    if (buyer_id === seller_id) {
      return jsonResponse({
        success: false,
        error: "SELF_PURCHASE_NOT_ALLOWED",
        details: {
          message: "Cannot purchase your own book"
        },
      }, { status: 400 });
    }

    // Resolve item type for the RPC function
    const resolvedItemType = itemTable === 'books' ? 'book' : itemTable === 'uniforms' ? 'uniform' : 'school_supply';
    const finalPaymentRef = payment_reference || `single_book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Call atomic SQL RPC function to process book purchase
    const { data: dbResult, error: dbError } = await supabase.rpc("process_book_purchase_atomic", {
      p_book_id: book_id,
      p_buyer_id: buyer_id,
      p_seller_id: seller_id,
      p_amount: amount,
      p_payment_reference: finalPaymentRef,
      p_buyer_email: buyer_email || buyer.email,
      p_shipping_address: shipping_address || {},
      p_item_type: resolvedItemType,
    });

    if (dbError || !dbResult || !dbResult.success) {
      console.error("[process-book-purchase] Database error running purchase RPC:", dbError || dbResult?.error);
      return jsonResponse({
        success: false,
        error: dbResult?.error ? "PURCHASE_FAILED" : "DATABASE_ERROR",
        details: {
          error_message: dbResult?.error || "Failed to process book purchase atomically",
          database_error: dbError?.message
        },
      }, { status: dbResult?.error ? 409 : 500 });
    }

    const commitDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    const order = {
      id: dbResult.order_id,
      status: "pending_commit",
    };

    // Auto-commit if seller has auto_commit enabled
    if (seller?.auto_commit) {
      console.log(`[process-book-purchase] Seller ${seller_id} has auto_commit enabled. Triggering commit-to-sale...`);
      try {
        const commitResponse = await fetch(`${SUPABASE_URL}/functions/v1/commit-to-sale`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ order_id: order.id })
        });
        const commitResult = await commitResponse.json();
        console.log('[process-book-purchase] commit-to-sale result:', commitResult);
        if (commitResult.success) {
          const { data: updatedOrder } = await supabase
            .from("orders")
            .select("status")
            .eq("id", order.id)
            .maybeSingle();
          if (updatedOrder) {
            order.status = updatedOrder.status;
          }
        }
      } catch (commitError) {
        console.error('[process-book-purchase] Error calling commit-to-sale:', commitError);
      }
    }

    // Create notifications
    const notificationPromises = [
      supabase.from("notifications").insert({
        user_id: buyer_id,
        type: "success",
        title: "Purchase Confirmed!",
        message: `Your purchase of "${itemTitle}" has been confirmed. Total: R${amount.toFixed(2)}. Order ID: ${order.id}`
      }),
      supabase.from("notifications").insert({
        user_id: seller_id,
        type: "info",
        title: "New Sale!",
        message: `You have a new order for "${itemTitle}" worth R${amount.toFixed(2)}. Please commit within 48 hours. Order ID: ${order.id}`
      })
    ];

    await Promise.all(notificationPromises);

    // Log activity
    await supabase.from("order_activity_log").insert({
      order_id: order.id,
      user_id: buyer_id,
      action: "single_item_purchase",
      new_status: "pending_commit",
      metadata: {
        item_id: book_id,
        item_table: itemTable,
        amount,
        payment_reference: finalPaymentRef
      }
    });

    return jsonResponse({
      success: true,
      message: "Book purchase processed successfully",
      order: {
        id: order.id,
        item_id: book_id,
        item_title: itemTitle,
        item_reference: itemReference,
        amount,
        status: order.status,
        commit_deadline: commitDeadline.toISOString(),
        payment_reference: finalPaymentRef,
        seller_name: seller.name || seller.email,
        buyer_name: buyer.name || buyer.email
      }
    });

  } catch (error) {
    // Extract a meaningful error message
    let errorMessage = "Unknown internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = (error as any).message || (error as any).details || (error as any).hint || String(error);
    }

    return jsonResponse({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
      details: {
        error_message: errorMessage,
        error_type: typeof error,
        error_constructor: error?.constructor?.name,
        timestamp: new Date().toISOString(),
        debug_info: {
          full_error: String(error),
          request_processing_failed: true
        }
      },
    }, { status: 500 });
  }
});
