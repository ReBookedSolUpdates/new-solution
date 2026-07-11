import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') || 'sk_test_placeholder_key_value_here';

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

  try {
    const { reference } = await req.json();

    if (!reference) {
      throw new Error('Reference is required for verification');
    }

    console.log(`[paystack-verify-subscription] Verifying reference: ${reference}`);

    // 1. Call Paystack Verify API
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('[paystack-verify-subscription] Paystack response:', result);

    if (!response.ok || !result.status || result.data.status !== 'success') {
      throw new Error(result.message || 'Transaction verification failed or unsuccessful');
    }

    const eventData = result.data;
    const email = eventData.customer?.email;
    let userId = eventData.metadata?.user_id || null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // If userId is missing from metadata, resolve by customer email
    if (!userId && email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (profile?.id) {
        userId = profile.id;
      }
    }

    if (!userId) {
      throw new Error('Could not resolve user/business profile for verification');
    }

    const rawEnd = eventData.current_period_end 
      ? new Date(eventData.current_period_end)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const currentPeriodEnd = clampRenewalDate(rawEnd).toISOString();

    const currentPeriodStart = eventData.current_period_start
      ? new Date(eventData.current_period_start).toISOString()
      : new Date().toISOString();

    // 2. Upsert business_subscriptions record
    const { error: subErr } = await supabase
      .from('business_subscriptions')
      .upsert({
        business_id: userId,
        tier: 'tier1',
        status: 'active',
        paystack_subscription_code: eventData.subscription_code || eventData.subscription || null,
        paystack_customer_code: eventData.customer?.customer_code || null,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'business_id' });

    if (subErr) throw subErr;

    // 3. Update profiles table
    const { error: profErr } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'tier1',
        subscription_active_until: currentPeriodEnd
      })
      .eq('id', userId);

    if (profErr) throw profErr;

    return new Response(
      JSON.stringify({
        success: true,
        tier: 'tier1',
        status: 'active',
        currentPeriodEnd,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[paystack-verify-subscription] Error:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
