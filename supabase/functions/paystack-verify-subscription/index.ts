import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sandboxKey = Deno.env.get('PAYSTACK_SECRET_KEY_SANDBOX');
const PAYSTACK_SECRET_KEY = sandboxKey || Deno.env.get('PAYSTACK_SECRET_KEY') || 'sk_test_placeholder_key_value_here';

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
    const { reference, business_id } = await req.json().catch(() => ({}));

    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Manual check logic using business_id
    if (business_id && !reference) {
      console.log(`[paystack-verify-subscription] Manual subscription sync request for business: ${business_id}`);

      if (!authHeader) {
        throw new Error('Unauthorized: Missing authorization header');
      }

      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );

      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (authError || !user) {
        throw new Error('Unauthorized: Invalid authentication');
      }

      const isOwner = user.id === business_id;
      let isCollaborator = false;

      if (!isOwner) {
        const { data: collab } = await supabase
          .from('business_collaborators')
          .select('id')
          .eq('business_id', business_id)
          .eq('collaborator_id', user.id)
          .eq('status', 'Active')
          .maybeSingle();
        if (collab?.id) {
          isCollaborator = true;
        }
      }

      if (!isOwner && !isCollaborator) {
        throw new Error('Unauthorized: Access denied');
      }

      const { data: sub } = await supabase
        .from('business_subscriptions')
        .select('*')
        .eq('business_id', business_id)
        .maybeSingle();

      if (!sub || !sub.paystack_subscription_code) {
        return new Response(
          JSON.stringify({
            success: true,
            tier: sub?.tier || 'free',
            status: sub?.status || 'none',
            message: 'No subscription record found'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const response = await fetch(`https://api.paystack.co/subscription/${sub.paystack_subscription_code}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('[paystack-verify-subscription] Paystack subscription response:', result);

      if (!response.ok || !result.status) {
        throw new Error(result.message || 'Failed to fetch status from Paystack');
      }

      const liveStatus = result.data.status;
      const rawEnd = result.data.next_payment_date || result.data.current_period_end;
      const currentPeriodEnd = rawEnd ? clampRenewalDate(new Date(rawEnd)).toISOString() : null;

      let localStatus = sub.status;
      let localTier = sub.tier;

      if (liveStatus === 'active' || liveStatus === 'non-renewing') {
        localStatus = 'active';
        localTier = 'tier1';
      } else if (liveStatus === 'attention') {
        localStatus = 'past_due';
      } else if (liveStatus === 'completed' || liveStatus === 'cancelled') {
        localStatus = 'cancelled';
        localTier = 'free';
      }

      const { error: updateSubErr } = await supabase
        .from('business_subscriptions')
        .update({
          status: localStatus,
          tier: localTier,
          current_period_end: currentPeriodEnd || sub.current_period_end,
          updated_at: new Date().toISOString()
        })
        .eq('business_id', business_id);

      if (updateSubErr) throw updateSubErr;

      const { error: updateProfErr } = await supabase
        .from('profiles')
        .update({
          subscription_tier: localTier,
          subscription_active_until: localTier === 'tier1' ? (currentPeriodEnd || sub.current_period_end) : null
        })
        .eq('id', business_id);

      if (updateProfErr) throw updateProfErr;

      return new Response(
        JSON.stringify({
          success: true,
          tier: localTier,
          status: localStatus,
          currentPeriodEnd: currentPeriodEnd || sub.current_period_end
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Original reference check logic
    if (!reference) {
      throw new Error('Reference is required for verification');
    }

    console.log(`[paystack-verify-subscription] Verifying reference: ${reference}`);

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
