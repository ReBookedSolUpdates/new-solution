import { EMAIL_STYLES, EMAIL_FOOTER, createEmailTemplate } from "@/email-templates/styles";

export interface OrderConfirmedBuyerData {
  buyerName: string;
  sellerName: string;
  orderId: string;
  bookTitles: string[];
  deliveryType: "locker" | "door";
  trackingNumber?: string;
}

export const createOrderConfirmedBuyerEmail = (
  data: OrderConfirmedBuyerData
): { subject: string; html: string; text: string } => {
  const subject = "🎉 Order Confirmed - Book on the Way - ReBooked Solutions";

  const html = createEmailTemplate(
    {
      title: "Order Confirmed",
      headerType: "default",
      headerText: "🎉 Order Confirmed!"
    },
    `
    <p>Hello ${data.buyerName},</p>
    
    <p><strong>Great news!</strong> <strong>${data.sellerName}</strong> has confirmed your order and is preparing your book(s) for delivery ${data.deliveryType === "locker" ? "to your selected locker" : "to your door"}.</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0;">📚 Order Details</h3>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Book(s):</strong> ${data.bookTitles.join(", ")}</p>
      <p><strong>Seller:</strong> ${data.sellerName}</p>
      <p><strong>Delivery Method:</strong> ${data.deliveryType === "locker" ? "🔐 Locker Delivery" : "🚪 Door-to-Door Delivery"}</p>
      <p><strong>Estimated Delivery:</strong> 2-3 business days</p>
      ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ""}
    </div>
    
    <h3>📖 What's Next?</h3>
    <ul>
      <li>A courier will be sent to collect the book(s) from the seller</li>
      <li>Once collected, you'll receive a tracking update</li>
      <li>You'll be able to track your package in real-time</li>
      <li>Delivery will be within 2-3 business days</li>
    </ul>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color: #10b981;">✅ Confirmation</h3>
      <p style="margin: 0;">Your order is confirmed and secured. The seller is committed to delivering your book(s).</p>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="https://rebookedsolutions.co.za/profile?tab=orders" class="btn">
        Track Your Order
      </a>
    </p>
    
    <p><strong>Questions?</strong> Contact us at <a href="mailto:support@rebookedsolutions.co.za" class="link">support@rebookedsolutions.co.za</a></p>
    
    <p>Happy reading! 📖</p>
    <p>Best regards,<br><strong>The ReBooked Solutions Team</strong></p>
    `
  );

  const text = `
Order Confirmed - Book on the Way

Hello ${data.buyerName},

Great news! ${data.sellerName} has confirmed your order and is preparing your book(s) for delivery ${data.deliveryType === "locker" ? "to your selected locker" : "to your door"}.

ORDER DETAILS:
- Order ID: ${data.orderId}
- Book(s): ${data.bookTitles.join(", ")}
- Seller: ${data.sellerName}
- Delivery Method: ${data.deliveryType === "locker" ? "Locker Delivery" : "Door-to-Door Delivery"}
- Estimated Delivery: 2-3 business days
${data.trackingNumber ? `- Tracking Number: ${data.trackingNumber}` : ""}

WHAT'S NEXT?
- A courier will be sent to collect the book(s) from the seller
- Once collected, you'll receive a tracking update
- You'll be able to track your package in real-time
- Delivery will be within 2-3 business days

CONFIRMATION:
Your order is confirmed and secured. The seller is committed to delivering your book(s).

Track Your Order: https://rebookedsolutions.co.za/profile?tab=orders

QUESTIONS?
Contact us at support@rebookedsolutions.co.za

Happy reading! 📖

Best regards,
The ReBooked Solutions Team

"Books · Uniforms · Everything In Between"
  `;

  return { subject, html, text };
};

export const sendOrderConfirmedBuyerEmail = async (
  emailData: OrderConfirmedBuyerData,
  emailService: any
): Promise<void> => {
  const template = createOrderConfirmedBuyerEmail(emailData);

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
