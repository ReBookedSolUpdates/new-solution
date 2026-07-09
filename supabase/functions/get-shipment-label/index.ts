import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getShippingConfig } from "../_shared/shipping-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TCG_API_KEY_PROD = Deno.env.get("TCG_API_KEY");
const TCG_API_KEY_SANDBOX = Deno.env.get("SANDBOX_TCG_API_KEY");
const TCG_API_KEY = IS_PRODUCTION ? TCG_API_KEY_PROD : (TCG_API_KEY_SANDBOX || TCG_API_KEY_PROD);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { order_id, shipment_id, tracking_reference } = body;

    if (!order_id && !shipment_id && !tracking_reference) {
      throw new Error('order_id, shipment_id, or tracking_reference is required');
    }

    if (!TCG_API_URL) {
      throw new Error(`Shipping URL is not configured in Supabase secrets`);
    }

    if (!TCG_API_KEY) {
      throw new Error(`Shipping API Key is not configured in Supabase secrets`);
    }

    let resolvedShipmentId = shipment_id;
    let resolvedTrackingRef = tracking_reference;

    // If only order_id was provided, look up the tcg_shipment_id from the orders table
    if (order_id && !resolvedShipmentId) {
      const { data: order, error: orderError } = await supabaseService
        .from('orders')
        .select('id, tcg_shipment_id, tracking_number, waybill_url')
        .eq('id', order_id)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      // If we already have a cached waybill, return it
      if (order.waybill_url) {
        console.log('[get-shipment-label] Using cached waybill URL');
        return new Response(
          JSON.stringify({ success: true, url: order.waybill_url, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      resolvedShipmentId = order.tcg_shipment_id;
      resolvedTrackingRef = order.tracking_number;
    }

    if (!resolvedShipmentId && !resolvedTrackingRef) {
      throw new Error('No shipment ID or tracking reference found for this order. Has the shipment been created with The Courier Guy?');
    }

    // ── Strategy 1: Use shipment numeric ID → GET /shipments/label?id={id}
    if (resolvedShipmentId) {
      console.log('[get-shipment-label] Fetching label by ID:', resolvedShipmentId);

      const labelRes = await fetch(
        `${apiUrl}/shipments/label?id=${resolvedShipmentId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${TCG_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!labelRes.ok) {
        const errText = await labelRes.text();
        console.error('[get-shipment-label] TCG label API error:', labelRes.status, errText.substring(0, 300));
        throw new Error(`Courier label API error (${labelRes.status}): ${errText.substring(0, 200)}`);
      }

      const labelData = await labelRes.json();
      const waybillUrl = labelData?.url || labelData?.label_url || labelData?.data?.url;

      if (!waybillUrl) {
        throw new Error('No waybill URL returned from The Courier Guy');
      }

      // Save waybill URL back to orders table
      if (order_id) {
        const { error: updateError } = await supabaseService
          .from('orders')
          .update({ waybill_url: waybillUrl })
          .eq('id', order_id);

        if (updateError) {
          console.error('[get-shipment-label] Failed to save waybill_url:', updateError);
        } else {
          console.log('[get-shipment-label] Saved waybill_url to order:', order_id);
        }
      }

      return new Response(
        JSON.stringify({ success: true, url: waybillUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Strategy 2: Use tracking reference → look up shipment ID first
    if (resolvedTrackingRef) {
      console.log('[get-shipment-label] Looking up shipment by tracking ref:', resolvedTrackingRef);

      const shipmentsRes = await fetch(
        `${apiUrl}/shipments?tracking_reference=${encodeURIComponent(resolvedTrackingRef)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${TCG_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!shipmentsRes.ok) {
        const errText = await shipmentsRes.text();
        throw new Error(`Failed to look up shipment (${shipmentsRes.status}): ${errText.substring(0, 200)}`);
      }

      const shipmentsData = await shipmentsRes.json();
      const shipments = shipmentsData?.shipments || shipmentsData?.data || (Array.isArray(shipmentsData) ? shipmentsData : []);

      if (!shipments.length) {
        throw new Error(`No shipment found for tracking reference: ${resolvedTrackingRef}`);
      }

      const foundShipmentId = shipments[0]?.id;
      if (!foundShipmentId) {
        throw new Error('Shipment found but ID is missing');
      }

      console.log('[get-shipment-label] Resolved shipment ID:', foundShipmentId);

      // Save TCG shipment ID to order for future use
      if (order_id) {
        await supabaseService.from('orders').update({ tcg_shipment_id: String(foundShipmentId) }).eq('id', order_id);
      }

      const labelRes = await fetch(
        `${apiUrl}/shipments/label?id=${foundShipmentId}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${TCG_API_KEY}` },
        }
      );

      if (!labelRes.ok) {
        const errText = await labelRes.text();
        throw new Error(`Label fetch error (${labelRes.status}): ${errText.substring(0, 200)}`);
      }

      const labelData = await labelRes.json();
      const waybillUrl = labelData?.url || labelData?.label_url || labelData?.data?.url;

      if (!waybillUrl) throw new Error('No waybill URL returned from The Courier Guy');

      // Save to orders
      if (order_id) {
        await supabaseService.from('orders').update({ waybill_url: waybillUrl }).eq('id', order_id);
      }

      return new Response(
        JSON.stringify({ success: true, url: waybillUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Unable to retrieve waybill');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[get-shipment-label] Error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
