import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MapPin,
  Plus,
  Edit,
  Truck,
  Home,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Package,
  Loader2,
  Info,
  Trash2,
  DollarSign,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import ManualAddressInput from "@/components/ManualAddressInput";
import type { AddressData as GoogleAddressData } from "@/components/ManualAddressInput";
import { AddressData, Address } from "@/types/address";
import { initializeBobPayCheckout } from "@/utils/bobpayCheckoutHelper";
import PudoLocationsSection from "./BobGoLocationsSection";
import SavedLockersCard from "./SavedLockersCard";

interface ModernAddressTabProps {
  addressData: AddressData | null;
  onSaveAddresses?: (
    pickup: Address,
    shipping: Address,
    same: boolean,
  ) => Promise<void>;
  isLoading?: boolean;
}

const ModernAddressTab = ({
  addressData,
  onSaveAddresses,
  isLoading = false,
}: ModernAddressTabProps) => {
  const savedLockersCardRef = useRef<{ loadSavedLockers: () => Promise<void> } | null>(null);
  const [editMode, setEditMode] = useState<
    "none" | "pickup" | "shipping" | "both"
  >("none");
  const [pickupAddress, setPickupAddress] = useState<Address | null>(null);
  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
  const [sameAsPickup, setSameAsPickup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<"pickup" | "shipping" | null>(null);
  const [preferredPickupMethod, setPreferredPickupMethod] = useState<"locker" | "pickup" | null>(null);
  const [isLoadingPreference, setIsLoadingPreference] = useState(true);
  const [hasSavedLocker, setHasSavedLocker] = useState(false);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [showPreferenceDialog, setShowPreferenceDialog] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    if (addressData) {
      setPickupAddress(addressData.pickup_address);
      setShippingAddress(addressData.shipping_address);
      setSameAsPickup(addressData.addresses_same || false);
    } else {
      setPickupAddress(null);
      setShippingAddress(null);
      setSameAsPickup(false);
    }
  }, [addressData]);

  // Load preferred pickup method and locker status
  useEffect(() => {
    const loadPreferenceAndLockerStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsLoadingPreference(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("preferred_pickup_method, preferred_delivery_locker_data")
          .eq("id", user.id)
          .single();

        if (!error && profile) {
          setPreferredPickupMethod(profile.preferred_pickup_method as "locker" | "pickup");
          setHasSavedLocker(!!profile.preferred_delivery_locker_data);

          // Auto-select preference based on available options
          const hasLocker = !!profile.preferred_delivery_locker_data;
          const hasPickupAddress = !!pickupAddress;
          const hasExistingPreference = !!profile.preferred_pickup_method;

          // Case 1: Has preference already set - do nothing
          if (hasExistingPreference) {
            // Just use the existing preference
          }
          // Case 2: Has both locker and pickup address - show dialog to choose
          else if (hasLocker && hasPickupAddress) {
            setShowPreferenceDialog(true);
          }
          // Case 3: Has only locker - auto-select locker
          else if (hasLocker && !hasPickupAddress) {
            try {
              const { error: updateError } = await supabase
                .from("profiles")
                .update({ preferred_pickup_method: "locker" })
                .eq("id", user.id);

              if (!updateError) {
                setPreferredPickupMethod("locker");
              }
            } catch (e) {
              // Silently fail - preference will remain unset
            }
          }
          // Case 4: Has only pickup address - auto-select pickup
          else if (hasPickupAddress && !hasLocker) {
            try {
              const { error: updateError } = await supabase
                .from("profiles")
                .update({ preferred_pickup_method: "pickup" })
                .eq("id", user.id);

              if (!updateError) {
                setPreferredPickupMethod("pickup");
              }
            } catch (e) {
              // Silently fail - preference will remain unset
            }
          }
        }
      } catch (error) {
      } finally {
        setIsLoadingPreference(false);
      }
    };

    loadPreferenceAndLockerStatus();
  }, [pickupAddress]);

  // Preference selection removed as Locker is now mandatory for pickups

  const formatAddress = (address: Address | null | undefined) => {
    if (!address) return null;
    return `${address.street}, ${address.city}, ${address.province} ${address.postalCode}`;
  };

  const savePreferredPickupMethod = async (method: "locker" | "pickup") => {
    try {
      setIsSavingPreference(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // If method is locker, fetch the saved locker data to also store the location_id and provider_slug
      let updateData: any = { preferred_pickup_method: method };

      if (method === "locker" && hasSavedLocker) {
        // Fetch the full locker data
        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("preferred_delivery_locker_data")
          .eq("id", user.id)
          .single();

        if (!fetchError && profile?.preferred_delivery_locker_data) {
          const lockerData = profile.preferred_delivery_locker_data as any;
          updateData = {
            ...updateData,
            preferred_pickup_locker_location_id: lockerData.id ? parseInt(lockerData.id) : null,
            preferred_pickup_locker_provider_slug: lockerData.provider_slug || null,
          };
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to save preference");
        return;
      }

      setPreferredPickupMethod(method);
      toast.success(
        method === "locker"
          ? "Locker set as preferred pickup method"
          : "Home address set as preferred pickup method"
      );
    } catch (error) {
      toast.error("Failed to save preference");
    } finally {
      setIsSavingPreference(false);
    }
  };

  const isAddressValid = (addr: Address | null): boolean => {
    if (!addr) return false;
    return !!(
      (addr.street || addr.streetAddress || addr.street_address) &&
      addr.city &&
      addr.province &&
      (addr.postalCode || addr.postal_code)
    );
  };

  const handleSave = async () => {
    if (!onSaveAddresses) return;

    // Validate that addresses have actual content
    const pickupValid = isAddressValid(pickupAddress);
    const shippingValid = isAddressValid(shippingAddress);

    if (!pickupValid || !shippingValid) {
      toast.error("Please fill in all required address fields before saving");
      return;
    }

    setIsSaving(true);
    try {
      await onSaveAddresses(pickupAddress, shippingAddress, sameAsPickup);
      setEditMode("none");
    } catch (error) {
      const formattedError = handleAddressError(error, "save");
      console.error(formattedError.developerMessage, formattedError.originalError);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (mode: "pickup" | "shipping" | "both") => {
    setEditMode(mode);
    // Initialize addresses if they don't exist
    if (!pickupAddress) {
      setPickupAddress({
        street: "",
        city: "",
        province: "",
        postalCode: "",
        country: "South Africa",
      });
    }
    if (!shippingAddress) {
      setShippingAddress({
        street: "",
        city: "",
        province: "",
        postalCode: "",
        country: "South Africa",
      });
    }
  };

  const handleDeletePickupAddress = async () => {
    const emptyAddress: Address = {
      street: "",
      city: "",
      province: "",
      postalCode: "",
      country: "South Africa",
    };

    const wasSame = sameAsPickup;

    // We don't clear state optimistically anymore to prevent layout jumps
    // The update will happen via props after onSaveAddresses finishes and parents reload
    
    // Update profile via parent component

    // Attempt to save the deletion
    if (onSaveAddresses) {
      setIsSaving(true);
      try {
        await onSaveAddresses(
          emptyAddress,
          wasSame ? emptyAddress : (shippingAddress || emptyAddress),
          false
        );
      } catch (error) {
        const formattedError = handleAddressError(error, "delete");
        console.error(formattedError.developerMessage, formattedError.originalError);
        // Restore the address if deletion fails
        if (addressData?.pickup_address) {
          setPickupAddress(addressData.pickup_address);
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteShippingAddress = async () => {
    const emptyAddress: Address = {
      street: "",
      city: "",
      province: "",
      postalCode: "",
      country: "South Africa",
    };

    const wasSame = sameAsPickup;
    setShippingAddress(null);
    setSameAsPickup(false);
    if (wasSame) {
      setPickupAddress(null);
    }
    setDeleteConfirm(null);

    // Attempt to save the deletion
    if (onSaveAddresses) {
      setIsSaving(true);
      try {
        await onSaveAddresses(
          wasSame ? emptyAddress : (pickupAddress || emptyAddress),
          emptyAddress,
          false
        );
      } catch (error) {
        const formattedError = handleAddressError(error, "delete");
        console.error(formattedError.developerMessage, formattedError.originalError);
        // Restore the address if deletion fails
        if (addressData?.shipping_address) {
          setShippingAddress(addressData.shipping_address);
        }
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handlePickupAddressChange = useCallback((address: GoogleAddressData) => {
    const formattedAddress: Address = {
      street: address.street,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
    };
    setPickupAddress(formattedAddress);
  }, []);

  // Sync shipping address when pickup address changes and "use pickup for shipping" is checked
  useEffect(() => {
    if (sameAsPickup && pickupAddress) {
      setShippingAddress({
        street: pickupAddress.street,
        city: pickupAddress.city,
        province: pickupAddress.province,
        postalCode: pickupAddress.postalCode,
        country: pickupAddress.country,
      });
    }
  }, [sameAsPickup, pickupAddress]);

  const handleShippingAddressChange = useCallback((address: GoogleAddressData) => {
    const formattedAddress: Address = {
      street: address.street,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
    };
    setShippingAddress(formattedAddress);
  }, []);

  if (isLoading) {
    return (
      <Card className="border-2 border-orange-100 shadow-lg min-h-[400px]">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-t-lg">
          <div className="h-7 w-48 bg-orange-200/50 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="h-20 bg-muted rounded-lg animate-pulse" />
          <div className="h-20 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 w-40 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-orange-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-t-lg">
          <CardTitle className="text-xl md:text-2xl flex items-center gap-3">
            <MapPin className="h-6 w-6 text-orange-600" />
            Address Management
            {pickupAddress && shippingAddress && (
              <Badge className="bg-green-600 text-white">
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Saved Lockers Section - Moved to Top */}
      <SavedLockersCard ref={savedLockersCardRef} isLoading={isLoading} />

      {/* Pudo Locations Section - Moved to Top */}
      <PudoLocationsSection onLockerSaved={() => {
        savedLockersCardRef.current?.loadSavedLockers();
        // Reload preference and locker status when a new locker is saved
        setIsLoadingPreference(true);
        (async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const { data: profile } = await supabase
              .from("profiles")
              .select("preferred_pickup_method, preferred_delivery_locker_data")
              .eq("id", user.id)
              .single();

            if (profile) {
              setHasSavedLocker(!!profile.preferred_delivery_locker_data);
              // Auto-select locker if it's the only option now
              if (!profile.preferred_pickup_method && profile.preferred_delivery_locker_data) {
                await savePreferredPickupMethod("locker");
              }
            }
          } finally {
            setIsLoadingPreference(false);
          }
        })();
      }} />

      {/* Preference Selection removed as Locker is now mandatory for pickups */}

      {/* Address Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pickup Address */}
        <Card className="border-2 border-blue-100 hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-blue-600" />
              Pickup Address
              {pickupAddress && (
                <Badge
                  variant="outline"
                  className="border-blue-300 text-blue-700"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Set
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Where books you sell will be picked up from
              </p>

              {(editMode === "pickup" || editMode === "both") ? (
                <div className="space-y-4">
                  <ManualAddressInput
                    label="Pickup Address"
                    required
                    onAddressSelect={handlePickupAddressChange}
                    defaultValue={
                      pickupAddress
                        ? {
                            formattedAddress: `${pickupAddress.street}, ${pickupAddress.city}, ${pickupAddress.province}, ${pickupAddress.postalCode}`,
                            street: pickupAddress.street,
                            city: pickupAddress.city,
                            province: pickupAddress.province,
                            postalCode: pickupAddress.postalCode,
                            country: pickupAddress.country,
                          }
                        : undefined
                    }
                  />
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="same-as-pickup"
                      checked={sameAsPickup}
                      onChange={(e) => setSameAsPickup(e.target.checked)}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <Label
                      htmlFor="same-as-pickup"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Use this as my shipping address too
                    </Label>
                  </div>
                </div>
              ) : pickupAddress ? (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Navigation className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">
                          Current Address
                        </p>
                        <p className="text-sm text-blue-800 mt-1">
                          {formatAddress(pickupAddress)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {deleteConfirm === "pickup" ? (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200 space-y-3">
                      <p className="text-sm text-red-800">
                        Are you sure you want to delete this pickup address?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleDeletePickupAddress}
                          variant="destructive"
                          className="flex-1 bg-red-600 hover:bg-red-700"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Delete
                        </Button>
                        <Button
                          onClick={() => setDeleteConfirm(null)}
                          variant="outline"
                          className="flex-1"
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => startEditing("pickup")}
                        variant="outline"
                        className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => setDeleteConfirm("pickup")}
                        variant="outline"
                        className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Home className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-600 mb-2">
                    No Pickup Address Set
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add a pickup address to sell books
                  </p>
                  <Button
                    onClick={() => startEditing("pickup")}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Pickup Address
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card className="border-2 border-green-100 hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              Shipping Address
              {shippingAddress && (
                <Badge
                  variant="outline"
                  className="border-green-300 text-green-700"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Set
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Where you want to receive books that are shipped to you
              </p>

              {(editMode === "shipping" || editMode === "both") ? (
                <div className="space-y-4">
                  <ManualAddressInput
                    label="Shipping Address"
                    required
                    onAddressSelect={handleShippingAddressChange}
                    defaultValue={
                      shippingAddress
                        ? {
                            formattedAddress: `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.province}, ${shippingAddress.postalCode}`,
                            street: shippingAddress.street,
                            city: shippingAddress.city,
                            province: shippingAddress.province,
                            postalCode: shippingAddress.postalCode,
                            country: shippingAddress.country,
                          }
                        : undefined
                    }
                  />
                </div>
              ) : shippingAddress ? (
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start gap-3">
                      <Navigation className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900">
                          Current Address
                        </p>
                        <p className="text-sm text-green-800 mt-1">
                          {formatAddress(shippingAddress)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {deleteConfirm === "shipping" ? (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200 space-y-3">
                      <p className="text-sm text-red-800">
                        Are you sure you want to delete this shipping address? This action cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleDeleteShippingAddress}
                          variant="destructive"
                          className="flex-1 bg-red-600 hover:bg-red-700"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Delete
                        </Button>
                        <Button
                          onClick={() => setDeleteConfirm(null)}
                          variant="outline"
                          className="flex-1"
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => startEditing("shipping")}
                        variant="outline"
                        className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => setDeleteConfirm("shipping")}
                        variant="outline"
                        className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-600 mb-2">
                    No Shipping Address Set
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add a shipping address to receive deliveries
                  </p>
                  <Button
                    onClick={() => startEditing("shipping")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shipping Address
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons for Edit Mode */}
      {editMode !== "none" && (
        <Card className="border-2 border-purple-100">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                onClick={() => setEditMode("none")}
                variant="outline"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isAddressValid(pickupAddress) || !isAddressValid(shippingAddress) || isSaving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {isSaving ? "Saving..." : "Save Addresses"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Setup */}
      {!pickupAddress && !shippingAddress && editMode === "none" && (
        <Card className="border-2 border-indigo-100">
          <CardContent className="p-6 text-center">
            <MapPin className="h-16 w-16 text-indigo-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Quick Address Setup
            </h3>
            <p className="text-gray-600 mb-6">
              Set up both addresses at once to get started quickly
            </p>
            <Button
              onClick={() => startEditing("both")}
              className="bg-indigo-600 hover:bg-indigo-700"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Set Up Both Addresses
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preference Selection Dialog - Only show when both locker and pickup address exist */}
      <Dialog open={showPreferenceDialog} onOpenChange={setShowPreferenceDialog}>
        <DialogContent className="w-[90vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Your Preferred Pickup Method</DialogTitle>
            <DialogDescription>
              You have both a locker and a home address. Which would you prefer for book pickups?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              onClick={async () => {
                setDialogLoading(true);
                try {
                  await savePreferredPickupMethod("locker");
                  setShowPreferenceDialog(false);
                } finally {
                  setDialogLoading(false);
                }
              }}
              disabled={dialogLoading}
              className="w-full h-auto py-4 flex flex-col items-start gap-2 bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-900 justify-start"
              variant="outline"
            >
              <div className="flex items-center gap-2 font-semibold">
                <Package className="h-5 w-5" />
                Pudo Locker
              </div>
              <span className="text-sm font-normal text-purple-700">Convenient locker-based pickup</span>
            </Button>

            <Button
              onClick={async () => {
                setDialogLoading(true);
                try {
                  await savePreferredPickupMethod("pickup");
                  setShowPreferenceDialog(false);
                } finally {
                  setDialogLoading(false);
                }
              }}
              disabled={dialogLoading}
              className="w-full h-auto py-4 flex flex-col items-start gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 justify-start"
              variant="outline"
            >
              <div className="flex items-center gap-2 font-semibold">
                <Home className="h-5 w-5" />
                Home Address
              </div>
              <span className="text-sm font-normal text-blue-700">Direct pickup from your location</span>
            </Button>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                // Default to locker if user dismisses the dialog
                savePreferredPickupMethod("locker");
                setShowPreferenceDialog(false);
              }}
              variant="outline"
              disabled={dialogLoading}
            >
              Use Locker (Default)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModernAddressTab;
