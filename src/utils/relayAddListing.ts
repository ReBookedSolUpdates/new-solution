import { callEdgeFunction } from "@/utils/edgeFunctionClient";

export interface RelayListingPayload {
  id?: string;
  title: string;
  description?: string;
  price: number;
  condition?: string;
  item_type?: "textbook" | "uniform" | "school_supply";
  itemType?: "textbook" | "uniform" | "school_supply";
  available_quantity?: number;
  initial_quantity?: number;
  // Images
  front_cover?: string;
  back_cover?: string;
  inside_pages?: string;
  image_url?: string;
  imageUrl?: string;
  additional_images?: string[];
  // Books
  isbn?: string;
  publisher?: string;
  grade?: string;
  university?: string;
  university_year?: string;
  // Uniforms
  school_name?: string;
  gender?: string;
  size?: string;
  color?: string;
  material?: string;
  pattern?: string;
  // Supplies
  subject?: string;
  // Shipping
  parcel_size?: string;
  province?: string;
  brand?: string;
  [key: string]: unknown;
}

/**
 * Send a created listing to the relay-add-listing edge function which
 * forwards a Google Merchant Center–shaped payload to Relay.
 * Failures are logged but never thrown — listing creation must not block.
 */
export async function sendListingToRelay(
  listing: RelayListingPayload
): Promise<void> {
  try {
    await callEdgeFunction("relay-add-listing", {
      method: "POST",
      body: { listing },
    });
  } catch (err) {
    // Non-blocking: log to console only
    console.warn("[relay-add-listing] Failed to forward listing:", err);
  }
}
