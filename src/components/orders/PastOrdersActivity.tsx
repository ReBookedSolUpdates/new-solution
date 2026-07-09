import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, BookOpen, ChevronDown, ChevronUp, Package } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { buildPremiumReceiptHtml } from "@/utils/receiptHtmlBuilder";
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
  receipt_pdf_base64?: string | null;
  wallet_deducted_amount?: number | null;
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
           committed_at, selected_shipping_cost, delivery_type, receipt_pdf_base64, wallet_deducted_amount,
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

  const downloadReceipt = async (order: PastOrder) => {
    setDownloadingId(order.id);
    try {
      // If order has the receipt PDF pre-saved in base64, download it instantly
      if (order.receipt_pdf_base64) {
        console.log("[PastOrders] Downloading pre-saved PDF receipt...");
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${order.receipt_pdf_base64}`;
        link.download = `receipt-${order.order_id || order.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Receipt downloaded");
        return;
      }

      console.log("[PastOrders] Generating receipt PDF dynamically...");
      const isSeller = getUserRole(order) === "seller";
      const html = buildPremiumReceiptHtml(order as any, isSeller);
      
      const temp = document.createElement("div");
      temp.style.position = "fixed";
      temp.style.left = "-9999px";
      temp.style.top = "0";
      temp.style.width = "480px";
      temp.innerHTML = html;
      document.body.appendChild(temp);

      const canvas = await html2canvas(temp, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      
      const pdfWidth = 480;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
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
