import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { checkLiveSubscription } from "@/services/subscriptionService";
import { toast } from "sonner";
import {
  Building2,
  Mail,
  Calendar,
  Package,
  TrendingUp,
  Trophy,
  Store,
  BarChart3,
  Percent,
  MessageSquare,
  Settings,
  Wallet,
  MapPin,
  BadgeCheck,
  Loader2,
} from "lucide-react";

// Import modular tab implementations
import { OverviewTab } from "./OverviewTab";
import { OrdersTab } from "./OrdersTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { DealsUploadTab } from "./DealsUploadTab";
import { ChatsTab } from "./ChatsTab";
import { SettingsTab } from "./SettingsTab";
import { WalletTab } from "./WalletTab";
import { AddressesTab } from "./AddressesTab";

export const BusinessProfilePage = () => {
  const { user, profile, isLoading: authLoading, isCheckingProfile } = useAuth();
  const navigate = useNavigate();

  // Navigation state
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Global shared/derived state for Overview tab
  const [listings, setListings] = useState<any[]>([]);
  const [listingViews, setListingViews] = useState<number>(0);
  const [topViewedListings, setTopViewedListings] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState<boolean>(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState<boolean>(false);

  // Real order-based revenue
  const [orderRevenue, setOrderRevenue] = useState<number>(0);
  const [loadingRevenue, setLoadingRevenue] = useState<boolean>(true);

  // Live subscription checks
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

  // 1. Authentication Redirect for Non-Business Sellers
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

  // 2. Fetch Live Subscription Status
  const fetchSubscription = async () => {
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
  };

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  // 3. Fetch Unread Messages Indicator
  useEffect(() => {
    if (!user) return;
    const checkUnreadMessages = async () => {
      try {
        const { getUserConversations } = await import("@/services/chatService");
        const convs = await getUserConversations(user.id);
        const hasUnread = convs.some((c) => (c.unread_count || 0) > 0);
        setHasUnreadMessages(hasUnread);
      } catch (err) {
        console.error("Error checking unread messages:", err);
      }
    };

    checkUnreadMessages();

    // Setup realtime subscription
    const channel = supabase
      .channel("global-business-unread-sync")
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

  // 4. Fetch Wallet Balance for Overview Tab Nudge
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

  useEffect(() => {
    if (user && profile?.isBusiness) {
      fetchWalletBalance();
    }
  }, [user, profile]);

  // 5. Fetch Listings data for calculations
  const fetchData = async () => {
    if (!user) return;
    setLoadingListings(true);
    try {
      const { data: books, error: booksError } = await supabase
        .from("books")
        .select("*, profiles!seller_id(*)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (booksError) throw booksError;
      
      const mappedBooks = books || [];
      setListings(mappedBooks);

      // Fetch views
      if (mappedBooks.length > 0) {
        try {
          const bookIds = mappedBooks.map((b: any) => b.id);
          const { data: views, error: viewsError } = await supabase
            .from("listing_views")
            .select("listing_id")
            .in("listing_id", bookIds);

          if (!viewsError && views) {
            const totalViews = views.length;
            setListingViews(totalViews);

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
            const itemsSorted = mappedBooks.map((b: any) => ({ ...b, views: 0 }));
            itemsSorted.sort((a: any, b: any) => (b.sold_quantity || 0) - (a.sold_quantity || 0));
            setTopViewedListings(itemsSorted.slice(0, 5));
          }
        } catch {
          const itemsSorted = mappedBooks.map((b: any) => ({ ...b, views: 0 }));
          itemsSorted.sort((a: any, b: any) => (b.sold_quantity || 0) - (a.sold_quantity || 0));
          setTopViewedListings(itemsSorted.slice(0, 5));
        }
      }
    } catch (error: any) {
      toast.error("Failed to load business catalog: " + error.message);
    } finally {
      setLoadingListings(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // 6. Fetch Real Order Revenue from completed orders
  const fetchOrderRevenue = async () => {
    if (!user) return;
    setLoadingRevenue(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("seller_id", user.id)
        .eq("status", "completed");

      if (error) throw error;

      const total = (data || []).reduce(
        (acc: number, order: any) => acc + (Number(order.total_amount) || 0),
        0
      );
      setOrderRevenue(total);
    } catch (err) {
      console.warn("Failed to fetch order revenue:", err);
      // Fallback: keep the listing-based approximation
    } finally {
      setLoadingRevenue(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrderRevenue();
    }
  }, [user]);

  // Remove deal handler
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

  // Derive stats for overview
  // Use real order revenue when available, fallback to listing-based estimate
  const listingBasedEarnings = listings.reduce((acc, curr) => acc + (Number(curr.price) * (curr.sold_quantity || 0)), 0);
  const totalEarnings = !loadingRevenue && orderRevenue > 0 ? orderRevenue : listingBasedEarnings;
  const activeStock = listings.reduce((acc, curr) => acc + (curr.available_quantity || 0), 0);
  const soldItems = listings.reduce((acc, curr) => acc + (curr.sold_quantity || 0), 0);

  const isTier1 = subscriptionStatus.isTier1;
  const commissionLabel = isTier1 ? "6.5%" : "10%";

  // Build monthly sales trend data
  const chartData = useMemo(() => {
    if (listings.length === 0) return [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthMap: Record<string, { views: number; sold: number }> = {};
    const now = new Date();
    // Seed past 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      monthMap[key] = { views: 0, sold: 0 };
    }
    // Aggregate sales
    listings.forEach((item: any) => {
      if (!item.created_at) return;
      const d = new Date(item.created_at);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      if (monthMap[key]) {
        monthMap[key].sold += item.sold_quantity || 0;
      }
    });
    // Aggregate views fallback
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

  if (authLoading || isCheckingProfile || !profile?.isBusiness) {
    return (
      <Layout>
        <div className="mx-auto py-8 max-w-none w-full px-4 sm:px-6 lg:px-8 xl:px-12 space-y-8 animate-pulse">
          {/* Skeleton Header Card */}
          <div className="border border-gray-200 rounded-3xl bg-white p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="w-24 h-24 bg-gray-200 rounded-full shrink-0" />
              <div className="space-y-4 flex-1">
                <div className="h-7 bg-gray-200 rounded w-1/2 sm:w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-2/3 sm:w-1/2" />
                <div className="flex gap-4 pt-2">
                  <div className="h-6 bg-gray-200 rounded w-20" />
                  <div className="h-6 bg-gray-200 rounded w-24" />
                  <div className="h-6 bg-gray-200 rounded w-20" />
                </div>
              </div>
            </div>
          </div>

          {/* Skeleton Tabs List */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 bg-gray-100 p-1.5 rounded-2xl">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-xl" />
            ))}
          </div>

          {/* Skeleton Tab Content (Overview simulation) */}
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
              ))}
            </div>
            {/* Main Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 h-72 bg-gray-200 rounded-2xl" />
              <div className="h-72 bg-gray-200 rounded-2xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Business Dashboard | ReBooked Solutions"
        description="Verified ReBooked Solutions Business partner catalog, transactions, and performance dashboard."
      />

      <div className="mx-auto py-8 max-w-none w-full px-4 sm:px-6 lg:px-8 xl:px-12 space-y-8">
        {/* PROFILE SUMMARY HEADER */}
        <Card className="border border-gray-250 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center text-center gap-6 md:flex-row md:items-start md:text-left md:justify-between">
              <div className="flex flex-col items-center gap-5 md:flex-row md:items-start md:gap-6">
                <Avatar className="w-24 h-24 border-2 border-book-100 shadow-md bg-book-50">
                  <AvatarFallback className="bg-book-50 text-book-600 text-2xl font-bold">
                    <Building2 className="h-10 w-10 text-book-600" />
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                      <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                        {profile?.businessName || profile?.name || "Verified Business Shop"}
                      </h1>
                      {isTier1 ? (
                        <Badge className="bg-emerald-150 text-emerald-800 border border-emerald-250 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                          <BadgeCheck className="h-3 w-3 text-emerald-600" />
                          <span>Business Tier 1</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                          <span>Business Free</span>
                        </Badge>
                      )}
                    </div>
                    
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400 font-medium md:justify-start">
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

                  <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 md:justify-start text-xs font-bold text-gray-700">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-book-600" />
                      <span className="text-lg font-bold text-gray-900">{listings.length}</span>
                      <span className="text-gray-500 font-medium">Total Listings</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-lg font-bold text-gray-900">R{totalEarnings.toFixed(0)}</span>
                      <span className="text-gray-500 font-medium">Total Earnings</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy className={`w-4 h-4 ${isTier1 ? "text-emerald-500" : "text-gray-400"}`} />
                      <span className="text-lg font-bold text-gray-900">{commissionLabel}</span>
                      <span className="text-gray-500 font-medium">Commission</span>
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

        {/* UPGRADE NUDGE BANNER */}
        {!isTier1 && (
          <div className="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl flex items-center justify-center gap-3 text-sm text-center">
            <div className="flex flex-col items-center justify-center max-w-3xl">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-blue-600 shrink-0" />
                <p className="font-bold">ReBooked Business Free Plan</p>
              </div>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                You're on the 10% commission plan. Upgrade to <strong>Tier 1</strong> from the Settings tab to lock in the <strong>6.5% rate</strong>, unlock bulk deals, auto-commit checkouts, and customer auto-responders.
              </p>
            </div>
          </div>
        )}

        {/* DASHBOARD NAVIGATION & CONTENT */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 gap-1.5 h-auto bg-gray-55/40 p-1 border rounded-2xl">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs justify-center py-2.5 rounded-xl font-bold">
              <Store className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-1.5 text-xs justify-center py-2.5 rounded-xl font-bold">
              <Package className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs justify-center py-2.5 rounded-xl font-bold">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="deals_upload" className="flex items-center gap-1.5 text-xs justify-center py-2.5 rounded-xl font-bold">
              <Percent className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Deals/Upload</span>
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex items-center gap-1.5 text-xs justify-center py-2.5 rounded-xl font-bold relative">
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Chats</span>
              {hasUnreadMessages && (
                <span className="absolute top-1.5 right-2 h-2.5 w-2.5 bg-green-500 border border-white rounded-full animate-pulse"></span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs justify-center py-2.5 rounded-xl font-bold">
              <Settings className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-1.5 text-xs justify-center py-2.5 rounded-xl font-bold">
              <Wallet className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Wallet</span>
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-1.5 text-xs justify-center py-2.5 rounded-xl font-bold">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Addresses</span>
            </TabsTrigger>
          </TabsList>

          {/* tab contents */}
          <TabsContent value="overview" className="m-0">
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

          <TabsContent value="orders" className="m-0">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="analytics" className="m-0">
            <AnalyticsTab
              userId={user.id}
              isTier1={isTier1}
              onUpgradeClick={() => setActiveTab("settings")}
            />
          </TabsContent>

          <TabsContent value="deals_upload" className="m-0">
            <DealsUploadTab isTier1={isTier1} />
          </TabsContent>

          <TabsContent value="chats" className="m-0">
            <ChatsTab profilePictureUrl={profile?.profile_picture_url || ""} />
          </TabsContent>

          <TabsContent value="settings" className="m-0">
            <SettingsTab />
          </TabsContent>

          <TabsContent value="wallet" className="m-0">
            <WalletTab />
          </TabsContent>

          <TabsContent value="addresses" className="m-0">
            <AddressesTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default BusinessProfilePage;
