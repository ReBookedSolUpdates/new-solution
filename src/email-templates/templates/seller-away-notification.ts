import { EMAIL_STYLES, EMAIL_FOOTER, createEmailTemplate } from "@/email-templates/styles";

export interface SellerAwayNotificationData {
  buyerName: string;
  sellerName: string;
  bookTitle: string;
  listingUrl: string;
}

export const createSellerAwayNotificationEmail = (data: SellerAwayNotificationData) => {
  const subject = `Seller is away - we'll notify you when they're back for ${data.bookTitle}`;
  const html = createEmailTemplate(
    {
      title: "Seller is away",
      headerType: "warning",
      headerText: "Seller is Away",
      headerSubtext: "We'll notify you when they return",
    },
    `
    <p>Hello ${data.buyerName},</p>
    
    <p><strong>Good news!</strong> We received your request for <strong>${data.bookTitle}</strong> from <strong>${data.sellerName}</strong>.</p>
    
    <div class="info-box-warning">
      <h3 style="margin-top: 0;">What This Means</h3>
      <p><strong>${data.sellerName}</strong> is currently away and unavailable to confirm or decline this order.</p>
      <p style="margin-bottom: 0;"><strong>Don't worry!</strong> We'll automatically notify you as soon as they return and the listing becomes available again.</p>
    </div>
    
    <h3>What Happens Next?</h3>
    <ul>
      <li>The seller will see your order request when they return</li>
      <li>They'll either confirm or decline within 48 hours of returning</li>
      <li>We'll send you an email with their response</li>
      <li>In the meantime, feel free to explore other listings</li>
    </ul>
    
    <div class="info-box">
      <h3 style="margin-top: 0;">Your Saved Request</h3>
      <p><strong>Item:</strong> ${data.bookTitle}</p>
      <p><strong>Seller:</strong> ${data.sellerName}</p>
      <p><strong>Seller Status:</strong> Currently Away</p>
      <p style="margin-bottom: 0;"><a href="${data.listingUrl}" class="link">View listing</a></p>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="${data.listingUrl}" class="btn">
        View Full Listing
      </a>
    </p>
    
    <p><strong>Questions?</strong> Contact us at <a href="mailto:support@rebookedsolutions.co.za" class="link">support@rebookedsolutions.co.za</a></p>
    
    <p>Thanks for choosing ReBooked Solutions!</p>
    <p>Best regards,<br><strong>The ReBooked Solutions Team</strong></p>
    `
  );

  const text = `Seller is Away

Hello ${data.buyerName},

Good news! We received your request for "${data.bookTitle}" from ${data.sellerName}.

WHAT THIS MEANS:
${data.sellerName} is currently away and unavailable to confirm or decline this order. Don't worry! We'll automatically notify you as soon as they return and the listing becomes available again.

WHAT HAPPENS NEXT?
- The seller will see your order request when they return
- They'll either confirm or decline within 48 hours of returning
- We'll send you an email with their response
- In the meantime, feel free to explore other listings

YOUR SAVED REQUEST:
- Item: ${data.bookTitle}
- Seller: ${data.sellerName}
- Seller Status: Currently Away
- View listing: ${data.listingUrl}

QUESTIONS?
Contact us at support@rebookedsolutions.co.za

Thanks for choosing ReBooked Solutions!

Best regards,
The ReBooked Solutions Team

"Books · Uniforms · Everything In Between"
  `;

  return { subject, html, text };
};

export const sendSellerAwayNotificationEmail = async (
  to: string,
  emailData: SellerAwayNotificationData,
  emailService: any,
): Promise<void> => {
  const template = createSellerAwayNotificationEmail(emailData);

  try {
    await emailService.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    throw error;
  }
};
