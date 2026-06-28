import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Read all BobPay env vars at startup and log which ones are missing
const BOBPAY_API_URL = Deno.env.get('BOBPAY_API_URL');
const BOBPAY_API_TOKEN = Deno.env.get('BOBPAY_API_TOKEN');
const BOBPAY_ACCOUNT_CODE = Deno.env.get('BOBPAY_ACCOUNT_CODE');

const SANDBOX_BOBPAY_API_URL = Deno.env.get('SANDBOX_BOBPAY_API_URL');
const SANDBOX_BOBPAY_API_TOKEN = Deno.env.get('SANDBOX_BOBPAY_API_TOKEN');
const SANDBOX_BOBPAY_ACCOUNT_CODE = Deno.env.get('SANDBOX_BOBPAY_ACCOUNT_CODE');

const IS_PRODUCTION = Deno.env.get('VITE_PRODUCTION') === 'true';

// Select the correct credential set based on environment flag
// Move selection inside request handler to support dynamic overrides from client
console.log('[bobpay-initialize-payment] Config check:', {
  IS_PRODUCTION,
  hasProductionApiUrl: !!BOBPAY_API_URL,
  hasSandboxApiUrl: !!SANDBOX_BOBPAY_API_URL,
});

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const paymentData: PaymentInitRequest & { is_sandbox?: boolean } = await req.json();

    // Select the correct credential set based on environment flag or request parameter override
    const useSandbox = paymentData.is_sandbox || !IS_PRODUCTION;
    const activeApiUrl = useSandbox ? (SANDBOX_BOBPAY_API_URL || BOBPAY_API_URL) : BOBPAY_API_URL;
    const activeApiToken = useSandbox ? (SANDBOX_BOBPAY_API_TOKEN || BOBPAY_API_TOKEN) : BOBPAY_API_TOKEN;
    const activeAccountCode = useSandbox ? (SANDBOX_BOBPAY_ACCOUNT_CODE || BOBPAY_ACCOUNT_CODE) : BOBPAY_ACCOUNT_CODE;

    // Validate required config — log exactly what is missing
    const missingConfig: string[] = [];
    if (!activeApiUrl) missingConfig.push(useSandbox ? 'SANDBOX_BOBPAY_API_URL (or BOBPAY_API_URL)' : 'BOBPAY_API_URL');
    if (!activeApiToken) missingConfig.push(useSandbox ? 'SANDBOX_BOBPAY_API_TOKEN (or BOBPAY_API_TOKEN)' : 'BOBPAY_API_TOKEN');
    if (!activeAccountCode) missingConfig.push(useSandbox ? 'SANDBOX_BOBPAY_ACCOUNT_CODE (or BOBPAY_ACCOUNT_CODE)' : 'BOBPAY_ACCOUNT_CODE');

    if (missingConfig.length > 0) {
      const msg = `BobPay configuration missing: ${missingConfig.join(', ')}`;
      console.error('[bobpay-initialize-payment] ' + msg);
      throw new Error(msg);
    }

    // Validate payment data
    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('Invalid payment amount');
    }
    if (!paymentData.email) {
      throw new Error('Buyer email is required');
    }
    if (!paymentData.custom_payment_id) {
      throw new Error('custom_payment_id is required');
    }

    const baseUrl = activeApiUrl!.replace(/\/$/, '');

    console.log('[bobpay-initialize-payment] Calling BobPay:', {
      url: `${baseUrl}/payments/intents/link`,
      amount: paymentData.amount,
      custom_payment_id: paymentData.custom_payment_id,
      useSandbox,
    });

    const bobpayResponse = await fetch(`${baseUrl}/payments/intents/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeApiToken}`,
      },
      body: JSON.stringify({
        recipient_account_code: activeAccountCode,
        custom_payment_id: paymentData.custom_payment_id,
        email: paymentData.email,
        mobile_number: paymentData.mobile_number || '',
        amount: paymentData.amount,
        item_name: paymentData.item_name,
        item_description: paymentData.item_description || '',
        notify_url: 'https://kbpjqzaqbqukutflwixf.supabase.co/functions/v1/bobpay-webhook?type=payment',
        success_url: paymentData.success_url,
        pending_url: paymentData.pending_url,
        cancel_url: paymentData.cancel_url,
        short_url: true,
      }),
    });

    const bobpayResponseText = await bobpayResponse.text();

    if (!bobpayResponse.ok) {
      console.error('[bobpay-initialize-payment] BobPay API error:', {
        status: bobpayResponse.status,
        body: bobpayResponseText.substring(0, 500),
      });
      throw new Error(`BobPay API error (${bobpayResponse.status}): ${bobpayResponseText.substring(0, 300)}`);
    }

    const contentType = bobpayResponse.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('[bobpay-initialize-payment] Non-JSON response:', bobpayResponseText.substring(0, 200));
      throw new Error('Invalid response format from payment gateway');
    }

    let bobpayData;
    try {
      bobpayData = JSON.parse(bobpayResponseText);
    } catch (parseError) {
      console.error('[bobpay-initialize-payment] JSON parse error:', parseError);
      throw new Error('Malformed response from payment gateway');
    }

    console.log('[bobpay-initialize-payment] BobPay response keys:', Object.keys(bobpayData || {}));

    const paymentUrl = bobpayData?.url || bobpayData?.payment_url || bobpayData?.data?.url || bobpayData?.data?.payment_url;
    const shortUrl = bobpayData?.short_url || bobpayData?.data?.short_url || paymentUrl;

    if (!paymentUrl) {
      console.error('[bobpay-initialize-payment] Missing payment URL. Full response:', JSON.stringify(bobpayData).substring(0, 500));
      throw new Error('BobPay response missing payment URL');
    }

    // Store transaction and update order
    if (paymentData.order_id) {
      const amountInCents = Math.round(paymentData.amount * 100);

      const { error: txError } = await supabaseClient
        .from('payment_transactions')
        .insert({
          order_id: paymentData.order_id,
          user_id: paymentData.buyer_id || user.id,
          reference: paymentData.custom_payment_id,
          custom_payment_id: paymentData.custom_payment_id,
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
            is_production: !useSandbox,
          },
        });

      if (txError) {
        console.error('[bobpay-initialize-payment] Failed to store transaction:', txError);
        throw new Error(`Failed to store transaction: ${txError.message}`);
      }

      const { error: orderUpdateError } = await supabaseClient
        .from('orders')
        .update({ payment_reference: paymentData.custom_payment_id })
        .eq('id', paymentData.order_id);

      if (orderUpdateError) {
        console.error('[bobpay-initialize-payment] Failed to update order:', orderUpdateError);
        throw new Error(`Failed to update order with payment reference: ${orderUpdateError.message}`);
      }
    }

    console.log('[bobpay-initialize-payment] Success! Payment URL:', paymentUrl.substring(0, 60) + '...');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          payment_url: paymentUrl,
          short_url: shortUrl,
          reference: paymentData.custom_payment_id,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[bobpay-initialize-payment] Fatal error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});