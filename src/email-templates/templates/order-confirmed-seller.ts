import { EMAIL_STYLES, EMAIL_FOOTER, createEmailTemplate } from "@/email-templates/styles";

export interface OrderConfirmedSellerData {
  sellerName: string;
  buyerName: string;
  orderId: string;
  bookTitles: string[];
  pickupType: "locker" | "door";
  trackingNumber?: string;
}

export const createOrderConfirmedSellerEmail = (
  data: OrderConfirmedSellerData
): { subject: string; html: string; text: string } => {
  const subject = "✅ Order Committed - Prepare for Pickup - ReBooked Solutions";

  const html = createEmailTemplate(
    {
      title: "Order Commitment Confirmed",
      headerType: "default",
      headerText: "✅ Order Commitment Confirmed!"
    },
    `
    <p>Hello ${data.sellerName},</p>
    
    <p><strong>Thank you!</strong> You've successfully committed to sell your book(s). The buyer has been notified and pickup has been scheduled ${data.pickupType === "locker" ? "from your selected locker" : "from your address"}.</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0;">📋 Order Details</h3>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Book(s):</strong> ${data.bookTitles.join(", ")}</p>
      <p><strong>Buyer:</strong> ${data.buyerName}</p>
      <p><strong>Pickup Method:</strong> ${data.pickupType === "locker" ? "🔐 Locker Pickup" : "🚪 Door-to-Door Pickup"}</p>
      ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ""}
    </div>
    
    <h3>📦 What You Need to Do</h3>
    ${data.pickupType === "locker" 
      ? `<p>Please drop off your package at the selected locker location within 24 hours. The locker details have been sent to you separately.</p>`
      : `<p>A courier will contact you within 24 hours to arrange pickup from your address. Please ensure your book(s) are well-packaged and ready.</p>`
    }
    
    <h3>✅ Important Reminders</h3>
    <ul>
      <li>Ensure the book(s) are in the same condition as described in the listing</li>
      <li>Pack securely to protect during transit</li>
      <li>Be available for pickup or drop-off at the locker within 24 hours</li>
      <li>Keep the tracking number for your records</li>
    </ul>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color: #10b981;">💰 Payment</h3>
      <p style="margin: 0;">You'll receive payment once the buyer confirms delivery. Payment will be added to your wallet within 24 hours.</p>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://rebookedsolutions.co.za/profile?tab=orders" class="btn">
        View Your Orders
      </a>
    </p>
    
    <p><strong>Questions?</strong> Contact us at <a href="mailto:support@rebookedsolutions.co.za" class="link">support@rebookedsolutions.co.za</a></p>
    
    <p>Thank you for selling with ReBooked Solutions! 📚</p>
    <p>Best regards,<br><strong>The ReBooked Solutions Team</strong></p>
    `
  );

  const text = `
Order Commitment Confirmed - Prepare for Pickup

Hello ${data.sellerName},

Thank you! You've successfully committed to sell your book(s). The buyer has been notified and pickup has been scheduled ${data.pickupType === "locker" ? "from your selected locker" : "from your address"}.

ORDER DETAILS:
- Order ID: ${data.orderId}
- Book(s): ${data.bookTitles.join(", ")}
- Buyer: ${data.buyerName}
- Pickup Method: ${data.pickupType === "locker" ? "Locker Pickup" : "Door-to-Door Pickup"}
${data.trackingNumber ? `- Tracking Number: ${data.trackingNumber}` : ""}

WHAT YOU NEED TO DO:
${data.pickupType === "locker" 
  ? `Please drop off your package at the selected locker location within 24 hours. The locker details have been sent to you separately.`
  : `A courier will contact you within 24 hours to arrange pickup from your address. Please ensure your book(s) are well-packaged and ready.`
}

IMPORTANT REMINDERS:
- Ensure the book(s) are in the same condition as described in the listing
- Pack securely to protect during transit
- Be available for pickup or drop-off at the locker within 24 hours
- Keep the tracking number for your records

PAYMENT:
You'll receive payment once the buyer confirms delivery. Payment will be added to your wallet within 24 hours.

View Your Orders: https://rebookedsolutions.co.za/profile?tab=orders

QUESTIONS?
Contact us at support@rebookedsolutions.co.za

Thank you for selling with ReBooked Solutions! 📚

Best regards,
The ReBooked Solutions Team

"Books · Uniforms · Everything In Between"
  `;

  return { subject, html, text };
};

export const sendOrderConfirmedSellerEmail = async (
  emailData: OrderConfirmedSellerData,
  emailService: any
): Promise<void> => {
  const template = createOrderConfirmedSellerEmail(emailData);

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
