import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, BookOpen, ChevronDown, ChevronUp, Package } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface PastOrder {
  id: string;
  order_id: string | null;
  buyer_id: string;
  seller_id: string;
  status: string;
  delivery_status: string | null;
  total_amount: number | null;
  payment_status: string | null;
  refund_status: string | null;
  refunded_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  decline_reason: string | null;
  declined_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  receipt_html?: string | null;
  buyer_full_name?: string | null;
  seller_full_name?: string | null;
  buyer_email?: string | null;
  seller_email?: string | null;
  tracking_number?: string | null;
  selected_courier_name?: string | null;
  selected_service_name?: string | null;
  payment_reference?: string | null;
  committed_at?: string | null;
  selected_shipping_cost?: number | null;
  platform_fee?: number | null;
  delivery_type?: string | null;
  items?: any;
  book_id?: string | null;
  item_id?: string | null;
  item_type?: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  delivered: "bg-green-100 text-green-700 border-green-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  declined: "bg-amber-100 text-amber-700 border-amber-200",
  refunded: "bg-purple-100 text-purple-700 border-purple-200",
  pending: "bg-blue-100 text-blue-700 border-blue-200",
  committed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  in_transit: "bg-yellow-100 text-yellow-700 border-yellow-200",
  confirmed: "bg-teal-100 text-teal-700 border-teal-200",
  paid: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

const formatCurrency = (amount?: number | null) =>
  typeof amount === "number" ? `R${amount.toFixed(2)}` : "R0.00";

const PastOrdersActivity: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [itemImages, setItemImages] = useState<Record<string, string>>({});

  const getUserRole = (order: PastOrder) => user?.id === order.buyer_id ? "buyer" : "seller";

  const fetchPastOrders = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `id, order_id, buyer_id, seller_id, status, delivery_status, total_amount, payment_status,
           refund_status, refunded_at, cancelled_at, cancellation_reason, decline_reason, declined_at,
           created_at, updated_at, receipt_html, buyer_full_name, seller_full_name, buyer_email, seller_email,
           tracking_number, selected_courier_name, selected_service_name, payment_reference,
           committed_at, selected_shipping_cost, delivery_type,
           items, book_id, item_id, item_type`
        )
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      const list = (data as PastOrder[]) || [];
      setOrders(list);

      // Fetch item images per order
      const imgMap: Record<string, string> = {};
      await Promise.all(
        list.map(async (o) => {
          const itemId = o.book_id || o.item_id;
          if (!itemId) return;
          const itemType = (o.item_type || "book").toLowerCase();
          const tableMap: Record<string, string> = {
            book: "books",
            textbook: "books",
            uniform: "uniforms",
            school_supply: "school_supplies",
          };
          const table = tableMap[itemType] || "books";
          try {
            const cols = table === "books" ? "front_cover, image_url" : "image_url";
            const { data: row } = await supabase.from(table).select(cols).eq("id", itemId).maybeSingle();
            const img = (row as any)?.front_cover || (row as any)?.image_url || "";
            if (img) imgMap[o.id] = img;
          } catch { /* noop */ }
        })
      );
      setItemImages(imgMap);
    } catch (err: any) {
      console.error("Failed to load past orders", err);
      toast.error(err?.message || "Could not load past orders. Please refresh.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPastOrders();
  }, [fetchPastOrders]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const itemsSummary = (order: PastOrder) => {
    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) return "Order details";
    const titles = items.map((i: any) => i.title || i.name || i.book_title).filter(Boolean);
    if (titles.length === 0) return `${items.length} item(s)`;
    return titles.length > 1 ? `${titles[0]} + ${titles.length - 1} more` : titles[0];
  };

  const buildReceiptHtml = (order: PastOrder) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const itemRows = items.length > 0
      ? items.map((i: any) => `
          <tr>
            <td style="padding:6px 0;">${i.title || i.name || i.book_title || "Item"}</td>
            <td style="padding:6px 0;text-align:right;">${formatCurrency(Number(i.price ?? i.amount ?? 0))}</td>
          </tr>`).join("")
      : `<tr><td style="padding:6px 0;">${itemsSummary(order)}</td><td style="padding:6px 0;text-align:right;">${formatCurrency(order.total_amount || 0)}</td></tr>`;

    const isSeller = getUserRole(order) === "seller";
    const subtotal = items.reduce((sum: number, i: any) => sum + Number(i.price ?? i.amount ?? 0), 0);
    const bookPrice = subtotal > 0 ? subtotal : Math.max(0, Number(order.total_amount ?? 0) - Number(order.selected_shipping_cost ?? 0) - 20);
    const commission = bookPrice * 0.1;
    const payout = bookPrice * 0.9;
    const created = order.created_at ? new Date(order.created_at).toLocaleDateString() : "";

    return `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #1f4e3d; background:#ffffff; width: 800px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2d8f58, #3ab26f); padding: 28px 36px; border-radius: 12px 12px 0 0; text-align: left; color: white; margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
            <div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.2px;">ReBooked Solutions</h1>
              <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.92;">${isSeller ? "Sales & Payout Summary" : "Order receipt"}</p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; opacity: 0.9; letter-spacing: 0.5px; text-transform: uppercase;">Status</div>
              <div style="margin-top: 4px; display: inline-block; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.25); padding: 6px 10px; border-radius: 999px; font-weight: 800; font-size: 12px; text-transform: capitalize;">${order.status}</div>
            </div>
          </div>
        </div>

        <!-- Meta -->
        <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; gap: 10px;">
              <span style="color: #6b7280; font-weight: 700;">Order</span>
              <span style="font-family: monospace; font-weight: 800; color: #111827;">${order.order_id || order.id.slice(-8)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 10px;">
              <span style="color: #6b7280; font-weight: 700;">Date</span>
              <span style="color: #111827;">${created}</span>
            </div>
            ${order.payment_reference ? `<div style="display: flex; justify-content: space-between; gap: 10px;">
              <span style="color: #6b7280; font-weight: 700;">Payment Ref</span>
              <span style="font-family: monospace; color: #111827;">${order.payment_reference}</span>
            </div>` : ""}
            ${order.tracking_number ? `<div style="display: flex; justify-content: space-between; gap: 10px;">
              <span style="color: #6b7280; font-weight: 700;">Tracking</span>
              <span style="color: #111827; font-weight: 700;">${order.tracking_number}</span>
            </div>` : ""}
          </div>
        </div>

        <!-- Items -->
        <div style="border: 1px solid #d1fae5; background: #f0fdf4; border-radius: 12px; padding: 16px; margin-bottom: 14px;">
          <div style="font-size: 11px; color: #166534; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px;">Items</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; font-size: 12px;">
            ${items.map((i: any) => `
              <div style="display: flex; justify-content: space-between; gap: 10px;">
                <span style="color: #0f172a; font-weight: 700;">${i.title || i.name || i.book_title || "Item"}</span>
                <span style="color: #16a34a; font-weight: 700; text-align: right;">${formatCurrency(Number(i.price ?? i.amount ?? 0))}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Buyer & Seller -->
        <div style="border: 1px solid #e5e7eb; background: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 14px;">
          <div style="font-size: 11px; color: #374151; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px;">Buyer & Seller</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; gap: 10px;">
              <span style="color: #6b7280; font-weight: 700;">Buyer</span>
              <span style="color: #111827; font-weight: 700; text-align: right;">${order.buyer_full_name || order.buyer_email || "Buyer"}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 10px;">
              <span style="color: #6b7280; font-weight: 700;">Seller</span>
              <span style="color: #111827; font-weight: 700; text-align: right;">${order.seller_full_name || order.seller_email || "Seller"}</span>
            </div>
          </div>
        </div>

        <!-- Delivery -->
        ${order.selected_courier_name || order.tracking_number ? `
        <div style="border: 1px solid #e5e7eb; background: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 14px;">
          <div style="font-size: 11px; color: #374151; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px;">Delivery</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; font-size: 12px;">
            ${order.selected_courier_name ? `<div style="display: flex; justify-content: space-between; gap: 10px;">
              <span style="color: #6b7280; font-weight: 700;">Courier</span>
              <span style="color: #111827; font-weight: 700; text-align: right;">${order.selected_courier_name}</span>
            </div>` : ""}
            ${order.selected_service_name ? `<div style="display: flex; justify-content: space-between; gap: 10px;">
              <span style="color: #6b7280; font-weight: 700;">Service</span>
              <span style="color: #111827; font-weight: 700; text-align: right;">${order.selected_service_name}</span>
            </div>` : ""}
            ${order.tracking_number ? `<div style="display: flex; justify-content: space-between; gap: 10px; grid-column: 1 / -1;">
              <span style="color: #6b7280; font-weight: 700;">Tracking Number</span>
              <span style="color: #111827; font-weight: 700; text-align: right; font-family: monospace; font-size: 11px;">${order.tracking_number}</span>
            </div>` : ""}
          </div>
        </div>
        ` : ""}

        <!-- Pricing -->
        <div style="border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <div style="font-size: 11px; color: #166534; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px;">Pricing</div>
          <div style="font-size: 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              ${isSeller ? `
              <tr>
                <td style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #dcfce7;">
                  <span style="color: #166534; font-weight: 700;">Book Price</span>
                  <span style="color: #0f172a; font-weight: 800;">${formatCurrency(bookPrice)}</span>
                </td>
              </tr>
              <tr>
                <td style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #dcfce7;">
                  <span style="color: #b91c1c; font-weight: 700;">Commission Fee (10%)</span>
                  <span style="color: #b91c1c; font-weight: 800;">-${formatCurrency(commission)}</span>
                </td>
              </tr>
              <tr>
                <td style="display: flex; justify-content: space-between; padding: 6px 0;">
                  <span style="color: #0f172a; font-weight: 900; font-size: 14px;">Estimated Payout (90%)</span>
                  <span style="color: #16a34a; font-weight: 900; font-size: 16px;">${formatCurrency(payout)}</span>
                </td>
              </tr>
              ` : `
              <tr>
                <td style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #dcfce7;">
                  <span style="color: #166534; font-weight: 700;">Subtotal</span>
                  <span style="color: #0f172a; font-weight: 800;">${formatCurrency(bookPrice)}</span>
                </td>
              </tr>
              <tr>
                <td style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #dcfce7;">
                  <span style="color: #166534; font-weight: 700;">Platform Fee</span>
                  <span style="color: #0f172a; font-weight: 800;">R20.00</span>
                </td>
              </tr>
              ${order.selected_shipping_cost ? `
              <tr>
                <td style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #dcfce7;">
                  <span style="color: #166534; font-weight: 700;">Shipping</span>
                  <span style="color: #0f172a; font-weight: 800;">${formatCurrency(order.selected_shipping_cost)}</span>
                </td>
              </tr>
              ` : ""}
              <tr>
                <td style="display: flex; justify-content: space-between; padding: 6px 0;">
                  <span style="color: #0f172a; font-weight: 900; font-size: 14px;">Total Paid</span>
                  <span style="color: #16a34a; font-weight: 900; font-size: 16px;">${formatCurrency(order.total_amount || 0)}</span>
                </td>
              </tr>
              `}
            </table>
          </div>
        </div>

        ${order.refund_status === "refunded" || order.status === "refunded" ? `<div style="margin-bottom:14px; padding:12px; background:#faf5ff; border:1px solid #e9d5ff; border-radius:8px; color:#6b21a8; font-size: 12px; font-weight: 600;">Refund processed${order.refunded_at ? ` on ${new Date(order.refunded_at).toLocaleString()}` : ""}.</div>` : ""}
        ${order.cancellation_reason ? `<div style="margin-bottom:14px; padding:12px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; color:#991b1b; font-size: 12px; font-weight: 600;">Cancelled: ${order.cancellation_reason}</div>` : ""}
        ${order.decline_reason ? `<div style="margin-bottom:14px; padding:12px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; color:#92400e; font-size: 12px; font-weight: 600;">Declined: ${order.decline_reason}</div>` : ""}

        <!-- Footer -->
        <div style="text-align: center; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280;">
          <div style="font-weight: 900; color: #16a34a; margin-bottom: 4px;">ReBooked Solutions</div>
          <div>support@rebookedsolutions.co.za</div>
          <div style="margin-top: 6px;">© ${new Date().getFullYear()} All rights reserved</div>
        </div>
      </div>`;
  };

  const downloadReceipt = async (order: PastOrder) => {
    setDownloadingId(order.id);
    try {
      const html = order.receipt_html || buildReceiptHtml(order);
      const temp = document.createElement("div");
      temp.style.position = "fixed";
      temp.style.left = "-9999px";
      temp.style.top = "0";
      temp.style.width = "800px";
      temp.innerHTML = html;
      document.body.appendChild(temp);

      const canvas = await html2canvas(temp, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      pdf.save(`receipt-${order.order_id || order.id}.pdf`);
      document.body.removeChild(temp);
      toast.success("Receipt downloaded");
    } catch (err: any) {
      console.error("Receipt download failed", err);
      toast.error("Could not download receipt. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-book-500" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="border-book-200 bg-book-50">
        <CardContent className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-book-400 mb-4" />
          <p className="text-book-700 font-medium">No past items yet</p>
          <p className="text-book-500 text-sm mt-1">Your past orders and sales will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isOpen = expanded.has(order.id);
        const items = Array.isArray(order.items) ? order.items : [];
        const subtotal = items.reduce((sum: number, i: any) => sum + Number(i.price ?? i.amount ?? 0), 0);
        const badgeClass = STATUS_BADGE[order.status] || "bg-book-100 text-book-700 border-book-200";
        const dateLabel = order.updated_at ? new Date(order.updated_at).toLocaleDateString() : "";

        return (
          <Card key={order.id} className="border-book-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggle(order.id)}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  {isOpen ? <ChevronUp className="h-4 w-4 text-book-600 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-book-600 flex-shrink-0" />}
                  <img
                    src={itemImages[order.id] || "/placeholder.svg"}
                    alt={itemsSummary(order)}
                    className="w-11 h-11 rounded-lg object-cover bg-book-100 border border-book-200 flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                  <span className="text-book-900 truncate text-base">{itemsSummary(order)}</span>
                </button>
                <Badge className={`capitalize border ${badgeClass} flex-shrink-0`}>{order.status.replace(/_/g, " ")}</Badge>
              </CardTitle>
              <p className="text-xs text-book-500 ml-[3.75rem]">Order #{order.order_id || order.id.slice(-8)} • {dateLabel}</p>
            </CardHeader>

            {isOpen && (
              <CardContent className="space-y-4">
                {/* Order Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-book-700 bg-gray-50 rounded-lg p-3">
                  <div>
                    <p className="text-book-500 text-xs uppercase tracking-wide">Order ID</p>
                    <p className="font-mono font-semibold">{order.order_id || order.id.slice(-8)}</p>
                  </div>
                  <div>
                    <p className="text-book-500 text-xs uppercase tracking-wide">Order Date</p>
                    <p>{order.created_at ? new Date(order.created_at).toLocaleDateString() : "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-book-500 text-xs uppercase tracking-wide">{getUserRole(order) === "seller" ? "Seller Payout (Est.)" : "Total Paid"}</p>
                    <p className="font-semibold text-green-700">
                      {getUserRole(order) === "seller"
                        ? formatCurrency((subtotal > 0 ? subtotal : Math.max(0, Number(order.total_amount ?? 0) - Number(order.selected_shipping_cost ?? 0) - 20)) * 0.9)
                        : formatCurrency(order.total_amount || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-book-500 text-xs uppercase tracking-wide">Payment Status</p>
                    <p className="capitalize font-medium">{order.payment_status || "Unknown"}</p>
                  </div>
                  {order.payment_reference && (
                    <div className="md:col-span-2">
                      <p className="text-book-500 text-xs uppercase tracking-wide">Payment Reference</p>
                      <p className="font-mono text-xs text-gray-600">{order.payment_reference}</p>
                    </div>
                  )}
                </div>

                {/* Buyer & Seller Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-book-500 text-xs uppercase tracking-wide font-semibold mb-2">Buyer</p>
                    <p className="text-sm font-medium">{order.buyer_full_name || "Buyer"}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <p className="text-book-500 text-xs uppercase tracking-wide font-semibold mb-2">Seller</p>
                    <p className="text-sm font-medium">{order.seller_full_name || "Seller"}</p>
                  </div>
                </div>

                {/* Items */}
                {items.length > 0 && (
                  <div className="border-t border-book-100 pt-3">
                    <p className="text-book-500 text-xs uppercase tracking-wide font-semibold mb-2">Items</p>
                    <ul className="space-y-2">
                      {items.map((it: any, idx: number) => (
                        <li key={idx} className="bg-book-50 rounded p-2 border border-book-100">
                          <div className="flex items-center justify-between">
                            <span className="text-book-800 font-medium text-sm">{it.title || it.name || it.book_title || "Item"}</span>
                            <span className="text-green-700 font-semibold text-sm flex-shrink-0">{formatCurrency(Number(it.price ?? it.amount ?? 0))}</span>
                          </div>
                          {it.condition && <p className="text-xs text-gray-600 mt-1">Condition: {it.condition}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Delivery Info */}
                {(order.tracking_number || order.selected_courier_name || order.selected_service_name) && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-book-500 text-xs uppercase tracking-wide font-semibold mb-2">Delivery Details</p>
                    <div className="space-y-2 text-sm">
                      {order.selected_courier_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Courier</span>
                          <span className="font-medium">{order.selected_courier_name}</span>
                        </div>
                      )}
                      {order.selected_service_name && (
                        <div className="flex justify-between">
                          <span className="font-medium">{order.selected_service_name}</span>
                        </div>
                      )}
                      {order.tracking_number && (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-gray-600">Tracking #</span>
                          <span className="font-mono text-xs text-right break-all">{order.tracking_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {order.cancellation_reason && (
                  <div className="md:col-span-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs">
                    <p className="font-semibold mb-1">Cancelled</p>
                    <p>{order.cancellation_reason}</p>
                  </div>
                )}
                {order.decline_reason && (
                  <div className="md:col-span-2 p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-xs">
                    <p className="font-semibold mb-1">Declined</p>
                    <p>{order.decline_reason}</p>
                  </div>
                )}
                {(order.refund_status === "refunded" || order.status === "refunded") && (
                  <div className="md:col-span-2 p-3 rounded-lg bg-purple-50 border border-purple-100 text-purple-700 text-xs">
                    <p className="font-semibold mb-1">Refunded</p>
                    <p>{order.refunded_at ? `on ${new Date(order.refunded_at).toLocaleString()}` : "Refund processed"}</p>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-book-100">
                  <Button
                    onClick={() => downloadReceipt(order)}
                    disabled={downloadingId === order.id}
                    size="sm"
                    className="bg-book-600 hover:bg-book-700"
                  >
                    {downloadingId === order.id ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Preparing…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Download className="h-4 w-4" /> Download Receipt
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default PastOrdersActivity;
