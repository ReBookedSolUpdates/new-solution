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

    // 2. Fetch subscription code from DB
    const { data: sub, error: subErr } = await supabase
      .from('business_subscriptions')
      .select('paystack_subscription_code, status')
      .eq('business_id', user.id)
      .maybeSingle();

    if (subErr) throw subErr;

    if (!sub || !sub.paystack_subscription_code) {
      throw new Error('No active Paystack subscription found. Cannot update card.');
    }

    const subscriptionCode = sub.paystack_subscription_code;

    // 3. Call Paystack "Generate Update Subscription Link" API
    console.log(`[paystack-update-card] Generating manage link for: ${subscriptionCode}`);
    const response = await fetch(
      `https://api.paystack.co/subscription/${subscriptionCode}/manage/link`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();
    console.log('[paystack-update-card] Paystack response:', result);

    if (!response.ok || !result.status) {
      throw new Error(result.message || 'Failed to generate card update link from Paystack');
    }

    return new Response(
      JSON.stringify({
        success: true,
        link: result.data.link,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[paystack-update-card] Error:', error.message);
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
