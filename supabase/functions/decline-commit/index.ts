import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildBuyerDeclineEmail, buildSellerDeclineEmail } from "../_shared/email-templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[decline-order] Function invoked");

  try {
    const { order_id, seller_id, reason } = await req.json();
    console.log(`[decline-order] Processing order: ${order_id}, seller: ${seller_id}`);

    if (!order_id || !seller_id) {
      console.error("[decline-order] Missing required parameters");
      return new Response(
        JSON.stringify({
          success: false,
          error: "MISSING_PARAMETERS",
          message: "order_id and seller_id are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("[decline-order] Missing Supabase configuration");
      return new Response(
        JSON.stringify({
          success: false,
          error: "ENVIRONMENT_CONFIG_ERROR",
          message: "Supabase configuration missing",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get order details - must be in pending status
    // Call atomic SQL RPC function to decline order and restore inventory in a single database transaction
    const { data: dbResult, error: dbError } = await supabase.rpc("decline_order_and_restore_inventory", {
      p_order_id: order_id,
      p_seller_id: seller_id,
      p_reason: reason || "Seller declined to commit",
    });

    if (dbError || !dbResult || !dbResult.success) {
      console.error("[decline-order] Database error running decline RPC:", dbError || dbResult?.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: dbResult?.error ? "DECLINE_FAILED" : "DATABASE_ERROR",
          message: dbResult?.error || "Failed to decline order and restore inventory",
        }),
        {
          status: dbResult?.error ? 409 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const order = dbResult.order;
    console.log(`[decline-order] Order declined and inventory restored cleanly: ${order.id}`);

    const buyer = {
      id: order.buyer_id,
      email: order.buyer_email,
      name: order.buyer_full_name || "Customer"
    };

    const seller = {
      id: order.seller_id,
      email: order.seller_email,
      name: order.seller_full_name || "Seller"
    };

    // Process BobPay refund if payment reference exists
    let refundResult: { success: boolean; error?: string } = { success: false };
    if (order.payment_reference) {
      console.log("[decline-order] Processing refund for payment reference:", order.payment_reference);

      try {
        const refundResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/bobpay-refund`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({
              order_id: order_id,
              reason: reason || "Order declined by seller",
            }),
          }
        );

        refundResult = await refundResponse.json();
        console.log("[decline-order] Refund result:", refundResult.success ? "Success" : "Failed");
      } catch (refundError) {
        console.error("[decline-order] Refund error:", refundError);
        refundResult = {
          success: false,
          error: refundError instanceof Error ? refundError.message : String(refundError),
        };
      }
    }

    // Create database notifications
    try {
      console.log("[decline-order] Creating notifications");
      const notifications = [];

      if (buyer.id) {
        notifications.push(
          supabase.from("order_notifications").insert({
            order_id: order_id,
            user_id: buyer.id,
            type: "order_declined",
            title: "Order Declined",
            message: `Your order has been declined by the seller. ${refundResult?.success
              ? "Refund processed and will appear in 3-5 business days."
              : "Refund is being processed."
              }`,
            read: false,
          })
        );
      }

      if (seller.id) {
        notifications.push(
          supabase.from("order_notifications").insert({
            order_id: order_id,
            user_id: seller.id,
            type: "order_declined",
            title: "Order Decline Confirmed",
            message: `You have successfully declined the order. The buyer has been notified and refunded.`,
            read: false,
          })
        );
      }

      const notificationResults = await Promise.allSettled(notifications);
      console.log("[decline-order] Notifications created:", notificationResults.length);
    } catch (notificationError) {
      console.error("[decline-order] Notification error:", notificationError);
    }

    // Send email notifications
    try {
      console.log("[decline-order] Sending email notifications");
      const emailPromises = [];

      if (buyer.email) {
        const buyerHtml = buildBuyerDeclineEmail(buyer.name, order_id, order.total_amount || 0, reason || "Seller declined to commit", refundResult?.success || false);

        const buyerText = `Order Declined - Refund Processed\n\nHello ${buyer.name},\n\nWe're sorry to inform you that your order has been declined by the seller.\n\nOrder Details:\nOrder ID: ${order_id}\nAmount: R${order.total_amount?.toFixed(2) || "0.00"}\nReason: ${reason || "Seller declined to commit"}\n\n${refundResult?.success ? "Your refund has been successfully processed and will appear in your account within 3-5 business days." : "Your refund is being processed and will appear in your account within 3-5 business days."}\n\nBrowse Books: https://rebookedsolutions.co.za/books\n\nThis is an automated message from ReBooked Solutions.\nFor assistance, contact: support@rebookedsolutions.co.za`;

        emailPromises.push(
          fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({
              to: buyer.email,
              subject: "Order Declined - Refund Processed",
              html: buyerHtml,
              text: buyerText,
            }),
          })
        );
      }

      if (seller.email) {
        const sellerHtml = buildSellerDeclineEmail(seller.name, order_id, reason || "You declined to commit");

        const sellerText = `Order Decline Confirmation\n\nHello ${seller.name},\n\nYou have successfully declined the order commitment.\n\nOrder Details:\nOrder ID: ${order_id}\nReason: ${reason || "You declined to commit"}\n\nThe buyer has been notified and their payment has been refunded. Your book stock has been automatically restored.\n\nThis is an automated message from ReBooked Solutions.\nFor assistance, contact: support@rebookedsolutions.co.za`;

        emailPromises.push(
          fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({
              to: seller.email,
              subject: "Order Decline Confirmation",
              html: sellerHtml,
              text: sellerText,
            }),
          })
        );
      }

      await Promise.allSettled(emailPromises);
      console.log("[decline-order] Emails sent");
    } catch (emailError) {
      console.error("[decline-order] Email error:", emailError);
    }

    console.log("[decline-order] Order declined successfully");
    return new Response(
      JSON.stringify({
        success: true,
        message: "Order declined successfully. Stock has been automatically released.",
        details: {
          order_id,
          status: "declined",
          declined_at: new Date().toISOString(),
          refund_processed: refundResult?.success || false,
          notifications_sent: {
            buyer: !!buyer.email,
            seller: !!seller.email,
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[decline-order] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "UNEXPECTED_ERROR",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
