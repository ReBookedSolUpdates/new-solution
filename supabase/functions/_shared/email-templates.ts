import { EMAIL_FOOTER } from "../../../shared/email-footer.ts";
// ============================================================
// MASTER EMAIL TEMPLATES — ReBooked Solutions
// All emails use consistent shared templates for styling.
// ============================================================

export const EMAIL_STYLES = `
<style>
  body { font-family: Arial, sans-serif; background: #f3fef7; padding: 20px; color: #1f4e3d; margin: 0; }
  .container { max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .btn { display: inline-block; padding: 12px 20px; background: #3ab26f; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
  .btn-danger { display: inline-block; padding: 12px 20px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
  .link { color: #3ab26f; word-break: break-all; }
  .header { background: linear-gradient(135deg, #3ab26f 0%, #2d8f58 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 25px -30px; }
  .header-error { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 25px -30px; }
  .header-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 25px -30px; }
  .info-box { background: #f3fef7; border: 1px solid #3ab26f; padding: 15px; border-radius: 8px; margin: 15px 0; }
  .info-box-error { background: #fef2f2; border: 1px solid #dc2626; padding: 15px; border-radius: 8px; margin: 15px 0; }
  .info-box-success { background: #f0fdf4; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin: 15px 0; }
  .info-box-warning { background: #fffbeb; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; }
  .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  .detail-row:last-child { border-bottom: none; }
  .detail-label { color: #6b7280; font-weight: 600; }
  .detail-value { color: #1f4e3d; font-weight: 500; text-align: right; }
  .divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
  .total-row { font-size: 18px; font-weight: bold; color: #3ab26f; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 5px; font-size: 14px; }
</style>
`;

interface EmailTemplateData {
  title: string;
  headerType?: 'default' | 'error' | 'warning';
  headerText: string;
  headerSubtext?: string;
  headerEmoji?: string;
}

export function createEmailTemplate(
  data: EmailTemplateData,
  bodyContent: string,
  includeFooter: boolean = true
): string {
  const headerClass = data.headerType === 'error' ? 'header-error' :
    data.headerType === 'warning' ? 'header-warning' : 'header';
  const emoji = data.headerEmoji ? `${data.headerEmoji} ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  ${EMAIL_STYLES}
</head>
<body>
  <div class="container">
     <div class="${headerClass}">
       <h1 style="margin:0;font-size:22px;font-weight:bold;">${emoji}${data.headerText}</h1>
       ${data.headerSubtext ? `<p style="margin:8px 0 0;font-size:14px;opacity:0.9;">${data.headerSubtext}</p>` : ''}
     </div>
     
     ${bodyContent}
     
     ${includeFooter ? EMAIL_FOOTER : ''}
  </div>
</body>
</html>`;
}

export function detailRow(label: string, value: string | number): string {
  return `
  <tr>
    <td style="color:#6b7280;font-weight:600;padding:7px 5px;border-bottom:1px solid #e5e7eb;font-size:13px;">${label}</td>
    <td style="color:#1f4e3d;font-weight:500;text-align:right;padding:7px 5px;border-bottom:1px solid #e5e7eb;font-size:13px;">${value}</td>
  </tr>`;
}

export function infoSection(title: string, rows: string, type: 'default' | 'success' | 'warning' | 'error' = 'default'): string {
  const bgColor = type === 'success' ? '#f0fdf4' : type === 'warning' ? '#fffbeb' : type === 'error' ? '#fef2f2' : '#f3fef7';
  const borderColor = type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : type === 'error' ? '#dc2626' : '#3ab26f';
  return `
  <div style="background:${bgColor};border:1px solid ${borderColor};padding:15px;border-radius:8px;margin:15px 0;">
    <h3 style="margin:0 0 12px 0;color:#1f4e3d;font-size:15px;font-weight:bold;">${title}</h3>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>`;
}

// ── 1. Abandoned Cart Email ──────────────────────────────────
export function buildAbandonedCartEmail(userName: string, items: { title: string; price: number }[], totalValue: number): string {
  const itemRows = items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">${i.title}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#1f4e3d;font-weight:700;font-size:14px;text-align:right;">R${i.price.toFixed(2)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>You left something behind!</title></head>
<body style="font-family:Arial,sans-serif;background:#f3fef7;margin:0;padding:20px;">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#3ab26f,#1f4e3d);padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;">✨ Don't let it slip away!</h1>
      <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">You left items in your cart</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hey ${userName},</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px;line-height:1.6;">
        You left some items in your cart on ReBooked Solutions. Good news — they are still available, but don't wait too long! Pre-loved items go fast 🏃‍♂️
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 0;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Item</th>
            <th style="text-align:right;padding:8px 0;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td style="padding:12px 0 0;font-weight:700;color:#1f4e3d;font-size:15px;">Total</td>
            <td style="padding:12px 0 0;font-weight:700;color:#1f4e3d;font-size:15px;text-align:right;">R${totalValue.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://rebookedsolutions.co.za/cart" style="display:inline-block;background:#3ab26f;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Complete My Purchase →</a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;line-height:1.5;">
        This reminder was sent because you had items in your cart.<br>If you've already completed your purchase, please ignore this email.
      </p>
    </div>
    ${EMAIL_FOOTER}
  </div>
</body>
</html>`;
}

// ── 2. Decline Commit Emails ──────────────────────────────────
export function buildBuyerDeclineEmail(buyerName: string, orderId: string, amount: number, reason: string, refundSuccess: boolean): string {
  return createEmailTemplate(
    {
      title: "Order Declined",
      headerText: "Order Declined",
      headerType: "error",
      headerSubtext: "Your order has been declined by the seller."
    },
    `
    <h2 style="color: #dc2626; margin-top: 0;">Hello ${buyerName},</h2>
    <p>We're sorry to inform you that your order has been declined by the seller.</p>
    <div class="info-box-error">
      <h3 style="margin-top: 0;">Order Details</h3>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Amount:</strong> R${amount.toFixed(2)}</p>
      <p><strong>Reason:</strong> ${reason}</p>
    </div>
    ${refundSuccess ? `
    <div class="info-box-success">
      <h3 style="margin-top: 0;">Refund Information</h3>
      <p><strong>Processing Time:</strong> 3-5 business days</p>
      <p>✅ Your refund has been successfully processed.</p>
    </div>
    ` : `
    <div class="info-box-warning">
      <h3 style="margin-top: 0;">Refund Processing</h3>
      <p>Your refund is being processed and will appear in your account within 3-5 business days.</p>
    </div>
    `}
    <p>We apologize for any inconvenience. Please feel free to browse our marketplace for similar books from other sellers.</p>
    <div style="text-align: center;">
      <a href="https://rebookedsolutions.co.za/listings" class="btn">Browse Listings</a>
    </div>
    `
  );
}

export function buildSellerDeclineEmail(sellerName: string, orderId: string, reason: string): string {
  return createEmailTemplate(
    {
      title: "Order Decline Confirmed",
      headerText: "Order Decline Confirmed",
      headerType: "default",
      headerSubtext: "You have successfully declined the order commitment."
    },
    `
    <h2 style="color: #16a34a; margin-top: 0;">Hello ${sellerName},</h2>
    <p>You have successfully declined the order commitment.</p>
    <div class="info-box-success">
      <h3 style="margin-top: 0;">Order Details</h3>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Reason:</strong> ${reason}</p>
    </div>
    <p>The buyer has been notified and their payment has been refunded. Your item stock has been automatically restored.</p>
    `
  );
}

// ── 3. Order Status Delivery Emails ──────────────────────────
export function buildBuyerDeliveryEmail(recipientName: string, itemTitle: string, orderId: string, supabaseUrl: string): string {
  return createEmailTemplate(
    {
      title: "Item Delivered - Confirm Receipt",
      headerText: "Item Delivered!",
      headerType: "default",
      headerSubtext: `Hello ${recipientName}!`
    },
    `
    <p>Our records show that your order containing <strong>${itemTitle}</strong> has been delivered.</p>
    
    <div class="info-box-warning" style="text-align: center; border-color: #0ea5e9; background-color: #f0f9ff;">
      <h3 style="margin: 0 0 12px 0; color: #0369a1; font-size: 18px;">Final Step: Confirm Receipt</h3>
      <p style="margin: 0 0 20px 0; color: #0369a1; font-size: 14px;">Please verify that you have received the item(s) so we can release the payment to the seller.</p>
      <a href="${supabaseUrl.replace('.supabase.co', '')}.rebookedsolutions.co.za/orders/${orderId}" 
         style="background-color: #0ea5e9; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Confirm Receipt
      </a>
    </div>
    `
  );
}

export function buildSellerDeliveryEmail(sellerName: string, itemTitle: string, payout: string): string {
  return createEmailTemplate(
    {
      title: "Item Delivered - Payout Pending Confirmation",
      headerText: "Item Delivered!",
      headerType: "default",
      headerSubtext: `Hello ${sellerName}!`
    },
    `
    <p>Good news! Your item <strong>${itemTitle}</strong> has been successfully delivered to the buyer.</p>
    <div class="info-box" style="text-align: center; border-color: #3ab26f; background-color: #f3fef7; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px 0; color: #1f4e3d; font-size: 16px;">What happens next?</h3>
      <p style="margin: 0 0 10px 0; color: #1f4e3d; font-size: 14px;">The buyer has 48 hours to confirm receipt of the item. Once confirmed (or after 48 hours of automatic confirmation), your payout of <strong>R${payout}</strong> (90% of listing price) will be released to your wallet.</p>
    </div>
    `
  );
}

// ── 4. BobPay Webhook Payment Confirmed Emails ──────────────
export function buildBuyerPaymentEmail(
  buyerName: string,
  bookTitle: string,
  itemImageUrl: string,
  sellerName: string,
  orderId: string,
  paymentReference: string,
  paidAmount: number,
  commitDeadlineText: string,
  itemPrice: number = 0,
  deliveryFee: number = 0,
  buyerProtectionFee: number = 0,
  walletDeduction: number = 0,
  cardPaymentAmount: number = 0
): string {
  const displayItemPrice = itemPrice > 0 ? itemPrice : paidAmount;

  return `
    <div style="font-family:Arial,sans-serif;background:#f3fef7;padding:20px;color:#1f4e3d;">
      <div style="max-width:500px;margin:auto;background:#ffffff;padding:30px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(135deg,#3ab26f,#2d8f58);padding:24px;border-radius:8px 8px 0 0;text-align:center;color:white;margin:-30px -30px 24px;">
          <h1 style="margin:0;font-size:22px;">Payment Confirmed!</h1>
          <p style="margin:6px 0 0;opacity:0.9;">Your order is on its way</p>
        </div>
        <p>Hello <strong>${buyerName}</strong>,</p>
        <p>Your payment has been processed successfully. The seller has been notified and has 48 hours to confirm your order.</p>
        <div style="background:#f3fef7;border:1px solid #3ab26f;border-radius:8px;padding:16px;margin:20px 0;">
          <h3 style="margin:0 0 12px;color:#1f4e3d;font-size:14px;">🧾 Receipt</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;width:40%;">Item</td><td style="padding:4px 0;">${bookTitle}</td></tr>
            ${itemImageUrl ? `<tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Photo</td><td style="padding:4px 0;"><img src="${itemImageUrl}" alt="${bookTitle}" style="width: 80px; height: auto; border-radius: 4px;" /></td></tr>` : ''}
            <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Seller</td><td style="padding:4px 0;">${sellerName}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Order ID</td><td style="padding:4px 0;font-family:monospace;font-size:11px;">${orderId}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Payment Reference</td><td style="padding:4px 0;font-family:monospace;font-size:11px;">${paymentReference}</td></tr>
            
            <!-- Pricing breakdown -->
            <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Item Price</td><td style="padding:4px 0;">R${displayItemPrice.toFixed(2)}</td></tr>
            ${deliveryFee > 0 ? `<tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Delivery Fee</td><td style="padding:4px 0;">R${deliveryFee.toFixed(2)}</td></tr>` : ''}
            ${buyerProtectionFee > 0 ? `<tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Buyer's Protection Fee</td><td style="padding:4px 0;">R${buyerProtectionFee.toFixed(2)}</td></tr>` : ''}
            ${walletDeduction > 0 ? `<tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Wallet Deduction</td><td style="padding:4px 0;color:#dc2626;">-R${walletDeduction.toFixed(2)}</td></tr>` : ''}
            
            <tr style="border-top: 1px solid #3ab26f;"><td style="padding:6px 0;color:#6b7280;font-weight:bold;">Total Paid</td><td style="padding:6px 0;font-weight:bold;color:#3ab26f;">R${paidAmount.toFixed(2)}</td></tr>
            ${cardPaymentAmount > 0 ? `<tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Paid via Card</td><td style="padding:4px 0;">R${cardPaymentAmount.toFixed(2)}</td></tr>` : ''}
            
            <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Seller Commit Deadline</td><td style="padding:4px 0;">${commitDeadlineText}</td></tr>
          </table>
        </div>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:16px 0;">
          <p style="margin:0;font-size:13px;color:#1e40af;"><strong>⏳ What happens next?</strong><br/>
            Once the seller confirms, your item will be prepared for shipment. You'll receive tracking info via email. If the seller doesn't respond within 48 hours, you'll get a full automatic refund.
          </p>
        </div>
        <a href="https://rebookedsolutions.co.za/profile?tab=activity" style="display:inline-block;padding:12px 20px;background:#3ab26f;color:#ffffff;text-decoration:none;border-radius:5px;margin-top:16px;font-weight:bold;">View Your Orders</a>
        ${EMAIL_FOOTER}
      </div>
    </div>`;
}

export function buildSellerPaymentEmail(sellerName: string, bookTitle: string, itemImageUrl: string, buyerName: string, orderId: string): string {
  return `
    <div style="font-family:Arial,sans-serif;background:#f3fef7;padding:20px;color:#1f4e3d;">
      <div style="max-width:500px;margin:auto;background:#ffffff;padding:30px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(135deg,#e17055,#c0392b);padding:24px;border-radius:8px 8px 0 0;text-align:center;color:white;margin:-30px -30px 24px;">
          <h1 style="margin:0;font-size:22px;">New Sale – Action Required!</h1>
          <p style="margin:6px 0 0;opacity:0.9;">Confirm within 48 hours</p>
        </div>
        <p>Hello <strong>${sellerName}</strong>,</p>
        <p>Great news! Someone just purchased your item and is waiting for your confirmation.</p>
        <div style="background:#fff3cd;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin:16px 0;text-align:center;">
          <p style="margin:0;font-weight:bold;color:#b45309;font-size:14px;">You must confirm within 48 hours or the order will be automatically cancelled.</p>
        </div>
        <div style="background:#f3fef7;border:1px solid #3ab26f;border-radius:8px;padding:16px;margin:20px 0;">
          <h3 style="margin:0 0 12px;color:#1f4e3d;font-size:14px;">📋 Sale Details</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;width:40%;">Item</td><td style="padding:4px 0;">${bookTitle}</td></tr>
            ${itemImageUrl ? `<tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Photo</td><td style="padding:4px 0;"><img src="${itemImageUrl}" alt="${bookTitle}" style="width: 80px; height: auto; border-radius: 4px;" /></td></tr>` : ''}
            <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Buyer</td><td style="padding:4px 0;">${buyerName}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;font-weight:600;">Order ID</td><td style="padding:4px 0;font-family:monospace;font-size:11px;">${orderId}</td></tr>
          </table>
        </div>
        <p style="font-size:13px;"><strong>Steps to confirm:</strong><br/>
          1. Log in to your ReBooked Solutions account<br/>
          2. Go to Profile → Activity → Commits<br/>
          3. Click "Commit Sale" for this item<br/>
          4. We'll arrange courier pickup from your location
        </p>
        <a href="https://rebookedsolutions.co.za/profile?tab=activity" style="display:inline-block;padding:12px 20px;background:#3ab26f;color:#ffffff;text-decoration:none;border-radius:5px;margin-top:16px;font-weight:bold;">View & Confirm Sale →</a>
        ${EMAIL_FOOTER}
      </div>
    </div>`;
}

// ── 5. Cancel Order with Refund Emails ────────────────────────
export function buildBuyerCancelEmail(buyerName: string, actorText: string, cancelReason: string, refundAmount: string | number): string {
  return createEmailTemplate(
    {
      title: "Order Cancelled and Refunded",
      headerText: "Order Cancelled",
      headerType: "warning",
      headerSubtext: `Hello ${buyerName},`,
    },
    `
    <p>Your order has been cancelled by the <strong>${actorText}</strong>.</p>
    <p><strong>Reason:</strong> ${cancelReason}</p>
    <div class="info-box-success">
      <p style="margin: 0;"><strong>Refund confirmed:</strong> ${refundAmount ? `R${Number(refundAmount).toFixed(2)}` : "Your full payment"} has been refunded.</p>
    </div>
    `
  );
}

export function buildSellerCancelEmail(sellerName: string, actorText: string, cancelReason: string): string {
  return createEmailTemplate(
    {
      title: "Order Cancelled",
      headerText: "Order Cancelled",
      headerType: "warning",
      headerSubtext: `Hello ${sellerName},`,
    },
    `
    <p>This order has been cancelled by the <strong>${actorText}</strong>.</p>
    <p><strong>Reason:</strong> ${cancelReason}</p>
    <p>The buyer refund has been processed.</p>
    `
  );
}

// ── 6. Chat Notification Email ──────────────────────────────
export function buildChatNotificationEmail(senderName: string, listingTitle: string, listingPrice: string | number | null, content: string): string {
  return createEmailTemplate(
    {
      title: "New Message - ReBooked Marketplace",
      headerText: "New Message Received",
      headerType: "default",
      headerEmoji: "💬",
      headerSubtext: `You have a new message from ${senderName}`
    },
    `
    <div class="info-box-success">
      <p style="margin: 0; font-size: 12px; color: #166534; text-transform: uppercase;">Regarding Listing</p>
      <p style="margin: 4px 0 0 0; font-size: 16px; color: #064e3b; font-weight: 600;">${listingTitle}</p>
      ${listingPrice ? `<p style="margin: 2px 0 0 0; font-size: 14px; color: #059669; font-weight: bold;">R${listingPrice}</p>` : ""}
    </div>
    
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border-left: 4px solid #10b981; margin-bottom: 24px;">
      <p style="margin: 0; font-style: italic; color: #334155; font-size: 15px;">"${content || "(Media attachment)"}"</p>
    </div>
    
    <div style="text-align: center;">
      <a href="https://rebookedsolutions.co.za/chats" class="btn">Reply Now</a>
    </div>
    `
  );
}

// ── 7. Seller Credit Payout Email ────────────────────────────
export function buildSellerCreditEmail(sellerName: string, bookTitle: string, bookPrice: number, creditAmount: number, orderId: string, newBalance: number, commissionRate: number = 10): string {
  const keepRate = (100 - commissionRate).toFixed(1).replace(/\.0$/, '');
  const commissionLabel = `${commissionRate}% (You keep ${keepRate}%)`;
  return createEmailTemplate(
    {
      title: "Payment Received - Credit Added to Your Account",
      headerText: "Payment Received!",
      headerType: "default",
      headerSubtext: "Your item has been delivered and credit has been added"
    },
    `
    <p>Hello ${sellerName},</p>
    <p><strong>Great news!</strong> Your item <strong>"${bookTitle}"</strong> has been successfully delivered and received by the buyer. Your payment is now available in your wallet!</p>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color: #10b981;">✅ Payment Confirmed</h3>
      <p style="margin: 0;"><strong>Credit has been added to your account!</strong></p>
    </div>
    
    <div class="info-box">
      <h3 style="margin-top: 0;">📋 Transaction Details</h3>
      <p><strong>Item Title:</strong> ${bookTitle}</p>
      <p><strong>Item Price:</strong> R${bookPrice.toFixed(2)}</p>
      <p><strong>Commission Rate:</strong> ${commissionLabel}</p>
      <p style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;"><strong>Credit Added:</strong> <span style="font-size: 1.2em; color: #10b981;">R${creditAmount.toFixed(2)}</span></p>
      <p><strong>Order ID:</strong> ${orderId}</p>
    </div>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color: #10b981;">💳 Your New Wallet Balance</h3>
      <p style="margin: 0; font-size: 1.1em; color: #10b981;"><strong>R${newBalance.toFixed(2)}</strong></p>
    </div>
    
    <h3>💡 What You Can Do Next:</h3>
    <ul>
      <li><strong>List More Items:</strong> Add more items to your inventory and earn from sales</li>
      <li><strong>Request Payout:</strong> Once you have accumulated funds, you can request a withdrawal to your bank account</li>
      <li><strong>View Transactions:</strong> Check your wallet history anytime in your profile</li>
      <li><strong>Track Orders:</strong> Monitor all your sales and deliveries</li>
    </ul>
    
    <h3>📊 How Payouts Work:</h3>
    <p>All earnings are credited to your virtual wallet. You can choose to:</p>
    <ol>
      <li><strong>Use Wallet Balance:</strong> Apply your wallet funds to purchase other items on ReBooked Solutions</li>
      <li><strong>Request Payout:</strong> Withdraw your available balance directly to your bank account at any time from your profile tab</li>
    </ol>
    `
  );
}

// ── 8. Expired Orders Auto-Cancelled Emails ──────────────────
export function buildExpiredBuyerCancelEmail(buyerName: string, itemTitle: string, totalRefunded: string | number): string {
  return `
<!doctype html><html><body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(34,197,94,0.12)">
    <div style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:28px 32px;color:#fff;">
      <h1 style="margin:0;font-size:22px;font-weight:800;">Order Cancelled — Refund On The Way</h1>
      <p style="margin:6px 0 0;opacity:.92;font-size:14px;">Hello ${buyerName},</p>
    </div>
    <div style="padding:28px 32px;color:#1f2937;font-size:15px;line-height:1.6;">
      <p>Unfortunately the seller did not commit to your order for <strong>${itemTitle}</strong> within the 48-hour window.</p>
      <p>We've cancelled the order on your behalf and your full refund of <strong>R${Number(totalRefunded).toFixed(2)}</strong> is being processed and should reflect in your account within 3–5 business days.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:18px 0;color:#166534;font-weight:600;text-align:center;">
        ✓ Refund of R${Number(totalRefunded).toFixed(2)} confirmed
      </div>
      <p style="font-size:13px;color:#6b7280;">We're sorry for the inconvenience. You can browse other listings on ReBooked Solutions any time.</p>
    </div>
    <div style="text-align:center;padding:18px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
      <strong style="color:#16a34a;">ReBooked Solutions</strong><br/>support@rebookedsolutions.co.za
    </div>
  </div>
 </body></html>`;
}

export function buildExpiredSellerCancelEmail(sellerName: string, itemTitle: string, lostEarnings: string | number): string {
  return `
<!doctype html><html><body style="margin:0;padding:0;background:#fff7ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(245,158,11,0.18)">
    <div style="background:linear-gradient(135deg,#dc2626,#f97316);padding:28px 32px;color:#fff;">
      <h1 style="margin:0;font-size:22px;font-weight:800;">Missed Commitment Window</h1>
      <p style="margin:6px 0 0;opacity:.92;font-size:14px;">Hello ${sellerName},</p>
    </div>
    <div style="padding:28px 32px;color:#1f2937;font-size:15px;line-height:1.6;">
      <p>You did not commit to the sale of <strong>${itemTitle}</strong> within the 48-hour window. The order has been auto-cancelled and the buyer has been refunded.</p>
      
      <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:18px;margin:18px 0;text-align:center;">
        <p style="margin:0;font-size:13px;color:#991b1b;text-transform:uppercase;letter-spacing:.5px;font-weight:700;">Earnings you missed out on</p>
        <p style="margin:0;font-size:32px;font-weight:900;color:#dc2626;">R${Number(lostEarnings).toFixed(2)}</p>
        <p style="margin:6px 0 0;font-size:12px;color:#7f1d1d;">(90% of the item price — your seller payout after platform fee)</p>
      </div>
      
      <p>Your listing has been re-activated automatically so it can sell again.</p>
      <p style="font-size:14px;color:#6b7280;background:#f9fafb;border-left:4px solid #f97316;padding:12px 14px;border-radius:6px;">
        <strong>Tip:</strong> Repeated missed commits may affect your seller standing. Commit to orders within 48 hours to keep earning.
      </p>
    </div>
    <div style="text-align:center;padding:18px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
      <strong style="color:#16a34a;">ReBooked Solutions</strong><br/>support@rebookedsolutions.co.za
    </div>
  </div>
</body></html>`;
}

// ── 9. Commitment Reminders ──────────────────────────────────
export function buildSellerConfirmReminderEmail(sellerName: string, itemTitle: string, lostEarnings: string | number, hoursLeft: number): string {
  return `
<!doctype html><html><body style="margin:0;padding:0;background:#f3fef7;font-family:Arial,sans-serif;color:#1f4e3d;">
  <div style="max-width:500px;margin:20px auto;background:#ffffff;padding:30px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#e17055,#c0392b);padding:24px;border-radius:8px 8px 0 0;text-align:center;color:white;margin:-30px -30px 24px;">
      <h1 style="margin:0;font-size:22px;">Reminder: Confirm Your Sale</h1>
      <p style="margin:6px 0 0;opacity:0.9;">Time is running out!</p>
    </div>
    <p>Hello <strong>${sellerName}</strong>,</p>
    <p>This is a reminder that you have an active order for <strong>${itemTitle}</strong> awaiting your confirmation.</p>
    <div style="background:#fff3cd;border:1px solid #fbbf24;border-radius:8px;padding:14px;margin:16px 0;text-align:center;">
      <p style="margin:0;font-weight:bold;color:#b45309;font-size:15px;">⏳ You have approximately ${hoursLeft} hour(s) left to confirm this order!</p>
      <p style="margin:4px 0 0;font-size:13px;color:#7f1d1d;">If you do not confirm, the order will be cancelled automatically, the buyer refunded, and you will lose <strong>R${Number(lostEarnings).toFixed(2)}</strong> in potential payout.</p>
    </div>
    <a href="https://rebookedsolutions.co.za/profile?tab=activity" style="display:inline-block;padding:12px 20px;background:#3ab26f;color:#ffffff;text-decoration:none;border-radius:5px;margin-top:16px;font-weight:bold;text-align:center;width:calc(100% - 40px);">View & Confirm Sale →</a>
    ${EMAIL_FOOTER}
  </div>
</body></html>`;
}

export function buildBuyerDeliveryReminderEmail(buyerName: string, itemTitle: string, hoursLeft: number): string {
  return `
<!doctype html><html><body style="margin:0;padding:0;background:#f3fef7;font-family:Arial,sans-serif;color:#1f4e3d;">
  <div style="max-width:500px;margin:20px auto;background:#ffffff;padding:30px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#3ab26f,#2d8f58);padding:24px;border-radius:8px 8px 0 0;text-align:center;color:white;margin:-30px -30px 24px;">
      <h1 style="margin:0;font-size:22px;">Have you received your order?</h1>
      <p style="margin:6px 0 0;opacity:0.9;">Please confirm receipt</p>
    </div>
    <p>Hello <strong>${buyerName}</strong>,</p>
    <p>Our records show your order for <strong>${itemTitle}</strong> has been marked as delivered.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:16px 0;">
      <p style="margin:0;font-weight:bold;color:#1e40af;font-size:15px;">⏳ Action required within ${hoursLeft} hour(s)!</p>
      <p style="margin:4px 0 0;font-size:13px;color:#1e3a8a;">Please click below to confirm whether you have received the order. If we do not receive feedback within ${hoursLeft} hour(s), the order will be automatically marked as completed and the seller paid.</p>
    </div>
    <a href="https://rebookedsolutions.co.za/profile?tab=activity" style="display:inline-block;padding:12px 20px;background:#3ab26f;color:#ffffff;text-decoration:none;border-radius:5px;margin-top:16px;font-weight:bold;text-align:center;width:calc(100% - 40px);">Confirm Order Receipt →</a>
    ${EMAIL_FOOTER}
  </div>
</body></html>`;
}

// ── 10. Meetup & Courier Commitment Confirmed Emails ─────────
export function buildMeetupCommitBuyerEmail(itemTitle: string, commitDeadlineText: string): string {
  return `
    <div style="font-family:Arial,sans-serif;background:#f3fef7;padding:20px;color:#1f4e3d;">
      <div style="max-width:500px;margin:auto;background:#ffffff;padding:30px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(135deg,#3ab26f,#2d8f58);padding:24px;border-radius:8px 8px 0 0;text-align:center;color:white;margin:-30px -30px 24px;">
          <h1 style="margin:0;font-size:22px;">Seller Committed!</h1>
          <p style="margin:6px 0 0;opacity:0.9;">Coordinate your meetup</p>
        </div>
        <p>Hello,</p>
        <p>The seller has committed to your pickup order for <strong>${itemTitle}</strong>.</p>
        <p><strong>Meetup Window:</strong> You have 7 days (until ${commitDeadlineText}) to meet up with the seller and complete the handoff. The R20 service fee is now non-refundable.</p>
        <p>Please open the chat to coordinate the time and location.</p>
      </div>
    </div>`;
}

export function buildCourierCommitBuyerEmail(buyerName: string, sellerName: string, orderId: string, itemTitles: string, deliveryType: string, deliveryMethodText: string, trackingNumber?: string): string {
  return createEmailTemplate(
    {
      title: "Order Confirmed - Pickup Scheduled",
      headerText: "Order Confirmed!",
      headerType: "default",
      headerSubtext: `Great news, ${buyerName}!`
    },
    `
    <p><strong>${sellerName}</strong> has confirmed your order and is preparing your item(s) for delivery ${deliveryMethodText}.</p>
    
    <div class='info-box-success'>
      <h3 style='margin-top: 0;'>Order Summary</h3>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Item(s):</strong> ${itemTitles}</p>
      <p><strong>Delivery:</strong> ${deliveryType === 'locker' ? 'Locker Delivery' : 'Door-to-Door'}</p>
      ${trackingNumber ? `<p><strong>Tracking:</strong> <span style='color: #4f46e5; font-weight: bold;'>${trackingNumber}</span></p>` : ''}
    </div>
    
    <div class='info-box'>
      <p style='margin: 0; font-size: 14px;'><strong>Estimated delivery: 2-3 business days.</strong><br>We'll notify you when it's out for delivery.</p>
    </div>
    
    <div style='text-align: center;'>
      <a href='https://rebookedsolutions.co.za/orders/${orderId}' class='btn'>View Order Details</a>
    </div>
    `
  );
}

export function buildCourierCommitSellerEmail(sellerName: string, buyerName: string, orderId: string, itemTitles: string, pickupType: string, pickupMethodText: string, trackingNumber?: string): string {
  return createEmailTemplate(
    {
      title: "Commitment Confirmed",
      headerText: "Commitment Confirmed!",
      headerType: "default",
      headerSubtext: `Thank you, ${sellerName}!`
    },
    `
    <p>You've successfully committed to sell your item(s). The buyer has been notified and pickup has been scheduled ${pickupMethodText}.</p>
    
    <div class='info-box-success'>
      <h3 style='margin-top: 0;'>Order Details</h3>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Item(s):</strong> ${itemTitles}</p>
      <p><strong>Buyer:</strong> ${buyerName}</p>
      <p><strong>Pickup Type:</strong> ${pickupType === 'locker' ? 'Locker Drop-off' : 'Courier Pickup'}</p>
      ${trackingNumber ? `<p><strong>Tracking:</strong> <span style='color: #10b981; font-weight: bold;'>${trackingNumber}</span></p>` : ''}
    </div>
    
    <div class='info-box'>
      <p style='margin: 0; font-size: 14px;'>
        <strong>${pickupType === 'locker' ? 'Please drop off your package at the selected locker location as soon as possible.' : 'A courier will contact you within 24 hours to arrange pickup at your address.'}</strong>
      </p>
    </div>
    
    <div style='text-align: center;'>
      <a href='https://rebookedsolutions.co.za/orders/${orderId}' class='btn'>Print Shipping Label</a>
    </div>
    `
  );
}

// ── 16. Remaining Frontend Migrated Templates ────────────────
export function buildDeliveryConfirmedBuyerEmail(buyerName: string, bookTitle: string, orderId: string): string {
  return createEmailTemplate(
    {
      title: "Thank you — Order Received",
      headerText: "Thank you — Order Received",
      headerType: "default"
    },
    `
    <p>Hello ${buyerName},</p>
    <p>Thanks for shopping with us! We hope you enjoy <strong>${bookTitle}</strong>.</p>
    <p>When you're done with it, you can list it on ReBooked Solutions and make your money back. Buy smart, sell smart — keep the cycle going. ♻️</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://rebookedsolutions.co.za/orders/${orderId}" class="btn">View Your Order</a>
    </div>
    
    <p style="font-size: 13px; color: #6b7280;">Share ReBooked with your friends & family so they can save too. Together we make textbooks affordable.</p>
    `
  );
}

export function buildDenialEmail(sellerName: string, bookTitle: string, orderId: string, denialReason: string, sellerEarnings: number, orderDate: string, deliveryDate: string): string {
  return createEmailTemplate(
    {
      title: "Payment Delayed - ReBooked Solutions",
      headerType: "error",
      headerText: "⚠️ Payment Temporarily Delayed"
    },
    `
    <p>Hi <strong>${sellerName}</strong>,</p>
    <p>We're writing to inform you about a temporary delay in processing your payment for a recent book sale.</p>
    
    <div class="info-box-error">
      <strong>⚠️ Issue Identified:</strong> There was an issue with the delivery of your book that requires our review before we can process your payment.
    </div>
    
    <div class="info-box">
      <h3 style="margin-top: 0;">📋 Order Details</h3>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Book Title:</strong> ${bookTitle}</p>
      <p><strong>Expected Earnings:</strong> R${Number(sellerEarnings).toFixed(2)}</p>
      <p><strong>Order Date:</strong> ${new Date(orderDate).toLocaleDateString()}</p>
      <p><strong>Delivery Date:</strong> ${new Date(deliveryDate).toLocaleDateString()}</p>
    </div>
    
    <div class="info-box-error">
      <strong>Reason for Delay:</strong><br>
      ${denialReason}
    </div>
    
    <h3>🔍 What happens next?</h3>
    <ul>
      <li><strong>Investigation:</strong> Our team is reviewing the delivery issue</li>
      <li><strong>Resolution:</strong> We'll work to resolve this fairly</li>
      <li><strong>Communication:</strong> We'll keep you updated</li>
      <li><strong>Payment:</strong> Once resolved, we'll process your payment immediately</li>
    </ul>
    `
  );
}

export function buildPaymentOnTheWayBankTransferEmail(sellerName: string, bookTitle: string, orderId: string): string {
  return createEmailTemplate(
    {
      title: "Payment on the way — ReBooked Solutions",
      headerText: "Payment on the Way",
      headerType: "default"
    },
    `
    <p>Hello ${sellerName},</p>
    <p>The buyer has confirmed delivery of <strong>${bookTitle}</strong> (Order ID: ${orderId.slice(-8)}). Your payment is now being processed.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://rebookedsolutions.co.za/seller/orders/${orderId}" class="btn">View Order</a>
    </div>
    `
  );
}

export function buildDeliveryComplaintAcknowledgmentBuyerEmail(buyerName: string, orderId: string, feedback: string): string {
  return createEmailTemplate(
    {
      title: "We've received your report — ReBooked Solutions",
      headerText: "We've Received Your Report",
      headerType: "default"
    },
    `
    <p>Hello ${buyerName},</p>
    <p>Thank you for reporting an issue with your order <strong>${orderId.slice(-8)}</strong>. Our support team will contact you shortly to investigate: "<em>${feedback.trim()}</em>"</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://rebookedsolutions.co.za/orders/${orderId}" class="btn">View Order</a>
    </div>
    `
  );
}

export function buildDeliveryComplaintNotificationSellerEmail(sellerName: string, orderId: string, bookTitle: string, feedback: string): string {
  return createEmailTemplate(
    {
      title: "Issue finalising order — ReBooked Solutions",
      headerText: "Issue Finalising Order",
      headerType: "warning"
    },
    `
    <p>Hello ${sellerName},</p>
    <p>We are writing to notify you that we encountered an issue while finalising Order ID: <strong>${orderId.slice(-8)}</strong> for the book <strong>"${bookTitle}"</strong>.</p>
    <p>The buyer reported a delivery discrepancy or an issue with the item received. Our support team is currently investigating this report to ensure a fair resolution for both parties. Your wallet payout for this order will be temporarily on hold until the investigation completes.</p>
    
    <div class="info-box-error">
      <h3 style="margin-top: 0; color:#dc2626;">Buyer Feedback Summary:</h3>
      <p style="margin: 0; font-style: italic;">"${feedback.trim() || "No detailed feedback provided."}"
    </div>

    <p>We may contact you shortly to request tracking receipts, proof of postage, or additional details. In the meantime, you can review the order details and message the buyer directly in the order chat.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://rebookedsolutions.co.za/orders/${orderId}" class="btn">View Order Details & Chat</a>
    </div>
    `
  );
}

export function buildContactAcknowledgmentEmail(buyerName: string, subject: string, message: string): string {
  return createEmailTemplate(
    {
      title: "We've received your message — ReBooked Solutions",
      headerText: "Message Received",
      headerType: "default"
    },
    `
    <p>Hello ${buyerName},</p>
    <p>Thank you for contacting ReBooked Solutions. We have successfully received your inquiry regarding "<strong>${subject}</strong>".</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #1f4e3d;">Copy of your message:</h3>
      <p style="margin: 0; font-style: italic; white-space: pre-wrap;">"${message}"</p>
    </div>

    <p>Our dedicated support team is currently reviewing your ticket and will get back to you with a resolution or follow-up questions within the next 24 hours. We appreciate your patience.</p>
    `
  );
}

export function buildSellerAwayNotificationEmail(buyerName: string, sellerName: string, bookTitle: string): string {
  return createEmailTemplate(
    {
      title: "Seller is away — ReBooked Solutions",
      headerText: "Seller is Away",
      headerType: "warning"
    },
    `
    <p>Hello ${buyerName},</p>
    <p>We received your purchase request for <strong>"${bookTitle}"</strong> from the seller <strong>${sellerName}</strong>.</p>
    
    <div class="info-box-warning">
      <h3 style="margin-top: 0; color: #b45309;">✈️ Away Mode Active</h3>
      <p><strong>${sellerName}</strong> is currently away and has temporarily paused their store activity. They are unable to confirm or prepare shipments at this time.</p>
      <p style="margin-bottom: 0;"><strong>What happens next?</strong> Your order request is queued. The moment the seller returns and disables Away Mode, we will instantly notify you so that you can finalize your purchase. If you'd like to browse similar listings in the meantime, click below.</p>
    </div>

    <div style="text-align: center; margin: 25px 0;">
      <a href="https://rebookedsolutions.co.za/profile" class="btn">Go to Dashboard</a>
    </div>
    `
  );
}

// ── 11. Security & Profile Changed Alert ──────────────────────
export function buildProfileChangedSecurityEmail(userName: string, changes: string[]): string {
  const changeItems = changes.map(c => `<li>${c}</li>`).join("");
  return createEmailTemplate(
    {
      title: "Security Alert: Profile Changed",
      headerText: "Security Notification",
      headerType: "warning",
      headerEmoji: "🔒",
      headerSubtext: `Hello ${userName},`
    },
    `
    <p>We are writing to notify you that changes were recently made to your ReBooked Solutions profile settings.</p>
    
    <div class="info-box-warning">
      <h3 style="margin-top: 0; color: #b45309;">⚠️ Updated Fields:</h3>
      <ul style="margin: 0; padding-left: 20px;">
        ${changeItems}
      </ul>
    </div>
    
    <p>If you authorized these updates, no action is required on your part. If you did <strong>NOT</strong> authorize these changes, your account security may be compromised. Please reset your password immediately, log out of all active devices, and contact support at support@rebookedsolutions.co.za.</p>
    
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://rebookedsolutions.co.za/profile" class="btn-danger">View Profile Security</a>
    </div>
    `
  );
}

// ── 12. Payouts (Requested & Processed) ──────────────────────
export function buildPayoutRequestedEmail(sellerName: string, amount: number, bankDetails: string): string {
  return createEmailTemplate(
    {
      title: "Payout Request Received",
      headerText: "Payout Requested",
      headerType: "default",
      headerEmoji: "💸",
      headerSubtext: `Hello ${sellerName},`
    },
    `
    <p>We have successfully received your request to withdraw funds from your virtual wallet to your registered South African bank account.</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #1f4e3d;">Request Summary</h3>
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="color:#6b7280; font-weight:600; padding:6px 0;">Amount Requested</td><td style="text-align:right; font-weight:bold; color:#1f4e3d; font-size: 15px;">R${amount.toFixed(2)}</td></tr>
        ${bankDetails ? `<tr><td style="color:#6b7280; font-weight:600; padding:6px 0;">Destination Account</td><td style="text-align:right; font-family: monospace;">${bankDetails}</td></tr>` : ''}
        <tr><td style="color:#6b7280; font-weight:600; padding:6px 0;">Estimated Processing Time</td><td style="text-align:right; color:#f59e0b; font-weight:bold;">1–2 Business Days</td></tr>
      </table>
    </div>
    
    <p>Our finance team will verify the payout and initiate the bank transfer. We will notify you via email as soon as the transfer has been completed.</p>
    `
  );
}

export function buildPayoutProcessedEmail(sellerName: string, amount: number, reference: string): string {
  return createEmailTemplate(
    {
      title: "Payout Completed Successfully",
      headerText: "Payout Processed!",
      headerType: "default",
      headerEmoji: "✅",
      headerSubtext: `Hello ${sellerName},`
    },
    `
    <p>Great news! Your payout request has been verified and processed successfully. The bank transfer has been initiated.</p>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color:#10b981;">💰 Transfer Details</h3>
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="color:#6b7280; font-weight:600; padding:6px 0;">Amount Transferred</td><td style="text-align:right; font-weight:bold; color:#10b981; font-size:16px;">R${amount.toFixed(2)}</td></tr>
        <tr><td style="color:#6b7280; font-weight:600; padding:6px 0;">Payment Reference</td><td style="text-align:right; font-family:monospace;">${reference}</td></tr>
        <tr><td style="color:#6b7280; font-weight:600; padding:6px 0;">Status</td><td style="text-align:right; color:#10b981; font-weight:bold;">Completed</td></tr>
      </table>
    </div>
    
    <p>Depending on inter-bank processing delays, the funds should reflect in your bank account within 24 hours. Thank you for listing with ReBooked Solutions!</p>
    `
  );
}

// ── 13. Disputes (Opened & Resolved) ─────────────────────────
export function buildDisputeOpenedEmail(buyerName: string, sellerName: string, orderId: string, reason: string): string {
  return createEmailTemplate(
    {
      title: "Order Dispute Opened",
      headerText: "Order Under Dispute",
      headerType: "warning",
      headerEmoji: "⚖️",
      headerSubtext: `Order ID: ${orderId}`
    },
    `
    <p>We are writing to notify you that a formal dispute has been opened for Order ID: <strong>${orderId}</strong>.</p>
    
    <div class="info-box-error">
      <h3 style="margin-top: 0; color:#dc2626;">Dispute Report</h3>
      <p><strong>Raised By:</strong> ${buyerName} (Buyer)</p>
      <p><strong>Seller:</strong> ${sellerName}</p>
      <p><strong>Reason for Dispute:</strong></p>
      <p style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #fca5a5; font-style: italic;">"${reason}"</p>
    </div>
    
    <div class="info-box" style="background:#eff6ff; border-color:#3b82f6;">
      <p style="margin: 0; color:#1e40af; font-size:13px;"><strong>🛡️ Security Hold:</strong><br/>
        All wallet payouts related to this order are on hold until our support agents review the dispute and issue a resolution. We will coordinate with both parties in the order chat.
      </p>
    </div>

    <p>Please log in to your dashboard and use the order chat to discuss the dispute or upload necessary proof. Our agents are standing by to mediate.</p>
    
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://rebookedsolutions.co.za/orders/${orderId}" class="btn">Open Order Chat</a>
    </div>
    `
  );
}

export function buildDisputeResolvedEmail(userName: string, orderId: string, resolution: string): string {
  return createEmailTemplate(
    {
      title: "Dispute Resolution Notification",
      headerText: "Dispute Resolved",
      headerType: "default",
      headerEmoji: "🤝",
      headerSubtext: `Order ID: ${orderId}`
    },
    `
    <p>Hello ${userName},</p>
    <p>Our marketplace team has reviewed the dispute case for Order ID: <strong>${orderId}</strong> and has issued a final resolution.</p>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color:#10b981;">Resolution Outcome</h3>
      <p style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #a7f3d0; font-style: italic;">"${resolution}"</p>
    </div>
    
    <p>This dispute is now officially closed. The appropriate wallet credits or refunds have been processed accordingly. If you have any further questions, please reply directly to this email.</p>
    
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://rebookedsolutions.co.za/orders/${orderId}" class="btn">View Order Details</a>
    </div>
    `
  );
}

// ── 14. Inactive Reminders ────────────────────────────────────
export function buildInactiveReminderEmail(userName: string, durationText: string): string {
  return createEmailTemplate(
    {
      title: "We miss you on ReBooked Solutions!",
      headerText: "We Miss You!",
      headerType: "default",
      headerEmoji: "👋",
      headerSubtext: `Hey ${userName},`
    },
    `
    <p>It's been <strong>${durationText}</strong> since you last logged into ReBooked Solutions. Pre-loved school books, study guides, and supplies are flying off the shelves for the upcoming term! 📚</p>
    
    <div class="info-box" style="text-align: center; background-color: #f0fdf4; border-color: #10b981;">
      <h3 style="margin-top: 0; color:#15803d;">Ready to clear your shelves or grab new books?</h3>
      <p style="font-size: 14px; color:#166534;">Log back in to check your messages, list new items, or complete your wishlist purchases.</p>
      <a href="https://rebookedsolutions.co.za/profile" class="btn">Log In & Browse Marketplace</a>
    </div>
    
    <p style="font-size:12px; color:#6b7280; text-align:center; margin-top:24px;">
      You can manage your email alert settings in your user settings tab at any time.
    </p>
    `
  );
}

// ── 15. Wishlist Alert (Seller Back) ──────────────────────────
export function buildSellerBackWishlistEmail(buyerName: string, sellerName: string, bookTitle: string, listingUrl: string): string {
  return createEmailTemplate(
    {
      title: "Item Back in Stock!",
      headerText: "Great News!",
      headerType: "default",
      headerEmoji: "✨",
      headerSubtext: `${sellerName} is back!`
    },
    `
    <p>Hello ${buyerName},</p>
    <p>Great news! The seller <strong>${sellerName}</strong> has returned, and the item on your wishlist is available again.</p>
    
    <div class="info-box-success">
      <p style="margin: 0; font-size: 16px; font-weight: 600;">"${bookTitle}"</p>
    </div>
    
    <div style="text-align: center; margin-top: 20px;">
      <a href="${listingUrl}" class="btn">View & Purchase Listing</a>
    </div>
    `
  );
}

// ── 16. Welcome Email ─────────────────────────────────────────
export function buildWelcomeEmailHTML(name: string, email: string): string {
  return createEmailTemplate(
    {
      title: "Welcome to ReBooked Solutions",
      headerText: "Welcome to ReBooked Solutions",
      headerEmoji: "🎉",
      headerSubtext: "Your account is now active"
    },
    `
    <p>Hi ${name}!</p>
    <p>Welcome to South Africa's premier school supply marketplace! Your account has been created successfully and you are ready to get started.</p>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color: #15803d;">What you can do now:</h3>
      <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.6; color: #1f4e3d;">
        <li>📚 Browse thousands of affordable textbooks</li>
        <li>💰 Sell your textbooks to other students</li>
        <li>🚚 Enjoy convenient doorstep delivery</li>
        <li>🎓 Connect with students at your university</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rebookedsolutions.co.za/books" class="btn">Start Browsing Books</a>
    </div>
    `
  );
}

export function buildWelcomeEmailText(name: string, email: string): string {
  return `
Welcome to ReBooked Solutions!

Hi ${name}!

Your account has been created successfully! Welcome to South Africa's premier textbook marketplace.

You can now:
- Browse thousands of affordable textbooks
- Sell your textbooks to other students
- Enjoy convenient doorstep delivery
- Connect with students at your university

Visit https://rebookedsolutions.co.za/listings to start browsing!

Account: ${email}
Support: support@rebookedsolutions.co.za

"Books · Uniforms · Everything In Between"
`;
}

// ── 17. ReBooked Business Subscription Lifecycle Emails ───────

export function buildBusinessSubscriptionActivatedEmail(businessName: string, tier: string, commissionRate: number): string {
  const keepRate = (100 - commissionRate).toFixed(1).replace(/\.0$/, '');
  return createEmailTemplate(
    {
      title: "ReBooked Business Tier 1 Activated!",
      headerText: "ReBooked Business — Tier 1 Active!",
      headerType: "default",
      headerEmoji: "🚀",
      headerSubtext: `Welcome to ReBooked Business Tier 1, ${businessName}!`
    },
    `
    <p>Congratulations! Your <strong>ReBooked Business Tier 1</strong> subscription is now active. You now have access to all premium business features.</p>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color: #15803d;">✅ Your Tier 1 Benefits</h3>
      <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.8; color: #1f4e3d;">
        <li>💸 <strong>${commissionRate}% commission</strong> — you keep ${keepRate}% of every sale</li>
        <li>📱 <strong>Public contact display</strong> — Instagram, phone & email on your store card</li>
        <li>🎯 <strong>Bulk promotions</strong> — apply deals across your entire store or by category</li>
        <li>🔄 <strong>Restock & republish</strong> — add stock to existing listings without recreating them</li>
        <li>💬 <strong>Automated messages</strong> — set an auto-responder for incoming chats</li>
      </ul>
    </div>
    
    <p>Log in to your <strong>ReBooked Business</strong> dashboard to configure your new features.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rebookedsolutions.co.za/business-profile" class="btn">Open Business Dashboard</a>
    </div>
    `
  );
}

export function buildBusinessRenewalReminderEmail(businessName: string, renewalDate: string): string {
  return createEmailTemplate(
    {
      title: "ReBooked Business — Renewal Reminder",
      headerText: "Subscription Renewal Coming Up",
      headerType: "warning",
      headerEmoji: "📅",
      headerSubtext: `Hello ${businessName},`
    },
    `
    <p>Your <strong>ReBooked Business Tier 1</strong> subscription is due for renewal on <strong>${renewalDate}</strong>.</p>
    
    <div class="info-box-warning">
      <h3 style="margin-top: 0; color: #b45309;">⏳ Action Required</h3>
      <p>To continue enjoying your Tier 1 commission rate (6.5%) and all premium features, please ensure your payment method is up to date before your renewal date.</p>
    </div>
    
    <p>If payment fails, your account will be downgraded to <strong>ReBooked Business Free</strong> (10% commission) and the following features will be paused:</p>
    <ul style="font-size:14px;">
      <li>Public contact display (phone/Instagram/email)</li>
      <li>Bulk store-wide promotions</li>
      <li>Restock & republish</li>
      <li>Automated chat messages</li>
    </ul>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rebookedsolutions.co.za/business-profile" class="btn">Manage Subscription</a>
    </div>
    `
  );
}

export function buildBusinessPaymentFailedEmail(businessName: string): string {
  return createEmailTemplate(
    {
      title: "ReBooked Business — Payment Failed",
      headerText: "Subscription Payment Failed",
      headerType: "error",
      headerEmoji: "❌",
      headerSubtext: `Hello ${businessName},`
    },
    `
    <p>Unfortunately, we were unable to process your <strong>ReBooked Business Tier 1</strong> subscription payment. Your account has been temporarily downgraded to <strong>ReBooked Business Free</strong>.</p>
    
    <div class="info-box-error">
      <h3 style="margin-top: 0; color:#dc2626;">What changed?</h3>
      <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.8;">
        <li>Commission rate reverted to <strong>10%</strong></li>
        <li>Public contact info hidden from your store card</li>
        <li>Bulk promotions paused</li>
        <li>Restock & republish paused</li>
        <li>Automated messages paused</li>
      </ul>
    </div>
    
    <p>To restore Tier 1 immediately, update your payment details and retry.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rebookedsolutions.co.za/business-profile" class="btn-danger">Update Payment & Restore</a>
    </div>
    `
  );
}

export function buildBusinessSubscriptionCancelledEmail(businessName: string): string {
  return createEmailTemplate(
    {
      title: "ReBooked Business — Subscription Cancelled",
      headerText: "Tier 1 Subscription Cancelled",
      headerType: "warning",
      headerEmoji: "📋",
      headerSubtext: `Hello ${businessName},`
    },
    `
    <p>Your <strong>ReBooked Business Tier 1</strong> subscription has been cancelled. You will remain on the <strong>ReBooked Business Free</strong> plan.</p>
    
    <div class="info-box-warning">
      <h3 style="margin-top: 0; color: #b45309;">Features you've lost access to:</h3>
      <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.8;">
        <li>6.5% commission rate (now 10%)</li>
        <li>Public contact display (phone/Instagram/email)</li>
        <li>Bulk store-wide promotions</li>
        <li>Restock & republish</li>
        <li>Automated chat messages</li>
      </ul>
    </div>
    
    <p>You can reactivate Tier 1 at any time from your ReBooked Business dashboard.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rebookedsolutions.co.za/business-profile" class="btn">Reactivate Tier 1</a>
    </div>
    `
  );
}

export function buildBusinessVerifiedEmail(businessName: string): string {
  return createEmailTemplate(
    {
      title: "ReBooked Business — Verified Badge Granted",
      headerText: "You're Verified!",
      headerType: "default",
      headerEmoji: "✅",
      headerSubtext: `Congratulations, ${businessName}!`
    },
    `
    <p>Your <strong>ReBooked Business</strong> account has been reviewed and your <strong>Verified Business Badge</strong> has been granted. Buyers can now see your verified status on your public store card.</p>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color: #15803d;">✅ What this means for you:</h3>
      <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.8; color: #1f4e3d;">
        <li>Increased buyer trust and confidence</li>
        <li>Verified badge displayed on your ReBooked Mini store card</li>
        <li>Priority placement in ReBooked listings</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rebookedsolutions.co.za/business-profile" class="btn">View Your Business Dashboard</a>
    </div>
    `
  );
}

export function buildBulkPromoAppliedEmail(businessName: string, itemCount: number, discountInfo: string): string {
  return createEmailTemplate(
    {
      title: "ReBooked Business — Bulk Promotion Applied",
      headerText: "Bulk Promotion Live!",
      headerType: "default",
      headerEmoji: "🎯",
      headerSubtext: `Hello ${businessName},`
    },
    `
    <p>Your bulk promotion has been successfully applied across <strong>${itemCount} listing(s)</strong>.</p>
    
    <div class="info-box-success">
      <h3 style="margin-top: 0; color: #15803d;">📊 Promotion Details</h3>
      <p style="margin: 0;">${discountInfo}</p>
    </div>
    
    <p>Buyers can now see the discounted prices on all affected listings. You can manage or remove deals any time from your <strong>ReBooked Business</strong> dashboard.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rebookedsolutions.co.za/business-profile" class="btn">Manage Deals</a>
    </div>
    `
  );
}

export function buildAutoResponderSetupEmail(businessName: string, autoMessage: string): string {
  return createEmailTemplate(
    {
      title: "ReBooked Business — Auto-Responder Configured",
      headerText: "Auto-Responder Active!",
      headerType: "default",
      headerEmoji: "💬",
      headerSubtext: `Hello ${businessName},`
    },
    `
    <p>Your <strong>ReBooked Business</strong> automated message has been saved and is now active. Every new buyer chat will receive the following auto-reply:</p>
    
    <div class="info-box" style="font-style: italic;">
      <p style="margin: 0; font-size: 15px;">&ldquo;${autoMessage}&rdquo;</p>
    </div>
    
    <p style="font-size: 13px; color: #6b7280;">You can update or disable this message at any time from the Settings & Payouts tab in your ReBooked Business dashboard.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rebookedsolutions.co.za/business-profile" class="btn">Manage Auto-Responder</a>
    </div>
    `
  );
}

export function buildBusinessSubscriptionActivatedEmail(businessName: string, tierName: string, commissionRate: number): string {
  return createEmailTemplate(
    {
      title: "ReBooked Business — Subscription Active!",
      headerText: "Tier 1 Activated",
      headerType: "success",
      headerEmoji: "🚀",
      headerSubtext: `Hi ${businessName},`
    },
    `
    <p>We are excited to let you know that your <strong>ReBooked Business ${tierName}</strong> subscription is now active!</p>
    <p>You now enjoy a reduced flat platform commission of <strong>${commissionRate}%</strong> on all textbook, reader, uniform, and school supply sales.</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #1f4e3d;">Your Premium Features Are Unlocked:</h3>
      <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 1.6; color: #1f4e3d;">
        <li>🚀 6.5% platform commission rate</li>
        <li>📣 Store-wide bulk promotions & category discounts</li>
        <li>📞 Public contact details (phone, Instagram, email) shown on your store card</li>
        <li>💬 Chat auto-responder active</li>
        <li>🔄 Restock and republish out-of-stock items</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rebookedsolutions.co.za/business-profile" class="btn">Go to Business Dashboard</a>
    </div>
    `
  );
}

export function buildBusinessPaymentFailedEmail(businessName: string): string {
  return createEmailTemplate(
    {
      title: "Action Required: ReBooked Business Payment Failed",
      headerText: "Payment Failed",
      headerType: "warning",
      headerEmoji: "⚠️",
      headerSubtext: `Hello ${businessName},`
    },
    `
    <p>We were unable to process your recurring charge for your <strong>ReBooked Business Tier 1</strong> subscription.</p>
    <p>Your subscription is currently in a <strong>5-day grace period</strong>. You still have full access to Tier 1 features, but we will retry the charge. If payment is not received within 5 days, your account will be automatically downgraded to the Free tier.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rebookedsolutions.co.za/business-profile?tab=settings_payouts" class="btn">Update Billing Information</a>
    </div>
    `
  );
}

export function buildBusinessSubscriptionCancelledEmail(businessName: string, featuresLost: string): string {
  return createEmailTemplate(
    {
      title: "Your ReBooked Business Subscription Cancelled",
      headerText: "Subscription Cancelled",
      headerType: "warning",
      headerEmoji: "📅",
      headerSubtext: `Hello ${businessName},`
    },
    `
    <p>Your cancellation request has been received. Your <strong>ReBooked Business Tier 1</strong> subscription will remain active until the end of your current billing period.</p>
    <p>At that time, your account will be downgraded to the Business Free tier, and you will lose access to premium features: <em>${featuresLost}</em>.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rebookedsolutions.co.za/business-profile" class="btn">Manage Subscription</a>
    </div>
    `
  );
}

export function buildBusinessDowngradedEmail(businessName: string, featuresLost: string): string {
  return createEmailTemplate(
    {
      title: "Your ReBooked Business Account Downgraded",
      headerText: "Account Downgraded",
      headerType: "warning",
      headerEmoji: "📉",
      headerSubtext: `Hi ${businessName},`
    },
    `
    <p>Your subscription period has ended, and your account has been downgraded to the <strong>ReBooked Business Free</strong> tier.</p>
    <p>Your commission rate has reverted to the flat 10% rate, and premium features (<em>${featuresLost}</em>) are no longer active.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://rebookedsolutions.co.za/business-profile?tab=settings_payouts" class="btn">Upgrade to Tier 1 Again</a>
    </div>
    `
  );
}

