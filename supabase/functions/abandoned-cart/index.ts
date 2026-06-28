import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { EMAIL_FOOTER } from "../../../shared/email-footer.ts";
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

function buildCartEmail(userName: string, items: { title: string; price: number }[], totalValue: number): string {
  const itemRows = items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">${i.title}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#1f4e3d;font-weight:700;font-size:14px;text-align:right;">R${i.price.toFixed(2)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>You left something behind!</title></head>
<body style="font-family:Arial,sans-serif;background:#f3fef7;margin:0;padding:20px;">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#3ab26f,#1f4e3d);padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">✨ Don't let it slip away!</h1>
      <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">You left items in your cart</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hey ${userName},</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px;line-height:1.6;">
        You left some items in your cart on ReBooked Solutions. Good news — they are still available, but don't wait too long! Pre-loved items go fast 🏃♂️
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Item</th>
            <th style="text-align:right;padding:8px 0;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td style="padding:12px 0 0;font-weight:700;color:#1f4e3d;font-size:15px;">Total</td>
            <td style="padding:12px 0 0;font-weight:700;color:#1f4e3d;font-size:15px;text-align:right;">R${totalValue.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://rebookedsolutions.co.za/cart" style="display:inline-block;background:#3ab26f;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Complete My Purchase →</a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;line-height:1.5;">
        This reminder was sent because you had items in your cart.<br>If you've already completed your purchase, please ignore this email.
      </p>
    </div>
    ${EMAIL_FOOTER}
  </div>
</body>
</html>`;
}

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
      const htmlContent = buildCartEmail(log.user_name || "there", items, log.total_value ?? 0);

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
