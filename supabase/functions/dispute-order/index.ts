import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildDisputeOpenedEmail, buildDisputeResolvedEmail } from "../_shared/email-templates.ts";

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

    // 1. Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized access" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Parse payload
    const body = await req.json();
    const { order_id, reason, action = 'open', resolution = '' } = body;

    if (!order_id) {
      return new Response(JSON.stringify({ success: false, error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ success: false, error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const itemTitle = items[0]?.title || items[0]?.name || items[0]?.book_title || "your listed item";

    if (action === 'open') {
      // Only the buyer can raise a dispute
      if (order.buyer_id !== user.id) {
        return new Response(JSON.stringify({ success: false, error: "Only the buyer can dispute the order" }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!reason) {
        return new Response(JSON.stringify({ success: false, error: "A dispute reason is required" }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update order status to disputed
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'disputed',
          dispute_status: 'open',
          disputed_at: new Date().toISOString(),
          dispute_reason: reason
        })
        .eq('id', order_id);

      if (updateError) {
        throw updateError;
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'dispute_opened',
        entity_type: 'order',
        entity_id: order_id,
        metadata: { reason }
      });

      // Send emails
      const buyerHtml = buildDisputeOpenedEmail(order.buyer_full_name || "Buyer", order.seller_full_name || "Seller", order_id, reason);
      const sellerHtml = buildDisputeOpenedEmail(order.buyer_full_name || "Buyer", order.seller_full_name || "Seller", order_id, reason);

      if (order.buyer_email) {
        await supabase.functions.invoke("send-email", {
          body: { to: order.buyer_email, subject: `Dispute Opened – Order ID: ${order_id}`, html: buyerHtml }
        }).catch((e) => console.error("Buyer dispute email failed:", e));
      }

      if (order.seller_email) {
        await supabase.functions.invoke("send-email", {
          body: { to: order.seller_email, subject: `Dispute Opened – Order ID: ${order_id}`, html: sellerHtml }
        }).catch((e) => console.error("Seller dispute email failed:", e));
      }

      // Try to find the chat conversation and post a system message
      try {
        const { data: convs } = await supabase
          .from('conversations')
          .select('id')
          .eq('buyer_id', order.buyer_id)
          .eq('seller_id', order.seller_id)
          .limit(1);

        if (convs && convs.length > 0) {
          await supabase.from('messages').insert({
            conversation_id: convs[0].id,
            is_system: true,
            message_type: 'system',
            content: `⚖️ Dispute Opened: "${reason}"`
          });
        }
      } catch (chatErr) {
        console.error("Failed to post system message in chat:", chatErr);
      }

      return new Response(JSON.stringify({ success: true, message: "Dispute opened successfully" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'resolve') {
      // Only the seller, buyer or system admin can resolve it (here we allow either party to mark as resolved, or support)
      // For simplicity, we authorize the buyer, seller, or admin
      const isSeller = order.seller_id === user.id;
      const isBuyer = order.buyer_id === user.id;

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.is_admin === true;

      if (!isSeller && !isBuyer && !isAdmin) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized to resolve this dispute" }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const resText = resolution || "Dispute resolved by mutual agreement or support decision.";

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          dispute_status: 'resolved',
          dispute_resolved_at: new Date().toISOString(),
          dispute_resolution: resText,
          status: 'completed' // restore order to completed state (or seller can proceed)
        })
        .eq('id', order_id);

      if (updateError) {
        throw updateError;
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'dispute_resolved',
        entity_type: 'order',
        entity_id: order_id,
        metadata: { resolution: resText }
      });

      // Send emails
      const buyerHtml = buildDisputeResolvedEmail(order.buyer_full_name || "Buyer", order_id, resText);
      const sellerHtml = buildDisputeResolvedEmail(order.seller_full_name || "Seller", order_id, resText);

      if (order.buyer_email) {
        await supabase.functions.invoke("send-email", {
          body: { to: order.buyer_email, subject: `Dispute Resolved – Order ID: ${order_id}`, html: buyerHtml }
        }).catch((e) => console.error("Buyer dispute resolution email failed:", e));
      }

      if (order.seller_email) {
        await supabase.functions.invoke("send-email", {
          body: { to: order.seller_email, subject: `Dispute Resolved – Order ID: ${order_id}`, html: sellerHtml }
        }).catch((e) => console.error("Seller dispute resolution email failed:", e));
      }

      // Try to find the chat conversation and post a system message
      try {
        const { data: convs } = await supabase
          .from('conversations')
          .select('id')
          .eq('buyer_id', order.buyer_id)
          .eq('seller_id', order.seller_id)
          .limit(1);

        if (convs && convs.length > 0) {
          await supabase.from('messages').insert({
            conversation_id: convs[0].id,
            is_system: true,
            message_type: 'system',
            content: `🤝 Dispute Resolved: "${resText}"`
          });
        }
      } catch (chatErr) {
        console.error("Failed to post system message in chat:", chatErr);
      }

      return new Response(JSON.stringify({ success: true, message: "Dispute resolved successfully" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[dispute-order] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
