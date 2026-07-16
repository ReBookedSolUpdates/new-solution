export interface ReceiptItem {
  title?: string;
  name?: string;
  book_title?: string;
  price?: number;
  amount?: number;
  condition?: string;
  quantity?: number;
}

export interface ReceiptOrder {
  id: string;
  order_id?: string | null;
  payment_reference?: string | null;
  paystack_reference?: string | null;
  created_at: string;
  buyer_full_name?: string | null;
  buyer_email?: string | null;
  seller_full_name?: string | null;
  seller_email?: string | null;
  selected_shipping_cost?: number | null;
  platform_fee?: number | null;
  delivery_type?: string | null;
  order_type?: string | null;
  tracking_number?: string | null;
  delivery_locker_data?: any;
  items?: ReceiptItem[] | null;
  metadata?: any;
  wallet_deducted_amount?: number | null;
  total_amount?: number | null;
  commission_rate?: number | null;
}

export function buildPremiumReceiptHtml(order: ReceiptOrder, isSeller: boolean): string {
  const items = Array.isArray(order.items) ? order.items : [];
  const firstItem = items[0] || {};
  const itemTitle = firstItem.title || firstItem.name || firstItem.book_title || "Marketplace Item";
  const itemCondition = firstItem.condition || "N/A";
  const itemQuantity = Number(firstItem.quantity || 1);

  const itemPrice = Number(firstItem.price ?? firstItem.amount ?? 0);
  const deliveryFee = typeof order.selected_shipping_cost === "number"
    ? Number(order.selected_shipping_cost) / 100
    : 0;
  
  const buyerProtectionFee = typeof order.platform_fee === "number"
    ? Number(order.platform_fee)
    : 20;

  const metadata = order.metadata || {};
  const discountApplied = metadata.coupon_discount
    ? Number(metadata.coupon_discount) / 100
    : 0;
  const couponCode = metadata.coupon_code || "";

  const computedTotal = Math.max(0, itemPrice + deliveryFee + buyerProtectionFee - discountApplied);
  const totalPaid = typeof order.total_amount === "number" && order.total_amount > 0
    ? Number(order.total_amount)
    : computedTotal;

  const walletDeducted = order.wallet_deducted_amount
    ? Number(order.wallet_deducted_amount) / 100
    : 0;

  // Resolve commission rate dynamically
  const rate = typeof order.commission_rate === "number"
    ? order.commission_rate
    : (metadata.commission_rate_applied !== undefined
      ? Number(metadata.commission_rate_applied)
      : 0.10); // Default to 10%

  const commission = itemPrice * rate;
  const payout = itemPrice - commission;

  const createdDate = order.created_at ? new Date(order.created_at).toLocaleString() : "";
  const paymentRef = order.payment_reference || order.paystack_reference || "Pending";

  const isPickup = order.order_type === "pickup" || order.delivery_type === "pickup";
  const deliveryDisplayName = isPickup
    ? "In-Person Pickup"
    : order.delivery_type?.toLowerCase().includes('locker')
    ? 'Locker-to-Locker'
    : 'Door-to-Door';

  // Delivery details section HTML
  let deliveryDetailsHtml = "";
  if (order.delivery_locker_data) {
    const lockerName = order.delivery_locker_data.name || "Locker";
    const lockerAddr = order.delivery_locker_data.full_address || order.delivery_locker_data.address || "";
    deliveryDetailsHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
        <span style="color: #888;">Locker</span>
        <span style="color: #1a1a1a; font-weight: 500; text-align: right; max-width: 65%;">
          ${lockerName}<br />
          <span style="font-size: 11px; color: #666;">${lockerAddr}</span>
        </span>
      </div>
    `;
  } else if (metadata.delivery_address) {
    const addr = metadata.delivery_address;
    const addrStr = `${addr.street || addr.streetAddress || ""}, ${addr.suburb || ""}, ${addr.city || ""}, ${addr.postal_code || addr.postalCode || ""}`;
    deliveryDetailsHtml = `
      <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
        <span style="color: #888;">Address</span>
        <span style="color: #1a1a1a; font-weight: 500; text-align: right; max-width: 65%;">${addrStr}</span>
      </div>
    `;
  }

  return `
    <div style="width: 480px; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; box-sizing: border-box; padding: 0; margin: 0; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 12px; padding: 24px 24px 20px 24px; border-bottom: 1px solid #eaeaea;">
        <img src="/favicon.webp" alt="logo" style="width: 36px; height: 36px; border-radius: 50%;" />
        <div style="text-align: left;">
          <h1 style="margin: 0; font-size: 15px; font-weight: 600; color: #1a1a1a;">ReBooked Solutions</h1>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #888;">
            Order Ref: <span style="font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px;">${order.order_id || order.id}</span>
          </p>
        </div>
        <div style="margin-left: auto; font-size: 11px; font-weight: 600; color: #1f4e3d; background: #e8f5ee; padding: 4px 10px; border-radius: 12px;">
          PAID
        </div>
      </div>

      <!-- Transaction Section -->
      <div style="padding: 18px 24px; border-bottom: 1px solid #f0f0f0;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
          <span style="color: #888;">Date</span>
          <span style="color: #1a1a1a; font-weight: 500; text-align: right;">${createdDate}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
          <span style="color: #888;">Payment Ref</span>
          <span style="color: #1a1a1a; font-weight: 500; text-align: right; font-family: 'SFMono-Regular', Consolas, monospace;">${paymentRef}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
          <span style="color: #888;">${isSeller ? "Buyer" : "Seller"}</span>
          <span style="color: #1a1a1a; font-weight: 500; text-align: right;">
            ${isSeller ? (order.buyer_full_name || order.buyer_email || "Buyer") : (order.seller_full_name || order.seller_email || "Seller")}
          </span>
        </div>
      </div>

      <!-- Item Section -->
      <div style="padding: 18px 24px; border-bottom: 1px solid #f0f0f0; text-align: left;">
        <div style="font-size: 14px; font-weight: 600; margin: 0 0 2px 0; color: #1a1a1a;">${itemTitle}</div>
        <div style="font-size: 12px; color: #888; margin: 0 0 12px 0;">
          Condition: ${itemCondition} &#8226; Qty: ${itemQuantity}
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
          <span style="color: #888;">Item Price</span>
          <span style="color: #1a1a1a; font-weight: 500; text-align: right;">R${itemPrice.toFixed(2)}</span>
        </div>

        ${isSeller ? `
          <!-- Seller pricing breakdown -->
          <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
            <span style="color: #888;">Commission Fee (${(rate * 100).toFixed(1)}%)</span>
            <span style="color: #b91c1c; font-weight: 500; text-align: right;">-R${commission.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; padding-top: 10px; margin-top: 6px; border-top: 1px solid #eaeaea;">
            <span>Estimated Payout</span>
            <span>R${payout.toFixed(2)}</span>
          </div>
        ` : `
          <!-- Buyer pricing breakdown -->
          <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
            <span style="color: #888;">Delivery Fee</span>
            <span style="color: #1a1a1a; font-weight: 500; text-align: right;">R${deliveryFee.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
            <span style="color: #888;">Buyer's Protection Fee</span>
            <span style="color: #1a1a1a; font-weight: 500; text-align: right;">R${buyerProtectionFee.toFixed(2)}</span>
          </div>
          ${discountApplied > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
              <span style="color: #888;">Discount ${couponCode ? `(${couponCode})` : ""}</span>
              <span style="color: #16a34a; font-weight: 500; text-align: right;">-R${discountApplied.toFixed(2)}</span>
            </div>
          ` : ""}
          ${walletDeducted > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
              <span style="color: #888;">Wallet Deduction</span>
              <span style="color: #1a1a1a; font-weight: 500; text-align: right;">-R${walletDeducted.toFixed(2)}</span>
            </div>
          ` : ""}

          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; padding-top: 10px; margin-top: 6px; border-top: 1px solid #eaeaea;">
            <span>Total Paid</span>
            <span>R${totalPaid.toFixed(2)}</span>
          </div>
          ${walletDeducted > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 500; color: #666; margin-top: 4px;">
              <span>Paid via Card</span>
              <span>R${Math.max(0, totalPaid - walletDeducted).toFixed(2)}</span>
            </div>
          ` : ""}
        `}
      </div>

      <!-- Delivery Details Section -->
      ${!isSeller ? `
        <div style="padding: 18px 24px; border-bottom: 1px solid #f0f0f0; text-align: left;">
          <div style="font-size: 13px; color: #888; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Delivery Details</div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
            <span style="color: #888;">Method</span>
            <span style="color: #1a1a1a; font-weight: 500; text-align: right;">${deliveryDisplayName}</span>
          </div>
          ${deliveryDetailsHtml}
          ${!isPickup && order.tracking_number ? `
            <div style="display: flex; justify-content: space-between; font-size: 13px; line-height: 1.8;">
              <span style="color: #888;">Tracking Number</span>
              <span style="color: #1a1a1a; font-weight: 500; text-align: right; font-family: 'SFMono-Regular', Consolas, monospace;">${order.tracking_number}</span>
            </div>
          ` : ""}
        </div>
      ` : ""}

      <!-- Footer -->
      <div style="text-align: center; padding: 20px 24px; font-size: 11px; color: #999;">
        <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 4px;">ReBooked Solutions</div>
        <div style="margin-bottom: 4px;">support@rebookedsolutions.co.za &#183; rebookedsolutions.co.za</div>
        <div>Automated receipt &#183; &copy; 2026 ReBooked Solutions</div>
      </div>
    </div>
  `;
}
