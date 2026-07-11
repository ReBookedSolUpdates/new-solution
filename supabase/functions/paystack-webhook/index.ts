import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { 
  buildBusinessSubscriptionActivatedEmail,
  buildBusinessPaymentFailedEmail,
  buildBusinessSubscriptionCancelledEmail,
  buildBusinessDowngradedEmail
} from "../_shared/email-templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') || 'sk_test_placeholder_key_value_here';
const PAYSTACK_WEBHOOK_SECRET = Deno.env.get('PAYSTACK_WEBHOOK_SECRET') || PAYSTACK_SECRET_KEY;

// Verifies Paystack HMAC SHA512 signature
async function verifySignature(signature: string | null, rawBody: string, secret: string): Promise<boolean> {
  if (!signature) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody)
    );
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return calculatedSignature === signature;
  } catch (err) {
    console.error('[paystack-webhook] Signature verification failed:', err);
    return false;
  }
}

// Clamp renewal date: if the day-of-month is > 28, set to 28th.
// This ensures subscriptions starting on 29th/30th/31st always renew on the 28th.
function clampRenewalDate(date: Date): Date {
  if (date.getUTCDate() > 28) {
    date.setUTCDate(28);
  }
  return date;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  // 1. Signature check
  const isValid = await verifySignature(signature, rawBody, PAYSTACK_WEBHOOK_SECRET);
  if (!isValid) {
    console.error('[paystack-webhook] Invalid payload signature');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const payload = JSON.parse(rawBody);
  console.log('[paystack-webhook] Received event:', payload.event, payload);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const eventData = payload.data;
    let userId: string | null = null;
    let email: string | null = null;

    // Helper: Resolve User ID from payload fallbacks
    const resolveUser = async () => {
      // 1. Check metadata
      if (eventData.metadata?.user_id) {
        return eventData.metadata.user_id;
      }
      // 2. Check customer email in profiles
      email = eventData.customer?.email;
      if (email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (profile?.id) return profile.id;
      }
      // 3. Check customer code / subscription code in business_subscriptions
      const custCode = eventData.customer?.customer_code;
      const subCode = eventData.subscription_code || eventData.subscription?.subscription_code;
      if (custCode || subCode) {
        let query = supabase.from('business_subscriptions').select('business_id');
        if (custCode) query = query.eq('paystack_customer_code', custCode);
        if (subCode) query = query.eq('paystack_subscription_code', subCode);
        const { data: sub } = await query.maybeSingle();
        if (sub?.business_id) return sub.business_id;
      }
      return null;
    };

    userId = await resolveUser();
    if (!userId) {
      console.warn('[paystack-webhook] Could not resolve user_id for subscription event');
      return new Response(JSON.stringify({ message: 'User not resolved' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Load user/business name details for email
    const { data: profileData } = await supabase
      .from('profiles')
      .select('first_name, last_name, business_name')
      .eq('id', userId)
      .maybeSingle();

    const businessName = profileData?.business_name || [profileData?.first_name, profileData?.last_name].filter(Boolean).join(' ') || 'ReBooked Business Partner';
    const userEmailAddress = email || eventData.customer?.email;

    switch (payload.event) {
      case 'subscription.create':
      case 'charge.success': {
        const rawEnd = eventData.current_period_end 
          ? new Date(eventData.current_period_end)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const currentPeriodEnd = clampRenewalDate(rawEnd).toISOString();

        const currentPeriodStart = eventData.current_period_start
          ? new Date(eventData.current_period_start).toISOString()
          : new Date().toISOString();

        // 1. Upsert business_subscriptions record
        const { error: subErr } = await supabase
          .from('business_subscriptions')
          .upsert({
            business_id: userId,
            tier: 'tier1',
            status: 'active',
            paystack_subscription_code: eventData.subscription_code || eventData.subscription?.subscription_code || null,
            paystack_customer_code: eventData.customer?.customer_code || null,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: eventData.cancel_at_period_end || false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'business_id' });

        if (subErr) throw subErr;

        // 2. Update profiles table
        const { error: profErr } = await supabase
          .from('profiles')
          .update({
            subscription_tier: 'tier1',
            subscription_active_until: currentPeriodEnd
          })
          .eq('id', userId);

        if (profErr) throw profErr;

        // 3. Trigger email
        if (userEmailAddress) {
          const emailHtml = buildBusinessSubscriptionActivatedEmail(businessName, 'Tier 1', 6.5);
          await supabase.functions.invoke('send-email', {
            body: {
              to: userEmailAddress,
              subject: 'Your ReBooked Business Tier 1 is Active! 🚀',
              html: emailHtml,
            }
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Mark subscription status as past_due
        const { error: subErr } = await supabase
          .from('business_subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('business_id', userId);

        if (subErr) throw subErr;

        // Do not immediately revoke access to tier1 (we grant a grace period)
        if (userEmailAddress) {
          const emailHtml = buildBusinessPaymentFailedEmail(businessName);
          await supabase.functions.invoke('send-email', {
            body: {
              to: userEmailAddress,
              subject: 'Action Required: ReBooked Business Subscription Payment Failed ⚠️',
              html: emailHtml,
            }
          });
        }
        break;
      }

      case 'subscription.not_renew': {
        const { error: subErr } = await supabase
          .from('business_subscriptions')
          .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
          .eq('business_id', userId);

        if (subErr) throw subErr;

        // Notify client of cancellation at period end
        if (userEmailAddress) {
          const emailHtml = buildBusinessSubscriptionCancelledEmail(businessName, 'contact display, bulk promotions, restock-republish, and automated messages');
          await supabase.functions.invoke('send-email', {
            body: {
              to: userEmailAddress,
              subject: 'Your ReBooked Business Subscription Cancelled 😔',
              html: emailHtml,
            }
          });
        }
        break;
      }

      case 'subscription.disable': {
        // Downgrade to Free plan immediately
        const { error: subErr } = await supabase
          .from('business_subscriptions')
          .update({
            tier: 'free',
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('business_id', userId);

        if (subErr) throw subErr;

        const { error: profErr } = await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_active_until: null
          })
          .eq('id', userId);

        if (profErr) throw profErr;

        // Trigger downgraded email
        if (userEmailAddress) {
          const emailHtml = buildBusinessDowngradedEmail(businessName, 'contact display, bulk promos, restock-republish, and automated messages');
          await supabase.functions.invoke('send-email', {
            body: {
              to: userEmailAddress,
              subject: 'Your ReBooked Business Account Downgraded to Free',
              html: emailHtml,
            }
          });
        }
        break;
      }

      default:
        console.log('[paystack-webhook] Unhandled Paystack event:', payload.event);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[paystack-webhook] Server error processing webhook:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
