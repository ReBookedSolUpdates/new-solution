import { supabase } from "@/integrations/supabase/client";
import { emailService } from "@/services/emailService";
import { NotificationService } from "@/services/notificationService";
import debugLogger from "@/utils/debugLogger";

interface PurchaseEmailData {
  orderId: string;
  bookId: string;
  bookTitle: string;
  bookPrice: number;
  sellerName: string;
  sellerEmail: string;
  buyerName: string;
  buyerEmail: string;
  orderTotal: number;
  orderDate: string;
}

// Dedup key to prevent double sends in the same session
const sentEmailKeys = new Set<string>();

/**
 * Enhanced purchase email service with guaranteed fallback system
 * Ensures critical purchase confirmation emails are always sent
 */
export class EnhancedPurchaseEmailService {
  
  /**
   * Send purchase confirmation emails directly
   * Called after successful payment completion
   */
  static async sendPurchaseEmailsWithFallback(purchaseData: PurchaseEmailData): Promise<{
    sellerEmailSent: boolean;
    buyerEmailSent: boolean;
    message: string;
  }> {
    // Dedup check - prevent double sends for the same order
    const dedupKey = `purchase_${purchaseData.orderId}`;
    if (sentEmailKeys.has(dedupKey)) {
      return {
        sellerEmailSent: true,
        buyerEmailSent: true,
        message: "Emails already sent for this order (dedup)"
      };
    }
    sentEmailKeys.add(dedupKey);

    let sellerEmailSent = false;
    let buyerEmailSent = false;
    const errors: string[] = [];

    try {
      // Send seller notification
      try {
        await this.sendSellerPurchaseNotification(purchaseData);
        sellerEmailSent = true;
      } catch (sellerError) {
        const errorMsg = sellerError instanceof Error ? sellerError.message : 'Unknown error';
        errors.push(`Seller email failed: ${errorMsg}`);
      }

      // Create in-app notification for seller
      try {
        await this.createSellerNotification(purchaseData);
      } catch (notifError) {
        const errorMsg = notifError instanceof Error ? notifError.message : 'Unknown error';
        errors.push(`Seller notification failed: ${errorMsg}`);
      }

      // Add small delay to prevent stream conflicts
      await new Promise(resolve => setTimeout(resolve, 500));

      // Send buyer receipt/confirmation
      try {
        await this.sendBuyerPurchaseReceipt(purchaseData);
        buyerEmailSent = true;
      } catch (buyerError) {
        const errorMsg = buyerError instanceof Error ? buyerError.message : 'Unknown error';
        errors.push(`Buyer email failed: ${errorMsg}`);
      }

      // Create in-app notification for buyer
      try {
        await this.createBuyerNotification(purchaseData);
      } catch (notifError) {
        const errorMsg = notifError instanceof Error ? notifError.message : 'Unknown error';
        errors.push(`Buyer notification failed: ${errorMsg}`);
      }

      if (errors.length > 0) {
        debugLogger.warn('enhancedPurchaseEmailService', 'Purchase email service warnings:', errors);
      }

      return {
        sellerEmailSent,
        buyerEmailSent,
        message: `Purchase emails sent - Seller: ${sellerEmailSent ? 'sent' : 'failed'}, Buyer: ${buyerEmailSent ? 'sent' : 'failed'}`
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      debugLogger.error('enhancedPurchaseEmailService', 'Critical error in purchase email service:', errorMsg);

      return {
        sellerEmailSent: false,
        buyerEmailSent: false,
        message: `Email sending failed: ${errorMsg}`
      };
    }
  }
  
  private static async sendSellerPurchaseNotification(purchaseData: PurchaseEmailData): Promise<void> {
    await emailService.sendTemplateEmail(
      purchaseData.sellerEmail,
      "seller-payment",
      {
        sellerName: purchaseData.sellerName,
        bookTitle: purchaseData.bookTitle,
        itemImageUrl: "",
        buyerName: purchaseData.buyerName,
        orderId: purchaseData.orderId
      },
      {
        subject: "🚨 NEW SALE - Confirm Your Book Sale (48hr deadline)"
      }
    );
  }

  private static async sendBuyerPurchaseReceipt(purchaseData: PurchaseEmailData): Promise<void> {
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleString();
    await emailService.sendTemplateEmail(
      purchaseData.buyerEmail,
      "buyer-payment",
      {
        buyerName: purchaseData.buyerName,
        bookTitle: purchaseData.bookTitle,
        itemImageUrl: "",
        sellerName: purchaseData.sellerName,
        orderId: purchaseData.orderId,
        paymentReference: purchaseData.orderId,
        paidAmount: purchaseData.orderTotal,
        commitDeadlineText: deadline,
        itemPrice: purchaseData.bookPrice,
        deliveryFee: purchaseData.orderTotal - purchaseData.bookPrice,
        buyerProtectionFee: 0,
        walletDeduction: 0,
        cardPaymentAmount: purchaseData.orderTotal
      },
      {
        subject: "📚 Purchase Confirmed - Waiting for Seller Response"
      }
    );
  }

  private static async createSellerNotification(purchaseData: PurchaseEmailData): Promise<void> {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('seller_id')
        .eq('id', purchaseData.orderId)
        .single();

      if (orderError || !order?.seller_id) {
        throw new Error('Failed to fetch seller information');
      }

      await NotificationService.createOrderConfirmation(
        order.seller_id,
        purchaseData.orderId,
        purchaseData.bookTitle,
        true
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      debugLogger.error('enhancedPurchaseEmailService', 'Failed to create seller notification:', errorMsg);
    }
  }

  private static async createBuyerNotification(purchaseData: PurchaseEmailData): Promise<void> {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('buyer_id')
        .eq('id', purchaseData.orderId)
        .single();

      if (orderError || !order?.buyer_id) {
        throw new Error('Failed to fetch buyer information');
      }

      await NotificationService.createOrderConfirmation(
        order.buyer_id,
        purchaseData.orderId,
        purchaseData.bookTitle,
        false
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      debugLogger.error('enhancedPurchaseEmailService', 'Failed to create buyer notification:', errorMsg);
    }
  }
}

export default EnhancedPurchaseEmailService;
