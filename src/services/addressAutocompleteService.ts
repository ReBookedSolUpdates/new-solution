import { supabase } from "@/integrations/supabase/client";

export interface Suggestion {
  description: string;
  place_id: string;
}

export interface AddressDetails {
  formatted_address: string;
  lat: number;
  lng: number;
  street_number: string;
  route: string;
  street_address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  suburb?: string;
}

export interface PickupPoint {
  name: string;
  distance: string;
  address: string;
}

// In-memory cache of Nominatim search results from the last query
let searchCache: any[] = [];

// In-memory cache of Mapbox feature details from the last query
let mapboxFeatureCache: Record<string, AddressDetails> = {};

// Tracks whether the last fetchSuggestions call was served by Mapbox.
// Components use this to decide: auto-search on typing (Mapbox) vs click Search (fallback).
let _mapboxActive = true; // optimistic — assume Mapbox works until it doesn't

/**
 * Returns true when Mapbox is the active autocomplete provider.
 * When true, components should auto-search as the user types (no Search button needed).
 * When false, users must click Search to trigger the fallback provider.
 */
export const isMapboxActive = (): boolean => _mapboxActive;

/**
 * Internal helper: fetch from Nominatim (tries proxy, then direct).
 * Returns raw array of results or empty array.
 */
const nominatimSearch = async (searchText: string): Promise<any[]> => {
  const query = encodeURIComponent(searchText.trim());
  const params = `q=${query}&format=json&addressdetails=1&limit=10&countrycodes=za`;

  // Try proxy first (works in Vite dev), then fall back to direct API
  const urls = [
    `/api/nominatim/search?${params}`,
    `https://nominatim.openstreetmap.org/search?${params}`,
  ];

  for (const url of urls) {
    try {
      console.log(`[Nominatim] Fetching: ${url}`);
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      console.log(`[Nominatim] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        console.warn(`[Nominatim] Non-OK response from ${url}, trying next...`);
        continue;
      }

      const text = await response.text();
      console.log(`[Nominatim] Raw response length: ${text.length} chars`);

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error(`[Nominatim] JSON parse failed for ${url}:`, parseError);
        continue;
      }

      if (!Array.isArray(data)) {
        console.warn(`[Nominatim] Response is not an array:`, typeof data, data);
        continue;
      }

      return data;
    } catch (error) {
      console.warn(`[Nominatim] Fetch failed for ${url}:`, error);
      continue;
    }
  }

  return [];
};

/**
 * Primary: Fetch suggestions via the Mapbox Geocoding API v6 edge function.
 * Returns suggestions array on success, or null if the call fails (so caller can fallback).
 */
const fetchMapboxSuggestions = async (searchInput: string): Promise<Suggestion[] | null> => {
  try {
    console.log(`[Autocomplete] Trying Mapbox for: "${searchInput}"`);
    const { data, error } = await supabase.functions.invoke("mapbox-autocomplete", {
      body: { input: searchInput, mode: "suggest" },
    });

    if (error) {
      console.warn("[Autocomplete] Mapbox edge function error:", error);
      return null;
    }

    if (data && data.success && Array.isArray(data.suggestions)) {
      console.log(`[Autocomplete] Mapbox returned ${data.suggestions.length} suggestions`);

      // Cache the feature details returned alongside suggestions
      if (data.feature_cache) {
        mapboxFeatureCache = { ...mapboxFeatureCache, ...data.feature_cache };
      }

      return data.suggestions;
    }

    console.warn("[Autocomplete] Mapbox returned unexpected shape:", data);
    return null;
  } catch (err) {
    console.warn("[Autocomplete] Mapbox fetch failed:", err);
    return null;
  }
};

/**
 * Fallback: Fetch suggestions via the existing address-autocomplete edge function
 * (Nominatim / Google Places flow).
 */
const fetchFallbackSuggestions = async (searchInput: string): Promise<Suggestion[]> => {
  try {
    console.log(`[Autocomplete] Falling back to address-autocomplete for: "${searchInput}"`);
    const { data, error } = await supabase.functions.invoke("address-autocomplete", {
      body: { input: searchInput },
    });

    if (error) {
      console.warn("[Autocomplete] Fallback edge function returned error:", error);
      return [];
    }

    if (data && data.success && Array.isArray(data.results)) {
      console.log(`[Autocomplete] Received ${data.results.length} suggestions from Fallback (Nominatim)`);
      searchCache = data.results;
      return data.results.map((item: any) => ({
        description: item.display_name,
        place_id: String(item.place_id || item.osm_id),
      }));
    }

    if (data && Array.isArray(data.suggestions)) {
      console.log(`[Autocomplete] Received ${data.suggestions.length} suggestions from Fallback (Google)`);
      return data.suggestions;
    }
  } catch (err) {
    console.warn("[Autocomplete] Fallback fetch failed:", err);
  }

  return [];
};

/**
 * Fetch address suggestions.
 * Strategy: Mapbox (primary) → existing Nominatim/Google edge function (fallback).
 * Also updates the _mapboxActive flag so components know the current mode.
 */
export const fetchSuggestions = async (searchInput: string): Promise<Suggestion[]> => {
  if (!searchInput.trim()) {
    return [];
  }

  // Try Mapbox first
  const mapboxResults = await fetchMapboxSuggestions(searchInput);
  if (mapboxResults && mapboxResults.length > 0) {
    _mapboxActive = true;
    return mapboxResults;
  }

  // Mapbox failed or returned no results — fall back to existing flow
  console.log("[Autocomplete] Mapbox returned nothing, using fallback");
  _mapboxActive = false;
  return fetchFallbackSuggestions(searchInput);
};

/**
 * Fetch parsed address details from a place_id.
 * Handles both Mapbox feature IDs (prefixed with "mapbox:") and legacy Nominatim/Google IDs.
 */
export const fetchAddressDetails = async (placeId: string): Promise<AddressDetails | null> => {
  try {
    // ── Mapbox feature IDs ──────────────────────────────────────
    if (placeId.startsWith("mapbox:")) {
      // Check local cache first (edge function sends feature_cache with suggestions)
      if (mapboxFeatureCache[placeId]) {
        console.log(`[Autocomplete] Mapbox details found in cache for ${placeId}`);
        return mapboxFeatureCache[placeId];
      }

      // Strip the "mapbox:" prefix to get the raw Mapbox ID
      const rawId = placeId.replace("mapbox:", "");
      console.log(`[Autocomplete] Fetching Mapbox details for feature: ${rawId}`);

      const { data, error } = await supabase.functions.invoke("mapbox-autocomplete", {
        body: { mode: "details", feature_id: rawId },
      });

      if (error) {
        console.warn("[Autocomplete] Mapbox details edge function error:", error);
        return null;
      }

      if (data && data.success && data.details) {
        return data.details as AddressDetails;
      }

      console.warn("[Autocomplete] Mapbox details returned unexpected shape:", data);
      return null;
    }

    // ── Legacy: Nominatim cache lookup ──────────────────────────
    const item = searchCache.find(
      (cached) => String(cached.place_id || cached.osm_id) === String(placeId)
    );

    if (!item) {
      console.log(`[Autocomplete] Place ID ${placeId} not found in Nominatim cache, calling address-place-details edge function...`);
      const { data, error } = await supabase.functions.invoke(`address-place-details?place_id=${encodeURIComponent(placeId)}`);
      
      if (error) {
        console.error("Error calling address-place-details:", error);
        return null;
      }
      return data as AddressDetails;
    }

    const addr = item.address || {};
    const houseNumber = addr.house_number || "";
    const road = addr.road || "";
    const streetAddress = `${houseNumber} ${road}`.trim() || item.display_name.split(",")[0];
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || "";
    const province = addr.state || addr.province || addr.region || "";
    const postalCode = addr.postcode || addr.postal_code || "";
    const country = addr.country || "South Africa";

    return {
      formatted_address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon), // Nominatim response uses 'lon'
      street_number: houseNumber,
      route: road,
      street_address: streetAddress,
      city: city,
      province: province,
      postal_code: postalCode,
      country: country,
      suburb: addr.suburb || addr.neighbourhood || "",
    } as any;
  } catch (error) {
    console.error("Error retrieving address details:", error);
    return null;
  }
};

/**
 * Fetch nearby pickup points from Bob Go API (Mocked fallback)
 */
export const fetchPickupPoints = async (lat: number, lng: number): Promise<PickupPoint[]> => {
  try {
    const mockPickupPoints: PickupPoint[] = [
      {
        name: "Pep Stores - Menlyn",
        distance: "1.2 km",
        address: "Shop 123, Menlyn Park Shopping Centre, Pretoria",
      },
      {
        name: "Pep Stores - Brooklyn",
        distance: "2.5 km",
        address: "Shop 45, Brooklyn Mall, Pretoria",
      },
      {
        name: "Pep Stores - Centurion",
        distance: "5.8 km",
        address: "Shop 67, Centurion Mall, Centurion",
      },
    ];

    return mockPickupPoints;
  } catch (error) {
    return [];
  }
};
