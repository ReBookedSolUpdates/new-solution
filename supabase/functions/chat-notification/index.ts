import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { EMAIL_FOOTER } from "../_shared/email-templates.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, sender_id, content } = await req.json();

    if (!conversation_id || !sender_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      console.error("Conversation not found:", convError);
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine recipient (the other party)
    const recipientId = sender_id === conversation.buyer_id
      ? conversation.seller_id
      : conversation.buyer_id;

    // Get sender and recipient profiles
    const [{ data: sender }, { data: recipient }] = await Promise.all([
      supabase.from("profiles").select("first_name, last_name, email").eq("id", sender_id).single(),
      supabase.from("profiles").select("first_name, last_name, email").eq("id", recipientId).single(),
    ]);

    if (!recipient?.email) {
      console.error("Recipient email not found");
      return new Response(JSON.stringify({ success: true, message: "No recipient email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderName = [sender?.first_name, sender?.last_name].filter(Boolean).join(" ") || "Someone";

    // Item agnostic listing fetch
    let listing = null;
    if (conversation.listing_id) {
      const tables = ['books', 'uniforms', 'school_supplies'];
      for (const table of tables) {
        const { data } = await supabase
          .from(table)
          .select("title, price")
          .eq("id", conversation.listing_id)
          .maybeSingle();
        
        if (data) {
          listing = data;
          break;
        }
      }
    }

    const listingTitle = listing?.title || "a listing";

    // Decide whether to send an email based on conversation notification flags
    // (buyer_notified / seller_notified). This ensures only the first buyer message
    // and the seller's first reply trigger email notifications.
    const isBuyerMessage = sender_id === conversation.buyer_id;
    const sellerNotified = !!(conversation as any).seller_notified;
    const buyerNotified = !!(conversation as any).buyer_notified;

    let shouldSendEmail = false;
    let flagToSet: { [k: string]: boolean } | null = null;

    if (isBuyerMessage && !sellerNotified) {
      shouldSendEmail = true;
      flagToSet = { seller_notified: true };
    } else if (!isBuyerMessage && !buyerNotified) {
      shouldSendEmail = true;
      flagToSet = { buyer_notified: true };
    }

    // Always insert an in-app notification
    await supabase.from("notifications").insert({
      user_id: recipientId,
      title: "New message",
      message: `${senderName} sent you a message about "${listingTitle}"`,
      type: "chat",
    });

    if (!shouldSendEmail) {
      return new Response(JSON.stringify({ success: true, method: "notification" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Standardized Email Template Styles
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Message - ReBooked Marketplace</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f3fef7; padding: 20px; color: #1f4e3d; margin: 0; }
          .container { max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
          .btn { display: inline-block; padding: 12px 20px; background: #3ab26f; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
          .header { background: #3ab26f; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; }
          .info-box-success { background: #f0fdf4; border: 1px solid #10b981; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer-text { background: #f3fef7; color: #1f4e3d; padding: 20px; text-align: center; font-size: 12px; line-height: 1.5; margin: 30px -30px -30px -30px; border-radius: 0 0 10px 10px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;font-size:22px;">💬 New Message Received</h1>
            <p style="margin:5px 0 0;font-size:14px;">You have a new message from ${senderName}</p>
          </div>
          
          <div class="info-box-success">
            <p style="margin: 0; font-size: 12px; color: #166534; text-transform: uppercase;">Regarding Listing</p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #064e3b; font-weight: 600;">${listingTitle}</p>
            ${listing?.price ? `<p style="margin: 2px 0 0 0; font-size: 14px; color: #059669; font-weight: bold;">R${listing.price}</p>` : ""}
          </div>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border-left: 4px solid #10b981; margin-bottom: 24px;">
            <p style="margin: 0; font-style: italic; color: #334155; font-size: 15px;">"${content || "(Media attachment)"}"</p>
          </div>
          
          <div style="text-align: center;">
            <a href="https://rebookedsolutions.co.za/chats" class="btn">Reply Now</a>
          </div>
          
          ${EMAIL_FOOTER}
        </div>
      </body>
      </html>
    `;

    // Rather than hardcoding Brevo, use the internal 'send-email' edge function which is the central registry.
    const { error: sendError } = await supabase.functions.invoke("send-email", {
      body: {
        to: recipient.email,
        subject: `New message from ${senderName} about "${listingTitle}"`,
        html: emailHtml,
      },
    });

    if (sendError) {
      console.error("send-email API error:", sendError);
    }

    // Attempt to mark conversation flags so we don't send duplicate emails later.
    if (flagToSet) {
      try {
        await supabase.from('conversations').update(flagToSet).eq('id', conversation_id);
      } catch (e) {
        // Ignore flag update failures (DB may not have fields yet)
        console.warn('Could not update conversation notification flag', e);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Chat notification error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
