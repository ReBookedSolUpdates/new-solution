import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment-based key switching
const isProd = Deno.env.get('IS_PRODUCTION') === 'true';

const BOBPAY_BASE_URL = isProd
  ? Deno.env.get('BOBPAY_BASE_URL')
  : Deno.env.get('SANDBOX_BOBPAY_BASE_URL');

const BOBPAY_PASSPHRASE = isProd
  ? Deno.env.get('BOBPAY_PASSPHRASE')
  : Deno.env.get('SANDBOX_BOBPAY_PASSPHRASE');

const BOBPAY_API_TOKEN = isProd
  ? Deno.env.get('BOBPAY_API_TOKEN')
  : Deno.env.get('SANDBOX_BOBPAY_API_TOKEN');

const BOBPAY_API_URL = isProd
  ? Deno.env.get('BOBPAY_API_URL')
  : Deno.env.get('SANDBOX_BOBPAY_API_URL');

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
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return calculatedSignature === webhookData.signature;
  } catch (error) {
    return false;
  }
}

async function markBookAsSold(supabaseClient: any, bookId: string): Promise<boolean> {
  try {
    const { data: bookData, error: bookFetchError } = await supabaseClient
      .from('books')
      .select('id, title, available_quantity, sold_quantity, sold, availability')
      .eq('id', bookId)
      .single();

    if (bookFetchError || !bookData) return false;
    if (bookData.sold) return true;

    const { error: bookUpdateError } = await supabaseClient
      .from('books')
      .update({
        sold: true,
        availability: 'sold',
        sold_at: new Date().toISOString(),
        sold_quantity: (bookData.sold_quantity || 0) + 1,
        available_quantity: Math.max(0, (bookData.available_quantity || 0) - 1),
      })
      .eq('id', bookId)
      .eq('sold', false);

    return !bookUpdateError;
  } catch (error) {
    return false;
  }
}

async function unmarkBookAsSold(supabaseClient: any, bookId: string): Promise<void> {
  try {
    const { data: bookData } = await supabaseClient
      .from('books')
      .select('id, sold, available_quantity, sold_quantity')
      .eq('id', bookId)
      .single();

    if (!bookData || !bookData.sold) return;

    await supabaseClient
      .from('books')
      .update({
        sold: false,
        availability: 'available',
        sold_at: null,
        sold_quantity: Math.max(0, (bookData.sold_quantity || 1) - 1),
        available_quantity: (bookData.available_quantity || 0) + 1,
      })
      .eq('id', bookId);
  } catch (error) {
    console.error('⚠️ Failed to unmark book:', error);
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

    // Verify signature
    if (!BOBPAY_PASSPHRASE) {
      throw new Error('BobPay passphrase not configured');
    }

    const isValidSignature = await verifySignature(webhookData, BOBPAY_PASSPHRASE);
    if (!isValidSignature) {
      return new Response('Invalid signature', { status: 400 });
    }

    // Validate with BobPay API
    if (BOBPAY_API_URL && BOBPAY_API_TOKEN) {
      const validationResponse = await fetch(
        `${BOBPAY_API_URL}/payments/intents/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BOBPAY_API_TOKEN}` },
          body: JSON.stringify(webhookData),
        }
      );

      if (!validationResponse.ok) {
        return new Response('Payment validation failed', { status: 400 });
      }
    }

    // Find the order
    const { data: orders, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('payment_reference', webhookData.custom_payment_id)
      .maybeSingle();

    if (orderError || !orders) {
      return new Response('Order not found', { status: 404 });
    }

    // Update payment transaction
    await supabaseClient
      .from('payment_transactions')
      .update({
        status: webhookData.status === 'paid' ? 'success' : webhookData.status,
        verified_at: new Date().toISOString(),
        paystack_response: { ...webhookData, provider: 'bobpay' },
      })
      .eq('reference', webhookData.custom_payment_id);

    const bookId = orders.book_id || (orders.items?.[0]?.book_id);
    const bookTitle = orders.items?.[0]?.title || orders.items?.[0]?.book_title || 'Book';

    if (webhookData.status === 'paid') {
      // Idempotency guard: BobPay can retry webhooks.
      // If we've already processed payment, do not send emails again.
      if (orders.payment_status === 'paid') {
        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      // Mark book as sold ONLY after payment confirmed
      if (bookId) {
        const bookMarked = await markBookAsSold(supabaseClient, bookId);
        if (!bookMarked) {
          await supabaseClient.from('orders').update({
            payment_status: 'paid',
            status: 'cancelled',
            cancellation_reason: 'Book was sold to another buyer',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', orders.id);

          await supabaseClient.from('order_notifications').insert({
            order_id: orders.id,
            user_id: orders.buyer_id,
            type: 'order_cancelled',
            title: 'Order Cancelled - Refund Processing',
            message: 'The book was sold to another buyer. A full refund will be processed.',
          });

          return new Response('OK', { status: 200, headers: corsHeaders });
        }
      }

      // Update order status
      const commitDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await supabaseClient.from('orders').update({
        payment_status: 'paid',
        status: 'pending_commit',
        paid_at: new Date().toISOString(),
        commit_deadline: commitDeadline.toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', orders.id);

      // Create notifications
      await Promise.all([
        supabaseClient.from('order_notifications').insert({
          order_id: orders.id,
          user_id: orders.buyer_id,
          type: 'payment_success',
          title: 'Payment Successful',
          message: `Your payment of R${webhookData.paid_amount.toFixed(2)} has been confirmed.`,
        }),
        supabaseClient.from('order_notifications').insert({
          order_id: orders.id,
          user_id: orders.seller_id,
          type: 'order_paid',
          title: 'New Order Received',
          message: `You have a new order for "${bookTitle}". Please commit within 48 hours.`,
        }),
      ]);

      // Log activity
      await Promise.allSettled([
        supabaseClient.from('activity_logs').insert({
          user_id: orders.buyer_id,
          action: 'purchase',
          entity_type: 'order',
          entity_id: orders.id,
          metadata: { order_id: orders.id, book_id: bookId, amount: webhookData.paid_amount },
        }),
        supabaseClient.from('activity_logs').insert({
          user_id: orders.seller_id,
          action: 'sale',
          entity_type: 'order',
          entity_id: orders.id,
          metadata: { order_id: orders.id, book_id: bookId, amount: webhookData.paid_amount },
        }),
      ]);

      // Send emails with correct branding
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

      if (buyerEmail && supabaseUrl && supabaseServiceKey) {
        const paymentReference = orders.payment_reference || orders.paystack_reference || webhookData.custom_payment_id;
        const commitDeadlineText = commitDeadline.toLocaleString('en-ZA', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

        const buyerEmailHtml = `
          <div style="font-family: Arial, sans-serif; background: #f3fef7; padding: 20px; color: #1f4e3d;">
            <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <h1 style="color: #1f4e3d; margin-top: 0;">📚 Payment Confirmed!</h1>
              <p>Hello ${buyerName},</p>
              <p><strong>Thank you for your purchase!</strong> Your payment has been processed successfully.</p>
              <div style="background-color: #f3fef7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f4e3d; margin-top: 0;">Receipt</h3>
                <p><strong>Item:</strong> ${bookTitle}</p>
                <p><strong>Seller:</strong> ${sellerName}</p>
                <p><strong>Order ID:</strong> ${orders.id}</p>
                <p><strong>Payment Reference:</strong> ${paymentReference}</p>
                <p><strong>Total Paid:</strong> R${webhookData.paid_amount.toFixed(2)}</p>
                <p><strong>Seller Commit Deadline:</strong> ${commitDeadlineText}</p>
              </div>
              <p>The seller has 48 hours to confirm your order. If they don't confirm, you'll receive a full automatic refund.</p>
              <a href="https://rebookedsolutions.co.za/profile" style="display: inline-block; padding: 12px 20px; background: #3ab26f; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold;">View Your Orders</a>
            </div>
            <div style="text-align: center; padding: 15px; font-size: 12px; color: #666;">
              <p>For assistance: <a href="mailto:support@rebookedsolutions.co.za" style="color: #3ab26f;">support@rebookedsolutions.co.za</a></p>
            </div>
          </div>`;

        try {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({ to: buyerEmail, subject: '📚 Payment Confirmed - Waiting for Seller Response', html: buyerEmailHtml }),
          });
        } catch (e) {}
      }

      if (sellerEmail && supabaseUrl && supabaseServiceKey) {
        const sellerEmailHtml = `
          <div style="font-family: Arial, sans-serif; background: #f3fef7; padding: 20px; color: #1f4e3d;">
            <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <h1 style="color: #e74c3c; margin-top: 0;">🚨 New Book Sale - Action Required!</h1>
              <p>Hello ${sellerName},</p>
              <p><strong>Great news!</strong> Someone purchased your book.</p>
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #e17055; margin-top: 0;">⏰ ACTION REQUIRED WITHIN 48 HOURS</h3>
                <p><strong>You must confirm this sale to proceed.</strong></p>
              </div>
              <div style="background-color: #f3fef7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Book:</strong> ${bookTitle}</p>
                <p><strong>Buyer:</strong> ${buyerName}</p>
                <p><strong>Order ID:</strong> ${orders.id}</p>
              </div>
              <a href="https://rebookedsolutions.co.za/profile" style="display: inline-block; padding: 12px 20px; background: #3ab26f; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold;">View & Confirm Sale</a>
            </div>
            <div style="text-align: center; padding: 15px; font-size: 12px; color: #666;">
              <p>For assistance: <a href="mailto:support@rebookedsolutions.co.za" style="color: #3ab26f;">support@rebookedsolutions.co.za</a></p>
            </div>
          </div>`;

        try {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({ to: sellerEmail, subject: '🚨 NEW SALE - Confirm Your Book Sale (48hr deadline)', html: sellerEmailHtml }),
          });
        } catch (e) {}
      }

    } else if (webhookData.status === 'failed' || webhookData.status === 'cancelled') {
      await supabaseClient.from('orders').update({
        payment_status: webhookData.status,
        status: 'cancelled',
        cancellation_reason: `Payment ${webhookData.status}`,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', orders.id);

      if (bookId) {
        await unmarkBookAsSold(supabaseClient, bookId);
      }

      await supabaseClient.from('order_notifications').insert({
        order_id: orders.id,
        user_id: orders.buyer_id,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your payment could not be processed. Status: ${webhookData.status}`,
      });
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response('Received', { status: 200, headers: corsHeaders });
  }
});
