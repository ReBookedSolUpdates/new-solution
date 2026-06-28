import { supabase } from '@/integrations/supabase/client';
import { processBobPayRefund } from '@/integrations/supabase/bobpay-client';
import { toast } from 'sonner';

export interface RefundRequest {
  order_id: string;
  reason?: string;
}

interface PaymentTransaction {
  id: string;
  order_id: string;
  payment_method: string;
  paystack_response: any;
  reference: string;
}

/**
 * Detect payment provider from order data
 */
export const detectPaymentProvider = async (
  orderId: string
): Promise<'bobpay' | 'unknown'> => {
  try {
    const { data: transaction, error } = await supabase
      .from('payment_transactions')
      .select('payment_method')
      .eq('order_id', orderId)
      .single();

    if (error || !transaction) {
      return 'unknown';
    }

    // Check payment_method field
    if (transaction.payment_method === 'bobpay') {
      return 'bobpay';
    }

    return 'unknown';
  } catch (err) {
    return 'unknown';
  }
};

/**
 * Handle refund intelligently based on payment provider and order status
 */
export const handleIntelligentRefund = async (
  refundRequest: RefundRequest
): Promise<{ success: boolean; message: string }> => {
  try {
    const { order_id, reason } = refundRequest;

    // Get order details to check status
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('status, payment_reference')
      .eq('id', order_id)
      .single();

    if (orderError || !orderData) {
      throw new Error('Order not found');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // For committed orders, use the cancel-order-with-refund function
    if ((orderData.status || '').toLowerCase() === 'committed') {
      const { data, error } = await supabase.functions.invoke('cancel-order-with-refund', {
        body: {
          order_id,
          reason: reason || 'Order cancelled by user',
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Cancellation failed');
      }

      return {
        success: true,
        message: 'Order cancelled and refund processed successfully',
      };
    }

    // For uncommitted orders, use BobPay refund
    const { data, error } = await processBobPayRefund(
      {
        order_id,
        reason: reason || 'Refund requested',
      },
      session.access_token
    );

    if (error || !data?.success) {
      throw new Error(error?.message || data?.error || 'Refund failed');
    }

    return {
      success: true,
      message: `Refund processed successfully: ${data.data?.message || 'Refund in progress'}`,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Refund failed';
    return {
      success: false,
      message: errorMessage,
    };
  }
};

/**
 * Refund order for buyers (non-committed orders)
 */
export const refundOrderForBuyer = async (
  orderId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  return handleIntelligentRefund({
    order_id: orderId,
    reason: reason || 'Cancelled by Buyer',
  });
};

/**
 * Refund order for sellers (decline commit)
 */
export const refundOrderForDecline = async (
  orderId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  return handleIntelligentRefund({
    order_id: orderId,
    reason: reason || 'Seller declined to commit',
  });
};
