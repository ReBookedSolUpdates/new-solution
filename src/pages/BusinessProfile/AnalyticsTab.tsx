import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Package,
  CheckCircle,
  DollarSign,
  Eye,
  Trophy,
  TrendingUp,
  Users,
  Info,
  Sparkles,
  Layers,
  Percent,
  Zap,
  Lock,
  ShoppingCart,
  AlertCircle,
  Star,
  Search,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsTabProps {
  userId: string;
  isTier1: boolean;
  onUpgradeClick: () => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  userId,
  isTier1,
  onUpgradeClick,
}) => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [timeFilter, setTimeFilter] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_business_analytics", {
          p_seller_id: userId,
        });
        if (error) throw error;
        setAnalyticsData(data);
      } catch (err: any) {
        console.error("Failed to load business analytics:", err);
        toast.error("Failed to load business analytics suite");
      } finally {
        setLoading(false);
      }
    };
    if (userId) {
      fetchAnalytics();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* 1. Stat cards row skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
          ))}
        </div>

        {/* 2. Order status checks skeleton */}
        <div className="h-36 bg-gray-200 rounded-2xl" />

        {/* 3. ROI banner skeleton */}
        <div className="h-20 bg-gray-200 rounded-3xl" />

        {/* 4. Charts area skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-72 bg-gray-200 rounded-2xl" />
          <div className="flex flex-col gap-6">
            <div className="h-[136px] bg-gray-200 rounded-2xl" />
            <div className="h-[136px] bg-gray-200 rounded-2xl" />
          </div>
        </div>

        {/* 5. Funnel and Dead Stock area skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-72 bg-gray-200 rounded-2xl" />
          <div className="h-72 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const freeData = analyticsData?.free_tier || {
    total_items_listed: 0,
    total_items_sold: 0,
    active_listings_count: 0,
    basic_order_statuses: {},
  };

  const businessData = analyticsData?.business_tier || {
    sales_performance: {
      revenue_over_time: [],
      sell_through_rate: 0,
      avg_days_to_sell: 0,
      best_categories: [],
      best_price_points: [],
      repeat_buyer_rate: 0,
    },
    listing_performance: {
      views_per_listing: 0,
      view_to_chat_rate: 0,
      chat_to_sale_rate: 0,
      zero_view_listings: [],
      time_to_first_view_hours: 0,
      time_to_first_chat_hours: 0,
    },
    buyer_insights: {
      finding_channels: [],
      popular_searches: [],
      peak_buying_times: [],
    },
    financial: {
      commission_saved: 0,
      payout_history: [],
      avg_order_value_trend: [],
    },
    market_comparison: {
      price_comparison: [],
      demand_signals: [],
    },
    restock_nudges: [],
  };

  // Convert basic order statuses from object to key-value array
  const orderStatuses = Object.entries(freeData.basic_order_statuses || {}).map(
    ([status, count]) => ({ status, count: Number(count) })
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. BASIC KPIS - Visible to All Tiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Total Items Listed",
            value: freeData.total_items_listed,
            icon: Package,
            gradient: "from-blue-50 to-indigo-50/30 text-blue-600 border-blue-100",
          },
          {
            label: "Lifetime Sold Items",
            value: freeData.total_items_sold,
            icon: CheckCircle,
            gradient: "from-green-50 to-emerald-50/30 text-green-600 border-green-100",
          },
          {
            label: "Current Active Listings",
            value: freeData.active_listings_count,
            icon: Sparkles,
            gradient: "from-yellow-50 to-amber-50/30 text-amber-600 border-amber-100",
          },
          {
            label: "Basic Payouts Processed",
            value: businessData.financial?.payout_history?.filter((p: any) => p.status === "completed").length || 0,
            icon: DollarSign,
            gradient: "from-purple-50 to-fuchsia-50/30 text-purple-600 border-purple-100",
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={`border shadow-sm bg-gradient-to-br ${stat.gradient} transition-all duration-300 hover:scale-[1.02]`}
          >
            <CardContent className="p-6 flex flex-col justify-between h-full min-h-[110px]">
              <div className="flex justify-between items-start w-full">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {stat.label}
                </span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-sm border border-gray-100">
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="text-left mt-4">
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. ORDER STATUS CHECKS - Visible to All Tiers */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <CardContent className="p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-600">
            <ShoppingCart className="h-5 w-5 text-book-600" /> Basic Order Fulfillment Statuses
          </h3>
          {orderStatuses.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No orders registered yet. Share your listings to get started!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {orderStatuses.map(({ status, count }) => (
                <div
                  key={status}
                  className="p-4 bg-gray-50/60 rounded-2xl border border-gray-100 text-center hover:bg-gray-50 transition-all"
                >
                  <Badge variant="outline" className="capitalize text-xs font-semibold px-2.5 py-1">
                    {status.replace("_", " ")}
                  </Badge>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. BUSINESS TIER PREMIUM SUITE */}
      {isTier1 ? (
        <div className="space-y-8 animate-fadeIn">
          {/* ROI SAVINGS BANNER */}
          <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-md transition-all hover:shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold tracking-wide">Verified Business Dashboard Active</h4>
                <p className="text-xs opacity-90 font-medium">
                  Saving <strong>3.5% commission</strong> on every order compared to standard sellers.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 bg-white/10 px-6 py-2.5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                Total Saved
              </span>
              <span className="text-2xl font-bold">
                R{businessData.financial?.commission_saved?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          {/* MAIN CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Revenue Area Chart */}
            <Card className="lg:col-span-2 border-gray-200 shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-500" /> Sales Revenue over Time
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                      Daily totals showing completed orders revenue.
                    </p>
                  </div>
                  <div className="flex gap-1 border rounded-xl p-0.5 bg-gray-50 border-gray-200">
                    {["daily", "weekly", "monthly"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTimeFilter(t as any)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all capitalize ${
                          timeFilter === t
                            ? "bg-white text-gray-900 shadow-sm font-bold"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-64 mt-4">
                  {businessData.sales_performance?.revenue_over_time?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                      <Info className="h-8 w-8 mb-2 text-gray-300" />
                      <p className="text-sm">No revenue registered in selected period</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={businessData.sales_performance?.revenue_over_time}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "16px",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue (ZAR)"
                          stroke="#10b981"
                          strokeWidth={3}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sell-Through & Speed KPIs */}
            <div className="flex flex-col gap-6">
              {/* STR */}
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="p-6">
                  <span className="text-xs font-bold text-gray-400 uppercase block tracking-wider">
                    Sell-through Rate
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-4xl font-bold text-gray-900">
                      {businessData.sales_performance?.sell_through_rate}%
                    </p>
                    <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" /> Target 50%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Percentage of uploaded catalog that converts to successful sales.
                  </p>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      style={{ width: `${businessData.sales_performance?.sell_through_rate}%` }}
                      className="bg-emerald-500 h-full rounded-full"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Days to Sell */}
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="p-6">
                  <span className="text-xs font-bold text-gray-400 uppercase block tracking-wider">
                    Avg Days to Sell
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-4xl font-bold text-gray-900">
                      {businessData.sales_performance?.avg_days_to_sell} days
                    </p>
                    <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> Average Speed
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Average time from listing creation to payment confirmed completion.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* LISTING FUNNEL CONVERSION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Funnel leakage visualization */}
            <Card className="lg:col-span-2 border-gray-200 shadow-sm bg-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2">
                  <Percent className="h-5 w-5 text-purple-600" /> Sales Funnel Conversion Rate
                </h3>
                <div className="space-y-6">
                  {/* Step 1: Views */}
                  <div className="relative">
                    <div className="flex justify-between items-center text-xs font-bold mb-1">
                      <span className="text-gray-600 uppercase tracking-wider">Total Views</span>
                      <span className="text-gray-900">{businessData.listing_performance?.views_per_listing || 0} average views</span>
                    </div>
                    <div className="w-full bg-gray-100 h-4 rounded-xl overflow-hidden relative">
                      <div className="bg-indigo-500 h-full w-full" />
                    </div>
                  </div>

                  {/* Step 2: Chats */}
                  <div className="relative">
                    <div className="flex justify-between items-center text-xs font-bold mb-1">
                      <span className="text-gray-600 uppercase tracking-wider">
                        Chats Initiated ({businessData.listing_performance?.view_to_chat_rate}% view-to-chat)
                      </span>
                      <span className="text-gray-900">{businessData.listing_performance?.time_to_first_chat_hours || 0}h to first chat</span>
                    </div>
                    <div className="w-full bg-gray-100 h-4 rounded-xl overflow-hidden relative">
                      <div
                        style={{ width: `${businessData.listing_performance?.view_to_chat_rate}%` }}
                        className="bg-purple-500 h-full min-w-[5%]"
                      />
                    </div>
                  </div>

                  {/* Step 3: Sales */}
                  <div className="relative">
                    <div className="flex justify-between items-center text-xs font-bold mb-1">
                      <span className="text-gray-600 uppercase tracking-wider">
                        Confirmed Sales ({businessData.listing_performance?.chat_to_sale_rate}% chat-to-sale)
                      </span>
                      <span className="text-gray-900">{businessData.listing_performance?.time_to_first_view_hours || 0}h to first view</span>
                    </div>
                    <div className="w-full bg-gray-100 h-4 rounded-xl overflow-hidden relative">
                      <div
                        style={{
                          width: `${businessData.listing_performance?.chat_to_sale_rate}%`,
                        }}
                        className="bg-emerald-500 h-full min-w-[3%]"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Zero Views Alert (Dead Stock) */}
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 text-sm mb-4 uppercase tracking-wider text-gray-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" /> Dead Stock Flags
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Listings with zero views. Repricer or photos recommended.
                </p>
                {businessData.listing_performance?.zero_view_listings?.length === 0 ? (
                  <p className="text-xs text-emerald-600 font-semibold bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    Awesome! All your active items have registered traffic.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {businessData.listing_performance?.zero_view_listings?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-xl text-xs"
                      >
                        <span className="font-bold text-gray-900 truncate w-32">{item.title}</span>
                        <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          R{item.price}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* FINANCIALS & MARKET COMPARISON */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Price comparisons vs market averages */}
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-500" /> Market Pricing Comparison
                </h3>
                {businessData.market_comparison?.price_comparison?.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    Add listings to check pricing competitiveness.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {businessData.market_comparison?.price_comparison?.map((comp: any) => (
                      <div key={comp.category} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="capitalize">{comp.category}</span>
                          <span>
                            My Average: <strong>R{comp.my_average_price}</strong> vs Market:{" "}
                            <strong>R{comp.market_average_price || 0}</strong>
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
                          <div
                            style={{
                              width: `${
                                (Number(comp.my_average_price) /
                                  Math.max(1, Number(comp.market_average_price) || 1)) *
                                50
                              }%`,
                            }}
                            className="bg-indigo-500 h-full"
                          />
                          <div
                            style={{
                              width: `${
                                (Number(comp.market_average_price || 0) /
                                  Math.max(1, Number(comp.my_average_price) || 1)) *
                                50
                              }%`,
                            }}
                            className="bg-gray-300 h-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Demand suggestion engine */}
            <Card className="border-gray-200 shadow-sm bg-white bg-gradient-to-br from-amber-50/20 to-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <Search className="h-5 w-5 text-amber-500 animate-bounce" /> Listing Suggestions (Demand Signal)
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  High-converting items searched by parents this week that you have not listed yet:
                </p>
                {businessData.market_comparison?.demand_signals?.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">
                    No matching demand signals this week. Keep checking!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {businessData.market_comparison?.demand_signals?.map((ds: any) => (
                      <div
                        key={ds.query}
                        className="flex items-start justify-between p-3 bg-white border border-amber-100 rounded-2xl text-xs hover:border-amber-200 transition-all shadow-sm"
                      >
                        <div>
                          <p className="font-bold text-gray-800">"{ds.query}"</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {ds.query_count} local parent searches this week
                          </p>
                        </div>
                        <Badge className="bg-amber-600 hover:bg-amber-700 text-white border-0 font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                          Create List <ArrowRight className="h-3 w-3" />
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RESTOCK REACTIVATION NUDGES */}
          {businessData.restock_nudges?.length > 0 && (
            <Card className="border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white shadow-sm rounded-3xl">
              <CardContent className="p-6">
                <h3 className="font-bold text-indigo-900 text-lg mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600 animate-spin" /> Seasonal Restock Nudges
                </h3>
                <div className="space-y-3">
                  {businessData.restock_nudges.map((nudge: any) => (
                    <div
                      key={nudge.title}
                      className="p-4 bg-white/80 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <p className="text-sm font-semibold text-indigo-950">{nudge.message}</p>
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-4 text-xs shrink-0"
                      >
                        List Item
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* PREMIUM FEATURES UPSELL PREVIEW */
        <Card className="border border-dashed border-gray-300 bg-gray-50/50 p-10 text-center rounded-3xl relative overflow-hidden shadow-inner">
          <div className="absolute top-4 right-4 bg-book-100 text-book-800 text-[10px] font-bold uppercase px-2.5 py-1 rounded flex items-center gap-1">
            <Lock className="h-3 w-3 text-book-700" /> Tier 1 Exclusive Suite
          </div>
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-book-50 rounded-2xl flex items-center justify-center mx-auto border border-book-100 shadow-sm">
              <Trophy className="h-7 w-7 text-book-600" />
            </div>
            <h4 className="font-bold text-gray-900 text-lg">Unlock verified ReBooked Business Suite</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Gain access to detailed revenue trends, view-to-chat conversion rates, chat-to-sale funnel leak finders, demand suggestion engines, pricing comparisons, and restock reactivation nudges.
            </p>
            <div className="pt-2">
              <Button
                size="sm"
                className="bg-book-600 hover:bg-book-700 text-white font-bold rounded-xl text-xs px-6 py-4 shadow-sm"
                onClick={onUpgradeClick}
              >
                Upgrade to Tier 1 (6.5%)
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
