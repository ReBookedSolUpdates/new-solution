import React, { useState } from "react";
import { EMAIL_FOOTER } from "@/email-templates/styles";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { EnhancedCommitService } from "@/services/enhancedCommitService";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
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

interface OrderCommitButtonProps {
  orderId: string;
  sellerId: string;
  bookTitle?: string;
  buyerName?: string;
  orderStatus?: string;
  onCommitSuccess?: () => void;
  disabled?: boolean;
  className?: string;
}

const OrderCommitButton: React.FC<OrderCommitButtonProps> = ({
  orderId,
  sellerId,
  bookTitle = "this book",
  buyerName = "the buyer",
  orderStatus,
  onCommitSuccess,
  disabled = false,
  className = "",
}) => {
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check if order is already committed
  const isAlreadyCommitted =
    orderStatus === "committed" ||
    orderStatus === "courier_scheduled" ||
    orderStatus === "shipped";

  const handleCommit = async () => {
    setIsCommitting(true);
    setIsDialogOpen(false);

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
          delivery_type,
          pickup_type,
          total_amount
        `)
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        throw new Error("Failed to fetch order details");
      }

      // 🔧 USE ENHANCED COMMIT SERVICE WITH EMAIL FALLBACKS
      const result = await EnhancedCommitService.commitWithEmailFallback(orderId, sellerId);

      if (!result.success) {
        throw new Error(result.message);
      }

      // Send confirmation emails to buyer and seller
      let emailsSent = false;
      try {
        const deliveryMethodText = orderData.delivery_type === 'locker' ? 'to your selected locker' : 'to your address';
        const pickupMethodText = orderData.pickup_type === 'locker' ? 'from your selected locker' : 'from your address';

        const items = Array.isArray(orderData.items) ? orderData.items : [];
        const bookTitles = items.map((item: any) => item.title || "Book").join(", ");

        // Email to buyer
        const buyerEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmed - Pickup Scheduled</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f3fef7; padding: 20px; color: #1f4e3d; margin: 0; }
    .container { max-width: 500px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
    .header { background: #3ab26f; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; }
    .footer { background: #f3fef7; color: #1f4e3d; padding: 20px; text-align: center; font-size: 12px; line-height: 1.5; margin: 30px -30px -30px -30px; border-radius: 0 0 10px 10px; border-top: 1px solid #e5e7eb; }
    .info-box { background: #f3fef7; border: 1px solid #3ab26f; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .link { color: #3ab26f; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Order Confirmed!</h1>
    </div>
    <h2>Great news, ${orderData.buyer_full_name || "Buyer"}!</h2>
    <p><strong>${orderData.seller_full_name || "Seller"}</strong> has confirmed your order and is preparing your book(s) for delivery ${deliveryMethodText}.</p>
    <div class="info-box">
      <h3>📚 Order Details</h3>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Book(s):</strong> ${bookTitles}</p>
      <p><strong>Seller:</strong> ${orderData.seller_full_name || "Seller"}</p>
      <p><strong>Delivery Method:</strong> ${orderData.delivery_type === 'locker' ? 'Locker Delivery' : 'Door-to-Door'}</p>
      <p><strong>Estimated Delivery:</strong> 2-3 business days</p>
    </div>
    <p>Happy reading! 📖</p>
    ${EMAIL_FOOTER}
  </div>
</body>
</html>`;

        // Email to seller
        const sellerEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Commitment Confirmed - Prepare for Pickup</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f3fef7; padding: 20px; color: #1f4e3d; margin: 0; }
    .container { max-width: 500px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
    .header { background: #3ab26f; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 20px -30px; }
    .footer { background: #f3fef7; color: #1f4e3d; padding: 20px; text-align: center; font-size: 12px; line-height: 1.5; margin: 30px -30px -30px -30px; border-radius: 0 0 10px 10px; border-top: 1px solid #e5e7eb; }
    .info-box { background: #f3fef7; border: 1px solid #3ab26f; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .link { color: #3ab26f; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Commitment Confirmed!</h1>
    </div>
    <h2>Thank you, ${orderData.seller_full_name || "Seller"}!</h2>
    <p>You've successfully committed to sell your book(s). The buyer has been notified and pickup has been scheduled ${pickupMethodText}.</p>
    <div class="info-box">
      <h3>📋 Order Details</h3>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Book(s):</strong> ${bookTitles}</p>
      <p><strong>Buyer:</strong> ${orderData.buyer_full_name || "Buyer"}</p>
      <p><strong>Pickup Method:</strong> ${orderData.pickup_type === 'locker' ? 'Locker Pickup' : 'Door-to-Door'}</p>
    </div>
    <p>${orderData.pickup_type === 'locker' ? 'Please drop off your package at the selected locker location.' : 'A courier will contact you within 24 hours to arrange pickup.'}</p>
    <p>Thank you for selling with ReBooked Solutions! 📚</p>
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
                subject: "Order Confirmed - Pickup Scheduled",
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
                subject: "Order Commitment Confirmed - Prepare for Pickup",
                html: sellerEmailHtml,
              },
            })
          );
        }

        const emailResults = await Promise.all(emailPromises);
        const allEmailsSuccessful = emailResults.every(result => !result.error && result.data?.success);
        emailsSent = allEmailsSuccessful;
      } catch (emailError) {
      }

      // Show success message with details about what worked
      let successMessage = "✅ Sale committed successfully!";
      if (result.edgeFunctionSuccess && emailsSent) {
        successMessage = "✅ Sale committed and all emails sent successfully!";
      } else if (emailsSent) {
        successMessage = "✅ Sale committed! Confirmation emails sent.";
      } else {
        successMessage = "✅ Sale committed! Emails are being processed.";
      }

      // Show enhanced success messages with email status
      toast.success(successMessage, {
        description: "🚚 Delivery/shipping processes have been triggered automatically!",
        duration: 5000,
      });

      // Show additional info about email delivery
      if (emailsSent) {
        toast.info("📧 Confirmation emails sent to buyer and seller", {
          description: "Both parties have been notified of the sale commitment.",
          duration: 7000,
        });
      } else {
        toast.info("📧 Emails are being processed", {
          description: "Notifications will be sent shortly.",
          duration: 7000,
        });
      }

      toast.info(
        "🔄 Delivery automation started - this may take a few minutes to complete.",
        {
          duration: 5000,
        },
      );

      // Call success callback
      onCommitSuccess?.();
    } catch (error: unknown) {
      let errorMessage = "Failed to commit to sale";
      const errorObj = error as Error;

      // Handle specific error messages
      if (errorObj.message?.includes("already committed")) {
        errorMessage = "This order has already been committed";
        toast.error(errorMessage, {
          description: "Please refresh the page to see the latest status.",
        });
      } else if (errorObj.message?.includes("not found")) {
        errorMessage = "Order not found or access denied";
        toast.error(errorMessage, {
          description:
            "Please check if you have permission to commit this order.",
        });
      } else {
        toast.error(errorMessage, {
          description:
            errorObj.message || "Please try again or contact support.",
          duration: 8000,
        });
      }
    } finally {
      setIsCommitting(false);
    }
  };

  // If already committed, show status
  if (isAlreadyCommitted) {
    return (
      <Button
        variant="outline"
        disabled
        className={`${className} cursor-not-allowed opacity-60`}
      >
        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
        Already Committed
      </Button>
    );
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="default"
          disabled={disabled || isCommitting}
          className={`${className} bg-green-600 hover:bg-green-700 text-white`}
        >
          {isCommitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Committing...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Commit to Sale
            </>
          )}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-sm sm:max-w-md mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Confirm Sale Commitment
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to commit to selling <strong>"{bookTitle}"</strong>{" "}
            to {buyerName}.
          </AlertDialogDescription>

          <div className="space-y-3 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">
                What happens next:
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Courier pickup will be automatically scheduled</li>
                <li>
                  • You'll receive pickup details and shipping label via email
                </li>
                <li>
                  • The buyer will be notified that their order is confirmed
                </li>
                <li>• You must be available during the pickup time window</li>
              </ul>
            </div>

            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-700">
                <strong>Important:</strong> Once committed, you are obligated to
                fulfill this order. Failure to provide the book for pickup may
                result in penalties.
              </p>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCommitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCommit}
            disabled={isCommitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isCommitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Committing...
              </>
            ) : (
              "Yes, Commit to Sale"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default OrderCommitButton;

// Hook for easier usage
export const useOrderCommit = () => {
  const [isCommitting, setIsCommitting] = useState(false);

  const commitToSale = async (orderId: string, sellerId: string) => {
    setIsCommitting(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "commit-to-sale",
        {
          body: { order_id: orderId, seller_id: sellerId },
        },
      );

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to commit");

      return { success: true, data };
    } catch (error: unknown) {
      const errorObj = error as Error;
      return { success: false, error: errorObj.message };
    } finally {
      setIsCommitting(false);
    }
  };

  return { commitToSale, isCommitting };
};
