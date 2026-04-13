import { supabase } from "@/integrations/supabase/client";

export interface PickupPointLocation {
  id?: string | number;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  distance?: number;
  hours?: string;
  phone?: string;
  type?: string;
  provider?: string;
  provider_slug?: string;
  [key: string]: any;
}

// Keep the old type name as an alias for backwards compatibility
export type BobGoLocation = PickupPointLocation;

/**
 * Fetch nearby pickup points (lockers, counters, etc.) using the new get-pickup-points edge function
 */
export async function getPickupPointLocations(
  latitude: number,
  longitude: number,
  radius?: number,
  type?: "locker" | "counter" | "point"
): Promise<PickupPointLocation[]> {
  try {
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return [];
    }

    const { data, error } = await supabase.functions.invoke("get-pickup-points", {
      body: {
        lat: latitude,
        lng: longitude,
        radius: radius,
        type: type,
        order_closest: true,
      },
    });

    if (error) {
      console.warn("Pickup points fetch error:", error.message);
      return [];
    }

    if (!data || !data.success) {
      return [];
    }

    // Handle nested response: { pickup_points: { count, pickup_points: [...] } }
    // or flat: { pickup_points: [...] }
    let rawPoints = data.pickup_points || [];
    if (rawPoints && !Array.isArray(rawPoints) && rawPoints.pickup_points) {
      rawPoints = rawPoints.pickup_points;
    }
    
    // Normalize the response into our standard format
    if (Array.isArray(rawPoints)) {
      return rawPoints.map((p: any) => ({
        ...p,
        id: p.pickup_point_id || p.id || p.location_id,
        name: p.name || p.address?.company || p.description || "Pickup Point",
        address: typeof p.address === 'object'
          ? (p.address?.street_address ? `${p.address.street_address}, ${p.address.city || ''}, ${p.address.code || ''}`.trim() : '')
          : (p.address || p.street_address || ""),
        full_address: typeof p.full_address === 'object'
          ? (p.full_address?.street_address ? `${p.full_address.street_address}, ${p.full_address.city || ''}, ${p.full_address.code || ''}`.trim() : '')
          : (p.full_address || ""),
        latitude: p.lat || p.latitude || p.address?.lat || 0,
        longitude: p.lng || p.longitude || p.address?.lng || 0,
        distance: p.distance,
        hours: p.trading_hours || p.hours || p.operating_hours,
        phone: p.phone || p.contact_number,
        type: p.type || p.address?.type,
        provider: p.pickup_point_provider || p.provider || p.provider_slug || data.provider || "Pudo",
        provider_slug: p.provider_slug || p.pickup_point_provider_slug || (p.pickup_point_provider ? String(p.pickup_point_provider).toLowerCase() : "pudo"),
        pickup_point_provider_name: p.pickup_point_provider_name || p.provider || p.pickup_point_provider || "Pudo",
        pickup_point_id: p.pickup_point_id,
        available_compartment_sizes: p.available_compartment_sizes,
        structured_trading_hours: p.structured_trading_hours,
      }));
    }

    return [];
  } catch (error) {
    console.warn("Pickup points service error:", error);
    return [];
  }
}

// Backwards-compatible alias
export const getBobGoLocations = getPickupPointLocations;
