import { supabase } from "@/integrations/supabase/client";
import { CheckoutAddress } from "@/types/checkout";
import { getProvinceFromLocker } from "@/utils/provinceExtractorUtils";
import {
  normalizeAddressFields,
  validateAddressStructure,
  prepareForStorage,
  prepareAddressForEncryption,
  canonicalToCamelCase,
  CanonicalAddress,
} from "@/utils/addressNormalizationUtils";

interface SimpleAddress {
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
}

const isMobileDevice = () => {
  return typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
};

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg.includes('404') || errorMsg.includes('Not Found') ||
          errorMsg.includes('401') || errorMsg.includes('403')) {
        throw error;
      }

      if (attempt === maxAttempts) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Dedupe decrypt requests (prevents runaway loops from thrashing edge functions)
const DECRYPT_CACHE_TTL_MS = 60_000;
const decryptCache = new Map<string, { ts: number; value: any | null }>();
const decryptInflight = new Map<string, Promise<any | null>>();

const decryptAddress = async (params: { table: string; target_id: string; address_type?: string }) => {
  const isMobile = isMobileDevice();

  try {
    const { table, target_id, address_type } = params;
    const cacheKey = `${table}:${target_id}:${address_type || 'pickup'}`;
    const cached = decryptCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < DECRYPT_CACHE_TTL_MS) {
      return cached.value;
    }
    const inflight = decryptInflight.get(cacheKey);
    if (inflight) return await inflight;

    const run = (async () => {
    let encryptedColumn: string;

    switch (address_type || 'pickup') {
      case 'pickup':
        encryptedColumn = 'pickup_address_encrypted';
        break;
      case 'shipping':
        encryptedColumn = 'shipping_address_encrypted';
        break;
      case 'delivery':
        encryptedColumn = 'delivery_address_encrypted';
        break;
      default:
        throw new Error('Invalid address_type');
    }


    const { data: record, error: fetchError } = await supabase
      .from(table)
      .select(`${encryptedColumn}, address_encryption_version`)
      .eq('id', target_id)
      .maybeSingle();

    if (fetchError) {
      return null;
    }

    if (!record || !record[encryptedColumn]) {
      return null;
    }

    const encryptedData = record[encryptedColumn];

    let bundle;
    try {
      bundle = typeof encryptedData === 'string' ? JSON.parse(encryptedData) : encryptedData;
    } catch (parseError) {
      return null;
    }

    if (!bundle.ciphertext || !bundle.iv || !bundle.authTag) {
      return null;
    }

    const makeRequest = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), isMobile ? 15000 : 10000);

      try {
        const requestBody = {
          encryptedData: bundle.ciphertext,
          iv: bundle.iv,
          authTag: bundle.authTag,
          aad: bundle.aad,
          version: bundle.version || record.address_encryption_version || 1
        };

        const { data, error } = await supabase.functions.invoke('decrypt-address', {
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
            ...(isMobile && { 'X-Mobile-Request': 'true' })
          }
        });

        clearTimeout(timeoutId);
        return { data, error } as const;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    try {
      const { data, error } = await (isMobile ? retryWithBackoff(makeRequest, 3, 1000) : makeRequest());

      if (error) {
        decryptCache.set(cacheKey, { ts: Date.now(), value: null });
        return null;
      }

      if (data?.success && data?.data) {
        decryptCache.set(cacheKey, { ts: Date.now(), value: data.data });
        return data.data;
      } else {
        decryptCache.set(cacheKey, { ts: Date.now(), value: null });
        return null;
      }
    } catch (error) {
      decryptCache.set(cacheKey, { ts: Date.now(), value: null });
      return null;
    }
    })();

    decryptInflight.set(cacheKey, run);
    try {
      const result = await run;
      return result;
    } finally {
      decryptInflight.delete(cacheKey);
    }
  } catch (error) {
    return null;
  }
};

const encryptAddress = async (address: SimpleAddress, options?: { save?: { table: string; target_id: string; address_type: string } }) => {
  try {
    const { data, error } = await supabase.functions.invoke('encrypt-address', {
      body: {
        object: address,
        ...options
      }
    });

    if (error) {
      throw new Error(`Encryption service error: ${error.message || 'Unknown error'}`);
    }

    if (!data || !data.success) {
      throw new Error('Encryption service returned failure');
    }

    return data as any;
  } catch (error) {
    // Re-throw with context
    const errorMsg = error instanceof Error ? error.message : 'Unknown encryption error';
    throw new Error(`Address encryption failed: ${errorMsg}`);
  }
};

export const getSellerDeliveryAddress = async (
  sellerId: string,
): Promise<CheckoutAddress | null> => {
  try {
    if (!sellerId || typeof sellerId !== 'string' || sellerId.length < 10) {
      return null;
    }

    const decryptedAddress = await decryptAddress({
      table: 'profiles',
      target_id: sellerId,
      address_type: 'pickup'
    });

    if (decryptedAddress) {
      // Normalize the decrypted address to ensure consistency
      const normalized = normalizeAddressFields(decryptedAddress);
      if (normalized) {
        const address: CheckoutAddress = {
          street: normalized.street,
          city: normalized.city,
          province: normalized.province,
          postal_code: normalized.postalCode,
          country: normalized.country || "South Africa",
          suburb: normalized.suburb || "",
          latitude: normalized.latitude || null,
          longitude: normalized.longitude || null,
          type: normalized.type || "residential",
          additional_info: (decryptedAddress as any).company || (decryptedAddress as any).additional_info || ""
        };
        return address;
      }
    }

    try {
      const { getSellerPickupAddress } = await import("@/services/addressService");
      const fallbackAddress = await getSellerPickupAddress(sellerId);
      if (fallbackAddress) {
        // Normalize fallback address
        const normalized = normalizeAddressFields(fallbackAddress);
        if (normalized) {
          const mappedAddress: CheckoutAddress = {
            street: normalized.street,
            city: normalized.city,
            province: normalized.province,
            postal_code: normalized.postalCode,
            country: normalized.country || "South Africa",
            suburb: normalized.suburb || "",
            latitude: normalized.latitude || null,
            longitude: normalized.longitude || null,
            type: normalized.type || "residential",
            additional_info: (fallbackAddress as any).company || (fallbackAddress as any).additional_info || ""
          };
          return mappedAddress;
        }
      }
    } catch (fallbackError) {
    }

    return null;
  } catch (error) {
    return null;
  }
};

export const getSimpleUserAddresses = async (userId: string) => {
  try {
    const [decryptedPickup, decryptedShipping] = await Promise.all([
      decryptAddress({ table: 'profiles', target_id: userId, address_type: 'pickup' }),
      decryptAddress({ table: 'profiles', target_id: userId, address_type: 'shipping' })
    ]);

    if (decryptedPickup || decryptedShipping) {
      return {
        pickup_address: decryptedPickup,
        shipping_address: decryptedShipping || decryptedPickup,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
};

export const saveSimpleUserAddresses = async (
  userId: string,
  pickupAddress: SimpleAddress,
  shippingAddress: SimpleAddress,
  addressesAreSame: boolean = false,
) => {
  try {
    // Validate pickup address
    const pickupErrors = validateAddressStructure(pickupAddress);
    if (pickupErrors.length > 0) {
      throw new Error(`Pickup address invalid: ${pickupErrors.join("; ")}`);
    }

    // Normalize pickup address
    const normalizedPickup = normalizeAddressFields(pickupAddress);
    if (!normalizedPickup) {
      throw new Error("Failed to normalize pickup address");
    }

    // Validate and normalize shipping address (if different)
    let normalizedShipping = normalizedPickup;
    if (shippingAddress && !addressesAreSame) {
      const shippingErrors = validateAddressStructure(shippingAddress);
      if (shippingErrors.length > 0) {
        throw new Error(`Shipping address invalid: ${shippingErrors.join("; ")}`);
      }

      const normalized = normalizeAddressFields(shippingAddress);
      if (!normalized) {
        throw new Error("Failed to normalize shipping address");
      }
      normalizedShipping = normalized;
    }

    let pickupEncrypted = false;
    let shippingEncrypted = false;

    if (normalizedPickup) {
      try {
        const pickupForEncryption = prepareAddressForEncryption(normalizedPickup);
        const result = await encryptAddress(pickupForEncryption as SimpleAddress, {
          save: { table: 'profiles', target_id: userId, address_type: 'pickup' }
        });
        if (result && (result as any).success) {
          pickupEncrypted = true;
        } else {
          throw new Error("Encryption service returned invalid response");
        }
      } catch (encryptError) {
        const errorMsg = encryptError instanceof Error ? encryptError.message : 'Unknown error';
        throw new Error(`Failed to save pickup address: ${errorMsg}`);
      }
    }

    if (normalizedShipping && !addressesAreSame) {
      try {
        const shippingForEncryption = prepareAddressForEncryption(normalizedShipping);
        const result = await encryptAddress(shippingForEncryption as SimpleAddress, {
          save: { table: 'profiles', target_id: userId, address_type: 'shipping' }
        });
        if (result && (result as any).success) {
          shippingEncrypted = true;
        } else {
          throw new Error("Encryption service returned invalid response");
        }
      } catch (encryptError) {
        const errorMsg = encryptError instanceof Error ? encryptError.message : 'Unknown error';
        throw new Error(`Failed to save shipping address: ${errorMsg}`);
      }
    } else {
      shippingEncrypted = pickupEncrypted;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        addresses_same: addressesAreSame,
        encryption_status: 'encrypted'
      })
      .eq("id", userId);

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    // VERIFICATION: Confirm data was saved
    try {
      const { data: verifyData, error: verifyError } = await supabase
        .from("profiles")
        .select("pickup_address_encrypted, shipping_address_encrypted")
        .eq("id", userId)
        .single();

      if (verifyError || !verifyData) {
        throw new Error('Failed to verify address save');
      }

      if (!verifyData.pickup_address_encrypted) {
        throw new Error('Pickup address failed to save to database');
      }

      if (!addressesAreSame && !verifyData.shipping_address_encrypted) {
        throw new Error('Shipping address failed to save to database');
      }
    } catch (verifyError) {
      const errorMsg = verifyError instanceof Error ? verifyError.message : 'Unknown error';
      throw new Error(`Address verification failed: ${errorMsg}`);
    }

    return { success: true };
  } catch (error) {
    throw error;
  }
};

export const saveOrderShippingAddress = async (
  orderId: string,
  shippingAddress: SimpleAddress
) => {
  try {
    // Validate address structure
    const errors = validateAddressStructure(shippingAddress);
    if (errors.length > 0) {
      throw new Error(`Invalid shipping address: ${errors.join("; ")}`);
    }

    // Normalize address
    const normalized = normalizeAddressFields(shippingAddress);
    if (!normalized) {
      throw new Error("Failed to normalize shipping address");
    }

    // Prepare for comprehensive encryption
    const addressForEncryption = prepareAddressForEncryption(normalized);

    const result = await encryptAddress(addressForEncryption as SimpleAddress, {
      save: { table: 'orders', target_id: orderId, address_type: 'shipping' }
    });

    if (!result || !(result as any).success) {
      throw new Error("Failed to encrypt shipping address for order");
    }

    // VERIFICATION: Confirm data was saved
    const { data: verifyData, error: verifyError } = await supabase
      .from("orders")
      .select("shipping_address_encrypted")
      .eq("id", orderId)
      .single();

    if (verifyError || !verifyData?.shipping_address_encrypted) {
      throw new Error("Shipping address failed to save to database. Please try again.");
    }

    return { success: true };
  } catch (error) {
    throw error;
  }
};
