import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Truck,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  X,
  Edit3,
  CheckCircle,
} from "lucide-react";
import { CheckoutAddress, DeliveryOption } from "@/types/checkout";
import { toast } from "sonner";
import { getAllDeliveryQuotes, type UnifiedQuote } from "@/services/unifiedDeliveryService";
import PudoLockerSelector from "@/components/checkout/BobGoLockerSelector";
import { BobGoLocation as PudoLocker } from "@/services/bobgoLocationsService";
import { getProvinceFromLocker } from "@/utils/provinceExtractorUtils";
import { useAuth } from "@/contexts/AuthContext";

interface Step2DeliveryOptionsProps {
  buyerAddress?: CheckoutAddress | null;
  sellerAddress: CheckoutAddress | null;
  sellerLockerData?: PudoLocker | null;
  sellerPreferredPickupMethod?: "locker" | "pickup" | null;
  onSelectDelivery: (option: DeliveryOption) => void;
  onBack: () => void;
  onCancel?: () => void;
  onEditAddress?: () => void;
  selectedDelivery?: DeliveryOption;
  preSelectedLocker?: PudoLocker | null;
  book?: any;
}

const Step2DeliveryOptions: React.FC<Step2DeliveryOptionsProps> = ({
  buyerAddress,
  sellerAddress,
  sellerLockerData,
  sellerPreferredPickupMethod,
  onSelectDelivery,
  onBack,
  onCancel,
  onEditAddress,
  selectedDelivery,
  preSelectedLocker,
  book,
}) => {
  const { user } = useAuth();
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [quotes, setQuotes] = useState<UnifiedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocker, setSelectedLocker] = useState<PudoLocker | null>(null);
  const [lockerRatesLoading, setLockerRatesLoading] = useState(false);
  const [localSelectedDelivery, setLocalSelectedDelivery] = useState<DeliveryOption | undefined>(selectedDelivery);

  const getParcelSizeRank = (sizeStr?: string | null): number => {
    if (!sizeStr) return 0;
    const s = String(sizeStr).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (s.includes("extrasmall") || s === "xs") return 1;
    if (s.includes("small") || s === "s") return 2;
    if (s.includes("medium") || s === "m") return 3;
    if (s.includes("extralarge") || s === "xl") return 5;
    if (s.includes("large") || s === "l") return 4;
    return 0;
  };

  const getQuoteSizeRank = (serviceName?: string | null): number => {
    if (!serviceName) return 0;
    const s = serviceName.toLowerCase();
    if (s.includes("extra small") || s.includes("extrasmall") || s.includes("xs")) return 1;
    if (s.includes("small") && !s.includes("extra")) return 2;
    if (s.includes("medium")) return 3;
    if (s.includes("extra large") || s.includes("extralarge") || s.includes("xl")) return 5;
    if (s.includes("large") && !s.includes("extra")) return 4;
    return 0;
  };

  const filterQuotesByParcelSize = (quotesResp: UnifiedQuote[], parcelSize?: string | null): UnifiedQuote[] => {
    if (!quotesResp || quotesResp.length === 0) return quotesResp;
    const itemRank = getParcelSizeRank(parcelSize);
    if (itemRank <= 1) return quotesResp;

    const validQuotes = quotesResp.filter((q) => {
      const qRank = getQuoteSizeRank(q.service_name);
      if (qRank > 0 && qRank < itemRank) {
        console.log(`[STEP2_DELIVERY] Discarded cheaper undersized quote "${q.service_name}" (Rank ${qRank} < Item Rank ${itemRank}) to protect seller fees.`);
        return false;
      }
      return true;
    });

    return validQuotes.length > 0 ? validQuotes : quotesResp;
  };

  useEffect(() => {
    console.log("[STEP2_DELIVERY] Component mounted. Buyer Address:", !!buyerAddress, "Seller Address:", !!sellerAddress, "Pre-selected Locker:", !!preSelectedLocker);
    
    const initializeLockerAndRates = async () => {
      // 1. If a locker was pre-selected in Step 1.5, use it immediately
      if (preSelectedLocker) {
        setSelectedLocker(preSelectedLocker);
        await recalculateRatesForLocker(preSelectedLocker);
        return;
      }

      // 2. Otherwise check if logged in buyer has a saved PUDO locker in their profile
      if (user?.id) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("preferred_delivery_locker_data, preferred_pickup_locker_data")
            .eq("id", user.id)
            .maybeSingle();

          const savedLocker = (profile?.preferred_delivery_locker_data || profile?.preferred_pickup_locker_data) as PudoLocker | null;
          if (savedLocker && savedLocker.id && savedLocker.name) {
            console.log("[STEP2_DELIVERY] Auto-selected buyer's saved PUDO locker from profile:", savedLocker.name);
            setSelectedLocker(savedLocker);
            await recalculateRatesForLocker(savedLocker);
            return;
          }
        } catch (err) {
          console.warn("[STEP2_DELIVERY] Failed to load buyer saved locker:", err);
        }
      }

      // 3. Fallback: load home/standard delivery options if address exists
      if (buyerAddress?.street && buyerAddress?.city && buyerAddress?.postal_code) {
        await fetchDeliveryOptions();
      } else {
        setLoading(false);
      }
    };

    initializeLockerAndRates();
  }, [buyerAddress, sellerAddress, sellerLockerData, preSelectedLocker, user?.id]);

  useEffect(() => {
    // Recalculate rates when a locker is selected
    if (selectedLocker && selectedDelivery?.courier === "bobgo") {
      recalculateRatesForLocker(selectedLocker);
    } else if (!selectedLocker && selectedDelivery?.courier === "bobgo" && buyerAddress?.street) {
      // Revert to original home delivery rates if locker is deselected
      fetchDeliveryOptions();
    }
  }, [selectedLocker]);

  useEffect(() => {
    // Sync prop selection to local state
    setLocalSelectedDelivery(selectedDelivery);
  }, [selectedDelivery]);

  useEffect(() => {
    // Auto-select first delivery option when locker options are loaded and none is selected yet
    if (deliveryOptions.length > 0 && !localSelectedDelivery && preSelectedLocker) {
      const firstOption = deliveryOptions[0];
      setLocalSelectedDelivery(firstOption);
    }
  }, [deliveryOptions, preSelectedLocker]);

  const recalculateRatesForLocker = async (locker: PudoLocker) => {
    console.log("[STEP2_DELIVERY] Recalculating rates for locker:", locker.name, locker.id);
    setLockerRatesLoading(true);
    setError(null);

    try {
      if (!locker.id || !locker.provider_slug) {
        throw new Error("Locker is missing required information (ID or provider slug)");
      }

      // Determine if seller has only locker (no physical address)
      const sellerHasOnlyLocker = !sellerAddress && sellerLockerData;

      // Log provider info for debugging
      console.log("[STEP2_DELIVERY] Provider slugs:", {
        buyer: locker.provider_slug,
        seller: sellerLockerData?.provider_slug,
        sellerHasOnlyLocker
      });

      // Relaxed validation: let the API handle the provider match
      // We only warn if there's a mismatch for locker-to-locker
      if (sellerHasOnlyLocker && locker.provider_slug && sellerLockerData?.provider_slug) {
        if (locker.provider_slug !== sellerLockerData.provider_slug) {
          console.warn(
            `Locker provider mismatch: Seller's locker uses "${sellerLockerData.provider_slug}" but you selected a "${locker.provider_slug}" locker.`
          );
          // Instead of throwing, we'll proceed and let the API return rates if possible,
          // but we'll set a flag to show a warning if no rates are found.
        }
      }

      const quoteRequest: any = {
        weight: 2, // Standard book weight for better rate estimation
        deliveryLocker: {
          locationId: String(locker.id || ""),
          providerSlug: locker.provider_slug || "tcg-locker",
        },
        user_id: user?.id,
      };

      // Guard: ensure deliveryLocker has a valid ID  
      if (!quoteRequest.deliveryLocker.locationId) {
        throw new Error("Buyer locker is missing an ID");
      }

      // Always include buyer's physical address if available, even for locker delivery
      if (buyerAddress?.street) {
        quoteRequest.to = {
          streetAddress: buyerAddress.street,
          suburb: buyerAddress.suburb || "",
          city: buyerAddress.city,
          province: buyerAddress.province,
          postalCode: buyerAddress.postal_code,
          type: buyerAddress.type || "residential",
          lat: buyerAddress.latitude,
          lng: buyerAddress.longitude,
          company: (buyerAddress as any).additional_info || "",
        };
      }

      // If seller has only locker, use it as the collection point;
      // otherwise use address, and optionally include locker if they have one
      if (sellerAddress) {
        quoteRequest.from = {
          streetAddress: sellerAddress.street,
          suburb: sellerAddress.suburb || "",
          city: sellerAddress.city,
          province: sellerAddress.province,
          postalCode: sellerAddress.postal_code,
          type: sellerAddress.type || "residential",
          lat: sellerAddress.latitude,
          lng: sellerAddress.longitude,
          company: (sellerAddress as any).additional_info || "",
        };

        // If they also have a locker, include it
        if (sellerLockerData?.id) {
          quoteRequest.sellerCollectionPickupPoint = {
            locationId: sellerLockerData.id,
            providerSlug: sellerLockerData.provider_slug || "tcg-locker",
          };
        }
      } else if (sellerLockerData?.id && sellerLockerData?.provider_slug) {
        quoteRequest.sellerCollectionPickupPoint = {
          locationId: sellerLockerData.id,
          providerSlug: sellerLockerData.provider_slug,
        };
      } else {
        console.error("[STEP2_DELIVERY] Recalculate - Missing both address and locker for seller:", { sellerAddress, sellerLockerData });
        throw new Error("No seller address or locker location available for rate calculation");
      }

      console.log("[STEP2_DELIVERY] Recalculate - About to call getAllDeliveryQuotes with:", JSON.stringify({
        requestId: "recalc-" + Math.random().toString(36).substring(7),
        deliveryLocker: quoteRequest.deliveryLocker,
        sellerCollectionPickupPoint: quoteRequest.sellerCollectionPickupPoint,
        hasFrom: !!quoteRequest.from,
        hasTo: !!quoteRequest.to,
        fromData: quoteRequest.from ? { street: quoteRequest.from.streetAddress, city: quoteRequest.from.city, code: quoteRequest.from.postalCode } : null,
        toData: quoteRequest.to ? { street: quoteRequest.to.streetAddress, city: quoteRequest.to.city, code: quoteRequest.to.postalCode } : null
      }));

      // Add a client-side timeout of 10 seconds to the quote request
      const quoteTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Shipping rates request timed out")), 10000)
      );

      const quotesResp = await Promise.race([
        getAllDeliveryQuotes(quoteRequest),
        quoteTimeout
      ]) as UnifiedQuote[];

      console.log("[STEP2_DELIVERY] Recalculate - Received quotes response:", { length: quotesResp?.length, isArray: Array.isArray(quotesResp) });

      if (!quotesResp || quotesResp.length === 0) {
        if (sellerHasOnlyLocker && sellerLockerData?.provider_slug && locker.provider_slug !== sellerLockerData.provider_slug) {
          throw new Error(`No shipping rates found. This is likely because the seller's locker (${sellerLockerData.provider_slug}) is incompatible with your selected locker (${locker.provider_slug}). Please go back and select a compatible locker.`);
        }
        throw new Error("No shipping quotes could be found for this route.");
      }

      const itemParcelSize = book?.parcelSize || (book as any)?.parcel_size;
      const filteredQuotes = filterQuotesByParcelSize(quotesResp, itemParcelSize);

      setQuotes(filteredQuotes);

      const DELIVERY_MARKUP = 9;
      const options: DeliveryOption[] = filteredQuotes.map((q) => {
        let price = q.cost + DELIVERY_MARKUP;
        // Enforce R120 for Standard Delivery as requested by user
        if (q.service_name?.toLowerCase().includes("standard")) {
          price = Math.max(price, 120);
        }

        return {
          courier: "bobgo",
          service_name: q.service_name,
          price: price,
          estimated_days: typeof q.transit_days === "number" ? q.transit_days : 3,
          description: `${q.provider_name || q.provider || "Courier"} - ${q.features?.join(", ") || "Tracked"}`,
          zone_type: "locker",
          provider_name: q.provider_name,
          provider_slug: q.provider_slug,
          service_level_code: q.service_level_code,
        };
      });

      if (options.length > 0) {
        setDeliveryOptions(options);
      }
    } catch (err: any) {
      console.error("[STEP2_DELIVERY] Recalculate - Error in rate calculation:", err);
      const msg = err.message || "Failed to recalculate rates";
      setError(msg);
      toast.warning(msg);
    } finally {
      setLockerRatesLoading(false);
      setLoading(false);
    }
  };

  const fetchDeliveryOptions = async () => {
    console.log("[STEP2_DELIVERY] Fetching delivery options...");
    setLoading(true);
    setError(null);

    try {
      // Use seller's preferred pickup method to determine which address to use for rates
      const useLockerForRates =
        sellerPreferredPickupMethod === "locker" && sellerLockerData?.id && sellerLockerData?.provider_slug;
      const useAddressForRates =
        sellerPreferredPickupMethod === "pickup" && sellerAddress;

      // Fallback if no preference: use locker if available, otherwise use address
      const sellerHasOnlyLocker = !sellerAddress && sellerLockerData;

      if ((useLockerForRates || sellerHasOnlyLocker) && sellerLockerData?.id && sellerLockerData?.provider_slug) {
        const quoteRequest: any = {
          weight: 2,
          sellerCollectionPickupPoint: {
            locationId: sellerLockerData.id,
            providerSlug: sellerLockerData.provider_slug,
          },
          user_id: user?.id,
        };

        // Always include seller's physical address if available
        if (sellerAddress) {
          quoteRequest.from = {
            streetAddress: sellerAddress.street,
            suburb: sellerAddress.suburb || "",
            city: sellerAddress.city,
            province: sellerAddress.province,
            postalCode: sellerAddress.postal_code,
            type: sellerAddress.type || "residential",
            lat: sellerAddress.latitude,
            lng: sellerAddress.longitude,
            company: (sellerAddress as any).additional_info || "",
          };
        }

        // Include buyer's address
        if (buyerAddress?.street) {
          quoteRequest.to = {
            streetAddress: buyerAddress.street,
            suburb: buyerAddress.suburb || "",
            city: buyerAddress.city || "",
            province: buyerAddress.province || "",
            postalCode: buyerAddress.postal_code || "",
            type: buyerAddress.type || "residential",
            lat: buyerAddress.latitude,
            lng: buyerAddress.longitude,
            company: (buyerAddress as any).additional_info || "",
          };
        }

        console.log("[STEP2_DELIVERY] fetchDeliveryOptions - Calling getAllDeliveryQuotes with:", JSON.stringify({
          requestId: "fetch-locker-" + Math.random().toString(36).substring(7),
          sellerLocker: quoteRequest.sellerCollectionPickupPoint,
          hasFrom: !!quoteRequest.from,
          hasTo: !!quoteRequest.to
        }));
        const quotesResp = await getAllDeliveryQuotes(quoteRequest);
        console.log("[STEP2_DELIVERY] Quotes received (Locker):", quotesResp.length);

        const itemParcelSize = book?.parcelSize || (book as any)?.parcel_size;
        const filteredQuotes = filterQuotesByParcelSize(quotesResp, itemParcelSize);

        setQuotes(filteredQuotes);

        const DELIVERY_MARKUP = 9;
        const options: DeliveryOption[] = filteredQuotes.map((q) => {
          let price = q.cost + DELIVERY_MARKUP;
          // Enforce R120 for Standard Delivery as requested by user
          if (q.service_name?.toLowerCase().includes("standard")) {
            price = Math.max(price, 120);
          }

          return {
            courier: "bobgo",
            service_name: q.service_name,
            price: price,
            estimated_days: typeof q.transit_days === "number" ? q.transit_days : 3,
            description: `${q.provider_name || q.provider || "Courier"} - ${q.features?.join(", ") || "Tracked"}`,
            zone_type: "locker",
            provider_name: q.provider_name,
            provider_slug: q.provider_slug,
            service_level_code: q.service_level_code,
          };
        });

        if (options.length === 0) {
          throw new Error("No quotes available");
        }

        setDeliveryOptions(options);
      } else if (useAddressForRates || (sellerAddress && !sellerHasOnlyLocker)) {
        if (!buyerAddress?.street) {
          throw new Error("Delivery address is required for home delivery");
        }

        const quoteRequest: any = {
          from: {
            streetAddress: sellerAddress.street,
            suburb: sellerAddress.suburb || "",
            city: sellerAddress.city,
            province: sellerAddress.province,
            postalCode: sellerAddress.postal_code,
            type: sellerAddress.type || "residential",
            lat: sellerAddress.latitude,
            lng: sellerAddress.longitude,
            company: (sellerAddress as any).additional_info || "",
          },
          to: {
            streetAddress: buyerAddress.street,
            suburb: buyerAddress.suburb || "",
            city: buyerAddress.city,
            province: buyerAddress.province,
            postalCode: buyerAddress.postal_code,
            type: buyerAddress.type || "residential",
            lat: buyerAddress.latitude,
            lng: buyerAddress.longitude,
            company: (buyerAddress as any).additional_info || "",
          },
          weight: 2,
          user_id: user?.id,
        };

        // If seller also has a locker, include it even for home delivery
        if (sellerLockerData?.id) {
          quoteRequest.sellerCollectionPickupPoint = {
            locationId: sellerLockerData.id,
            providerSlug: sellerLockerData.provider_slug || "tcg-locker",
          };
        }

        console.log("[STEP2_DELIVERY] fetchDeliveryOptions - Calling getAllDeliveryQuotes with:", JSON.stringify({
          requestId: "fetch-home-" + Math.random().toString(36).substring(7),
          hasFrom: !!quoteRequest.from,
          hasTo: !!quoteRequest.to
        }));
        const quotesResp = await getAllDeliveryQuotes(quoteRequest);
        console.log("[STEP2_DELIVERY] Quotes received (Home):", quotesResp.length);

        const itemParcelSize = book?.parcelSize || (book as any)?.parcel_size;
        const filteredQuotes = filterQuotesByParcelSize(quotesResp, itemParcelSize);

        setQuotes(filteredQuotes);

        const DELIVERY_MARKUP = 9;
        const options: DeliveryOption[] = filteredQuotes.map((q) => {
          let price = q.cost + DELIVERY_MARKUP;
          // Enforce R120 for Standard Delivery as requested by user
          if (q.service_name?.toLowerCase().includes("standard")) {
            price = Math.max(price, 120);
          }
          return {
            courier: "bobgo",
            service_name: q.service_name,
            price: price,
            estimated_days: q.transit_days,
            description: `${q.provider_name} - ${q.features?.join(", ") || "Tracked"}`,
            zone_type: buyerAddress.province === sellerAddress.province
              ? (buyerAddress.city === sellerAddress.city ? "local" : "provincial")
              : "national",
            provider_name: q.provider_name,
            provider_slug: q.provider_slug,
            service_level_code: q.service_level_code,
          };
        });

        if (options.length === 0) {
          throw new Error("No quotes available");
        }

        setDeliveryOptions(options);
      } else {
        throw new Error("No seller address or locker location available");
      }
    } catch (err) {
      console.error("[STEP2_DELIVERY] fetchDeliveryOptions - Error fetching options:", err);
      setError("Failed to load delivery options");

      // Determine zone for fallback
      let fallbackZoneType: "local" | "provincial" | "national" | "locker" = "national";
      if (sellerAddress && buyerAddress) {
        fallbackZoneType = buyerAddress.province === sellerAddress.province
          ? (buyerAddress.city === sellerAddress.city ? "local" : "provincial")
          : "national";
      } else if (!sellerAddress && sellerLockerData) {
        fallbackZoneType = "locker";
      }

      setDeliveryOptions([
        {
          courier: "bobgo",
          service_name: "Standard Delivery",
          price: 120,
          estimated_days: 3,
          description: "Estimated rate - tracking included",
          zone_type: fallbackZoneType,
        },
      ]);
      toast.warning("Using estimated delivery rate");
    } finally {
      setLoading(false);
    }
  };

  const getZoneBadgeColor = (zoneType: string) => {
    switch (zoneType) {
      case "local":
        return "bg-green-100 text-green-800";
      case "provincial":
        return "bg-emerald-100 text-emerald-800";
      case "national":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold mb-2">
              Loading Delivery Options
            </h3>
            <p className="text-gray-600">Calculating shipping costs...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || deliveryOptions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">
              Unable to Load Delivery Options
            </h3>
            <p className="text-gray-600 mb-4">
              {error || "No delivery options available for this route"}
            </p>
            <div className="space-x-4">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={fetchDeliveryOptions}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Shipping Options
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Choose your preferred delivery method
        </p>
      </div>

      {/* Address Summary */}
      <Card className="border border-gray-200 shadow-md">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <MapPin className="w-5 h-5 text-green-700" />
            </div>
            Delivery To
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {selectedLocker || preSelectedLocker ? (
                  <div className="p-4 rounded-lg bg-book-50 border border-book-100 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] uppercase font-bold mb-1">
                          ✓ Auto-Selected PUDO Locker
                        </Badge>
                        <p className="text-sm font-bold text-book-900">
                          📍 {(selectedLocker || preSelectedLocker)?.name}
                        </p>
                        <p className="text-sm text-book-800">
                          {(selectedLocker || preSelectedLocker)?.address || (selectedLocker || preSelectedLocker)?.full_address}
                        </p>
                      </div>
                    </div>
                    {(selectedLocker || preSelectedLocker)?.trading_hours && (
                      <div className="mt-2 pt-2 border-t border-book-100">
                        <span className="text-[10px] font-bold text-book-600 uppercase tracking-wider block mb-1">Operating Hours</span>
                        <p className="text-xs text-book-700 leading-relaxed whitespace-pre-wrap">
                          {(selectedLocker || preSelectedLocker)?.trading_hours}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-sm font-semibold text-amber-900 mb-1">
                        📍 Select a PUDO Locker for Delivery
                      </p>
                      <p className="text-xs text-amber-800">
                        You don't have a saved PUDO locker yet. Please search your suburb or postal code below to pick a nearby Courier Guy PUDO locker:
                      </p>
                    </div>

                    <PudoLockerSelector
                      onLockerSelect={(locker) => {
                        setSelectedLocker(locker);
                        recalculateRatesForLocker(locker);
                        toast.success(`Selected PUDO Locker: ${locker.name}`);
                      }}
                      showCardLayout={false}
                      title="Search Nearby PUDO Lockers"
                      description="Search by town, suburb or postal code"
                    />
                  </div>
                )}
              </div>
              {onEditAddress && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditAddress}
                  className="mt-1 text-green-700 border-green-200 hover:bg-green-50"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Options grouped by courier */}
      <div className="space-y-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Available Services</h2>

        {Object.entries(
          quotes.reduce<Record<string, UnifiedQuote[]>>((acc, q) => {
            const key = q.provider_name || "Unknown";
            (acc[key] ||= []).push(q);
            return acc;
          }, {})
        ).map(([courier, items]) => (
          <div key={courier} className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 rounded-lg bg-green-50">
                <Truck className="w-5 h-5 text-green-700" />
              </div>
              <span className="text-base sm:text-lg font-semibold text-gray-900">{courier}</span>
            </div>

            <Card className="divide-y overflow-hidden border border-gray-200 bg-white shadow-sm">
              {items.map((q, idx) => {
                let zoneType: "local" | "provincial" | "national" | "locker" = "national";
                if (preSelectedLocker || (!sellerAddress && sellerLockerData)) {
                  zoneType = "locker";
                } else if (sellerAddress && buyerAddress) {
                  zoneType = buyerAddress.province === sellerAddress.province
                    ? buyerAddress.city === sellerAddress.city
                      ? "local"
                      : "provincial"
                    : "national";
                }

                const option: DeliveryOption = {
                  courier: "bobgo",
                  service_name: q.service_name,
                  price: q.cost + 9,
                  estimated_days: typeof q.transit_days === "number" ? q.transit_days : 3,
                  description: `${courier}`,
                  zone_type: zoneType,
                  provider_name: q.provider_name,
                  provider_slug: q.provider_slug,
                  service_level_code: q.service_level_code,
                };
                const isSelected = !!localSelectedDelivery &&
                  localSelectedDelivery.service_name === option.service_name &&
                  localSelectedDelivery.price === option.price;
                return (
                  <div
                    key={idx}
                    className={`flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 transition-colors cursor-pointer ${
                      isSelected ? "bg-green-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => { setLocalSelectedDelivery(option); onSelectDelivery(option); }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                        <span className="font-semibold text-gray-900">{q.service_name}</span>
                        <span className="text-lg font-bold text-green-600">R{(q.cost + 9).toFixed(2)}</span>
                        {zoneType === "locker" && (
                          <Badge className="bg-purple-100 text-purple-800 border-none ml-2">
                            Locker Rate
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {option.estimated_days} day{option.estimated_days > 1 ? "s" : ""}
                        </span>
                        {q.collection_cutoff && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-amber-800 font-medium">
                            Cut-off: {q.collection_cutoff}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className={`shrink-0 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition-all border-2 whitespace-nowrap ${
                        isSelected
                          ? "bg-green-600 text-white border-green-600 shadow-md"
                          : "bg-white text-gray-900 border-gray-300 hover:border-green-400 hover:bg-green-50"
                      }`}
                      onClick={(e) => { e.stopPropagation(); onSelectDelivery(option); }}
                    >
                      {isSelected ? "✓ Selected" : "Select"}
                    </button>
                  </div>
                );
              })}
            </Card>
          </div>
        ))}
      </div>

      {/* Disclaimer about same-day delivery */}
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          Note: “Same day delivery” refers to the courier service level. The seller must first confirm/commit the order before pickup can be scheduled.
        </AlertDescription>
      </Alert>


      {!localSelectedDelivery && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a delivery option to continue.
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-6 sm:pt-8 border-t mt-8">
        <Button
          variant="outline"
          onClick={onBack}
          className="px-5 py-3 sm:py-4 text-base font-medium border-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Back</span>
          <span className="sm:hidden">Back</span>
        </Button>

        <div className="flex gap-3 flex-1">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="px-5 py-3 sm:py-4 text-base font-medium border-2 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
            >
              <X className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Cancel</span>
              <span className="sm:hidden">Cancel</span>
            </Button>
          )}
          <Button
            onClick={() => localSelectedDelivery && onSelectDelivery(localSelectedDelivery)}
            disabled={!localSelectedDelivery || loading}
            className="flex-1 px-6 py-3 sm:py-4 text-base font-semibold bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
          >
            Next: Payment
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step2DeliveryOptions;
