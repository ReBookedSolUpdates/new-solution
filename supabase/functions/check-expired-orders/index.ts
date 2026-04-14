import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[check-expired-orders] Running pending_commit 48h auto-cancel...');

    const expiryCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: expiredOrders, error: expiredFetchError } = await supabase
      .from('orders')
      .select('id, item_id, item_type')
      .eq('status', 'pending_commit')
      .lt('created_at', expiryCutoff);

    if (expiredFetchError) {
      throw expiredFetchError;
    }

    const expired = expiredOrders || [];
    for (const order of expired) {
      try {
        const cancelResponse = await fetch(`${supabaseUrl}/functions/v1/cancel-order-with-refund`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_id: order.id,
            cancelled_by: "admin",
            reason: "Order auto-cancelled: seller did not commit within 48 hours",
          }),
        });

        if (!cancelResponse.ok) {
          const errorText = await cancelResponse.text();
          console.error(`[check-expired-orders] Failed to auto-cancel order ${order.id}: ${errorText}`);
          continue;
        }
      } catch (cancelError) {
        console.error(`[check-expired-orders] Failed to auto-cancel order ${order.id}:`, cancelError);
        continue;
      }

      if (!order.item_id || !order.item_type) continue;
      const tableMap: Record<string, string> = {
        'book': 'books',
        'uniform': 'uniforms',
        'school_supply': 'school_supplies',
        'stationery': 'school_supplies'
      };
      const tableName = tableMap[order.item_type] || order.item_type;
      const { error: relistError } = await supabase
        .from(tableName)
        .update({ sold: false })
        .eq('id', order.item_id);
      if (relistError) {
        console.error(`[check-expired-orders] Failed to relist item ${order.item_id}:`, relistError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Expired pending_commit orders processed',
        processed: expired.length,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[check-expired-orders] Fatal error:', errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
