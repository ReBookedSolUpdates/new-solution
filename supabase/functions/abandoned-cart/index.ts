import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildAbandonedCartEmail } from "../_shared/email-templates.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FROM_EMAIL = "info@rebookedsolutions.co.za";
const FROM_NAME = "ReBooked Solutions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};



Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Find cart abandonment logs older than 10 minutes that haven't been emailed
    const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: pending, error } = await supabase
      .from("cart_abandonment_logs")
      .select("*")
      .is("email_sent_at", null)
      .is("recovered_at", null)
      .lte("created_at", cutoff)
      .limit(50);

    if (error) throw error;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const log of pending) {
      const items = log.item_titles.map((title: string, i: number) => ({
        title,
        price: log.item_prices[i] ?? 0,
      }));
      const htmlContent = buildAbandonedCartEmail(log.user_name || "there", items, log.total_value ?? 0);

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ email: log.user_email, name: log.user_name || "" }],
          subject: "✨ Your cart is waiting — don't let these items go!",
          htmlContent,
        }),
      });

      if (res.ok) {
        await supabase
          .from("cart_abandonment_logs")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", log.id);
        sent++;
      }
    }

    return new Response(JSON.stringify({ success: true, processed: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("abandoned-cart error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
