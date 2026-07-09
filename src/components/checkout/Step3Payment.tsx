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
  Wallet,
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
import { WalletService } from "@/services/walletService";

interface Step3PaymentProps {
  orderSummary: OrderSummary;
  onBack: () => void;
  onCancel?: () => void;
  onPaymentSuccess: (orderData: OrderConfirmation) => void;
  onPaymentError: (error: string) => void;
  onPaymentWindowOpened?: () => void;
  onPaymentAbandoned?: () => void;
  userId: string;
  onCouponChange?: (coupon: AppliedCoupon | null) => void;
}

const Step3Payment: React.FC<Step3PaymentProps> = ({
  orderSummary,
  onBack,
  onCancel,
  onPaymentSuccess,
  onPaymentError,
  onPaymentWindowOpened,
  onPaymentAbandoned,
  userId,
  onCouponChange,
}) => {
  const { user: authUser } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<PaymentError | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState<boolean>(false);
  const [customWalletAmount, setCustomWalletAmount] = useState<string>("");
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

  // Get max allowed wallet deduction: cannot exceed walletBalance, and cannot exceed totalWithCoupon
  const maxAllowedWalletDeduction = Math.min(walletBalance, totalWithCoupon);

  // If customWalletAmount is empty, use max allowed, otherwise parse it
  const parsedCustomAmount = customWalletAmount === "" ? maxAllowedWalletDeduction : parseFloat(customWalletAmount);
  const validCustomAmount = isNaN(parsedCustomAmount) || parsedCustomAmount < 0
    ? 0
    : Math.min(parsedCustomAmount, maxAllowedWalletDeduction);

  const walletDiscount = useWallet ? validCustomAmount : 0;
  const finalTotal = Math.max(0, totalWithCoupon - walletDiscount);

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

  // Fetch user email and wallet balance on mount
  React.useEffect(() => {
    const fetchUserEmailAndWallet = async () => {
      try {
        const email = await getUserEmail();
        setUserEmail(email);
      } catch (err) {
        // Error fetching user email
      }
      try {
        const bal = await WalletService.getWalletBalance();
        setWalletBalance(bal.available_balance || 0);
      } catch (err) {
        // Error fetching wallet balance
      }
    };
    fetchUserEmailAndWallet();
  }, []);

  const handleBobPayPayment = async () => {
    console.log("[STEP3_PAYMENT] handleBobPayPayment started. Total:", totalWithCoupon, "Final Total:", finalTotal);
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

      // Validate pickup setup based on delivery method (only for shipping/courier deliveries)
      if (orderSummary.delivery_method !== "pickup") {
        const pickupType = orderSummary.delivery_method === "locker" ? "locker" : "door";

        const pickupErrors = validatePickupSetup(
          pickupType,
          orderSummary.delivery_method === "locker" ? (orderSummary.selected_locker as any) : null,
          orderSummary.delivery_method === "home" ? (orderSummary.seller_address as any) : null
        );
        if (pickupErrors.length > 0) {
          throw new Error(`Pickup validation failed: ${pickupErrors.join("; ")}`);
        }
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

      // Check if buyer has phone number - required for shipping/courier deliveries
      if (orderSummary.delivery_method !== "pickup" && !buyerProfile?.phone_number) {
        throw new Error("Phone number is required for shipping. Please add your phone number in your profile before completing the purchase.");
      }

      const buyerFullName = buyerProfile?.full_name || buyerProfile?.name || `${buyerProfile?.first_name || ''} ${buyerProfile?.last_name || ''}`.trim() || 'Buyer';
      const sellerFullName = sellerProfile?.full_name || sellerProfile?.name || `${sellerProfile?.first_name || ''} ${sellerProfile?.last_name || ''}`.trim() || 'Seller';

      // Prepare locker data if delivery method is locker
      const deliveryType = orderSummary.delivery_method === "locker" ? "locker" : "door";
      const deliveryLockerData = orderSummary.delivery_method === "locker" ? orderSummary.selected_locker : null;
      const deliveryLockerLocationId = orderSummary.delivery_method === "locker" ? orderSummary.selected_locker?.id : null;

      // Step 2: Prepare and encrypt the shipping address (only for door deliveries, NOT for in-person pickup)
      let shipping_address_encrypted = "";
      if (deliveryType === "door" && orderSummary.delivery_method !== "pickup") {
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
        // Human-readable delivery method for display: "Home Delivery", "BobGo Locker" or "In-Person Pickup"
        delivery_method: orderSummary.delivery_method === "locker" 
          ? "BobGo Locker" 
          : orderSummary.delivery_method === "pickup"
            ? "In-Person Pickup"
            : "Home Delivery",
        delivery_locker_data: normalizedLockerData,
        delivery_locker_location_id: normalizedLockerLocationId,
        delivery_locker_provider_slug: normalizedLockerData?.provider_slug,
        // Pass seller's locker information explicitly
        pickup_locker_data: normalizedSellerLockerData,
        pickup_locker_location_id: normalizedSellerLockerLocationId,
        pickup_locker_provider_slug: normalizedSellerLockerData?.provider_slug,
        // CRITICAL: Pass seller's preferred pickup method to determine pickup_type correctly
        seller_preferred_pickup_method: sellerProfile?.preferred_pickup_method || (orderSummary.seller_locker_data ? "locker" : "pickup"),
        order_type: orderSummary.delivery_method === "pickup" ? "pickup" : "delivery",
        use_wallet: useWallet,
        max_wallet_deduction: useWallet ? Math.round(walletDiscount * 100) : null,
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

      // Step 3.6: Check if order is already fully paid via wallet
      if (createOrderResult.order?.payment_status === 'paid') {
        console.log("[STEP3_PAYMENT] Order fully paid via wallet. Bypassing BobPay.");
        toast.success("Order fully paid using wallet balance!");
        onPaymentSuccess({
          id: createOrderResult.order.id,
          order_id: createOrderResult.order.order_id,
          payment_reference: customPaymentId,
          book_id: orderSummary.book.id,
          seller_id: orderSummary.book.seller_id,
          seller_name: orderSummary.book.seller_name || sellerFullName,
          buyer_id: userId,
          buyer_name: buyerFullName,
          book_title: orderSummary.book.title,
          book_author: orderSummary.book.author || "",
          book_price: orderSummary.book_price,
          delivery_method: orderSummary.delivery_method === "locker" 
            ? "BobGo Locker" 
            : orderSummary.delivery_method === "pickup"
              ? "In-Person Pickup"
              : "Home Delivery",
          delivery_price: orderSummary.delivery_price,
          platform_fee: orderSummary.platform_fee || 20,
          total_paid: totalWithCoupon,
          created_at: createOrderResult.order.created_at || new Date().toISOString(),
          status: createOrderResult.order.status,
          coupon_discount: appliedCoupon?.discountAmount || 0,
          book: orderSummary.book,
        });
        return;
      }

      // Step 4: Initialize BobPay payment with the order_id for the remaining amount
      const amountToCharge = Number(finalTotal);
      if (!Number.isFinite(amountToCharge) || amountToCharge <= 0) {
        throw new Error('Invalid payment amount. Please refresh checkout and try again.');
      }

      const paymentRequest = {
        order_id: createdOrder.type === 'intent' ? null : createdOrder.id,
        order_intent_id: createdOrder.type === 'intent' ? createdOrder.id : null,
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
        is_sandbox: !IS_PRODUCTION,
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

        // Track payment_window_opened before redirecting
        if (onPaymentWindowOpened) {
          onPaymentWindowOpened();
        }

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

      {/* Wallet Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Wallet className="w-5 h-5 text-book-600" />
            Virtual Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-book-50 rounded-xl border border-book-100">
            <div className="space-y-1">
              <p className="text-sm font-medium text-book-900">
                Available Wallet Balance
              </p>
              <p className="text-xl font-bold text-book-700">
                {WalletService.formatZAR(walletBalance)}
              </p>
            </div>
            {walletBalance > 0 ? (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="use-wallet-checkbox"
                  checked={useWallet}
                  disabled={processing}
                  onChange={(e) => {
                    setUseWallet(e.target.checked);
                    if (!e.target.checked) {
                      setCustomWalletAmount("");
                    }
                  }}
                  className="w-4 h-4 text-book-600 border-gray-300 rounded focus:ring-book-500 cursor-pointer"
                />
                <label
                  htmlFor="use-wallet-checkbox"
                  className="text-sm font-semibold text-book-800 cursor-pointer select-none"
                >
                  Use Balance
                </label>
              </div>
            ) : (
              <p className="text-xs text-gray-500 font-medium">
                Balance is R0.00
              </p>
            )}
          </div>

          {useWallet && walletBalance > 0 && (
            <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2 mt-2">
              <label htmlFor="custom-wallet-amount" className="text-xs font-semibold text-gray-700 block">
                How much of your wallet balance would you like to use?
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500">R</span>
                <input
                  type="number"
                  id="custom-wallet-amount"
                  value={customWalletAmount}
                  placeholder={maxAllowedWalletDeduction.toFixed(2)}
                  min="0"
                  max={maxAllowedWalletDeduction.toFixed(2)}
                  step="0.01"
                  disabled={processing}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Prevent entering more than maxAllowedWalletDeduction
                    if (val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) <= maxAllowedWalletDeduction)) {
                      setCustomWalletAmount(val);
                    } else if (!isNaN(parseFloat(val)) && parseFloat(val) > maxAllowedWalletDeduction) {
                      setCustomWalletAmount(maxAllowedWalletDeduction.toFixed(2));
                    }
                  }}
                  className="w-full text-sm border-gray-300 rounded-lg focus:ring-book-500 focus:border-book-500 p-2 border"
                />
              </div>
              <p className="text-[10px] text-gray-500">
                Max you can use for this order: {WalletService.formatZAR(maxAllowedWalletDeduction)} (Leave blank to use maximum possible)
              </p>
            </div>
          )}

          {useWallet && walletDiscount > 0 && (
            <p className="text-xs text-green-600 font-semibold">
              ✓ R{walletDiscount.toFixed(2)} will be deducted from your wallet at checkout.
            </p>
          )}
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

          {/* Wallet Deduction */}
          {useWallet && walletDiscount > 0 && (
            <>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded">
                  <Wallet className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    Wallet Balance Applied
                  </p>
                  <p className="text-sm text-gray-600">
                    Deducted from your virtual wallet
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-purple-600">
                    -R{walletDiscount.toFixed(2)}
                  </p>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Total */}
          <div className="space-y-2">
            {(appliedCoupon && appliedCoupon.discountAmount > 0) || (useWallet && walletDiscount > 0) ? (
              <>
                <div className="flex justify-between items-center text-base font-semibold">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-600">
                    R{subtotal.toFixed(2)}
                  </span>
                </div>
                {appliedCoupon && appliedCoupon.discountAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600">Coupon Discount</span>
                    <span className="text-green-600 font-semibold">
                      -R{appliedCoupon.discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {useWallet && walletDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-purple-600">Wallet Deduction</span>
                    <span className="text-purple-600 font-semibold">
                      -R{walletDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-green-600">Total Amount Due</span>
                  <span className="text-green-600 font-extrabold text-xl">
                    R{finalTotal.toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span className="text-green-600 font-extrabold text-xl">
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
              onClick={() => {
                if (onPaymentAbandoned) {
                  onPaymentAbandoned();
                }
                onCancel();
              }}
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
            ) : finalTotal === 0 ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Pay with Wallet (R0.00 due)
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {useWallet ? `Pay R${finalTotal.toFixed(2)} with BobPay` : "Complete Payment"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step3Payment;
