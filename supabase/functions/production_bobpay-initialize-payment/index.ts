import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PaymentInitRequest {
  amount: number;
  email: string;
  mobile_number?: string;
  item_name: string;
  item_description?: string;
  custom_payment_id: string;
  success_url: string;
  pending_url: string;
  cancel_url: string;
  notify_url: string;
  order_id?: string;
  buyer_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create client with anon key for auth verification
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

    // Create client with service role for database operations (bypass RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const paymentData: PaymentInitRequest = await req.json();

    // Get BobPay credentials from environment (support both production-prefixed and standard names)
    const bobpayApiUrl = Deno.env.get('PRODUCTION_BOBPAY_API_URL') || Deno.env.get('BOBPAY_API_URL');
    const bobpayApiToken = Deno.env.get('PRODUCTION_BOBPAY_API_TOKEN') || Deno.env.get('BOBPAY_API_TOKEN');
    const bobpayAccountCode = Deno.env.get('PRODUCTION_BOBPAY_ACCOUNT_CODE') || Deno.env.get('BOBPAY_ACCOUNT_CODE');

    if (!bobpayApiUrl || !bobpayApiToken || !bobpayAccountCode) {
      throw new Error('BobPay configuration missing: expected PRODUCTION_BOBPAY_* (or BOBPAY_*) secrets');
    }

    // Remove trailing slash from API URL to avoid double slashes
    const baseUrl = bobpayApiUrl.replace(/\/$/, '');

    // Create payment link with BobPay
    const bobpayResponse = await fetch(`${baseUrl}/payments/intents/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bobpayApiToken}`,
      },
      body: JSON.stringify({
        recipient_account_code: bobpayAccountCode,
        custom_payment_id: paymentData.custom_payment_id,
        email: paymentData.email,
        mobile_number: paymentData.mobile_number || '',
        amount: paymentData.amount,
        item_name: paymentData.item_name,
        item_description: paymentData.item_description || '',
        notify_url: paymentData.notify_url,
        success_url: paymentData.success_url,
        pending_url: paymentData.pending_url,
        cancel_url: paymentData.cancel_url,
        short_url: true,
      }),
    });

    if (!bobpayResponse.ok) {
      const errorText = await bobpayResponse.text();
      throw new Error(`BobPay API error: ${errorText}`);
    }

    const contentType = bobpayResponse.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const textResponse = await bobpayResponse.text();
      console.error('[production_bobpay-initialize-payment] Non-JSON response:', textResponse.substring(0, 200));
      throw new Error('Invalid response format from payment gateway');
    }

    let bobpayData;
    try {
      bobpayData = await bobpayResponse.json();
    } catch (parseError) {
      console.error('[production_bobpay-initialize-payment] JSON parse error:', parseError);
      throw new Error('Malformed response from payment gateway');
    }

    const paymentUrl = bobpayData?.url || bobpayData?.payment_url || bobpayData?.data?.url || bobpayData?.data?.payment_url;
    const shortUrl = bobpayData?.short_url || bobpayData?.data?.short_url || paymentUrl;

    if (!paymentUrl) {
      console.error('[production_bobpay-initialize-payment] Missing payment URL in response:', JSON.stringify(bobpayData).substring(0, 300));
      throw new Error('BobPay response missing payment URL');
    }

    // Store transaction in database if order_id provided
    if (paymentData.order_id) {
      // Convert amount to cents (bigint expects integer)
      const amountInCents = Math.round(paymentData.amount * 100);

      const { error: txError } = await supabaseClient
        .from('payment_transactions')
        .insert({
          order_id: paymentData.order_id,
          user_id: paymentData.buyer_id || user.id,
          reference: paymentData.custom_payment_id,
          custom_payment_id: paymentData.custom_payment_id, // Store custom payment ID
          amount: amountInCents,
          status: 'pending',
          payment_method: 'bobpay',
          bobpay_response: {
            ...bobpayData,
            provider: 'bobpay',
          },
          metadata: {
            item_name: paymentData.item_name,
            item_description: paymentData.item_description,
            email: paymentData.email,
            mobile_number: paymentData.mobile_number,
          },
        });

      if (txError) {
        throw new Error(`Failed to store transaction: ${txError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          payment_url: paymentUrl,
          short_url: shortUrl,
          reference: paymentData.custom_payment_id,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
