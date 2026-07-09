import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getShippingConfig } from "../_shared/shipping-config.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildBuyerDeliveryEmail, buildSellerDeliveryEmail } from "../_shared/email-templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';
  const TCG_API_KEY = Deno.env.get("TCG_API_KEY");
  const SANDBOX_TCG_API_KEY = Deno.env.get("SANDBOX_TCG_API_KEY");
  const EMAIL_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-email`;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    console.log(`Starting automated order status update (Production: ${IS_PRODUCTION})...`);

    // 1. Fetch orders that are in transit or scheduled for pickup
    const { data: activeOrders, error: fetchError } = await supabase
      .from("orders")
      .select(`
        id, 
        tracking_number, 
        selected_courier_slug, 
        status, 
        delivery_status, 
        buyer_email, 
        buyer_full_name,
        seller_email,
        seller_full_name,
        items
      `)
      .in("status", ["in_transit", "pickup_scheduled", "committed"])
      .not("tracking_number", "is", null);

    if (fetchError) throw fetchError;

    console.log(`Found ${activeOrders?.length || 0} active orders to check.`);

    const results = [];

    for (const order of (activeOrders || [])) {
      try {
        let courierSlug = order.selected_courier_slug;
        let trackingRef = order.tracking_number;
        
        let apiUrl = TCG_BASE_URL;
        let apiKey = IS_PRODUCTION ? TCG_API_KEY : (SANDBOX_TCG_API_KEY || TCG_API_KEY);
        let providerName = "The Courier Guy";

        // Skip orders from other providers if not using TCG tracking
        if (courierSlug && courierSlug !== "tcg") {
          console.warn(`Skipping order ${order.id} with provider ${courierSlug} as it's not currently supported for automated updates`);
          continue;
        }

        if (!apiKey) {
          console.error(`API Key missing for order ${order.id}`);
          continue;
        }

        const response = await fetch(
          `${apiUrl}/tracking/shipments?tracking_reference=${encodeURIComponent(trackingRef)}`,
          {
            headers: { "Authorization": `Bearer ${apiKey}` },
          }
        );

        if (!response.ok) {
          console.error(`Tracking failed for ${order.id} [${response.status}]:`, await response.text());
          continue;
        }

        const trackingData = await response.json();
        const shipment = trackingData.shipments?.[0] || trackingData;
        const newStatus = shipment.status?.toLowerCase();

        console.log(`Order ${order.id} tracking status: ${newStatus}`);

        // Mapping Logic
        let mappedStatus = order.status;
        let mappedDeliveryStatus = order.delivery_status;

        if (newStatus === 'delivered' || newStatus === 'collected_by_receiver') {
          mappedStatus = 'delivered';
          mappedDeliveryStatus = 'delivered';
        } else if (newStatus === 'in_transit' || newStatus === 'out_for_delivery') {
          mappedStatus = 'in_transit';
          mappedDeliveryStatus = newStatus === 'out_for_delivery' ? 'out_for_delivery' : 'in_transit';
        } else if (newStatus === 'collected_from_sender') {
          mappedStatus = 'in_transit';
          mappedDeliveryStatus = 'in_transit';
        } else if (newStatus === 'collection-failed-attempt') {
          mappedDeliveryStatus = 'pickup_failed';
        } else if (newStatus === 'delivery-failed-attempt') {
          mappedDeliveryStatus = 'delivery-failed-attempt';
        }

        // 2. Update status if changed
        if (mappedStatus !== order.status || mappedDeliveryStatus !== order.delivery_status) {
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              status: mappedStatus,
              delivery_status: mappedDeliveryStatus,
              tracking_data: trackingData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

          if (updateError) throw updateError;

          // 3. Trigger Email if Delivered
          if (mappedStatus === 'delivered' && order.status !== 'delivered') {
            const itemTitle = order.items?.[0]?.title || order.items?.[0]?.name || "Your item(s)";
            const recipientName = order.buyer_full_name || "Valued Customer";
            const sellerName = order.seller_full_name || "Valued Seller";
            const itemPrice = Number(order.items?.[0]?.price ?? 0);
            const payout = (itemPrice * 0.9).toFixed(2);
            
            // Premium HTML for delivery confirmation (Buyer)
            const deliveryHtml = buildBuyerDeliveryEmail(recipientName, itemTitle, order.id, SUPABASE_URL);

            await fetch(EMAIL_FUNCTION_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`
              },
              body: JSON.stringify({
                to: order.buyer_email,
                subject: `Delivered! Confirm receipt for Order #${order.id}`,
                html: deliveryHtml
              })
            }).catch(e => console.error("Failed to send delivery email:", e));

            // Premium HTML for delivery confirmation (Seller)
            if (order.seller_email) {
              const sellerDeliveryHtml = buildSellerDeliveryEmail(sellerName, itemTitle, payout);

              await fetch(EMAIL_FUNCTION_URL, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`
                },
                body: JSON.stringify({
                  to: order.seller_email,
                  subject: `Delivered! Payout pending buyer confirmation for Order #${order.id}`,
                  html: sellerDeliveryHtml
                })
              }).catch(e => console.error("Failed to send seller delivery email:", e));
            }
          }

          results.push({ order_id: order.id, old: order.status, new: mappedStatus });
        }
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processedCount: activeOrders?.length || 0, updates: results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Critical error in update-order-statuses:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
