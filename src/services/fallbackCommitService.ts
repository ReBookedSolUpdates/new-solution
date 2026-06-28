import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  validatePickupSetup,
  normalizePickupData,
  PickupLockerData,
} from "@/utils/pickupTypeValidationUtils";

interface CommitData {
  order_id: string;
  seller_id: string;
  delivery_method?: "home" | "locker" | "door";
  locker_id?: string;
}

interface CommitResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Fallback commit service that directly updates the database
 * when edge functions are unavailable
 */
export class FallbackCommitService {

  static async commitToSale(commitData: CommitData): Promise<CommitResult> {
    try {

      const { order_id, seller_id, delivery_method = "door", locker_id } = commitData;

      // Validate inputs
      if (!order_id || !seller_id) {
        return {
          success: false,
          error: "Missing required fields: order_id or seller_id"
        };
      }

      // Get current order to verify permissions
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .eq("seller_id", seller_id)
        .single();

      if (orderError || !order) {
        return {
          success: false,
          error: "Order not found or access denied"
        };
      }

      // Check if already committed
      if (order.status === "committed" || order.status === "shipped") {
        return {
          success: false,
          error: "Order is already committed"
        };
      }

      // ── PICKUP / MEETUP ORDERS ─────────────────────────────
      // Pickup orders skip all courier/BobGo validation entirely.
      if (delivery_method === "pickup") {
        const { data: updatedPickupOrder, error: pickupUpdateError } = await supabase
          .from("orders")
          .update({
            status: "committed",
            delivery_method: "pickup",
            order_type: "pickup",
            pickup_status: "pending_pickup",
            pickup_committed_at: new Date().toISOString(),
            committed_at: new Date().toISOString(),
            delivery_status: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order_id)
          .select()
          .single();

        if (pickupUpdateError) {
          return { success: false, error: "Failed to commit pickup order" };
        }

        // Activity log — audit trail for pickup commitment
        try {
          await supabase.from("order_activity_log").insert({
            order_id,
            user_id: seller_id,
            activity_type: "pickup_committed",
            description: "Seller committed to pickup order via fallback service. Seven-day meetup window started.",
            metadata: {
              order_type: "pickup",
              pickup_status: "pending_pickup",
              refund_automated: false,
            },
          });
        } catch {
          // Non-critical — don't block the commit
        }

        // Notification for buyer
        try {
          await supabase.from("notifications").insert({
            user_id: order.buyer_id,
            title: "✅ Order Committed",
            message: "Your order has been committed. Please coordinate with the seller in chat to arrange a meetup location.",
            type: "success",
            metadata: { order_id, delivery_method: "pickup" },
          });
        } catch {
          // Non-critical
        }

        return {
          success: true,
          data: {
            order: updatedPickupOrder,
            message: "Pickup order committed — coordinate meetup via chat",
            delivery_method: "pickup",
          },
        };
      }

      // ── COURIER / LOCKER ORDERS ────────────────────────────
      // Normalize delivery method to pickup type
      const normalizedPickupType = delivery_method === "locker" ? "locker" : "door";

      // Prepare locker data if needed
      let lockerData: PickupLockerData | null = null;
      if (normalizedPickupType === "locker" && locker_id) {
        lockerData = { location_id: locker_id };
      }

      // Validate pickup setup
      const pickupErrors = validatePickupSetup(normalizedPickupType, lockerData, order.pickup_address_encrypted);
      if (pickupErrors.length > 0) {
        return {
          success: false,
          error: `Pickup validation failed: ${pickupErrors.join("; ")}`
        };
      }

      // Prepare update data with consistent pickup fields
      const updateData: any = {
        status: "committed",
        delivery_method: delivery_method,
        pickup_type: normalizedPickupType,
        committed_at: new Date().toISOString(),
      };

      // Add locker-specific data in both locations for consistency
      if (normalizedPickupType === "locker" && locker_id) {
        updateData.locker_id = locker_id;
        updateData.pickup_locker_location_id = locker_id;
        // Update delivery_data with locker info
        if (order.delivery_data) {
          updateData.delivery_data = {
            ...order.delivery_data,
            delivery_type: "locker",
            pickup_locker_location_id: locker_id,
          };
        }
        // Set earlier payment date (3 days earlier)
        const paymentDate = new Date();
        paymentDate.setDate(paymentDate.getDate() + 4); // 7 days standard - 3 days = 4 days
        updateData.estimated_payment_date = paymentDate.toISOString();
      } else if (normalizedPickupType === "door") {
        // Ensure delivery_data reflects door delivery
        if (order.delivery_data) {
          updateData.delivery_data = {
            ...order.delivery_data,
            delivery_type: "door",
          };
        }
      }

      // Update order status
      const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", order_id)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          error: "Failed to update order status"
        };
      }

      // Create notification for buyer (if notifications table exists)
      try {
        const notificationMessage = delivery_method === "locker"
          ? `Your order has been committed with locker delivery. You'll receive tracking information soon.`
          : `Your order has been committed. Courier pickup has been scheduled.`;

        await supabase
          .from("notifications")
          .insert({
            user_id: order.buyer_id,
            title: "✅ Order Committed",
            message: notificationMessage,
            type: "success",
            metadata: {
              order_id: order_id,
              delivery_method: delivery_method,
              ...(locker_id && { locker_id })
            }
          });
      } catch (notifError) {
        // Notification creation failed - non-critical
      }

      return {
        success: true,
        data: {
          order: updatedOrder,
          message: `Order committed with ${delivery_method} delivery`,
          delivery_method: delivery_method
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Check if edge functions are available
   */
  static async testEdgeFunctionAvailability(): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke("health-test", {
        body: { test: true },
      });

      return !error;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get commit method recommendation based on service availability
   */
  static async getRecommendedCommitMethod(): Promise<"edge-function" | "fallback"> {
    const edgeFunctionsAvailable = await this.testEdgeFunctionAvailability();
    return edgeFunctionsAvailable ? "edge-function" : "fallback";
  }
}

export default FallbackCommitService;
