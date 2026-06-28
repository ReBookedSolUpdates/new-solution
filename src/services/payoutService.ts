import { supabase } from "@/integrations/supabase/client";
import debugLogger from "@/utils/debugLogger";

export interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  requested_at: string;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  admin_notes: string | null;
}

export interface CreatePayoutRequestData {
  amount: number;
  notes?: string;
}

export interface PayoutResult {
  success: boolean;
  payout_id?: string;
  error?: string;
}

export class PayoutService {
  /**
   * Create a new payout request
   */
  static async createPayoutRequest(data: CreatePayoutRequestData): Promise<PayoutResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: "User not authenticated",
        };
      }

      // Get current wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from("user_wallets")
        .select("available_balance")
        .eq("user_id", user.id)
        .single();

      if (walletError || !walletData) {
        return {
          success: false,
          error: "Wallet not found",
        };
      }

      // Check balance - both amounts are in rands (stored as integers)
      if (walletData.available_balance < data.amount) {
        return {
          success: false,
          error: "Insufficient balance",
        };
      }

      // Call the database function to create payout request
      // Pass amount in rands (as stored in database)
      const { data: payoutId, error: payoutError } = await supabase
        .rpc("create_payout_request", {
          p_user_id: user.id,
          p_amount: Math.round(data.amount),
        });

      if (payoutError || !payoutId) {
        return {
          success: false,
          error: payoutError?.message || "Failed to create payout request",
        };
      }

      // Update payout request with notes if provided
      if (data.notes) {
        await supabase
          .from("payout_requests")
          .update({ notes: data.notes })
          .eq("id", payoutId);
      }

      // Send notifications for cash out processing
      try {
        const { NotificationService } = await import("@/services/notificationService");
        await NotificationService.createNotification({
          userId: user.id,
          type: "wallet",
          title: "Cash Out Processing",
          message: `Your request to cash out R${data.amount} has been received and is being processed. It may take 1-3 business days to reflect in your account.`,
        });
      } catch (notifErr) {
        console.warn("Failed to create cash out app notification:", notifErr);
      }

      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("name, first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();

        const userName = profileData
          ? [profileData.first_name, profileData.last_name].filter(Boolean).join(" ") || profileData.name || "there"
          : "there";

        const { EmailService } = await import("@/services/emailService");
        const { createEmailTemplate } = await import("@/email-templates/styles");
        const emailService = new EmailService();
        const htmlContent = createEmailTemplate(
          {
            title: "Cash Out Processing",
            headerType: "default",
            headerText: "💸 Cash Out Request",
            headerSubtext: "Your cash out is being processed"
          },
          `
          <p>Hi ${userName},</p>
          <p>Your request to cash out <strong>R${data.amount}</strong> from your ReBooked wallet has been received and is currently being processed.</p>
          <div class="info-box-success">
            <p><strong>Requested Amount:</strong> R${data.amount}</p>
            <p><strong>Status:</strong> Processing</p>
          </div>
          <p>Payouts are typically processed to your registered South African bank account within 1–3 business days, provided there are no active holds or disputes on your account.</p>
          <p>We will notify you as soon as the funds have been paid out.</p>
          `
        );

        await emailService.sendEmail({
          to: user.email!,
          subject: `Cash out request processing - R${data.amount}`,
          html: htmlContent,
        });
      } catch (emailErr) {
        console.warn("Failed to send cash out email:", emailErr);
      }

      return {
        success: true,
        payout_id: payoutId,
      };
    } catch (error) {
      debugLogger.error("payoutService", "Error in createPayoutRequest:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get all payout requests for current user
   */
  static async getPayoutRequests(): Promise<PayoutRequest[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false });

      if (error) {
        debugLogger.error("payoutService", "Error fetching payout requests:", error);
        return [];
      }

      return (data || []).map((payout: any) => ({
        id: payout.id,
        user_id: payout.user_id,
        amount: Math.floor(payout.amount / 100),
        status: payout.status,
        requested_at: payout.requested_at,
        approved_at: payout.approved_at,
        paid_at: payout.paid_at,
        notes: payout.notes,
        admin_notes: payout.admin_notes,
      }));
    } catch (error) {
      debugLogger.error("payoutService", "Error in getPayoutRequests:", error);
      return [];
    }
  }

  /**
   * Get a specific payout request
   */
  static async getPayoutRequest(payoutId: string): Promise<PayoutRequest | null> {
    try {
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("id", payoutId)
        .single();

      if (error || !data) {
        debugLogger.error("payoutService", "Error fetching payout request:", error);
        return null;
      }

      return {
        id: data.id,
        user_id: data.user_id,
        amount: Math.floor(data.amount / 100),
        status: data.status,
        requested_at: data.requested_at,
        approved_at: data.approved_at,
        paid_at: data.paid_at,
        notes: data.notes,
        admin_notes: data.admin_notes,
      };
    } catch (error) {
      debugLogger.error("payoutService", "Error in getPayoutRequest:", error);
      return null;
    }
  }

  /**
   * Cancel a payout request (admin only - refunds balance)
   */
  static async cancelPayoutRequest(payoutId: string): Promise<PayoutResult> {
    try {
      const { data: cancelResult, error: cancelError } = await supabase
        .rpc("cancel_payout_request", {
          p_payout_id: payoutId,
        });

      if (cancelError || !cancelResult) {
        return {
          success: false,
          error: cancelError?.message || "Failed to cancel payout request",
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      debugLogger.error("payoutService", "Error in cancelPayoutRequest:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get status badge color
   */
  static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  }

  /**
   * Format amount in ZAR
   */
  static formatZAR(amount: number): string {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  }
}
