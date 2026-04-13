import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Package,
  Truck,
  MapPin,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { OrderSummary, OrderConfirmation } from "@/types/checkout";
import { AppliedCoupon } from "@/types/coupon";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import PaymentErrorHandler, {
  classifyPaymentError,
  PaymentError,
} from "@/components/payments/PaymentErrorHandler";
import { logError, getUserFriendlyErrorMessage } from "@/utils/errorLogging";
import { sendPurchaseWebhook } from "@/utils/webhookUtils";
import CouponInput from "./CouponInput";
import {
  getCachedOrderId,
  registerOrderCreation,
  isPaymentReferenceClaimed,
} from "@/utils/idempotencyUtils";
import {
  validatePickupSetup,
  normalizeLockerData,
  normalizePickupData,
} from "@/utils/pickupTypeValidationUtils";
import {
  normalizeAddressFields,
  prepareForStorage,
  prepareAddressForEncryption,
} from "@/utils/addressNormalizationUtils";
import { IS_PRODUCTION } from "@/config/envParser";

interface Step3PaymentProps {
  orderSummary: OrderSummary;
  onBack: () => void;
  onCancel?: () => void;
  onPaymentSuccess: (orderData: OrderConfirmation) => void;
  onPaymentError: (error: string) => void;
  userId: string;
  onCouponChange?: (coupon: AppliedCoupon | null) => void;
}

const Step3Payment: React.FC<Step3PaymentProps> = ({
  orderSummary,
  onBack,
  onCancel,
  onPaymentSuccess,
  onPaymentError,
  userId,
  onCouponChange,
}) => {
  const { user: authUser } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<PaymentError | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const isMobile = useIsMobile();

  // Calculate subtotal including delivery and fees
  const calculateSubtotal = (): number => {
    const platformFee = orderSummary.platform_fee || 20;
    return (
      orderSummary.book_price +
      orderSummary.delivery_price +
      platformFee
    );
  };

  const subtotal = calculateSubtotal();

  // Calculate total with applied coupon
  const calculateTotalWithCoupon = (): number => {
    const couponDiscount = appliedCoupon?.discountAmount || 0;
    return Math.max(0, subtotal - couponDiscount);
  };

  const totalWithCoupon = calculateTotalWithCoupon();

  const handleCouponApply = (coupon: AppliedCoupon) => {
    setAppliedCoupon(coupon);
    if (onCouponChange) {
      onCouponChange(coupon);
    }
  };

  const handleCouponRemove = () => {
    setAppliedCoupon(null);
    if (onCouponChange) {
      onCouponChange(null);
    }
  };

  // Fetch user email only
  React.useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const email = await getUserEmail();
        setUserEmail(email);
      } catch (err) {
        // Error fetching user email
      }
    };
    fetchUserEmail();
  }, []);

  const handleBobPayPayment = async () => {
    console.log("[STEP3_PAYMENT] handleBobPayPayment started. Total:", totalWithCoupon);
    setProcessing(true);
    setError(null);
    try {
      // Use cached user from AuthContext instead of calling supabase.auth.getUser() again
      if (!authUser || !authUser.email) {
        console.error("[STEP3_PAYMENT] User authentication error: No authUser or email");
        throw new Error("User authentication error");
      }

      const customPaymentId = `ORDER-${Date.now()}-${userId}`;
      console.log("[STEP3_PAYMENT] Generated payment ID:", customPaymentId);

      // Check for duplicate order submission (idempotency)
      const cachedOrderId = getCachedOrderId(customPaymentId);
      if (cachedOrderId) {
        throw new Error(`Order already being processed. Order ID: ${cachedOrderId}. Please wait and check your account.`);
      }

      // Validate pickup setup based on delivery method
      const pickupType = orderSummary.delivery_method === "locker" ? "locker" : "door";

      const pickupErrors = validatePickupSetup(
        pickupType,
        orderSummary.delivery_method === "locker" ? (orderSummary.selected_locker as any) : null,
        orderSummary.delivery_method === "home" ? (orderSummary.seller_address as any) : null
      );
      if (pickupErrors.length > 0) {
        throw new Error(`Pickup validation failed: ${pickupErrors.join("; ")}`);
      }

      const baseUrl = window.location.origin;

      // Step 1: Fetch buyer and seller profiles for denormalized data (in parallel)
      const [buyerProfileResult, sellerProfileResult] = await Promise.allSettled([
        supabase
          .from("profiles")
          .select("id, full_name, name, first_name, last_name, email, phone_number, shipping_address_encrypted, pickup_address_encrypted")
          .eq("id", userId)
          .single(),
        supabase
          .from("profiles")
          .select("id, full_name, name, first_name, last_name, email, phone_number, pickup_address_encrypted, preferred_pickup_method")
          .eq("id", orderSummary.book.seller_id)
          .single(),
      ]);

      const buyerProfile = buyerProfileResult.status === 'fulfilled' ? buyerProfileResult.value.data : null;
      const sellerProfile = sellerProfileResult.status === 'fulfilled' ? sellerProfileResult.value.data : null;

      // Check if buyer has phone number - required for shipping
      if (!buyerProfile?.phone_number) {
        throw new Error("Phone number is required for shipping. Please add your phone number in your profile before completing the purchase.");
      }

      const buyerFullName = buyerProfile?.full_name || buyerProfile?.name || `${buyerProfile?.first_name || ''} ${buyerProfile?.last_name || ''}`.trim() || 'Buyer';
      const sellerFullName = sellerProfile?.full_name || sellerProfile?.name || `${sellerProfile?.first_name || ''} ${sellerProfile?.last_name || ''}`.trim() || 'Seller';

      // Prepare locker data if delivery method is locker
      const deliveryType = orderSummary.delivery_method === "locker" ? "locker" : "door";
      const deliveryLockerData = orderSummary.delivery_method === "locker" ? orderSummary.selected_locker : null;
      const deliveryLockerLocationId = orderSummary.delivery_method === "locker" ? orderSummary.selected_locker?.id : null;

      // Step 2: Prepare and encrypt the shipping address (only for door deliveries)
      let shipping_address_encrypted = "";
      if (deliveryType === "door") {
        try {
          // Use comprehensive address preparation that preserves all fields
          const shippingObject = prepareAddressForEncryption(orderSummary.buyer_address);

          const { data: encResult, error: encError } = await supabase.functions.invoke(
            'encrypt-address',
            { body: { object: shippingObject } }
          );

          if (encError || !encResult?.success || !encResult?.data) {
            throw new Error(encError?.message || 'Failed to encrypt shipping address');
          }

          shipping_address_encrypted = JSON.stringify(encResult.data);
        } catch (addrError) {
          throw new Error(
            addrError instanceof Error
              ? addrError.message
              : 'Invalid shipping address. Please check all required fields.'
          );
        }
      }

      // Step 3: Create the order (before payment)
      // Normalize locker data if present
      const normalizedLockerData = deliveryLockerData ? normalizeLockerData(deliveryLockerData) : null;
      const normalizedLockerLocationId = normalizedLockerData?.location_id || null;

      // Normalize seller locker data if present
      const normalizedSellerLockerData = orderSummary.seller_locker_data ? normalizeLockerData(orderSummary.seller_locker_data) : null;
      const normalizedSellerLockerLocationId = normalizedSellerLockerData?.location_id || null;

      // Step 3.1: Call create-order edge function for atomic order creation with idempotency
      // This is the ONLY place orders should be created - the edge function handles idempotency checks
      // NOTE: All prices must be converted to cents (kobo) for backend consistency
      // CRITICAL: Pass seller's preferred pickup method to ensure pickup_type matches rate calculation
      const createOrderPayload = {
        buyer_id: userId,
        seller_id: orderSummary.book.seller_id,
        book_id: orderSummary.book.id,
        delivery_option: orderSummary.delivery.service_name,
        shipping_address_encrypted: shipping_address_encrypted || "",
        payment_reference: customPaymentId,
        selected_courier_slug: orderSummary.delivery.provider_slug || orderSummary.delivery.courier,
        selected_service_code: orderSummary.delivery.service_level_code || "",
        selected_courier_name: orderSummary.delivery.provider_name || orderSummary.delivery.courier,
        selected_service_name: orderSummary.delivery.service_name,
        // Delivery price in cents (kobo) for backend consistency
        selected_shipping_cost: Math.round(orderSummary.delivery_price * 100),
        delivery_type: deliveryType,
        // Human-readable delivery method for display: "Home Delivery" or "BobGo Locker"
        delivery_method: orderSummary.delivery_method === "locker" ? "BobGo Locker" : "Home Delivery",
        delivery_locker_data: normalizedLockerData,
        delivery_locker_location_id: normalizedLockerLocationId,
        delivery_locker_provider_slug: normalizedLockerData?.provider_slug,
        // Pass seller's locker information explicitly
        pickup_locker_data: normalizedSellerLockerData,
        pickup_locker_location_id: normalizedSellerLockerLocationId,
        pickup_locker_provider_slug: normalizedSellerLockerData?.provider_slug,
        // CRITICAL: Pass seller's preferred pickup method to determine pickup_type correctly
        seller_preferred_pickup_method: sellerProfile?.preferred_pickup_method || (orderSummary.seller_locker_data ? "locker" : "pickup"),
      };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in and try again.');
      }

      const { data: createOrderResult, error: createOrderError } = await supabase.functions.invoke(
        'create-order',
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: createOrderPayload,
        }
      );

      console.log("[STEP3_PAYMENT] create-order response:", { success: createOrderResult?.success, orderId: createOrderResult?.order?.id, error: createOrderError });

      if (createOrderError || !createOrderResult?.success) {
        throw new Error(
          createOrderError?.message || createOrderResult?.error || 'Failed to create order'
        );
      }

      const createdOrder = createOrderResult.order;
      if (!createdOrder?.id) {
        throw new Error('No order ID returned from create-order function');
      }

      // Register order creation for idempotency tracking
      registerOrderCreation(customPaymentId, createdOrder.id);

      // Step 3.5: Process affiliate earning if seller was referred
      supabase.functions.invoke('process-affiliate-earning', {
        body: {
          book_id: orderSummary.book.id,
          order_id: createdOrder.id,
          seller_id: orderSummary.book.seller_id,
        },
      }).catch(() => {
        // Affiliate earning processing error - non-blocking
      });

      // Step 4: Initialize BobPay payment with the order_id

      const amountToCharge = Number(totalWithCoupon);
      if (!Number.isFinite(amountToCharge) || amountToCharge <= 0) {
        throw new Error('Invalid payment amount. Please refresh checkout and try again.');
      }

      const paymentRequest = {
        order_id: createdOrder.id,
        amount: amountToCharge,
        email: buyerProfile?.email || authUser.email,
        mobile_number: buyerProfile?.phone_number || "",
        item_name: orderSummary.book.title,
        item_description: `Purchase of ${orderSummary.book.title} - ${orderSummary.book.author || "ReBooked Solutions"}`,
        custom_payment_id: customPaymentId,
        notify_url: 'https://kbpjqzaqbqukutflwixf.supabase.co/functions/v1/bobpay-webhook?type=payment',
        success_url: `${baseUrl}/checkout/success?reference=${customPaymentId}&type=payment`,
        pending_url: `${baseUrl}/checkout/pending?reference=${customPaymentId}&type=payment`,
        cancel_url: `${baseUrl}/checkout/cancel?reference=${customPaymentId}&type=payment`,
        buyer_id: userId,
      };

      const invokeBobPayInit = async (functionName: string) => {
        return await supabase.functions.invoke(functionName, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: paymentRequest,
        });
      };

      let { data: bobpayResult, error: bobpayError } = await invokeBobPayInit("bobpay-initialize-payment");
      console.log("[STEP3_PAYMENT] bobpay-initialize-payment response:", { success: bobpayResult?.success, url: !!(bobpayResult?.data?.payment_url || bobpayResult?.data?.url || bobpayResult?.payment_url || bobpayResult?.url), error: bobpayError });

      if (bobpayError || !bobpayResult?.success) {
        throw new Error(
          bobpayError?.message || bobpayResult?.error || "Failed to initialize BobPay payment"
        );
      }

      const paymentUrl = bobpayResult.data?.payment_url || bobpayResult.data?.url || bobpayResult.payment_url || bobpayResult.url;
      if (!paymentUrl) {
        throw new Error("No payment URL received from BobPay");
      }

      if (paymentUrl) {
        console.log("[STEP3_PAYMENT] Redirecting to BobPay:", paymentUrl);
        toast.success("Redirecting to payment page...");

        // Open payment page in the same tab
        window.location.href = paymentUrl;
      } else {
        console.error("[STEP3_PAYMENT] No payment URL received");
        throw new Error("No payment URL received from BobPay");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Payment initialization failed";
      const classifiedError = classifyPaymentError(errorMessage);
      setError(classifiedError);
      onPaymentError(errorMessage);
      toast.error("Payment initialization failed", {
        description: classifiedError.message,
        duration: 5000,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRetryPayment = () => {
    setError(null);
    setRetryCount((prev) => prev + 1);

    if (retryCount >= 2) {
      toast.warning(
        "Multiple payment attempts detected. Please contact support if issues persist.",
      );
    }
  };

  const handleContactSupport = () => {
    const subject = "Payment Issue - ReBooked Solutions";
    const body = `
I'm experiencing payment issues:

Order Details:
- Item: ${orderSummary.book.title}
- Total: R${orderSummary.total_price}
- Error: ${error?.message || "Unknown error"}

Retry Count: ${retryCount}
User ID: ${userId}
Time: ${new Date().toISOString()}
`;

    const mailtoLink = `mailto:support@rebookedsolutions.co.za?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");
  };

  // Get user email for payment (use cached authUser from AuthContext)
  const getUserEmail = async () => {
    if (!authUser || !authUser.email) {
      throw new Error("User authentication error");
    }
    return authUser.email;
  };


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment</h1>
        <p className="text-gray-600">Review and complete your purchase</p>
      </div>

      {/* Coupon Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Have a Coupon?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CouponInput
            subtotal={subtotal}
            onCouponApply={handleCouponApply}
            onCouponRemove={handleCouponRemove}
            appliedCoupon={appliedCoupon}
            disabled={processing}
          />
        </CardContent>
      </Card>

      {/* Order Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Item Details */}
          <div className="flex items-center gap-3">
            {orderSummary.book.image_url && (
              <img
                src={orderSummary.book.image_url}
                alt={orderSummary.book.title}
                className="w-16 h-20 object-cover rounded border"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
            )}
            <div className="flex-1">
              <h3 className="font-medium">{orderSummary.book.title}</h3>
              {orderSummary.book.author && (
                <p className="text-sm text-gray-600">
                  {orderSummary.book.author}
                </p>
              )}
              <p className="text-sm text-gray-500">
                {orderSummary.book.condition}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                R{orderSummary.book_price.toFixed(2)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Coupon Discount */}
          {appliedCoupon && appliedCoupon.discountAmount > 0 && (
            <>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    Coupon Discount ({appliedCoupon.code})
                  </p>
                  <p className="text-sm text-gray-600">
                    Promotion applied successfully
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    -R{appliedCoupon.discountAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Delivery Details */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded">
              <Truck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {orderSummary.delivery.service_name}
              </p>
              <p className="text-sm text-gray-600">
                {orderSummary.delivery.description}
              </p>
              <p className="text-sm text-gray-500">
                Estimated: {orderSummary.delivery.estimated_days} business day
                {orderSummary.delivery.estimated_days > 1 ? "s" : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                R{orderSummary.delivery_price.toFixed(2)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Buyers Protection Fee */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                Buyers Protection Fee
              </p>
              <p className="text-sm text-gray-600">
                Buyer Protection
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                R{(orderSummary.platform_fee || 20).toFixed(2)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="space-y-2">
            {appliedCoupon && appliedCoupon.discountAmount > 0 ? (
              <>
                <div className="flex justify-between items-center text-base font-semibold">
                  <span className="text-gray-500">Original Total</span>
                  <span className="text-gray-400 line-through">
                    R{subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-green-600">Total After Discount</span>
                  <span className="text-green-600">
                    R{totalWithCoupon.toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span className="text-green-600">
                  R{subtotal.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Address Card */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <MapPin className="w-4 h-4 text-book-600" />
            Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Locker delivery */}
          {orderSummary.delivery_method === "locker" && orderSummary.selected_locker ? (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Locker pickup</p>
              <p className="font-semibold text-gray-900 mt-1">
                {(orderSummary.selected_locker as any).name || "Selected locker"}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                {(orderSummary.selected_locker as any).full_address ||
                  (orderSummary.selected_locker as any).address ||
                  ""}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                We’ll deliver to your selected locker. You’ll receive pickup instructions once shipped.
              </p>
            </div>
          ) : (
            /* Home delivery */
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Home delivery</p>
              <div className="mt-2 space-y-1 text-sm text-gray-800">
                <p className="font-semibold text-gray-900">
                  {orderSummary.buyer_address.street}
                </p>
                <p className="text-gray-700">
                  {[orderSummary.buyer_address.suburb, orderSummary.buyer_address.city].filter(Boolean).join(", ")}
                </p>
                <p className="text-gray-700">
                  {[orderSummary.buyer_address.province, orderSummary.buyer_address.postal_code].filter(Boolean).join(" ")}
                </p>
                <p className="text-gray-600">{orderSummary.buyer_address.country}</p>
                {orderSummary.buyer_address.additional_info && (
                  <p className="text-xs text-gray-600 pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-700">Notes:</span> {orderSummary.buyer_address.additional_info}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <PaymentErrorHandler
          error={error}
          onRetry={handleRetryPayment}
          onContactSupport={handleContactSupport}
          onBack={onBack}
        />
      )}

      {/* Payment Information */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">Secure Payment</h3>
              <p className="text-sm text-gray-600">
                Powered by BobPay - Your payment information is encrypted and
                secure
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <ul className="list-disc list-inside space-y-1">
              <li>Payment will be processed immediately</li>
              <li>You'll receive an email confirmation</li>
              <li>Seller will be notified to prepare shipment</li>
              <li>You can track your order in your account</li>
            </ul>
          </div>
        </CardContent>
      </Card>



      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-6 border-t">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={processing}
          className="py-3 px-4 sm:px-6 min-h-[44px] border-gray-300 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex gap-3 flex-1">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={processing}
              className="py-3 px-4 sm:px-6 min-h-[44px] text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}

          <Button
            onClick={handleBobPayPayment}
            disabled={processing}
            className="flex-1 py-3 px-6 min-h-[44px] text-base font-semibold bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Complete Payment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step3Payment;
