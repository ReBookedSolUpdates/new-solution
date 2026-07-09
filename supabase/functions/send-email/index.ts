import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  buildAbandonedCartEmail,
  buildBuyerDeclineEmail,
  buildSellerDeclineEmail,
  buildBuyerDeliveryEmail,
  buildSellerDeliveryEmail,
  buildBuyerPaymentEmail,
  buildSellerPaymentEmail,
  buildBuyerCancelEmail,
  buildSellerCancelEmail,
  buildChatNotificationEmail,
  buildSellerCreditEmail,
  buildExpiredBuyerCancelEmail,
  buildExpiredSellerCancelEmail,
  buildSellerConfirmReminderEmail,
  buildBuyerDeliveryReminderEmail,
  buildMeetupCommitBuyerEmail,
  buildCourierCommitBuyerEmail,
  buildCourierCommitSellerEmail,
  buildPayoutRequestedEmail,
  buildPayoutProcessedEmail,
  buildDisputeOpenedEmail,
  buildDisputeResolvedEmail,
  buildProfileChangedSecurityEmail,
  buildSellerBackWishlistEmail,
  buildDeliveryConfirmedBuyerEmail,
  buildDenialEmail,
  buildPaymentOnTheWayBankTransferEmail,
  buildDeliveryComplaintAcknowledgmentBuyerEmail,
  buildDeliveryComplaintNotificationSellerEmail,
  buildContactAcknowledgmentEmail,
  buildSellerAwayNotificationEmail
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  test?: boolean;
  templateId?: string;
  templateData?: Record<string, any>;
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  maxRequests: 30, // Increased for bulk/cascades
  windowMs: 60 * 1000,
};

function checkRateLimit(clientIP: string, to: string) {
  const key = `${clientIP}-${to}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true };
}

function getTemplateHtml(templateId: string, data: any): string {
  switch (templateId) {
    case "abandoned-cart":
      return buildAbandonedCartEmail(data.userName, data.items, data.totalValue);
    case "buyer-decline":
      return buildBuyerDeclineEmail(data.buyerName, data.orderId, data.amount, data.reason, data.refundSuccess);
    case "seller-decline":
      return buildSellerDeclineEmail(data.sellerName, data.orderId, data.reason);
    case "buyer-delivery":
      return buildBuyerDeliveryEmail(data.recipientName, data.itemTitle, data.orderId, data.supabaseUrl);
    case "seller-delivery":
      return buildSellerDeliveryEmail(data.sellerName, data.itemTitle, data.payout);
    case "buyer-payment":
      return buildBuyerPaymentEmail(
        data.buyerName, data.bookTitle, data.itemImageUrl, data.sellerName, data.orderId, 
        data.paymentReference, data.paidAmount, data.commitDeadlineText,
        data.itemPrice, data.deliveryFee, data.buyerProtectionFee, data.walletDeduction, data.cardPaymentAmount
      );
    case "seller-payment":
      return buildSellerPaymentEmail(data.sellerName, data.bookTitle, data.itemImageUrl, data.buyerName, data.orderId);
    case "buyer-cancel":
      return buildBuyerCancelEmail(data.buyerName, data.actorText, data.cancelReason, data.refundAmount);
    case "seller-cancel":
      return buildSellerCancelEmail(data.sellerName, data.actorText, data.cancelReason);
    case "chat-notification":
      return buildChatNotificationEmail(data.senderName, data.listingTitle, data.listingPrice, data.content);
    case "seller-credit":
      return buildSellerCreditEmail(data.sellerName, data.bookTitle, data.bookPrice, data.creditAmount, data.orderId, data.newBalance);
    case "expired-buyer-cancel":
      return buildExpiredBuyerCancelEmail(data.buyerName, data.itemTitle, data.totalRefunded);
    case "expired-seller-cancel":
      return buildExpiredSellerCancelEmail(data.sellerName, data.itemTitle, data.lostEarnings);
    case "seller-confirm-reminder":
      return buildSellerConfirmReminderEmail(data.sellerName, data.itemTitle, data.lostEarnings, data.hoursLeft);
    case "buyer-delivery-reminder":
      return buildBuyerDeliveryReminderEmail(data.buyerName, data.itemTitle, data.hoursLeft);
    case "meetup-commit-buyer":
      return buildMeetupCommitBuyerEmail(data.itemTitle, data.commitDeadlineText);
    case "courier-commit-buyer":
      return buildCourierCommitBuyerEmail(data.buyerName, data.sellerName, data.orderId, data.itemTitles, data.deliveryType, data.deliveryMethodText, data.trackingNumber);
    case "courier-commit-seller":
      return buildCourierCommitSellerEmail(data.sellerName, data.buyerName, data.orderId, data.itemTitles, data.pickupType, data.pickupMethodText, data.trackingNumber);
    case "payout-requested":
      return buildPayoutRequestedEmail(data.sellerName || data.userName, data.amount, data.bankDetails || "");
    case "payout-processed":
      return buildPayoutProcessedEmail(data.sellerName || data.userName, data.amount, data.reference);
    case "dispute-opened":
      return buildDisputeOpenedEmail(data.buyerName, data.sellerName, data.orderId, data.reason);
    case "dispute-resolved":
      return buildDisputeResolvedEmail(data.userName, data.orderId, data.resolution);
    case "profile-changed":
      return buildProfileChangedSecurityEmail(data.userName, data.changes);
    case "seller-back":
      return buildSellerBackWishlistEmail(data.buyerName, data.sellerName, data.bookTitle, data.listingUrl);
    case "delivery-confirmed-buyer":
      return buildDeliveryConfirmedBuyerEmail(data.buyerName, data.bookTitle, data.orderId);
    case "denial":
      return buildDenialEmail(data.sellerName, data.bookTitle, data.orderId, data.denialReason, data.sellerEarnings, data.orderDate, data.deliveryDate);
    case "payment-on-the-way-bank-transfer":
      return buildPaymentOnTheWayBankTransferEmail(data.sellerName, data.bookTitle, data.orderId);
    case "delivery-complaint-acknowledgment-buyer":
      return buildDeliveryComplaintAcknowledgmentBuyerEmail(data.buyerName, data.orderId, data.feedback);
    case "delivery-complaint-notification-seller":
      return buildDeliveryComplaintNotificationSellerEmail(data.sellerName, data.orderId, data.bookTitle, data.feedback);
    case "contact-acknowledgment":
      return buildContactAcknowledgmentEmail(data.buyerName, data.subject, data.message);
    case "seller-away-notification":
      return buildSellerAwayNotificationEmail(data.buyerName, data.sellerName, data.bookTitle);
    default:
      throw new Error(`Template not found: ${templateId}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "METHOD_NOT_ALLOWED",
        message: "Only POST requests are allowed",
      }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "INVALID_CONTENT_TYPE",
        message: "Content-Type must be application/json",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let emailRequest: EmailRequest;

  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim() === "") {
      throw new Error("Empty request body");
    }
    emailRequest = JSON.parse(rawBody);
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "INVALID_JSON",
        message: "Request body must be valid JSON",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // If a templateId is provided, resolve the html
  if (emailRequest.templateId) {
    try {
      emailRequest.html = getTemplateHtml(emailRequest.templateId, emailRequest.templateData || {});
    } catch (templateError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "TEMPLATE_ERROR",
          message: templateError.message,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  if (!emailRequest.to || !emailRequest.subject || (!emailRequest.html && !emailRequest.text)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "INVALID_PAYLOAD",
        message: "Missing required email details or html template rendering failed",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (emailRequest.test === true) {
    return new Response(
      JSON.stringify({
        success: true,
        message: "Email service reachable and template rendered successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const clientIP = req.headers.get("x-forwarded-for") || "unknown";
  const toEmail = Array.isArray(emailRequest.to) ? emailRequest.to[0] : emailRequest.to;

  const rateCheck = checkRateLimit(clientIP, toEmail);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests",
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rateCheck.resetTime! - Date.now()) / 1000)),
        },
      },
    );
  }

  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const defaultFrom = Deno.env.get("DEFAULT_FROM_EMAIL") || "info@rebookedsolutions.co.za";

  if (!brevoApiKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "EMAIL_NOT_CONFIGURED",
        message: "BREVO_API_KEY is not set",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const toArray = Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to];
  const recipients = toArray.map((email) => ({ email }));

  const brevoPayload: Record<string, unknown> = {
    sender: { email: emailRequest.from || defaultFrom },
    to: recipients,
    subject: emailRequest.subject,
  };

  if (emailRequest.html) {
    brevoPayload.htmlContent = emailRequest.html;
  }
  if (emailRequest.text) {
    brevoPayload.textContent = emailRequest.text;
  }
  if (emailRequest.replyTo) {
    brevoPayload.replyTo = { email: emailRequest.replyTo };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "EMAIL_SEND_FAILED",
          message: responseData.message || "Failed to send email via Brevo",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: responseData.messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "EMAIL_SEND_FAILED",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
