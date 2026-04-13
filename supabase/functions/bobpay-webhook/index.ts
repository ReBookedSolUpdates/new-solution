import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
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

    // Find the order
    const { data: orders, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('payment_reference', webhookData.custom_payment_id)
      .maybeSingle();

    if (orderError || !orders) {
      console.error('❌ Order not found for reference:', webhookData.custom_payment_id);
      return new Response('Order not found', { status: 404 });
    }

    // Update payment transaction
    await supabaseClient
      .from('payment_transactions')
      .update({
        status: webhookData.status === 'paid' ? 'success' : webhookData.status,
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
      console.log('✅ Payment confirmed! Marking item as sold and finalizing order...');

      // Idempotency guard: BobPay can retry webhooks.
      // If we've already processed payment, do not send emails again.
      if (orders.payment_status === 'paid') {
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
          payment_confirmed_at: new Date().toISOString(),
          commit_deadline: commitDeadlineIso,
          payment_data: webhookData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orders.id);

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

      // STEP 5: Emails
      const [{ data: buyerProfile }, { data: sellerProfile }] = await Promise.all([
        supabaseClient.from('profiles').select('email, full_name, name').eq('id', orders.buyer_id).single(),
        supabaseClient.from('profiles').select('email, full_name, name').eq('id', orders.seller_id).single(),
      ]);

      const buyerEmail = buyerProfile?.email || orders.buyer_email;
      const buyerName = buyerProfile?.full_name || buyerProfile?.name || 'Buyer';
      const sellerEmail = sellerProfile?.email;
      const sellerName = sellerProfile?.full_name || sellerProfile?.name || 'Seller';
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const paymentReference = orders.payment_reference || orders.paystack_reference || webhookData.custom_payment_id;
      const commitDeadlineText = new Date(commitDeadlineIso).toLocaleString('en-ZA', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

      const FOOTER = `
        <div style="margin-top:32px;padding-top:20px;border-top:2px solid #3ab26f;text-align:center;font-size:12px;color:#4e7a63;">
          <p style="margin:4px 0;font-weight:bold;color:#3ab26f;">ReBooked Solutions</p>
          <p style="margin:4px 0;">support@rebookedsolutions.co.za | rebookedsolutions.co.za</p>
          <p style="margin:4px 0;font-style:italic;">"Pre-Loved Pages, New Adventures"</p>
          <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">This is an automated message. Please do not reply. © ${new Date().getFullYear()} ReBooked Solutions.</p>
        </div>`;

      if (buyerEmail && supabaseUrl && supabaseServiceKey) {
        const buyerEmailHtml = `
          <div style="font-family:Arial,sans-serif;background:#f3fef7;padding:20px;color:#1f4e3d;">
            <div style="max-width:500px;margin:auto;background:#ffffff;padding:30px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
              <div style="background:linear-gradient(135deg,#3ab26f,#2d8f58);padding:24px;border-radius:8px 8px 0 0;text-align:center;color:white;margin:-30px -30px 24px;">
                <h1 style="margin:0;font-size:22px;">Payment Confirmed!</h1>
                <p style="margin:6px 0 0;opacity:0.9;">Your order is on its way</p>
              </div>
              <p>Hello <strong>${buyerName}</strong>,</p>
              <p>Your payment has been processed successfully. The seller has been notified and has 48 hours to confirm your order.</p>
              <div style="background:#f3fef7;border:1px solid #3ab26f;border-radius:8px;padding:16px;margin:20px 0;">
                <h3 style="margin:0 0 12px;color:#1f4e3d;font-size:14px;">🧾 Receipt</h3>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;width:40%;">Item</td><td style="padding:4px 0;">${bookTitle}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Seller</td><td style="padding:4px 0;">${sellerName}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Order ID</td><td style="padding:4px 0;font-family:monospace;font-size:11px;">${orders.id}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Payment Reference</td><td style="padding:4px 0;font-family:monospace;font-size:11px;">${paymentReference}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Total Paid</td><td style="padding:4px 0;font-weight:bold;color:#3ab26f;">R${webhookData.paid_amount.toFixed(2)}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Seller Commit Deadline</td><td style="padding:4px 0;">${commitDeadlineText}</td></tr>
                </table>
              </div>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:16px 0;">
                <p style="margin:0;font-size:13px;color:#1e40af;"><strong>⏳ What happens next?</strong><br/>
                  Once the seller confirms, your item will be prepared for shipment. You'll receive tracking info via email. If the seller doesn't respond within 48 hours, you'll get a full automatic refund.
                </p>
              </div>
              <a href="https://rebookedsolutions.co.za/profile?tab=activity" style="display:inline-block;padding:12px 20px;background:#3ab26f;color:#ffffff;text-decoration:none;border-radius:5px;margin-top:16px;font-weight:bold;">View Your Orders</a>
              ${FOOTER}
            </div>
          </div>`;

        try {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({ to: buyerEmail, subject: 'Payment Confirmed – ReBooked Solutions', html: buyerEmailHtml }),
          });
          console.log('✅ Buyer email sent');
        } catch (emailError) {
          console.warn('⚠️ Failed to send buyer email:', emailError);
        }
      }

      if (sellerEmail && supabaseUrl && supabaseServiceKey) {
        const sellerEmailHtml = `
          <div style="font-family:Arial,sans-serif;background:#f3fef7;padding:20px;color:#1f4e3d;">
            <div style="max-width:500px;margin:auto;background:#ffffff;padding:30px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
              <div style="background:linear-gradient(135deg,#e17055,#c0392b);padding:24px;border-radius:8px 8px 0 0;text-align:center;color:white;margin:-30px -30px 24px;">
                <h1 style="margin:0;font-size:22px;">New Sale – Action Required!</h1>
                <p style="margin:6px 0 0;opacity:0.9;">Confirm within 48 hours</p>
              </div>
              <p>Hello <strong>${sellerName}</strong>,</p>
              <p>Great news! Someone just purchased your item and is waiting for your confirmation.</p>
              <div style="background:#fff3cd;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin:16px 0;text-align:center;">
                <p style="margin:0;font-weight:bold;color:#b45309;font-size:14px;">You must confirm within 48 hours or the order will be automatically cancelled.</p>
              </div>
              <div style="background:#f3fef7;border:1px solid #3ab26f;border-radius:8px;padding:16px;margin:20px 0;">
                <h3 style="margin:0 0 12px;color:#1f4e3d;font-size:14px;">📋 Sale Details</h3>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;width:40%;">Item</td><td style="padding:4px 0;">${bookTitle}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Buyer</td><td style="padding:4px 0;">${buyerName}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Order ID</td><td style="padding:4px 0;font-family:monospace;font-size:11px;">${orders.id}</td></tr>
                </table>
              </div>
              <p style="font-size:13px;"><strong>Steps to confirm:</strong><br/>
                1. Log in to your ReBooked Solutions account<br/>
                2. Go to Profile → Activity → Commits<br/>
                3. Click "Commit Sale" for this item<br/>
                4. We'll arrange courier pickup from your location
              </p>
              <a href="https://rebookedsolutions.co.za/profile?tab=activity" style="display:inline-block;padding:12px 20px;background:#3ab26f;color:#ffffff;text-decoration:none;border-radius:5px;margin-top:16px;font-weight:bold;">View & Confirm Sale →</a>
              ${FOOTER}
            </div>
          </div>`;

        try {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({ to: sellerEmail, subject: 'New Sale – Confirm Within 48 Hours | ReBooked Solutions', html: sellerEmailHtml }),
          });
          console.log('✅ Seller email sent');
        } catch (emailError) {
          console.warn('⚠️ Failed to send seller email:', emailError);
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