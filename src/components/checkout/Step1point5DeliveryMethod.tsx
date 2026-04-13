import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  MapPin,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
  ArrowRight,
  Save,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PudoLockerSelector from "@/components/checkout/BobGoLockerSelector";
import { BobGoLocation as PudoLocker } from "@/services/bobgoLocationsService";

interface Step1point5DeliveryMethodProps {
  bookTitle: string;
  onSelectDeliveryMethod: (
    method: "home" | "locker",
    locker?: PudoLocker | null
  ) => void;
  onBack: () => void;
  onCancel?: () => void;
  loading?: boolean;
  preSelectedMethod?: "home" | "locker" | null;
  sellerLockerData?: PudoLocker | null;
  sellerAddress?: any | null;
}

const Step1point5DeliveryMethod: React.FC<Step1point5DeliveryMethodProps> = ({
  bookTitle,
  onSelectDeliveryMethod,
  onBack,
  onCancel,
  loading = false,
  preSelectedMethod = null,
  sellerLockerData = null,
  sellerAddress = null,
}) => {
  console.log("[STEP1.5_METHOD] Component rendered. Pre-selected:", preSelectedMethod, "Seller Locker:", !!sellerLockerData, "Seller Address:", !!sellerAddress);
  const [deliveryMethod, setDeliveryMethod] = useState<"home" | "locker">(preSelectedMethod || "locker");
  const [selectedLocker, setSelectedLocker] = useState<PudoLocker | null>(null);
  const [savedLocker, setSavedLocker] = useState<PudoLocker | null>(null);
  const [isLoadingSavedLocker, setIsLoadingSavedLocker] = useState(true);
  const [isSavingLocker, setIsSavingLocker] = useState(false);
  const [wantToChangeLocker, setWantToChangeLocker] = useState(false);

  // Determine if we need to filter lockers by provider
  const sellerHasOnlyLocker = !sellerAddress && sellerLockerData;
  const requiredProviderSlug = sellerHasOnlyLocker ? sellerLockerData?.provider_slug : null;

  // Load saved locker from profile on mount
  useEffect(() => {
    loadSavedLocker();
  }, []);

  useEffect(() => {
    // If we have a saved locker and it mismatches the required provider, force change to home delivery
    if (requiredProviderSlug && savedLocker && savedLocker.provider_slug !== requiredProviderSlug) {
      console.warn(`[STEP1.5_METHOD] Saved locker provider (${savedLocker.provider_slug}) mismatches seller provider (${requiredProviderSlug}). Forcing home delivery.`);
      setDeliveryMethod("home");
      setSelectedLocker(null);
    }
  }, [requiredProviderSlug, savedLocker]);

  // Auto-select delivery method and locker when clicking locker option
  const handleSelectLockerMethod = (currentSavedLocker: PudoLocker | null) => {
    console.log("[STEP1.5_METHOD] Locker method selected. Saved locker:", !!currentSavedLocker);
    setDeliveryMethod("locker");
    // Automatically select the saved locker if it exists
    if (currentSavedLocker) {
      setSelectedLocker(currentSavedLocker);
    }
  };

  useEffect(() => {
    // If we have a saved locker and method is locker, ensure it's selected
    if (deliveryMethod === "locker" && savedLocker && !selectedLocker) {
      setSelectedLocker(savedLocker);
    }
  }, [deliveryMethod, savedLocker, selectedLocker]);

  const loadSavedLocker = async () => {
    try {
      setIsLoadingSavedLocker(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingSavedLocker(false);
        return;
      }

      // Fetch user profile with locker preferences
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("preferred_delivery_locker_data")
        .eq("id", user.id)
        .single();

      if (error) {
        setIsLoadingSavedLocker(false);
        return;
      }

      if (profile?.preferred_delivery_locker_data) {
        const lockerData = profile.preferred_delivery_locker_data as PudoLocker;
        setSavedLocker(lockerData);
      }
    } catch (error) {
    } finally {
      setIsLoadingSavedLocker(false);
    }
  };

  const handleSaveLockerToProfile = async () => {
    if (!selectedLocker) {
      toast.error("Please select a locker first");
      return;
    }

    try {
      setIsSavingLocker(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to save locker");
        return;
      }

      // Check if a locker is already saved
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("preferred_delivery_locker_data")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      const hasSavedLocker = profile?.preferred_delivery_locker_data;

      // If a locker is already saved, show confirmation
      if (hasSavedLocker) {
        const oldLockerName = (hasSavedLocker as any)?.name || "your saved locker";
        const proceed = window.confirm(
          `You already have "${oldLockerName}" saved as your locker.\n\nDo you want to replace it with "${selectedLocker.name}"?`
        );
        if (!proceed) {
          setIsSavingLocker(false);
          return;
        }
      }

      // Update user profile with full locker data
      const lockerId = selectedLocker.id ? String(selectedLocker.id) : null;
      const numericLockerId = lockerId && !isNaN(Number(lockerId)) ? parseInt(lockerId) : null;

      const { error } = await supabase
        .from("profiles")
        .update({
          preferred_delivery_locker_data: selectedLocker,
          preferred_pickup_locker_location_id: numericLockerId,
          preferred_pickup_locker_provider_slug: selectedLocker.provider_slug || null,
          preferred_delivery_locker_saved_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      // Refresh the locker from the saved profile to ensure all data is intact
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("preferred_delivery_locker_data")
        .eq("id", user.id)
        .single();

      let lockerToUse = selectedLocker;
      if (updatedProfile?.preferred_delivery_locker_data) {
        const refreshedLocker = updatedProfile.preferred_delivery_locker_data as PudoLocker;
        // Update local state with the refreshed locker to ensure consistency
        setSavedLocker(refreshedLocker);
        setSelectedLocker(refreshedLocker);
        lockerToUse = refreshedLocker;
      } else {
        // Fallback: use the local selectedLocker if refresh fails
        setSavedLocker(selectedLocker);
        setSelectedLocker(selectedLocker);
      }

      setWantToChangeLocker(false); // Reset to show saved locker view

      toast.success("Locker saved! 🎉", {
        description: `${selectedLocker.name} is now your preferred locker.`,
      });

      // Directly proceed to next step with the locker we know was saved
      onSelectDeliveryMethod("locker", lockerToUse);
    } catch (error) {
      toast.error("Failed to save locker to profile");
    } finally {
      setIsSavingLocker(false);
    }
  };

  const handleProceed = () => {
    console.log("[STEP1.5_METHOD] handleProceed called. Method:", deliveryMethod, "Selected Locker:", !!selectedLocker, "Saved Locker:", !!savedLocker);
    if (deliveryMethod === "home") {
      onSelectDeliveryMethod("home", null);
    } else if (deliveryMethod === "locker") {
      // Prioritize selectedLocker (newly selected), fallback to savedLocker if not changing
      const lockerToUse = selectedLocker || (savedLocker && !wantToChangeLocker ? savedLocker : null);

      if (!lockerToUse) {
        toast.error("Please select a locker location");
        return;
      }

      // Verify the locker has required fields for delivery address extraction
      const hasRequiredFields = lockerToUse.id && lockerToUse.name &&
        (lockerToUse.address || lockerToUse.full_address);

      if (!hasRequiredFields) {
        toast.error("Locker information is incomplete. Please select again.");
        return;
      }

      onSelectDeliveryMethod("locker", lockerToUse);
    }
  };

  if (isLoadingSavedLocker) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-semibold mb-2">Loading your preferences...</h3>
            <p className="text-gray-600">Checking for saved locker location</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasLockerMismatch = requiredProviderSlug && savedLocker && savedLocker.provider_slug !== requiredProviderSlug;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Choose Delivery Method
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Pick your preferred way to receive {bookTitle}
        </p>
      </div>

      {/* Provider Incompatibility Alert */}
      {hasLockerMismatch && (
        <Alert className="bg-amber-50 border-amber-200">
          <Info className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-900">
            Locker-to-locker delivery is currently unavailable because the seller's locker provider is different from yours. <strong>Home Delivery</strong> has been selected for you instead.
          </AlertDescription>
        </Alert>
      )}

      {/* Delivery Method Cards */}
      <div className="space-y-4 sm:space-y-5">
        {/* Locker Option */}
        <div
          className={`p-5 sm:p-6 border-2 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
            deliveryMethod === "locker"
              ? "bg-book-50 border-book-400 shadow-md"
              : hasLockerMismatch
                ? "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"
                : "bg-white border-gray-200 hover:border-book-300"
          }`}
          onClick={() => !hasLockerMismatch && handleSelectLockerMethod(savedLocker)}
          role="radio"
          aria-checked={deliveryMethod === "locker"}
          aria-disabled={hasLockerMismatch}
          tabIndex={hasLockerMismatch ? -1 : 0}
          onKeyDown={(e) => {
            if (!hasLockerMismatch && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              handleSelectLockerMethod(savedLocker);
            }
          }}
        >
          <div className="flex items-start gap-4">
            <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-row"
              style={deliveryMethod === "locker" ? { borderColor: "#a855f7", backgroundColor: "#a855f7" } : { borderColor: "#d1d5db" }}>
              {deliveryMethod === "locker" && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <MapPin className="w-5 h-5 text-book-600 flex-shrink-0" />
                <span className="text-base sm:text-lg">Pudo Locker</span>
                {savedLocker && <Badge className="bg-green-100 text-green-800 text-xs ml-auto">Saved</Badge>}
              </div>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {hasLockerMismatch
                  ? "Unavailable due to provider incompatibility"
                  : "Pick up at a convenient Pudo locker near you"}
              </p>
            </div>
          </div>
        </div>

        {/* Home Delivery Option */}
        <div
          className={`p-5 sm:p-6 border-2 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
            deliveryMethod === "home"
              ? "bg-green-50 border-green-400 shadow-md"
              : "bg-white border-gray-200 hover:border-green-300"
          }`}
          onClick={() => {
            setDeliveryMethod("home");
            setSelectedLocker(null);
          }}
          role="radio"
          aria-checked={deliveryMethod === "home"}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDeliveryMethod("home");
              setSelectedLocker(null);
            }
          }}
        >
          <div className="flex items-start gap-4">
            <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={deliveryMethod === "home" ? { borderColor: "#16a34a", backgroundColor: "#16a34a" } : { borderColor: "#d1d5db" }}>
              {deliveryMethod === "home" && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <Home className="w-5 h-5 text-green-700 flex-shrink-0" />
                <span className="text-base sm:text-lg">Home Delivery</span>
              </div>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Courier delivers directly to your home address
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Locker Selection Section */}
      {deliveryMethod === "locker" && (
        <Card className="border border-book-200 bg-book-50 shadow-md">
          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* Saved Locker Display */}
            {savedLocker && !wantToChangeLocker && (
              <div className="p-4 sm:p-5 bg-white border-2 border-green-200 rounded-lg shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-sm sm:text-base text-gray-900 mb-1">
                      <div className="p-1 bg-green-100 rounded-full flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <span>{savedLocker.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {savedLocker.address || savedLocker.full_address}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWantToChangeLocker(true)}
                  className="w-full border-2 py-2 text-sm font-medium"
                >
                  Change Pudo Locker
                </Button>
              </div>
            )}

            {/* Locker Selector */}
            {!savedLocker || wantToChangeLocker ? (
              <div>
                <PudoLockerSelector
                  onLockerSelect={setSelectedLocker}
                  onAfterSave={(locker) => {
                    setSelectedLocker(locker);
                    onSelectDeliveryMethod("locker", locker);
                  }}
                  selectedLockerId={selectedLocker?.id != null ? String(selectedLocker.id) : undefined}
                  title="Select Pudo Locker"
                  description="Enter an address to find nearby Pudo lockers"
                  showCardLayout={false}
                  requiredProviderSlug={requiredProviderSlug}
                />
              </div>
            ) : null}

            {/* Selected Different Locker or New Locker Selection */}
            {selectedLocker && (!savedLocker || selectedLocker.id !== savedLocker.id) && (
              <div className="p-4 sm:p-5 bg-white border-2 border-green-200 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-sm text-gray-900 mb-3">
                  <div className="p-1 bg-green-100 rounded-full flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span>{selectedLocker.name}</span>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={handleSaveLockerToProfile}
                    disabled={isSavingLocker}
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 py-2 text-sm font-medium"
                  >
                    {isSavingLocker ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving Locker...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save to Profile & Continue
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-gray-500">
                    Saving to profile will automatically take you to the next step
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
            onClick={handleProceed}
            disabled={loading || (deliveryMethod === "locker" && !selectedLocker && !(savedLocker && !wantToChangeLocker))}
            className="flex-1 px-6 py-3 sm:py-4 text-base font-semibold bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
          >
            Next
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step1point5DeliveryMethod;
