import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import PayoutRequestForm from "@/components/profile/PayoutRequestForm";
import { buildPremiumReceiptHtml } from "@/utils/receiptHtmlBuilder";
import OrderManagementView from "@/components/orders/OrderManagementView";
import ChatList from "@/components/chat/ChatList";
import ChatView from "@/components/chat/ChatView";
import { Conversation } from "@/services/chatService";
import { getUserAddresses, saveUserAddresses } from "@/services/addressService";
import { AddressData, Address } from "@/types/address";
import { OverviewTab } from "@/components/business-profile/OverviewTab";
import { AnalyticsTab } from "@/components/business-profile/AnalyticsTab";
import { WalletTab } from "@/components/business-profile/WalletTab";
import { SettingsTab } from "@/components/business-profile/SettingsTab";
import { DealsUploadTab } from "@/components/business-profile/DealsUploadTab";
import { AddressesTab } from "@/components/business-profile/AddressesTab";
import { checkLiveSubscription } from "@/services/subscriptionService";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
  TrendingDown,
  Package,
  Wallet,
  CheckCircle,
  DollarSign,
  Search,
  Plus,
  Download,
  Loader2,
  FileText,
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
  Star,
  Store,
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
  const [csvRequirementsExpanded, setCsvRequirementsExpanded] = useState<boolean>(false);
  const [userProvince, setUserProvince] = useState<string | null>(null);
  const [autoCommit, setAutoCommit] = useState<boolean>(false);

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
    devAutoTiered?: boolean;
  }>({
    isTier1: false,
    status: "free",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    testMode: false,
  });
  const [loadingSubscription, setLoadingSubscription] = useState<boolean>(true);
  const [isInitiatingCheckout, setIsInitiatingCheckout] = useState<boolean>(false);

  // Wallet Transactions and Custom Payout/Redeem/Cancel States
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(false);
  const [showPayoutForm, setShowPayoutForm] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState<string>("");
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setTransactions(data.map((tx: any) => ({
          id: tx.id,
          type: tx.type,
          amount: Number(tx.amount) / 100,
          reason: tx.reason,
          reference_order_id: tx.reference_order_id,
          reference_payout_id: tx.reference_payout_id,
          status: tx.status,
          created_at: tx.created_at,
        })));
      }
    } catch (err) {
      console.warn("Failed to fetch transactions:", err);
    } finally {
      setLoadingTransactions(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && profile?.isBusiness) {
      fetchTransactions();
    }
  }, [user, profile, fetchTransactions]);

  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) return;
    setIsRedeeming(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-business-code", {
        body: { code: redeemCode }
      });
      if (error || !data.success) {
        throw new Error(error?.message || data?.error || "Redemption failed");
      }
      toast.success(data.message || "Code redeemed successfully! 🎉");
      setRedeemCode("");
      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.message || "Failed to redeem code");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your Tier 1 subscription? You will lose premium features at the end of the billing period.")) return;
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-subscription-cancel");
      if (error || !data.success) {
        throw new Error(error?.message || data?.error || "Cancellation failed");
      }
      toast.success(data.message || "Subscription cancelled successfully.");
      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel subscription");
    } finally {
      setIsCancelling(false);
    }
  };

  const downloadInvoice = async (orderId: string) => {
    setDownloadingId(orderId);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .select(`id, order_id, buyer_id, seller_id, status, delivery_status, total_amount, payment_status,
                 created_at, updated_at, buyer_full_name, seller_full_name, buyer_email, seller_email,
                 tracking_number, selected_courier_name, selected_service_name, payment_reference,
                 selected_shipping_cost, delivery_type, wallet_deducted_amount, items, book_id, item_id, item_type, platform_fee`)
        .eq("id", orderId)
        .maybeSingle();

      if (error || !order) {
        throw new Error(error?.message || "Order not found");
      }

      const html = buildPremiumReceiptHtml(order as any, true);
      
      const temp = document.createElement("div");
      temp.style.position = "fixed";
      temp.style.left = "-9999px";
      temp.style.top = "0";
      temp.style.width = "480px";
      temp.innerHTML = html;
      document.body.appendChild(temp);

      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(temp, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      
      const pdfWidth = 480;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${order.order_id || order.id}.pdf`);
      document.body.removeChild(temp);
      
      toast.success("Invoice PDF downloaded successfully!");
    } catch (err: any) {
      console.error("Invoice download failed:", err);
      toast.error("Failed to download invoice: " + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

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

  // Verify Paystack return reference on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    if (reference) {
      const verifySubscription = async () => {
        const loadingToast = toast.loading("Verifying your subscription...");
        try {
          const { data, error } = await supabase.functions.invoke("paystack-verify-subscription", {
            body: { reference }
          });
          if (error || !data.success) {
            throw new Error(error?.message || data?.error || "Verification failed");
          }
          toast.success("Subscription verified successfully! Welcome to Tier 1! 🎉", { id: loadingToast });
          fetchSubscription();
          // clean URL parameters
          navigate("/business-profile?tab=settings_payouts", { replace: true });
        } catch (err: any) {
          toast.error("Failed to verify subscription: " + err.message, { id: loadingToast });
        }
      };
      verifySubscription();
    }
  }, [navigate, fetchSubscription]);

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
        const { getUserConversations } = await import("@/services/chatService");
        const convs = await getUserConversations(user.id);
        const hasUnread = convs.some(c => (c.unread_count || 0) > 0);
        setHasUnreadMessages(hasUnread);
      } catch (err) {
        console.error("Error checking unread messages:", err);
      }
    };

    checkUnreadMessages();

    // Set up realtime channel to watch for new or read status updated messages for this user
    const channel = supabase
      .channel("global-business-unread")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
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
      setAutoCommit(!!(profile as any).auto_commit);
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
          auto_commit: autoCommit,
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
            .select("listing_id")
            .in("listing_id", bookIds);

          if (!viewsError && views) {
            // Count total views (each row = 1 view event)
            const totalViews = views.length;
            setListingViews(totalViews);

            // Get top viewed items by counting rows per listing_id
            const viewsMap = views.reduce((acc: Record<string, number>, curr) => {
              acc[curr.listing_id] = (acc[curr.listing_id] || 0) + 1;
              return acc;
            }, {});

            const itemsWithViews = mappedBooks.map((b: any) => ({
              ...b,
              views: viewsMap[b.id] || 0,
            })).sort((a: any, b: any) => b.views - a.views);

            setTopViewedListings(itemsWithViews.slice(0, 5));
          } else {
            // RLS restriction — show listings sorted by sold_quantity as fallback
            const itemsSorted = mappedBooks.map((b: any) => ({ ...b, views: 0 }));
            itemsSorted.sort((a: any, b: any) => (b.sold_quantity || 0) - (a.sold_quantity || 0));
            setTopViewedListings(itemsSorted.slice(0, 5));
          }
        } catch {
          // silently skip views fetch and set fallback
          const itemsSorted = mappedBooks.map((b: any) => ({ ...b, views: 0 }));
          itemsSorted.sort((a: any, b: any) => (b.sold_quantity || 0) - (a.sold_quantity || 0));
          setTopViewedListings(itemsSorted.slice(0, 5));
        }
      }
    } catch (error: any) {
      toast.error("Failed to load business account data: " + error.message);
    } finally {
      setLoadingListings(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user?.id]);

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

  // Build chart data from real listing data grouped by month
  const chartData = useMemo(() => {
    if (listings.length === 0) return [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthMap: Record<string, { views: number; sold: number }> = {};
    // Seed last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      monthMap[key] = { views: 0, sold: 0 };
    }
    // Aggregate sold quantities by listing created_at month
    listings.forEach((item: any) => {
      if (!item.created_at) return;
      const d = new Date(item.created_at);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      if (monthMap[key]) {
        monthMap[key].sold += item.sold_quantity || 0;
      }
    });
    // Distribute views from topViewedListings across months
    topViewedListings.forEach((item: any) => {
      if (!item.created_at) return;
      const d = new Date(item.created_at);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      if (monthMap[key]) {
        monthMap[key].views += item.views || 0;
      }
    });
    return Object.entries(monthMap).map(([name, data]) => ({ name, ...data }));
  }, [listings, topViewedListings]);

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
                      navigate(`/seller/${user?.id}`);
                    }}
                    className="bg-book-600 hover:bg-book-700 h-11 px-6 font-semibold shadow-sm md:min-w-[190px] text-white rounded-xl"
                  >
                    Go Live Shop
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
                You're on the <strong>10% commission</strong> plan. Upgrade to <strong>Tier 1</strong> from the Settings tab to unlock 6.5% commission, bulk deals, public contact display, and more.
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
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 gap-1 sm:gap-1.5 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs justify-center py-2.5">
              <Store className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-1.5 text-xs justify-center py-2.5">
              <Package className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Active Orders</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs justify-center py-2.5">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="deals_upload" className="flex items-center gap-1.5 text-xs justify-center py-2.5">
              <Percent className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Deals & Upload</span>
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex items-center gap-1.5 text-xs justify-center py-2.5 relative">
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Chats</span>
              {hasUnreadMessages && (
                <span className="absolute top-1 right-2 sm:right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs justify-center py-2.5">
              <Settings className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-1.5 text-xs justify-center py-2.5">
              <Wallet className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Wallet & Payouts</span>
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-1.5 text-xs justify-center py-2.5">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Addresses</span>
            </TabsTrigger>
          </TabsList>

          {/* 0. OVERVIEW TAB (first tab) */}
          <TabsContent value="overview" className="space-y-6 animate-fadeIn">
            <OverviewTab
              activeStock={activeStock}
              soldItems={soldItems}
              totalEarnings={totalEarnings}
              listingViews={listingViews}
              walletBalance={walletBalance}
              commissionLabel={commissionLabel}
              listings={listings}
              topViewedListings={topViewedListings}
              chartData={chartData}
              loadingWallet={loadingWallet}
              isTier1={isTier1}
              handleRemoveDeal={handleRemoveDeal}
            />
          </TabsContent>

          {/* Active Orders Tab */}
          <TabsContent value="orders" className="space-y-6 animate-fadeIn">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <OrderManagementView />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 1. ANALYTICS HUB TAB */}
          <TabsContent value="analytics" className="space-y-8 animate-fadeIn">
            <AnalyticsTab
              activeStock={activeStock}
              soldItems={soldItems}
              totalEarnings={totalEarnings}
              listingViews={listingViews}
              listings={listings}
              topViewedListings={topViewedListings}
              chartData={chartData}
              completedOrders={completedOrders}
              isTier1={isTier1}
              analyticsperiod={analyticsperiod}
              setAnalyticsPeriod={setAnalyticsPeriod}
            />
          </TabsContent>

          {/* 2. DEALS & INVENTORY + UPLOAD TAB */}
          <TabsContent value="deals_upload" className="space-y-6 animate-fadeIn">
            <DealsUploadTab
              listings={listings}
              filteredListings={filteredListings}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              handleEditBook={handleEditBook}
              handleRemoveDeal={handleRemoveDeal}
              uploadMethod={uploadMethod}
              setUploadMethod={setUploadMethod}
              manualRows={manualRows}
              setManualRows={setManualRows}
              csvFile={csvFile}
              csvPreview={csvPreview}
              isBulkUploading={isBulkUploading}
              handleBulkSubmit={handleBulkSubmit}
              csvRequirementsExpanded={csvRequirementsExpanded}
              setCsvRequirementsExpanded={setCsvRequirementsExpanded}
              handleFileChange={handleCsvUpload}
              dealModalOpen={dealModalOpen}
              setDealModalOpen={setDealModalOpen}
              dealTargetType={dealTargetType}
              setDealTargetType={setDealTargetType}
              dealBookId={dealBookId}
              setDealBookId={setDealBookId}
              dealDiscountType={dealDiscountType}
              setDealDiscountType={setDealDiscountType}
              dealValue={dealValue}
              setDealValue={setDealValue}
              handleApplyDeal={handleApplyDealModal}
            />
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
                      onMessagesRead={() => {
                        setListRefreshKey(k => k + 1);
                        setHasUnreadMessages(false);
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

          {/* 5. GENERAL SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-8 animate-fadeIn">
            <SettingsTab
              user={user}
              profile={profile}
              businessNameInput={businessNameInput}
              setBusinessNameInput={setBusinessNameInput}
              instagramInput={instagramInput}
              setInstagramInput={setInstagramInput}
              phoneInput={phoneInput}
              setPhoneInput={setPhoneInput}
              avatarUrl={avatarUrl}
              isUploadingPfp={isUploadingPfp}
              handlePfpUpload={handlePfpUpload}
              showAddressInput={showAddressInput}
              setShowAddressInput={setShowAddressInput}
              showPhoneInput={showPhoneInput}
              setShowPhoneInput={setShowPhoneInput}
              autoCommit={autoCommit}
              setAutoCommit={setAutoCommit}
              autoResponderMsg={autoResponderMsg}
              setAutoResponderMsg={setAutoResponderMsg}
              savingSettings={savingSettings}
              handleSaveSettings={handleSaveSettings}
              savingAutoResponder={savingAutoResponder}
              handleSaveAutoResponder={handleSaveAutoResponder}
              subscriptionStatus={subscriptionStatus}
              loadingSubscription={loadingSubscription}
              isInitiatingCheckout={isInitiatingCheckout}
              handleUpgradeSubscription={handleUpgradeSubscription}
              isCancelling={isCancelling}
              handleCancelSubscription={handleCancelSubscription}
              redeemCode={redeemCode}
              setRedeemCode={setRedeemCode}
              isRedeeming={isRedeeming}
              handleRedeemCode={handleRedeemCode}
              isTier1={isTier1}
            />
          </TabsContent>

          {/* 6. WALLET & PAYOUTS TAB */}
          <TabsContent value="wallet" className="space-y-6 animate-fadeIn">
            <WalletTab
              user={user}
              walletBalance={walletBalance}
              loadingWallet={loadingWallet}
              transactions={transactions}
              loadingTransactions={loadingTransactions}
              downloadingId={downloadingId}
              downloadInvoice={downloadInvoice}
              fetchWalletBalance={async () => {
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
              }}
              fetchTransactions={fetchTransactions}
            />
          </TabsContent>

          {/* 7. ADDRESSES TAB */}
          <TabsContent value="addresses" className="space-y-6 animate-fadeIn">
            <AddressesTab
              user={user}
              addressData={addressData}
              isLoadingAddress={isLoadingAddress}
              pickupEnabled={pickupEnabled}
              setPickupEnabled={setPickupEnabled}
              savingPickup={savingPickup}
              handleSaveAddresses={handleSaveAddresses}
              loadUserAddresses={loadUserAddresses}
            />
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
