import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { getOrCreateConversation } from "@/services/chatService";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  RefreshCw,
  X,
  Clock,
  TruckIcon,
  CheckCircle,
  MessageSquare,
  Loader2,
  Download,
  FileText,
} from "lucide-react";
import OrderCancellationService, {
  Order as BaseOrder,
  RescheduleQuote,
} from "@/services/orderCancellationService";
import { supabase } from "@/integrations/supabase/client";
import { ENV } from "@/config/environment";
import { Info } from "lucide-react";
import EnhancedOrderCommitButton from "./EnhancedOrderCommitButton";

// Extend order with shipping-related optional fields
type Order = BaseOrder & {
  buyer_id: string;
  delivery_status?: string | null;
  tracking_number?: string | null;
  selected_courier_name?: string | null;
  selected_service_name?: string | null;
  tracking_data?: any;
  delivery_data?: any;
  delivery_option?: string | null;
  delivery_method?: string | null;
  order_type?: string | null;
  buyer_confirmed_at?: string | null;
  seller_confirmed_at?: string | null;
};

interface OrderActionsPanelProps {
  order: Order;
  userRole: "buyer" | "seller";
  onOrderUpdate: () => void;
}

const OrderActionsPanel: React.FC<OrderActionsPanelProps> = ({
  order,
  userRole,
  onOrderUpdate,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleQuote, setRescheduleQuote] = useState<RescheduleQuote | null>(null);
  const [selectedRescheduleTime, setSelectedRescheduleTime] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isWaybillLoading, setIsWaybillLoading] = useState(false);
  const navigate = useNavigate();

  // Orders can be cancelled UNLESS delivery_status is "collected" or beyond
  // Non-cancellable statuses: ['collected', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'ready_for_pickup', 'ready']
  const orderStatusLower = (order.status || "").toLowerCase();
  const deliveryStatusLower = (order.delivery_status || "").toLowerCase();

  // Cannot cancel if delivery_status is collected or any status after it
  const nonCancellableStatuses = ["collected", "picked_up", "in_transit", "out_for_delivery", "delivered", "ready_for_pickup", "ready"];
  const isCancelledOrCompleted = ["cancelled", "completed"].includes(orderStatusLower);

  const canCancelOrder = !nonCancellableStatuses.includes(deliveryStatusLower) && !isCancelledOrCompleted;

  const showMissedPickupActions = userRole === "seller" && 
    (order.delivery_status === "pickup_failed" || order.delivery_status === "collection-failed-attempt");

  const showMissedDeliveryActions = userRole === "buyer" && 
    (order.delivery_status === "delivery-failed-attempt");

  const isPickup =
    order.delivery_option === "pickup" ||
    order.delivery_method === "pickup" ||
    order.order_type === "pickup";

  const handleBuyerCancel = async () => {
    setIsLoading(true);
    try {
      // Verify user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("You must be logged in to cancel an order");
      }

      // Get current session to ensure auth token is available
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error("Authentication session expired. Please log in again.");
      }

      // Use the unified cancel-order-with-refund function for ALL orders (committed or pending)
      // This ensures both shipment cancellation AND refund are processed
      const { data, error } = await supabase.functions.invoke("cancel-order-with-refund", {
        body: {
          order_id: order.id,
          reason: cancelReason || "Cancelled by Buyer",
          cancelled_by: "buyer",
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to send request to server");
      }

      if (!data) {
        throw new Error("No response from server");
      }

      if (!data.success) {
        throw new Error(data.error || "Cancellation failed");
      }

      toast.success(data.message || "Order cancelled and refund processed");
      setShowCancelDialog(false);

      // Refresh order data after successful cancellation
      setTimeout(() => {
        onOrderUpdate();
      }, 500);
    } catch (error: any) {
      toast.error(error?.message || "Failed to cancel order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Seller path calls the same edge function with buyer_id (allowed by backend)
  const handleSellerCancel = async () => {
    setIsLoading(true);
    try {
      // Verify user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("You must be logged in to cancel an order");
      }

      // Get current session to ensure auth token is available
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error("Authentication session expired. Please log in again.");
      }

      const { data, error } = await supabase.functions.invoke("cancel-order-with-refund", {
        body: {
          order_id: order.id,
          reason: cancelReason || "Cancelled by Seller",
          cancelled_by: "seller",
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to send request to server");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Cancellation failed");
      }

      toast.success(data.message || "Order cancelled successfully");
      setShowCancelDialog(false);

      // Refresh order data after successful cancellation
      setTimeout(() => {
        onOrderUpdate();
      }, 500);
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel order");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetRescheduleQuote = async () => {
    setIsLoading(true);
    try {
      const quote = await OrderCancellationService.getRescheduleQuote(order.id);
      if (quote) {
        setRescheduleQuote(quote);
        setShowRescheduleDialog(true);
      } else {
        toast.error("Unable to get reschedule quote. Please contact support.");
      }
    } catch (error) {
      toast.error("Failed to get reschedule quote.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReschedulePayment = async () => {
    if (!rescheduleQuote || !selectedRescheduleTime) {
      toast.error("Please select a reschedule time.");
      return;
    }

    setPaymentProcessing(true);
    try {
      const paymentReference = `reschedule_${order.id}_${Date.now()}`;
      toast.info("Payment processing...");

      setTimeout(async () => {
        const result = await OrderCancellationService.reschedulePickup(
          order.id,
          selectedRescheduleTime,
          paymentReference,
        );

        if (result.success) {
          toast.success(result.message);
          setShowRescheduleDialog(false);
          onOrderUpdate();
        } else {
          toast.error(result.message);
        }
        setPaymentProcessing(false);
      }, 2000);
    } catch (error) {
      toast.error("Payment failed. Please try again.");
      setPaymentProcessing(false);
    }
  };

  const handleCancelAfterMissedPickup = async () => {
    setIsLoading(true);
    try {
      const result = await OrderCancellationService.cancelAfterMissedPickup(order.id, cancelReason);

      if (result.success) {
        toast.success(result.message);
        setShowCancelDialog(false);
        onOrderUpdate();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to cancel order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  const getOrderStatusBadge = () => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: "Pending", color: "bg-yellow-500" },
      confirmed: { label: "Confirmed", color: "bg-blue-500" },
      cancelled_by_buyer: { label: "Cancelled by Buyer", color: "bg-red-500" },
      declined_by_seller: { label: "Declined by Seller", color: "bg-red-500" },
      cancelled_by_seller_after_missed_pickup: { label: "Cancelled by Seller", color: "bg-red-500" },
      delivered: { label: "Delivered", color: "bg-green-500" },
      cancelled: { label: "Cancelled", color: "bg-red-500" },
      committed: { label: "Committed", color: "bg-emerald-600" },
      pending_commit: { label: "Pending Commitment", color: "bg-amber-600" },
    };

    const config = statusConfig[order.status] || { label: order.status, color: "bg-gray-500" };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const getDeliveryStatusBadge = () => {
    if (!order.delivery_status) return null;

    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      created: { label: "Created", color: "bg-gray-500", icon: Clock },
      pending: { label: "Pickup Pending", color: "bg-yellow-500", icon: Clock },
      pickup_scheduled: { label: "Pickup Scheduled", color: "bg-blue-500", icon: Calendar },
      pickup_failed: { label: "Pickup Failed", color: "bg-red-500", icon: AlertTriangle },
      rescheduled_by_seller: { label: "Rescheduled", color: "bg-blue-500", icon: Calendar },
      collected: { label: "Collected", color: "bg-green-500", icon: TruckIcon },
      picked_up: { label: "Collected", color: "bg-green-500", icon: TruckIcon },
      in_transit: { label: "In Transit", color: "bg-blue-500", icon: TruckIcon },
      out_for_delivery: { label: "Out for Delivery", color: "bg-blue-600", icon: TruckIcon },
      delivered: { label: "Delivered", color: "bg-green-500", icon: CheckCircle },
    };

    const config = statusConfig[(order.delivery_status || "").toLowerCase()];
    if (!config) return null;
    const IconComponent = config.icon;
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleChat = async () => {
    setIsChatLoading(true);
    try {
      const orderAny = order as any;
      const listingId = order.book_id || orderAny.item_id;
      const buyerId = order.buyer_id;
      const sellerId = order.seller_id;
      
      if (!listingId || !buyerId || !sellerId) {
        throw new Error("Missing required information to open chat");
      }

      const conv = await getOrCreateConversation(
        listingId,
        buyerId,
        sellerId,
        (orderAny.item_type as "book" | "school_supply" | "uniform") || "book"
      );
      navigate(`/profile?tab=messages&conversation=${conv.id}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to open chat:", errorMsg);
      toast.error("Could not open chat. Please try again.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleDownloadWaybill = async () => {
    setIsWaybillLoading(true);
    try {
      // Try direct waybill_url first
      const directUrl = (order as any).waybill_url as string | undefined;
      if (directUrl) {
        window.open(directUrl, "_blank", "noopener,noreferrer");
        toast.success("Opening waybill…");
        return;
      }

      // Otherwise fetch from get-shipment-label edge function
      const { data, error } = await supabase.functions.invoke("get-shipment-label", {
        body: { order_id: order.id, label_type: "waybill" },
      });

      if (error) throw new Error(error.message || "Failed to fetch waybill");

      const url =
        (data as any)?.label_url ||
        (data as any)?.url ||
        (data as any)?.waybill_url ||
        (data as any)?.pdf_url;

      if (!url) {
        throw new Error("No waybill is available for this order yet.");
      }

      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Opening waybill…");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to download waybill";
      toast.error(msg);
    } finally {
      setIsWaybillLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Order Actions</span>
          <div className="flex gap-2">
            {getOrderStatusBadge()}
            {getDeliveryStatusBadge()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center gap-2 text-center justify-center">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="text-center">
            <p className="font-medium text-blue-900 mb-1">Need Help?</p>
            <p className="text-blue-700">If you have any issues with this order, please contact our support team for assistance.</p>
          </div>
        </div>

        {/* Chat Button */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleChat}
            disabled={isChatLoading}
            className="w-full border-book-300 text-book-700 hover:bg-book-50 hover:border-book-500 font-medium gap-2"
          >
            {isChatLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            {userRole === "buyer" ? "Chat to Seller" : "Chat to Buyer"}
          </Button>
        </div>

        {/* Buyer/Seller: Download Waybill (only when committed/shipped and tracking exists, and NOT a pickup order) */}
        {!isPickup && (userRole === "seller" || userRole === "buyer") &&
          (order.tracking_number ||
            ["committed", "in_transit", "out_for_delivery", "delivered", "collected", "picked_up"].includes(
              (order.status || "").toLowerCase()
            ) ||
            ["pickup_scheduled", "collected", "picked_up", "in_transit", "out_for_delivery", "delivered"].includes(
              (order.delivery_status || "").toLowerCase()
            )) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadWaybill}
              disabled={isWaybillLoading}
              className="w-full border-book-300 text-book-700 hover:bg-book-50 hover:border-book-500 font-medium gap-2"
            >
              {isWaybillLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Download Waybill
            </Button>
          )}

        {/* Commitment Action for Seller */}
        {userRole === "seller" && order.status === "pending_commit" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900">Pending Commitment</h4>
                <p className="text-sm text-amber-800">
                  The buyer has paid for this order. Please confirm your commitment to the sale to arrange courier pickup.
                </p>
              </div>
            </div>
            <EnhancedOrderCommitButton
              orderId={order.id}
              sellerId={order.seller_id}
              bookTitle={order.book?.title}
              buyerName={order.buyer?.name || (order.buyer as any)?.full_name || "Buyer"}
              orderStatus={order.status}
              onCommitSuccess={onOrderUpdate}
              className="w-full sm:w-auto"
            />
          </div>
        )}

        {/* Pickup / Meetup Handover Confirmation */}
        {isPickup && ["committed", "pending_delivery", "in_transit", "awaiting_confirmation"].includes((order.status || "").toLowerCase()) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-900">Meetup Handover</h4>
                <p className="text-sm text-emerald-800">
                  {userRole === "seller" 
                    ? "Confirm you have met up with the buyer and handed over the book." 
                    : "Confirm you have met up with the seller and received your book."}
                </p>
                {/* Show status of confirmations */}
                <div className="mt-2 text-xs space-y-1 text-emerald-700">
                  <p>• Seller Confirmation: {order.seller_confirmed_at ? "✅ Confirmed" : "⏳ Pending"}</p>
                  <p>• Buyer Confirmation: {order.buyer_confirmed_at ? "✅ Confirmed" : "⏳ Pending"}</p>
                </div>
              </div>
            </div>

            {((userRole === "seller" && !order.seller_confirmed_at) || 
              (userRole === "buyer" && !order.buyer_confirmed_at)) ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                    {userRole === "seller" ? "Confirm Handover Completed" : "Confirm Receipt"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl mx-auto">
                  <DialogHeader>
                    <DialogTitle>Confirm Handoff</DialogTitle>
                    <DialogDescription>
                      {userRole === "seller" 
                        ? "Are you sure you have delivered/handed over the order? This cannot be changed once confirmed." 
                        : "Are you sure you have received/gotten the order? This cannot be changed once confirmed."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-2 pt-2">
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </DialogTrigger>
                    <Button 
                      onClick={async () => {
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) throw new Error("Not authenticated");
                          const { data, error } = await supabase.rpc("confirm_order_pickup", {
                            p_order_id: order.id,
                            p_user_id: user.id
                          });
                          if (error) throw error;
                          if (data && typeof data === "object" && "success" in data && !data.success) {
                            throw new Error(data.error || "Failed to confirm pickup");
                          }
                          toast.success(userRole === "seller" ? "Handover confirmed!" : "Receipt confirmed!");
                          onOrderUpdate();
                        } catch (err: any) {
                          toast.error(err.message || "Failed to confirm pickup");
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                    >
                      Confirm
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <p className="text-xs font-semibold text-emerald-800 text-center bg-emerald-100/50 py-1.5 rounded-lg">
                You have confirmed this meetup. Waiting for the other party.
              </p>
            )}
          </div>
        )}

        {/* Missed Pickup Actions */}
        {showMissedPickupActions && (
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The courier attempted pickup but you were unavailable. Please choose an action below.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button onClick={handleGetRescheduleQuote} disabled={isLoading} className="flex items-center justify-center">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reschedule Pickup
              </Button>

              <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <X className="w-4 h-4 mr-2" />
                    Cancel Order
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel Order</DialogTitle>
                    <DialogDescription>
                      Cancel this order after missing pickup. The buyer will receive a full refund.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Reason (optional)</label>
                      <Textarea
                        placeholder="Please explain why you're cancelling..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="flex-1">
                        Keep Order
                      </Button>
                      <Button variant="destructive" onClick={handleCancelAfterMissedPickup} disabled={isLoading} className="flex-1">
                        {isLoading ? "Cancelling..." : "Cancel Order"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Missed Delivery Actions (Buyer) */}
        {showMissedDeliveryActions && (
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The courier attempted delivery but you were unavailable. Please reschedule the delivery below.
              </AlertDescription>
            </Alert>

            <Button onClick={handleGetRescheduleQuote} disabled={isLoading} className="w-full flex items-center justify-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reschedule Delivery
            </Button>
          </div>
        )}

        {/* Reschedule Dialog */}
        <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
          <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-md mx-auto my-auto">
            <DialogHeader>
              <DialogTitle>{showMissedDeliveryActions ? "Reschedule Delivery" : "Reschedule Pickup"}</DialogTitle>
              <DialogDescription>Choose a new {showMissedDeliveryActions ? "delivery" : "pickup"} time. A reschedule fee will apply.</DialogDescription>
            </DialogHeader>

            {rescheduleQuote && (
              <div className="space-y-4">
                <Alert>
                  <CreditCard className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Reschedule Fee: R{rescheduleQuote.reschedule_fee}</strong>
                    <br />This fee covers the additional courier coordination costs.
                  </AlertDescription>
                </Alert>

                <div>
                  <label className="text-sm font-medium">Select New {showMissedDeliveryActions ? "Delivery" : "Pickup"} Time</label>
                  <Select value={selectedRescheduleTime} onValueChange={setSelectedRescheduleTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a time..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rescheduleQuote.available_times.map((time) => (
                        <SelectItem key={time} value={time}>
                          {new Date(time).toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowRescheduleDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleReschedulePayment} disabled={!selectedRescheduleTime || paymentProcessing} className="flex-1">
                    {paymentProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay R{rescheduleQuote.reschedule_fee}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Order Information */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Item:</span>
              <p className="text-gray-600">{order.book?.title || "Marketplace Item"}</p>
            </div>
            {isPickup ? (
              <div>
                <span className="font-medium">Delivery Method:</span>
                <p className="text-gray-600">Pickup / Meetup</p>
              </div>
            ) : (
              <>
                <div>
                  <span className="font-medium">Courier:</span>
                  <p className="text-gray-600">{order.selected_courier_name || order.delivery_data?.provider || "—"}</p>
                </div>
                <div>
                  <span className="font-medium">Service:</span>
                  <p className="text-gray-600">{order.selected_service_name || order.delivery_data?.service_level || "—"}</p>
                </div>
                <div>
                  <span className="font-medium">Tracking:</span>
                  <p className="text-gray-600 break-all">{order.tracking_number || order.tracking_data?.tracking_number || "—"}</p>
                </div>
              </>
            )}
          </div>

          {/* Shipment Label / Sticker Download Button for Courier orders */}
          {!isPickup && (order.tracking_number || (order as any).tcg_shipment_id || (order as any).waybill_url) && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadWaybill}
                disabled={isWaybillLoading}
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-500 font-medium gap-2"
              >
                {isWaybillLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 text-blue-600" />
                )}
                Download Shipment Label / Sticker
              </Button>
            </div>
          )}

          {/* Cancel Order Button - matches Chat button style, blurred/disabled when not cancellable */}
          {!showMissedPickupActions && (
            <div className="mt-4 space-y-2">
              <Dialog open={showCancelDialog} onOpenChange={(open) => canCancelOrder && setShowCancelDialog(open)}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canCancelOrder}
                    className={`w-full border-red-300 text-red-700 hover:bg-red-50 hover:border-red-500 font-medium gap-2 ${
                      !canCancelOrder ? "opacity-40 blur-[1px] cursor-not-allowed pointer-events-none" : ""
                    }`}
                  >
                    <X className="h-4 w-4" />
                    Cancel Order
                  </Button>
                </DialogTrigger>
                <DialogContent hideCloseButton>
                  <DialogHeader>
                    <DialogTitle>Cancel Order</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to cancel this order? {userRole === "buyer" ? "You will receive a full refund." : "The buyer will be refunded."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Alert className="border-amber-300 bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-sm text-amber-800 ml-2">
                        <strong>Important:</strong> Once the courier collects this order, you will <strong>no longer be able to cancel it</strong>.
                      </AlertDescription>
                    </Alert>
                    <div>
                      <label className="text-sm font-medium">Reason (optional)</label>
                      <Textarea
                        placeholder={userRole === "buyer" ? "Please let us know why you're cancelling..." : "Please explain the cancellation..."}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="flex-1">
                        Keep Order
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={userRole === "buyer" ? handleBuyerCancel : handleSellerCancel}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        {isLoading ? "Cancelling..." : "Confirm Cancel"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {!canCancelOrder && (
                <p className="text-xs text-gray-500 text-center">
                  Order has been collected — cancellation no longer available.
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderActionsPanel;
