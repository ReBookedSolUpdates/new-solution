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
    const { tracking_reference, order_id } = await req.json();

    if (!tracking_reference && !order_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Either tracking_reference or order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? '';
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let trackingRef = tracking_reference;
    let courierSlug: string | null = null;

    // Look up order if order_id provided
    if (order_id) {
      const { data: order, error } = await supabase
        .from("orders")
        .select("tracking_number, selected_courier_slug")
        .eq("id", order_id)
        .single();

      if (error || !order) {
        return new Response(
          JSON.stringify({ success: false, error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      trackingRef = trackingRef || order.tracking_number;
      courierSlug = order.selected_courier_slug;
    }

    if (!trackingRef) {
      return new Response(
        JSON.stringify({ success: false, error: "No tracking reference found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { apiUrl, apiKey, providerName } = getShippingConfig();

    if (!apiUrl) {
      return new Response(
        JSON.stringify({ success: false, error: `Shipping URL is not configured` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: `Shipping API Key is not configured` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Cancelling shipment ${trackingRef} via ${providerName}`);

    const response = await fetch(`${apiUrl}/shipments/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ tracking_reference: trackingRef }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Cancel failed [${response.status}]:`, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Cancel failed: ${response.status} - ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Shipment ${trackingRef} cancelled successfully`);

    // Update order in database
    if (order_id) {
      await supabase
        .from("orders")
        .update({
          delivery_status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order_id);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Shipment cancelled successfully", provider: providerName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error cancelling shipment:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
