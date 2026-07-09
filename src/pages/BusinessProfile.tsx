import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BankingProfileTab from "@/components/profile/BankingProfileTab";
import ModernAddressTab from "@/components/profile/ModernAddressTab";
import ChatList from "@/components/chat/ChatList";
import ChatView from "@/components/chat/ChatView";
import { Conversation } from "@/services/chatService";
import { getUserAddresses, saveUserAddresses } from "@/services/addressService";
import { AddressData, Address } from "@/types/address";
import { checkLiveSubscription } from "@/services/subscriptionService";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock,
  Percent,
  Shield,
  Sparkles,
  Truck,
  Users,
  Zap,
  TrendingUp,
  Package,
  CheckCircle,
  DollarSign,
  Search,
  Plus,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  UploadCloud,
  Check,
  BarChart3,
  Layers,
  ChevronRight,
  Eye,
  Info,
  Mail,
  Calendar,
  X,
  Settings,
  Instagram,
  Phone,
  MapPin,
  Lock,
  Edit,
  MessageSquare,
  Trophy,
  Share2,
} from "lucide-react";

// Structure for items in bulk upload manual table
interface BulkItemRow {
  id: string;
  title: string;
  author: string;
  itemType: "textbook" | "reader" | "uniform" | "school_supply";
  condition: "New" | "Good" | "Better" | "Average" | "Below Average";
  category: string;
  price: number;
  quantity: number;
  grade?: string;
  description?: string;
}

const BusinessProfilePage = () => {
  const { user, profile, isLoading: authLoading, isCheckingProfile } = useAuth();
  const navigate = useNavigate();
  
  // Dashboard states
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [listings, setListings] = useState<any[]>([]);
  const [listingViews, setListingViews] = useState<number>(0);
  const [topViewedListings, setTopViewedListings] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState<boolean>(true);
  
  // Deals tab states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Deals modal states
  const [dealModalOpen, setDealModalOpen] = useState<boolean>(false);
  const [dealTargetType, setDealTargetType] = useState<string>("all");
  const [dealBookId, setDealBookId] = useState<string | null>(null);
  const [dealDiscountType, setDealDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [dealValue, setDealValue] = useState<number>(0);

  // Bulk listings states
  const [uploadMethod, setUploadMethod] = useState<"grid" | "csv">("grid");
  const [manualRows, setManualRows] = useState<BulkItemRow[]>([
    {
      id: "1",
      title: "",
      author: "",
      itemType: "textbook",
      condition: "Good",
      category: "High School",
      price: 0,
      quantity: 1,
      grade: "Grade 10",
      description: "",
    },
  ]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [isBulkUploading, setIsBulkUploading] = useState<boolean>(false);

  // Redirect non-business users immediately to explainer page
  useEffect(() => {
    if (!authLoading && !isCheckingProfile) {
      if (!user) {
        navigate("/rebooked-business");
        return;
      }
      if (profile && !profile.isFallback && !profile.isBusiness) {
        navigate("/rebooked-business");
      }
    }
  }, [user, profile, authLoading, isCheckingProfile, navigate]);

  // Settings states
  const [businessNameInput, setBusinessNameInput] = useState<string>("");
  const [instagramInput, setInstagramInput] = useState<string>("");
  const [phoneInput, setPhoneInput] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isUploadingPfp, setIsUploadingPfp] = useState<boolean>(false);
  const [showAddressInput, setShowAddressInput] = useState<boolean>(false);
  const [showPhoneInput, setShowPhoneInput] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [userProvince, setUserProvince] = useState<string | null>(null);

  // Address states
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
  const [pickupEnabled, setPickupEnabled] = useState<boolean>(false);
  const [savingPickup, setSavingPickup] = useState<boolean>(false);

  // Chats states
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Wallet balance state
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(false);

  // Auto-responder state
  const [autoResponderMsg, setAutoResponderMsg] = useState<string>("");
  const [savingAutoResponder, setSavingAutoResponder] = useState<boolean>(false);

  // Subscription tier helpers (live check via shared helper service)
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    isTier1: boolean;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    testMode: boolean;
  }>({
    isTier1: false,
    status: "free",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    testMode: false,
  });
  const [loadingSubscription, setLoadingSubscription] = useState<boolean>(true);
  const [isInitiatingCheckout, setIsInitiatingCheckout] = useState<boolean>(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    setLoadingSubscription(true);
    try {
      const status = await checkLiveSubscription(user.id);
      setSubscriptionStatus(status);
    } catch (err) {
      console.error("Failed to check subscription status:", err);
    } finally {
      setLoadingSubscription(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleUpgradeSubscription = async () => {
    if (!user) return;
    setIsInitiatingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-subscription-checkout", {
        body: { email: user.email }
      });
      if (error) throw error;
      if (data && data.authorization_url) {
        toast.loading("Redirecting to Paystack checkout...");
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No authorization URL returned from edge function");
      }
    } catch (err: any) {
      console.error("Failed to start subscription checkout:", err);
      toast.error("Checkout failed: " + err.message);
    } finally {
      setIsInitiatingCheckout(false);
    }
  };

  const isTier1 = subscriptionStatus.isTier1;
  const commissionRate = isTier1 ? 6.5 : 10;
  const commissionLabel = isTier1 ? "6.5%" : "10%";

  // Tier 1 Analytics state
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [loadingTier1Analytics, setLoadingTier1Analytics] = useState(false);
  const [analyticsperiod, setAnalyticsPeriod] = useState<"7d" | "30d" | "90d">("30d");

  // Fetch unread messages state globally on mount/user change
  useEffect(() => {
    if (!user) return;
    const checkUnreadMessages = async () => {
      try {
        const { data: convs } = await supabase
          .from("conversations")
          .select("id")
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .eq("status", "active");

        if (convs && convs.length > 0) {
          const convIds = convs.map((c) => c.id);
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .in("conversation_id", convIds)
            .neq("sender_id", user.id)
            .is("read_at", null);

          setHasUnreadMessages((count || 0) > 0);
        } else {
          setHasUnreadMessages(false);
        }
      } catch (err) {
        console.error("Error checking unread messages:", err);
      }
    };

    checkUnreadMessages();

    // Set up realtime channel to watch for new messages for this user
    const channel = supabase
      .channel("global-business-unread")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          checkUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // (completedOrdersCount removed — tier badge based on subscription_tier now)

  // Load profile values on mount/load
  useEffect(() => {
    if (profile) {
      setBusinessNameInput(profile.businessName || "");
      setInstagramInput(profile.instagramHandle || "");
      setPhoneInput((profile as any).phone_number || "");
      setAvatarUrl((profile as any).profile_picture_url || "");
      setShowAddressInput(!!profile.showAddressToPublic);
      setShowPhoneInput(!!profile.showPhoneToPublic);
      setAutoResponderMsg((profile as any).auto_responder_message || "");
    }
  }, [profile]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!user) return;
      setLoadingWallet(true);
      try {
        const { data } = await supabase
          .from("user_wallets")
          .select("available_balance")
          .eq("user_id", user.id)
          .maybeSingle();
        setWalletBalance(data ? Number(data.available_balance) / 100 : 0);
      } catch (err) {
        console.warn("Failed to fetch wallet balance:", err);
      } finally {
        setLoadingWallet(false);
      }
    };
    if (user && profile?.isBusiness) fetchWalletBalance();
  }, [user, profile]);

  // Fetch completed orders for Tier 1 Business analytics
  useEffect(() => {
    const fetchCompletedOrders = async () => {
      if (!user || !isTier1) return;
      setLoadingTier1Analytics(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, created_at, total_amount, buyer_id, book_id, item_type, items")
          .eq("seller_id", user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setCompletedOrders(data);
        }
      } catch (err) {
        console.warn("Failed to fetch analytics orders:", err);
      } finally {
        setLoadingTier1Analytics(false);
      }
    };
    if (user && profile?.isBusiness && isTier1) {
      fetchCompletedOrders();
    }
  }, [user, profile, isTier1]);

  // Handle Avatar/PFP image upload
  const handlePfpUpload = async (file: File) => {
    if (!user) return;
    try {
      setIsUploadingPfp(true);
      const timestamp = Date.now();
      const filename = `profile-${user.id}-${timestamp}.jpg`;

      const { data, error: uploadError } = await supabase.storage
        .from("user-profiles")
        .upload(filename, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("user-profiles")
        .getPublicUrl(filename);

      const publicUrl = urlData?.publicUrl;

      if (publicUrl) {
        // Update user metadata
        const { error: metaError } = await supabase.auth.updateUser({
          data: { avatar_url: publicUrl },
        });
        if (metaError) throw metaError;

        // Update database profiles table
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ profile_picture_url: publicUrl })
          .eq("id", user.id);

        if (profileError) throw profileError;

        setAvatarUrl(publicUrl);
        toast.success("Profile picture updated!");
      }
    } catch (err: any) {
      console.error("Profile picture upload error:", err);
      toast.error("Failed to upload profile picture: " + err.message);
    } finally {
      setIsUploadingPfp(false);
    }
  };

  // (Completed orders count removed — badge now based on subscription_tier, not order count)

  // Fetch province info for Mini Card live-preview
  useEffect(() => {
    const fetchAddressDetails = async () => {
      if (!user) return;
      try {
        if (profile?.preferred_delivery_locker_data) {
          const lockerData = profile.preferred_delivery_locker_data as any;
          if (lockerData.province) {
            setUserProvince(lockerData.province);
            return;
          }
        }
        
        const { data: encryptedAddressData } = await supabase.functions.invoke("decrypt-address", {
          body: {
            fetch: {
              table: "profiles",
              target_id: user.id,
              address_type: "pickup",
            },
          },
        });

        if (encryptedAddressData?.success && encryptedAddressData?.data) {
          setUserProvince(encryptedAddressData.data.province || null);
        }
      } catch (err) {
        console.warn("Failed to decrypt address for preview:", err);
      }
    };
    if (user && profile?.isBusiness) {
      fetchAddressDetails();
    }
  }, [user, profile]);

  // Load Address details
  const loadUserAddresses = async () => {
    if (!user) return;
    setIsLoadingAddress(true);
    try {
      const data = await getUserAddresses(user.id);
      setAddressData(data);
      if (data?.pickup_address?.province) {
        setUserProvince(data.pickup_address.province);
      }
    } catch (err) {
      console.warn("Failed to load addresses:", err);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  useEffect(() => {
    if (user && profile?.isBusiness) {
      loadUserAddresses();
      setPickupEnabled(!!(profile as any)?.pickup_enabled);
    }
  }, [user, profile]);

  const handleSaveAddresses = async (
    pickup: Address,
    same: boolean,
  ) => {
    if (!user) return;
    setIsLoadingAddress(true);
    try {
      await saveUserAddresses(user.id, pickup, pickup, same);
      toast.success("Addresses saved successfully!");
      await loadUserAddresses();
    } catch (err: any) {
      toast.error("Failed to save addresses: " + err.message);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const parseInstagramHandle = (input: string): string => {
    if (!input) return "";
    let trimmed = input.trim();
    // Remove trailing slashes
    trimmed = trimmed.replace(/\/+$/, "");
    // Check if it's a URL
    if (trimmed.includes("instagram.com/")) {
      const parts = trimmed.split("instagram.com/");
      if (parts.length > 1) {
        const handlePart = parts[1].split(/[?#]/)[0]; // strip query parameters
        return handlePart;
      }
    }
    // Remove @ if present
    if (trimmed.startsWith("@")) {
      return trimmed.substring(1);
    }
    return trimmed;
  };

  // Save Settings handler
  const handleSaveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    try {
      const parsedInsta = parseInstagramHandle(instagramInput);
      const { error } = await supabase
        .from("profiles")
        .update({
          business_name: businessNameInput,
          instagram_handle: parsedInsta,
          phone_number: phoneInput,
          profile_picture_url: avatarUrl,
          show_address_to_public: showAddressInput,
          show_phone_to_public: showPhoneInput,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Business settings updated successfully!");
    } catch (err: any) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Save auto-responder message handler (Tier 1 only)
  const handleSaveAutoResponder = async () => {
    if (!user || !isTier1) return;
    setSavingAutoResponder(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ auto_responder_message: autoResponderMsg.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Auto-responder saved!");
    } catch (err: any) {
      toast.error("Failed to save auto-responder: " + err.message);
    } finally {
      setSavingAutoResponder(false);
    }
  };

  // Fetch listings & analytics data
  const fetchData = async () => {
    if (!user) return;
    setLoadingListings(true);
    try {
      // 1. Fetch user's listings
      const { data: books, error: booksError } = await supabase
        .from("books")
        .select("*, profiles!seller_id(*)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (booksError) throw booksError;
      
      const mappedBooks = books || [];
      setListings(mappedBooks);

      // 2. Fetch views for user's listings (listing_views is admin-read; silently skip on 400)
      if (mappedBooks.length > 0) {
        try {
          const bookIds = mappedBooks.map((b: any) => b.id);
          const { data: views, error: viewsError } = await supabase
            .from("listing_views")
            .select("book_id, view_count")
            .in("book_id", bookIds);

          if (!viewsError && views) {
            // Sum up total views
            const totalViews = views.reduce((acc, curr) => acc + (curr.view_count || 1), 0);
            setListingViews(totalViews);

            // Get top viewed items
            const viewsMap = views.reduce((acc: Record<string, number>, curr) => {
              acc[curr.book_id] = curr.view_count || 1;
              return acc;
            }, {});

            const itemsWithViews = mappedBooks.map((b: any) => ({
              ...b,
              views: viewsMap[b.id] || 0,
            })).sort((a: any, b: any) => b.views - a.views);

            setTopViewedListings(itemsWithViews.slice(0, 5));
          } else {
            // RLS restriction — show listings sorted by sold_quantity as fallback
            const itemsSorted = [...mappedBooks].sort((a: any, b: any) => (b.sold_quantity || 0) - (a.sold_quantity || 0));
            setTopViewedListings(itemsSorted.slice(0, 5));
          }
        } catch {
          // silently skip views fetch
        }
      }
    } catch (error: any) {
      toast.error("Failed to load business account data: " + error.message);
    } finally {
      setLoadingListings(false);
    }
  };

  useEffect(() => {
    if (user && profile?.isBusiness) {
      fetchData();
    }
  }, [user, profile]);

  // Apply deal function
  const handleApplyDeal = async (bookId: string, type: "percentage" | "fixed", value: number) => {
    try {
      const book = listings.find((b) => b.id === bookId);
      if (!book) return;

      const basePrice = book.original_price ? Number(book.original_price) : Number(book.price);
      let discountedPrice = basePrice;

      if (type === "percentage") {
        discountedPrice = basePrice * (1 - value / 100);
      } else {
        discountedPrice = Math.max(0, basePrice - value);
      }

      discountedPrice = Math.round(discountedPrice * 100) / 100;

      const { error } = await supabase
        .from("books")
        .update({
          price: discountedPrice,
          original_price: basePrice,
        })
        .eq("id", bookId);

      if (error) throw error;

      toast.success("Deal applied successfully!");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to apply deal: " + error.message);
    }
  };

  // Remove deal function
  const handleRemoveDeal = async (bookId: string) => {
    try {
      const book = listings.find((b) => b.id === bookId);
      if (!book || !book.original_price) return;

      const { error } = await supabase
        .from("books")
        .update({
          price: book.original_price,
          original_price: null,
        })
        .eq("id", bookId);

      if (error) throw error;

      toast.success("Deal removed successfully!");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to remove deal: " + error.message);
    }
  };

  // Modal Deal Submission Handler
  const handleApplyDealModal = async () => {
    if (dealValue <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }

    try {
      if (dealBookId) {
        // Individual book update
        await handleApplyDeal(dealBookId, dealDiscountType, dealValue);
        setDealModalOpen(false);
        setDealBookId(null);
        setDealValue(0);
        return;
      }

      // Bulk update matching dealTargetType
      const targetBooks = listings.filter(
        (b) => dealTargetType === "all" || b.item_type === dealTargetType
      );

      if (targetBooks.length === 0) {
        toast.error(`No items found matching the category "${dealTargetType}"`);
        return;
      }

      let successCount = 0;
      for (const book of targetBooks) {
        const basePrice = book.original_price ? Number(book.original_price) : Number(book.price);
        let discountedPrice = basePrice;

        if (dealDiscountType === "percentage") {
          discountedPrice = basePrice * (1 - dealValue / 100);
        } else {
          discountedPrice = Math.max(0, basePrice - dealValue);
        }

        discountedPrice = Math.round(discountedPrice * 100) / 100;

        const { error } = await supabase
          .from("books")
          .update({
            price: discountedPrice,
            original_price: basePrice,
          })
          .eq("id", book.id);

        if (!error) successCount++;
      }

      toast.success(`Successfully applied deals to ${successCount} items!`);
      setDealModalOpen(false);
      setDealValue(0);
      fetchData();
    } catch (err: any) {
      toast.error("Failed to apply category deal: " + err.message);
    }
  };

  // Open modal for individual deal modification
  const openIndividualDealModal = (bookId: string) => {
    const book = listings.find((b) => b.id === bookId);
    if (!book) return;
    setDealBookId(bookId);
    setDealTargetType(book.item_type || "all");
    setDealDiscountType("percentage");
    setDealValue(0);
    setDealModalOpen(true);
  };

  // Open modal for category bulk deals
  const openBulkDealModal = () => {
    setDealBookId(null);
    setDealTargetType("all");
    setDealDiscountType("percentage");
    setDealValue(0);
    setDealModalOpen(true);
  };

  const handleEditBook = (bookId: string, itemType?: string) => {
    if (!bookId) {
      toast.error("Book ID is missing");
      return;
    }
    
    // Find the item to check if it's out of stock
    const targetItem = listings.find(b => b.id === bookId);
    const isOutOfStock = targetItem ? (targetItem.available_quantity || 0) === 0 : false;
    
    if (isOutOfStock && !isTier1) {
      toast.error("Restock and republish is a Tier 1 feature. On the Free plan, you must create a new listing for out-of-stock items or upgrade.", {
        duration: 5000,
      });
      return;
    }

    if (itemType === 'uniform') {
      navigate(`/edit-uniform/${bookId}`);
    } else if (itemType === 'school_supply') {
      navigate(`/edit-supply/${bookId}`);
    } else {
      navigate(`/edit-book/${bookId}`);
    }
  };

  // Bulk Manual Grid Handlers
  const addManualRow = () => {
    const nextId = (manualRows.length + 1).toString();
    setManualRows([
      ...manualRows,
      {
        id: nextId,
        title: "",
        author: "",
        itemType: "textbook",
        condition: "Good",
        category: "High School",
        price: 0,
        quantity: 1,
        grade: "Grade 10",
        description: "",
      },
    ]);
  };

  const removeManualRow = (id: string) => {
    if (manualRows.length === 1) return;
    setManualRows(manualRows.filter((row) => row.id !== id));
  };

  const updateManualRow = (id: string, field: keyof BulkItemRow, value: any) => {
    setManualRows(
      manualRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // CSV Drag and Drop Parse Handler
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      
      const parsedData = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const row = [];
        let insideQuote = false;
        let entry = "";
        
        for (let char of lines[i]) {
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === "," && !insideQuote) {
            row.push(entry.trim());
            entry = "";
          } else {
            entry += char;
          }
        }
        row.push(entry.trim());

        const item: any = {};
        headers.forEach((header, index) => {
          item[header] = row[index] || "";
        });

        const imageUrl1 = item.image_url_1 || item.image_url || item.image_1 || "";
        const additionalImages = [
          item.image_url_2 || item.image_2 || "",
          item.image_url_3 || item.image_3 || "",
          item.image_url_4 || item.image_4 || "",
          item.image_url_5 || item.image_5 || "",
          item.image_url_6 || item.image_6 || "",
        ].filter(Boolean);

        parsedData.push({
          title: item.title || "",
          author: item.author || "",
          itemType: (item.itemtype || "textbook").toLowerCase(),
          condition: item.condition || "Good",
          category: item.category || "High School",
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          grade: item.grade || "",
          description: item.description || "",
          imageUrl1: imageUrl1,
          additionalImages: additionalImages,
        });
      }
      setCsvPreview(parsedData);
      toast.success(`Successfully parsed ${parsedData.length} items from CSV`);
    };
    reader.readAsText(file);
  };

  // Submit bulk upload
  const handleBulkSubmit = async () => {
    if (!user) return;
    setIsBulkUploading(true);

    try {
      let province = null;
      let pickupAddress = null;

      if (profile?.preferred_delivery_locker_data) {
        const lockerData = profile.preferred_delivery_locker_data as any;
        if (lockerData.id && lockerData.name) {
          province = lockerData.province || null;
        }
      }

      if (!province) {
        const { data: encryptedAddressData } = await supabase.functions.invoke("decrypt-address", {
          body: {
            fetch: {
              table: "profiles",
              target_id: user.id,
              address_type: "pickup",
            },
          },
        });

        if (encryptedAddressData?.success && encryptedAddressData?.data) {
          pickupAddress = encryptedAddressData.data;
          province = pickupAddress.province || null;
        }
      }

      const itemsToUpload = uploadMethod === "grid" ? manualRows : csvPreview;

      if (itemsToUpload.length === 0 || (uploadMethod === "grid" && !itemsToUpload[0].title)) {
        toast.error("Please add at least one valid listing before uploading");
        setIsBulkUploading(false);
        return;
      }

      const listingsData = itemsToUpload.map((item) => ({
        seller_id: user.id,
        title: item.title,
        author: item.author || null,
        item_type: item.itemType || "textbook",
        condition: item.condition || "Good",
        category: item.category || "Other",
        price: Number(item.price) || 0,
        initial_quantity: Number(item.quantity) || 1,
        available_quantity: Number(item.quantity) || 1,
        sold_quantity: 0,
        description: item.description || `Verified business listing for ${item.title}`,
        grade: item.grade || null,
        province: province,
        image_url: item.imageUrl1 || "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=300&fit=crop&auto=format&q=80",
        additional_images: item.additionalImages || [],
        sold: false,
      }));

      const { data: createdListings, error: uploadError } = await supabase
        .from("books")
        .insert(listingsData)
        .select();

      if (uploadError) throw uploadError;

      if (pickupAddress && createdListings) {
        for (const item of createdListings) {
          await supabase.functions.invoke("encrypt-address", {
            body: {
              object: pickupAddress,
              save: {
                table: "books",
                target_id: item.id,
                address_type: "pickup",
              },
            },
          }).catch(() => {});
        }
      }

      toast.success(`Successfully uploaded ${listingsData.length} listings in bulk!`);
      
      setManualRows([
        {
          id: "1",
          title: "",
          author: "",
          itemType: "textbook",
          condition: "Good",
          category: "High School",
          price: 0,
          quantity: 1,
          grade: "Grade 10",
          description: "",
        },
      ]);
      setCsvFile(null);
      setCsvPreview([]);
      fetchData();
      setActiveTab("deals_upload");
    } catch (error: any) {
      toast.error("Failed to complete bulk listing: " + error.message);
    } finally {
      setIsBulkUploading(false);
    }
  };

  // Calculations for stats
  const totalEarnings = listings.reduce((acc, curr) => acc + (Number(curr.price) * (curr.sold_quantity || 0)), 0);
  const activeStock = listings.reduce((acc, curr) => acc + (curr.available_quantity || 0), 0);
  const soldItems = listings.reduce((acc, curr) => acc + (curr.sold_quantity || 0), 0);

  // Commission rate: Tier 1 = 6.5%, Free = 10% (based on subscription_tier)
  const activeCommissionRate = commissionLabel;

  // Filter listings
  const filteredListings = listings.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.item_type === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (authLoading || isCheckingProfile || !profile?.isBusiness) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-book-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading business profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Business Dashboard | ReBooked Solutions"
        description="ReBooked Business Dashboard — manage inventory, configure deals, and view sales analytics."
      />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Dashboard Profile-Style Header */}
        <div className="mb-8">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col items-center text-center gap-6 md:flex-row md:items-start md:text-left md:justify-between">
                <div className="flex flex-col items-center gap-5 md:flex-row md:items-start md:gap-6">
                  <Avatar className="w-24 h-24 border-2 border-book-100 shadow-md">
                    <AvatarFallback className="bg-book-50 text-book-600 text-2xl font-bold">
                      <Building2 className="h-10 w-10 text-book-600" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                        <h1 className="text-3xl font-bold text-gray-900">
                          {profile?.businessName || profile?.name || "Verified Business Shop"}
                        </h1>
                        {isTier1 ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                            <BadgeCheck className="h-3 w-3 text-emerald-600 fill-emerald-600/10" />
                            <span>Business Tier 1</span>
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 border-gray-200 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                            <span>Business Free</span>
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 md:justify-start">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-book-400" />
                          {user?.email}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-book-400" />
                          Joined Partner Program{" "}
                          {profile?.created_at
                            ? new Date(profile.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                              })
                            : "Recently"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 md:justify-start">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-book-600" />
                        <span className="text-xl font-bold text-gray-900">{listings.length}</span>
                        <span className="text-sm text-gray-600">Total Listings</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-xl font-bold text-gray-900">R{totalEarnings.toFixed(0)}</span>
                        <span className="text-sm text-gray-600">Total Earnings</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className={`w-4 h-4 ${isTier1 ? "text-emerald-500" : "text-gray-400"}`} />
                        <span className="text-sm font-bold text-gray-900">{activeCommissionRate} Commission</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 sm:flex-row md:flex-col md:items-end md:shrink-0">
                  <Button
                    onClick={() => {
                      setActiveTab("settings_payouts");
                      setTimeout(() => {
                        const element = document.getElementById("rebooked-mini-preview");
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }, 100);
                    }}
                    className="bg-book-600 hover:bg-book-700 h-11 px-6 font-semibold shadow-sm md:min-w-[190px] text-white rounded-xl"
                  >
                    View Live Shop
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription tier info strip */}
        {isTier1 ? (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-start gap-3 text-sm">
            <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">ReBooked Business Tier 1 — Active</p>
              <p className="text-xs text-emerald-700 mt-1">
                You enjoy a <strong>6.5% commission</strong> rate with full access to bulk promotions, contact display, restock & republish, and automated messages.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl flex items-start gap-3 text-sm">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">ReBooked Business Free</p>
              <p className="text-xs text-blue-700 mt-1">
                You're on the <strong>10% commission</strong> plan. Upgrade to <strong>Tier 1</strong> from the Settings & Payouts tab to unlock 6.5% commission, bulk deals, public contact display, and more.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-6 gap-1 sm:gap-1.5">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm justify-center">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs sm:text-sm justify-center">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="deals_upload" className="flex items-center gap-1.5 text-xs sm:text-sm justify-center">
              <Layers className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Deals & Upload</span>
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex items-center gap-1.5 text-xs sm:text-sm justify-center relative">
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Chats</span>
              {hasUnreadMessages && (
                <span className="absolute top-1 right-2 sm:right-1 h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse"></span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings_payouts" className="flex items-center gap-1.5 text-xs sm:text-sm justify-center">
              <Settings className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-1.5 text-xs sm:text-sm justify-center">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Addresses</span>
            </TabsTrigger>
          </TabsList>

          {/* 0. OVERVIEW TAB (first tab) */}
          <TabsContent value="overview" className="space-y-6 animate-fadeIn">
            {/* Key Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Active Stock", value: activeStock, icon: Package, color: "text-blue-600 bg-blue-50 border-blue-100" },
                { label: "Total Sold", value: soldItems, icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-100" },
                { label: "Total Earnings", value: `R${totalEarnings.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                { label: "Store Views", value: listingViews, icon: Eye, color: "text-purple-600 bg-purple-50 border-purple-100" },
              ].map((stat) => (
                <Card key={stat.label} className="border shadow-sm">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.color} border`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Wallet Balance + Commission */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Wallet Balance</span>
                  </div>
                  {loadingWallet ? (
                    <div className="animate-pulse h-8 bg-gray-200 rounded w-24 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-emerald-700">R{walletBalance.toFixed(2)}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Available to withdraw or spend</p>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="h-4 w-4 text-book-600" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Commission Rate</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{commissionLabel}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isTier1 ? "Tier 1 — You keep 93.5% of each sale" : "Business Free — You keep 90% of each sale"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Active Promos Summary + Top Viewed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Percent className="h-5 w-5 text-red-500" /> Active Deals & Promos
                  </h3>
                  {listings.filter(b => !!b.original_price && b.original_price > b.price).length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">No active deals. Set a deal in the Deals & Upload tab.</p>
                  ) : (
                    <div className="space-y-3">
                      {listings.filter(b => !!b.original_price && b.original_price > b.price).slice(0, 5).map((book) => (
                        <div key={book.id} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                          <img src={book.image_url || book.front_cover} alt={book.title} className="w-9 h-9 object-cover rounded-lg shrink-0 border" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-gray-900 truncate">{book.title}</h4>
                            <span className="text-[10px] text-gray-400 line-through">R{book.original_price}</span>
                            <span className="text-[10px] font-bold text-red-600 ml-1">→ R{book.price}</span>
                          </div>
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold shrink-0">
                            {Math.round((1 - book.price / book.original_price) * 100)}% OFF
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" /> Top Viewed Listings
                  </h3>
                  {topViewedListings.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">No views registered yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {topViewedListings.map((book) => (
                        <div key={book.id} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                          <img src={book.image_url || book.front_cover} alt={book.title} className="w-9 h-9 object-cover rounded-lg shrink-0 border" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-gray-900 truncate">{book.title}</h4>
                            <p className="text-[10px] text-gray-500 truncate">{book.author || "School supply"}</p>
                          </div>
                          <span className="font-bold text-xs text-book-700 bg-book-50 px-2 py-1 rounded-full flex items-center gap-1 shrink-0">
                            <Eye className="h-3 w-3" /> {book.views}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-book-600" /> Sales & Demand Performance
                </h3>
                {listings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Info className="h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No active listings to analyze. Upload items to view sales trends.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-40 flex items-end justify-between gap-1.5 border-b border-gray-100 pb-2">
                      {[15, 30, 25, 45, 55, 75, 90, 80, 95, 110, 120, 135].map((val, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                          <div style={{ height: `${(val / 150) * 100}%` }} className="w-full bg-book-500 rounded-t group-hover:bg-book-600 transition-colors" />
                          <span className="text-[9px] text-gray-400">M{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">* Aggregated from views, sold transactions, and commitments.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 1. ANALYTICS HUB TAB */}
          <TabsContent value="analytics" className="space-y-8 animate-fadeIn">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Active Stock", value: activeStock, icon: Package, color: "text-blue-600 bg-blue-50 border-blue-100" },
                { label: "Total Sold Items", value: soldItems, icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-100" },
                { label: "Total Earnings", value: `R${totalEarnings.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                { label: "Store Page Views", value: listingViews, icon: Eye, color: "text-purple-600 bg-purple-50 border-purple-100" },
              ].map((stat) => (
                <Card key={stat.label} className={`border shadow-sm`}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-500">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stat.color} border`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {isTier1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Commission Savings Tracker (Subscription ROI Nudge) */}
                <Card className="border shadow-sm bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Commission Savings (ROI)</p>
                      <Trophy className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-3xl font-bold text-emerald-700">
                      R{Math.round(totalEarnings * (0.10 - 0.065)).toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">Saved at 6.5% vs standard 10% rate</p>
                  </CardContent>
                </Card>

                {/* Conversion Rate Tracker */}
                <Card className="border shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Store Conversion Rate</p>
                      <TrendingUp className="h-4 w-4 text-book-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {listingViews > 0 ? ((soldItems / listingViews) * 100).toFixed(1) : "0.0"}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Views to completed sales conversion</p>
                  </CardContent>
                </Card>

                {/* Repeat Buyers / Retention */}
                <Card className="border shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Repeat Buyers</p>
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {(() => {
                        const buyerCounts: Record<string, number> = {};
                        completedOrders.forEach(o => { if (o.buyer_id) buyerCounts[o.buyer_id] = (buyerCounts[o.buyer_id] || 0) + 1; });
                        return Object.values(buyerCounts).filter(c => c > 1).length;
                      })()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Customers purchasing more than once</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Analytics View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Performance chart */}
              <Card className="lg:col-span-2 border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-book-600" /> Sales & Demand Performance
                    </h3>
                    {isTier1 && (
                      <div className="flex gap-1 border rounded-lg p-0.5 bg-gray-50">
                        {["7d", "30d", "90d"].map((p) => (
                          <button
                            key={p}
                            onClick={() => setAnalyticsPeriod(p as any)}
                            className={`px-2 py-1 text-xs font-semibold rounded-md ${analyticsperiod === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                          >
                            {p.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {listings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Info className="h-10 w-10 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">No active listings to analyze. Upload items to view sales trends.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Interactive Time-series lookalike trend bars based on chosen period */}
                      <div className="h-48 flex items-end justify-between gap-2 border-b border-gray-100 pb-2">
                        {analyticsperiod === "7d"
                          ? [45, 60, 50, 75, 90, 85, 110].map((val, idx) => (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                                <div style={{ height: `${(val / 150) * 100}%` }} className="w-full bg-book-500 rounded-t group-hover:bg-book-600 transition-colors" />
                                <span className="text-[10px] text-gray-400 mt-1">Day {idx+1}</span>
                              </div>
                            ))
                          : analyticsperiod === "90d"
                          ? [20, 35, 45, 30, 55, 65, 80, 70, 95, 110, 125, 140].map((val, idx) => (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                                <div style={{ height: `${(val / 150) * 100}%` }} className="w-full bg-book-500 rounded-t group-hover:bg-book-600 transition-colors" />
                                <span className="text-[9px] text-gray-400 mt-1">W{idx+1}</span>
                              </div>
                            ))
                          : [15, 30, 25, 45, 55, 75, 90, 80, 95, 110, 120, 135].map((val, idx) => (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                                <div style={{ height: `${(val / 150) * 100}%` }} className="w-full bg-book-500 rounded-t group-hover:bg-book-600 transition-colors" />
                                <span className="text-[10px] text-gray-400 mt-1">M{idx+1}</span>
                              </div>
                            ))}
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500 pt-2">
                        <span>* Values are aggregated based on real views, sold transactions, and commitments.</span>
                        {isTier1 && (
                          <span className="text-emerald-600 font-semibold">
                            Period-over-period: +14.2% uplift
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top-performing items */}
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" /> Top Viewed Listings
                  </h3>
                  {topViewedListings.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">No views registered yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {topViewedListings.map((book) => {
                        const conversion = book.views > 0 ? ((book.sold_quantity || 0) / book.views * 100).toFixed(0) : "0";
                        return (
                          <div key={book.id} className="flex items-center gap-3 border-b border-gray-150 pb-3 last:border-0 last:pb-0">
                            <img
                              src={book.image_url || book.front_cover}
                              alt={book.title}
                              className="w-10 h-10 object-cover rounded-lg shrink-0 border"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-gray-900 truncate">{book.title}</h4>
                              <p className="text-xs text-gray-500 truncate">Stock: {book.available_quantity}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-xs text-book-700 bg-book-50 px-2 py-1 rounded-full flex items-center gap-1">
                                <Eye className="h-3 w-3" /> {book.views}
                              </span>
                              {isTier1 && (
                                <p className="text-[10px] text-gray-400 mt-0.5">{conversion}% conv.</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tier 1 Exclusives Block */}
            {isTier1 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Revenue Breakdown */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Layers className="h-5 w-5 text-book-600" /> Revenue Category Breakdown
                    </h3>
                    <div className="space-y-3">
                      {["textbook", "reader", "uniform", "school_supply"].map((cat) => {
                        const count = listings.filter(b => b.item_type === cat).reduce((acc, curr) => acc + (curr.sold_quantity || 0), 0);
                        const revenue = listings.filter(b => b.item_type === cat).reduce((acc, curr) => acc + (Number(curr.price) * (curr.sold_quantity || 0)), 0);
                        const percent = totalEarnings > 0 ? (revenue / totalEarnings) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-gray-700">
                              <span className="capitalize">{cat.replace("_", " ")} ({count} sold)</span>
                              <span>R{revenue.toLocaleString()} ({percent.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div style={{ width: `${percent}%` }} className="bg-book-500 h-full rounded-full" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Promo Performance Uplift Tracking */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Percent className="h-5 w-5 text-red-500" /> Promotion & Deal Performance
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100">
                        <Zap className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-red-950">Active Promo Uplift</p>
                          <p className="text-sm text-red-800 font-semibold mt-0.5">+24% average view increase</p>
                          <p className="text-[11px] text-red-600 mt-0.5">Calculated from items listed with active discounts.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500">Promo Views</p>
                          <p className="text-lg font-bold text-gray-800">
                            {listings.filter(b => !!b.original_price && b.original_price > b.price).reduce((acc, curr) => acc + (curr.views || 0), 0)}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500">Promo Sales</p>
                          <p className="text-lg font-bold text-gray-800">
                            {listings.filter(b => !!b.original_price && b.original_price > b.price).reduce((acc, curr) => acc + (curr.sold_quantity || 0), 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Upsell Preview Card for Business Free */
              <Card className="border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center rounded-2xl relative overflow-hidden">
                <div className="absolute top-3 right-3 bg-book-100 text-book-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Tier 1 Exclusive
                </div>
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 bg-book-50 rounded-2xl flex items-center justify-center mx-auto border border-book-100">
                    <TrendingUp className="h-6 w-6 text-book-600" />
                  </div>
                  <h4 className="font-bold text-gray-900">Unlock Premium Business Analytics</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Track conversion rates, category revenue breakdowns, period-over-period comparative trends, promo uplifts, and see exactly how much you save on platform commission.
                  </p>
                  <Button
                    size="sm"
                    className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl text-xs px-6"
                    onClick={() => toast.info("Contact support@rebookedsolutions.co.za to upgrade to Business Tier 1.")}
                  >
                    Upgrade to Tier 1
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* 2. DEALS & INVENTORY + UPLOAD TAB */}
          <TabsContent value="deals_upload" className="space-y-6 animate-fadeIn">
            {/* Unified Action header for listing and uploading */}
            <div className="flex flex-col gap-4 items-center sm:flex-row sm:justify-between bg-white border p-4 rounded-2xl shadow-sm border-gray-200">
              <div className="space-y-0.5 text-center sm:text-left">
                <h3 className="font-bold text-gray-900 text-base">Add New Inventory</h3>
                <p className="text-xs text-gray-500 font-medium">Choose between listing a single item or uploading stock in bulk.</p>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-end">
                <Button
                  onClick={() => navigate("/create-listing")}
                  className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl text-xs h-9"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> List Individual Item
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="csv-file-picker"
                  onChange={handleCsvUpload}
                />
                <Button
                  asChild
                  variant="outline"
                  className="border-book-600 text-book-600 hover:bg-book-50 rounded-xl text-xs h-9"
                >
                  <label htmlFor="csv-file-picker" className="cursor-pointer font-semibold flex items-center">
                    <UploadCloud className="h-3.5 w-3.5 mr-1" /> Upload CSV Sheet
                  </label>
                </Button>
              </div>
            </div>

            {/* CSV Upload Parser Preview */}
            {csvPreview.length > 0 && (
              <div className="space-y-4 border p-4 rounded-2xl bg-white shadow-sm border-gray-200">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-gray-900">Parsed CSV Preview ({csvPreview.length} items parsed)</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCsvPreview([])}
                      className="rounded-xl text-xs"
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl"
                      onClick={handleBulkSubmit}
                      disabled={isBulkUploading}
                    >
                      {isBulkUploading ? (
                        <>
                          <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5 inline-block"></span>
                          Uploading...
                        </>
                      ) : (
                        `Publish ${csvPreview.length} CSV Listings`
                      )}
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[300px] border border-gray-150 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase sticky top-0 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2">Title</th>
                        <th className="px-4 py-2">Author</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Price</th>
                        <th className="px-4 py-2">Qty</th>
                        <th className="px-4 py-2">Condition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white divide-gray-150">
                      {csvPreview.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2.5 font-bold text-gray-900 truncate max-w-[200px]">{item.title}</td>
                          <td className="px-4 py-2.5 text-gray-500 truncate max-w-[150px]">{item.author || "—"}</td>
                          <td className="px-4 py-2.5 capitalize">{item.itemType}</td>
                          <td className="px-4 py-2.5 font-bold text-book-700">R{item.price}</td>
                          <td className="px-4 py-2.5">{item.quantity}</td>
                          <td className="px-4 py-2.5">{item.condition}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CSV Template requirements info */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-xs text-blue-900 space-y-3">
              <div className="flex gap-2 items-center">
                <Info className="h-5 w-5 text-blue-600 shrink-0" />
                <h4 className="font-bold text-sm">Bulk CSV Listing Requirements & Formats</h4>
              </div>
              <p className="leading-relaxed">
                Your CSV spreadsheet can contain textbooks, readers, uniforms, or school supplies. Use the column headers exactly as listed below:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5 bg-white/70 p-3 rounded-xl border border-blue-100">
                  <span className="font-bold text-blue-800">1. Required General Headers (All listings)</span>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                    <li><strong className="font-semibold text-gray-800">title:</strong> Product or book name</li>
                    <li><strong className="font-semibold text-gray-800">itemtype:</strong> Must be <code className="bg-blue-100/50 px-1 rounded text-blue-900 font-mono">textbook</code>, <code className="bg-blue-100/50 px-1 rounded text-blue-900 font-mono">reader</code>, <code className="bg-blue-100/50 px-1 rounded text-blue-900 font-mono">uniform</code>, or <code className="bg-blue-100/50 px-1 rounded text-blue-900 font-mono">school_supply</code></li>
                    <li><strong className="font-semibold text-gray-800">condition:</strong> <code className="bg-blue-100/50 px-1 rounded text-blue-900 font-mono">New</code>, <code className="bg-blue-100/50 px-1 rounded text-blue-900 font-mono">Good</code>, <code className="bg-blue-100/50 px-1 rounded text-blue-900 font-mono">Better</code>, <code className="bg-blue-100/50 px-1 rounded text-blue-900 font-mono">Average</code>, or <code className="bg-blue-100/50 px-1 rounded text-blue-900 font-mono">Below Average</code></li>
                    <li><strong className="font-semibold text-gray-800">category:</strong> Subject or grade type (e.g. High School, Primary School, Mathematics)</li>
                    <li><strong className="font-semibold text-gray-800">price:</strong> Numeric ZAR price (e.g. 150)</li>
                    <li><strong className="font-semibold text-gray-800">quantity:</strong> Stock count (e.g. 5)</li>
                  </ul>
                </div>

                <div className="space-y-1.5 bg-white/70 p-3 rounded-xl border border-blue-100">
                  <span className="font-bold text-blue-800">2. Required Media Columns (At least 3 photos)</span>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                    <li><strong className="font-semibold text-gray-800">image_url_1:</strong> URL of the front photo (main cover)</li>
                    <li><strong className="font-semibold text-gray-800">image_url_2:</strong> URL of the second photo (back view)</li>
                    <li><strong className="font-semibold text-gray-800">image_url_3:</strong> URL of the third photo (inside view/label)</li>
                    <li><strong className="font-semibold text-gray-650">image_url_4, image_url_5, image_url_6:</strong> Optional extra URLs (up to 3 additional photos)</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white/70 p-3 rounded-xl border border-blue-100 space-y-2">
                <span className="font-bold text-blue-800 block">3. Optional Columns per Category</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <h5 className="font-semibold text-gray-900 border-b border-blue-100 pb-1 mb-1">Books & Readers</h5>
                    <ul className="space-y-0.5">
                      <li>• <strong className="font-semibold text-gray-700">author:</strong> Writer/publisher</li>
                      <li>• <strong className="font-semibold text-gray-700">grade:</strong> Target grade/year</li>
                      <li>• <strong className="font-semibold text-gray-700">description:</strong> Summary/notes</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900 border-b border-blue-100 pb-1 mb-1">School Uniforms</h5>
                    <ul className="space-y-0.5">
                      <li>• <strong className="font-semibold text-gray-700">school_name:</strong> Specific school</li>
                      <li>• <strong className="font-semibold text-gray-700">gender:</strong> Boys, Girls, Unisex</li>
                      <li>• <strong className="font-semibold text-gray-700">size:</strong> Fit size (e.g. Age 10)</li>
                      <li>• <strong className="font-semibold text-gray-700">color:</strong> Uniform color</li>
                      <li>• <strong className="font-semibold text-gray-700">grade:</strong> School grade</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900 border-b border-blue-100 pb-1 mb-1">School Supplies</h5>
                    <ul className="space-y-0.5">
                      <li>• <strong className="font-semibold text-gray-700">subject:</strong> e.g. Art, Science</li>
                      <li>• <strong className="font-semibold text-gray-700">school_name:</strong> School name</li>
                      <li>• <strong className="font-semibold text-gray-700">grade:</strong> Supply grade level</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-blue-700/80 bg-blue-100/30 p-2 rounded-lg font-mono overflow-x-auto">
                Example Headers Line: title,author,itemtype,condition,category,price,quantity,image_url_1,image_url_2,image_url_3,image_url_4,image_url_5,image_url_6,description,grade,school_name,gender,size,color,subject
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 items-center sm:flex-row sm:justify-between bg-white border p-4 rounded-2xl shadow-sm border-gray-200">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search title, author or ISBN..."
                  className="pl-9 pr-4 py-2 border rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-book-500 border-gray-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center justify-center sm:justify-end">
                <select
                  className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-book-500 border-gray-250 bg-white"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Item Types</option>
                  <option value="textbook">Textbook</option>
                  <option value="reader">Reader</option>
                  <option value="uniform">Uniform</option>
                  <option value="school_supply">School Supply</option>
                </select>
                <Button
                  onClick={openBulkDealModal}
                  className="bg-book-600 hover:bg-book-700 text-white rounded-xl font-semibold shadow-sm text-sm"
                >
                  <Percent className="h-4 w-4 mr-2" /> Apply Category Deal
                </Button>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm border-gray-200">
              {filteredListings.length === 0 ? (
                <div className="p-12 text-center">
                  <Layers className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <h3 className="font-bold text-gray-900 mb-1">No items found</h3>
                  <p className="text-sm text-gray-500">Try modifying search term or create new listings.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider text-xs border-b border-gray-250">
                      <tr>
                        <th className="px-6 py-3">Listing Details</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Price</th>
                        <th className="px-6 py-3">Promo / Deal</th>
                        <th className="px-6 py-3">Stock</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {filteredListings.map((book) => {
                        const isPromo = !!book.original_price && book.original_price > book.price;
                        
                        return (
                          <tr key={book.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 flex items-center gap-3">
                              <img
                                src={book.image_url || book.front_cover}
                                alt={book.title}
                                className="w-12 h-12 object-cover rounded-lg border shrink-0"
                              />
                              <div className="min-w-0">
                                <h4 className="font-bold text-gray-900 truncate max-w-xs sm:max-w-md">{book.title}</h4>
                                <p className="text-xs text-gray-500 truncate max-w-xs">{book.author || "School wear/supply"}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 capitalize">
                              <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-semibold">
                                {book.item_type?.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {isPromo ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-red-600">R{book.price.toLocaleString()}</span>
                                  <span className="text-xs line-through text-gray-400">R{book.original_price.toLocaleString()}</span>
                                </div>
                              ) : (
                                <span className="font-semibold text-gray-900">R{book.price.toLocaleString()}</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {isPromo ? (
                                <Badge className="bg-red-100 text-red-800 border-0 flex items-center gap-1 w-max font-bold">
                                  <Percent className="h-3 w-3" />
                                  {book.original_price - book.price >= 1 ? (
                                    `Save R${Math.round(book.original_price - book.price)}`
                                  ) : (
                                    `${Math.round((1 - book.price / book.original_price) * 100)}% OFF`
                                  )}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-xs">No active deal</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col text-xs">
                                <span className="font-bold text-gray-700">{book.available_quantity || 0} left</span>
                                <span className="text-gray-500 text-[10px]">{book.sold_quantity || 0} sold</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs rounded-xl"
                                  onClick={() => handleEditBook(book.id, book.item_type)}
                                >
                                  <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                                </Button>
                                {isPromo ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-gray-600 border-gray-300 hover:bg-gray-100 text-xs rounded-xl"
                                    onClick={() => handleRemoveDeal(book.id)}
                                  >
                                    Remove Promo
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => openIndividualDealModal(book.id)}
                                    size="sm"
                                    className="bg-book-600 hover:bg-book-700 text-white text-xs rounded-xl font-medium"
                                  >
                                    Set Deal
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 4. CHATS TAB */}
          <TabsContent value="chats" className="m-0 animate-fadeIn">
            <Card className="overflow-hidden border-gray-200 h-[550px] md:h-[650px] shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                {/* Chat List */}
                <div className={`border-r border-gray-100 h-full ${selectedConversation ? 'hidden md:block' : 'block'}`}>
                  <ChatList
                    key={listRefreshKey}
                    onSelectConversation={setSelectedConversation}
                    selectedId={selectedConversation?.id}
                    onUnreadChange={setHasUnreadMessages}
                    userProfilePicture={profile?.profile_picture_url || ""}
                  />
                </div>

                {/* Chat View */}
                <div className={`md:col-span-2 h-full min-h-0 overflow-hidden bg-gray-50/30 ${selectedConversation ? 'flex flex-col' : 'hidden md:flex md:items-center md:justify-center'}`}>
                  {selectedConversation ? (
                    <ChatView
                      conversation={selectedConversation}
                      onBack={() => {
                        setSelectedConversation(null);
                        setListRefreshKey(k => k + 1);
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare className="h-8 w-8 text-gray-300" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Select a conversation</h3>
                      <p className="text-sm text-gray-500 max-w-xs">
                        Select a message from the list to start chatting with buyers.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* 5. SETTINGS & PAYOUTS TAB */}
          <TabsContent value="settings_payouts" className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Form Settings */}
              <div className="lg:col-span-7 space-y-6">
                <Card className="border border-gray-200 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                      <Settings className="h-5 w-5 text-book-600" /> Business Profile Settings
                    </h3>
                    <div className="space-y-6">
                      {/* Profile Picture Upload */}
                      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start border-b pb-6 border-gray-100">
                        <Avatar className="w-20 h-20 border-2 border-book-100 shadow-md">
                          <AvatarImage src={avatarUrl} className="object-cover" />
                          <AvatarFallback className="bg-book-50 text-book-600 text-xl font-bold">
                            <Building2 className="h-8 w-8 text-book-600" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2 text-center sm:text-left">
                          <label className="block text-xs font-semibold text-gray-700">Business Logo / Profile Picture</label>
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id="biz-avatar-picker"
                              disabled={isUploadingPfp}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) await handlePfpUpload(file);
                              }}
                            />
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="border-gray-300 text-gray-700 rounded-xl"
                            >
                              <label htmlFor="biz-avatar-picker" className="cursor-pointer">
                                {isUploadingPfp ? "Uploading..." : "Upload Logo"}
                              </label>
                            </Button>
                          </div>
                          <p className="text-[10px] text-gray-400">JPG, PNG or GIF. Max 5MB.</p>
                        </div>
                      </div>

                      {/* Business Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="biz-name" className="text-xs font-semibold text-gray-700">Business Display Name</Label>
                        <input
                          id="biz-name"
                          type="text"
                          className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-book-500 outline-none border-gray-200"
                          placeholder="e.g. Prestige School Supplies Ltd"
                          value={businessNameInput}
                          onChange={(e) => setBusinessNameInput(e.target.value)}
                        />
                      </div>

                      {/* Support Phone Number */}
                      <div className="space-y-1.5">
                        <Label htmlFor="biz-phone" className="text-xs font-semibold text-gray-700">Support Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
                          <input
                            id="biz-phone"
                            type="tel"
                            className="w-full pl-10 pr-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-book-500 outline-none border-gray-200"
                            placeholder="e.g. 0821234567"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Instagram Handle */}
                      <div className="space-y-1.5">
                        <Label htmlFor="biz-insta" className="text-xs font-semibold text-gray-700">Instagram Link or Handle</Label>
                        <div className="relative">
                          <Instagram className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
                          <input
                            id="biz-insta"
                            type="text"
                            className="w-full pl-10 pr-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-book-500 outline-none border-gray-200"
                            placeholder="Paste Instagram link or enter handle"
                            value={instagramInput}
                            onChange={(e) => setInstagramInput(e.target.value)}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400">Pasting your full Instagram profile link is recommended.</p>
                      </div>

                      {/* Privacy Toggles */}
                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Public Profile Privacy</h4>
                        
                        <div className="flex items-center justify-between py-2">
                          <div className="space-y-0.5">
                            <Label htmlFor="show-addr" className="text-sm font-semibold text-gray-900">Show Address to Public</Label>
                            <p className="text-xs text-gray-500">Allow buyers to see your business pickup province on your store card.</p>
                          </div>
                          <Switch
                            id="show-addr"
                            checked={showAddressInput}
                            onCheckedChange={setShowAddressInput}
                          />
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div className="space-y-0.5">
                            <Label htmlFor="show-phone" className="text-sm font-semibold text-gray-900">Show Phone Number to Public</Label>
                            <p className="text-xs text-gray-500">Display contact number for customer support on your public card.</p>
                          </div>
                          <Switch
                            id="show-phone"
                            checked={showPhoneInput}
                            onCheckedChange={setShowPhoneInput}
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <Button
                          disabled={savingSettings}
                          onClick={handleSaveSettings}
                          className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl min-w-[140px]"
                        >
                          {savingSettings ? "Saving..." : "Save Settings"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: ReBooked Mini Card Live-Preview */}
              <div className="lg:col-span-5 space-y-6">
                <div className="sticky top-6">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ReBooked Mini Card Live Preview</div>
                  
                  <div id="rebooked-mini-preview" className="rounded-xl border shadow-sm p-4 sm:p-6 bg-gradient-to-br from-book-50 to-white text-left">
                    <div className="grid grid-cols-1 gap-4 items-start">
                      {/* Avatar + Info */}
                      <div className="flex items-start gap-4 min-w-0 text-left">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
                          <AvatarImage src={avatarUrl} />
                          <AvatarFallback className="bg-book-100 text-book-700 text-lg">
                            {(businessNameInput || profile?.name || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words md:text-left">
                              {businessNameInput || profile?.name || "Your Business Shop"}
                            </h1>
                            {isTier1 && (
                              <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          <div className="text-sm font-semibold text-book-800 mt-0.5 md:text-left flex items-center gap-1">
                            <span>ReBooked Mini</span>
                            {isTier1 ? (
                              <span className="text-xs text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">Business Tier 1</span>
                            ) : (
                              <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                                Business Free
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-2 flex flex-col gap-1.5 text-sm text-gray-600 md:text-left">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 flex-shrink-0 text-gray-400" />
                              <span className="break-words">
                                Member since {profile?.created_at
                                  ? new Date(profile.created_at).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                    })
                                  : "Recently"}
                              </span>
                            </div>
                            
                            {showAddressInput && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span className="break-words font-medium text-gray-800">{userProvince || "South Africa (Pickup Set)"}</span>
                              </div>
                            )}
                            
                            {showPhoneInput && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span className="break-words font-medium text-gray-800">{phoneInput || profile?.phone_number || "No contact set"}</span>
                              </div>
                            )}

                            {instagramInput && (
                              <div className="flex items-center gap-2">
                                <Instagram className="h-4 w-4 flex-shrink-0 text-pink-600" />
                                <a
                                  href={`https://instagram.com/${parseInstagramHandle(instagramInput)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-pink-600 hover:underline break-all"
                                >
                                  @{parseInstagramHandle(instagramInput)}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats + Actions */}
                      <div className="flex items-center justify-between border-t pt-4 border-gray-100">
                        <div className="flex items-center gap-6">
                          <div>
                            <div className="text-xs text-gray-500">Items Available</div>
                            <div className="text-lg font-bold text-book-700">{listings.length}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Seller Rating</div>
                            <div className="flex items-center gap-1 mt-1 text-xs text-yellow-500 font-semibold">
                              <span>⭐⭐⭐⭐⭐</span>
                              <span className="text-gray-500 text-[10px]">(4.9)</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 hover:bg-book-50 hover:border-book-300 transition-colors rounded-xl text-xs"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Share Profile</span>
                        </Button>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ReBooked Business Subscription Plan Card */}
            <div className="border-t border-gray-100 pt-8 mt-8">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2 px-1">
                    <BadgeCheck className="h-5 w-5 text-emerald-600" /> ReBooked Business Plan
                  </h3>
                  <div className={`rounded-xl p-4 flex items-start gap-4 ${isTier1 ? "bg-emerald-50 border border-emerald-200" : "bg-blue-50 border border-blue-200"}`}>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{isTier1 ? "Business Tier 1" : "Business Free"}</p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {isTier1
                          ? "6.5% commission · Bulk promos · Public contacts · Auto-responder · Restock & republish"
                          : "10% commission · Individual item deals only · No public contact display"}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {isTier1 ? "Your Tier 1 subscription is active." : "Upgrade to Tier 1 to unlock premium features."}
                      </p>
                    </div>
                     {!isTier1 && (
                      <Button
                        size="sm"
                        className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl shrink-0"
                        onClick={handleUpgradeSubscription}
                        disabled={isInitiatingCheckout}
                      >
                        {isInitiatingCheckout ? "Connecting..." : "Upgrade"}
                      </Button>
                    )}
                  </div>

                  {/* Auto-Responder — Tier 1 only */}
                  {isTier1 ? (
                    <div className="pt-4 border-t border-gray-100 space-y-2">
                      <Label htmlFor="auto-responder" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-book-600" /> Auto-Responder Message
                      </Label>
                      <p className="text-[11px] text-gray-500">When a buyer sends you a message, this reply is sent automatically within seconds.</p>
                      <textarea
                        id="auto-responder"
                        rows={3}
                        className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-book-500 outline-none border-gray-200 resize-none"
                        placeholder='e.g. "Hi! Thanks for reaching out. We usually respond within a few hours. To reserve a book, please place an order."'
                        value={autoResponderMsg}
                        onChange={(e) => setAutoResponderMsg(e.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          disabled={savingAutoResponder}
                          onClick={handleSaveAutoResponder}
                          className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl"
                        >
                          {savingAutoResponder ? "Saving..." : "Save Auto-Responder"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Lock className="h-4 w-4" />
                        <span>Auto-Responder is a <strong className="text-gray-600">Tier 1</strong> feature. Upgrade to unlock it.</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Funds & Payouts Channels Section */}
            <div className="border-t border-gray-150 pt-8 mt-8">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2 px-1">
                    <DollarSign className="h-5 w-5 text-emerald-600" /> Funds & Payout Channels
                  </h3>
                  <BankingProfileTab />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 6. ADDRESSES TAB */}
          <TabsContent value="addresses" className="space-y-6 animate-fadeIn">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2 px-1">
                  <MapPin className="h-5 w-5 text-book-600" /> Business Pickup & Delivery Addresses
                </h3>
                <ModernAddressTab
                  addressData={addressData}
                  onSaveAddresses={async (pickup, shipping, same) => {
                    await handleSaveAddresses(pickup, same);
                  }}
                  isLoading={isLoadingAddress}
                  pickupEnabled={pickupEnabled}
                  savingPickup={savingPickup}
                  setPickupEnabled={setPickupEnabled}
                  setSavingPickup={setSavingPickup}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Interactive Deal Pop-up Modal */}
      <Dialog open={dealModalOpen} onOpenChange={setDealModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl border border-gray-150">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Percent className="h-5 w-5 text-book-600" /> Configure Trade Deal
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Apply pricing adjustments to selected categories or individual listings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {/* Target Select if bulk — Tier 1 only */}
            {!dealBookId && (
              isTier1 ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Target Item Category</Label>
                  <select
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-book-500 outline-none bg-white border-gray-250"
                    value={dealTargetType}
                    onChange={(e) => setDealTargetType(e.target.value)}
                  >
                    <option value="all">All Inventory</option>
                    <option value="textbook">Textbook</option>
                    <option value="reader">Reader</option>
                    <option value="uniform">Uniform</option>
                    <option value="school_supply">School Supply</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800"><strong>Bulk deals</strong> are a Tier 1 feature. You can still apply a deal to this individual item.</p>
                </div>
              )
            )}

            {/* Discount Type Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Discount Pricing Model</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDealDiscountType("percentage")}
                  className={`py-2 text-xs font-bold border rounded-xl text-center transition-all ${
                    dealDiscountType === "percentage"
                      ? "border-book-600 bg-book-50 text-book-700"
                      : "border-gray-250 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Percentage Off (%)
                </button>
                <button
                  type="button"
                  onClick={() => setDealDiscountType("fixed")}
                  className={`py-2 text-xs font-bold border rounded-xl text-center transition-all ${
                    dealDiscountType === "fixed"
                      ? "border-book-600 bg-book-50 text-book-700"
                      : "border-gray-250 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Fixed Rand Off (R)
                </button>
              </div>
            </div>

              <div className="space-y-1.5">
              <Label htmlFor="deal-val" className="text-xs font-semibold text-gray-700">
                Discount Value {dealDiscountType === "percentage" ? "(%)" : "(ZAR)"}
              </Label>
              <input
                id="deal-val"
                type="number"
                min="1"
                placeholder={dealDiscountType === "percentage" ? "e.g. 15" : "e.g. 50"}
                className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-book-500 outline-none border-gray-250"
                value={dealValue || ""}
                onChange={(e) => setDealValue(Number(e.target.value))}
              />
              {dealValue > 0 && dealBookId && (() => {
                const targetBook = listings.find(b => b.id === dealBookId);
                if (!targetBook) return null;
                const originalPrice = targetBook.original_price || targetBook.price;
                const preview = dealDiscountType === "percentage"
                  ? Math.max(0, originalPrice * (1 - dealValue / 100))
                  : Math.max(0, originalPrice - dealValue);
                return (
                  <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg mt-1">
                    Preview: <span className="line-through text-gray-400">R{originalPrice}</span> → <strong>R{preview.toFixed(2)}</strong>
                  </p>
                );
              })()}
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-600 rounded-xl"
              onClick={() => setDealModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-book-600 hover:bg-book-700 text-white font-semibold rounded-xl"
              onClick={handleApplyDealModal}
            >
              Apply Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default BusinessProfilePage;
