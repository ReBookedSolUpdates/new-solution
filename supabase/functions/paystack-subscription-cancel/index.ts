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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch subscription details from database
    const { data: sub, error: subFetchErr } = await supabase
      .from('business_subscriptions')
      .select('paystack_subscription_code')
      .eq('business_id', user.id)
      .maybeSingle();

    if (subFetchErr) throw subFetchErr;

    if (!sub || !sub.paystack_subscription_code) {
      // If no subscription code exists (e.g. promo code subscription), just cancel locally
      const { error: dbError } = await supabase
        .from('business_subscriptions')
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        })
        .eq('business_id', user.id);

      if (dbError) throw dbError;

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Promo subscription cancelled successfully.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const subscriptionCode = sub.paystack_subscription_code;

    // 2. Fetch subscription details from Paystack to get the email token
    console.log(`[paystack-subscription-cancel] Fetching subscription details for: ${subscriptionCode}`);
    const fetchResponse = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const fetchResult = await fetchResponse.json();
    if (!fetchResponse.ok || !fetchResult.status) {
      throw new Error(fetchResult.message || 'Failed to fetch subscription details from Paystack');
    }

    const emailToken = fetchResult.data?.email_token;
    if (!emailToken) {
      throw new Error('Email token not found in Paystack subscription details');
    }

    // 3. Call Paystack Disable Subscription API
    console.log(`[paystack-subscription-cancel] Disabling subscription on Paystack: ${subscriptionCode}`);
    const disableResponse = await fetch('https://api.paystack.co/subscription/disable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: subscriptionCode,
        token: emailToken,
      }),
    });

    const disableResult = await disableResponse.json();
    if (!disableResponse.ok || !disableResult.status) {
      throw new Error(disableResult.message || 'Failed to disable subscription on Paystack');
    }

    // 4. Update the database record
    const { error: dbError } = await supabase
      .from('business_subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('business_id', user.id);

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription cancelled successfully. You will have access until the end of your billing period.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[paystack-subscription-cancel] Error:', error.message);
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
