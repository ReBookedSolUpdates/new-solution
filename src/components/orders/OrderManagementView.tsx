import React, { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BookImageCarousel from "@/components/BookImageCarousel";
import { useNavigate } from "react-router-dom";
import { getOrCreateConversation } from "@/services/chatService";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  TruckIcon,
  ShoppingCart,
  DollarSign,
  Calendar,
  Info,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Loader2,
  Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OrderActionsPanel from "./OrderActionsPanel";
import { Order as BaseOrder } from "@/services/orderCancellationService";
import { logError } from "@/utils/errorLogging";
import OrderCompletionCard from "./OrderCompletionCard";
import { buildPremiumReceiptHtml } from "@/utils/receiptHtmlBuilder";

// Extend the base Order shape with additional fields used in UI
export type Order = BaseOrder & {
  tracking_number?: string | null;
  tracking_data?: any;
  receipt_pdf_base64?: string | null;
  wallet_deducted_amount?: number | null;
  selected_courier_name?: string | null;
  selected_service_name?: string | null;
  cancellation_reason?: string | null;
  updated_at?: string | null;
  cancelled_at?: string | null;
  total_amount?: number;
  delivery_data?: any;
  order_type?: string | null;
  pickup_status?: string | null;
  delivery_option?: string | null;
  delivery_method?: string | null;
  meetup_location?: string | null;
  meetup_time?: string | null;
  buyer_confirmed_at?: string | null;
  seller_confirmed_at?: string | null;
  payment_status?: string | null;
  book?: {
    id?: string;
    title?: string;
    author?: string;
    price?: number;
    image_url?: string | null;
    additional_images?: string[] | null;
  };
  buyer?: {
    id?: string;
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
  seller?: {
    id?: string;
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
};

interface OrderManagementViewProps {}

interface CollapsibleOrderState {
  [key: string]: boolean;
}

const OrderManagementView: React.FC<OrderManagementViewProps> = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<CollapsibleOrderState>({});
  const [selectedOrderForGallery, setSelectedOrderForGallery] = useState<Order | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const formatCurrency = (amount?: number | null) =>
    typeof amount === "number" ? `R${amount.toFixed(2)}` : "R0.00";

  const downloadReceipt = async (order: Order) => {
    setDownloadingId(order.id);
    try {
      // If order has the receipt PDF pre-saved in base64, download it instantly
      if (order.receipt_pdf_base64) {
        console.log("[SellerOrders] Downloading pre-saved PDF receipt...");
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${order.receipt_pdf_base64}`;
        link.download = `receipt-${order.id.slice(-8)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Receipt downloaded");
        return;
      }

      console.log("[SellerOrders] Generating receipt PDF dynamically...");
      const isSeller = getUserRole(order) === "seller";
      
      // Map Order object fields to ReceiptOrder shape
      const mappedOrder: any = {
        id: order.id,
        order_id: order.id.slice(-8),
        payment_reference: order.payment_status === "paid" ? "Paid" : "Pending",
        created_at: order.created_at,
        buyer_full_name: order.buyer?.full_name || order.buyer?.name || order.buyer?.email || "Buyer",
        buyer_email: order.buyer?.email,
        seller_full_name: order.seller?.full_name || order.seller?.name || order.seller?.email || "Seller",
        seller_email: order.seller?.email,
        selected_shipping_cost: 0, // Fallback
        platform_fee: 20, // Fallback
        delivery_type: order.order_type === "pickup" ? "pickup" : "delivery",
        order_type: order.order_type,
        tracking_number: order.tracking_number,
        wallet_deducted_amount: order.wallet_deducted_amount,
        total_amount: order.total_amount,
        items: [
          {
            title: order.book?.title || "Marketplace Item",
            price: order.book?.price,
            condition: "N/A",
            quantity: 1
          }
        ]
      };

      const html = buildPremiumReceiptHtml(mappedOrder, isSeller);
      
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
      pdf.save(`receipt-${order.id.slice(-8)}.pdf`);
      document.body.removeChild(temp);
      toast.success("Receipt downloaded");
    } catch (err: any) {
      console.error("Receipt download failed", err);
      toast.error("Could not download receipt. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id, order_id, payment_reference, paystack_reference, book_id, item_id, item_type, buyer_id, seller_id, status, delivery_status, payment_status, created_at, updated_at,
          cancelled_at, cancellation_reason, tracking_number, tracking_data,
          selected_courier_name, selected_service_name, total_amount, delivery_data,
          buyer_full_name, buyer_email, seller_full_name, seller_email, receipt_pdf_base64, wallet_deducted_amount,
          order_type, pickup_status, delivery_option, meetup_location, meetup_time,
          buyer_confirmed_at, seller_confirmed_at, commission_rate_applied
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (ordersError) {
        logError("Error fetching orders", ordersError);
        toast.error(ordersError.message || "Failed to load orders");
        return;
      }

      // Get unique IDs for each type
      const bookIds = (ordersData || [])
        .map((o: any) => o.book_id)
        .filter((id: string | null): id is string => !!id);
      
      const uniformIds = (ordersData || [])
        .filter((o: any) => o.item_type === 'uniform' && o.item_id)
        .map((o: any) => o.item_id as string);

      const supplyIds = (ordersData || [])
        .filter((o: any) => o.item_type === 'school_supply' && o.item_id)
        .map((o: any) => o.item_id as string);

      let itemMap: { [key: string]: any } = {};

      // Fetch books if we have book IDs
      if (bookIds.length > 0) {
        const { data: booksData, error: booksError } = await supabase
          .from("books")
          .select("id, title, author, price, image_url, front_cover, additional_images")
          .in("id", bookIds);

        if (!booksError && booksData) {
          booksData.forEach(b => {
            itemMap[b.id] = {
              ...b,
              image_url: (b as any).image_url || (b as any).front_cover || null,
              type: 'book',
            };
          });
        }
      }

      // Fetch uniforms if we have uniform IDs
      if (uniformIds.length > 0) {
        const { data: uniformsData, error: uniformsError } = await supabase
          .from("uniforms")
          .select("id, title, price, image_url, additional_images")
          .in("id", uniformIds);

        if (!uniformsError && uniformsData) {
          uniformsData.forEach(u => { itemMap[u.id] = { ...u, type: 'uniform', author: 'School Uniform' }; });
        }
      }

      // Fetch school supplies if we have supply IDs
      if (supplyIds.length > 0) {
        const { data: supplyData, error: supplyError } = await supabase
          .from("school_supplies")
          .select("id, title, price, image_url, additional_images")
          .in("id", supplyIds);

        if (!supplyError && supplyData) {
          supplyData.forEach(s => { itemMap[s.id] = { ...s, type: 'school_supply', author: 'School Supply' }; });
        }
      }

      // Map orders with item data
      const mappedOrders = (ordersData || [])
        .map((o: any) => {
          const itemId = o.book_id || o.item_id;
          const item = itemId ? itemMap[itemId] : null;
          return {
            ...o,
            book: item ? {
              id: item.id,
              title: item.title,
              author: item.author || "No author",
              price: item.price,
              image_url: item.image_url,
              additional_images: Array.isArray(item.additional_images) ? item.additional_images : [],
            } : null,
            // Map buyer/seller fields to match the Order type
            buyer: o.buyer_id ? {
              id: o.buyer_id,
              full_name: o.buyer_full_name,
              name: o.buyer_full_name,
              email: o.buyer_email,
            } : null,
            seller: o.seller_id ? {
              id: o.seller_id,
              full_name: o.seller_full_name,
              name: o.seller_full_name,
              email: o.seller_email,
            } : null,
          };
        });

      // Deduplicate by order id to prevent duplicates
      const seenIds = new Set<string>();
      const realOrders = mappedOrders.filter((o: any) => {
        if (seenIds.has(o.id)) {
          return false;
        }
        seenIds.add(o.id);
        return true;
      });

      setOrders(realOrders as Order[]);
    } catch (err: any) {
      logError("Error fetching orders (catch block)", err);
      toast.error(err?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = (order: Order): "buyer" | "seller" => {
    return order.buyer_id === user?.id ? "buyer" : "seller";
  };

  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter((o) => ["pending", "pending_commit"].includes(o.status)).length,
      active: orders.filter((o) =>
        ["committed", "pending_delivery", "in_transit", "confirmed", "dispatched", "pending_commit", "delivered", "awaiting_confirmation"].includes(o.status),
      ).length,
      completed: orders.filter((o) => ["completed"].includes(o.status)).length,
      cancelled: orders.filter((o) => ["cancelled"].includes(o.status)).length,
    };
    return stats;
  };

  const formatDate = (d?: string | null) => {
    if (!d) return "";
    try { return new Date(d).toLocaleString(); } catch { return d as string; }
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const getBookImages = (order: Order): string[] => {
    const images: string[] = [];

    // Add primary image
    if (order.book?.image_url) {
      images.push(order.book.image_url);
    }

    // Add additional images
    if (order.book?.additional_images && Array.isArray(order.book.additional_images)) {
      images.push(...order.book.additional_images.filter(Boolean));
    }

    // Return unique images and filter out empty strings
    return [...new Set(images)].filter(Boolean);
  };

  const handleFeedbackSubmitted = useCallback(() => {
    fetchOrders();
  }, []);

  const OrderHeaderDetails: React.FC<{ order: Order }> = ({ order }) => {
    const role = getUserRole(order);
    const bookImages = getBookImages(order);
    const img = bookImages[0] || "/placeholder.svg";
    const otherPartyName = role === "buyer"
      ? (order.seller?.full_name || order.seller?.name || "Seller")
      : (order.buyer?.full_name || order.buyer?.name || "Buyer");

    const orderRef = order.order_id || (order as any).payment_reference || (order as any).paystack_reference || order.id.slice(0, 8);
    
    // Commission rate calculation for sellers
    const isSeller = role === "seller";
    const appliedCommissionRate = (order as any).commission_rate_applied !== undefined && (order as any).commission_rate_applied !== null
      ? Number((order as any).commission_rate_applied)
      : undefined;
      
    const grossPrice = typeof order.book?.price === "number" ? order.book.price : (order.total_amount || 0);

    return (
      <div className="flex gap-4 items-start w-full">
        <button
          onClick={() => setSelectedOrderForGallery(order)}
          className="w-16 h-24 rounded-lg overflow-hidden bg-book-200 flex-shrink-0 transition-all cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-book-500"
          title="Click to view book photos"
        >
          <img
            src={img}
            alt={order.book?.title || "Book"}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-book-900 line-clamp-2">
                {order.book?.title || "Marketplace Item"}
              </h3>
              <p className="text-sm text-book-600 mt-1">
                {order.book?.author || "ReBooked Solutions"}
              </p>
              <p className="text-xs text-book-500 mt-2 font-mono">
                Order #{orderRef} • {otherPartyName}
              </p>
            </div>
            <div className="md:text-right">
              {typeof grossPrice === "number" && (
                <div className="text-lg font-bold text-book-600">R{grossPrice.toFixed(2)}</div>
              )}
              {isSeller && appliedCommissionRate !== undefined && (
                <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                  Commission ({(appliedCommissionRate * 100).toFixed(1)}%): -R{(grossPrice * appliedCommissionRate).toFixed(2)}
                </div>
              )}
              <div className="text-xs text-book-500 mt-1">{new Date(order.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const OrderShipmentSummary: React.FC<{ order: Order }> = ({ order }) => {
    const isPickup = order.order_type === "pickup" || order.delivery_option === "pickup";
    
    if (isPickup) {
      const pickupStatus = order.pickup_status || "pending_pickup";
      const statusLabels: Record<string, string> = {
        pending_pickup: "Pending Meetup",
        awaiting_buyer_confirmation: "Awaiting Buyer Handoff Confirmation",
        awaiting_seller_confirmation: "Awaiting Seller Handoff Confirmation",
        completed: "Completed",
        expired: "Expired",
        disputed: "Disputed",
      };
      
      return (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <div className="text-book-600 font-medium">Meetup Status</div>
              <Badge variant="secondary" className="capitalize text-xs">
                {statusLabels[pickupStatus] || pickupStatus.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="space-y-0.5">
              <div className="text-book-600 font-medium">Delivery Method</div>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                🤝 In-Person Pickup (Meetup)
              </Badge>
            </div>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-xs mt-2 leading-relaxed">
            <strong>Coordinate Meetup:</strong> Coordinate the meetup location and time with the other party in chat. 
            There is a 7-day window to meet up and complete the handoff.
          </div>
        </div>
      );
    }

    const courier = order.selected_courier_name || order.delivery_data?.provider;
    const service = order.selected_service_name || order.delivery_data?.service_level;
    const tracking = order.tracking_number || order.tracking_data?.tracking_number;
    const deliveryProgress = (order.delivery_status || "").toLowerCase();
    return (
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="space-y-0.5">
            <div className="text-book-600 font-medium">Order Status</div>
            <Badge variant="secondary" className="capitalize text-xs">{order.status.replace(/_/g, " ")}</Badge>
          </div>
          <div className="space-y-0.5">
            <div className="text-book-600 font-medium">Tracking</div>
            {tracking ? (
              <div className="space-y-0.5">
                <div className="font-mono text-book-800 break-all text-xs">{tracking}</div>
                <a
                  href={`https://track.bobgo.co.za/${encodeURIComponent(tracking)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-book-600 underline text-xs inline-block"
                >
                  Track Package
                </a>
              </div>
            ) : (
              <span className="text-book-500">Pending</span>
            )}
          </div>
          <div className="space-y-0.5">
            <div className="text-book-600 font-medium">Courier / Service</div>
            <div className="flex flex-wrap items-center gap-1">
              {courier ? <Badge variant="outline" className="text-xs">{courier}</Badge> : <span>—</span>}
              {service ? <Badge variant="outline" className="text-xs">{service}</Badge> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${deliveryProgress === "delivered" ? "bg-book-600" : deliveryProgress === "in_transit" ? "bg-book-500" : deliveryProgress === "pickup_failed" ? "bg-red-500" : "bg-amber-500"}`} />
          <span className="capitalize font-medium text-book-700">{deliveryProgress || "pending"}</span>
        </div>

        {order.delivery_data?.available_compartment_sizes && Array.isArray(order.delivery_data.available_compartment_sizes) && order.delivery_data.available_compartment_sizes.length > 0 && (
          <div className="pt-2 border-t border-book-50">
            <div className="text-[10px] font-bold text-book-500 uppercase tracking-wider mb-1">Locker Sizes</div>
            <div className="flex flex-wrap gap-1">
              {order.delivery_data.available_compartment_sizes.map((size: string) => (
                <Badge key={size} variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-book-100 text-book-600 bg-white/50">
                  {size}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {order.tracking_data?.events && Array.isArray(order.tracking_data.events) && order.tracking_data.events.length > 0 && (
          <div className="pt-1">
            <div className="text-xs text-book-600 font-medium mb-1">Recent events</div>
            <ul className="text-xs space-y-0.5 max-h-24 overflow-auto pr-1">
              {order.tracking_data.events.slice(-4).reverse().map((ev: any, idx: number) => (
                <li key={idx} className="flex items-start gap-1.5 text-book-600">
                  <span className="w-1 h-1 rounded-full bg-book-400 flex-shrink-0 mt-1" />
                  <span className="flex-1">
                    <span className="whitespace-nowrap">{formatDate(ev.timestamp || ev.date_time)}</span>
                    {" • "}
                    <span className="capitalize">{(ev.status || ev.description || "").toString().toLowerCase()}</span>
                    {ev.location && <span className="text-book-500"> • {ev.location}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const OrderTimeline: React.FC<{ order: Order }> = ({ order }) => {
    const isPickup = order.order_type === "pickup" || order.delivery_option === "pickup";

    if (isPickup) {
      const steps = ["paid", "awaiting_handoff", "completed"] as const;
      const stepLabels: Record<string, string> = {
        paid: "Payment Confirmed",
        awaiting_handoff: "Handover / Meetup",
        completed: "Completed",
      };

      let currentIndex = 0;
      if (order.status === "completed" || order.pickup_status === "completed") {
        currentIndex = 2;
      } else if (
        order.status === "committed" ||
        order.pickup_status === "pending_pickup" ||
        order.pickup_status === "awaiting_buyer_confirmation" ||
        order.pickup_status === "awaiting_seller_confirmation"
      ) {
        currentIndex = 1;
      }

      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-1">
              {steps.map((step, idx) => {
                const isCompleted = idx < currentIndex || (idx === currentIndex && currentIndex === steps.length - 1);
                const isCurrent = idx === currentIndex && currentIndex < steps.length - 1;
                const isPending = idx > currentIndex;

                return (
                  <div key={step} className="flex flex-col items-center gap-2 flex-1">
                    <div className="flex items-center w-full">
                      {idx > 0 && (
                        <div
                          className={`flex-1 h-1 ${
                            idx <= currentIndex ? "bg-book-600" : "bg-book-200"
                          }`}
                        />
                      )}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all flex-shrink-0 ${
                          isCompleted
                            ? "bg-book-100 text-book-700 border-2 border-book-600"
                            : isCurrent
                            ? "bg-book-100 text-book-600 border-2 border-book-600"
                            : "bg-book-50 text-book-400 border-2 border-book-200"
                        }`}
                      >
                        {isCompleted ? "✓" : idx + 1}
                      </div>
                      {idx < steps.length - 1 && (
                        <div
                          className={`flex-1 h-1 ${
                            idx < currentIndex ? "bg-book-600" : "bg-book-200"
                          }`}
                        />
                      )}
                    </div>
                    <span className={`text-xs font-medium text-center leading-tight w-full ${
                      isCompleted || isCurrent ? "text-gray-900" : "text-gray-500"
                    }`}>
                      {stepLabels[step]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    const committed = [
      "committed",
      "pending_delivery",
      "in_transit",
      "completed",
      "confirmed",
      "dispatched",
      "delivered",
    ].includes(order.status);

    const deliveryStatus = (order.delivery_status || "created").toLowerCase();

    // Determine if this is a locker-to-locker delivery
    const isLockerDelivery = order.delivery_data?.zone_type === "locker-to-locker" ||
                             (order.delivery_data?.delivery_type === "locker" && order.delivery_data?.pickup_type === "locker");

    // Non-Locker Delivery Flow: Created → Collected → Out for Delivery → Delivered
    // Locker Delivery Flow: Created → Collected → Out for Delivery → Ready for Pickup → Delivered
    const baseSteps = ["created", "collected", "out_for_delivery"] as const;
    const steps = isLockerDelivery
      ? [...baseSteps, "ready_for_pickup", "delivered"] as const
      : [...baseSteps, "delivered"] as const;

    const statusToIndex: Record<string, number> = {
      created: 0,
      pending: 0,
      pickup_scheduled: 0,
      collected: 1,
      picked_up: 1,
      in_transit: 2,
      out_for_delivery: 2,
      ready_for_pickup: 3,
      ready: 3,
      delivered: isLockerDelivery ? 4 : 3,
    };

    const currentIndex = statusToIndex[deliveryStatus] ?? 0;

    // Status labels for timeline steps
    const stepLabels: Record<string, string> = {
      created: "Created",
      collected: "Collected",
      out_for_delivery: "Out for Delivery",
      ready_for_pickup: "Ready for Pickup",
      delivered: "Delivered",
    };

    return (
      <div className="space-y-3">
        {/* Delivery method indicator */}
        {isLockerDelivery && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-book-700 bg-book-50 px-2.5 py-1.5 rounded-md border border-book-200">
            <Package className="w-3.5 h-3.5" />
            Locker Delivery
          </div>
        )}

        {/* Delivery stages - horizontal timeline */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-1">
            {steps.map((step, idx) => {
              const isCompleted = idx < currentIndex || (idx === currentIndex && currentIndex === steps.length - 1);
              const isCurrent = idx === currentIndex && currentIndex < steps.length - 1;
              const isPending = idx > currentIndex;

              return (
                <div key={step} className="flex flex-col items-center gap-2 flex-1">
                  <div className="flex items-center w-full">
                    {/* Connector line before circle */}
                    {idx > 0 && (
                      <div
                        className={`flex-1 h-1 ${
                          idx <= currentIndex ? "bg-book-600" : "bg-book-200"
                        }`}
                      />
                    )}
                    {/* Step Circle */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all flex-shrink-0 ${
                        isCompleted
                          ? "bg-book-100 text-book-700 border-2 border-book-600"
                          : isCurrent
                          ? "bg-book-100 text-book-600 border-2 border-book-600"
                          : "bg-book-50 text-book-400 border-2 border-book-200"
                      }`}
                    >
                      {isCompleted ? "✓" : idx + 1}
                    </div>
                    {/* Connector line after circle */}
                    {idx < steps.length - 1 && (
                      <div
                        className={`flex-1 h-1 ${
                          idx < currentIndex ? "bg-book-600" : "bg-book-200"
                        }`}
                      />
                    )}
                  </div>
                  <span className={`text-xs font-medium text-center leading-tight w-full ${
                    isCompleted || isCurrent ? "text-gray-900" : "text-gray-500"
                  }`}>
                    {stepLabels[step]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Chat-to-Party Button ──────────────────────────────────────────────────
  const ChatToPartyButton: React.FC<{
    order: Order;
    userRole: "buyer" | "seller" | "unknown";
    onNavigate: (conversationId: string) => void;
    currentUserId: string;
  }> = ({ order, userRole, onNavigate }) => {
    const [isLoading, setIsLoading] = useState(false);
    const listingId = order.book_id || (order as any).item_id;

    const handleChat = async () => {
      if (!order.buyer_id || !order.seller_id || !listingId) return;
      try {
        setIsLoading(true);
        const conv = await getOrCreateConversation(
          listingId,
          order.buyer_id,
          order.seller_id,
          (order as any).item_type || "book"
        );
        onNavigate(conv.id);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to open chat:", errorMsg);
        toast.error("Could not open chat. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const label = userRole === "buyer" ? "Chat to Seller" : "Chat to Buyer";

    return (
      <div className="pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleChat}
          disabled={isLoading || !listingId}
          className="w-full border-book-300 text-book-700 hover:bg-book-50 hover:border-book-500 font-medium gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          {label}
        </Button>
      </div>
    );
  };

  const OrderCard: React.FC<{ order: Order; isCollapsible?: boolean }> = ({ order, isCollapsible = false }) => {
    const userRole = getUserRole(order);
    // For collapsible orders (completed/cancelled), default to collapsed (false)
    // For active orders, default to expanded (true)
    const isExpanded = isCollapsible ? (expandedOrders[order.id] ?? false) : (expandedOrders[order.id] ?? true);

    const handleToggle = () => {
      if (isCollapsible) {
        toggleOrderExpand(order.id);
      }
    };

    const isCompleted = order.status === "completed";
    const isCancelled = order.status === "cancelled";
    const isActive = !isCompleted && !isCancelled;

    return (
      <Card className={`border-l-4 transition-all duration-200 ${
        isCancelled
          ? "border-l-red-500 bg-red-50/30 border border-red-200"
          : isCompleted
          ? "border-l-book-600 bg-book-50/30 border border-book-200"
          : "border-l-book-500 bg-book-50/30 border border-book-200"
      }`}>
        {/* Header Section - Always Visible */}
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <OrderHeaderDetails order={order} />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Status Badge */}
              <Badge className={`text-xs font-medium whitespace-nowrap ${
                isCancelled
                  ? "bg-red-600 text-white"
                  : isCompleted
                  ? "bg-book-600 text-white"
                  : "bg-book-500 text-white"
              }`}>
                {isCancelled ? "Cancelled" : isCompleted ? "Completed" : "Active"}
              </Badge>

              {/* Expand/Collapse Button */}
              {isCollapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggle}
                  className="h-8 w-8 p-0"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-book-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-book-600" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Expandable Content Section */}
        {isExpanded && (
          <CardContent className="space-y-4 px-4 pb-4">
            {/* Alert Messages */}
            {order.delivery_status === "pickup_failed" && userRole === "seller" && (
              <Alert className="border-orange-300 bg-orange-50 py-3 px-3">
                <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <AlertDescription className="text-sm text-orange-800 ml-2">
                  <strong>Action Required:</strong> Courier attempted pickup but you were unavailable. Please reschedule or cancel within 24 hours.
                </AlertDescription>
              </Alert>
            )}

            {order.delivery_status === "pickup_failed" && userRole === "buyer" && (
              <Alert className="border-blue-300 bg-blue-50 py-3 px-3">
                <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <AlertDescription className="text-sm text-blue-800 ml-2">
                  <strong>Pickup Delayed:</strong> The seller missed pickup. We'll update you once they take action.
                </AlertDescription>
              </Alert>
            )}

            {order.delivery_status === "rescheduled_by_seller" && (
              <Alert className="border-blue-300 bg-blue-50 py-3 px-3">
                <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <AlertDescription className="text-sm text-blue-800 ml-2">
                  <strong>Pickup Rescheduled:</strong> A new pickup time has been arranged.
                </AlertDescription>
              </Alert>
            )}

            {isCancelled && (
              <Alert className="border-red-300 bg-red-50 py-3 px-3">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <AlertDescription className="text-sm text-red-800 ml-2">
                  <strong>Order Cancelled:</strong> {order.cancellation_reason || "This order has been cancelled"} {order.cancelled_at ? `on ${formatDate(order.cancelled_at)}` : ""}
                </AlertDescription>
              </Alert>
            )}

            {/* Delivery / Meetup Timeline */}
            <div className="bg-white rounded-lg p-3 border border-book-200">
              <h4 className="text-sm font-semibold text-book-900 mb-3">
                {(order.order_type === "pickup" || order.delivery_option === "pickup") ? "Meetup Progress" : "Delivery Progress"}
              </h4>
              <OrderTimeline order={order} />
            </div>

            {/* Shipment / Meetup Summary */}
            <div className="bg-white rounded-lg p-3 border border-book-200">
              <h4 className="text-sm font-semibold text-book-900 mb-3">
                {(order.order_type === "pickup" || order.delivery_option === "pickup") ? "Meetup Details" : "Shipment Details"}
              </h4>
              <OrderShipmentSummary order={order} />
            </div>

            {/* Action Panel - includes chat button */}
            {!isCancelled && (
              <OrderActionsPanel order={order} userRole={userRole} onOrderUpdate={fetchOrders} />
            )}

            {/* Buyer Completion Card */}
            {userRole === "buyer" &&
              order.order_type !== "pickup" &&
              (order.status === "delivered" || order.delivery_status === "delivered" || isCompleted) && (
              <OrderCompletionCard
                orderId={order.id}
                bookTitle={order.book?.title || "Item"}
                sellerName={order.seller?.name || "Seller"}
                deliveredDate={order.updated_at}
                onFeedbackSubmitted={handleFeedbackSubmitted}
                totalAmount={order.total_amount || 0}
                sellerId={order.seller_id || ""}
              />
            )}

            {/* Seller Completion Message */}
            {isCompleted && userRole === "seller" && (
              <div className="bg-book-50 border border-book-200 rounded-lg p-3">
                <p className="text-sm text-book-700">
                  <strong>Order Completed:</strong> {formatDate(order.updated_at)}
                </p>
              </div>
            )}

            {/* Download Receipt Button */}
            {!isCancelled && (
              <div className="flex justify-end pt-3 border-t border-book-100 mt-2">
                <Button
                  onClick={() => downloadReceipt(order)}
                  disabled={downloadingId === order.id}
                  size="sm"
                  className="bg-book-600 hover:bg-book-700 text-white font-semibold flex items-center gap-2"
                >
                  {downloadingId === order.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Preparing…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" /> Download Receipt (PDF)
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  const stats = getOrderStats();

  const renderImageGalleryModal = () => {
    if (!selectedOrderForGallery) return null;

    const bookImages = getBookImages(selectedOrderForGallery);

    return (
      <Dialog open={!!selectedOrderForGallery} onOpenChange={(open) => {
        if (!open) setSelectedOrderForGallery(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedOrderForGallery.book?.title || "Book Photos"}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {bookImages.length > 0 ? (
              <BookImageCarousel images={bookImages} />
            ) : (
              <div className="aspect-[3/4] bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">No images available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading orders...</span>
      </div>
    );
  }

  // Group orders into Active, Completed, Cancelled
  const isOrderCompleted = (o: Order) => ["delivered", "completed"].includes(o.status) || o.delivery_status === "delivered";
  const activeOrders = orders.filter((o) => o.status !== "cancelled" && !isOrderCompleted(o));
  const completedOrders = orders.filter((o) => isOrderCompleted(o) && o.status !== "cancelled");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  return (
    <div className="space-y-6">

      {/* Active Orders Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <TruckIcon className="h-5 w-5 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Active Orders</h2>
        </div>
        {activeOrders.length === 0 ? (
          <Card className="border-l-4 border-l-gray-300 bg-gray-50/50">
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h4 className="text-lg font-semibold text-gray-900 mb-1">No active orders</h4>
              <p className="text-gray-600">New orders will appear here once created or committed.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} isCollapsible={false} />
            ))}
          </div>
        )}
      </div>

      {/* Completed Orders Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">Completed Orders</h2>
        </div>
        {completedOrders.length === 0 ? (
          <Card className="border-l-4 border-l-gray-300 bg-gray-50/50">
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h4 className="text-lg font-semibold text-gray-900 mb-1">No completed orders</h4>
              <p className="text-gray-600">Your completed orders will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {completedOrders.map((order) => (
              <OrderCard key={order.id} order={order} isCollapsible={true} />
            ))}
          </div>
        )}
      </div>

      {/* Cancelled Orders Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-900">Cancelled Orders</h2>
        </div>
        {cancelledOrders.length === 0 ? (
          <Card className="border-l-4 border-l-gray-300 bg-gray-50/50">
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h4 className="text-lg font-semibold text-gray-900 mb-1">No cancelled orders</h4>
              <p className="text-gray-600">Your cancelled orders will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cancelledOrders.map((order) => (
              <OrderCard key={order.id} order={order} isCollapsible={true} />
            ))}
          </div>
        )}
      </div>

      {renderImageGalleryModal()}
    </div>
  );
};

export default OrderManagementView;
