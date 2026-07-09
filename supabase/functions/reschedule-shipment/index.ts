import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getShippingConfig } from "../_shared/shipping-config.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || "";
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || "";
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || "";

    const userClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await userClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id, new_date } = await req.json();
    if (!order_id || !new_date) {
      return new Response(
        JSON.stringify({ success: false, error: "order_id and new_date are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch order details
    const { data: order, error: orderError } = await systemClient
      .from("orders")
      .select("*, buyer:profiles!buyer_id(id, name, email), seller:profiles!seller_id(id, name, email)")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deliveryStatus = (order.delivery_status || "").toLowerCase();
    const isPickupFailed = deliveryStatus === "pickup_failed" || deliveryStatus === "collection-failed-attempt";
    const isDeliveryFailed = deliveryStatus === "delivery-failed-attempt";

    // Fault-based permission check
    let isAuthorized = false;
    let rescheduleType: "pickup" | "delivery" = "pickup";

    if (isPickupFailed) {
      // Pickup failed - seller's fault - only seller can reschedule
      isAuthorized = order.seller_id === user.id;
      rescheduleType = "pickup";
    } else if (isDeliveryFailed) {
      // Delivery failed - buyer's fault - only buyer can reschedule
      isAuthorized = order.buyer_id === user.id;
      rescheduleType = "delivery";
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: You are not authorized to reschedule this shipment based on the current delivery failure." }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get courier shipment ID
    const resolvedShipmentId = order.tcg_shipment_id || order.delivery_data?.shipment_id || order.delivery_data?.id;

    if (!resolvedShipmentId) {
      return new Response(
        JSON.stringify({ success: false, error: "No courier shipment reference found for this order." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call TCG/ShipLogic API to PATCH the shipment date
    const { apiUrl, apiKey, providerName } = getShippingConfig();

    const patchBody: Record<string, any> = {
      id: Number(resolvedShipmentId)
    };

    if (rescheduleType === "pickup") {
      patchBody.collection_min_date = new_date;
    } else {
      patchBody.delivery_min_date = new_date;
    }

    console.log(`[reschedule-shipment] Patching shipment ${resolvedShipmentId} on ${apiUrl} with body:`, JSON.stringify(patchBody));

    const response = await fetch(`${apiUrl}/shipments`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(patchBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[reschedule-shipment] Courier reschedule PATCH failed:`, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Courier API error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await response.json();
    console.log(`[reschedule-shipment] Courier reschedule PATCH success:`, JSON.stringify(responseData));

    // Update order in database
    const updates: Record<string, any> = {
      rescheduled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (rescheduleType === "pickup") {
      updates.pickup_scheduled_at = new_date;
      updates.delivery_status = "pickup_scheduled";
    } else {
      updates.delivery_min_date = new_date; // Assuming delivery_min_date exists or fallback to metadata
      updates.delivery_status = "delivery-assigned"; // Reset status to delivery assigned
    }

    const { error: updateError } = await systemClient
      .from("orders")
      .update(updates)
      .eq("id", order_id);

    if (updateError) {
      console.error(`[reschedule-shipment] Failed to update order in DB:`, updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update order status in database" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Shipment ${rescheduleType} rescheduled successfully to ${new_date} via ${providerName}`,
        data: responseData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[reschedule-shipment] Exception:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
