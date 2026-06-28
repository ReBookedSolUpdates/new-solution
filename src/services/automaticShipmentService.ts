import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/utils/errorUtils";
import { getUserProfile } from "@/utils/profileUtils";
import {
  createCourierGuyShipment,
  CourierGuyShipmentData,
} from "./courierGuyService";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  pickup_address?: {
    complex?: string;
    unitNumber?: string;
    streetAddress: string;
    suburb?: string;
    city: string;
    province: string;
    postalCode: string;
  };
  shipping_address?: {
    complex?: string;
    unitNumber?: string;
    streetAddress: string;
    suburb?: string;
    city: string;
    province: string;
    postalCode: string;
  };
  addresses_same?: boolean;
}

interface BookDetails {
  id: string;
  title: string;
  author: string;
  price: number;
  sellerId: string;
}

/**
 * Get user profile with address information
 * Returns null if user not found, but won't throw errors
 */
export const getUserProfileWithAddresses = async (
  userId: string,
): Promise<UserProfile | null> => {
  try {
    // Try to get encrypted addresses first
    let profile = null;

    try {
      const { getSimpleUserAddresses } = await import("@/services/simplifiedAddressService");
      const addressData = await getSimpleUserAddresses(userId);

      if (addressData) {
        // Get basic profile info and combine with encrypted addresses
        const basicProfile = await getUserProfile<UserProfile>(
          userId,
          `id, name, email, addresses_same`,
          false,
        );

        if (basicProfile) {
          profile = {
            ...basicProfile,
            pickup_address: addressData.pickup_address,
            shipping_address: addressData.shipping_address,
          };
        }
      }
    } catch (error) {
      // Failed to get encrypted addresses
    }

    // No plaintext fallback allowed; if encrypted unavailable, we'll handle as manual shipment

    if (!profile) {
      return null;
    }

    // If profile exists but missing address fields, ensure they're set to null
    return {
      ...profile,
      pickup_address: profile.pickup_address || null,
      shipping_address: profile.shipping_address || null,
      addresses_same: profile.addresses_same || false,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Format address for Courier Guy API
 */
const formatAddressForCourierGuy = (address: any): string => {
  if (!address) return "";

  const parts = [
    address.complex,
    address.unitNumber,
    address.streetAddress,
    address.suburb,
  ].filter(Boolean);

  return parts.join(", ");
};

/**
 * Create a manual shipment notification when automatic shipment isn't possible
 */
export const createManualShipmentNotification = async (
  bookDetails: BookDetails,
  buyerId: string,
): Promise<void> => {
  try {
    // In a real implementation, this would:
    // 1. Notify admin team to arrange manual shipment
    // 2. Send notification to seller to prepare book
    // 3. Send notification to buyer about delivery timeline

    return;
  } catch (error) {
    // Error creating notification
  }
};

/**
 * Create automatic shipment if addresses are available, otherwise return null
 */
export const createAutomaticShipment = async (
  bookDetails: BookDetails,
  buyerId: string,
): Promise<any> => {
  try {
    // Validate input parameters
    if (!bookDetails?.sellerId || !buyerId) {
      return null;
    }

    // Get seller information (sender)
    const seller = await getUserProfileWithAddresses(bookDetails.sellerId);
    if (!seller) {
      return null;
    }

    if (!seller.pickup_address) {
      return null;
    }

    // Get buyer information (recipient)
    const buyer = await getUserProfileWithAddresses(buyerId);
    if (!buyer) {
      return null;
    }

    // Determine buyer's delivery address
    const buyerDeliveryAddress = buyer.addresses_same
      ? buyer.pickup_address
      : buyer.shipping_address;

    if (!buyerDeliveryAddress) {
      return null;
    }

    // Prepare shipment data
    const shipmentData: CourierGuyShipmentData = {
      collection: {
        contact: seller.name || "Seller",
        phone: "0000000000", // Default phone
        email: seller.email || "",
        address: {
          complex: seller.pickup_address.complex || "",
          unitNumber: seller.pickup_address.unitNumber || "",
          streetAddress: seller.pickup_address.streetAddress,
          suburb: seller.pickup_address.suburb || "",
          city: seller.pickup_address.city,
          province: seller.pickup_address.province,
          postalCode: seller.pickup_address.postalCode,
        },
      },
      delivery: {
        contact: buyer.name || "Buyer",
        phone: "0000000000", // Default phone
        email: buyer.email || "",
        address: {
          complex: buyerDeliveryAddress.complex || "",
          unitNumber: buyerDeliveryAddress.unitNumber || "",
          streetAddress: buyerDeliveryAddress.streetAddress,
          suburb: buyerDeliveryAddress.suburb || "",
          city: buyerDeliveryAddress.city,
          province: buyerDeliveryAddress.province,
          postalCode: buyerDeliveryAddress.postalCode,
        },
      },
      parcels: [
        {
          reference: `BOOK-${bookDetails.id}`,
          description: `${bookDetails.title} by ${bookDetails.author}`,
          value: bookDetails.price,
          weight: 0.5, // Default weight for books
          dimensions: {
            length: 25,
            width: 20,
            height: 3,
          },
        },
      ],
      serviceType: "ECO",
      instructions: `Book purchase: ${bookDetails.title}`,
    };

    // Create the shipment
    const shipmentResult = await createCourierGuyShipment(shipmentData);

    return shipmentResult;
  } catch (error) {
    // Create manual shipment notification as fallback
    await createManualShipmentNotification(bookDetails, buyerId);

    return null;
  }
};

/**
 * Check if a user has addresses configured for automatic shipments
 */
export const checkShipmentEligibility = async (
  userId: string,
): Promise<{
  canSell: boolean;
  canBuy: boolean;
  errors: string[];
}> => {
  try {
    const profile = await getUserProfileWithAddresses(userId);

    if (!profile) {
      return {
        canSell: false,
        canBuy: false,
        errors: ["User profile not found"],
      };
    }

    const errors: string[] = [];

    // Check if user can sell (needs pickup address)
    const canSell = Boolean(
      profile.pickup_address?.streetAddress &&
        profile.pickup_address?.city &&
        profile.pickup_address?.province &&
        profile.pickup_address?.postalCode,
    );

    if (!canSell) {
      errors.push("Pickup address required for selling books");
    }

    // Check if user can buy (needs delivery address)
    const deliveryAddress = profile.addresses_same
      ? profile.pickup_address
      : profile.shipping_address;

    const canBuy = Boolean(
      deliveryAddress?.streetAddress &&
        deliveryAddress?.city &&
        deliveryAddress?.province &&
        deliveryAddress?.postalCode,
    );

    if (!canBuy) {
      errors.push("Delivery address required for buying books");
    }

    return { canSell, canBuy, errors };
  } catch (error) {
    return {
      canSell: false,
      canBuy: false,
      errors: ["Error validating addresses"],
    };
  }
};
