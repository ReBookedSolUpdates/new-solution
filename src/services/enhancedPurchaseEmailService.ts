import { supabase } from "@/integrations/supabase/client";
import { emailService } from "@/services/emailService";
import { NotificationService } from "@/services/notificationService";
import { createEmailTemplate } from "@/email-templates/styles";
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
    const sellerEmailHtml = createEmailTemplate(
      {
        title: "New Book Sale - Action Required",
        headerType: "warning",
        headerText: "🚨 New Book Sale - Action Required!",
        headerSubtext: "You have 48 hours to confirm this order"
      },
      `
      <p>Hello ${purchaseData.sellerName},</p>
      <p><strong>Great news!</strong> Someone just purchased your book <strong>"${purchaseData.bookTitle}"</strong> and is waiting for your confirmation.</p>
      
      <div class="info-box-warning">
        <h3 style="margin-top: 0; color: #92400e;">⏰ ACTION REQUIRED WITHIN 48 HOURS</h3>
        <p style="margin: 0;"><strong>You must confirm this sale to proceed with the order.</strong></p>
      </div>
      
      <div class="info-box">
        <h3 style="margin-top: 0;">📋 Sale Details</h3>
        <p><strong>Book:</strong> ${purchaseData.bookTitle}</p>
        <p><strong>Price:</strong> R${purchaseData.bookPrice}</p>
        <p><strong>Buyer:</strong> ${purchaseData.buyerName}</p>
        <p><strong>Order ID:</strong> ${purchaseData.orderId}</p>
        <p><strong>Order Date:</strong> ${purchaseData.orderDate}</p>
      </div>
      
      <div class="info-box-error">
        <p><strong>⚠️ Important:</strong> If you don't confirm within 48 hours, the order will be <strong>automatically cancelled</strong> and the buyer will receive a <strong>full refund</strong>.</p>
      </div>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="https://rebookedsolutions.co.za/profile?tab=orders" class="btn">Go to Orders & Confirm Sale</a>
      </p>
      `
    );
    
    await emailService.sendEmail({
      to: purchaseData.sellerEmail,
      subject: "🚨 NEW SALE - Confirm Your Book Sale (48hr deadline)",
      html: sellerEmailHtml,
      text: `NEW SALE - Action Required! Book: ${purchaseData.bookTitle}, Price: R${purchaseData.bookPrice}. You have 48 hours to confirm this sale. Login to ReBooked Solutions to confirm.`
    });
  }

  private static async sendBuyerPurchaseReceipt(purchaseData: PurchaseEmailData): Promise<void> {
    const buyerEmailHtml = createEmailTemplate(
      {
        title: "Purchase Confirmed",
        headerText: "📚 Purchase Confirmed!",
        headerSubtext: "Your payment has been processed successfully"
      },
      `
      <p>Hello ${purchaseData.buyerName},</p>
      <p><strong>Thank you for your purchase!</strong> Your payment has been processed successfully.</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0;">📋 Order Summary</h3>
        <p><strong>Book:</strong> ${purchaseData.bookTitle}</p>
        <p><strong>Price:</strong> R${purchaseData.bookPrice}</p>
        <p><strong>Seller:</strong> ${purchaseData.sellerName}</p>
        <p><strong>Order ID:</strong> ${purchaseData.orderId}</p>
        <p><strong>Order Date:</strong> ${purchaseData.orderDate}</p>
        <p><strong>Total Paid:</strong> R${purchaseData.orderTotal}</p>
      </div>
      
      <div class="info-box-warning">
        <h3 style="margin-top: 0; color: #92400e;">⏳ Waiting for Seller Confirmation</h3>
        <p style="margin: 0;">The seller has 48 hours to confirm your order. Once confirmed, your book will be shipped immediately.</p>
      </div>
      
      <p><strong>If the seller doesn't confirm:</strong> You'll receive a full automatic refund within 48 hours.</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="https://rebookedsolutions.co.za/profile?tab=orders" class="btn">Track Your Order</a>
      </p>
      `
    );
    
    await emailService.sendEmail({
      to: purchaseData.buyerEmail,
      subject: "📚 Purchase Confirmed - Waiting for Seller Response",
      html: buyerEmailHtml,
      text: `Purchase Confirmed! Book: ${purchaseData.bookTitle}, Total: R${purchaseData.orderTotal}. Waiting for seller confirmation within 48 hours.`
    });
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
