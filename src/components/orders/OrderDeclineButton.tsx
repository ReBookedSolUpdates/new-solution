import React, { useState } from "react";
import { EMAIL_FOOTER } from "@/email-templates/styles";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, XCircle, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OrderDeclineButtonProps {
  orderId: string;
  sellerId: string;
  bookTitle?: string;
  buyerName?: string;
  orderStatus?: string;
  onDeclineSuccess?: () => void;
  disabled?: boolean;
  className?: string;
}

const OrderDeclineButton: React.FC<OrderDeclineButtonProps> = ({
  orderId,
  sellerId,
  bookTitle = "this book",
  buyerName = "the buyer",
  orderStatus,
  onDeclineSuccess,
  disabled = false,
  className = "",
}) => {
  const [isDeclining, setIsDeclining] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Check if order can be declined
  const canDecline = orderStatus === "pending_commit";

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast.error("Please provide a reason for declining");
      return;
    }

    setIsDeclining(true);

    try {
      // Fetch order details for email sending
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          id,
          buyer_id,
          seller_id,
          buyer_email,
          seller_email,
          buyer_full_name,
          seller_full_name,
          items,
          total_amount
        `)
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        throw new Error("Failed to fetch order details for email sending");
      }

      // Call the decline-commit Supabase Edge Function
      const { data, error } = await supabase.functions.invoke(
        "decline-commit",
        {
          body: {
            order_id: orderId,
            seller_id: sellerId,
            reason: declineReason,
          },
        },
      );

      if (error) {
        // More specific error handling for edge functions
        let errorMessage = "Failed to call decline function";
        if (error.message?.includes('FunctionsHttpError')) {
          errorMessage = "Edge Function service is unavailable. This feature requires proper Supabase setup.";
        } else if (error.message?.includes('CORS')) {
          errorMessage = "CORS error - Edge Function configuration issue";
        } else {
          errorMessage = error.message || errorMessage;
        }

        throw new Error(errorMessage);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to decline order");
      }

      // Send decline notification emails to buyer and seller
      let emailsSent = false;
      try {
        const items = Array.isArray(orderData.items) ? orderData.items : [];
        const bookTitles = items.map((item: any) => item.title || "Book").join(", ");

        // Email to buyer
        const buyerEmailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Declined - Refund Processed</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f3fef7; padding: 20px; color: #1f4e3d; margin: 0; }
    .container { max-width: 500px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
    .header-error { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; }
    .info-box-error { background: #fef2f2; border: 1px solid #dc2626; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .info-box-success { background: #f0fdf4; border: 1px solid #10b981; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { background: #f3fef7; color: #1f4e3d; padding: 20px; text-align: center; font-size: 12px; line-height: 1.5; margin: 30px -30px -30px -30px; border-radius: 0 0 10px 10px; border-top: 1px solid #e5e7eb; }
    .link { color: #3ab26f; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-error">
      <h1>❌ Order Declined</h1>
    </div>
    <p>Hello ${orderData.buyer_full_name || "Buyer"},</p>
    <p>We're sorry to inform you that your order has been declined by the seller.</p>
    <div class="info-box-error">
      <h3>📋 Order Details</h3>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Book(s):</strong> ${bookTitles}</p>
      <p><strong>Amount:</strong> R${(orderData.total_amount / 100).toFixed(2)}</p>
      <p><strong>Reason:</strong> ${declineReason}</p>
    </div>
    <div class="info-box-success">
      <h3>✅ Refund Status</h3>
      <p>Your refund has been automatically processed and will appear in your account within 3-5 business days.</p>
    </div>
    <p>Browse more books at: <a href="https://rebookedsolutions.co.za/books" class="link">ReBooked Solutions</a></p>
    ${EMAIL_FOOTER}
  </div>
</body>
</html>`;

        // Email to seller
        const sellerEmailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Decline Confirmation</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f3fef7; padding: 20px; color: #1f4e3d; margin: 0; }
    .container { max-width: 500px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
    .header-error { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; }
    .info-box-success { background: #f0fdf4; border: 1px solid #10b981; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { background: #f3fef7; color: #1f4e3d; padding: 20px; text-align: center; font-size: 12px; line-height: 1.5; margin: 30px -30px -30px -30px; border-radius: 0 0 10px 10px; border-top: 1px solid #e5e7eb; }
    .link { color: #3ab26f; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-error">
      <h1>✅ Order Decline Confirmed</h1>
    </div>
    <p>Hello ${orderData.seller_full_name || "Seller"},</p>
    <p>You have successfully declined the order commitment.</p>
    <div class="info-box-success">
      <h3>📋 Order Details</h3>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Book(s):</strong> ${bookTitles}</p>
      <p><strong>Reason:</strong> ${declineReason}</p>
    </div>
    <p>The buyer has been notified and their payment has been refunded. Your book stock has been automatically restored.</p>
    ${EMAIL_FOOTER}
  </div>
</body>
</html>`;

        // Send both emails
        const emailPromises = [];

        if (orderData.buyer_email) {
          emailPromises.push(
            supabase.functions.invoke("send-email", {
              body: {
                to: orderData.buyer_email,
                subject: "Order Declined - Refund Processed",
                html: buyerEmailHtml,
              },
            })
          );
        }

        if (orderData.seller_email) {
          emailPromises.push(
            supabase.functions.invoke("send-email", {
              body: {
                to: orderData.seller_email,
                subject: "Order Decline Confirmation",
                html: sellerEmailHtml,
              },
            })
          );
        }

        const emailResults = await Promise.all(emailPromises);
        const allEmailsSuccessful = emailResults.every(result => !result.error && result.data?.success);
        emailsSent = allEmailsSuccessful;

        if (!emailsSent) {
          toast.warning("Order declined, but email delivery encountered issues. Please check your inbox.", {
            duration: 7000,
          });
        }
      } catch (emailError) {
        toast.warning("Order declined, but we couldn't send notification emails. We'll retry shortly.", {
          duration: 7000,
        });
      }

      // Show success messages
      toast.success("Order declined successfully", {
        description: "The buyer has been notified and will receive a refund.",
        duration: 5000,
      });

      if (emailsSent) {
        toast.info("✅ Decline notification emails sent to both parties", {
          duration: 7000,
        });
      }

      toast.info("Refund Processing", {
        description: `Refund of R${(orderData.total_amount / 100).toFixed(2)} is being processed for the buyer.`,
        duration: 7000,
      });

      // Reset form and close dialog
      setDeclineReason("");
      setIsDialogOpen(false);

      // Call success callback
      onDeclineSuccess?.();
    } catch (error: unknown) {
      let errorMessage = "Failed to decline order";
      const errorObj = error as Error;

      // Handle specific error messages
      if (errorObj.message?.includes("not found")) {
        errorMessage = "Order not found or cannot be declined";
        toast.error(errorMessage, {
          description: "Please check if the order is still in pending status.",
        });
      } else if (errorObj.message?.includes("not in pending")) {
        errorMessage = "Order is no longer in pending status";
        toast.error(errorMessage, {
          description: "Please refresh the page to see the latest status.",
        });
      } else {
        toast.error(errorMessage, {
          description:
            errorObj.message || "Please try again or contact support.",
          duration: 8000,
        });
      }
    } finally {
      setIsDeclining(false);
    }
  };

  // If order cannot be declined, show disabled state
  if (!canDecline) {
    return (
      <Button
        variant="outline"
        disabled
        className={`${className} cursor-not-allowed opacity-60`}
      >
        <XCircle className="w-4 h-4 mr-2 text-gray-400" />
        Cannot Decline
      </Button>
    );
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          disabled={disabled || isDeclining}
          className={`${className}`}
        >
          {isDeclining ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Declining...
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 mr-2" />
              Decline Order
            </>
          )}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="w-[90vw] max-w-[90vw] sm:max-w-md mx-auto my-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Decline Order
          </AlertDialogTitle>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>
              You are about to decline the order for{" "}
              <strong>"{bookTitle}"</strong> from {buyerName}.
            </p>

            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">
                What happens when you decline:
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• The buyer will be automatically refunded</li>
                <li>• Both you and the buyer will be notified by email</li>
                <li>• The order will be marked as declined</li>
                <li>• This action cannot be undone</li>
              </ul>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="decline-reason">
              Reason for declining <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="decline-reason"
              placeholder="Please provide a reason for declining this order..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="min-h-[80px]"
              required
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeclining}
            onClick={() => {
              setDeclineReason("");
              setIsDialogOpen(false);
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDecline}
            disabled={isDeclining || !declineReason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeclining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Declining...
              </>
            ) : (
              "Decline Order"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default OrderDeclineButton;

// Hook for easier usage
export const useOrderDecline = () => {
  const [isDeclining, setIsDeclining] = useState(false);

  const declineOrder = async (
    orderId: string,
    sellerId: string,
    reason: string,
  ) => {
    setIsDeclining(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "decline-commit",
        {
          body: { order_id: orderId, seller_id: sellerId, reason },
        },
      );

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to decline");

      return { success: true, data };
    } catch (error: unknown) {
      const errorObj = error as Error;
      return { success: false, error: errorObj.message };
    } finally {
      setIsDeclining(false);
    }
  };

  return { declineOrder, isDeclining };
};
