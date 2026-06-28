import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem, CartContextType, SellerCart } from "@/types/cart";
import { Book } from "@/types/book";
import { toast } from "sonner";
import debugLogger from "@/utils/debugLogger";

const CartContext = createContext<CartContextType | undefined>(undefined);

const SAFE_DEFAULT_CART: CartContextType = {
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getTotalPrice: () => 0,
  getTotalItems: () => 0,
  getSellerTotals: () => ({}),
  sellerCarts: [],
  getCartBySeller: () => undefined,
  removeFromSellerCart: () => {},
  clearSellerCart: () => {},
  getTotalCarts: () => 0,
  getActiveCart: () => undefined,
  setActiveCart: () => {},
  activeCartId: null,
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    // Defensive fallback during hot-reload or transient renders outside provider.
    return SAFE_DEFAULT_CART;
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  debugLogger.info("CartContext", "CartProvider initialized");

  const [items, setItems] = useState<CartItem[]>([]);
  const [sellerCarts, setSellerCarts] = useState<SellerCart[]>([]);
  const [activeCartId, setActiveCartId] = useState<string | null>(null);

  // Load carts from localStorage on mount
  useEffect(() => {
    debugLogger.info("CartContext", "Loading carts from localStorage");

    const savedCart = localStorage.getItem("cart");
    const savedSellerCarts = localStorage.getItem("sellerCarts");
    const savedActiveCartId = localStorage.getItem("activeCartId");

    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart);
        debugLogger.info("CartContext", `Loaded legacy cart with ${parsedCart.length} items`);
      } catch (error) {
        debugLogger.warn("CartContext", "Error loading legacy cart from localStorage", error);
      }
    }

    if (savedSellerCarts) {
      try {
        const parsedCarts = JSON.parse(savedSellerCarts);
        setSellerCarts(parsedCarts);
        debugLogger.info("CartContext", `Loaded ${parsedCarts.length} seller carts`);
      } catch (error) {
        debugLogger.warn("CartContext", "Error loading seller carts from localStorage", error);
      }
    }

    if (savedActiveCartId) {
      setActiveCartId(savedActiveCartId);
      debugLogger.info("CartContext", "Loaded active cart ID", { activeCartId: savedActiveCartId });
    }
  }, []);

  // Save carts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem("sellerCarts", JSON.stringify(sellerCarts));
  }, [sellerCarts]);

  useEffect(() => {
    if (activeCartId) {
      localStorage.setItem("activeCartId", activeCartId);
    } else {
      localStorage.removeItem("activeCartId");
    }
  }, [activeCartId]);

  const addToCart = (book: Book) => {
    debugLogger.info("CartContext", "Adding book to cart", { bookId: book?.id, title: book?.title });

    // ✅ VALIDATION CHECKS:
    // - book.id exists
    if (!book || !book.id) {
      debugLogger.warn("CartContext", "Cannot add to cart: Book ID is missing");
      toast.error("Book ID is missing");
      return;
    }

    // - book.title not empty
    if (!book.title || book.title.trim() === "") {
      toast.error("Book title is missing");
      return;
    }

    // - book.price > 0
    if (!book.price || book.price <= 0) {
      toast.error("Book price must be greater than 0");
      return;
    }

    // - book.seller.id exists
    if (!book.seller || !book.seller.id) {
      toast.error("Seller information is missing");
      return;
    }

    // - book.sold === false (not already sold)
    if (book.sold === true) {
      toast.error("This book has already been sold");
      return;
    }

    // Check if book is already in any cart
    const existingInLegacyCart = items.find((item) => item.bookId === book.id);
    const existingInSellerCarts = sellerCarts.some(cart =>
      cart.items.some(item => item.bookId === book.id)
    );

    if (existingInLegacyCart || existingInSellerCarts) {
      toast.error("This book is already in your cart");
      return;
    }

    // Check for seller conflicts in legacy cart
    const hasItemsFromDifferentSeller = items.some(item => item.sellerId !== book.seller.id);
    if (hasItemsFromDifferentSeller) {
      // Move to multi-cart system
      migrateToSellerCarts();
    }

    // ✅ CREATES CART ITEM:
    const newItem: CartItem = {
      id: `${book.id}-${Date.now()}`,
      bookId: book.id,
      title: book.title,
      author: book.author,
      price: book.price,
      imageUrl: book.imageUrl || book.frontCover || "",
      sellerId: book.seller.id,
      sellerName: (book.seller.full_name || book.seller.name) || "Seller",
      quantity: 1,
    };

    // Check if we should use multi-cart system
    const hasMultipleSellers = sellerCarts.length > 0 ||
      (items.length > 0 && items[0].sellerId !== book.seller.id);

    if (hasMultipleSellers || sellerCarts.length > 0) {
      // Use multi-cart system
      addToSellerCart(book.seller.id, (book.seller.full_name || book.seller.name) || "Seller", newItem);
    } else {
      // Use legacy single cart
      setItems((prev) => {
        const updatedItems = [...prev, newItem];
        localStorage.setItem("cart", JSON.stringify(updatedItems));
        return updatedItems;
      });
    }

    toast.success("Added to cart");
  };

  const removeFromCart = (bookId: string) => {
    setItems((prev) => prev.filter((item) => item.bookId !== bookId));
    toast.success("Removed from cart");
  };

  const updateQuantity = (bookId: string, quantity: number) => {
    // Quantity is always 1 for books, but keeping for interface compatibility
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }
    // Don't allow quantity changes since each book is unique
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem("cart");
  };

  // Multi-cart helper functions
  const migrateToSellerCarts = () => {
    if (items.length === 0) return;

    // Group existing items by seller
    const groupedBySeller = items.reduce((acc, item) => {
      if (!acc[item.sellerId]) {
        acc[item.sellerId] = {
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          items: [],
          totalPrice: 0,
          createdAt: new Date().toISOString(),
        };
      }
      acc[item.sellerId].items.push(item);
      acc[item.sellerId].totalPrice += item.price;
      return acc;
    }, {} as Record<string, SellerCart>);

    const newSellerCarts = Object.values(groupedBySeller);
    setSellerCarts(prev => [...prev, ...newSellerCarts]);

    // Clear legacy cart
    setItems([]);
    localStorage.removeItem("cart");

    // Set first cart as active
    if (newSellerCarts.length > 0) {
      setActiveCartId(newSellerCarts[0].sellerId);
    }
  };

  const addToSellerCart = (sellerId: string, sellerName: string, item: CartItem) => {
    setSellerCarts(prev => {
      const existingCartIndex = prev.findIndex(cart => cart.sellerId === sellerId);

      if (existingCartIndex >= 0) {
        // Add to existing cart
        const updatedCarts = [...prev];
        updatedCarts[existingCartIndex] = {
          ...updatedCarts[existingCartIndex],
          items: [...updatedCarts[existingCartIndex].items, item],
          totalPrice: updatedCarts[existingCartIndex].totalPrice + item.price,
        };
        return updatedCarts;
      } else {
        // Create new cart
        const newCart: SellerCart = {
          sellerId,
          sellerName,
          items: [item],
          totalPrice: item.price,
          createdAt: new Date().toISOString(),
        };

        // Set as active cart if no active cart exists
        if (!activeCartId) {
          setActiveCartId(sellerId);
        }

        return [...prev, newCart];
      }
    });
  };

  const getCartBySeller = (sellerId: string): SellerCart | undefined => {
    return sellerCarts.find(cart => cart.sellerId === sellerId);
  };

  const removeFromSellerCart = (sellerId: string, bookId: string) => {
    setSellerCarts(prev => {
      const updatedCarts = prev.map(cart => {
        if (cart.sellerId === sellerId) {
          const updatedItems = cart.items.filter(item => item.bookId !== bookId);
          const removedItem = cart.items.find(item => item.bookId === bookId);
          const newTotalPrice = removedItem ? cart.totalPrice - removedItem.price : cart.totalPrice;

          return {
            ...cart,
            items: updatedItems,
            totalPrice: newTotalPrice,
          };
        }
        return cart;
      }).filter(cart => cart.items.length > 0); // Remove empty carts

      // If we removed the active cart, set a new one
      if (activeCartId === sellerId && !updatedCarts.find(cart => cart.sellerId === sellerId)) {
        setActiveCartId(updatedCarts.length > 0 ? updatedCarts[0].sellerId : null);
      }

      return updatedCarts;
    });
    toast.success("Removed from cart");
  };

  const clearSellerCart = (sellerId: string) => {
    setSellerCarts(prev => {
      const updatedCarts = prev.filter(cart => cart.sellerId !== sellerId);

      // If we cleared the active cart, set a new one
      if (activeCartId === sellerId) {
        setActiveCartId(updatedCarts.length > 0 ? updatedCarts[0].sellerId : null);
      }

      return updatedCarts;
    });
  };

  const getTotalCarts = () => {
    return sellerCarts.length + (items.length > 0 ? 1 : 0);
  };

  const getActiveCart = (): SellerCart | undefined => {
    if (activeCartId) {
      return sellerCarts.find(cart => cart.sellerId === activeCartId);
    }
    return undefined;
  };

  const setActiveCart = (sellerId: string) => {
    const cart = sellerCarts.find(cart => cart.sellerId === sellerId);
    if (cart) {
      setActiveCartId(sellerId);
    }
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price, 0);
  };

  const getTotalItems = () => {
    return items.length; // Each book is quantity 1
  };

  const getSellerTotals = () => {
    const sellerTotals: {
      [sellerId: string]: {
        total: number;
        commission: number;
        sellerReceives: number;
        sellerName: string;
      };
    } = {};

    items.forEach((item) => {
      const itemTotal = item.price;
      const commission = itemTotal * 0.1; // 10% commission
      const sellerReceives = itemTotal - commission;

      if (sellerTotals[item.sellerId]) {
        sellerTotals[item.sellerId].total += itemTotal;
        sellerTotals[item.sellerId].commission += commission;
        sellerTotals[item.sellerId].sellerReceives += sellerReceives;
      } else {
        sellerTotals[item.sellerId] = {
          total: itemTotal,
          commission,
          sellerReceives,
          sellerName: item.sellerName,
        };
      }
    });

    return sellerTotals;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalPrice,
        getTotalItems,
        getSellerTotals,
        sellerCarts,
        getCartBySeller,
        removeFromSellerCart,
        clearSellerCart,
        getTotalCarts,
        getActiveCart,
        setActiveCart,
        activeCartId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
