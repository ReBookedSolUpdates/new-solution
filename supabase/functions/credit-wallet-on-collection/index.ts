import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { EMAIL_FOOTER } from "../../../shared/email-footer.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSellerCreditEmail } from "../_shared/email-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation helper
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    let requestData;
    try {
      const bodyText = await req.text();
      requestData = bodyText ? JSON.parse(bodyText) : {};
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "INVALID_JSON",
          message: "Request body must be valid JSON"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id, seller_id } = requestData;

    // Validate required fields
    if (!order_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "VALIDATION_FAILED",
          message: "order_id is required"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!seller_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "VALIDATION_FAILED",
          message: "seller_id is required"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUIDs
    if (!isValidUUID(order_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "INVALID_UUID",
          message: "order_id must be a valid UUID"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidUUID(seller_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "INVALID_UUID",
          message: "seller_id must be a valid UUID"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get order details with seller info
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total_amount, book_id, status, delivery_status, seller_email, seller_full_name, items")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ORDER_NOT_FOUND",
          message: orderError?.message || "Order not found",
          order_id
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Check if book_id exists
    if (!order.book_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "NO_BOOK_ID",
          message: "Order does not have a book_id/item_id",
          order_id
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper to find item details from books, uniforms, or school_supplies tables
    const findItem = async (itemId: string) => {
      const tables = ['books', 'uniforms', 'school_supplies'];
      for (const table of tables) {
        const { data } = await supabase
          .from(table)
          .select("id, price, title")
          .eq("id", itemId)
          .maybeSingle();
        if (data) return { data, table };
      }
      return { data: null, table: null };
    };

    const { data: itemData } = await findItem(order.book_id);

    let bookPrice = 0;
    let itemTitle = "Marketplace Item";

    if (itemData) {
      bookPrice = Number(itemData.price);
      itemTitle = itemData.title;
    } else {
      console.log("⚠️ Item not found in tables, attempting fallback to orders.items metadata");
      const orderItems = Array.isArray(order.items) ? order.items : [];
      const orderItem = orderItems[0];
      if (orderItem) {
        bookPrice = Number(orderItem.price || orderItem.amount || 0);
        itemTitle = orderItem.title || orderItem.name || "Marketplace Item";
      }
    }

    if (!bookPrice || bookPrice <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "INVALID_ITEM_PRICE",
          message: "Item price is invalid or zero",
          book_id: order.book_id,
          book_price: bookPrice
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call RPC with explicit numeric type cast (converted to cents)
    const { data: creditResult, error: creditError } = await supabase
      .rpc('credit_wallet_on_collection', {
        p_seller_id: seller_id,
        p_order_id: order_id,
        p_book_price: Math.round(bookPrice * 100).toString(),
      });

    if (creditError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "RPC_ERROR",
          message: creditError.message || "Failed to credit wallet via RPC",
          details: {
            order_id,
            seller_id,
            book_price: bookPrice,
            error: creditError.message
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check RPC response
    if (!creditResult || !Array.isArray(creditResult) || creditResult.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "INVALID_RPC_RESPONSE",
          message: "Unexpected response from wallet credit function",
          order_id,
          seller_id
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rpcResult = creditResult[0];

    if (!rpcResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "WALLET_CREDIT_FAILED",
          message: rpcResult.error_message || "Failed to credit wallet",
          order_id,
          seller_id,
          book_price: bookPrice
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order status to completed
    await supabase
      .from("orders")
      .update({
        status: "completed",
        delivery_status: "delivered",
        updated_at: new Date().toISOString()
      })
      .eq("id", order_id);

    // Get amounts from RPC result (convert cents to rands for notifications and emails)
    const creditAmount = Number(rpcResult.credit_amount) / 100;
    const newBalance = Number(rpcResult.new_balance) / 100;

    // Get seller details from order
    const sellerEmail = order.seller_email;
    const sellerName = order.seller_full_name || "Seller";

    if (sellerEmail) {
      // Create in-app notification
      try {
        await supabase.from("notifications").insert({
          user_id: seller_id,
          type: "success",
          title: "💰 Payment Received!",
          message: `Credit of R${creditAmount.toFixed(2)} has been added to your wallet for "${itemTitle}". New balance: R${newBalance.toFixed(2)}`
        });
      } catch (notificationError) {
        console.error("Failed to create app notification:", notificationError);
      }

      // Send email notification
      try {
        // Determine commission rate for email based on seller's subscription tier
        let commissionRate = 10; // default for individual and Business Free
        try {
          const { data: sellerProfile } = await supabase
            .from("profiles")
            .select("is_business, subscription_tier")
            .eq("id", seller_id)
            .maybeSingle();
          if (sellerProfile?.is_business && sellerProfile?.subscription_tier === "tier1") {
            commissionRate = 6.5;
          }
        } catch (_) {
          // fall back to 10% default
        }

        const emailHtml = buildSellerCreditEmail(
          sellerName,
          itemTitle,
          bookPrice,
          creditAmount,
          order_id,
          newBalance,
          commissionRate
        );

        // Create a service role client for function invocation
        const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
          global: {
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
              apikey: SUPABASE_SERVICE_KEY,
            },
          },
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        await serviceClient.functions.invoke("send-email", {
          body: {
            to: sellerEmail,
            subject: '💰 Payment Received - Credit Added to Your Account - ReBooked Solutions',
            html: emailHtml,
            text: `Payment Received! Credit of R${creditAmount.toFixed(2)} has been added to your wallet for "${itemTitle}". New balance: R${newBalance.toFixed(2)}`,
          },
        });
      } catch (emailError) {
        console.error("Failed to send credit notification email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Wallet credited successfully based on seller commission tier",
        order_id,
        seller_id,
        payment_method: "wallet_credit",
        book_price: bookPrice,
        credit_amount: creditAmount * 100, // keep response contract in cents
        percentage: "90%"
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
