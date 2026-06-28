import { EMAIL_STYLES, EMAIL_FOOTER, createEmailTemplate } from "@/email-templates/styles";

export interface OrderDeclinedBuyerData {
  buyerName: string;
  orderId: string;
  bookTitle: string;
  totalAmount: number;
  reason?: string;
  refundProcessed: boolean;
}

export const createOrderDeclinedBuyerEmail = (
  data: OrderDeclinedBuyerData
): { subject: string; html: string; text: string } => {
  const subject = "Order Declined - Refund Processed - ReBooked Solutions";

  const html = createEmailTemplate(
    {
      title: "Order Declined - Refund Processed",
      headerType: "error",
      headerText: "❌ Order Declined"
    },
    `
    <p>Hello ${data.buyerName},</p>
    
    <p>We're sorry to inform you that your order has been declined by the seller.</p>
    
    <div class="info-box-error">
      <h3 style="margin-top: 0;">📋 Order Details</h3>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Book:</strong> ${data.bookTitle}</p>
      <p><strong>Amount:</strong> R${data.totalAmount.toFixed(2)}</p>
      ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
    </div>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color: #10b981;">💰 Refund Status</h3>
      <p style="margin: 0;">
        ${data.refundProcessed 
          ? `Your refund of <strong>R${data.totalAmount.toFixed(2)}</strong> has been successfully processed and will appear in your account within 3-5 business days.`
          : `Your refund of <strong>R${data.totalAmount.toFixed(2)}</strong> is being processed and will appear in your account within 3-5 business days.`
        }
      </p>
    </div>
    
    <h3>🔍 What Happens Next</h3>
    <ul>
      <li>Your refund will be returned to your original payment method</li>
      <li>The book is no longer reserved and may be purchased by others</li>
      <li>You can search for other books on our marketplace</li>
    </ul>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://rebookedsolutions.co.za/books" class="btn">
        Browse More Books
      </a>
    </p>
    
    <p><strong>Questions?</strong> Contact us at <a href="mailto:support@rebookedsolutions.co.za" class="link">support@rebookedsolutions.co.za</a></p>
    
    <p>Thank you for using ReBooked Solutions!</p>
    <p>Best regards,<br><strong>The ReBooked Solutions Team</strong></p>
    `
  );

  const text = `
Order Declined - Refund Processed

Hello ${data.buyerName},

We're sorry to inform you that your order has been declined by the seller.

ORDER DETAILS:
- Order ID: ${data.orderId}
- Book: ${data.bookTitle}
- Amount: R${data.totalAmount.toFixed(2)}
${data.reason ? `- Reason: ${data.reason}` : ""}

REFUND STATUS:
${data.refundProcessed 
  ? `Your refund of R${data.totalAmount.toFixed(2)} has been successfully processed and will appear in your account within 3-5 business days.`
  : `Your refund of R${data.totalAmount.toFixed(2)} is being processed and will appear in your account within 3-5 business days.`
}

WHAT HAPPENS NEXT:
- Your refund will be returned to your original payment method
- The book is no longer reserved and may be purchased by others
- You can search for other books on our marketplace

Browse More Books: https://rebookedsolutions.co.za/books

QUESTIONS?
Contact us at support@rebookedsolutions.co.za

Thank you for using ReBooked Solutions!

Best regards,
The ReBooked Solutions Team

"Books · Uniforms · Everything In Between"
  `;

  return { subject, html, text };
};

export const sendOrderDeclinedBuyerEmail = async (
  emailData: OrderDeclinedBuyerData,
  emailService: any
): Promise<void> => {
  const template = createOrderDeclinedBuyerEmail(emailData);

  try {
    await emailService.sendEmail({
      to: emailData.buyerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    throw error;
  }
};
