import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Package,
  Truck,
  Download,
  Mail,
  Eye,
  ShoppingBag,
  Loader2,
  User,
  CreditCard,
  MapPin,
  BookOpen,
  Hash,
  GraduationCap,
  Globe,
  Layers,
  Tag,
} from "lucide-react";
import { OrderConfirmation } from "@/types/checkout";
import { supabase } from "@/integrations/supabase/client";
import { emailService } from "@/services/emailService";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getOrderShippingAddress } from "@/services/addressService";

interface Step4ConfirmationProps {
  orderData: OrderConfirmation;
  onViewOrders: () => void;
  onContinueShopping: () => void;
}

interface BuyerProfile {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
}

type OrderDeliveryMeta = {
  delivery_type: string | null;
  delivery_locker_data: any | null;
  selected_courier_name: string | null;
  selected_service_name: string | null;
};

type CouponRedemptionMeta = {
  code: string;
  discount_applied: number;
};

const Row: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0 gap-3">
      <span className="text-xs sm:text-sm text-gray-500 font-semibold min-w-0 shrink-0">{label}</span>
      <span className="text-xs sm:text-sm text-gray-800 font-medium text-right break-words max-w-[65%]">{value}</span>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
  <h3 className="font-bold text-sm uppercase text-gray-700 flex items-center gap-2 mb-3">
    {icon}
    {title}
  </h3>
);

const Step4Confirmation: React.FC<Step4ConfirmationProps> = ({
  orderData,
  onViewOrders,
  onContinueShopping,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const [deliveryMeta, setDeliveryMeta] = useState<OrderDeliveryMeta | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<any | null>(null);
  const [orderRow, setOrderRow] = useState<any | null>(null);
  const [couponMeta, setCouponMeta] = useState<CouponRedemptionMeta | null>(null);

  useEffect(() => {
    // Fetch buyer profile for full details
    const fetchBuyer = async () => {
      if (!orderData.buyer_id) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name, email, phone_number')
        .eq('id', orderData.buyer_id)
        .single();
      if (data) setBuyerProfile(data as BuyerProfile);
    };

    fetchBuyer();

    // Cleanup cart
    localStorage.removeItem('checkoutCart');
    localStorage.removeItem('activeCheckoutKey');

    toast.success("Payment successful! 🎉", {
      description: "Your order has been confirmed and the seller has been notified.",
      duration: 5000,
    });
  }, [orderData.buyer_id]);

  useEffect(() => {
    if (!orderRow || !buyerProfile || !receiptRef.current) return;
    
    const autoProcessReceipt = async () => {
      if (orderRow.receipt_pdf_base64) {
        console.log("[Step4] Receipt already generated and saved. Skipping auto-process.");
        return;
      }
      
      try {
        console.log("[Step4] Auto-generating receipt PDF...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const base64 = await generateReceiptPdfBase64();
        if (!base64) return;
        
        const { error: dbErr } = await supabase
          .from("orders")
          .update({ receipt_pdf_base64: base64 } as any)
          .eq("id", orderData.id);
          
        if (dbErr) {
          console.error("[Step4] Failed to save receipt PDF to DB:", dbErr);
        } else {
          console.log("[Step4] Receipt PDF saved to DB successfully!");
          setOrderRow(prev => prev ? { ...prev, receipt_pdf_base64: base64 } : null);
        }
        
        const buyerEmail = buyerProfile.email || orderData.buyer_email;
        if (buyerEmail) {
          const emailSubject = `📚 Purchase Confirmed – Receipt attached for order ${orderData.order_id}`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; background: #f3fef7; padding: 20px; color: #1f4e3d;">
              <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="background: linear-gradient(135deg, #3ab26f, #2d8f58); padding: 24px; border-radius: 8px 8px 0 0; text-align: center; color: white; margin: -30px -30px 24px;">
                  <h1 style="margin: 0; font-size: 22px;">Order Confirmed!</h1>
                  <p style="margin: 6px 0 0; opacity: 0.9;">Your payment receipt is attached</p>
                </div>
                <p>Hello <strong>${buyerName}</strong>,</p>
                <p>Thank you for buying securely with <strong>ReBooked Solutions</strong>. Your payment has been confirmed successfully.</p>
                <p>We have attached your official PDF receipt to this email for your records.</p>
                
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin: 16px 0;">
                  <p style="margin: 0; font-size: 13px; color: #1e40af;"><strong>⏳ What happens next?</strong><br/>
                    The seller has 48 hours to confirm your order. If they confirm, your item will be prepared for shipment. If they do not respond, you will get a full automatic refund.
                  </p>
                </div>
                <p style="text-align: center; margin-top: 24px;">
                  <a href="https://rebookedsolutions.co.za/profile?tab=activity" style="display: inline-block; padding: 12px 20px; background: #3ab26f; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">View Your Orders</a>
                </p>
              </div>
            </div>
          `;
          
          await emailService.sendEmail({
            to: buyerEmail,
            subject: emailSubject,
            html: emailHtml,
            attachments: [
              {
                filename: `receipt-${orderData.order_id}.pdf`,
                content: base64,
                contentType: "application/pdf",
                encoding: "base64"
              }
            ]
          });
          console.log("[Step4] Receipt email with PDF attachment sent successfully!");
        }
      } catch (err) {
        console.error("[Step4] Auto processing receipt error:", err);
      }
    };
    
    autoProcessReceipt();
  }, [orderRow?.id, buyerProfile?.email]);

  useEffect(() => {
    let cancelled = false;
    const fetchDelivery = async () => {
      try {
        if (!orderData?.id) return;

        const { data } = await supabase
          .from("orders")
          .select("id, order_id, item_type, items, amount, total_amount, selected_shipping_cost, platform_fee, order_type, pickup_status, meetup_location, meetup_time, selected_courier_name, selected_service_name, delivery_type, delivery_locker_data, tracking_number, commit_deadline, payment_reference, paystack_reference, wallet_deducted_amount, receipt_pdf_base64")
          .eq("id", orderData.id)
          .maybeSingle();

        if (cancelled) return;
        if (data) {
          setOrderRow(data as any);
          setDeliveryMeta({
            delivery_type: (data as any)?.delivery_type ?? null,
            delivery_locker_data: (data as any)?.delivery_locker_data ?? null,
            selected_courier_name: (data as any)?.selected_courier_name ?? null,
            selected_service_name: (data as any)?.selected_service_name ?? null,
          });
        }

        // Coupon details (join to coupons for code)
        try {
          const { data: red } = await supabase
            .from("coupon_redemptions")
            .select("discount_applied, coupons(code)")
            .eq("order_id", orderData.id)
            .maybeSingle();
          const code = (red as any)?.coupons?.code;
          const discount = Number((red as any)?.discount_applied || 0);
          if (code && Number.isFinite(discount) && discount > 0) {
            setCouponMeta({ code, discount_applied: discount });
          } else {
            setCouponMeta(null);
          }
        } catch {
          setCouponMeta(null);
        }

        // Only decrypt address for door deliveries. Lockers use delivery_locker_data.
        const orderType = (data as any)?.order_type || (orderData.delivery_method === "pickup" ? "pickup" : "delivery");
        const type = (data as any)?.delivery_type || orderData.delivery_method;
        const isDoor = String(type || "").toLowerCase().includes("door") || String(type || "").toLowerCase().includes("home");
        if (orderType !== "pickup" && isDoor) {
          const addr = await getOrderShippingAddress(orderData.id);
          if (!cancelled) setDeliveryAddress(addr);
        }
      } catch {
        // non-blocking: confirmation page should still render
      }
    };
    fetchDelivery();
    return () => { cancelled = true; };
  }, [orderData?.id, orderData?.delivery_method]);

  const buyerName = buyerProfile
    ? buyerProfile.full_name || `${buyerProfile.first_name || ''} ${buyerProfile.last_name || ''}`.trim()
    : orderData.buyer_id;

  const isPickupOrder = (orderRow as any)?.order_type === "pickup" || orderData.delivery_method === "pickup";

  const deliveryDisplayName = isPickupOrder
    ? "In-Person Pickup"
    : orderData.delivery_method?.toLowerCase().includes('locker')
    ? 'Locker-to-Locker'
    : orderData.delivery_method?.toLowerCase().includes('door') || orderData.delivery_method?.toLowerCase().includes('home')
    ? 'Door-to-Door'
    : orderData.delivery_method || 'Standard Delivery';

  const deliverySubtitle = isPickupOrder
    ? "Coordinate meetup details in chat"
    : (deliveryMeta?.selected_service_name || deliveryMeta?.selected_courier_name)
      ? [deliveryMeta.selected_courier_name, deliveryMeta.selected_service_name].filter(Boolean).join(" � ")
      : null;

  const book = orderData.book as any;

  const firstItem = Array.isArray(orderRow?.items) ? orderRow.items[0] : null;
  const receiptItemTitle = firstItem?.title || firstItem?.name || orderData.book_title;
  const receiptItemType = orderRow?.item_type || (firstItem?.item_type ?? book?.itemType ?? book?.item_type) || "item";
  const receiptCondition = firstItem?.condition || orderData.book_condition || book?.condition || null;
  const receiptQuantity = Number(firstItem?.quantity || 1);

  const itemPrice =
    Number(firstItem?.price ?? orderData.book_price ?? book?.price ?? 0);
  const deliveryFee =
    typeof orderRow?.selected_shipping_cost === "number"
      ? Number(orderRow.selected_shipping_cost) / 100
      : Number(orderData.delivery_price || 0);
  const buyerProtectionFee =
    typeof orderRow?.platform_fee === "number"
      ? Number(orderRow.platform_fee)
      : Number(orderData.platform_fee ?? 20);
  const discountApplied = Number(couponMeta?.discount_applied || orderData.coupon_discount || 0);
  const computedTotal = Math.max(0, itemPrice + deliveryFee + buyerProtectionFee - discountApplied);
  const walletDeducted = orderRow?.wallet_deducted_amount ? Number(orderRow.wallet_deducted_amount) / 100 : 0;
  const totalPaid =
    typeof orderRow?.total_amount === "number" && orderRow.total_amount > 0 && orderRow.total_amount >= Math.max(deliveryFee, itemPrice)
      ? Number(orderRow.total_amount)
      : computedTotal;

  const trackingNumber = isPickupOrder ? null : ((orderRow?.tracking_number as string | null) || null);
  const paymentRef = (orderRow?.payment_reference as string | null) || (orderRow?.paystack_reference as string | null) || orderData.payment_reference || null;
  const commitDeadline = (orderRow?.commit_deadline as string | null) || null;

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  // ── PDF Generation ──────────────────────────────────────────
  const generateReceiptPdfBase64 = async () => {
    if (!receiptRef.current) {
      toast.error("Receipt element not found");
      return null;
    }
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 800,
      });

      const imgData = canvas.toDataURL("image/png");
      
      // Calculate dimensions in points (pt) to fit exactly on a single page
      const pdfWidth = 480;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const dataUri = pdf.output("datauristring");
      const base64 = String(dataUri).split("base64,")[1] || null;
      return base64;

      // Save receipt HTML to orders table (fire-and-forget)
      if (receiptRef.current && orderData.order_id) {
        const receiptHtml = receiptRef.current.innerHTML;
        supabase
          .from('orders')
          .update({ receipt_html: receiptHtml } as any)
          .eq('id', orderData.id)
          .then(({ error }: { error: any }) => {
            if (error) console.error('[Step4] Failed to save receipt HTML:', error);
          });
      }
    } catch (err) {
      console.error("[Step4] PDF generation error:", err);
      toast.error("Failed to generate PDF receipt");
      return null;
    }
  };

  const downloadReceipt = async () => {
    setIsDownloading(true);
    try {
      const base64 = await generateReceiptPdfBase64();
      if (!base64) return;
      const pdf = new jsPDF();
      // re-generate as blob for download using the base64 we already built
      // (keeps logic simple and reliable)
      const byteString = atob(base64);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${orderData.order_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Receipt PDF downloaded!");
    } finally {
      setIsDownloading(false);
    }
  };

  // Receipt emailing is handled server-side in the payment webhook to avoid duplicates.

  return (
    <div className="max-w-md mx-auto space-y-6 px-3 sm:px-0 py-6">
      {/* Success Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Payment Successful</h1>
        <p className="text-sm text-gray-600">
          Your order has been confirmed and the seller has been notified.
        </p>
      </div>

      {/* Visible/Downloadable Receipt Card */}
      <div
        ref={receiptRef}
        className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
        style={{
          width: "100%",
          maxWidth: "480px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: "#1a1a1a",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "24px 24px 20px 24px", borderBottom: "1px solid #eaeaea" }}>
          <img src="/favicon.webp" alt="logo" style={{ width: "36px", height: "36px", borderRadius: "50%" }} />
          <div style={{ textAlign: "left" }}>
            <h1 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}>ReBooked Solutions</h1>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#888" }}>
              Order Ref: <span style={{ fontFamily: "'SFMono-Regular', Consolas, monospace", fontSize: "12px" }}>{orderData.order_id}</span>
            </p>
          </div>
          <div style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 600, color: "#1f4e3d", background: "#e8f5ee", padding: "4px 10px", borderRadius: "12px" }}>
            PAID
          </div>
        </div>

        {/* Transaction Section */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", lineHeight: 1.8 }}>
            <span style={{ color: "#888" }}>Date</span>
            <span style={{ color: "#1a1a1a", fontWeight: 500, textAlign: "right" }}>{new Date(orderData.created_at).toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", lineHeight: 1.8 }}>
            <span style={{ color: "#888" }}>Payment Ref</span>
            <span style={{ color: "#1a1a1a", fontWeight: 500, textAlign: "right", fontFamily: "'SFMono-Regular', Consolas, monospace" }}>{paymentRef || orderData.payment_reference || "Pending"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", lineHeight: 1.8 }}>
            <span style={{ color: "#888" }}>Buyer</span>
            <span style={{ color: "#1a1a1a", fontWeight: 500, textAlign: "right" }}>{buyerName} {buyerProfile?.email ? `(${buyerProfile.email})` : ""}</span>
          </div>
        </div>

        {/* Item Section */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0", textAlign: "left" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 2px 0", color: "#1a1a1a" }}>{receiptItemTitle}</div>
          <div style={{ fontSize: "12px", color: "#888", margin: "0 0 12px 0" }}>
            Condition: {receiptCondition || "N/A"}  {"\u2022"}  Qty: {receiptQuantity}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", lineHeight: 1.8 }}>
            <span style={{ color: "#888" }}>Item Price</span>
            <span style={{ color: "#1a1a1a", fontWeight: 500, textAlign: "right" }}>R{Number(itemPrice).toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", lineHeight: 1.8 }}>
            <span style={{ color: "#888" }}>Delivery Fee</span>
            <span style={{ color: "#1a1a1a", fontWeight: 500, textAlign: "right" }}>R{Number(deliveryFee).toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", lineHeight: 1.8 }}>
            <span style={{ color: "#888" }}>Buyer's Protection Fee</span>
            <span style={{ color: "#1a1a1a", fontWeight: 500, textAlign: "right" }}>R{Number(buyerProtectionFee).toFixed(2)}</span>
          </div>
          {discountApplied > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", lineHeight: 1.8 }}>
              <span style={{ color: "#888" }}>Discount {couponMeta?.code ? `(${couponMeta.code})` : ""}</span>
              <span style={{ color: "#16a34a", fontWeight: 500, textAlign: "right" }}>-R{Number(discountApplied).toFixed(2)}</span>
            </div>
          )}
          {walletDeducted > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", lineHeight: 1.8 }}>
              <span style={{ color: "#888" }}>Wallet Deduction</span>
              <span style={{ color: "#1a1a1a", fontWeight: 500, textAlign: "right" }}>-R{Number(walletDeducted).toFixed(2)}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 700, paddingTop: "10px", marginTop: "6px", borderTop: "1px solid #eaeaea" }}>
            <span>Total Paid</span>
            <span>R{Number(totalPaid).toFixed(2)}</span>
          </div>
          {walletDeducted > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 500, color: "#666", marginTop: "4px" }}>
              <span>Paid via Card</span>
              <span>R{Number(Math.max(0, totalPaid - walletDeducted)).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Delivery Details Section */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0", textAlign: "left" }}>
          <div style={{ fontSize: "13px", color: "#888", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>Delivery Details</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", lineHeight: 1.8 }}>
            <span style={{ color: "#888" }}>Method</span>
            <span style={{ color: "#1a1a1a", fontWeight: 500, textAlign: "right" }}>{deliveryDisplayName}</span>
          </div>
          
          {/* Locker Info */}
          {deliveryMeta?.delivery_locker_data && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", lineHeight: 1.8 }}>
              <span style={{ color: "#888" }}>Locker</span>
              <span style={{ color: "#1a1a1a", fontWeight: 500, textAlign: "right", maxWidth: "65%" }}>
                {(deliveryMeta.delivery_locker_data as any)?.name || "Locker"}<br />
                <span style={{ fontSize: "11px", color: "#666" }}>
                  {(deliveryMeta.delivery_locker_data as any)?.full_address || (deliveryMeta.delivery_locker_data as any)?.address || ""}
                </span>
              </span>
            </div>
          )}

          {/* Address Info */}
          {!deliveryMeta?.delivery_locker_data && deliveryAddress && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", lineHeight: 1.8 }}>
              <span style={{ color: "#888" }}>Address</span>
              <span style={{ color: "#1a1a1a", fontWeight: 500, textAlign: "right", maxWidth: "65%" }}>
                {deliveryAddress.street || deliveryAddress.streetAddress || ""}, {deliveryAddress.suburb || ""}, {deliveryAddress.city || ""}, {deliveryAddress.postal_code || deliveryAddress.postalCode || ""}
              </span>
            </div>
          )}

          {!isPickupOrder && trackingNumber && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", lineHeight: 1.8 }}>
              <span style={{ color: "#888" }}>Tracking Number</span>
              <span style={{ color: "#1a1a1a", fontWeight: 500, textAlign: "right", fontFamily: "'SFMono-Regular', Consolas, monospace" }}>{trackingNumber}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "20px 24px", fontSize: "11px", color: "#999" }}>
          <div style={{ fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>ReBooked Solutions</div>
          <div style={{ marginBottom: "4px" }}>support@rebookedsolutions.co.za {"\u00b7"} rebookedsolutions.co.za</div>
          <div>Automated receipt {"\u00b7"} {"\u00a9"} 2026 ReBooked Solutions</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={downloadReceipt}
          disabled={isDownloading}
          variant="outline"
          className="w-full py-3 font-semibold"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </>
          )}
        </Button>
        <Button
          onClick={onContinueShopping}
          className="w-full py-3 text-base font-semibold bg-green-600 hover:bg-green-700"
          size="lg"
        >
          <ShoppingBag className="w-5 h-5 mr-2" />
          Continue Shopping
        </Button>
      </div>

      {/* Support Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-medium mb-1">Need Help?</h3>
          <p className="text-sm text-gray-600">
            Contact us at{" "}
            <a href="mailto:support@rebookedsolutions.co.za" className="text-blue-600 underline">
              support@rebookedsolutions.co.za
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Step4Confirmation;
