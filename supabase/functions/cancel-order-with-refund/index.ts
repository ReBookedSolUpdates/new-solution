import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { parseRequestBody } from "../_shared/safe-body-parser.ts";
import { createEmailTemplate } from "../_shared/email-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const IN_TRANSIT_TCG_LABELS = [
  "collected",
  "collected_from_sender",
  "in_transit",
  "out_for_delivery",
  "in transit",
  "out for delivery",
  "ready_for_pickup",
  "ready for pickup",
  "delivered",
  "collected_by_receiver",
];

const isShipmentBeyondPendingPickup = (status?: string | null): boolean => {
  if (!status) return false;
  const normalized = status.toLowerCase().replace(/-/g, "_").trim();
  return IN_TRANSIT_TCG_LABELS.some((label) => normalized.includes(label));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const authHeader = req.headers.get('Authorization');
    const authToken = authHeader?.replace('Bearer ', '') || '';
    const isServiceRoleRequest = authToken === SUPABASE_SERVICE_KEY;

    let user = null;
    let authError = null;

    if (!isServiceRoleRequest && authHeader) {
      const result = await supabase.auth.getUser(authToken);
      user = result.data?.user;
      authError = result.error;
    }

    if (!user && !isServiceRoleRequest) {
      console.error('Authentication failed:', authError?.message || 'No authorization header');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required. Please ensure you are logged in.',
          details: authError?.message || 'Missing authorization header'
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bodyResult = await parseRequestBody<{
      order_id: string;
      reason?: string;
      cancelled_by?: "buyer" | "seller" | "admin";
    }>(req, corsHeaders);
    if (!bodyResult.success) return bodyResult.errorResponse!;

    const { order_id, reason, cancelled_by } = bodyResult.data!;

    // Get order details with all fields needed
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let profile = null;
    if (user?.id) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      profile = data;
    }

    const isAuthorized = isServiceRoleRequest ||
      profile?.role === 'admin' ||
      profile?.role === 'super_admin' ||
      order.buyer_id === user?.id ||
      order.seller_id === user?.id;

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not authorized to cancel this order' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.order_type === 'pickup') {
      const actor =
        cancelled_by ||
        (order.buyer_id === user?.id ? "buyer" : order.seller_id === user?.id ? "seller" : "admin");
      const reviewReason = reason || 'Pickup order cancellation/dispute requested';

      await supabase
        .from('orders')
        .update({
          pickup_status: 'disputed',
          cancellation_reason: `${reviewReason} - manual review required`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order_id);

      await supabase.from('order_activity_log').insert({
        order_id,
        user_id: user?.id || order.buyer_id || order.seller_id,
        activity_type: 'pickup_manual_review_requested',
        description: 'Pickup order cancellation/dispute requested. Manual admin review required; no automatic refund or wallet credit was issued.',
        metadata: {
          order_type: 'pickup',
          pickup_status: 'disputed',
          actor,
          reason: reviewReason,
          refund_automated: false,
          shipment_cancelled: false,
        },
      });

      try {
        await supabase.from('order_notifications').insert([
          {
            order_id,
            user_id: order.buyer_id,
            type: 'pickup_review_required',
            title: 'Pickup Review Requested',
            message: 'This pickup order has been sent to ReBooked support for manual review. No automatic refund has been issued.',
          },
          {
            order_id,
            user_id: order.seller_id,
            type: 'pickup_review_required',
            title: 'Pickup Review Requested',
            message: 'This pickup order has been sent to ReBooked support for manual review. No automatic refund has been issued.',
          },
        ]);
      } catch {
        // Non-blocking.
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Pickup order flagged for manual review. No automatic refund or shipment cancellation was performed.',
          data: {
            order_id,
            pickup_status: 'disputed',
            refund_processed: false,
            shipment_cancelled: false,
            manual_review_required: true,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    // Shipment status guard: track shipment before allowing cancellation.
    let liveShipmentStatus = order.delivery_status || "";
    if (order.tracking_number || order.id) {
      try {
        const trackUrl = `${SUPABASE_URL}/functions/v1/track-shipment`;
        const trackResponse = await fetch(trackUrl, {
          method: "POST",
          headers: {
            "Authorization": authHeader!,
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            order_id: order.id,
            tracking_reference: order.tracking_number,
          }),
        });
        const trackJson = await trackResponse.json();
        if (trackResponse.ok && trackJson?.success) {
          liveShipmentStatus =
            trackJson?.tracking?.shipments?.[0]?.status ||
            trackJson?.tracking?.status ||
            liveShipmentStatus;
        }
      } catch {
        // Keep existing delivery status if tracking call fails.
      }
    }

    if (isShipmentBeyondPendingPickup(liveShipmentStatus) || isShipmentBeyondPendingPickup(order.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "this order has already been collected and can no longer be cancelled — contact support",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 1: Cancel shipment via unified cancel-shipment function
    let shipmentCancelled = false;
    let shipmentCancelError = null;

    if (order.tracking_number || order.id) {
      try {
        const cancelShipmentUrl = `${SUPABASE_URL}/functions/v1/cancel-shipment`;

        const shipmentResponse = await fetch(cancelShipmentUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
          },
          body: JSON.stringify({
            tracking_reference: order.tracking_number,
            order_id: order.id,
          }),
        });

        const shipmentResult = await shipmentResponse.json();

        if (shipmentResponse.ok && shipmentResult.success) {
          shipmentCancelled = true;
        } else {
          shipmentCancelError = shipmentResult.error || 'Unknown error';
        }
      } catch (error: any) {
        shipmentCancelError = error.message;
      }
    }

    // STEP 2: Process refund with BobPay (if cash was paid)
    let refundProcessed = false;
    let refundId = null;
    let refundAmount = 0;

    const isFullyWalletPaid = order.wallet_deducted_amount && order.wallet_deducted_amount >= order.amount;

    if (!isFullyWalletPaid) {
      try {
        const refundUrl = `${SUPABASE_URL}/functions/v1/bobpay-refund`;

        const refundResponse = await fetch(refundUrl, {
          method: 'POST',
          headers: {
            'Authorization': isServiceRoleRequest ? `Bearer ${SUPABASE_SERVICE_KEY}` : authHeader!,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            order_id: order_id,
            reason: reason || 'Order cancelled by user',
          }),
        });

        const refundResult = await refundResponse.json();

        if (refundResponse.ok && refundResult.success) {
          refundProcessed = true;
          refundId = refundResult.data?.refund_id;
          refundAmount = Number(refundResult.data?.amount || 0);
        } else {
          throw new Error(refundResult.error || 'Refund processing failed');
        }
      } catch (error: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Refund failed: ${error.message}`,
            shipment_cancelled: shipmentCancelled,
            shipment_cancel_error: shipmentCancelError,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      refundProcessed = true;
    }

    // STEP 2.5: Process wallet refund if applicable
    if (order.wallet_deducted_amount && order.wallet_deducted_amount > 0) {
      console.log(`Refunding wallet deduction of ${order.wallet_deducted_amount} cents to buyer ${order.buyer_id}`);
      const { error: walletError } = await supabase.rpc("credit_wallet_on_refund", {
        p_user_id: order.buyer_id,
        p_amount: order.wallet_deducted_amount,
        p_order_id: order.id,
        p_reason: `Refund for cancelled order ${order.order_id}`
      });
      if (walletError) {
        console.error("❌ Failed to refund wallet amount:", walletError);
      } else {
        refundAmount += (order.wallet_deducted_amount / 100);
      }
    }

    // STEP 3: Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        refund_status: 'completed',
        refunded_at: new Date().toISOString(),
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || 'Order cancelled by user',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    // STEP 4: Create notifications
    try {
      await supabase.from('order_notifications').insert([
        {
          order_id: order_id,
          user_id: order.buyer_id,
          type: 'order_cancelled',
          title: 'Order Cancelled',
          message: 'Your order has been cancelled and refunded successfully.',
        },
        {
          order_id: order_id,
          user_id: order.seller_id,
          type: 'order_cancelled',
          title: 'Order Cancelled',
          message: 'An order has been cancelled and refunded.',
        },
      ]);
    } catch (notifError) {
      // Notification error - don't fail the whole operation
    }

    // STEP 5: Send cancellation emails to buyer and seller.
    const actor =
      cancelled_by ||
      (order.buyer_id === user?.id ? "buyer" : order.seller_id === user?.id ? "seller" : "admin");
    const actorText = actor === "buyer" ? "buyer" : actor === "seller" ? "seller" : "platform team";
    const cancelReason = reason || "Order cancelled by user";

    const buyerEmailHtml = createEmailTemplate(
      {
        title: "Order Cancelled and Refunded",
        headerText: "Order Cancelled",
        headerType: "warning",
        headerSubtext: `Hello ${order.buyer_full_name || "there"},`,
      },
      `
      <p>Your order has been cancelled by the <strong>${actorText}</strong>.</p>
      <p><strong>Reason:</strong> ${cancelReason}</p>
      <div class="info-box-success">
        <p style="margin: 0;"><strong>Refund confirmed:</strong> ${refundAmount ? `R${Number(refundAmount).toFixed(2)}` : "Your full payment"} has been refunded.</p>
      </div>
      `
    );

    const sellerEmailHtml = createEmailTemplate(
      {
        title: "Order Cancelled",
        headerText: "Order Cancelled",
        headerType: "warning",
        headerSubtext: `Hello ${order.seller_full_name || "there"},`,
      },
      `
      <p>This order has been cancelled by the <strong>${actorText}</strong>.</p>
      <p><strong>Reason:</strong> ${cancelReason}</p>
      <p>The buyer refund has been processed.</p>
      `
    );

    try {
      if (order.buyer_email) {
        await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: order.buyer_email,
            subject: "Order Cancelled - Refund Confirmed",
            html: buyerEmailHtml,
          }),
        });
      }
      if (order.seller_email) {
        await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: order.seller_email,
            subject: "Order Cancelled",
            html: sellerEmailHtml,
          }),
        });
      }
    } catch {
      // Non-blocking: cancellation should not fail due to email provider issues.
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order cancelled and refund processed successfully',
        data: {
          order_id: order_id,
          tracking_number: order.tracking_number,
          shipment_cancelled: shipmentCancelled,
          shipment_cancel_error: shipmentCancelError,
          refund_processed: refundProcessed,
          refund_id: refundId,
          refund_amount: refundAmount,
          refund_status: 'completed',
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});


