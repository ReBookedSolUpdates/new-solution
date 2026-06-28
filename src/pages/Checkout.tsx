import React from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { CheckoutBook } from "@/types/checkout";
import { supabase } from "@/integrations/supabase/client";
import CheckoutFlow from "@/components/checkout/CheckoutFlow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityService } from "@/services/activityService";
import debugLogger from "@/utils/debugLogger";

interface CartCheckoutData {
  items: any[];
  sellerId: string;
  sellerName: string;
  totalPrice: number;
  timestamp: number;
  cartType?: string;
}

const Checkout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const [book, setBook] = useState<CheckoutBook | null>(null);
  const [cartData, setCartData] = useState<CartCheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutStartedTracked, setCheckoutStartedTracked] = useState(false);

  useEffect(() => {
    // Reset state when component mounts/changes
    setBook(null);
    setCartData(null);
    setError(null);

    // Handle cart checkout vs single book checkout
    const isCartCheckout = location.pathname === '/checkout-cart' || id === "cart";

    if (isCartCheckout) {
      const timestamp = searchParams.get('t');
      loadCartData();
      return;
    }

    if (!id) {
      setError("No book ID provided");
      setLoading(false);
      return;
    }

    loadBookData();
  }, [id, navigate, searchParams]);

  // Add additional effect to refresh cart data when localStorage changes
  useEffect(() => {
    const isCartCheckout = location.pathname === '/checkout-cart' || id === "cart";

    if (isCartCheckout) {
      const handleStorageChange = () => {

        loadCartData();
      };

      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [id, location.pathname]);

  // Track checkout started when book is loaded
  useEffect(() => {
    if (book && !checkoutStartedTracked && user) {
      setCheckoutStartedTracked(true);
      const cartValue = book.price;
      // Track checkout started (non-blocking)
      try {
        ActivityService.trackCheckoutStarted(user.id, cartValue, 1);
      } catch (trackingError) {
        debugLogger.error("Checkout", "Error tracking checkout started:", trackingError);
      }
    }
  }, [book, checkoutStartedTracked, user]);

  const loadCartData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get cart data from localStorage - use the most recent one
      const cartDataStr = localStorage.getItem('checkoutCart');

      if (!cartDataStr) {
        setError("No cart data found. Please return to your cart and try again.");
        setLoading(false);
        return;
      }

      const parsedCartData: CartCheckoutData = JSON.parse(cartDataStr);

      // Validate cart data is recent (within 1 hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      if (parsedCartData.timestamp < oneHourAgo) {
        setError("Cart session expired. Please return to your cart and try again.");
        setLoading(false);
        return;
      }

      if (!parsedCartData.items || parsedCartData.items.length === 0) {
        setError("Cart is empty. Please add items to your cart.");
        setLoading(false);
        return;
      }

      setCartData(parsedCartData);

      // Create a CheckoutBook from the first cart item but with cart totals
      const firstItem = parsedCartData.items[0];

      // Create a CheckoutBook that represents the entire cart
      const checkoutBook: CheckoutBook = {
        id: firstItem.bookId,
        title: parsedCartData.items.length > 1
          ? `${parsedCartData.items.length} Books from ${parsedCartData.sellerName}`
          : firstItem.title,
        author: parsedCartData.items.length > 1
          ? "Multiple Authors"
          : firstItem.author,
        price: parsedCartData.totalPrice, // Use total price of all items
        condition: "Various", // Multiple books may have different conditions
        image_url: firstItem.imageUrl || firstItem.image_url || "/placeholder.svg", // Include image from first item
        seller_id: parsedCartData.sellerId,
        seller_name: parsedCartData.sellerName,
        seller: {
          id: parsedCartData.sellerId,
          name: parsedCartData.sellerName,
          email: "",
          hasAddress: true,
          hasSubaccount: true,
          isReadyForOrders: true,
        },
        rawDetails: {
          ...firstItem,
        },
      };

      setBook(checkoutBook);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError("Failed to load cart data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tryParseItemTypeFromRoute = (candidate: string): "book" | "uniform" | "school_supply" | undefined => {
    const normalized = candidate.toLowerCase();
    if (normalized.includes("uniform")) return "uniform";
    if (normalized.includes("supply") || normalized.includes("school_supply")) return "school_supply";
    if (normalized.includes("book") || normalized.includes("textbook") || normalized.includes("reader")) return "book";
    return undefined;
  };

  const loadItemData = async (itemId: string, hintedType?: "book" | "uniform" | "school_supply") => {
    const tables: Array<{ table: string; itemType: "book" | "uniform" | "school_supply" }> = [
      { table: "books", itemType: "book" },
      { table: "uniforms", itemType: "uniform" },
      { table: "school_supplies", itemType: "school_supply" },
    ];

    const orderedTables = hintedType
      ? [tables.find((t) => t.itemType === hintedType)!, ...tables.filter((t) => t.itemType !== hintedType)]
      : tables;

    debugLogger.info("Checkout", `Searching for item ID: ${itemId}, hinted type: ${hintedType || "none"}`);

    for (const { table, itemType } of orderedTables) {
      try {
        debugLogger.info("Checkout", `Querying ${table} table for item ${itemId}`);
        // Only books table has front_cover column
        const selectColumns = table === "books"
          ? "id, title, price, image_url, front_cover, description, seller_id"
          : "id, title, price, image_url, description, seller_id";

        const { data, error } = await supabase
          .from(table)
          .select(selectColumns)
          .eq("id", itemId)
          .maybeSingle();

        if (error) {
          debugLogger.warn("Checkout", `Error querying ${table}:`, error);
          continue;
        }

        if (data) {
          debugLogger.info("Checkout", `Found item in ${table} table`);
          // Normalize image: books prefer front_cover, fallback to image_url; others use image_url directly
          const itemImage = (data as any).front_cover || data.image_url || undefined;

          return {
            id: data.id,
            title: data.title,
            author: (data as any).author || "",
            price: data.price || 0,
            condition: (data as any).condition || "",
            description: data.description || "",
            image_url: itemImage,
            front_cover: (data as any).front_cover || undefined,
            seller_id: data.seller_id,
            itemType,
            item_type: itemType,
          } as CheckoutBook;
        }

        debugLogger.info("Checkout", `Item not found in ${table} table`);
      } catch (queryError) {
        debugLogger.warn("Checkout", `Query exception for ${table}:`, queryError);
      }
    }

    debugLogger.warn("Checkout", `Item ${itemId} not found in any table`);
    return null;
  };

  const loadBookData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id || id.trim() === "") {
        throw new Error("Invalid item ID");
      }

      debugLogger.info("Checkout", `Raw ID from route: ${id}`);

      // Try to extract UUID from the ID - it might be a full UUID or have a slug attached
      let uuidPart = id;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // If it's not a valid UUID yet, try to extract it
      if (!uuidRegex.test(uuidPart)) {
        // Try splitting by dash and taking first 5 parts (standard UUID)
        const parts = id.split("-");
        if (parts.length >= 5) {
          uuidPart = parts.slice(0, 5).join("-");
          debugLogger.info("Checkout", `Extracted UUID from slug: ${uuidPart}`);
        }
      }

      // Final validation
      if (!uuidRegex.test(uuidPart)) {
        throw new Error(`Invalid item ID format: "${id}". Please check the link and try again.`);
      }

      const hintedType = tryParseItemTypeFromRoute(location.pathname) || undefined;
      debugLogger.info("Checkout", `Loading item data for ID: ${uuidPart}, hinted type: ${hintedType}`);

      const bookData = await loadItemData(uuidPart, hintedType);

      if (!bookData) {
        const errorMsg = `Item with ID "${uuidPart}" was not found in our database. The item may have been deleted or is no longer available.`;
        debugLogger.error("Checkout", "Item not found after searching all tables", { itemId: uuidPart, hintedType });
        throw new Error(errorMsg);
      }

      const checkoutBook: CheckoutBook = {
        id: bookData.id,
        title: bookData.title,
        author: bookData.author,
        price: bookData.price,
        condition: bookData.condition,
        description: bookData.description,
        image_url: bookData.image_url,
        front_cover: bookData.front_cover,
        seller_id: bookData.seller_id,
        seller_name: "",
        itemType: bookData.itemType,
        item_type: bookData.item_type,
        seller: {
          id: bookData.seller_id,
          name: "",
          email: "",
          hasAddress: true,
          hasSubaccount: true,
          isReadyForOrders: true,
        },
        rawDetails: bookData,
      };

      setBook(checkoutBook);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load item";
      setError(errorMessage);
      debugLogger.error("Checkout", "Error loading item data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-center">
              <div className="mb-4">{error}</div>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/textbooks")}
                  className="block w-full underline hover:no-underline text-sm"
                >
                  Browse available textbooks
                </button>
                <button
                  onClick={() => navigate("/uniforms")}
                  className="block w-full underline hover:no-underline text-sm"
                >
                  Browse uniforms
                </button>
                <button
                  onClick={() => navigate("/supplies")}
                  className="block w-full underline hover:no-underline text-sm"
                >
                  Browse school supplies
                </button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-center">
              Book not found. Please check the link and try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <CheckoutFlow book={book} />;
};

export default Checkout;
