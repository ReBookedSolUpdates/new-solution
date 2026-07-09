import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OrderConfirmation } from "@/types/checkout";
import Step4Confirmation from "@/components/checkout/Step4Confirmation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchItem, markItemSold } from "@/lib/resolveItem";
import { ActivityService } from "@/services/activityService";

const CheckoutSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<OrderConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  const reference = searchParams.get("reference");

  useEffect(() => {
    if (!reference) {
      setError("No order reference provided");
      setLoading(false);
      return;
    }
    fetchOrderData();
  }, [reference, retryCount]);

  /**
   * Fallback: If webhook hasn't processed yet, mark item as sold and update order.
   * Works for books, uniforms, and school_supplies.
   */
  const handlePostPaymentFallback = async (order: any) => {
    try {
      console.log("[CheckoutSuccess] Running post-payment fallback for order:", order.id);
      const itemId = order.item_id || order.book_id || order.items?.[0]?.item_id || order.items?.[0]?.book_id;
      const itemType = order.item_type || order.items?.[0]?.item_type || null;

      // Always try to mark as sold if it's not already (don't return early based on order status)
      if (itemId) {
        console.log("[CheckoutSuccess] Attempting to mark item as sold:", itemId, "Type:", itemType);
        const item = await fetchItem(itemId, itemType);
        if (item && !item.sold) {
          await markItemSold(itemId, item.tableSource, item);
          console.log("[CheckoutSuccess] Item marked as sold successfully via fallback");
        }
      }

      // If order is still in pending_payment, update it to paid/pending_commit
      if (order.status === "pending_payment" || order.status === "pending") {
        console.log("[CheckoutSuccess] Updating order status to pending_commit");
        const commitDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            status: "pending_commit",
            paid_at: new Date().toISOString(),
            commit_deadline: commitDeadline.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);
      }
    } catch (err) {
      console.error("[CheckoutSuccess] Post-payment fallback error:", err);
    }
  };

  const fetchOrderData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to find by payment_reference first, then by internal order_id (in case reference is ORD-xxx)
      let { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_reference", reference)
        .maybeSingle();

      if (!order && reference) {
        // Fallback: try by order_id (the human readable one) or internal id (only if valid UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuid = uuidRegex.test(reference);
        const orFilter = isUuid 
          ? `order_id.eq."${reference}",id.eq."${reference}"`
          : `order_id.eq."${reference}"`;

        const { data: fallbackOrder } = await supabase
          .from("orders")
          .select("*")
          .or(orFilter)
          .maybeSingle();
        order = fallbackOrder;
      }

      if (!order && reference) {
        // Check order_intents to see if order is not materialized yet
        const { data: intent } = await supabase
          .from("order_intents")
          .select("*")
          .eq("payment_reference", reference)
          .maybeSingle();

        if (intent) {
          console.log("[CheckoutSuccess] Found order intent. Triggering payment materialization fallback...");
          const { data: matResult, error: matError } = await supabase.rpc("materialize_order_from_intent", {
            p_payment_reference: reference
          });

          if (matResult?.success) {
            const { data: refetchedOrder } = await supabase
              .from("orders")
              .select("*")
              .eq("payment_reference", reference)
              .maybeSingle();
            order = refetchedOrder;
          } else {
            console.error("[CheckoutSuccess] Materialization fallback failed:", matError || matResult?.error);
          }
        }
      }

      if (orderError || !order) {
        console.error("[CheckoutSuccess] Order not found for reference:", reference);
        setError("Order not found. Your payment may still be processing. Please wait a moment and refresh.");
        setLoading(false);
        return;
      }

      let finalOrder = order;

      // If still pending_payment, wait up to 3 retries for webhook
      if (
        order.status === "pending_payment" ||
        (order.payment_status === "pending" && order.status === "pending")
      ) {
        setIsConfirmingPayment(true);

        if (retryCount < 3) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          setRetryCount((prev) => prev + 1);
          setLoading(false);
          return;
        } else {
          // Webhook didn't fire — use fallback
          setIsConfirmingPayment(false);
          await handlePostPaymentFallback(order);

          const { data: updatedOrder } = await supabase
            .from("orders")
            .select("*")
            .eq("payment_reference", reference)
            .maybeSingle();

          if (updatedOrder) finalOrder = updatedOrder;
        }
      }

      // One more fallback pass if still pending
      if (
        finalOrder.status === "pending_payment" ||
        finalOrder.payment_status === "pending"
      ) {
        await handlePostPaymentFallback(finalOrder);
        const { data: refreshedOrder } = await supabase
          .from("orders")
          .select("*")
          .eq("payment_reference", reference)
          .maybeSingle();

        if (refreshedOrder) finalOrder = refreshedOrder;
      }

      setIsConfirmingPayment(false);

      // Log view (fire-and-forget)
      if (finalOrder.buyer_id) {
        ActivityService.logActivity(
          "view_confirmation" as any,
          "order",
          finalOrder.buyer_id,
          finalOrder.id,
          { order_id: finalOrder.id, payment_reference: reference }
        ).catch(() => {});
      }

      // ── Resolve item from the correct table ─────────────────────────────
      const itemId = (finalOrder as any).item_id || (finalOrder as any).book_id;
      const itemType = (finalOrder as any).item_type || null;

      const resolvedItem = await fetchItem(itemId, itemType);

      if (!resolvedItem) {
        console.warn("[CheckoutSuccess] Could not fetch item details for", itemId);
      }

      // Ensure item is marked as sold IF we solved it
      if (resolvedItem && !resolvedItem.sold) {
        console.log("[CheckoutSuccess] Final check: marking item as sold if not already");
        await markItemSold(itemId, resolvedItem.tableSource, resolvedItem);
      }

      const metadata = (finalOrder as any).metadata || {};
      const sellerName = (finalOrder as any).seller_full_name || "Seller";

      // Price stored in cents in orders.amount
      const itemPrice = resolvedItem?.price
        ? resolvedItem.price  // already in rands from item tables
        : finalOrder.amount
        ? finalOrder.amount / 100
        : 0;

      const confirmation: OrderConfirmation = {
        id: finalOrder.id,
        order_id: finalOrder.payment_reference || finalOrder.id,
        payment_reference: finalOrder.payment_reference || reference || "",
        book_id: itemId,
        seller_id: finalOrder.seller_id,
        seller_name: sellerName,
        buyer_id: finalOrder.buyer_id,
        book_title: resolvedItem?.title || finalOrder.items?.[0]?.title || "Item",
        book_author: resolvedItem?.author,
        book_description: resolvedItem?.description,
        book_condition: resolvedItem?.condition,
        book_price: itemPrice,
        delivery_method: finalOrder.delivery_type || finalOrder.delivery_option || "Standard",
        delivery_price: finalOrder.selected_shipping_cost
          ? Number(finalOrder.selected_shipping_cost) / 100
          : 0,
        platform_fee: metadata.platform_fee ? metadata.platform_fee / 100 : 20,
        total_paid: finalOrder.amount ? finalOrder.amount / 100 : 0,
        created_at: finalOrder.created_at || new Date().toISOString(),
        status: finalOrder.status || "pending",
        coupon_discount: metadata.coupon_discount ? metadata.coupon_discount / 100 : undefined,
        // Pass full item object so Step4 can render all fields
        book: resolvedItem
          ? {
              id: resolvedItem.id,
              title: resolvedItem.title,
              author: resolvedItem.author,
              price: resolvedItem.price,
              condition: resolvedItem.condition || "",
              seller_id: resolvedItem.seller_id,
              image_url: resolvedItem.image_url,
              description: resolvedItem.description,
              category: resolvedItem.category,
              isbn: resolvedItem.isbn,
              publisher: resolvedItem.publisher,
              language: resolvedItem.language,
              curriculum: resolvedItem.curriculum,
              grade: resolvedItem.grade,
              province: resolvedItem.province,
              itemType: resolvedItem.tableSource,
              // uniform extras
              school_name: resolvedItem.school_name,
              gender: resolvedItem.gender,
              size: resolvedItem.size,
              color: resolvedItem.color,
              // supply extras
              subject: resolvedItem.subject,
            }
          : null,
      };

      setOrderData(confirmation);
      setLoading(false);
    } catch (err) {
      console.error("[CheckoutSuccess] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load order");
      setLoading(false);
    }
  };

  const handleViewOrders = () => {
    navigate("/profile?tab=activity");
  };

  const handleContinueShopping = () => {
    navigate("/profile?tab=activity");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
          <div>
            {isConfirmingPayment ? (
              <>
                <p className="text-gray-700 font-medium">Confirming your payment...</p>
                <p className="text-sm text-gray-500 mt-2">
                  {retryCount > 0
                    ? `Checking payment status (${retryCount} of 3)...`
                    : "This may take a moment"}
                </p>
              </>
            ) : (
              <p className="text-gray-600">Loading your order confirmation...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Unable to Load Order</p>
              <p>{error}</p>
              <p className="text-sm text-gray-600 mt-2">
                Reference: {reference ? reference.split(":")[0] : "N/A"}
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="flex gap-4 justify-center">
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
          <Button onClick={handleContinueShopping}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Order data could not be retrieved. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <Step4Confirmation
        orderData={orderData}
        onViewOrders={handleViewOrders}
        onContinueShopping={handleContinueShopping}
      />
    </div>
  );
};

export default CheckoutSuccess;
