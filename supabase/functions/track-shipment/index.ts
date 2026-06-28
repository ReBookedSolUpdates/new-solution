import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const IS_PRODUCTION = Deno.env.get("VITE_PRODUCTION") === "true";
const TCG_API_URL = IS_PRODUCTION 
  ? Deno.env.get("TCG_BASE_URL") 
  : (Deno.env.get("SANDBOX_TCG_BASE_URL") || Deno.env.get("TCG_BASE_URL"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tracking_reference, order_id, provider } = await req.json();

    if (!tracking_reference && !order_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Either tracking_reference or order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let trackingRef = tracking_reference;
    let courierSlug = provider;

    // If order_id provided, look up tracking info from database
    if (order_id && !tracking_reference) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? '';
      const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      const { data: order, error } = await supabase
        .from("orders")
        .select("order_type, pickup_status, tracking_number, selected_courier_slug, delivery_data")
        .eq("id", order_id)
        .single();

      if (error || !order) {
        return new Response(
          JSON.stringify({ success: false, error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      trackingRef = order.tracking_number;
      courierSlug = order.selected_courier_slug;

      if (!trackingRef) {
        return new Response(
          JSON.stringify({ success: false, error: "No tracking number found for this order" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Determine API credentials
    const TCG_API_KEY_PROD = Deno.env.get("TCG_API_KEY");
    const TCG_API_KEY_SANDBOX = Deno.env.get("SANDBOX_TCG_API_KEY");
    const TCG_API_KEY = IS_PRODUCTION ? TCG_API_KEY_PROD : (TCG_API_KEY_SANDBOX || TCG_API_KEY_PROD);

    const apiUrl = TCG_API_URL;
    const apiKey = TCG_API_KEY;
    const providerName = "The Courier Guy";

    if (!apiUrl) {
      return new Response(
        JSON.stringify({ success: false, error: `${IS_PRODUCTION ? "TCG_BASE_URL" : "SANDBOX_TCG_BASE_URL"} is not configured` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: `${IS_PRODUCTION ? "TCG_API_KEY" : "SANDBOX_TCG_API_KEY"} is not configured` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Tracking shipment ${trackingRef} via ${providerName}`);

    const response = await fetch(
      `${apiUrl}/tracking/shipments?tracking_reference=${encodeURIComponent(trackingRef)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Tracking failed [${response.status}]:`, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Tracking failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trackingData = await response.json();
    console.log(`Tracking data received for ${trackingRef}`);

    // Optionally update order tracking data in database
    if (order_id) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? '';
      const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      const status = trackingData.shipments?.[0]?.status || trackingData.status;
      
      await supabase
        .from("orders")
        .update({
          delivery_status: status || undefined,
          tracking_data: trackingData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: providerName,
        tracking: trackingData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error tracking shipment:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

