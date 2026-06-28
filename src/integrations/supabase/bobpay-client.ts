// BobPay Edge Function client
// Provides typed wrappers for BobPay payment operations via Supabase Edge Functions

import { supabase } from "@/integrations/supabase/client";
import { IS_PRODUCTION } from "@/config/envParser";

export interface BobPayInitRequest {
  // ... (keep interface as is)
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

export interface BobPayRefundRequest {
  order_id: string;
  payment_id?: number;
  reason?: string;
}

export interface BobPayResponse {
  success: boolean;
  data?: {
    payment_url: string;
    short_url: string;
    reference: string;
  };
  error?: string;
}

export interface BobPayRefundResponse {
  success: boolean;
  data?: {
    refund_id: string;
    amount: number;
    status: string;
    message: string;
  };
  error?: string;
}

/**
 * Initialize a BobPay payment via edge function
 */
export async function initializeBobPayPayment(
  paymentData: BobPayInitRequest,
  authToken: string
): Promise<{ data: BobPayResponse | null; error: Error | null }> {
  try {
    const functionName = "bobpay-initialize-payment";
    const { data, error } = await supabase.functions.invoke(
      functionName,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: {
          ...paymentData,
          is_sandbox: !IS_PRODUCTION,
        },
      }
    );

    if (error) {
      return { data: null, error };
    }

    return { data: data as BobPayResponse, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Process a BobPay refund via edge function
 */
export async function processBobPayRefund(
  refundData: BobPayRefundRequest,
  authToken: string
): Promise<{ data: BobPayRefundResponse | null; error: Error | null }> {
  try {
    const functionName = "bobpay-refund";
    const { data, error } = await supabase.functions.invoke(functionName, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: refundData,
    });

    if (error) {
      return { data: null, error };
    }

    return { data: data as BobPayRefundResponse, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
