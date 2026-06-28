import { EMAIL_STYLES, EMAIL_FOOTER, createEmailTemplate } from "@/email-templates/styles";

export interface SellerCreditNotificationData {
  sellerName: string;
  bookTitle: string;
  bookPrice: number;
  creditAmount: number;
  orderId: string;
  newBalance: number;
}

export const createSellerCreditNotificationEmail = (
  data: SellerCreditNotificationData
): { subject: string; html: string; text: string } => {
  const subject = `💰 Payment Received - Credit Added to Your Account - ReBooked Solutions`;

  const html = createEmailTemplate(
    {
      title: "Payment Received",
      headerType: "default",
      headerText: "💰 Payment Received!",
      headerSubtext: "Your book has been delivered and credit has been added"
    },
    `
    <p>Hello ${data.sellerName},</p>
    
    <p><strong>Great news!</strong> Your book <strong>"${data.bookTitle}"</strong> has been successfully delivered and received by the buyer. Your payment is now available in your wallet!</p>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color: #10b981;">✅ Payment Confirmed</h3>
      <p style="margin: 0;"><strong>Credit has been added to your account!</strong></p>
    </div>
    
    <div class="info-box">
      <h3 style="margin-top: 0;">📋 Transaction Details</h3>
      <p><strong>Book Title:</strong> ${data.bookTitle}</p>
      <p><strong>Book Price:</strong> R${data.bookPrice.toFixed(2)}</p>
      <p><strong>Commission Rate:</strong> 10% (You keep 90%)</p>
      <p style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;"><strong>Credit Added:</strong> <span style="font-size: 1.2em; color: #10b981;">R${data.creditAmount.toFixed(2)}</span></p>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
    </div>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color: #10b981;">💳 Your New Wallet Balance</h3>
      <p style="margin: 0; font-size: 1.1em; color: #10b981;"><strong>R${data.newBalance.toFixed(2)}</strong></p>
    </div>
    
    <h3>💡 What You Can Do Next:</h3>
    <ul>
      <li>List more books and earn from new sales</li>
      <li>Request a payout to your bank account</li>
      <li>View your wallet transaction history</li>
    </ul>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://rebookedsolutions.co.za/profile?tab=overview" class="btn">
        View Your Wallet & Profile
      </a>
    </p>
    
    <p><strong>Questions?</strong> Contact us at <a href="mailto:support@rebookedsolutions.co.za" class="link">support@rebookedsolutions.co.za</a></p>
    
    <p>Thank you for selling on ReBooked Solutions!</p>
    <p>Best regards,<br><strong>The ReBooked Solutions Team</strong></p>
    `
  );

  const text = `
PAYMENT RECEIVED - Credit Added to Your Account

Hello ${data.sellerName},

Great news! Your book "${data.bookTitle}" has been successfully delivered and received by the buyer. Your payment is now available in your wallet!

TRANSACTION DETAILS:
- Book Title: ${data.bookTitle}
- Book Price: R${data.bookPrice.toFixed(2)}
- Commission Rate: 10% (You keep 90%)
- Credit Added: R${data.creditAmount.toFixed(2)}
- Order ID: ${data.orderId}

YOUR NEW WALLET BALANCE:
R${data.newBalance.toFixed(2)}

WHAT YOU CAN DO NEXT:
- List more books and earn from new sales
- Request a payout to your bank account
- View your wallet transaction history

View Your Wallet & Profile: https://rebookedsolutions.co.za/profile?tab=overview

QUESTIONS?
Contact us at support@rebookedsolutions.co.za

Best regards,
The ReBooked Solutions Team

"Books · Uniforms · Everything In Between"
  `;

  return { subject, html, text };
};

export const sendSellerCreditNotificationEmail = async (
  emailData: SellerCreditNotificationData,
  emailService: any
): Promise<void> => {
  const template = createSellerCreditNotificationEmail(emailData);

  try {
    await emailService.sendEmail({
      to: emailData.sellerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    throw error;
  }
};
