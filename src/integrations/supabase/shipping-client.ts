// Shipping Edge Function Client
// Routes to the new unified shipping functions (get-rates, create-shipment, track-shipment, etc.)
// Replaces the old BobGo client

import { supabase } from "@/integrations/supabase/client";
import { IS_PRODUCTION } from "@/config/envParser";

/**
 * Invoke a shipping edge function
 */
export async function invokeShippingFunction<T = unknown>(
  functionName: string,
  options?: {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const headers: Record<string, string> = {
      ...options?.headers,
    };

    // Force ShipLogic for non-production environments if requested
    const body = {
      ...options?.body,
    };

    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      headers,
    });

    if (error) {
      return { data: null, error };
    }

    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Get shipping rates from configured providers (ShipLogic sandbox / The Courier Guy production)
 */
export async function getShippingRates(payload: {
  collection_address?: {
    street_address: string;
    local_area?: string;
    city: string;
    zone?: string;
    country?: string;
    code: string;
    company?: string;
    type?: "residential" | "business";
    lat?: number;
    lng?: number;
  };
  collection_pickup_point_id?: string;
  delivery_address?: {
    street_address: string;
    local_area?: string;
    city: string;
    zone?: string;
    country?: string;
    code: string;
    company?: string;
    type?: "residential" | "business";
    lat?: number;
    lng?: number;
  };
  delivery_pickup_point_id?: string;
  parcels: {
    submitted_length_cm: number;
    submitted_width_cm: number;
    submitted_height_cm: number;
    submitted_weight_kg: number;
    parcel_description?: string;
  }[];
  declared_value?: number;
  collection_min_date?: string;
  delivery_min_date?: string;
}) {
  return invokeShippingFunction("get-rates", { body: payload as unknown as Record<string, unknown> });
}

/**
 * Create a shipment
 */
export async function createShipment(payload: Record<string, unknown>) {
  return invokeShippingFunction("create-shipment", { body: payload });
}

/**
 * Track a shipment by tracking reference or order ID
 */
export async function trackShipment(params: {
  tracking_reference?: string;
  order_id?: string;
  provider?: string;
}) {
  return invokeShippingFunction("track-shipment", { body: params as Record<string, unknown> });
}

/**
 * Cancel a shipment
 */
export async function cancelShipment(params: {
  tracking_reference?: string;
  order_id?: string;
}) {
  return invokeShippingFunction("cancel-shipment", { body: params as Record<string, unknown> });
}

/**
 * Get shipping label / waybill
 */
export async function getShipmentLabel(params: {
  shipment_id?: string;
  order_id?: string;
  label_type?: "waybill" | "sticker";
}) {
  return invokeShippingFunction("get-shipment-label", { body: params as Record<string, unknown> });
}

/**
 * Get nearby pickup points (lockers, counters, etc.)
 */
export async function getPickupPoints(params: {
  lat: number;
  lng: number;
  type?: "locker" | "counter" | "point";
  order_closest?: boolean;
}) {
  return invokeShippingFunction("get-pickup-points", { body: params as Record<string, unknown> });
}

/**
 * Update an existing shipment
 */
export async function updateShipment(params: {
  shipment_id: string;
  order_id?: string;
  shipment_data: Record<string, unknown>;
}) {
  return invokeShippingFunction("update-shipment", {
    body: { action: "update_shipment", ...params } as Record<string, unknown>,
  });
}

/**
 * Update a parcel within a shipment
 */
export async function updateParcel(params: {
  shipment_id: string;
  parcel_id?: string;
  parcel_data: Record<string, unknown>;
}) {
  return invokeShippingFunction("update-shipment", {
    body: { action: "update_parcel", ...params } as Record<string, unknown>,
  });
}

/**
 * Create a return shipment for a dispute
 */
export async function createReturnShipment(params: {
  order_id: string;
}) {
  return invokeShippingFunction("update-shipment", {
    body: { action: "create_return", ...params } as Record<string, unknown>,
  });
}

