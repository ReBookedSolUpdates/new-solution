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
    let cancelled = false;
    const fetchDelivery = async () => {
      try {
        if (!orderData?.id) return;

        const { data } = await supabase
          .from("orders")
          .select("id, order_id, item_type, items, amount, total_amount, selected_shipping_cost, platform_fee, selected_courier_name, selected_service_name, delivery_type, delivery_locker_data, tracking_number, commit_deadline, payment_reference, paystack_reference")
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
        const type = (data as any)?.delivery_type || orderData.delivery_method;
        const isDoor = String(type || "").toLowerCase().includes("door") || String(type || "").toLowerCase().includes("home");
        if (isDoor) {
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

  const deliveryDisplayName = orderData.delivery_method?.toLowerCase().includes('locker')
    ? 'Locker-to-Locker'
    : orderData.delivery_method?.toLowerCase().includes('door') || orderData.delivery_method?.toLowerCase().includes('home')
    ? 'Door-to-Door'
    : orderData.delivery_method || 'Standard Delivery';

  const deliverySubtitle =
    deliveryMeta?.selected_service_name || deliveryMeta?.selected_courier_name
      ? [deliveryMeta.selected_courier_name, deliveryMeta.selected_service_name].filter(Boolean).join(" • ")
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
  const totalPaid =
    typeof orderRow?.total_amount === "number" && orderRow.total_amount > 0 && orderRow.total_amount >= Math.max(deliveryFee, itemPrice)
      ? Number(orderRow.total_amount)
      : computedTotal;

  const trackingNumber = (orderRow?.tracking_number as string | null) || null;
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
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Handle multi-page if receipt is long
      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }

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
    <div className="max-w-3xl mx-auto space-y-6 px-3 sm:px-0">
      {/* ── Success Header ── */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Payment Successful</h1>
        <p className="text-base sm:text-lg text-gray-600">
          Thank you for your purchase. Your order has been confirmed and the seller has been notified.
        </p>
      </div>

      {/* ── Order Details Card (visible on screen) ── */}
      <Card className="border-l-4 border-l-green-500 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Package className="w-5 h-5 text-green-600" />
            Order Confirmation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Order ID", value: orderData.order_id, mono: true },
              { label: "Ref", value: orderData.payment_reference, mono: true },
              { label: "Date", value: new Date(orderData.created_at).toLocaleDateString() },
              { label: "Status", value: "✅ PAID" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">{item.label}</p>
                <p className={`text-sm font-bold mt-1 truncate ${item.mono ? "font-mono text-xs" : ""}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Item Details */}
          <div>
            <SectionHeader title="Item Details" icon={<Package className="w-4 h-4" />} />
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="font-bold text-base text-gray-900 mb-2">{receiptItemTitle}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Row label="Item Type" value={String(receiptItemType).split("_").join(" ")} />
                <Row label="Condition" value={receiptCondition} />
                <Row label="Quantity" value={receiptQuantity} />
                <Row label="Author" value={orderData.book_author} />
                <Row label="Category" value={book?.category} />
                <Row label="ISBN" value={book?.isbn} />
                <Row label="Publisher" value={book?.publisher} />
                <Row label="Language" value={book?.language} />
                <Row label="Curriculum" value={book?.curriculum} />
                <Row label="Grade / Year" value={book?.grade || book?.universityYear} />
                <Row label="School Name" value={book?.school_name} />
                <Row label="Gender" value={book?.gender} />
                <Row label="Size" value={book?.size} />
                <Row label="Color" value={book?.color} />
                <Row label="Subject" value={book?.subject} />
                <Row label="Item Type" value={book?.itemType || book?.item_type} />
                <Row label="Province" value={book?.province} />
                <Row label="Item ID" value={orderData.book_id} />
              </div>
              {orderData.book_description && (
                <p className="text-xs text-gray-600 mt-3 border-t border-blue-200 pt-3 leading-relaxed">
                  <span className="font-bold text-gray-500 uppercase block mb-1">Description:</span>
                  {orderData.book_description}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between">
                <span className="text-sm font-semibold text-gray-700 uppercase">Item Amount</span>
                <span className="text-base font-bold text-green-600">R{Number(itemPrice).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Seller Info */}
          <div>
            <SectionHeader title="Seller Information" icon={<User className="w-4 h-4" />} />
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              {orderData.seller_name && (
                <p className="font-semibold text-gray-900 mb-2">{orderData.seller_name}</p>
              )}
              <p className="text-xs text-gray-500">Seller ID: <span className="font-mono">{orderData.seller_id}</span></p>
              <p className="text-sm text-gray-600 mt-2">
                The seller has been notified and will prepare your item for shipment.
              </p>
            </div>
          </div>

          {/* Buyer Info */}
          <div>
            <SectionHeader title="Buyer Information" icon={<User className="w-4 h-4" />} />
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="space-y-0">
                <Row label="Name" value={buyerName || undefined} />
                <Row label="Email" value={buyerProfile?.email || undefined} />
                <Row label="Phone" value={buyerProfile?.phone_number || undefined} />
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div>
            <SectionHeader title="Delivery" icon={<Truck className="w-4 h-4" />} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{deliveryDisplayName}</p>
                    {deliverySubtitle && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{deliverySubtitle}</p>
                    )}
                    {!deliverySubtitle && (
                      <p className="text-xs text-gray-500 mt-1">
                        You’ll receive tracking info once shipped
                      </p>
                    )}
                  </div>
                  <span className="text-base font-bold text-gray-800 whitespace-nowrap">
                    R{Number(deliveryFee).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <MapPin className="w-4 h-4 text-book-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">Delivery address</p>

                    {/* Locker delivery */}
                    {deliveryMeta?.delivery_locker_data && (
                      <div className="mt-1 text-sm text-gray-700">
                        <p className="font-medium text-gray-900 truncate">
                          {(deliveryMeta.delivery_locker_data as any)?.name || "Locker"}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {(deliveryMeta.delivery_locker_data as any)?.full_address ||
                            (deliveryMeta.delivery_locker_data as any)?.address ||
                            (deliveryMeta.delivery_locker_data as any)?.street ||
                            ""}
                        </p>
                      </div>
                    )}

                    {/* Door delivery */}
                    {!deliveryMeta?.delivery_locker_data && deliveryAddress && (
                      <div className="mt-1 text-sm text-gray-700">
                        <p className="text-sm text-gray-900 font-medium truncate">
                          {deliveryAddress.street || deliveryAddress.streetAddress || ""}
                        </p>
                        <p className="text-xs text-gray-600">
                          {[deliveryAddress.suburb, deliveryAddress.city].filter(Boolean).join(", ")}
                        </p>
                        <p className="text-xs text-gray-600">
                          {[deliveryAddress.province, deliveryAddress.postal_code || deliveryAddress.postalCode].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                    )}

                    {/* Fallback */}
                    {!deliveryMeta?.delivery_locker_data && !deliveryAddress && (
                      <p className="mt-1 text-xs text-gray-500">
                        We’ll show your delivery address here once it’s available.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Row label="Courier" value={deliveryMeta?.selected_courier_name || null} />
                <Row label="Service" value={deliveryMeta?.selected_service_name || null} />
                <Row
                  label="Delivery Type"
                  value={
                    orderRow?.delivery_type
                      ? String(orderRow.delivery_type).toLowerCase() === "locker"
                        ? "Locker-to-Locker"
                        : "Door-to-Door"
                      : deliveryDisplayName
                  }
                />
                <Row label="Tracking Number" value={trackingNumber || "Pending"} />
                <Row label="Commit Deadline" value={formatDateTime(commitDeadline)} />
                <Row label="Payment Reference" value={paymentRef || "Pending"} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Price Breakdown */}
          <div>
            <SectionHeader title="Price Breakdown" icon={<CreditCard className="w-4 h-4" />} />
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Item Price</span>
                <span>R{Number(itemPrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span>R{Number(deliveryFee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Buyer's Protection Fee</span>
                <span>R{Number(buyerProtectionFee).toFixed(2)}</span>
              </div>
              {discountApplied > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Coupon / Discount {couponMeta?.code ? `(${couponMeta.code})` : ""}</span>
                  <span>-R{Number(discountApplied).toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total Paid</span>
                <span className="text-green-600">R{Number(totalPaid).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-800">PAID — Payment Completed Successfully</p>
              <p className="text-xs text-green-700">
                {new Date(orderData.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Next Steps ── */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-blue-500" />
            <span>Confirmation email sent to your registered email address</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Package className="w-4 h-4 text-orange-500" />
            <span>Seller will be notified to prepare your item for shipment</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Truck className="w-4 h-4 text-green-500" />
            <span>You'll receive tracking information via email once shipped</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Action Buttons ── */}
      <div className="space-y-3 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={downloadReceipt}
            disabled={isDownloading}
            variant="outline"
            className="py-3 font-semibold"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Receipt (PDF)
              </>
            )}
          </Button>
          <Button onClick={onViewOrders} variant="outline" className="py-3 font-semibold">
            <Eye className="w-4 h-4 mr-2" />
            View My Orders
          </Button>
        </div>

        <Button
          onClick={onContinueShopping}
          className="w-full py-3 text-base font-semibold bg-green-600 hover:bg-green-700"
          size="lg"
        >
          <ShoppingBag className="w-5 h-5 mr-2" />
          Continue Shopping
        </Button>
      </div>

      {/* ── Support Info ── */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-medium mb-2">Need Help?</h3>
          <p className="text-sm text-gray-600">
            Contact us at{" "}
            <a href="mailto:support@rebookedsolutions.co.za" className="text-blue-600 underline">
              support@rebookedsolutions.co.za
            </a>{" "}
            or check your order status in <strong>My Orders</strong>.
          </p>
        </CardContent>
      </Card>

      {/* ── Hidden Receipt Div for PDF Generation ── */}
      <div
        ref={receiptRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          width: "800px",
          padding: "40px",
          fontFamily: "Arial, sans-serif",
          color: "#1f4e3d",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Receipt Header */}
        <div style={{ background: "linear-gradient(135deg, #2d8f58, #3ab26f)", padding: "28px 36px", borderRadius: "12px 12px 0 0", textAlign: "left", color: "white", marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, letterSpacing: "0.2px" }}>ReBooked Solutions</h1>
              <p style={{ margin: "6px 0 0", fontSize: "14px", opacity: 0.92 }}>Purchase receipt</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", opacity: 0.9, letterSpacing: "0.5px", textTransform: "uppercase" }}>Status</div>
              <div style={{ marginTop: "4px", display: "inline-block", background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.25)", padding: "6px 10px", borderRadius: "999px", fontWeight: 800, fontSize: "12px" }}>
                PAID
              </div>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 18px", fontSize: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ color: "#6b7280", fontWeight: 700 }}>Order</span>
              <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#111827" }}>{orderData.order_id}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ color: "#6b7280", fontWeight: 700 }}>Payment Ref</span>
              <span style={{ fontFamily: "monospace", color: "#111827" }}>{paymentRef || orderData.payment_reference || "Pending"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ color: "#6b7280", fontWeight: 700 }}>Date</span>
              <span style={{ color: "#111827" }}>{new Date(orderData.created_at).toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ color: "#6b7280", fontWeight: 700 }}>Tracking</span>
              <span style={{ color: "#111827", fontWeight: 700 }}>{trackingNumber || "Pending"}</span>
            </div>
            {commitDeadline && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", gridColumn: "1 / -1" }}>
                <span style={{ color: "#6b7280", fontWeight: 700 }}>Commit Deadline</span>
                <span style={{ color: "#111827", fontWeight: 700 }}>{formatDateTime(commitDeadline)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Item */}
        <div style={{ border: "1px solid #d1fae5", background: "#f0fdf4", borderRadius: "12px", padding: "16px", marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "10px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", color: "#166534", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px" }}>Item</div>
              <div style={{ marginTop: "4px", fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>{receiptItemTitle}</div>
              {orderData.book_author && (
                <div style={{ marginTop: "4px", fontSize: "12px", color: "#334155" }}>by {orderData.book_author}</div>
              )}
            </div>
            <div style={{ textAlign: "right", minWidth: "160px" }}>
              <div style={{ fontSize: "11px", color: "#166534", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px" }}>Item amount</div>
              <div style={{ marginTop: "4px", fontSize: "18px", fontWeight: 900, color: "#16a34a" }}>R{Number(itemPrice).toFixed(2)}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 18px", fontSize: "12px" }}>
            {[
              ["Item Type", String(receiptItemType).split("_").join(" ")],
              ["Condition", receiptCondition],
              ["Quantity", String(receiptQuantity)],
              ["Province", book?.province],
              ["Category", book?.category],
              ["ISBN", book?.isbn],
              ["Grade / Year", book?.grade || book?.universityYear],
              ["School Name", book?.school_name],
              ["Size", book?.size],
              ["Color", book?.color],
              ["Gender", book?.gender],
              ["Subject", book?.subject],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ color: "#6b7280", fontWeight: 700 }}>{label}</span>
                <span style={{ color: "#111827", fontWeight: 700, textAlign: "right" }}>{String(val)}</span>
              </div>
            ))}
          </div>

          {orderData.book_description && (
            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Description</div>
              <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.5 }}>{orderData.book_description}</div>
            </div>
          )}
        </div>

        {/* Buyer */}
        <div style={{ border: "1px solid #e5e7eb", background: "#ffffff", borderRadius: "12px", padding: "16px", marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: "#374151", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>Buyer</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 18px", fontSize: "12px" }}>
            {[
              ["Name", buyerName],
              ["Email", buyerProfile?.email],
              ["Phone", buyerProfile?.phone_number],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ color: "#6b7280", fontWeight: 700 }}>{label}</span>
                <span style={{ color: "#111827", fontWeight: 700, textAlign: "right" }}>{String(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery */}
        <div style={{ border: "1px solid #e5e7eb", background: "#ffffff", borderRadius: "12px", padding: "16px", marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: "#374151", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>Delivery</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 18px", fontSize: "12px" }}>
            {[
              ["Delivery Method", deliveryDisplayName],
              ["Delivery Type", orderRow?.delivery_type ? (String(orderRow.delivery_type).toLowerCase() === "locker" ? "Locker-to-Locker" : "Door-to-Door") : deliveryDisplayName],
              ["Courier", deliveryMeta?.selected_courier_name],
              ["Service", deliveryMeta?.selected_service_name],
              ["Tracking Number", trackingNumber || "Pending"],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ color: "#6b7280", fontWeight: 700 }}>{label}</span>
                <span style={{ color: "#111827", fontWeight: 700, textAlign: "right" }}>{String(val)}</span>
              </div>
            ))}
          </div>
          {orderRow?.delivery_type && String(orderRow.delivery_type).toLowerCase() === "locker" && deliveryMeta?.delivery_locker_data && (
            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "6px" }}>Locker</div>
              <div style={{ fontSize: "12px", color: "#111827", fontWeight: 800 }}>
                {(deliveryMeta.delivery_locker_data as any)?.name || "Locker"}
              </div>
              <div style={{ marginTop: "2px", fontSize: "12px", color: "#334155", lineHeight: 1.4 }}>
                {(deliveryMeta.delivery_locker_data as any)?.full_address || (deliveryMeta.delivery_locker_data as any)?.address || ""}
              </div>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: "#166534", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>Pricing</div>
          <div style={{ fontSize: "12px" }}>
            {[
              ["Item Price", `R${Number(itemPrice).toFixed(2)}`],
              ["Delivery Fee", `R${Number(deliveryFee).toFixed(2)}`],
              ["Buyer's Protection Fee", `R${Number(buyerProtectionFee).toFixed(2)}`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #dcfce7" }}>
                <span style={{ color: "#166534", fontWeight: 700 }}>{label}</span>
                <span style={{ color: "#0f172a", fontWeight: 800 }}>{val}</span>
              </div>
            ))}
            {discountApplied > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #dcfce7" }}>
                <span style={{ color: "#166534", fontWeight: 700 }}>Coupon / Discount{couponMeta?.code ? ` (${couponMeta.code})` : ""}</span>
                <span style={{ color: "#16a34a", fontWeight: 900 }}>-R{Number(discountApplied).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px" }}>
              <span style={{ color: "#0f172a", fontWeight: 900, fontSize: "14px" }}>Total Paid</span>
              <span style={{ color: "#16a34a", fontWeight: 900, fontSize: "16px" }}>R{Number(totalPaid).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: "14px", borderTop: "1px solid #e5e7eb", fontSize: "11px", color: "#6b7280" }}>
          <div style={{ fontWeight: 900, color: "#16a34a", marginBottom: "4px" }}>ReBooked Solutions</div>
          <div>support@rebookedsolutions.co.za • rebookedsolutions.co.za</div>
          <div style={{ marginTop: "6px", color: "#9ca3af" }}>
            Automated receipt • © {new Date().getFullYear()} ReBooked Solutions
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step4Confirmation;
