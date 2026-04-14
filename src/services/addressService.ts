import { supabase } from "@/integrations/supabase/client";
import { updateAddressValidation } from "./addressValidationService";
import { safeLogError } from "@/utils/errorHandling";
import { safeLogError as safelog, formatSupabaseError } from "@/utils/safeErrorLogger";
import { getSafeErrorMessage } from "@/utils/errorMessageUtils";
import {
  normalizeAddressFields,
  validateAddressStructure,
  normalizeProvinceName,
  normalizeProvinceCode,
  CanonicalAddress,
  prepareForStorage,
  prepareAddressForEncryption,
} from "@/utils/addressNormalizationUtils";

interface Address {
  complex?: string;
  unitNumber?: string;
  streetAddress?: string;
  suburb?: string;
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// Encrypt an address using the encrypt-address edge function
const encryptAddress = async (address: Address, options?: { save?: { table: string; target_id: string; address_type: string } }) => {
  try {
    const { data, error } = await supabase.functions.invoke('encrypt-address', {
      body: {
        object: address,
        ...options
      }
    });

    if (error) {
      return null; // Return null instead of throwing error
    }

    return data;
  } catch (error) {
    return null; // Return null for graceful fallback
  }
};

// Decrypt an address using the improved decrypt-address edge function with retry logic
const decryptAddress = async (params: { table: 'profiles' | 'orders' | 'books'; target_id: string; address_type?: 'pickup' | 'shipping' | 'delivery' }, retries = 2) => {
  // Dedupe/debounce decrypt calls to protect the edge function from runaway UI loops
  const cacheKey = `${params.table}:${params.target_id}:${params.address_type || 'pickup'}`;
  const now = Date.now();
  const ttlMs = 60_000;
  (decryptAddress as any)._cache ??= new Map<string, { ts: number; value: any | null }>();
  (decryptAddress as any)._inflight ??= new Map<string, Promise<any | null>>();
  const cache: Map<string, { ts: number; value: any | null }> = (decryptAddress as any)._cache;
  const inflight: Map<string, Promise<any | null>> = (decryptAddress as any)._inflight;

  const cached = cache.get(cacheKey);
  if (cached && (now - cached.ts) < ttlMs) return cached.value;
  const existing = inflight.get(cacheKey);
  if (existing) return await existing;

  const run = (async () => {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use the new fetch format to target exact encrypted columns
      const { data, error } = await supabase.functions.invoke('decrypt-address', {
        body: {
          fetch: {
            table: params.table,
            target_id: params.target_id,
            address_type: params.address_type || 'pickup',
          },
        },
      });

      if (error) {
        lastError = error;
        if (attempt < retries) {
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        cache.set(cacheKey, { ts: Date.now(), value: null });
        return null;
      }

      if (data?.success) {
        cache.set(cacheKey, { ts: Date.now(), value: data.data || null });
        return data.data || null;
      } else {
        cache.set(cacheKey, { ts: Date.now(), value: null });
        return null;
      }
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      cache.set(cacheKey, { ts: Date.now(), value: null });
      return null;
    }
  }

  return null;
  })();

  inflight.set(cacheKey, run);
  try {
    return await run;
  } finally {
    inflight.delete(cacheKey);
  }
};

export const saveUserAddresses = async (
  userId: string,
  pickupAddress: Address,
  shippingAddress: Address,
  addressesSame: boolean,
) => {
  try {
    // Check if pickup address is intentionally being deleted (all fields empty)
    const isPickupDeleted =
      pickupAddress &&
      !pickupAddress.street &&
      !pickupAddress.streetAddress &&
      !pickupAddress.street_address &&
      !pickupAddress.city &&
      !pickupAddress.province &&
      !pickupAddress.postalCode &&
      !pickupAddress.postal_code;

    // Check if shipping address is intentionally being deleted (all fields empty)
    const isShippingDeleted =
      shippingAddress &&
      !shippingAddress.street &&
      !shippingAddress.streetAddress &&
      !shippingAddress.street_address &&
      !shippingAddress.city &&
      !shippingAddress.province &&
      !shippingAddress.postalCode &&
      !shippingAddress.postal_code;

    // Validate address structure before encryption (skip if being deleted)
    if (!isPickupDeleted) {
      const pickupErrors = validateAddressStructure(pickupAddress);
      if (pickupErrors.length > 0) {
        throw new Error(`Pickup address invalid: ${pickupErrors.join("; ")}`);
      }
    }

    if (!addressesSame && !isShippingDeleted) {
      const shippingErrors = validateAddressStructure(shippingAddress);
      if (shippingErrors.length > 0) {
        throw new Error(`Shipping address invalid: ${shippingErrors.join("; ")}`);
      }
    }

    // Normalize addresses to ensure consistency
    // If pickup address is being deleted, use empty object for normalization
    let normalizedPickup = isPickupDeleted
      ? { country: "South Africa" } as CanonicalAddress
      : normalizeAddressFields(pickupAddress);

    if (!isPickupDeleted && !normalizedPickup) {
      throw new Error("Failed to normalize pickup address");
    }

    let normalizedShipping = normalizedPickup;
    if (!addressesSame) {
      // If shipping address is being deleted, use empty object for normalization
      normalizedShipping = isShippingDeleted
        ? { country: "South Africa" } as CanonicalAddress
        : normalizeAddressFields(shippingAddress);
      if (!isShippingDeleted && !normalizedShipping) {
        throw new Error("Failed to normalize shipping address");
      }
    }

    // First validate addresses (keep existing validation) - skip validation if pickup is deleted
    let result: any = { canListBooks: false };
    if (!isPickupDeleted) {
      result = await updateAddressValidation(
        userId,
        normalizedPickup as any,
        normalizedShipping as any,
        addressesSame,
      );
    }

    let encryptionResults = {
      pickup: false,
      shipping: false
    };

    // Try to encrypt and save pickup address (use comprehensive encryption preparation)
    // Skip encryption if address is being deleted
    if (!isPickupDeleted) {
      try {
        const pickupForEncryption = prepareAddressForEncryption(normalizedPickup);
        const pickupResult = await encryptAddress(pickupForEncryption, {
          save: {
            table: 'profiles',
            target_id: userId,
            address_type: 'pickup'
          }
        });

        // EXPLICIT ERROR CHECK: Encryption must succeed
        if (!pickupResult || !pickupResult.success) {
          throw new Error('Encryption service returned failure for pickup address');
        }

        encryptionResults.pickup = true;
      } catch (encryptError) {
        // Provide meaningful error to user
        const errorMsg = encryptError instanceof Error ? encryptError.message : 'Failed to encrypt pickup address';
        safeLogError('Pickup address encryption failed', encryptError);
        throw new Error(`Failed to save pickup address: ${errorMsg}. Please check your internet connection and try again.`);
      }
    } else {
      // If deleting the pickup address, clear the encrypted fields from database
      try {
        const { error: deleteError } = await supabase
          .from("profiles")
          .update({
            pickup_address_encrypted: null
          })
          .eq("id", userId);

        if (deleteError) {
          throw new Error(
            deleteError.message ||
            deleteError.hint ||
            'Failed to update database'
          );
        }
        encryptionResults.pickup = true;
      } catch (deletionError) {
        let errorMsg = 'Unknown error';
        if (deletionError instanceof Error) {
          errorMsg = deletionError.message;
        } else if (typeof deletionError === 'object' && deletionError !== null) {
          if ('message' in deletionError) {
            errorMsg = String((deletionError as any).message);
          } else if ('hint' in deletionError && (deletionError as any).hint) {
            errorMsg = String((deletionError as any).hint);
          } else {
            errorMsg = JSON.stringify(deletionError).substring(0, 100);
          }
        }
        safeLogError('Pickup address deletion failed', { deletionError, userId });
        throw new Error(`Failed to delete pickup address: ${errorMsg}`);
      }
    }

    // Try to encrypt and save shipping address (if different, use comprehensive encryption preparation)
    if (!addressesSame) {
      // If deleting the shipping address, clear the encrypted fields from database
      if (isShippingDeleted) {
        try {
          const { error: deleteError } = await supabase
            .from("profiles")
            .update({
              shipping_address_encrypted: null
            })
            .eq("id", userId);

          if (deleteError) {
            throw new Error(
              deleteError.message ||
              deleteError.hint ||
              'Failed to update database'
            );
          }
          encryptionResults.shipping = true;
        } catch (deletionError) {
          let errorMsg = 'Unknown error';
          if (deletionError instanceof Error) {
            errorMsg = deletionError.message;
          } else if (typeof deletionError === 'object' && deletionError !== null) {
            if ('message' in deletionError) {
              errorMsg = String((deletionError as any).message);
            } else if ('hint' in deletionError && (deletionError as any).hint) {
              errorMsg = String((deletionError as any).hint);
            } else {
              errorMsg = JSON.stringify(deletionError).substring(0, 100);
            }
          }
          safeLogError('Shipping address deletion failed', { deletionError, userId });
          throw new Error(`Failed to delete shipping address: ${errorMsg}`);
        }
      } else {
        try {
          const shippingForEncryption = prepareAddressForEncryption(normalizedShipping);
          const shippingResult = await encryptAddress(shippingForEncryption, {
            save: {
              table: 'profiles',
              target_id: userId,
              address_type: 'shipping'
            }
          });

          // EXPLICIT ERROR CHECK: Encryption must succeed
          if (!shippingResult || !shippingResult.success) {
            throw new Error('Encryption service returned failure for shipping address');
          }

          encryptionResults.shipping = true;
        } catch (encryptError) {
          // Provide meaningful error to user
          const errorMsg = encryptError instanceof Error ? encryptError.message : 'Failed to encrypt shipping address';
          safeLogError('Shipping address encryption failed', encryptError);
          throw new Error(`Failed to save shipping address: ${errorMsg}. Please check your internet connection and try again.`);
        }
      }
    } else {
      // If addresses are the same, mark shipping encryption as successful if pickup succeeded
      encryptionResults.shipping = encryptionResults.pickup;
    }

    // Only update encryption status and addresses_same flag - no plaintext storage
    const updateData: any = {
      addresses_same: addressesSame,
      encryption_status: (isPickupDeleted && (addressesSame || isShippingDeleted)) ? 'none' : 'encrypted',
    };

    // Check encryption results and throw explicit error if any failed
    if (!encryptionResults.pickup) {
      throw new Error("Failed to encrypt pickup address. Please try again.");
    } else if (!addressesSame && !encryptionResults.shipping) {
      throw new Error("Failed to encrypt shipping address. Please try again.");
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      safeLogError("Error updating profile metadata", error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    // VERIFICATION: Re-query to confirm data was saved
    try {
      const { data: verifyData, error: verifyError } = await supabase
        .from("profiles")
        .select("pickup_address_encrypted, shipping_address_encrypted, addresses_same, encryption_status")
        .eq("id", userId)
        .single();

      if (verifyError || !verifyData) {
        throw new Error('Failed to verify address save');
      }

      // Verify the encrypted fields are set (unless being deleted)
      if (!isPickupDeleted && !verifyData.pickup_address_encrypted) {
        throw new Error('Pickup address failed to save to database. Please try again.');
      }

      if (!addressesSame && !isShippingDeleted && !verifyData.shipping_address_encrypted) {
        throw new Error('Shipping address failed to save to database. Please try again.');
      }
    } catch (verifyError) {
      const errorMsg = verifyError instanceof Error ? verifyError.message : 'Unknown verification error';
      safeLogError("Address save verification failed", verifyError);
      throw new Error(`Address verification failed: ${errorMsg}`);
    }

    return {
      pickup_address: pickupAddress,
      shipping_address: addressesSame ? pickupAddress : shippingAddress,
      addresses_same: addressesSame,
      canListBooks: result.canListBooks,
      encryption_status: {
        pickup: encryptionResults.pickup,
        shipping: encryptionResults.shipping
      }
    };
  } catch (error) {
    safeLogError("Error saving addresses", error);
    throw error;
  }
};

export const getSellerPickupAddress = async (sellerId: string) => {
  try {
    // First get the book ID for this seller to use for decryption
    const { data: bookData, error: bookError } = await supabase
      .from("books")
      .select("id, pickup_address_encrypted")
      .eq("seller_id", sellerId)
      .limit(1)
      .maybeSingle();

    if (bookError) {
      return null;
    }

    if (!bookData) {
      return null;
    }

    if (!bookData.pickup_address_encrypted) {
      return null;
    }

    // Use the decrypt-address edge function to decrypt the data from books table
    const decryptedAddress = await decryptAddress({
      table: 'books',
      target_id: bookData.id,
      address_type: 'pickup'
    });

    if (decryptedAddress) {
      return decryptedAddress;
    }

    return null;
  } catch (error) {
    // Handle network errors
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        "Network connection error while fetching seller address.",
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Failed to get seller pickup address: ${errorMessage}`);
  }
};

export const getUserAddresses = async (userId: string) => {
  try {
    // Decrypt pickup address directly via edge function
    let pickupAddress: CanonicalAddress | null = null;
    let shippingAddress: CanonicalAddress | null = null;

    try {
      const pickup = await decryptAddress({
        table: 'profiles',
        target_id: userId,
        address_type: 'pickup'
      });
      pickupAddress = normalizeAddressFields(pickup);
    } catch (error) {
      // Log error but continue - pickup address is optional
      console.warn("Failed to decrypt pickup address:", error instanceof Error ? error.message : "unknown error");
    }

    // For shipping address, try the decrypt function directly
    try {
      const shipping = await decryptAddress({
        table: 'profiles',
        target_id: userId,
        address_type: 'shipping'
      });
      shippingAddress = normalizeAddressFields(shipping);
    } catch (error) {
      // Log error but continue - shipping address is optional
      console.warn("Failed to decrypt shipping address:", error instanceof Error ? error.message : "unknown error");
    }

    // No plaintext fallback allowed

    if (pickupAddress || shippingAddress) {
      // Get addresses_same flag from profile metadata
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("addresses_same")
          .eq("id", userId)
          .single();

        const addressesSame = profileData?.addresses_same ?? (
          pickupAddress && shippingAddress ?
            JSON.stringify(pickupAddress) === JSON.stringify(shippingAddress) :
            !shippingAddress
        );

        return {
          pickup_address: pickupAddress,
          shipping_address: shippingAddress || pickupAddress,
          addresses_same: addressesSame,
        };
      } catch (metadataError) {
        // If we can't get metadata, still return addresses if we have them
        return {
          pickup_address: pickupAddress,
          shipping_address: shippingAddress || pickupAddress,
          addresses_same: false,
        };
      }
    }

    return null;
  } catch (error) {
    safelog("Error in getUserAddresses", error, {
      userId,
    });

    if (
      error instanceof TypeError &&
      (error as any).message?.includes("Failed to fetch")
    ) {
      throw new Error(
        "Network connection error. Please check your internet connection and try again.",
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Failed to load addresses: ${errorMessage}`);
  }
};

// Update all user's book listings with new pickup address and province
export const updateBooksPickupAddress = async (
  userId: string,
  newPickupAddress: any,
): Promise<{ success: boolean; updatedCount: number; error?: string }> => {
  try {
    // Check if we are clearing the address
    const isClearing = !newPickupAddress || (
      !newPickupAddress.street &&
      !newPickupAddress.streetAddress &&
      !newPickupAddress.street_address &&
      !newPickupAddress.city
    );

    // Validate and normalize address before encryption (only if not clearing)
    let normalizedAddress = null;
    let province = null;

    if (!isClearing) {
      const validationErrors = validateAddressStructure(newPickupAddress);
      if (validationErrors.length > 0) {
        return {
          success: false,
          updatedCount: 0,
          error: validationErrors.join("; "),
        };
      }

      // Normalize address to ensure consistency
      normalizedAddress = normalizeAddressFields(newPickupAddress);
      if (!normalizedAddress) {
        return {
          success: false,
          updatedCount: 0,
          error: "Invalid address structure",
        };
      }
      province = normalizedAddress.province;
    }

    // Get all user's books
    const { data: books, error: fetchError } = await supabase
      .from("books")
      .select("id")
      .eq("seller_id", userId);

    if (fetchError) {
      return {
        success: false,
        updatedCount: 0,
        error: fetchError.message || "Failed to fetch book listings",
      };
    }

    if (!books || books.length === 0) {
      return {
        success: true,
        updatedCount: 0,
      };
    }

    // Perform the update for each book
    if (isClearing) {
      // CLEAR all book pickup addresses
      const { data, error } = await supabase
        .from("books")
        .update({
          pickup_address_encrypted: null,
          province: null
        })
        .eq("seller_id", userId)
        .select("id");

      if (error) throw error;
      return { success: true, updatedCount: data?.length || 0 };
    } else {
      // UPDATE with new encrypted address
      const addressForEncryption = prepareAddressForEncryption(normalizedAddress!);
      const encryptPromises = books.map(book =>
        encryptAddress(addressForEncryption, {
          save: {
            table: 'books',
            target_id: book.id,
            address_type: 'pickup'
          }
        })
      );

      await Promise.all(encryptPromises);

      // Update only province metadata - addresses are encrypted only
      const updateData: any = {};
      if (province) {
        updateData.province = province;
      }

      const { data, error } = await supabase
        .from("books")
        .update(updateData)
        .eq("seller_id", userId)
        .select("id");

      if (error) {
        return {
          success: false,
          updatedCount: 0,
          error: error.message || "Failed to update book listings",
        };
      }

      return {
        success: true,
        updatedCount: data?.length || 0,
      };
    }
  } catch (error) {
    return {
      success: false,
      updatedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Get encrypted book pickup address for shipping calculations
export const getBookPickupAddress = async (bookId: string) => {
  try {
    // Get encrypted address only - no plaintext fallback
    const decryptedAddress = await decryptAddress({
      table: 'books',
      target_id: bookId,
      address_type: 'pickup'
    });

    if (decryptedAddress) {
      return decryptedAddress;
    }

    return null;
  } catch (error) {
    throw error;
  }
};

// Get encrypted order shipping address for delivery
export const getOrderShippingAddress = async (orderId: string) => {
  try {
    // Get encrypted address only - no plaintext fallback
    const decryptedAddress = await decryptAddress({
      table: 'orders',
      target_id: orderId,
      address_type: 'shipping'
    });

    if (decryptedAddress) {
      return decryptedAddress;
    }

    return null;
  } catch (error) {
    throw error;
  }
};
