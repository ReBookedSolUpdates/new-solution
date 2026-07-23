import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { EMAIL_FOOTER } from "../../../shared/email-footer.ts";
import { buildBuyerPaymentEmail, buildSellerPaymentEmail } from "../_shared/email-templates.ts";
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IS_PRODUCTION = Deno.env.get('VITE_PRODUCTION') === 'true';

const BOBPAY_API_URL = Deno.env.get('BOBPAY_API_URL');
const BOBPAY_API_TOKEN = Deno.env.get('BOBPAY_API_TOKEN');
const BOBPAY_PASSPHRASE = Deno.env.get('BOBPAY_PASSPHRASE');

const SANDBOX_BOBPAY_API_URL = Deno.env.get('SANDBOX_BOBPAY_API_URL');
const SANDBOX_BOBPAY_API_TOKEN = Deno.env.get('SANDBOX_BOBPAY_API_TOKEN');
const SANDBOX_BOBPAY_PASSPHRASE = Deno.env.get('SANDBOX_BOBPAY_PASSPHRASE');

// Correct fallback logic to match initialization function
const ACTIVE_API_URL = IS_PRODUCTION ? BOBPAY_API_URL : (SANDBOX_BOBPAY_API_URL || BOBPAY_API_URL);
const ACTIVE_API_TOKEN = IS_PRODUCTION ? BOBPAY_API_TOKEN : (SANDBOX_BOBPAY_API_TOKEN || BOBPAY_API_TOKEN);
const ACTIVE_PASSPHRASE = IS_PRODUCTION ? BOBPAY_PASSPHRASE : (SANDBOX_BOBPAY_PASSPHRASE || BOBPAY_PASSPHRASE);

console.log('[bobpay-webhook] Config check:', {
  IS_PRODUCTION,
  hasApiUrl: !!ACTIVE_API_URL,
  hasApiToken: !!ACTIVE_API_TOKEN,
  hasPassphrase: !!ACTIVE_PASSPHRASE,
  apiUrlPreview: ACTIVE_API_URL ? ACTIVE_API_URL.substring(0, 30) + '...' : 'MISSING',
});

interface BobPayWebhook {
  id: number;
  uuid: string;
  short_reference: string;
  custom_payment_id: string;
  amount: number;
  paid_amount: number;
  total_paid_amount: number;
  status: string;
  payment_method: string;
  original_requested_payment_method: string;
  payment_id: number;
  payment: {
    id: number;
    payment_method_id: number;
    payment_method: string;
    amount: number;
    status: string;
  };
  item_name: string;
  item_description: string;
  recipient_account_code: string;
  recipient_account_id: number;
  email: string;
  mobile_number: string;
  from_bank: string;
  time_created: string;
  is_test: boolean;
  signature: string;
  notify_url: string;
  success_url: string;
  pending_url: string;
  cancel_url: string;
}

async function verifySignature(
  webhookData: BobPayWebhook,
  passphrase: string
): Promise<boolean> {
  try {
    const keyValuePairs = [
      `recipient_account_code=${encodeURIComponent(webhookData.recipient_account_code)}`,
      `custom_payment_id=${encodeURIComponent(webhookData.custom_payment_id)}`,
      `email=${encodeURIComponent(webhookData.email || '')}`,
      `mobile_number=${encodeURIComponent(webhookData.mobile_number || '')}`,
      `amount=${webhookData.amount.toFixed(2)}`,
      `item_name=${encodeURIComponent(webhookData.item_name || '')}`,
      `item_description=${encodeURIComponent(webhookData.item_description || '')}`,
      `notify_url=${encodeURIComponent(webhookData.notify_url)}`,
      `success_url=${encodeURIComponent(webhookData.success_url)}`,
      `pending_url=${encodeURIComponent(webhookData.pending_url)}`,
      `cancel_url=${encodeURIComponent(webhookData.cancel_url)}`,
    ];

    const signatureString = keyValuePairs.join('&') + `&passphrase=${passphrase}`;
    console.log('[bobpay-webhook] Calculated signature string:', signatureString);

    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('[bobpay-webhook] Calculated signature:', calculatedSignature);
    console.log('[bobpay-webhook] Received signature:', webhookData.signature);

    return calculatedSignature === webhookData.signature;
  } catch (error) {
    console.error('[bobpay-webhook] Signature verification error:', error);
    return false;
  }
}

async function findItemTable(supabaseClient: any, bookId: string): Promise<string | null> {
  const tables = ['books', 'uniforms', 'school_supplies'];
  for (const table of tables) {
    const { data } = await supabaseClient
      .from(table)
      .select('id')
      .eq('id', bookId)
      .maybeSingle();
    if (data) return table;
  }
  return null;
}

async function markBookAsSold(supabaseClient: any, bookId: string): Promise<boolean> {
  try {
    const table = await findItemTable(supabaseClient, bookId);
    if (!table) {
      console.error('❌ Could not find item table for ID:', bookId);
      return false;
    }

    const { data: itemData, error: itemFetchError } = await supabaseClient
      .from(table)
      .select('id, title, available_quantity, sold_quantity, sold, availability')
      .eq('id', bookId)
      .single();

    if (itemFetchError || !itemData) {
      console.error(`❌ Failed to fetch item from ${table}:`, itemFetchError);
      return false;
    }

    if (itemData.sold) {
      console.log('ℹ️ Item already marked as sold, skipping');
      return true;
    }

    const { error: itemUpdateError } = await supabaseClient
      .from(table)
      .update({
        sold: true,
        availability: 'sold',
        sold_at: new Date().toISOString(),
        sold_quantity: (itemData.sold_quantity || 0) + 1,
        available_quantity: Math.max(0, (itemData.available_quantity || 0) - 1),
      })
      .eq('id', bookId)
      .eq('sold', false);

    if (itemUpdateError) {
      console.error(`❌ Failed to mark item as sold in ${table}:`, itemUpdateError);
      return false;
    }

    console.log(`✅ Item marked as sold in ${table} after payment confirmation`);
    return true;
  } catch (error) {
    console.error('❌ Unexpected error marking item as sold:', error);
    return false;
  }
}

async function unmarkBookAsSold(supabaseClient: any, bookId: string): Promise<void> {
  try {
    const table = await findItemTable(supabaseClient, bookId);
    if (!table) return;

    const { data: itemData, error: itemFetchError } = await supabaseClient
      .from(table)
      .select('id, sold, available_quantity, sold_quantity')
      .eq('id', bookId)
      .single();

    if (itemFetchError || !itemData || !itemData.sold) return;

    await supabaseClient
      .from(table)
      .update({
        sold: false,
        availability: 'available',
        sold_at: null,
        sold_quantity: Math.max(0, (itemData.sold_quantity || 1) - 1),
        available_quantity: (itemData.available_quantity || 0) + 1,
      })
      .eq('id', bookId);

    console.log(`🔄 Item unmarked as sold in ${table} (payment failed/cancelled)`);
  } catch (error) {
    console.error('⚠️ Failed to unmark item:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookData: BobPayWebhook = await req.json();
    console.log('[bobpay-webhook] Received webhook data:', JSON.stringify(webhookData, null, 2));
    console.log('[bobpay-webhook] Query params:', req.url.split('?')[1]);

    // Signature verification — skip if empty (BobPay sandbox doesn't send signatures)
    if (webhookData.signature) {
      if (!ACTIVE_PASSPHRASE) {
        console.error('[bobpay-webhook] ACTIVE_PASSPHRASE not configured');
        throw new Error('BobPay passphrase not configured');
      }
      const isValidSignature = await verifySignature(webhookData, ACTIVE_PASSPHRASE);
      if (!isValidSignature) {
        console.warn('[bobpay-webhook] Invalid signature detected');
        return new Response('Invalid signature', { status: 400 });
      }
      console.log('[bobpay-webhook] Signature verified successfully');
    } else {
      console.warn('[bobpay-webhook] No signature in payload - sandbox mode, skipping verification');
    }

    // Validate with BobPay API
    if (ACTIVE_API_URL && ACTIVE_API_TOKEN) {
      // Ensure no trailing slash in the base URL for clean path construction
      const normalizedBaseUrl = ACTIVE_API_URL.endsWith('/') 
        ? ACTIVE_API_URL.slice(0, -1) 
        : ACTIVE_API_URL;
      
      const validationUrl = `${normalizedBaseUrl}/payments/intents/validate`;
      console.log('[bobpay-webhook] Validating with BobPay API at:', validationUrl);
      
      const validationResponse = await fetch(
        validationUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ACTIVE_API_TOKEN}`,
          },
          body: JSON.stringify(webhookData),
        }
      );

      if (!validationResponse.ok) {
        const valError = await validationResponse.text();
        console.error('[bobpay-webhook] BobPay validation failed:', valError);
        return new Response('Payment validation failed', { status: 400 });
      }
      console.log('[bobpay-webhook] BobPay API validation successful');
    }

    // If payment is paid, materialize the order from the intent
    let orders: any = null;
    if (webhookData.status === 'paid') {
      console.log('✅ Payment confirmed! Materializing order from intent...');
      
      const { data: materializeResult, error: materializeError } = await supabaseClient.rpc("materialize_order_from_intent", {
        p_payment_reference: webhookData.custom_payment_id,
        p_paystack_reference: webhookData.short_reference,
      });

      if (materializeError || !materializeResult || !materializeResult.success) {
        console.error('❌ Failed to materialize order from intent:', materializeError || materializeResult?.error);
        return new Response('Failed to materialize order', { status: 409 });
      }

      // Fetch the newly created order
      const { data: ordersResult, error: fetchErr } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('payment_reference', webhookData.custom_payment_id)
        .maybeSingle();

      if (fetchErr || !ordersResult) {
        console.error('❌ Materialized order not found:', fetchErr);
        return new Response('Order not found', { status: 404 });
      }

      orders = ordersResult;
    } else {
      // Payment failed or cancelled
      console.log(`❌ Payment status is: ${webhookData.status}. Updating intent status to failed...`);
      await supabaseClient
        .from('order_intents')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('payment_reference', webhookData.custom_payment_id);
        
      // Update payment transaction
      await supabaseClient
        .from('payment_transactions')
        .update({
          status: webhookData.status,
          verified_at: new Date().toISOString(),
          paystack_response: {
            ...webhookData,
            provider: 'bobpay',
          },
        })
        .eq('reference', webhookData.custom_payment_id);

      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Update payment transaction
    await supabaseClient
      .from('payment_transactions')
      .update({
        status: 'success',
        verified_at: new Date().toISOString(),
        paystack_response: {
          ...webhookData,
          provider: 'bobpay',
        },
      })
      .eq('reference', webhookData.custom_payment_id);

    const bookId = orders.book_id || (orders.items?.[0]?.book_id);
    const bookTitle = orders.items?.[0]?.title || orders.items?.[0]?.book_title || 'Item';
    const cartRecoveryEmail = orders.buyer_email || webhookData.email;

    if (webhookData.status === 'paid') {
      console.log('✅ Finalizing materialized order...');

      // Idempotency guard: BobPay can retry webhooks.
      // If the order has already been processed by this webhook run previously (unlikely at this step)
      if (orders.payment_status === 'paid' && orders.status === 'pending_commit') {
        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      // Mark cart as recovered
      if (cartRecoveryEmail) {
        try {
          await supabaseClient
            .from('cart_abandonment_logs')
            .update({ recovered_at: new Date().toISOString() })
            .eq('user_email', cartRecoveryEmail)
            .is('recovered_at', null)
            .is('email_sent_at', null);
          console.log(`✅ Marked cart as recovered for ${cartRecoveryEmail}`);
        } catch (recoveryError) {
          console.warn('⚠️ Failed to mark cart as recovered:', recoveryError);
        }
      }

      // STEP 1: Mark item as sold
      if (bookId) {
        const bookMarked = await markBookAsSold(supabaseClient, bookId);
        if (!bookMarked) {
          console.error('⚠️ Failed to mark item as sold - may have been sold to another buyer');
          await supabaseClient
            .from('orders')
            .update({
              payment_status: 'paid',
              status: 'cancelled',
              cancellation_reason: 'Item was sold to another buyer before payment could be confirmed',
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', orders.id);

          await supabaseClient.from('order_notifications').insert({
            order_id: orders.id,
            user_id: orders.buyer_id,
            type: 'order_cancelled',
            title: 'Order Cancelled - Refund Processing',
            message: 'Unfortunately, the item was sold to another buyer before your payment could be confirmed. A full refund will be processed.',
          });

          return new Response('OK - item unavailable, order cancelled', { status: 200, headers: corsHeaders });
        }
      }

      // STEP 2: Update order to pending_commit
      const commitDeadlineIso = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          status: 'pending_commit',
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          commit_deadline: commitDeadlineIso,
          payment_data: webhookData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orders.id);
      if (updateError) {
        console.error('❌ Failed to set order to pending_commit:', updateError);
      }

      // STEP 3: Notifications
      await Promise.all([
        supabaseClient.from('order_notifications').insert({
          order_id: orders.id,
          user_id: orders.buyer_id,
          type: 'payment_success',
          title: 'Payment Successful',
          message: `Your payment of R${webhookData.paid_amount.toFixed(2)} has been confirmed. Waiting for seller confirmation.`,
        }),
        supabaseClient.from('order_notifications').insert({
          order_id: orders.id,
          user_id: orders.seller_id,
          type: 'order_paid',
          title: 'New Order Received',
          message: `You have received a new order for "${bookTitle}". Please commit within 48 hours.`,
        }),
      ]);

      // STEP 4: Activity logs
      await Promise.allSettled([
        supabaseClient.from('activity_logs').insert({
          user_id: orders.buyer_id,
          action: 'purchase',
          entity_type: 'order',
          entity_id: orders.id,
          metadata: {
            order_id: orders.id,
            book_id: bookId,
            amount: webhookData.paid_amount,
            seller_id: orders.seller_id,
            payment_reference: webhookData.custom_payment_id,
          },
        }),
        supabaseClient.from('activity_logs').insert({
          user_id: orders.seller_id,
          action: 'sale',
          entity_type: 'order',
          entity_id: orders.id,
          metadata: {
            order_id: orders.id,
            book_id: bookId,
            amount: webhookData.paid_amount,
            buyer_id: orders.buyer_id,
            payment_reference: webhookData.custom_payment_id,
          },
        }),
      ]);

      // STEP 5: Emails & Auto-Commit
      const [{ data: buyerProfile }, { data: sellerProfile }] = await Promise.all([
        supabaseClient.from('profiles').select('email, full_name, name').eq('id', orders.buyer_id).single(),
        supabaseClient.from('profiles').select('email, full_name, name, is_business, auto_commit, subscription_tier').eq('id', orders.seller_id).single(),
      ]);

      const buyerEmail = buyerProfile?.email || orders.buyer_email;
      const buyerName = buyerProfile?.full_name || buyerProfile?.name || 'Buyer';
      const sellerEmail = sellerProfile?.email;
      const sellerName = sellerProfile?.full_name || sellerProfile?.name || 'Seller';
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const paymentReference = orders.payment_reference || orders.paystack_reference || webhookData.custom_payment_id;
      const commitDeadlineText = new Date(commitDeadlineIso).toLocaleString('en-ZA', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

      const isBusinessSeller = !!sellerProfile?.is_business;
      const autoCommitEnabled = !!sellerProfile?.auto_commit;
      let autoCommitted = false;

      // Handle Auto-Commit if enabled for seller
      if (autoCommitEnabled && supabaseUrl && supabaseServiceKey) {
        console.log(`[bobpay-webhook] Seller ${orders.seller_id} has auto_commit enabled. Triggering commit-to-sale...`);
        try {
          const commitResponse = await fetch(`${supabaseUrl}/functions/v1/commit-to-sale`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ order_id: orders.id })
          });
          const commitResult = await commitResponse.json();
          console.log('[bobpay-webhook] commit-to-sale result:', commitResult);
          if (commitResult.success) {
            autoCommitted = true;
          }
        } catch (commitError) {
          console.error('[bobpay-webhook] Error calling commit-to-sale:', commitError);
        }
      }

      let itemImageUrl = "";
      if (bookId) {
        const table = await findItemTable(supabaseClient, bookId);
        if (table) {
          const { data: itemData } = await supabaseClient
            .from(table)
            .select('image_url')
            .eq('id', bookId)
            .maybeSingle();
          if (itemData?.image_url) {
            itemImageUrl = itemData.image_url;
          }
        }
      }

      if (buyerEmail && supabaseUrl && supabaseServiceKey) {
        let buyerSubject = 'Payment Confirmed – ReBooked Solutions';
        
        if (isBusinessSeller) {
          buyerSubject = autoCommitted 
            ? 'Payment & Order Confirmed – ReBooked Solutions' 
            : 'Payment Confirmed – Waiting for Business Confirmation';
          
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
              body: JSON.stringify({
                to: buyerEmail,
                subject: buyerSubject,
                templateId: 'business-buyer-payment',
                templateData: {
                  buyerName,
                  bookTitle,
                  itemImageUrl,
                  sellerName,
                  orderId: orders.order_id || orders.id,
                  autoCommitted,
                  paymentReference,
                  paidAmount: webhookData.paid_amount,
                  commitDeadlineText,
                  itemPrice: orders.amount ? orders.amount / 100 : webhookData.paid_amount,
                  deliveryFee: 0,
                  buyerProtectionFee: 0,
                  walletDeduction: 0,
                  cardPaymentAmount: webhookData.paid_amount
                }
              })
            });
            console.log('✅ Business Buyer email sent via template');
          } catch (err) {
            console.warn('⚠️ Failed to send business buyer email template:', err);
          }
        } else {
          const buyerEmailHtml = buildBuyerPaymentEmail(buyerName, bookTitle, itemImageUrl, sellerName, orders.order_id || orders.id, paymentReference, webhookData.paid_amount, commitDeadlineText);
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
              body: JSON.stringify({ to: buyerEmail, subject: buyerSubject, html: buyerEmailHtml }),
            });
            console.log('✅ Buyer email sent');
          } catch (emailError) {
            console.warn('⚠️ Failed to send buyer email:', emailError);
          }
        }
      }

      if (sellerEmail && supabaseUrl && supabaseServiceKey) {
        let sellerSubject = autoCommitted 
          ? 'New Sale Confirmed – Auto-Committed | ReBooked Solutions' 
          : 'New Sale – Confirm Within 48 Hours | ReBooked Solutions';

        if (isBusinessSeller) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
              body: JSON.stringify({
                to: sellerEmail,
                subject: sellerSubject,
                templateId: 'business-seller-payment',
                templateData: {
                  sellerName,
                  bookTitle,
                  itemImageUrl,
                  buyerName,
                  orderId: orders.order_id || orders.id,
                  autoCommitted
                }
              })
            });
            console.log('✅ Business Seller email sent via template');
          } catch (err) {
            console.warn('⚠️ Failed to send business seller email template:', err);
          }
        } else {
          const sellerEmailHtml = buildSellerPaymentEmail(sellerName, bookTitle, itemImageUrl, buyerName, orders.order_id || orders.id);
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
              body: JSON.stringify({ to: sellerEmail, subject: sellerSubject, html: sellerEmailHtml }),
            });
            console.log('✅ Seller email sent');
          } catch (emailError) {
            console.warn('⚠️ Failed to send seller email:', emailError);
          }
        }
      }

    } else if (webhookData.status === 'failed' || webhookData.status === 'cancelled') {
      console.log(`⚠️ Payment ${webhookData.status} - cancelling order`);

      await supabaseClient
        .from('orders')
        .update({
          payment_status: webhookData.status,
          status: 'cancelled',
          cancellation_reason: `Payment ${webhookData.status}`,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orders.id);

      if (bookId) {
        await unmarkBookAsSold(supabaseClient, bookId);
      }

      await supabaseClient.from('order_notifications').insert({
        order_id: orders.id,
        user_id: orders.buyer_id,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment could not be processed. Status: ${webhookData.status}. No charges were made.`,
      });
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response('Received', { status: 200, headers: corsHeaders });
  }
});
