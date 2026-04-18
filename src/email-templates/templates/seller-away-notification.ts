import { EMAIL_STYLES, EMAIL_FOOTER, createEmailTemplate } from "@/email-templates/styles";

export interface SellerAwayNotificationData {
  buyerName: string;
  sellerName: string;
  bookTitle: string;
  listingUrl: string;
}

export const createSellerAwayNotificationEmail = (data: SellerAwayNotificationData) => {
  const subject = `Seller is away — we'll notify you when they're back for ${data.bookTitle}`;
  const html = createEmailTemplate(
    {
      title: "Seller is away",
      headerType: "warning",
      headerText: "Seller is away",
      headerSubtext: "We’ll notify you when the seller returns",
    },
    `
    <div class="info-box">
      <p>Hi ${data.buyerName},</p>
      <p>
        Good news — we received your request for <strong>${data.bookTitle}</strong> from ${data.sellerName}.
      </p>
      <p>
        That seller is currently away, so we’ll let you know as soon as they return and the listing is available again.
      </p>
    </div>
    <div>
      <p>
        In the meantime, you can review the listing here:
      </p>
      <a class="link" href="${data.listingUrl}">${data.listingUrl}</a>
    </div>
    <div class="footer-text">
      <p>Thanks for choosing ReBooked Solutions.</p>
    </div>
    `
  );

  const text = `Hi ${data.buyerName},\n\nGood news — we received your request for ${data.bookTitle} from ${data.sellerName}. That seller is currently away, so we’ll let you know as soon as they return and the listing is available again.\n\nReview the listing: ${data.listingUrl}\n\nThanks for choosing ReBooked Solutions.`;

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
