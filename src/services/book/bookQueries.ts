import { supabase } from "@/integrations/supabase/client";
import { Book } from "@/types/book";
import { BookFilters, BookQueryResult } from "./bookTypes";
import { mapBookFromDatabase } from "./bookMapper";
import {
  handleBookServiceError,
  logBookServiceError,
} from "./bookErrorHandler";
import {
  logError,
  getErrorMessage,
  logDatabaseError,
} from "@/utils/errorUtils";
import debugLogger from "@/utils/debugLogger";
import { formatSupabaseError } from "@/utils/safeErrorLogger";
import { getSafeErrorMessage } from "@/utils/errorMessageUtils";
// Simple retry function to replace the missing connectionHealthCheck
const retryWithConnection = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};
import { getFallbackBooks } from "@/utils/fallbackBooksData";

// Circuit breaker to prevent error spam
let bookQueryErrorCount = 0;
let lastBookQueryError = 0;
const ERROR_SPAM_THRESHOLD = 5;
const ERROR_COOLDOWN_PERIOD = 60000; // 1 minute

const shouldLogBookError = (): boolean => {
  const now = Date.now();

  // Reset error count after cooldown period
  if (now - lastBookQueryError > ERROR_COOLDOWN_PERIOD) {
    bookQueryErrorCount = 0;
  }

  // Only log if we haven't exceeded the threshold
  if (bookQueryErrorCount < ERROR_SPAM_THRESHOLD) {
    bookQueryErrorCount++;
    lastBookQueryError = now;
    return true;
  }

  // Log warning about suppressing errors (only once)
  if (bookQueryErrorCount === ERROR_SPAM_THRESHOLD) {
    bookQueryErrorCount++;
  }

  return false;
};

// Enhanced error logging function with spam protection
const logDetailedError = (context: string, error: unknown) => {
  // Check if we should log this error (spam protection)
  if (!shouldLogBookError()) {
    return;
  }

  // Safe error handling without logging
  const errorMessage = error instanceof Error ? error.message :
                      (typeof error === 'object' && error !== null) ?
                      JSON.stringify(error, Object.getOwnPropertyNames(error)) :
                      String(error);
};

export const getBooks = async (filters?: BookFilters): Promise<Book[]> => {
  debugLogger.info("bookQueries", "getBooks called", { filters });

  try {
    const fetchTableData = async (table: string, tableFilters?: BookFilters): Promise<any[]> => {
      try {
        const buildQuery = (includeAway: boolean) => supabase
          .from(table)
          .select(`
            *,
            seller_profile:profiles!seller_id(
              id, first_name, last_name, email, preferred_delivery_locker_data, pickup_address_encrypted, created_at${includeAway ? ", is_away" : ""}
            )
          `)
          .eq("sold", false)
          .order("created_at", { ascending: false });
        let query = buildQuery(true);

        if (tableFilters) {
          if (tableFilters.search) {
            if (table === "books") {
              query = query.or(`title.ilike.%${tableFilters.search}%,author.ilike.%${tableFilters.search}%`);
            } else {
              query = query.or(`title.ilike.%${tableFilters.search}%,description.ilike.%${tableFilters.search}%`);
            }
          }
          if (tableFilters.category) {
            // Only apply category filter to books as uniforms/supplies are their own categories
            if (table === "books") {
              query = query.eq("category", tableFilters.category);
            }
          }
          if (tableFilters.condition) query = query.eq("condition", tableFilters.condition);
          if (tableFilters.grade) query = query.eq("grade", tableFilters.grade);
          if (tableFilters.province) query = query.eq("province", tableFilters.province);
          if (tableFilters.minPrice !== undefined) query = query.gte("price", tableFilters.minPrice);
          if (tableFilters.maxPrice !== undefined) query = query.lte("price", tableFilters.maxPrice);
        }

        let { data, error } = await query;
        if (error && String(error.message || "").toLowerCase().includes("is_away")) {
          // Backward-compatible fallback for DBs that haven't run the away-mode migration yet.
          const retry = await buildQuery(false);
          data = retry.data;
          error = retry.error;
        }
        if (error) {
          logDetailedError(`${table} query failed`, error);
          return [];
        }
        return data || [];
      } catch (err) {
        logDetailedError(`Exception in ${table} query`, err);
        return [];
      }
    };

    // Fetch from all three tables in parallel
    const [booksData, uniformsData, suppliesData] = await Promise.all([
      fetchTableData("books", filters),
      fetchTableData("uniforms", filters),
      fetchTableData("school_supplies", filters)
    ]);

    // Handle empty results
    if (booksData.length === 0 && uniformsData.length === 0 && suppliesData.length === 0) {
      return [];
    }

    // Combine and mark types (uniforms/supplies already have columns that the mapper uses to distinguish)
    const combinedData = [
      ...booksData,
      ...uniformsData.map(u => ({ ...u, item_type: 'uniform' })),
      ...suppliesData.map(s => ({ ...s, item_type: 'school_supply' }))
    ];

    // Map to Book interface
    const results: Book[] = combinedData.map((item: any) => {
      const profile = item.seller_profile;
      const mappedProfile = profile ? {
        id: profile.id,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.name || (profile.email ? profile.email.split("@")[0] : "Anonymous"),
        email: profile.email || "",
        preferred_delivery_locker_data: profile.preferred_delivery_locker_data,
        has_pickup_address: !!profile.pickup_address_encrypted,
        created_at: profile.created_at
        ,
        is_away: !!profile.is_away
      } : null;

      return mapBookFromDatabase({
        ...item,
        profiles: mappedProfile
      });
    });

    // Randomize results with daily consistency (same seed each day)
    // This ensures the order is randomized but consistent throughout the day
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const seed = today.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0);

    // Fisher-Yates shuffle with seeded random for reproducibility
    const seededRandom = (index: number): number => {
      const x = Math.sin(seed + index) * 10000;
      return x - Math.floor(x);
    };

    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(i) * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }

    return results;
  } catch (error) {
    logDetailedError("Error in getBooks", error);
    return getFallbackBooks();
  }
};

export const getBookById = async (id: string, hintedType?: 'book' | 'uniform' | 'school_supply'): Promise<Book | null> => {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return null;

    const fetchListingOperation = async () => {
      const tableForType = (t?: string) => {
        if (t === 'uniform') return 'uniforms';
        if (t === 'school_supply') return 'school_supplies';
        return 'books';
      };

      // If a hint is provided, only query that table to avoid unnecessary cross-table requests
      if (hintedType) {
        const table = tableForType(hintedType);
        const { data } = await supabase.from(table).select('*, profiles!seller_id(*)').eq('id', id).maybeSingle();
        if (data) {
          return mapBookFromDatabase({ ...data, item_type: hintedType === 'book' ? undefined : hintedType });
        }
        return null;
      }

      // No hint: fall back to legacy behaviour - search books first, then uniforms, then supplies
      const { data: bookData } = await supabase.from('books').select('*, profiles!seller_id(*)').eq('id', id).maybeSingle();
      if (bookData) return mapBookFromDatabase(bookData);

      const { data: uniformData } = await supabase.from('uniforms').select('*, profiles!seller_id(*)').eq('id', id).maybeSingle();
      if (uniformData) return mapBookFromDatabase({ ...uniformData, item_type: 'uniform' });

      const { data: supplyData } = await supabase.from('school_supplies').select('*, profiles!seller_id(*)').eq('id', id).maybeSingle();
      if (supplyData) return mapBookFromDatabase({ ...supplyData, item_type: 'school_supply' });

      return null;
    };

    return await retryWithConnection(fetchListingOperation, 2, 1000);
  } catch (error) {
    logDetailedError("Error in getBookById", error);
    return null;
  }
};

export const getUserBooks = async (userId: string): Promise<Book[]> => {
  try {
    if (!userId) {
      return [];
    }

    // Use fallback function with retry logic
    return await retryWithConnection(
      () => getUserBooksWithFallback(userId),
      2,
      1000,
    );
  } catch (error) {
    // Try one more time without retry wrapper as a final fallback
    try {
      return await getUserBooksWithFallback(userId);
    } catch (fallbackError) {
      return [];
    }
  }
};

// Enhanced fallback function with better error handling
const getUserBooksWithFallback = async (userId: string): Promise<Book[]> => {
  try {
    const [booksRes, uniformsRes, suppliesRes] = await Promise.all([
      supabase.from("books").select("*, profiles!seller_id(*)").eq("seller_id", userId).order("created_at", { ascending: false }),
      supabase.from("uniforms").select("*, profiles!seller_id(*)").eq("seller_id", userId).order("created_at", { ascending: false }),
      supabase.from("school_supplies").select("*, profiles!seller_id(*)").eq("seller_id", userId).order("created_at", { ascending: false })
    ]);

    const combined = [
      ...(booksRes.data || []),
      ...(uniformsRes.data || []).map((u: any) => ({ ...u, item_type: 'uniform' })),
      ...(suppliesRes.data || []).map((s: any) => ({ ...s, item_type: 'school_supply' }))
    ];

    if (combined.length === 0) return [];

    return combined.map((item: any) => {
      const profile = item.profiles;
      const mappedProfile = profile ? {
        id: userId,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.name || (profile.email ? profile.email.split("@")[0] : "Anonymous"),
        email: profile.email || "",
        preferred_delivery_locker_data: profile.preferred_delivery_locker_data,
        has_pickup_address: !!profile.pickup_address_encrypted,
        created_at: profile.created_at,
        is_away: !!profile.is_away
      } : { id: userId, name: "Anonymous", email: "" };

      return mapBookFromDatabase({ ...item, profiles: mappedProfile });
    });
  } catch (error) {
    logDetailedError("getUserBooksWithFallback failed", error);
    return [];
  }
};
