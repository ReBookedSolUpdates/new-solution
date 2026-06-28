import { EMAIL_STYLES, EMAIL_FOOTER, createEmailTemplate } from "@/email-templates/styles";

export interface OrderDeclinedSellerData {
  sellerName: string;
  orderId: string;
  bookTitle: string;
  reason?: string;
}

export const createOrderDeclinedSellerEmail = (
  data: OrderDeclinedSellerData
): { subject: string; html: string; text: string } => {
  const subject = "Order Decline Confirmation - ReBooked Solutions";

  const html = createEmailTemplate(
    {
      title: "Order Decline Confirmation",
      headerType: "error",
      headerText: "✅ Order Decline Confirmed"
    },
    `
    <p>Hello ${data.sellerName},</p>
    
    <p>You have successfully declined the order commitment.</p>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color: #10b981;">📋 Order Details</h3>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Book Title:</strong> ${data.bookTitle}</p>
      ${data.reason ? `<p><strong>Your Reason:</strong> ${data.reason}</p>` : ""}
    </div>
    
    <h3>✅ What We've Done</h3>
    <ul>
      <li>The buyer has been notified of the decline</li>
      <li>The buyer's payment has been fully refunded</li>
      <li>Your book's stock has been automatically restored</li>
      <li>The book is now available for other buyers to purchase</li>
    </ul>
    
    <h3>📖 Next Steps</h3>
    <p>You can now:</p>
    <ul>
      <li>List the book again when you're ready to sell</li>
      <li>Make adjustments to the book listing price or details</li>
      <li>Continue selling other books on your account</li>
    </ul>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://rebookedsolutions.co.za/profile?tab=inventory" class="btn">
        View Your Inventory
      </a>
    </p>
    
    <p><strong>Questions?</strong> Contact us at <a href="mailto:support@rebookedsolutions.co.za" class="link">support@rebookedsolutions.co.za</a></p>
    
    <p>Thank you for being part of ReBooked Solutions!</p>
    <p>Best regards,<br><strong>The ReBooked Solutions Team</strong></p>
    `
  );

  const text = `
Order Decline Confirmation

Hello ${data.sellerName},

You have successfully declined the order commitment.

ORDER DETAILS:
- Order ID: ${data.orderId}
- Book Title: ${data.bookTitle}
${data.reason ? `- Your Reason: ${data.reason}` : ""}

WHAT WE'VE DONE:
- The buyer has been notified of the decline
- The buyer's payment has been fully refunded
- Your book's stock has been automatically restored
- The book is now available for other buyers to purchase

NEXT STEPS:
You can now:
- List the book again when you're ready to sell
- Make adjustments to the book listing price or details
- Continue selling other books on your account

View Your Inventory: https://rebookedsolutions.co.za/profile?tab=inventory

QUESTIONS?
Contact us at support@rebookedsolutions.co.za

Thank you for being part of ReBooked Solutions!

Best regards,
The ReBooked Solutions Team

"Books · Uniforms · Everything In Between"
  `;

  return { subject, html, text };
};

export const sendOrderDeclinedSellerEmail = async (
  emailData: OrderDeclinedSellerData,
  emailService: any
): Promise<void> => {
  const template = createOrderDeclinedSellerEmail(emailData);

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
