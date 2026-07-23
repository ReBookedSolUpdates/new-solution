import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  buildGracePeriodDay1Email,
  buildGracePeriodDay2Email,
  buildGracePeriodFinalWarningEmail,
  buildBusinessDowngradedEmail
} from "../_shared/email-templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sandboxKey = Deno.env.get('PAYSTACK_SECRET_KEY_SANDBOX');
const PAYSTACK_SECRET_KEY = sandboxKey || Deno.env.get('PAYSTACK_SECRET_KEY') || 'sk_test_placeholder_key_value_here';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const GRACE_PERIOD_DAYS = 3;
const RECOVERY_URL = 'https://rebookedsolutions.co.za/business-profile?tab=settings_payouts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();
  const results = { detected: 0, reminders: 0, cancelled: 0, errors: [] as string[] };

  try {
    console.log('[paystack-check-subscriptions] Starting subscription health check at', now.toISOString());

    // =====================================================================
    // PHASE 1: Detect missed payments for "active" subscriptions
    // =====================================================================
    // Find subscriptions where current_period_end has passed but status is still 'active'
    // This means Paystack should have charged but we haven't received a success webhook
    const { data: overdueActive, error: activeErr } = await supabase
      .from('business_subscriptions')
      .select('business_id, paystack_subscription_code, paystack_customer_code, current_period_end')
      .eq('status', 'active')
      .eq('tier', 'tier1')
      .not('paystack_subscription_code', 'is', null)
      .lt('current_period_end', now.toISOString());

    if (activeErr) {
      console.error('[paystack-check-subscriptions] Error fetching overdue active subs:', activeErr.message);
      results.errors.push(`Active fetch: ${activeErr.message}`);
    }

    for (const sub of (overdueActive || [])) {
      try {
        // Verify with Paystack what the actual subscription status is
        const paystackStatus = await fetchPaystackSubscriptionStatus(sub.paystack_subscription_code);
        console.log(`[paystack-check-subscriptions] Paystack status for ${sub.paystack_subscription_code}:`, paystackStatus);

        if (paystackStatus !== 'active') {
          // Payment failed — transition to past_due and start grace period
          const graceEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
          
          const { error: updateErr } = await supabase
            .from('business_subscriptions')
            .update({
              status: 'past_due',
              payment_failed_at: now.toISOString(),
              grace_period_end: graceEnd.toISOString(),
              grace_reminders_sent: 0,
              updated_at: now.toISOString()
            })
            .eq('business_id', sub.business_id);

          if (updateErr) throw updateErr;

          // Send Day 1 grace period email
          await sendGraceEmail(supabase, sub.business_id, 1);
          
          // Update reminder count
          await supabase
            .from('business_subscriptions')
            .update({ grace_reminders_sent: 1, updated_at: now.toISOString() })
            .eq('business_id', sub.business_id);

          results.detected++;
          console.log(`[paystack-check-subscriptions] Detected failed payment for business ${sub.business_id}. Grace period started.`);
        }
      } catch (err: any) {
        console.error(`[paystack-check-subscriptions] Error checking sub for business ${sub.business_id}:`, err.message);
        results.errors.push(`Check ${sub.business_id}: ${err.message}`);
      }
    }

    // =====================================================================
    // PHASE 2: Process grace period for "past_due" subscriptions
    // =====================================================================
    const { data: pastDueSubs, error: pastDueErr } = await supabase
      .from('business_subscriptions')
      .select('business_id, paystack_subscription_code, paystack_customer_code, payment_failed_at, grace_period_end, grace_reminders_sent')
      .eq('status', 'past_due')
      .eq('tier', 'tier1');

    if (pastDueErr) {
      console.error('[paystack-check-subscriptions] Error fetching past_due subs:', pastDueErr.message);
      results.errors.push(`Past_due fetch: ${pastDueErr.message}`);
    }

    for (const sub of (pastDueSubs || [])) {
      try {
        const graceEnd = sub.grace_period_end ? new Date(sub.grace_period_end) : null;
        const failedAt = sub.payment_failed_at ? new Date(sub.payment_failed_at) : null;
        const remindersSent = sub.grace_reminders_sent || 0;

        // Check if grace period has expired
        if (graceEnd && now >= graceEnd) {
          // Grace period expired — auto-cancel
          console.log(`[paystack-check-subscriptions] Grace period expired for business ${sub.business_id}. Cancelling.`);
          await cancelSubscription(supabase, sub);
          results.cancelled++;
          continue;
        }

        // Determine which day of the grace period we're on
        if (failedAt) {
          const daysSinceFailure = Math.floor((now.getTime() - failedAt.getTime()) / (24 * 60 * 60 * 1000));
          const nextReminderDay = remindersSent + 1;

          // Send next reminder if we've crossed into a new day and haven't sent that day's reminder
          if (daysSinceFailure >= remindersSent && nextReminderDay <= GRACE_PERIOD_DAYS) {
            const emailDay = nextReminderDay;
            await sendGraceEmail(supabase, sub.business_id, emailDay);
            
            await supabase
              .from('business_subscriptions')
              .update({ grace_reminders_sent: nextReminderDay, updated_at: now.toISOString() })
              .eq('business_id', sub.business_id);

            results.reminders++;
            console.log(`[paystack-check-subscriptions] Sent day ${emailDay} reminder to business ${sub.business_id}`);
          }
        }
      } catch (err: any) {
        console.error(`[paystack-check-subscriptions] Error processing grace for business ${sub.business_id}:`, err.message);
        results.errors.push(`Grace ${sub.business_id}: ${err.message}`);
      }
    }

    console.log('[paystack-check-subscriptions] Check complete:', results);

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[paystack-check-subscriptions] Fatal error:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// =====================================================================
// Helper: Fetch subscription status from Paystack
// =====================================================================
async function fetchPaystackSubscriptionStatus(subscriptionCode: string): Promise<string> {
  const response = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();
  if (!response.ok || !result.status) {
    throw new Error(result.message || 'Failed to fetch subscription from Paystack');
  }

  // Paystack subscription statuses: active, non-renewing, attention, completed, cancelled
  return result.data.status;
}

// =====================================================================
// Helper: Cancel subscription on Paystack + update local DB
// =====================================================================
async function cancelSubscription(
  supabase: ReturnType<typeof createClient>,
  sub: { business_id: string; paystack_subscription_code: string | null }
) {
  // 1. If there's a Paystack subscription code, disable on Paystack
  if (sub.paystack_subscription_code) {
    try {
      // First fetch the email_token required for disable
      const fetchRes = await fetch(`https://api.paystack.co/subscription/${sub.paystack_subscription_code}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const fetchResult = await fetchRes.json();

      if (fetchRes.ok && fetchResult.status && fetchResult.data?.email_token) {
        // Disable the subscription on Paystack
        const disableRes = await fetch('https://api.paystack.co/subscription/disable', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: sub.paystack_subscription_code,
            token: fetchResult.data.email_token,
          }),
        });
        const disableResult = await disableRes.json();
        console.log(`[paystack-check-subscriptions] Paystack disable result for ${sub.paystack_subscription_code}:`, disableResult);
      }
    } catch (err: any) {
      console.error(`[paystack-check-subscriptions] Failed to disable Paystack subscription:`, err.message);
      // Continue with local cancellation regardless
    }
  }

  // 2. Update business_subscriptions
  const { error: subErr } = await supabase
    .from('business_subscriptions')
    .update({
      tier: 'free',
      status: 'cancelled',
      payment_failed_at: null,
      grace_period_end: null,
      grace_reminders_sent: 0,
      recovery_reference: null,
      updated_at: new Date().toISOString()
    })
    .eq('business_id', sub.business_id);

  if (subErr) throw subErr;

  // 3. Update profiles
  const { error: profErr } = await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_active_until: null
    })
    .eq('id', sub.business_id);

  if (profErr) throw profErr;

  // Insert in-app notification for downgrade
  await supabase.from('notifications').insert({
    user_id: sub.business_id,
    title: 'Subscription Downgraded',
    message: 'Your ReBooked Business account has been downgraded to the Free tier due to unpaid billing.',
    type: 'billing',
    read: false
  });

  // 4. Send downgrade email
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, business_name, email')
    .eq('id', sub.business_id)
    .maybeSingle();

  if (profile?.email) {
    const businessName = profile.business_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'ReBooked Business Partner';
    const emailHtml = buildBusinessDowngradedEmail(businessName, 'contact display, bulk promos, restock-republish, and automated messages');
    await supabase.functions.invoke('send-email', {
      body: {
        to: profile.email,
        subject: 'Your ReBooked Business Account Has Been Downgraded to Free',
        html: emailHtml,
      }
    });
  }
}

// =====================================================================
// Helper: Send grace period email based on day number
// =====================================================================
async function sendGraceEmail(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  day: number
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, business_name, email')
    .eq('id', businessId)
    .maybeSingle();

  if (!profile?.email) {
    console.warn(`[paystack-check-subscriptions] No email found for business ${businessId}`);
    return;
  }

  const businessName = profile.business_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'ReBooked Business Partner';
  let emailHtml: string;
  let subject: string;

  switch (day) {
    case 1:
      emailHtml = buildGracePeriodDay1Email(businessName, RECOVERY_URL);
      subject = '⚠️ Payment Failed — 3 Days to Restore Your Tier 1 Access';
      break;
    case 2:
      emailHtml = buildGracePeriodDay2Email(businessName, RECOVERY_URL);
      subject = '⏳ Reminder: 2 Days Left to Restore Tier 1 Access';
      break;
    case 3:
    default:
      emailHtml = buildGracePeriodFinalWarningEmail(businessName, RECOVERY_URL);
      subject = '🚨 FINAL WARNING: Your Tier 1 Subscription Will Be Cancelled Today';
      break;
  }

  await supabase.functions.invoke('send-email', {
    body: {
      to: profile.email,
      subject,
      html: emailHtml,
    }
  });

  // Insert in-app notification for grace/dunning
  let notifTitle = 'Payment Failed';
  let notifMsg = 'Your monthly subscription payment failed. You have 3 days to recover your account.';
  if (day === 2) {
    notifTitle = 'Urgent Payment Reminder';
    notifMsg = 'Your Tier 1 subscription is overdue. Only 2 days left to restore access before downgrade.';
  } else if (day === 3) {
    notifTitle = 'Final Warning: Overdue Subscription';
    notifMsg = 'Your subscription payment is unpaid. Access will be cancelled at the end of today.';
  }
  await supabase.from('notifications').insert({
    user_id: businessId,
    title: notifTitle,
    message: notifMsg,
    type: 'billing',
    read: false
  });
}
