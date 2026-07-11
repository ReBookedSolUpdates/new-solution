import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { code } = await req.json();
    if (!code) {
      throw new Error('Code is required');
    }

    const normalizedCode = code.trim().toLowerCase();
    if (normalizedCode !== 'supabase' && normalizedCode !== 'tier one') {
      throw new Error('Invalid redeem code');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Grant Tier 1 for 10 years (or 1 year)
    const activeUntil = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString();

    const { error: subErr } = await supabase
      .from('business_subscriptions')
      .upsert({
        business_id: user.id,
        tier: 'tier1',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: activeUntil,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'business_id' });

    if (subErr) throw subErr;

    const { error: profErr } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'tier1',
        subscription_active_until: activeUntil
      })
      .eq('id', user.id);

    if (profErr) throw profErr;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Redeem code successful! Welcome to Tier 1! 🎉',
        currentPeriodEnd: activeUntil
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
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
