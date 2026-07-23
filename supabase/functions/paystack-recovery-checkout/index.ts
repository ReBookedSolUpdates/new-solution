import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sandboxKey = Deno.env.get('PAYSTACK_SECRET_KEY_SANDBOX');
const PAYSTACK_SECRET_KEY = sandboxKey || Deno.env.get('PAYSTACK_SECRET_KEY') || 'sk_test_placeholder_key_value_here';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth check
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Verify user has a past_due subscription
    const { data: sub, error: subErr } = await supabase
      .from('business_subscriptions')
      .select('status, paystack_subscription_code, paystack_customer_code')
      .eq('business_id', user.id)
      .maybeSingle();

    if (subErr) throw subErr;

    if (!sub) {
      throw new Error('No subscription found for this account.');
    }

    if (sub.status !== 'past_due' && sub.status !== 'cancelled') {
      throw new Error('Recovery payment is only available for past-due or cancelled subscriptions.');
    }

    // 3. Initialize a flat R79 recovery transaction via Paystack
    const body = await req.json().catch(() => ({}));
    const email = body.email || user.email;

    if (!email) {
      throw new Error('Email is required to initiate recovery checkout');
    }

    const paystackPayload = {
      email,
      amount: 7900, // R79.00 in cents (ZAR)
      currency: 'ZAR',
      callback_url: 'https://rebookedsolutions.co.za/business-profile?tab=settings_payouts&recovery=true',
      metadata: {
        user_id: user.id,
        type: 'subscription_recovery',
        custom_fields: [
          {
            display_name: 'Payment Type',
            variable_name: 'payment_type',
            value: 'Subscription Recovery — Tier 1 Reinstatement'
          }
        ]
      }
    };

    console.log('[paystack-recovery-checkout] Initializing recovery payment:', paystackPayload);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
    });

    const result = await response.json();
    console.log('[paystack-recovery-checkout] Paystack response:', result);

    if (!response.ok || !result.status) {
      throw new Error(result.message || 'Failed to initialize recovery checkout');
    }

    // 4. Store the recovery reference in DB for tracking
    const { error: updateErr } = await supabase
      .from('business_subscriptions')
      .update({
        recovery_reference: result.data.reference,
        updated_at: new Date().toISOString()
      })
      .eq('business_id', user.id);

    if (updateErr) {
      console.warn('[paystack-recovery-checkout] Failed to store recovery reference:', updateErr.message);
      // Non-fatal — continue with the flow
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: result.data.authorization_url,
        reference: result.data.reference,
        access_code: result.data.access_code,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[paystack-recovery-checkout] Error:', error.message);
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
