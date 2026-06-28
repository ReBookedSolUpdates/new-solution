import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Loader2,
  Clock,
  Phone,
  Navigation,
  Info,
  Save,
} from "lucide-react";
import { fetchSuggestions, fetchAddressDetails, isMapboxActive, type Suggestion } from "@/services/addressAutocompleteService";
import { getBobGoLocations, type BobGoLocation } from "@/services/bobgoLocationsService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PudoLocationsSectionProps {
  onLockerSaved?: () => void;
}

const PudoLocationsSection: React.FC<PudoLocationsSectionProps> = ({ onLockerSaved }) => {
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [locations, setLocations] = useState<BobGoLocation[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showLocations, setShowLocations] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [savingLockerId, setSavingLockerId] = useState<string | null>(null);
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

  // Handle address selection and fetch BobGo locations
  const handleSelectAddress = async (placeId: string, description: string) => {
    setSearchInput(description);
    setSelectedAddress(description);
    setShowDropdown(false);

    try {
      setIsLoadingLocations(true);
      const details = await fetchAddressDetails(placeId);

      if (details && details.lat && details.lng) {
        const lat = typeof details.lat === 'string' ? parseFloat(details.lat) : details.lat;
        const lng = typeof details.lng === 'string' ? parseFloat(details.lng) : details.lng;

        // Fetch nearby pickup point locations - use existing service code which is optimized for this
        const nearbyLocations = await getBobGoLocations(lat, lng, 10, "locker");

        // Apply user instruction: "we just use:tcg-locker"
        const filteredLocations = nearbyLocations.filter(
          (loc: BobGoLocation) => loc.provider_slug === "tcg-locker"
        );

        setLocations(filteredLocations);
        setShowLocations(true);
      } else {
        setLocations([]);
      }
    } catch (error) {
      setLocations([]);
    } finally {
      setIsLoadingLocations(false);
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

  // Save locker to profile
  const handleSaveLockerToProfile = async (location: BobGoLocation) => {
    try {
      setSavingLockerId(String(location.id) || "");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to save a locker");
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
          `You already have "${oldLockerName}" saved as your locker.\n\nDo you want to replace it with "${location.name}"?`
        );
        if (!proceed) {
          setSavingLockerId(null);
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          preferred_delivery_locker_data: location,
          preferred_pickup_locker_location_id: location.id ? parseInt(String(location.id)) : null,
          preferred_pickup_locker_provider_slug: location.provider_slug || null,
          preferred_delivery_locker_saved_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Locker saved! 🎉", {
        description: `${location.name} is now saved to your profile`,
      });

      // Trigger parent component to reload saved locker
      if (onLockerSaved) {
        setTimeout(() => onLockerSaved(), 100);
      }
    } catch (error) {
      toast.error("Failed to save locker to profile");
    } finally {
      setSavingLockerId(null);
    }
  };

  const formatAddress = (addr: any): string => {
    if (!addr) return "";
    if (typeof addr === "string") return addr;
    if (typeof addr === "object") {
      const parts = [
        addr.street_address || addr.address,
        addr.city,
        addr.code || addr.postal_code,
        addr.country
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : JSON.stringify(addr);
    }
    return String(addr);
  };

  return (
    <Card className="border-2 border-book-100 hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-book-50 to-book-100">
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-book-600" />
          Save a Pudo Locker Location
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Find and save a nearby Courier Guy Pudo locker location for deliveries
          </p>

          {/* Address Search Input */}
          <div className="relative" ref={dropdownRef}>
            <Label htmlFor="pudo-address-search">Search Address</Label>
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1">
                <Input
                  id="pudo-address-search"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      executeSearch();
                    }
                  }}
                  placeholder={isMapboxActive() ? "Start typing your address..." : "Enter an address and click Search..."}
                  className="pr-10"
                />
                {/* Mini Loading Indicator */}
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-book-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-book-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-book-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
              </div>
              {!isMapboxActive() && (
                <Button
                  type="button"
                  onClick={executeSearch}
                  disabled={isSearching}
                  className="bg-book-600 hover:bg-book-700 text-white"
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
                      handleSelectAddress(suggestion.place_id, suggestion.description)
                    }
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors border-b last:border-b-0 text-sm"
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

          {/* Loading State */}
          {isLoadingLocations && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          )}

          {/* Pudo Locations List */}
          {locations.length > 0 && !isLoadingLocations && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-gray-700">
                {locations.length} Pudo lockers found
                {selectedAddress && ` near ${selectedAddress}`}
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-3 border border-gray-200 rounded-lg p-2 bg-gray-50/50">
                {locations.map((location, index) => {
                  return (
                    <div
                      key={location.id || index}
                      className="p-3 bg-white border border-book-100 rounded-xl hover:shadow-md transition-all flex flex-col sm:flex-row gap-3 items-start"
                    >
                      {/* Image on Left - Desktop Only, Centered Mobile */}
                      {(location.image_url || location.pickup_point_provider_logo_url) && (
                        <div
                          className="flex justify-center sm:justify-start flex-shrink-0 w-full sm:w-auto"
                          onClick={() => setSelectedImage(location.image_url || location.pickup_point_provider_logo_url || null)}
                        >
                          <img
                            src={location.image_url || location.pickup_point_provider_logo_url}
                            alt={location.name || "Location image"}
                            className="w-full sm:w-20 sm:h-20 h-32 object-cover rounded-lg border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Content Section */}
                      <div className="flex-1 w-full min-w-0">
                      {/* Header Section with Name and Badge */}
                      <div className="flex flex-col items-center text-center space-y-2 mb-3">
                        <h4 className="font-bold text-gray-900 group-hover:text-book-600 transition-colors text-base flex justify-center items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-book-600 flex-shrink-0" />
                          {location.name || location.human_name || location.location_name || location.title || `Locker ${index + 1}`}
                        </h4>
                        {location.type && (
                          <Badge variant="secondary" className="bg-book-50/50 text-book-700 border-none h-5 px-2 text-[9px] uppercase font-bold tracking-wider">
                            {location.type}
                          </Badge>
                        )}
                      </div>

                      {/* Main Content Grid - More Compact */}
                      <div className="space-y-2">
                        {/* Address & Hours Row - Centered Vertical Stack */}
                        <div className="flex flex-col items-center text-center gap-y-3">
                          {/* Full Address */}
                          {(location.full_address || location.address) && (
                            <div className="w-full">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Address</p>
                              <p className="text-xs text-gray-600 leading-relaxed font-medium px-4">
                                {formatAddress(location.full_address || location.address)}
                              </p>
                            </div>
                          )}

                          {/* Operating Hours */}
                          {location.trading_hours && (
                            <div className="w-full pt-2 border-t border-gray-50/50 flex flex-col items-center">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-center gap-1 mb-1.5">
                                <Clock className="h-3 w-3" /> Operating Hours
                              </p>
                              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50/30 p-2.5 rounded-md border border-gray-100/50 w-full italic">
                                {location.trading_hours}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* ID and Details Row - Centered */}
                        <div className="flex justify-center flex-wrap gap-x-6 gap-y-3 py-2.5 border-y border-gray-50">
                          {location.id && (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID</span>
                              <span className="text-xs font-mono text-gray-600">{location.id}</span>
                            </div>
                          )}

                          {(location.distance || location.distance_km) && (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Distance</span>
                              <span className="text-xs text-gray-600 font-bold px-2 py-0.5 bg-gray-100/50 rounded-full">
                                {typeof location.distance === "number"
                                  ? `${location.distance.toFixed(1)} km`
                                  : typeof location.distance_km === "number"
                                  ? `${location.distance_km.toFixed(1)} km`
                                  : location.distance || location.distance_km}
                              </span>
                            </div>
                          )}

                          {location.pickup_point_provider_name && (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Provider</span>
                              <span className="text-xs text-gray-500 font-medium italic opacity-70">
                                {location.pickup_point_provider_name}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Compartment Sizes - Centered */}
                        {location.available_compartment_sizes && location.available_compartment_sizes.length > 0 && (
                          <div className="flex flex-col items-center gap-2 py-2 border-t border-gray-50">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available Sizes</span>
                            <div className="flex flex-wrap justify-center gap-1.5">
                              {location.available_compartment_sizes.map((size: string) => (
                                <Badge key={size} variant="outline" className="text-[9px] px-2 py-0 h-4.5 border-gray-200 text-gray-500 bg-white shadow-sm font-medium">
                                  {size}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons Row - Centered */}
                        <div className="flex justify-center flex-wrap gap-2 pt-1 border-t border-gray-50/50 mt-1">
                          {/* Save to Profile Button */}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveLockerToProfile(location);
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1 max-w-[140px] h-8 text-[11px] border-book-200 text-book-700 hover:bg-book-50 hover:border-book-300 rounded-lg font-bold"
                          >
                            {savingLockerId === location.id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-3 w-3 mr-1.5" />
                                Save
                              </>
                            )}
                          </Button>

                          {/* View on Google Maps Button */}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
                              window.open(url, '_blank');
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1 max-w-[140px] h-8 text-[11px] border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 rounded-lg font-bold"
                          >
                            <MapPin className="h-3 w-3 mr-1.5 text-book-500" />
                            Maps
                          </Button>
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

      {/* No Locations Found */}
      {selectedAddress && locations.length === 0 && !isLoadingLocations && (
        <Alert className="bg-amber-50 border-amber-200 border-2">
          <Info className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-900 ml-2">
            <p className="font-bold text-sm mb-1">No Pudo lockers found in this location.</p>
            <p className="text-xs leading-relaxed">
              If there are no lockers available in your area, please consider <strong>adding a door-to-door address (pickup address for sellers, delivery address for buyers)</strong> in your profile settings instead. This will allow couriers to collect or deliver directly.
            </p>
          </AlertDescription>
        </Alert>
      )}

          {/* Info Alert - Show when no search has been done yet */}
          {!selectedAddress && locations.length === 0 && !isLoadingLocations && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Search for an address above to find nearby Pudo locker locations.
                Click on any location to select it as your preference.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Location Image</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-light"
              >
                ×
              </button>
            </div>
            <div className="p-4 flex items-center justify-center">
              <img
                src={selectedImage}
                alt="Location"
                className="w-full h-auto rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PudoLocationsSection;
