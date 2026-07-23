import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { buildPremiumReceiptHtml } from "@/utils/receiptHtmlBuilder";
import {
  Package,
  User,
  Clock,
  ArrowRight,
  Check,
  X,
  MapPin,
  AlertCircle,
  TrendingUp,
  Wallet,
  Calendar,
  Download,
  Filter,
  ArrowUpDown,
  Search,
  MessageSquare,
  ShieldAlert,
  Truck,
  FileText,
  RefreshCw,
  Clock3,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Interfaces matching database schema and UI needs
interface OrderEvent {
  id: string;
  order_id: string;
  event_type: "placed" | "paid" | "dispatched" | "delivered" | "buyer_confirmed" | "issue_reported" | "resolved" | "escalated" | "cancelled" | "courier_pulled";
  timestamp: string;
  actor: "buyer" | "seller" | "system" | "admin";
  details?: any;
}

interface OrderItem {
  title: string;
  thumbnail: string;
  price: number;
}

interface ItemDetails {
  author?: string;
  condition?: string;
  grade?: string;
  description?: string;
  category?: string;
}

interface Order {
  id: string;
  displayRef: string;
  book_id?: string;
  item_id?: string;
  item_type?: string;
  buyer_id: string;
  seller_id: string;
  datePlaced: string;
  buyerName: string;
  buyerEmail?: string;
  sellerName?: string;
  sellerEmail?: string;
  item: OrderItem;
  itemDetails?: ItemDetails;
  grossAmount: number;
  deliveryMethod: "Locker-to-Locker" | "Courier Delivery" | "Physical Pickup";
  deliveryStatus: string;
  status: "Pending Acceptance" | "Awaiting Pickup" | "In Transit" | "Completed" | "Cancelled" | "Disputed" | "Escalated";
  needsAction: boolean;
  timeFlag?: string;
  disputeReason?: string;
  disputeStatus?: "none" | "open" | "resolved";
  disputeTimerExpiresAt?: string;
  disputeEscalated?: boolean;
  disputeEscalatedAt?: string;
  lastCourierRefreshAt?: string;
  commissionRateApplied?: number;
  receiptPdfBase64?: string | null;
  walletDeductedAmount?: number | null;
  totalAmount?: number;
  trackingNumber?: string | null;
  selectedCourierName?: string | null;
  selectedServiceName?: string | null;
  orderType?: string | null;
  timelineEvents: OrderEvent[];
  isRepeatBuyer?: boolean;
  rawItems?: any[];
}

export const OrdersTab: React.FC = () => {
  const { user, profile } = useAuth();
  
  // Resolve seller's commission tier
  const [isTier1, setIsTier1] = useState(false);
  
  useEffect(() => {
    const checkSub = async () => {
      if (!user) return;
      try {
        const { checkLiveSubscription } = await import("@/services/subscriptionService");
        const sub = await checkLiveSubscription(user.id);
        setIsTier1(sub.isTier1);
      } catch (err) {
        const hasTier1 = profile?.subscription_tier === "tier1" || profile?.is_business_tier1 === true;
        setIsTier1(hasTier1);
      }
    };
    checkSub();
  }, [user, profile]);

  const commissionRate = isTier1 ? 0.065 : 0.10;

  // Real database orders and events
  const [dbOrders, setDbOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [expandedItemDetails, setExpandedItemDetails] = useState<Record<string, boolean>>({});

  // Fetch user wallet balance
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_wallets")
      .select("available_balance")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWalletBalance(Number(data.available_balance) / 100);
        }
      });
  }, [user]);

  // Filters & layout configurations
  const [activeTab, setActiveTab] = useState<string>("action");
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Inline Actions Modals
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolutionText, setResolutionText] = useState("");
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Polling loading states
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Live timer ticks for dispute counts
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // 1. DYNAMIC FETCH FROM SUPABASE
  const fetchOrdersFromSupabase = useCallback(async () => {
    if (!user) return;
    setLoadingOrders(true);

    try {
      // Auto-escalate expired disputes before fetching (ignore errors)
      try { await supabase.rpc("check_and_escalate_disputes"); } catch { /* best-effort */ }

      // Query database orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id, order_id, payment_reference, paystack_reference, book_id, item_id, item_type, buyer_id, seller_id, status, delivery_status, payment_status, created_at, updated_at,
          cancelled_at, cancellation_reason, tracking_number, tracking_data, items,
          selected_courier_name, selected_service_name, total_amount, delivery_data,
          buyer_full_name, buyer_email, seller_full_name, seller_email, receipt_pdf_base64, wallet_deducted_amount,
          order_type, pickup_status, delivery_option, meetup_location, meetup_time,
          buyer_confirmed_at, seller_confirmed_at,
          commission_rate_applied, dispute_timer_expires_at, dispute_escalated, dispute_escalated_at, last_courier_refresh_at,
          dispute_reason, dispute_status, dispute_resolution, dispute_resolved_at
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Query timeline events
      const { data: eventsData } = await supabase
        .from("order_events")
        .select("*")
        .order("timestamp", { ascending: true });

      const eventsMap: Record<string, OrderEvent[]> = {};
      (eventsData || []).forEach((e: any) => {
        if (!eventsMap[e.order_id]) eventsMap[e.order_id] = [];
        eventsMap[e.order_id].push(e);
      });

      // Query listings metadata (books/uniforms/supplies) to resolve covers and authors
      const bookIds = (ordersData || []).map((o: any) => o.book_id).filter(Boolean);
      let itemsMap: Record<string, { title: string; image_url: string; author: string; condition: string; grade: string; description: string }> = {};

      if (bookIds.length > 0) {
        const { data: books } = await supabase
          .from("books")
          .select("id, title, image_url, author, condition, grade, description")
          .in("id", bookIds);
        
        (books || []).forEach(b => {
          itemsMap[b.id] = {
            title: b.title || "Marketplace Item",
            image_url: b.image_url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=80&h=80&fit=crop&auto=format&q=80",
            author: b.author || "General",
            condition: b.condition || "Good",
            grade: b.grade || "Standard",
            description: b.description || "",
          };
        });
      }

      // Map Supabase rows to our UI Order interface
      const mappedOrders: Order[] = (ordersData || []).map((o: any) => {
        const itemInfo = itemsMap[o.book_id] || {
          title: o.items?.[0]?.title || o.items?.[0]?.name || "School Textbook",
          image_url: o.items?.[0]?.image_url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=80&h=80&fit=crop&auto=format&q=80",
          author: o.items?.[0]?.author || "General",
          condition: o.items?.[0]?.condition || "Good",
          grade: o.items?.[0]?.grade || "Standard",
          description: o.items?.[0]?.description || "",
        };

        // Compute human-readable reference number
        const displayRef = o.order_id || o.payment_reference || o.paystack_reference || `ORD-${o.id.slice(0, 8).toUpperCase()}`;

        // Determine friendly mapped status
        let mappedStatus: Order["status"] = "Pending Acceptance";
        if (o.status === "pending_commit" || o.status === "placed" || o.status === "paid") mappedStatus = "Pending Acceptance";
        else if (o.status === "committed" || o.status === "pickup_scheduled") mappedStatus = "Awaiting Pickup";
        else if (o.status === "dispatched" || o.status === "in_transit") mappedStatus = "In Transit";
        else if (o.status === "completed" || o.status === "delivered") mappedStatus = "Completed";
        else if (o.status === "cancelled") mappedStatus = "Cancelled";
        else if (o.status === "disputed") {
          mappedStatus = o.dispute_escalated ? "Escalated" : "Disputed";
        }

        // Determine Needs Action
        let needsAction = false;
        if (mappedStatus === "Pending Acceptance") needsAction = true;
        if (mappedStatus === "Awaiting Pickup") needsAction = true;
        if (mappedStatus === "Disputed" && !o.dispute_escalated) needsAction = true;

        // Delivery Method
        let deliveryMethod: Order["deliveryMethod"] = "Courier Delivery";
        if (o.order_type === "pickup") deliveryMethod = "Physical Pickup";
        else if (o.delivery_option === "locker") deliveryMethod = "Locker-to-Locker";

        return {
          id: o.id,
          displayRef,
          book_id: o.book_id,
          item_id: o.item_id,
          item_type: o.item_type,
          buyer_id: o.buyer_id,
          seller_id: o.seller_id,
          datePlaced: o.created_at ? new Date(o.created_at).toISOString().split("T")[0] : "",
          buyerName: o.buyer_full_name || o.buyer_email || "Verified Buyer",
          buyerEmail: o.buyer_email,
          sellerName: o.seller_full_name,
          sellerEmail: o.seller_email,
          item: {
            title: itemInfo.title,
            thumbnail: itemInfo.image_url,
            price: Number(o.total_amount) || 0,
          },
          itemDetails: {
            author: itemInfo.author,
            condition: itemInfo.condition,
            grade: itemInfo.grade,
            description: itemInfo.description,
          },
          grossAmount: Number(o.total_amount) || 0,
          deliveryMethod,
          deliveryStatus: o.delivery_status || "Processing",
          status: mappedStatus,
          needsAction,
          disputeReason: o.dispute_reason,
          disputeStatus: o.dispute_status,
          disputeTimerExpiresAt: o.dispute_timer_expires_at,
          disputeEscalated: o.dispute_escalated,
          disputeEscalatedAt: o.dispute_escalated_at,
          lastCourierRefreshAt: o.last_courier_refresh_at,
          commissionRateApplied: o.commission_rate_applied ? Number(o.commission_rate_applied) : undefined,
          receiptPdfBase64: o.receipt_pdf_base64,
          walletDeductedAmount: o.wallet_deducted_amount,
          totalAmount: o.total_amount,
          trackingNumber: o.tracking_number,
          selectedCourierName: o.selected_courier_name,
          selectedServiceName: o.selected_service_name,
          orderType: o.order_type,
          timelineEvents: eventsMap[o.id] || [],
          rawItems: o.items || [],
          cancellationReason: o.cancellation_reason || o.decline_reason,
        };
      });

      setDbOrders(mappedOrders);

    } catch (err: any) {
      console.error("Supabase fetch orders failed:", err);
      setDbOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchOrdersFromSupabase();
    }
  }, [user, refreshKey, fetchOrdersFromSupabase]);


  // 2. COUNTERS TIE-IN
  const needsActionCount = useMemo(() => dbOrders.filter(o => o.needsAction).length, [dbOrders]);
  const pendingCount = useMemo(() => dbOrders.filter(o => o.status === "Pending Acceptance").length, [dbOrders]);
  const activeCount = useMemo(() => dbOrders.filter(o => o.status === "Awaiting Pickup" || o.status === "In Transit").length, [dbOrders]);
  const completedCount = useMemo(() => dbOrders.filter(o => o.status === "Completed").length, [dbOrders]);
  const cancelledCount = useMemo(() => dbOrders.filter(o => o.status === "Cancelled").length, [dbOrders]);
  const disputedCount = useMemo(() => dbOrders.filter(o => o.status === "Disputed" || o.status === "Escalated").length, [dbOrders]);

  // Earnings Summary values (derived dynamically)
  const earningsMonth = useMemo(() => {
    return dbOrders
      .filter(o => o.status === "Completed" && o.datePlaced.startsWith("2026-07"))
      .reduce((sum, o) => {
        const rate = isTier1 ? 0.065 : (o.commissionRateApplied !== undefined ? o.commissionRateApplied : commissionRate);
        return sum + (o.grossAmount * (1 - rate));
      }, 0);
  }, [dbOrders, commissionRate, isTier1]);

  const earningsPending = useMemo(() => {
    return dbOrders
      .filter(o => o.status !== "Completed" && o.status !== "Cancelled" && o.status !== "Disputed" && o.status !== "Escalated")
      .reduce((sum, o) => {
        const rate = isTier1 ? 0.065 : (o.commissionRateApplied !== undefined ? o.commissionRateApplied : commissionRate);
        return sum + (o.grossAmount * (1 - rate));
      }, 0);
  }, [dbOrders, commissionRate, isTier1]);

  // 3. MUTATION HANDLERS (Connected to backend DB & Commit Edge Function)
  const handleAcceptOrder = async (orderId: string) => {
    try {
      // Invoke commit-to-sale edge function (same as regular sellers)
      const { error: fnErr } = await supabase.functions.invoke("commit-to-sale", {
        body: { order_id: orderId },
      });

      if (fnErr) {
        // Fallback update status committed if edge function fails
        const { error } = await supabase
          .from("orders")
          .update({ status: "committed", commit_deadline: null })
          .eq("id", orderId);

        if (error) throw error;
      }

      toast.success("Order accepted and committed to sale!");
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error("Failed to accept order: " + err.message);
    }
  };

  const handleDeclineOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCancelModalOpen(true);
  };

  const confirmDeclineOrder = async () => {
    if (!cancelReason) {
      toast.error("Please enter or select a cancellation reason");
      return;
    }

    try {
      if (!selectedOrderId) return;

      const targetOrder = dbOrders.find(o => o.id === selectedOrderId);

      // Update database status and cancellation_reason
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancellation_reason: cancelReason,
          decline_reason: cancelReason,
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", selectedOrderId);

      if (error) throw error;

      // Try invoking OrderCancellationService or send-email Edge Function
      try {
        const { OrderCancellationService } = await import("@/services/orderCancellationService");
        await OrderCancellationService.declineCommitBySeller(selectedOrderId, cancelReason);
      } catch { /* best effort */ }

      if (targetOrder) {
        // Trigger automated cancellation email notification to buyer & seller
        const recipientEmail = targetOrder.buyerEmail || targetOrder.sellerEmail;
        if (recipientEmail) {
          await supabase.functions.invoke("send-email", {
            body: {
              to: recipientEmail,
              subject: `Order #${targetOrder.displayRef} Has Been Cancelled`,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a; max-width: 500px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 12px;">
                  <h2 style="color: #dc2626; margin-top: 0;">Order Cancellation Notice</h2>
                  <p>Order <strong>#${targetOrder.displayRef}</strong> (${targetOrder.item.title}) has been cancelled.</p>
                  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0; border-radius: 4px;">
                    <strong>Cancellation Reason:</strong> ${cancelReason}
                  </div>
                  <p>If you were charged, a full refund has been initiated to your original payment method.</p>
                  <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                  <p style="font-size: 11px; color: #888; text-align: center;">ReBooked Solutions (Pty) Ltd &bull; support@rebookedsolutions.co.za</p>
                </div>
              `
            }
          }).catch(() => {});
        }
      }

      toast.success("Order cancelled and email notification sent!");
      setCancelModalOpen(false);
      setCancelReason("");
      setSelectedOrderId(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error("Failed to cancel order: " + err.message);
    }
  };

  const handleConfirmHandover = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "completed",
          seller_confirmed_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Handover confirmed! Order marked as completed.");
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error("Failed to confirm handover: " + err.message);
    }
  };

  const handleCheckCourierUpdates = async (orderId: string) => {
    setPollingId(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("track-shipment", {
        body: { order_id: orderId },
      });

      if (error) throw error;
      toast.success("Courier tracking updated!");
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error("Courier tracking update failed: " + err.message);
    } finally {
      setPollingId(null);
    }
  };

  const handleDownloadWaybill = async (orderId: string) => {
    setDownloadingId(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("get-shipment-label", {
        body: { order_id: orderId, label_type: "waybill" },
      });
      if (error) throw new Error(error.message || "Failed to fetch waybill");
      const url = (data as any)?.label_url || (data as any)?.url || (data as any)?.waybill_url || (data as any)?.pdf_url;
      if (!url) throw new Error("No waybill is available for this order yet.");
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Opening waybill label...");
    } catch (err: any) {
      toast.error(err.message || "Failed to download waybill");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenResolveDispute = (orderId: string) => {
    setSelectedOrderId(orderId);
    setResolutionText("");
    setResolveModalOpen(true);
  };

  const confirmResolveDispute = async () => {
    if (!resolutionText.trim()) {
      toast.error("Please enter a resolution summary");
      return;
    }
    setSubmittingResolution(true);
    try {
      if (!selectedOrderId) return;
      const { error } = await supabase
        .from("orders")
        .update({
          dispute_status: "resolved",
          dispute_resolution: resolutionText.trim(),
          dispute_resolved_at: new Date().toISOString(),
        })
        .eq("id", selectedOrderId);

      if (error) throw error;
      toast.success("Dispute resolved successfully!");
      setResolveModalOpen(false);
      setSelectedOrderId(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error("Failed to resolve dispute: " + err.message);
    } finally {
      setSubmittingResolution(false);
    }
  };

  // Helper to reset latest order to pending_commit for testing
  const handleResetLatestOrderCommit = async () => {
    if (!user || dbOrders.length === 0) return;
    const latest = dbOrders[0];
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "pending_commit", commit_deadline: new Date(Date.now() + 48*60*60*1000).toISOString() })
        .eq("id", latest.id);

      if (error) throw error;
      toast.success(`Reset Order #${latest.displayRef} to Pending Commitment!`);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error("Failed to reset order: " + err.message);
    }
  };

  const handleViewChat = async (order: Order) => {
    try {
      const { getOrCreateConversation } = await import("@/services/chatService");
      const conv = await getOrCreateConversation(
        order.book_id || order.item_id || "",
        order.buyer_id,
        order.seller_id,
        (order.item_type as any) || "book"
      );
      window.location.href = `/profile?tab=messages&conversation=${conv.id}`;
    } catch (err: any) {
      toast.error("Failed to open chat: " + err.message);
    }
  };

  // Download receipt PDF
  const handleDownloadReceipt = async (order: Order) => {
    setDownloadingId(order.id);
    try {
      const html = buildPremiumReceiptHtml({
        id: order.id,
        order_id: order.displayRef,
        created_at: order.datePlaced,
        buyer_full_name: order.buyerName,
        buyer_email: order.buyerEmail,
        seller_full_name: order.sellerName,
        seller_email: order.sellerEmail,
        total_amount: order.grossAmount,
        commission_rate: isTier1 ? 0.065 : (order.commissionRateApplied ?? commissionRate),
        items: order.rawItems && order.rawItems.length > 0 ? order.rawItems : [
          {
            title: order.item.title,
            price: order.grossAmount,
            condition: order.itemDetails?.condition || "Good",
            quantity: 1,
          }
        ]
      }, true);

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.innerHTML = html;
      document.body.appendChild(container);

      const canvas = await html2canvas(container.firstElementChild as HTMLElement, { scale: 2 });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
      pdf.save(`ReBooked-Seller-Statement-${order.displayRef}.pdf`);
      toast.success("Receipt statement downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to generate PDF: " + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // 4. FILTERING & SORTING LOGIC
  const filteredOrders = useMemo(() => {
    let result = [...dbOrders];

    // Tab filtering
    if (activeTab === "action") result = result.filter((o) => o.needsAction);
    else if (activeTab === "pending") result = result.filter((o) => o.status === "Pending Acceptance");
    else if (activeTab === "active") result = result.filter((o) => o.status === "Awaiting Pickup" || o.status === "In Transit");
    else if (activeTab === "completed") result = result.filter((o) => o.status === "Completed");
    else if (activeTab === "cancelled") result = result.filter((o) => o.status === "Cancelled");
    else if (activeTab === "disputed") result = result.filter((o) => o.status === "Disputed" || o.status === "Escalated");

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.displayRef.toLowerCase().includes(q) ||
          o.item.title.toLowerCase().includes(q) ||
          o.buyerName.toLowerCase().includes(q)
      );
    }

    // Delivery method filter
    if (deliveryFilter !== "all") {
      result = result.filter((o) => o.deliveryMethod === deliveryFilter);
    }

    // Sort order
    result.sort((a, b) => {
      const timeA = new Date(a.datePlaced).getTime();
      const timeB = new Date(b.datePlaced).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [dbOrders, activeTab, searchQuery, deliveryFilter, sortOrder]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Pending Payouts</p>
              <h3 className="text-lg font-bold text-gray-900 mt-0.5">R{earningsPending.toFixed(2)}</h3>
            </div>
            <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Month Earnings</p>
              <h3 className="text-lg font-bold text-emerald-600 mt-0.5">R{earningsMonth.toFixed(2)}</h3>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Action Required</p>
              <h3 className="text-lg font-bold text-indigo-600 mt-0.5">{needsActionCount} Orders</h3>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Wallet Balance</p>
              <h3 className="text-lg font-bold text-gray-900 mt-0.5">R{walletBalance.toFixed(2)}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Order Workspace Card */}
      <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-book-600" /> Business Order Fulfillment Hub
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Manage, commit to, and track orders across your business catalog.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b pb-3">
            {[
              { id: "action", label: "Requires Action", count: needsActionCount },
              { id: "pending", label: "Pending Commit", count: pendingCount },
              { id: "active", label: "In Fulfillment", count: activeCount },
              { id: "completed", label: "Completed", count: completedCount },
              { id: "disputed", label: "Disputes / Issues", count: disputedCount },
              { id: "cancelled", label: "Cancelled", count: cancelledCount },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === t.id
                    ? "bg-book-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    activeTab === t.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders or buyer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl h-9 border-gray-300"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value)}
                className="border rounded-xl px-3 py-1.5 text-xs outline-none bg-white border-gray-300 h-9 font-medium text-gray-700"
              >
                <option value="all">All Delivery Types</option>
                <option value="Courier Delivery">Door-to-Door Courier</option>
                <option value="Locker-to-Locker">Locker Delivery</option>
                <option value="Physical Pickup">Physical Pickup</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="text-xs rounded-xl h-9 border-gray-300 gap-1.5"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortOrder === "desc" ? "Newest First" : "Oldest First"}
              </Button>
            </div>
          </div>

          {/* Orders List / Cards Rendering */}
          {loadingOrders ? (
            <div className="space-y-4 py-8">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-gray-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Package className="h-12 w-12 text-gray-300 mx-auto" />
              <h4 className="font-bold text-gray-800 text-sm">No orders matching this view</h4>
              <p className="text-xs text-gray-500">Orders placed by buyers will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const currentRate = isTier1 ? 0.065 : (order.commissionRateApplied !== undefined ? order.commissionRateApplied : commissionRate);
                const netAmount = order.grossAmount * (1 - currentRate);
                const commissionAmount = order.grossAmount * currentRate;

                return (
                  <Card key={order.id} className="border border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden hover:border-gray-250 transition-all">
                    <CardContent className="p-5 space-y-4">
                      {/* Top order summary header */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                        {/* 1. Item info */}
                        <div className="md:col-span-4 flex gap-3">
                          <img
                            src={order.item.thumbnail}
                            alt={order.item.title}
                            className="w-12 h-16 rounded-xl object-cover shrink-0 border bg-white"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-indigo-750 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                                #{order.displayRef}
                              </span>
                              <span className="text-[10px] text-gray-400">•</span>
                              <span className="text-gray-400 text-[10px]">{order.datePlaced}</span>
                            </div>
                            <h4 className="font-bold text-gray-800 text-xs mt-1 truncate leading-tight">
                              {order.item.title}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <User className="h-3 w-3 text-gray-450" />
                              <span className="font-semibold text-gray-600 text-xs">{order.buyerName}</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Price payout info */}
                        <div className="md:col-span-3 bg-gray-50/50 p-2.5 rounded-xl border text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Price Gross:</span>
                            <span className="font-medium text-gray-600">R{order.grossAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between mt-1 text-[10px] text-red-500 font-semibold">
                            <span>Commission ({(currentRate * 100).toFixed(1)}%):</span>
                            <span>-R{commissionAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between mt-1.5 pt-1.5 border-t border-dashed">
                            <span className="font-bold text-gray-700">Net Payout:</span>
                            <span className="font-black text-emerald-600 text-sm">R{netAmount.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* 3. Delivery status */}
                        <div className="md:col-span-2 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            {order.deliveryMethod === "Physical Pickup" ? (
                              <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            ) : order.deliveryMethod === "Courier Delivery" ? (
                              <Truck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            ) : (
                              <Package className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            )}
                            <span className="font-bold text-gray-800 text-[11px]">{order.deliveryMethod}</span>
                          </div>
                          <p className="text-[10px] text-gray-450 font-medium italic">{order.deliveryStatus}</p>
                        </div>

                        {/* 4. Main Action Buttons */}
                        <div className="md:col-span-3 flex flex-col gap-2 justify-end">
                          <div className="flex flex-col gap-1.5 w-full">
                            {order.status === "Cancelled" ? (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center space-y-1.5 w-full">
                                <Badge className="bg-red-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                                  <X className="h-3 w-3" /> CANCELLED
                                </Badge>
                                <p className="text-[11px] text-red-800 font-semibold">
                                  Reason: "{order.cancellationReason || "No reason specified"}"
                                </p>
                              </div>
                            ) : order.status === "Pending Acceptance" ? (
                              /* Uncommitted Order Controls */
                              <div className="space-y-2 w-full">
                                <Button
                                  onClick={() => handleAcceptOrder(order.id)}
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl w-full h-9 text-xs shadow-sm"
                                >
                                  Accept & Commit to Order
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleDeclineOrder(order.id)}
                                  size="sm"
                                  className="border-red-300 text-red-650 hover:bg-red-50 hover:border-red-500 font-bold rounded-xl w-full h-9 text-xs"
                                >
                                  Decline / Cancel Order
                                </Button>
                              </div>
                            ) : (
                              /* Committed Order Controls */
                              <>
                                {order.status === "Awaiting Pickup" && (
                                  <div className="space-y-1.5 w-full">
                                    {order.deliveryMethod === "Physical Pickup" && (
                                      <Button
                                        onClick={() => handleConfirmHandover(order.id)}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl w-full h-9 text-xs"
                                      >
                                        Confirm Handover
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {order.status === "In Transit" && (
                                  <div className="flex gap-1.5 w-full">
                                    <Button
                                      variant="outline"
                                      onClick={() => handleCheckCourierUpdates(order.id)}
                                      disabled={pollingId === order.id}
                                      size="sm"
                                      className="border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-xl flex-1 h-9 text-xs flex items-center justify-center gap-1"
                                    >
                                      {pollingId === order.id ? (
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-book-600" />
                                      ) : (
                                        <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
                                      )}
                                      Track Courier
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => handleViewChat(order)}
                                      size="sm"
                                      className="border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-xl flex-1 h-9 text-xs flex items-center justify-center gap-1"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                                      Chat
                                    </Button>
                                  </div>
                                )}

                                {/* Download Waybill Button (Only for committed active courier shipments) */}
                                {order.status !== "Cancelled" && order.deliveryMethod !== "Physical Pickup" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadWaybill(order.id)}
                                    disabled={downloadingId === order.id}
                                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 text-xs font-semibold rounded-xl h-9 flex items-center justify-center gap-1.5"
                                  >
                                    {downloadingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-blue-600" />}
                                    Download Waybill / Label
                                  </Button>
                                )}

                                {/* Download Receipt Statement */}
                                <Button
                                  variant="outline"
                                  onClick={() => handleDownloadReceipt(order)}
                                  disabled={downloadingId === order.id}
                                  size="sm"
                                  className="w-full border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-xl h-9 text-xs flex items-center justify-center gap-1.5"
                                >
                                  <FileText className="h-3.5 w-3.5 text-gray-500" />
                                  Download Seller Receipt
                                </Button>

                                {/* Full Width Cancel Order Button */}
                                {order.status !== "Completed" && order.status !== "Cancelled" && (
                                  <Button
                                    variant="outline"
                                    onClick={() => handleDeclineOrder(order.id)}
                                    size="sm"
                                    className="w-full border-red-300 text-red-650 hover:bg-red-50 hover:border-red-500 font-bold rounded-xl h-9 text-xs mt-1"
                                  >
                                    Cancel Order
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Collapsible Item Details Section */}
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedItemDetails(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                          className="w-full text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-between px-3 py-2 border border-gray-200 rounded-xl bg-white"
                        >
                          <span className="flex items-center gap-1.5">
                            <Package className="h-4 w-4 text-book-600" />
                            View Purchased Item Details ({order.item.title})
                          </span>
                          {expandedItemDetails[order.id] ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                        </Button>

                        {expandedItemDetails[order.id] && (
                          <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-xl space-y-3 text-xs text-gray-800 mt-2 animate-fadeIn">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                              <img src={order.item.thumbnail} alt={order.item.title} className="w-16 h-20 object-cover rounded-xl border shrink-0 bg-white" />
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <h5 className="font-bold text-gray-900 text-sm">{order.item.title}</h5>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                                  <div><span className="text-gray-400">Category/Type:</span> <span className="font-semibold text-gray-700 capitalize">{order.item_type || "Textbook"}</span></div>
                                  <div><span className="text-gray-400">Price:</span> <span className="font-semibold text-gray-900">R{order.grossAmount.toFixed(2)}</span></div>
                                  {order.itemDetails?.author && <div><span className="text-gray-400">Author/Brand:</span> <span className="font-semibold text-gray-700">{order.itemDetails.author}</span></div>}
                                  {order.itemDetails?.condition && <div><span className="text-gray-400">Condition:</span> <span className="font-semibold text-gray-700">{order.itemDetails.condition}</span></div>}
                                  {order.itemDetails?.grade && <div><span className="text-gray-400">Grade:</span> <span className="font-semibold text-gray-700">{order.itemDetails.grade}</span></div>}
                                </div>
                                {order.itemDetails?.description && (
                                  <p className="text-[11px] text-gray-600 bg-white p-2.5 rounded-lg border border-gray-150 mt-2 italic">
                                    "{order.itemDetails.description}"
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Fulfillment Stage Tracker */}
                      <div className="pt-4 border-t border-gray-100 space-y-3">
                        <p className="text-[9px] uppercase font-black text-gray-450 tracking-wider">Fulfillment Stage Tracker</p>
                        
                        {(() => {
                          const steps = ["placed", "accepted", "dispatched", "delivered", "completed"];
                          const stepLabels: Record<string, string> = {
                            placed: "Placed & Paid",
                            accepted: "Accepted",
                            dispatched: "Dispatched",
                            delivered: "Delivered",
                            completed: order.status === "Disputed" ? "Disputed" : "Completed",
                          };

                          let currIdx = 0;
                          if (order.status === "Pending Acceptance") currIdx = 0;
                          else if (order.status === "Awaiting Pickup") currIdx = 1;
                          else if (order.status === "In Transit") currIdx = 2;
                          else if (order.status === "Completed") currIdx = 4;
                          else if (order.status === "Disputed" || order.status === "Escalated") currIdx = 3;

                          return (
                            <div className="flex items-center justify-between relative px-2">
                              {steps.map((st, idx) => {
                                const isPassed = idx <= currIdx;
                                const isCurrent = idx === currIdx;

                                return (
                                  <div key={st} className="flex-1 flex flex-col items-center relative group">
                                    {idx > 0 && (
                                      <div className={`absolute top-3 right-[50%] w-full h-[2px] -z-10 ${
                                        idx <= currIdx ? "bg-indigo-600" : "bg-gray-200"
                                      }`} />
                                    )}

                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                                      isPassed
                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                        : "bg-white border-gray-300 text-gray-400"
                                    }`}>
                                      {isPassed ? <Check className="h-3 w-3 stroke-[3]" /> : idx + 1}
                                    </div>

                                    <span className={`text-[10px] font-bold mt-1.5 text-center ${
                                      isCurrent ? "text-indigo-900" : isPassed ? "text-gray-700" : "text-gray-400"
                                    }`}>
                                      {stepLabels[st]}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Order Dialog Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-sm bg-white rounded-2xl border border-gray-150 p-5 text-xs">
          <DialogHeader className="text-center sm:text-center flex flex-col items-center justify-center">
            <DialogTitle className="text-sm font-bold text-gray-900 flex items-center justify-center gap-2 text-center">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" /> Confirm Order Cancellation
            </DialogTitle>
            <DialogDescription className="text-[11px] text-gray-500 mt-1 text-center">
              Select or enter a reason for cancelling this order. The buyer will be notified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-3">
            {/* Quick-Select Preset Reason Chips */}
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1.5">Select a Reason:</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Item Out of Stock / Unavailable",
                  "Damaged or Defective Item",
                  "Buyer Requested Cancellation",
                  "Pricing or Listing Error",
                  "Other Reason",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all ${
                      cancelReason === reason
                        ? "bg-red-50 border-red-500 text-red-700 font-bold"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">Additional Context / Reason Details:</label>
              <textarea
                placeholder="Reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-red-500 outline-none bg-white min-h-[70px]"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 rounded-xl flex-1 text-xs"
              onClick={() => setCancelModalOpen(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex-1 text-xs shadow-sm"
              onClick={confirmDeclineOrder}
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Resolution Modal */}
      <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
        <DialogContent className="max-w-sm bg-white rounded-2xl border border-gray-150 p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-600" /> Resolve Buyer Issue
            </DialogTitle>
            <DialogDescription className="text-[11px] text-gray-500 mt-1">
              Provide a brief summary of how this issue was resolved with the buyer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <textarea
              placeholder="e.g. Agreed to a replacement book, sent tracking reference."
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-book-500 outline-none bg-white min-h-[80px]"
            />
          </div>
          <DialogFooter className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 rounded-xl flex-1 text-xs"
              onClick={() => setResolveModalOpen(false)}
              disabled={submittingResolution}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-650 hover:bg-emerald-700 text-white font-bold rounded-xl flex-1 text-xs"
              onClick={confirmResolveDispute}
              disabled={submittingResolution}
            >
              {submittingResolution ? "Saving..." : "Confirm Resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default OrdersTab;
