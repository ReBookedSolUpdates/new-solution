import { EMAIL_STYLES, EMAIL_FOOTER, createEmailTemplate } from "@/email-templates/styles";

export interface DenialEmailData {
  sellerName: string;
  bookTitle: string;
  orderId: string;
  denialReason: string;
  sellerEarnings: number;
  orderDate: string;
  deliveryDate: string;
}

export const createDenialEmailTemplate = (data: DenialEmailData): { subject: string; html: string; text: string } => {
  const subject = "Delivery Issue – Payment Delayed";
  
  const html = createEmailTemplate(
    {
      title: "Payment Delayed - ReBooked Solutions",
      headerType: "error",
      headerText: "⚠️ Payment Temporarily Delayed"
    },
    `
    <p>Hi <strong>${data.sellerName}</strong>,</p>
    
    <p>We're writing to inform you about a temporary delay in processing your payment for a recent book sale.</p>
    
    <div class="info-box-error">
      <strong>⚠️ Issue Identified:</strong> There was an issue with the delivery of your book that requires our review before we can process your payment.
    </div>
    
    <div class="info-box">
      <h3 style="margin-top: 0;">📋 Order Details</h3>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Book Title:</strong> ${data.bookTitle}</p>
      <p><strong>Expected Earnings:</strong> R${data.sellerEarnings.toFixed(2)}</p>
      <p><strong>Order Date:</strong> ${new Date(data.orderDate).toLocaleDateString()}</p>
      <p><strong>Delivery Date:</strong> ${new Date(data.deliveryDate).toLocaleDateString()}</p>
    </div>
    
    <div class="info-box-error">
      <strong>Reason for Delay:</strong><br>
      ${data.denialReason}
    </div>
    
    <h3>🔍 What happens next?</h3>
    <ul>
      <li><strong>Investigation:</strong> Our team is reviewing the delivery issue</li>
      <li><strong>Resolution:</strong> We'll work to resolve this fairly</li>
      <li><strong>Communication:</strong> We'll keep you updated</li>
      <li><strong>Payment:</strong> Once resolved, we'll process your payment immediately</li>
    </ul>
    
    <p><strong>Questions?</strong> Contact us at <a href="mailto:support@rebookedsolutions.co.za" class="link">support@rebookedsolutions.co.za</a></p>
    
    <p>Thank you for being part of ReBooked Solutions.</p>
    <p>Best regards,<br><strong>The ReBooked Solutions Team</strong></p>
    `
  );

  const text = `
Payment Delayed - ReBooked Solutions

Hi ${data.sellerName},

We're writing to inform you about a temporary delay in processing your payment for a recent book sale.

ISSUE IDENTIFIED:
There was an issue with the delivery of your book that requires our review.

ORDER DETAILS:
- Order ID: ${data.orderId}
- Book Title: ${data.bookTitle}
- Expected Earnings: R${data.sellerEarnings.toFixed(2)}
- Order Date: ${new Date(data.orderDate).toLocaleDateString()}
- Delivery Date: ${new Date(data.deliveryDate).toLocaleDateString()}

REASON FOR DELAY:
${data.denialReason}

WHAT HAPPENS NEXT:
1. Investigation: Our team is reviewing the delivery issue
2. Resolution: We'll work to resolve this fairly
3. Communication: We'll keep you updated
4. Payment: Once resolved, we'll process your payment immediately

QUESTIONS?
Contact us at support@rebookedsolutions.co.za

Best regards,
The ReBooked Solutions Team

"Books · Uniforms · Everything In Between"
  `;

  return { subject, html, text };
};

export const sendDenialEmail = async (emailData: DenialEmailData) => {
  const template = createDenialEmailTemplate(emailData);
  
  return template;
};
