import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') || 'sk_test_placeholder_key_value_here';
const PAYSTACK_PLAN_CODE = Deno.env.get('PAYSTACK_PLAN_CODE') || 'PLN_placeholder_tier1_code';

console.log('[paystack-subscription-checkout] Config check:', {
  hasSecretKey: !!Deno.env.get('PAYSTACK_SECRET_KEY'),
  hasPlanCode: !!Deno.env.get('PAYSTACK_PLAN_CODE'),
});

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

    // 2. Initialize Paystack Subscription transaction
    const body = await req.json().catch(() => ({}));
    const email = body.email || user.email;

    if (!email) {
      throw new Error('Email is required to initiate checkout');
    }

    const paystackPayload = {
      email,
      amount: 9900, // R99.00 in cents
      plan: PAYSTACK_PLAN_CODE,
      callback_url: 'https://rebookedsolutions.co.za/business-profile?tab=settings_payouts',
      metadata: {
        user_id: user.id
      }
    };

    console.log('[paystack-subscription-checkout] Calling Paystack initialize:', paystackPayload);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
    });

    const result = await response.json();
    console.log('[paystack-subscription-checkout] Paystack response:', result);

    if (!response.ok || !result.status) {
      throw new Error(result.message || 'Failed to initialize Paystack checkout');
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
    console.error('[paystack-subscription-checkout] Error:', error.message);
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
