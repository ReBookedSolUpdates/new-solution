import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getShippingConfig } from "../_shared/shipping-config.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, order_id, shipment_id, parcel_id, parcel_data, shipment_data } = body;

    const { apiUrl, apiKey, isProduction } = getShippingConfig();

    if (!apiUrl || !apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Courier API configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? '';
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (action === "update_shipment") {
      if (!shipment_id) throw new Error("shipment_id is required");
      
      const res = await fetch(`${apiUrl}/shipments/${shipment_id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shipment_data || {}),
      });

      const data = await res.json();
      if (!res.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update shipment: ${JSON.stringify(data)}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (order_id) {
        await supabase.from("orders").update({ tracking_data: data, updated_at: new Date().toISOString() }).eq("id", order_id);
      }

      return new Response(
        JSON.stringify({ success: true, shipment: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_parcel") {
      if (!shipment_id) throw new Error("shipment_id is required");
      
      const targetUrl = parcel_id
        ? `${apiUrl}/shipments/${shipment_id}/parcels/${parcel_id}`
        : `${apiUrl}/shipments/${shipment_id}/parcels`;

      const res = await fetch(targetUrl, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parcel_data || {}),
      });

      const data = await res.json();
      if (!res.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update parcel: ${JSON.stringify(data)}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, parcel: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create_return") {
      if (!order_id) throw new Error("order_id is required");

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .single();

      if (orderErr || !order) throw new Error("Order not found");

      const deliveryData = order.delivery_data || {};
      const trackingData = order.tracking_data || {};

      // Swap collection & delivery addresses for return shipment
      const returnPayload = {
        collection_address: trackingData.delivery_address || order.shipping_address_encrypted || {},
        collection_contact: {
          name: order.buyer_full_name || "Buyer",
          email: order.buyer_email || "",
          mobile_number: order.buyer_phone_number || "",
        },
        delivery_address: trackingData.collection_address || order.pickup_address_encrypted || {},
        delivery_contact: {
          name: order.seller_full_name || "Seller",
          email: order.seller_email || "",
          mobile_number: order.seller_phone_number || "",
        },
        parcels: trackingData.parcels || [
          {
            submitted_length_cm: 25,
            submitted_width_cm: 20,
            submitted_height_cm: 10,
            submitted_weight_kg: 1.0,
            parcel_description: `Return for Order #${order_id.slice(0, 8)}`,
          }
        ],
        service_level_code: order.selected_service_code || "ECO",
        customer_reference: `RETURN-${order_id.slice(0, 8)}`,
      };

      const res = await fetch(`${apiUrl}/shipments`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(returnPayload),
      });

      const returnData = await res.json();
      if (!res.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Return shipment creation failed: ${JSON.stringify(returnData)}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const returnTrackingRef = returnData.custom_tracking_reference || returnData.short_tracking_reference || '';

      await supabase.from("orders").update({
        dispute_status: "return_initiated",
        delivery_data: {
          ...deliveryData,
          return_shipment_id: returnData.id,
          return_tracking_reference: returnTrackingRef,
          return_created_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }).eq("id", order_id);

      return new Response(
        JSON.stringify({ success: true, return_shipment: returnData, tracking_reference: returnTrackingRef }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Invalid action: ${action}`);
  } catch (error) {
    console.error("[update-shipment] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
