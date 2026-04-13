import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { emailService } from "@/services/emailService";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CheckoutState,
  CheckoutBook,
  CheckoutAddress,
  DeliveryOption,
  OrderSummary,
  OrderConfirmation,
} from "@/types/checkout";
import {
  getSellerDeliveryAddress,
  getSimpleUserAddresses,
} from "@/services/simplifiedAddressService";
import {
  validateCheckoutStart,
  getSellerCheckoutData,
  getBuyerCheckoutData,
} from "@/services/checkoutValidationService";
import { supabase } from "@/integrations/supabase/client";
import { getProvinceFromLocker } from "@/utils/provinceExtractorUtils";
import debugLogger from "@/utils/debugLogger";
import Step1OrderSummary from "./Step1OrderSummary";
import Step1point5DeliveryMethod from "./Step1point5DeliveryMethod";
import Step2DeliveryOptions from "./Step2DeliveryOptions";
import Step3Payment from "./Step3Payment";
import Step4Confirmation from "./Step4Confirmation";
import AddressInput from "./AddressInput";
import { toast } from "sonner";
import { ActivityService } from "@/services/activityService";

interface CheckoutFlowProps {
  book: CheckoutBook;
}

const CheckoutFlow: React.FC<CheckoutFlowProps> = ({ book }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { removeFromCart, removeFromSellerCart } = useCart();
  const isMobile = useIsMobile();

  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    step: { current: 1, completed: [] },
    book,
    buyer_address: null,
    seller_address: null,
    seller_locker_data: null,
    seller_preferred_pickup_method: null,
    delivery_options: [],
    selected_delivery: null,
    order_summary: null,
    delivery_method: null,
    selected_locker: null,
    applied_coupon: null,
    loading: true,
    error: null,
  });

  const [orderConfirmation, setOrderConfirmation] =
    useState<OrderConfirmation | null>(null);

  const [isEditingAddress, setIsEditingAddress] = useState(false);

  useEffect(() => {
    initializeCheckout();
  }, [book.id, user?.id]);

  const initializeCheckout = async () => {
    console.log("[CHECKOUT_FLOW] Initializing checkout for book:", book.id, "User:", user?.id);
    if (!user?.id) {
      console.error("[CHECKOUT_FLOW] No user ID found");
      setCheckoutState((prev) => ({
        ...prev,
        error: "Please log in to continue",
        loading: false,
      }));
      return;
    }

    let bookData = null; // Declare outside try block to prevent undefined error in catch

    try {
      setCheckoutState((prev) => ({ ...prev, loading: true, error: null }));

      console.log("[CHECKOUT_FLOW] Using book from props:", book.id);
      bookData = book; // Assign to outer scope variable

      // Explicit type guard to ensure bookData is not null
      if (!bookData.id || !bookData.seller_id) {
        throw new Error("Invalid book data - missing required fields");
      }

      // Validate seller_id first
      if (!bookData.seller_id) {
        throw new Error("Book has no seller_id - this book listing is corrupted");
      }

      if (typeof bookData.seller_id !== 'string' || bookData.seller_id.length < 10) {
        throw new Error(`Invalid seller_id format: ${bookData.seller_id} (type: ${typeof bookData.seller_id})`);
      }

      // Initialize variables for seller data
      let sellerProfile = null;
      let sellerSubaccountCode = bookData.seller_subaccount_code;
      let sellerAddress = null;
      let sellerLockerData = null;
      let sellerPreferredPickupMethod: "locker" | "pickup" | null = null;

      // OPTIMIZATION: Parallelize independent seller data fetches using Promise.allSettled
      // These calls don't depend on each other, so we fetch them concurrently
      const [
        sellerProfileResult,
        subaccountResult,
        sellerAddressResult,
        sellerProfileForLockerResult,
      ] = await Promise.allSettled([
        // 1. Fetch seller profile (basic info)
        supabase
          .from("profiles")
          .select("id, full_name, first_name, last_name, email, encryption_status, addresses_same")
          .eq("id", bookData.seller_id)
          .maybeSingle(),
        // 2. Fetch subaccount (for payment, non-critical)
        supabase
          .from("banking_subaccounts")
          .select("subaccount_code")
          .eq("user_id", bookData.seller_id)
          .maybeSingle(),
        // 3. Fetch seller address (encrypted, may be slow)
        getSellerDeliveryAddress(bookData.seller_id),
        // 4. Fetch seller locker preference (in parallel with address)
        supabase
          .from("profiles")
          .select("preferred_delivery_locker_data, preferred_pickup_locker_data, preferred_pickup_method")
          .eq("id", bookData.seller_id)
          .maybeSingle(),
      ]);

      // Process seller profile result
      if (sellerProfileResult.status === 'fulfilled' && sellerProfileResult.value.data) {
        sellerProfile = sellerProfileResult.value.data;
        console.log("[CHECKOUT_FLOW] Seller profile:", sellerProfile);
      } else {
        console.warn("[CHECKOUT_FLOW] Seller profile fetch failed or empty:", sellerProfileResult);
      }

      // Process subaccount result (non-critical)
      if (subaccountResult.status === 'fulfilled' && subaccountResult.value.data?.subaccount_code) {
        sellerSubaccountCode = subaccountResult.value.data.subaccount_code;
      }

      // Process seller address result
      if (sellerAddressResult.status === 'fulfilled') {
        sellerAddress = sellerAddressResult.value;
        console.log("[CHECKOUT_FLOW] Seller address:", sellerAddress);
      } else if (sellerAddressResult.status === 'rejected') {
        console.error("[CHECKOUT_FLOW] Seller address fetch rejected:", sellerAddressResult.reason);
      }

      // Process seller locker preference result
      if (sellerProfileForLockerResult.status === 'fulfilled' && sellerProfileForLockerResult.value.data) {
        const profile = sellerProfileForLockerResult.value.data;

        // Load preferred pickup method
        if (profile.preferred_pickup_method) {
          sellerPreferredPickupMethod = profile.preferred_pickup_method;
        }

        // Only load locker if preferred method is locker
        // Coalesce delivery and pickup locker data since they should be the same
        const lockerData = (profile.preferred_delivery_locker_data || profile.preferred_pickup_locker_data) as any;
        if (profile.preferred_pickup_method === "locker" && lockerData) {
          if (lockerData.id && lockerData.name && lockerData.provider_slug) {
            sellerLockerData = lockerData;
          }
        }

        // Fallback: if no preferred method set but has locker, use locker as preference
        if (!sellerPreferredPickupMethod && lockerData) {
          if (lockerData.id && lockerData.name && lockerData.provider_slug) {
            sellerLockerData = lockerData;
            sellerPreferredPickupMethod = "locker";
          }
        }
      }

      // Default to pickup method if we have an address, otherwise locker
      if (!sellerPreferredPickupMethod) {
        sellerPreferredPickupMethod = sellerAddress ? "pickup" : "locker";
      }

      if (!sellerAddress && !sellerLockerData) {
        // Check if seller profile exists
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, encryption_status")
          .eq("id", bookData.seller_id);

        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        // If no profile found, do some additional debugging
        if (!profile && profileError?.code === 'PGRST116') {
          // Check if there are any profiles at all (to see if DB connection works)
          const { count, error: countError } = await supabase
            .from("profiles")
            .select("id", { count: 'exact', head: true });
        }

        // Handle missing profile case specifically
        if (!profile && profiles?.length === 0) {
          // This is a data integrity issue - the book exists but seller profile doesn't
          const errorMessage = `This item is currently unavailable due to a profile setup issue. Item ID: ${bookData.id}. ` +
            (user?.id === bookData.seller_id
              ? "Please contact support to restore your seller profile."
              : "Please contact support or try a different item.");

          throw new Error(errorMessage);
        }

        // Detect mobile device for better error messaging
        const isMobileDevice = () => {
          return typeof window !== 'undefined' && (
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth < 768
          );
        };

        const isMobile = isMobileDevice();

        // Provide specific guidance based on what's missing
        let errorMessage = "This book is temporarily unavailable for purchase. ";

        if (!profile) {
          errorMessage += "The seller's profile setup is incomplete.";
        } else {
          errorMessage += "The seller hasn't set up their pickup address or preferred locker location yet.";
        }

        // Mobile-specific guidance
        if (isMobile) {
          errorMessage += " If you're on mobile, try refreshing the page or switching to a desktop browser.";
        }

        // If this is the current user's book, give them guidance
        if (user?.id === bookData.seller_id) {
          errorMessage += " You can fix this by updating your pickup address or setting a preferred locker in your profile settings.";
        } else {
          if (isMobile) {
            errorMessage += " Mobile users can also try switching to a WiFi connection.";
          } else {
            errorMessage += " Please try again later or contact the seller.";
          }
        }

        throw new Error(errorMessage);
      }

      if (sellerAddress) {
        if (
          !(sellerAddress.streetAddress || sellerAddress.street) ||
          !sellerAddress.city ||
          !sellerAddress.province ||
          !(sellerAddress.postalCode || sellerAddress.postal_code)
        ) {
          throw new Error(
            `Seller address is incomplete. Missing fields: ${[
              !(sellerAddress.streetAddress || sellerAddress.street) && 'streetAddress',
              !sellerAddress.city && 'city',
              !sellerAddress.province && 'province',
              !(sellerAddress.postalCode || sellerAddress.postal_code) && 'postalCode'
            ].filter(Boolean).join(', ')}. Raw address: ${JSON.stringify(sellerAddress)}`,
          );
        }
      } else if (sellerLockerData) {
      }

      // Update book with complete seller data
      const updatedBook = {
        ...book,
        seller_subaccount_code: sellerSubaccountCode,
        seller: {
          id: sellerProfile?.id || bookData.seller_id,
          name: sellerProfile?.name || "Seller",
          email: sellerProfile?.email || "",
          hasAddress: true,
          hasSubaccount: true,
          isReadyForOrders: true,
        },
      };

      // Get buyer address (try multiple sources, prefer encrypted)
      let buyerAddress: CheckoutAddress | null = null;

      // 1) Standard checkout data helper (encrypted + legacy JSONB fallback)
      const buyerData = await getBuyerCheckoutData(user.id).catch((err) => {
        return null;
      });
      if (buyerData?.address) {
        buyerAddress = buyerData.address;
      }

      // 2) Direct encrypted fetch as a second attempt
      if (!buyerAddress) {
        try {
          const { getSimpleUserAddresses } = await import("@/services/simplifiedAddressService");
          const { normalizeAddressFields } = await import("@/utils/addressNormalizationUtils");
          const addrData = await getSimpleUserAddresses(user.id);
          const sa: any = addrData?.shipping_address || addrData?.pickup_address;
          const normalized = normalizeAddressFields(sa);

          if (normalized && normalized.street && normalized.city && normalized.province && normalized.postalCode) {
            buyerAddress = {
              street: normalized.street,
              city: normalized.city,
              province: normalized.province,
              postal_code: normalized.postalCode,
              country: normalized.country || "South Africa",
              suburb: normalized.suburb || "",
              latitude: normalized.latitude || null,
              longitude: normalized.longitude || null,
              type: normalized.type || "residential",
              additional_info: (sa as any).company || (sa as any).additional_info || ""
            };
          }
        } catch (err) {
        }
      }

      // 3) Comprehensive address service as final fallback
      if (!buyerAddress) {
        try {
          const { getUserAddresses } = await import("@/services/addressService");
          const full = await getUserAddresses(user.id);
          const sa: any = full?.shipping_address || full?.pickup_address;
          if ((sa?.street || sa?.streetAddress) && sa?.city && sa?.province && (sa?.postalCode || sa?.postal_code)) {
            buyerAddress = {
              street: sa.street || sa.streetAddress,
              city: sa.city,
              province: sa.province,
              postal_code: sa.postalCode || sa.postal_code,
              country: sa.country || "South Africa",
              suburb: sa.suburb || sa.local_area || "",
              latitude: sa.latitude || sa.lat || null,
              longitude: sa.longitude || sa.lng || null,
              type: sa.type || "residential",
              additional_info: sa.company || sa.additional_info || ""
            } as CheckoutAddress;
          }
        } catch (err) {
        }
      }

      if (buyerAddress) {
        console.log("[CHECKOUT_FLOW] Buyer address found:", buyerAddress);
      } else {
        console.warn("[CHECKOUT_FLOW] No buyer address found");
      }

      // Load buyer's preferred locker
      const { data: buyerProfile } = await supabase
        .from("profiles")
        .select("preferred_delivery_locker_data, preferred_pickup_locker_data")
        .eq("id", user.id)
        .maybeSingle();

      let buyerLocker = null;
      const lockerData = (buyerProfile?.preferred_delivery_locker_data || buyerProfile?.preferred_pickup_locker_data) as any;
      if (lockerData) {
        if (lockerData.id && lockerData.name) {
          buyerLocker = lockerData;
        }
      }

      // Determine available delivery methods and auto-select if only one exists
      const hasLockerOption = !!sellerLockerData;
      const hasHomeDeliveryOption = !!buyerAddress || !!sellerAddress;

      // Auto-select delivery method - default to locker when available
      let autoDeliveryMethod: "locker" | "home" | null = "locker";

      if (!hasLockerOption && hasHomeDeliveryOption) {
        // Even if the seller doesn't have a locker, we can still default to locker delivery
        // because we can do door-to-locker or similar.
        // But if there's no locker setup, we can stick with locker as default.
        autoDeliveryMethod = "locker";
      }

      setCheckoutState((prev) => ({
        ...prev,
        book: updatedBook,
        seller_address: sellerAddress,
        seller_locker_data: sellerLockerData,
        seller_preferred_pickup_method: sellerPreferredPickupMethod,
        buyer_address: buyerAddress,
        delivery_method: autoDeliveryMethod,
        selected_locker: buyerLocker,
        loading: false,
      }));
      console.log("[CHECKOUT_FLOW] Initialization complete. State updated.");

      if (!buyerAddress && !autoDeliveryMethod) {
        toast.info("Please add your delivery address to continue with checkout");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to initialize checkout";

      setCheckoutState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));

      // If this is the seller's own book, offer to go to profile
      if (bookData && user?.id === bookData.seller_id) {
        toast.error(errorMessage, {
          description: "Click here to update your pickup address",
          action: {
            label: "Go to Profile",
            onClick: () => navigate("/profile")
          }
        });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const goToStep = (step: 1 | 2 | 3 | 4 | 5) => {
    console.log(`[CHECKOUT_FLOW] Transitioning to step ${step} from ${checkoutState.step.current}`);
    // Always show all steps - no auto-skipping
    // Users should see the delivery method selection step
    setCheckoutState((prev) => ({
      ...prev,
      step: {
        current: step,
        completed: prev.step.completed.includes(step - 1)
          ? prev.step.completed
          : [...prev.step.completed, step - 1].filter((s) => s > 0),
      },
    }));

    // Track checkout step (non-blocking)
    try {
      if (step === 1) {
        // Step 1: Order Summary / Cart Viewed
        ActivityService.trackCheckoutStep(user?.id, "cart_viewed", {
          step: 1,
          step_name: "cart_viewed",
        });
      } else if (step === 3) {
        // Step 3: Payment page
        ActivityService.trackCheckoutStep(user?.id, "payment_initiated", {
          step: 3,
          step_name: "payment_initiated",
          order_value: checkoutState.order_summary?.total || book.price,
        });
      }
    } catch (trackingError) {
      debugLogger.error("CheckoutFlow", "Error tracking checkout step:", trackingError);
    }
  };

  const handleDeliverySelection = (delivery: DeliveryOption) => {
    console.log("[CHECKOUT_FLOW] Delivery selected:", delivery);
    // For locker delivery, we need the locker; for home delivery, we need the buyer address
    const isLockerDelivery = checkoutState.delivery_method === "locker" && checkoutState.selected_locker;

    if (!isLockerDelivery && !checkoutState.buyer_address) {
      toast.error("Please set your delivery address first");
      return;
    }

    const PLATFORM_FEE = 20; // R20 platform fee

    // For locker delivery, show locker location as delivery address
    let deliveryAddress = checkoutState.buyer_address || {
      street: "",
      city: "",
      province: "",
      postal_code: "",
      country: "South Africa",
    };
    if (checkoutState.delivery_method === "locker" && checkoutState.selected_locker) {
      const locker = checkoutState.selected_locker;
      const lockerProvince = (locker as any).province || getProvinceFromLocker(locker);
      deliveryAddress = {
        street: (locker as any).full_address || (locker as any).address || "",
        city: (locker as any).city || (locker as any).suburb || "Locker Location",
        province: lockerProvince || "",
        postal_code: (locker as any).postal_code || (locker as any).postalCode || "",
        country: "South Africa",
        additional_info: `Pickup at: ${locker.name}`,
      };
    }

    const bookPrice = checkoutState.book!.price;
    const couponDiscount = checkoutState.applied_coupon?.discountAmount || 0;
    const priceAfterDiscount = Math.max(0, bookPrice - couponDiscount);

    const orderSummary: OrderSummary = {
      book: checkoutState.book!,
      delivery,
      buyer_address: deliveryAddress,
      seller_address: checkoutState.seller_address,
      seller_locker_data: checkoutState.seller_locker_data,
      book_price: priceAfterDiscount,
      delivery_price: delivery.price,
      platform_fee: PLATFORM_FEE,
      total_price: priceAfterDiscount + delivery.price + PLATFORM_FEE,
      delivery_method: checkoutState.delivery_method,
      selected_locker: checkoutState.selected_locker,
      coupon_code: checkoutState.applied_coupon?.code,
      coupon_discount: couponDiscount,
      subtotal_before_discount: bookPrice,
    };

    setCheckoutState((prev) => ({
      ...prev,
      selected_delivery: delivery,
      order_summary: orderSummary,
    }));

    goToStep(4);
  };

  const handlePaymentSuccess = async (orderData: OrderConfirmation) => {
    console.log("[CHECKOUT_FLOW] Payment success:", orderData);
    setOrderConfirmation(orderData);

    // Track purchase (non-blocking)
    try {
      const orderId = orderData.order_id || book.id;
      const orderTotal = orderData.total_paid || book.price;
      const itemCount = 1;

      await ActivityService.trackPurchase(
        user?.id,
        orderId,
        orderTotal,
        itemCount,
        {
          seller_id: book.seller?.id,
          seller_name: book.seller?.name,
        }
      );
    } catch (trackingError) {
      debugLogger.error("CheckoutFlow", "Error tracking purchase:", trackingError);
    }

    // Remove book from cart after successful purchase
    // This fixes the bug where books remain in cart after Buy Now purchase
    try {
      // Remove from legacy cart
      removeFromCart(book.id);

      // Also remove from seller carts if it exists there
      if (book.seller?.id) {
        removeFromSellerCart(book.seller.id, book.id);
      }
    } catch (error) {
      // Don't block the checkout success flow if cart removal fails
    }

    // Email fallback system
    // Send purchase confirmation emails with multiple fallback layers
    try {
      const purchaseEmailData = {
        orderId: orderData.order_id || book.id,
        bookId: book.id,
        bookTitle: book.title,
        bookPrice: book.price,
        sellerName: book.seller?.name || "Seller",
        sellerEmail: book.seller?.email || "",
        buyerName: (user as any)?.name || user?.email?.split("@")[0] || "Buyer",
        buyerEmail: user?.email || "",
        orderTotal: orderData.total_paid || book.price,
        orderDate: new Date().toISOString()
      };

      const [sellerEmailResult, buyerEmailResult] = await Promise.allSettled([
        purchaseEmailData.sellerEmail
          ? emailService.sendSellerNewOrder(purchaseEmailData.sellerEmail, {
              sellerName: purchaseEmailData.sellerName,
              buyerName: purchaseEmailData.buyerName,
              orderId: String(purchaseEmailData.orderId),
              items: [
                {
                  name: purchaseEmailData.bookTitle,
                  quantity: 1,
                  price: purchaseEmailData.bookPrice,
                },
              ],
              totalAmount: `R${purchaseEmailData.orderTotal.toFixed(2)}`,
              expiresAt: new Date(
                Date.now() + 48 * 60 * 60 * 1000,
              ).toISOString(),
            })
          : Promise.resolve(null),
        purchaseEmailData.buyerEmail
          ? emailService.sendBuyerOrderPending(purchaseEmailData.buyerEmail, {
              buyerName: purchaseEmailData.buyerName,
              sellerName: purchaseEmailData.sellerName,
              orderId: String(purchaseEmailData.orderId),
              items: [
                {
                  name: purchaseEmailData.bookTitle,
                  quantity: 1,
                  price: purchaseEmailData.bookPrice,
                },
              ],
              totalAmount: `R${purchaseEmailData.orderTotal.toFixed(2)}`,
            })
          : Promise.resolve(null),
      ]);

      const sellerEmailSent =
        sellerEmailResult.status === "fulfilled" &&
        (sellerEmailResult.value === null || sellerEmailResult.value.success);
      const buyerEmailSent =
        buyerEmailResult.status === "fulfilled" &&
        (buyerEmailResult.value === null || buyerEmailResult.value.success);

      if (sellerEmailSent && buyerEmailSent) {
        toast.success("Confirmation emails sent to all parties");
      } else {
        toast.info("Confirmation emails are being processed", {
          description: "You'll receive your receipt shortly."
        });
      }

    } catch (emailError) {
      // Don't block checkout completion if emails fail
      toast.warning("Emails are being processed manually", {
        description: "Your purchase is complete but notifications may be delayed."
      });
    }

    goToStep(5);
  };

  const handlePaymentError = (error: string) => {
    console.error("[CHECKOUT_FLOW] Payment error:", error);
    const errorMessage = typeof error === 'string' ? error : String(error || 'Unknown error');
    const safeMessage = errorMessage === '[object Object]' ? 'Payment processing failed' : errorMessage;

    // Track checkout abandoned at payment step (non-blocking)
    try {
      const cartValue = checkoutState.order_summary?.total || book.price;
      ActivityService.trackCheckoutAbandoned(user?.id, "payment_initiated", cartValue);
    } catch (trackingError) {
      debugLogger.error("CheckoutFlow", "Error tracking checkout abandoned:", trackingError);
    }

    toast.error(`Payment failed: ${safeMessage}`);
    setCheckoutState((prev) => ({
      ...prev,
      error: `Payment failed: ${safeMessage}`,
    }));
  };

  const handleViewOrders = () => {
    navigate("/profile", { state: { tab: "orders" } });
  };

  const handleContinueShopping = () => {
    navigate("/textbooks");
  };

  const handleCancelCheckout = () => {
    // Track checkout abandoned (non-blocking)
    try {
      const cartValue = checkoutState.order_summary?.total || book.price;
      const currentStep = checkoutState.step.current;
      const stepName = currentStep === 1 ? "order_summary" : currentStep === 2 ? "delivery_options" : currentStep === 3 ? "payment_initiated" : "unknown";
      ActivityService.trackCheckoutAbandoned(user?.id, stepName, cartValue);
    } catch (trackingError) {
      debugLogger.error("CheckoutFlow", "Error tracking checkout abandoned:", trackingError);
    }

    // Navigate back to the book details page, replacing checkout in history
    // This prevents the back button from returning to the checkout page
    navigate(`/books/${book.id}`, { replace: true });
  };

  const handleAddressSubmit = (address: CheckoutAddress) => {
    setCheckoutState((prev) => ({
      ...prev,
      buyer_address: address,
    }));
    toast.success("Address saved! Loading delivery options...");
  };

  const handleSaveAddressToProfile = async (address: CheckoutAddress) => {

    if (!user?.id) {
      return;
    }

    try {
      const { saveSimpleUserAddresses } = await import(
        "@/services/simplifiedAddressService"
      );

      const simpleAddress = {
        streetAddress: address.street,
        city: address.city,
        province: address.province,
        postalCode: address.postal_code,
        additional_info: address.additional_info,
      };

      // Get existing addresses to preserve pickup address if it exists
      const { getSimpleUserAddresses } = await import(
        "@/services/simplifiedAddressService"
      );

      const existingAddresses = await getSimpleUserAddresses(user.id);

      // Save the entered address as shipping, preserve existing pickup address
      const pickupToSave = existingAddresses?.pickup_address || simpleAddress;
      const shippingToSave = simpleAddress;

      await saveSimpleUserAddresses(
        user.id,
        pickupToSave,
        shippingToSave,
        false, // Addresses are different
      );

      toast.success("Address saved to your profile!");
    } catch (error) {
      toast.error(
        "Failed to save address to profile, but proceeding with order",
      );
    }
  };

  const handleEditAddress = () => {
    setIsEditingAddress(true);
  };

  const handleAddressUpdate = (newAddress: CheckoutAddress) => {
    setCheckoutState(prev => ({
      ...prev,
      buyer_address: newAddress,
      selected_delivery: null, // Reset delivery selection when address changes
    }));
    setIsEditingAddress(false);
    toast.success("Address updated successfully");
  };

  const getProgressValue = () => {
    switch (checkoutState.step.current) {
      case 1:
        return 20;
      case 2:
        return 40;
      case 3:
        return 60;
      case 4:
        return 80;
      case 5:
        return 100;
      default:
        return 0;
    }
  };

  const getStepTitle = () => {
    switch (checkoutState.step.current) {
      case 1:
        return "Order Summary";
      case 2:
        return "Delivery Method";
      case 3:
        return "Delivery Options";
      case 4:
        return "Payment";
      case 5:
        return "Confirmation";
      default:
        return "Checkout";
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto mt-4 sm:mt-8 px-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm sm:text-base">
            Please log in to continue with your purchase.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (checkoutState.loading) {
    return (
      <div className="max-w-2xl mx-auto mt-4 sm:mt-8 px-4">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Initializing checkout...</p>
        </div>
      </div>
    );
  }

  if (checkoutState.error) {
    return (
      <div className="max-w-2xl mx-auto mt-4 sm:mt-8 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm sm:text-base">{checkoutState.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white py-6 sm:py-10 ${isMobile ? 'checkout-mobile' : ''}`}>
      <div className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 ${isMobile ? 'paystack-container-mobile' : ''}`}>
        {/* Progress Section */}
        <div className="mb-8 sm:mb-10">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
              <span className="hidden sm:inline">Step {checkoutState.step.current}: {getStepTitle()}</span>
              <span className="sm:hidden text-lg">{getStepTitle()}</span>
            </h1>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
            <Progress value={getProgressValue()} className="h-2.5" />
            <div className="flex justify-between mt-4 text-xs sm:text-sm font-medium text-gray-600 gap-1">
              <span className="text-center flex-1 px-1">
                <span className="hidden sm:inline">Summary</span>
                <span className="sm:hidden">Step 1</span>
              </span>
              <span className="text-center flex-1 px-1">
                <span className="hidden sm:inline">Method</span>
                <span className="sm:hidden">Step 2</span>
              </span>
              <span className="text-center flex-1 px-1">
                <span className="hidden sm:inline">Options</span>
                <span className="sm:hidden">Step 3</span>
              </span>
              <span className="text-center flex-1 px-1">
                <span className="hidden sm:inline">Payment</span>
                <span className="sm:hidden">Step 4</span>
              </span>
              <span className="text-center flex-1 px-1">
                <span className="hidden sm:inline">Complete</span>
                <span className="sm:hidden">Step 5</span>
              </span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        {checkoutState.step.current === 1 && (
          <Step1OrderSummary
            book={checkoutState.book!}
            sellerAddress={checkoutState.seller_address}
            onNext={() => goToStep(2)}
            onCancel={handleCancelCheckout}
            loading={checkoutState.loading}
          />
        )}

        {checkoutState.step.current === 2 && (
          <Step1point5DeliveryMethod
            bookTitle={checkoutState.book?.title || "your book"}
            preSelectedMethod={checkoutState.delivery_method}
            onSelectDeliveryMethod={(method, locker) => {
              setCheckoutState((prev) => ({
                ...prev,
                delivery_method: method,
                selected_locker: locker || null,
              }));
              goToStep(3);
            }}
            onBack={() => goToStep(1)}
            onCancel={handleCancelCheckout}
            loading={checkoutState.loading}
            sellerLockerData={checkoutState.seller_locker_data}
            sellerAddress={checkoutState.seller_address}
          />
        )}

        {checkoutState.step.current === 3 &&
          (checkoutState.seller_address || checkoutState.seller_locker_data) &&
          !isEditingAddress && (
            <>
              {checkoutState.delivery_method === "locker" && checkoutState.selected_locker ? (
                <Step2DeliveryOptions
                  buyerAddress={checkoutState.buyer_address}
                  sellerAddress={checkoutState.seller_address}
                  sellerLockerData={checkoutState.seller_locker_data}
                  sellerPreferredPickupMethod={checkoutState.seller_preferred_pickup_method}
                  onSelectDelivery={handleDeliverySelection}
                  onBack={() => goToStep(2)}
                  onCancel={handleCancelCheckout}
                  onEditAddress={handleEditAddress}
                  selectedDelivery={checkoutState.selected_delivery}
                  preSelectedLocker={checkoutState.selected_locker}
                />
              ) : checkoutState.buyer_address ? (
                <Step2DeliveryOptions
                  buyerAddress={checkoutState.buyer_address}
                  sellerAddress={checkoutState.seller_address}
                  sellerLockerData={checkoutState.seller_locker_data}
                  sellerPreferredPickupMethod={checkoutState.seller_preferred_pickup_method}
                  onSelectDelivery={handleDeliverySelection}
                  onBack={() => goToStep(2)}
                  onCancel={handleCancelCheckout}
                  onEditAddress={handleEditAddress}
                  selectedDelivery={checkoutState.selected_delivery}
                  preSelectedLocker={null}
                />
              ) : (
                <AddressInput
                  title="Enter Your Delivery Address"
                  onAddressSubmit={handleAddressSubmit}
                  onSaveToProfile={handleSaveAddressToProfile}
                  loading={checkoutState.loading}
                />
              )}
            </>
          )}

        {checkoutState.step.current === 3 &&
          checkoutState.buyer_address &&
          isEditingAddress && (
          <AddressInput
            title="Edit Your Delivery Address"
            initialAddress={checkoutState.buyer_address}
            onAddressSubmit={handleAddressUpdate}
            onSaveToProfile={handleSaveAddressToProfile}
            onCancel={() => setIsEditingAddress(false)}
            loading={checkoutState.loading}
          />
        )}

        {checkoutState.step.current === 4 && checkoutState.order_summary && (
          <Step3Payment
            orderSummary={checkoutState.order_summary}
            onBack={() => goToStep(3)}
            onCancel={handleCancelCheckout}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            userId={user.id}
            onCouponChange={(coupon) => {
              setCheckoutState((prev) => ({
                ...prev,
                applied_coupon: coupon,
              }));
            }}
          />
        )}

        {checkoutState.step.current === 5 && orderConfirmation && (
          <Step4Confirmation
            orderData={orderConfirmation}
            onViewOrders={handleViewOrders}
            onContinueShopping={handleContinueShopping}
          />
        )}
      </div>
    </div>
  );
};

export default CheckoutFlow;
