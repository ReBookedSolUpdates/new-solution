import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, BookOpen, Calendar, CheckCircle } from "lucide-react";
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
  created_at: string | null;
  updated_at: string | null;
  receipt_html?: string | null;
  buyer_full_name?: string | null;
  seller_full_name?: string | null;
  buyer_email?: string | null;
  seller_email?: string | null;
  items?: any;
  book_id?: string | null;
  item_id?: string | null;
}

const PastOrdersActivity: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchPastOrders = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `id, order_id, buyer_id, seller_id, status, delivery_status, total_amount, payment_status, created_at, updated_at, receipt_html, buyer_full_name, seller_full_name, buyer_email, seller_email, items, book_id, item_id`
        )
        .or(`buyer_id.eq.${user.id}`)
        .in("status", ["delivered", "completed"])
        .order("updated_at", { ascending: false });

      if (error) {
        throw error;
      }
      setOrders(data || []);
    } catch (error) {
      console.error("Failed to load past orders", error);
      toast.error("Could not load past orders. Please refresh.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPastOrders();
  }, [fetchPastOrders]);

  const formatCurrency = (amount?: number | null) => {
    if (typeof amount !== "number") return "R0.00";
    return `R${amount.toFixed(2)}`;
  };

  const getOrderItemsSummary = (order: PastOrder) => {
    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) {
      return order.book_id || order.item_id ? "Order details available" : "No items recorded";
    }
    const titles = items
      .filter((item: any) => item.title || item.name)
      .map((item: any) => item.title || item.name);
    if (titles.length === 0) return `${items.length} item(s)`;
    const first = titles[0];
    return titles.length > 1 ? `${first} + ${titles.length - 1} more` : first;
  };

  const createReceiptHtml = (order: PastOrder) => {
    const title = order.items && Array.isArray(order.items) && order.items.length > 0
      ? getOrderItemsSummary(order)
      : "Purchased items";
    const total = formatCurrency(order.total_amount || 0);
    const status = order.status.replace(/_/g, " ");
    const date = order.updated_at ? new Date(order.updated_at).toLocaleString() : "Unknown date";
    const buyerName = order.buyer_full_name || "Buyer";
    const sellerName = order.seller_full_name || "Seller";

    return `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1f2937;">
        <div style="max-width: 640px; margin: auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: #10b981; color: white; padding: 24px; text-align: center;">
            <h1 style="margin:0; font-size:24px;">ReBooked Solutions Receipt</h1>
          </div>
          <div style="padding: 24px;">
            <p style="margin:0 0 12px;">Order ID: <strong>${order.order_id || order.id}</strong></p>
            <p style="margin:0 0 12px;">Status: <strong>${status}</strong></p>
            <p style="margin:0 0 12px;">Delivered: <strong>${date}</strong></p>
            <p style="margin:0 0 12px;">Buyer: <strong>${buyerName}</strong></p>
            <p style="margin:0 0 24px;">Seller: <strong>${sellerName}</strong></p>
            <div style="padding: 16px; background: #f3f4f6; border-radius: 10px;">
              <h2 style="margin:0 0 12px; font-size:18px;">Order summary</h2>
              <p style="margin:0 0 8px;">${title}</p>
              <p style="margin:0; font-weight: 700;">Total Paid: ${total}</p>
            </div>
            <p style="margin:24px 0 0; font-size:12px; color:#6b7280;">This is an official receipt from ReBooked Solutions.</p>
          </div>
        </div>
      </div>
    `;
  };

  const downloadReceipt = async (order: PastOrder) => {
    setIsDownloading(true);
    try {
      const html = order.receipt_html || createReceiptHtml(order);
      const temp = document.createElement("div");
      temp.style.position = "fixed";
      temp.style.left = "-9999px";
      temp.style.width = "800px";
      temp.innerHTML = html;
      document.body.appendChild(temp);

      const canvas = await html2canvas(temp, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      const filename = `receipt-${order.order_id || order.id}.pdf`;
      pdf.save(filename);
      toast.success("Receipt downloaded");
      document.body.removeChild(temp);
    } catch (error) {
      console.error("Receipt download failed", error);
      toast.error("Could not download receipt. Please try again.");
    } finally {
      setIsDownloading(false);
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
          <p className="text-book-600">No past orders found yet. Completed orders will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="border-book-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="text-book-900">Order #{order.order_id || order.id.slice(-8)}</span>
              <Badge className="bg-green-100 text-green-700 border-green-200 capitalize">
                {order.status.replace(/_/g, " ")}
              </Badge>
            </CardTitle>
            <p className="text-xs text-book-500">Delivered on {order.updated_at ? new Date(order.updated_at).toLocaleDateString() : "Unknown"}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-book-700">
              <div>
                <p className="text-book-500 text-xs uppercase tracking-wide">Buyer</p>
                <p>{order.buyer_full_name || order.buyer_email || "Buyer"}</p>
              </div>
              <div>
                <p className="text-book-500 text-xs uppercase tracking-wide">Seller</p>
                <p>{order.seller_full_name || order.seller_email || "Seller"}</p>
              </div>
              <div>
                <p className="text-book-500 text-xs uppercase tracking-wide">Items</p>
                <p>{getOrderItemsSummary(order)}</p>
              </div>
              <div>
                <p className="text-book-500 text-xs uppercase tracking-wide">Total Paid</p>
                <p>{formatCurrency(order.total_amount || 0)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-book-500">
                Payment status: <strong>{order.payment_status || "unknown"}</strong>
              </div>
              <Button
                onClick={() => downloadReceipt(order)}
                disabled={isDownloading}
                className="w-full sm:w-auto"
              >
                {isDownloading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Downloading...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Download className="h-4 w-4" /> Download Receipt
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PastOrdersActivity;
