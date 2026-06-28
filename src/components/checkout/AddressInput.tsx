import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Save } from "lucide-react";
import { CheckoutAddress } from "@/types/checkout";
import { fetchSuggestions, fetchAddressDetails, isMapboxActive, type Suggestion } from "@/services/addressAutocompleteService";
import {
  validateAddressStructure,
  normalizeAddressFields,
  normalizeProvinceName,
} from "@/utils/addressNormalizationUtils";

interface AddressInputProps {
  initialAddress?: Partial<CheckoutAddress>;
  onAddressSubmit: (address: CheckoutAddress) => void;
  onSaveToProfile?: (address: CheckoutAddress) => void;
  onCancel?: () => void;
  loading?: boolean;
  title?: string;
}

const SOUTH_AFRICAN_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

const AddressInput: React.FC<AddressInputProps> = ({
  initialAddress = {},
  onAddressSubmit,
  onSaveToProfile,
  onCancel,
  loading = false,
  title = "Enter Delivery Address",
}) => {
  const [address, setAddress] = useState<CheckoutAddress>({
    street: initialAddress.street || "",
    suburb: initialAddress.suburb || "",
    city: initialAddress.city || "",
    province: initialAddress.province || "",
    postal_code: initialAddress.postal_code || "",
    country: "South Africa",
    type: initialAddress.type || "residential",
    latitude: initialAddress.latitude,
    longitude: initialAddress.longitude,
    additional_info: initialAddress.additional_info || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Execute address search (used by button click and auto-search)
  const executeSearch = async () => {
    if (!searchInput.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(false);
      const results = await fetchSuggestions(searchInput);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setHasSearched(true);
    } catch (error) {
      setSuggestions([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-search as user types when Mapbox is active (debounced)
  useEffect(() => {
    if (!isMapboxActive()) return;
    if (!searchInput.trim() || searchInput.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      executeSearch();
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchInput]);

  // Handle suggestion selection and auto-fill
  const handleSelectSuggestion = async (placeId: string, description: string) => {
    console.log("[ADDRESS_INPUT] Suggestion selected:", description, placeId);
    setSearchInput(description);
    setShowDropdown(false);

    try {
      setIsSearching(true);
      const details = await fetchAddressDetails(placeId);

      if (details) {
        // Normalize province from API response
        const normalizedProvince = normalizeProvinceName(details.province || '') || details.province || '';

        // Use the parsed components directly from the API response
        setAddress({
          street: details.street_address || '',
          suburb: (details as any).suburb || (details as any).local_area || '',
          city: details.city || '',
          province: normalizedProvince,
          postal_code: details.postal_code || '',
          country: details.country || 'South Africa',
          type: address.type,
          latitude: details.lat,
          longitude: details.lng,
          additional_info: address.additional_info,
        });
      }
    } catch (error) {
    } finally {
      setIsSearching(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const validateAddress = (): boolean => {
    // Use centralized validation utility
    const validationErrors = validateAddressStructure(address);

    // Convert validation errors to field-specific error map
    const newErrors: Record<string, string> = {};
    validationErrors.forEach((error) => {
      // Map error messages to field names
      if (error.includes("Street")) newErrors.street = error;
      else if (error.includes("City")) newErrors.city = error;
      else if (error.includes("province")) newErrors.province = error;
      else if (error.includes("Postal")) newErrors.postal_code = error;
      else newErrors.general = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[ADDRESS_INPUT] Form submitted. Current address state:", address);

    if (!validateAddress()) {
      console.warn("[ADDRESS_INPUT] Validation failed:", errors);
      return;
    }

    // Normalize address to ensure consistency
    const normalized = normalizeAddressFields(address);
    if (!normalized) {
      setErrors({ general: "Failed to normalize address. Please check all fields." });
      return;
    }

    // Convert normalized address to CheckoutAddress format
    const cleanAddress: CheckoutAddress = {
      street: normalized.street,
      suburb: address.suburb || (normalized as any).suburb,
      city: normalized.city,
      province: normalized.province,
      postal_code: normalized.postalCode,
      country: normalized.country || "South Africa",
      type: address.type,
      latitude: address.latitude,
      longitude: address.longitude,
      additional_info: normalized.additionalInfo || "",
    };

    onAddressSubmit(cleanAddress);

    if (saveToProfile && onSaveToProfile) {
      onSaveToProfile(cleanAddress);
    }
  };

  const handleInputChange = (field: keyof CheckoutAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Card className="mx-4 sm:mx-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Address Search/Autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <Label htmlFor="address-search">Search Address (Optional)</Label>
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1">
                <Input
                  id="address-search"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      executeSearch();
                    }
                  }}
                  placeholder={isMapboxActive() ? "Start typing your address..." : "Type address and click Search..."}
                  className="pr-10 min-h-[44px] text-sm sm:text-base"
                />
                {/* Mini Loading Indicator */}
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
              </div>
              {!isMapboxActive() && (
                <Button
                  type="button"
                  onClick={executeSearch}
                  disabled={isSearching}
                  className="bg-green-600 hover:bg-green-700 text-white min-h-[44px]"
                >
                  Search
                </Button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    onClick={() =>
                      handleSelectSuggestion(suggestion.place_id, suggestion.description)
                    }
                    className="w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors border-b last:border-b-0 text-sm sm:text-base"
                    type="button"
                  >
                    {suggestion.description}
                  </button>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {hasSearched && !isSearching && suggestions.length === 0 && searchInput.trim() && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">No addresses found for "{searchInput}"</p>
                <p className="text-xs text-amber-600 mt-1">Try a simpler search like a street name, suburb, or city name.</p>
              </div>
            )}
          </div>

          {/* Street Address */}
          <div>
            <Label htmlFor="street">Street Address *</Label>
            <Input
              id="street"
              value={address.street}
              onChange={(e) => handleInputChange("street", e.target.value)}
              placeholder="e.g. 123 Main Street, Apartment 4B"
              className={`min-h-[44px] text-sm sm:text-base ${errors.street ? "border-red-500" : ""}`}
            />
            {errors.street && (
              <p className="text-sm text-red-600 mt-1">{errors.street}</p>
            )}
          </div>

          {/* Suburb and Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="suburb">Suburb / Local Area</Label>
              <Input
                id="suburb"
                value={address.suburb}
                onChange={(e) => handleInputChange("suburb", e.target.value)}
                placeholder="e.g. Lynnwood Park"
                className="min-h-[44px] text-sm sm:text-base"
              />
            </div>

            <div>
              <Label htmlFor="address-type">Address Type *</Label>
              <Select
                value={address.type}
                onValueChange={(value: "residential" | "business") => handleInputChange("type", value)}
              >
                <SelectTrigger className="min-h-[44px] text-sm sm:text-base">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* City */}
          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={address.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
              placeholder="e.g. Cape Town"
              className={`min-h-[44px] text-sm sm:text-base ${errors.city ? "border-red-500" : ""}`}
            />
            {errors.city && (
              <p className="text-sm text-red-600 mt-1">{errors.city}</p>
            )}
          </div>

          {/* Province and Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="province">Province *</Label>
              <Select
                value={address.province}
                onValueChange={(value) => handleInputChange("province", value)}
              >
                <SelectTrigger
                  className={`min-h-[44px] text-sm sm:text-base ${errors.province ? "border-red-500" : ""}`}
                >
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {SOUTH_AFRICAN_PROVINCES.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.province && (
                <p className="text-sm text-red-600 mt-1">{errors.province}</p>
              )}
            </div>

            <div>
              <Label htmlFor="postal_code">Postal Code *</Label>
              <Input
                id="postal_code"
                value={address.postal_code}
                onChange={(e) =>
                  handleInputChange("postal_code", e.target.value)
                }
                placeholder="e.g. 7500"
                className={`min-h-[44px] text-sm sm:text-base ${errors.postal_code ? "border-red-500" : ""}`}
              />
              {errors.postal_code && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.postal_code}
                </p>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <Label htmlFor="additional_info">Additional Information (Optional)</Label>
            <Textarea
              id="additional_info"
              value={address.additional_info}
              onChange={(e) => handleInputChange("additional_info", e.target.value)}
              placeholder="e.g., Building entrance details, security gate code, special delivery instructions..."
              rows={3}
              className="min-h-[80px] text-sm sm:text-base"
            />
            <p className="text-xs text-gray-500 mt-1">
              Include any helpful details for pickup/delivery (gate codes, building access, etc.)
            </p>
          </div>

          {/* Save to Profile Option */}
          {onSaveToProfile && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="saveToProfile"
                checked={saveToProfile}
                onChange={(e) => setSaveToProfile(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="saveToProfile" className="text-sm">
                Save this address to my profile for future orders
              </Label>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4 space-y-2">
            <Button
              type="submit"
              className="w-full flex items-center gap-2 min-h-[44px] text-sm sm:text-base"
              disabled={loading}
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Continue with this address
                </>
              )}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="w-full min-h-[44px] text-sm sm:text-base"
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddressInput;
