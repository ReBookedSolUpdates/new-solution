import React, { useState, useEffect, useMemo } from "react";
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
  BarChart3,
  Repeat,
  CalendarDays,
  Target,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

  const freeData = useMemo(() => analyticsData?.free_tier || {
    total_items_listed: 0,
    total_items_sold: 0,
    active_listings_count: 0,
    basic_order_statuses: {},
  }, [analyticsData]);

  const businessData = useMemo(() => analyticsData?.business_tier || {
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
      focus_demand_signals: [],
    },
    restock_nudges: [],
  }, [analyticsData]);

  const orderStatuses = useMemo(() => Object.entries(freeData.basic_order_statuses || {}).map(
    ([status, count]) => ({ status, count: Number(count) })
  ), [freeData]);

  // Category bar colors
  const categoryColors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

  // Map peak buying times to readable format
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const peakTimes = useMemo(() => {
    return (businessData.buyer_insights?.peak_buying_times || []).map((pt: any) => ({
      label: `${dayNames[pt.day_of_week]} ${pt.hour_of_day}:00`,
      count: pt.count,
    }));
  }, [businessData.buyer_insights?.peak_buying_times]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
          ))}
        </div>
        <div className="h-36 bg-gray-100 rounded-2xl" />
        <div className="h-20 bg-gray-100 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-gray-100 rounded-2xl" />
          <div className="flex flex-col gap-4">
            <div className="h-[136px] bg-gray-100 rounded-2xl" />
            <div className="h-[136px] bg-gray-100 rounded-2xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-gray-100 rounded-2xl" />
          <div className="h-72 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. BASIC KPIS — All Tiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Items Listed",
            value: freeData.total_items_listed,
            icon: Package,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            borderAccent: "border-l-blue-500",
          },
          {
            label: "Items Sold",
            value: freeData.total_items_sold,
            icon: CheckCircle,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            borderAccent: "border-l-emerald-500",
          },
          {
            label: "Active Listings",
            value: freeData.active_listings_count,
            icon: Sparkles,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
            borderAccent: "border-l-amber-500",
          },
          {
            label: "Payouts Completed",
            value: businessData.financial?.payout_history?.filter((p: any) => p.status === "completed").length || 0,
            icon: DollarSign,
            iconBg: "bg-purple-50",
            iconColor: "text-purple-600",
            borderAccent: "border-l-purple-500",
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={`border border-gray-100 shadow-sm bg-white border-l-4 ${stat.borderAccent} hover:shadow-md transition-all duration-300 group`}
          >
            <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
              <div className="flex justify-between items-start w-full">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.iconBg} group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`h-4.5 w-4.5 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-auto tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. ORDER STATUS GRID */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <CardContent className="p-6">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-600 uppercase tracking-widest">
            <div className="w-7 h-7 bg-book-50 rounded-lg flex items-center justify-center shrink-0">
              <ShoppingCart className="h-4 w-4 text-book-600" />
            </div>
            Order Fulfillment
          </h3>
          {orderStatuses.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No orders registered yet. Share your listings to get started!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {orderStatuses.map(({ status, count }) => {
                const statusColors: Record<string, string> = {
                  completed: "bg-emerald-50 border-emerald-100 text-emerald-700",
                  cancelled: "bg-red-50 border-red-100 text-red-700",
                  disputed: "bg-orange-50 border-orange-100 text-orange-700",
                  pending_commit: "bg-blue-50 border-blue-100 text-blue-700",
                  committed: "bg-indigo-50 border-indigo-100 text-indigo-700",
                  dispatched: "bg-sky-50 border-sky-100 text-sky-700",
                };
                const colorClass = statusColors[status] || "bg-gray-50 border-gray-100 text-gray-700";
                return (
                  <div
                    key={status}
                    className={`p-4 rounded-xl border text-center ${colorClass} transition-all hover:scale-[1.02]`}
                  >
                    <Badge variant="outline" className="capitalize text-[10px] font-bold px-2 py-0.5 border-0 bg-white/60">
                      {status.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-2xl font-bold mt-2">{count}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. BUSINESS TIER PREMIUM SUITE */}
      {isTier1 ? (
        <div className="space-y-6 animate-fadeIn">
          {/* ROI SAVINGS BANNER */}
          <Card className="border border-emerald-200 bg-emerald-50/40 shadow-none rounded-xl">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Verified Business Dashboard Active</h4>
                <p className="text-xs text-gray-650 mt-0.5">
                  You have saved <strong className="text-emerald-800 font-bold">R{businessData.financial?.commission_saved?.toLocaleString() || 0}</strong> in commission fees (3.5% saved compared to standard sellers).
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-250 font-bold text-xs px-2.5 py-1 rounded-lg">
                6.5% Rate
              </Badge>
            </CardContent>
          </Card>

          {/* REVENUE CHART + SELL-THROUGH KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Area Chart */}
            <Card className="lg:col-span-2 border-gray-100 shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                      <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                      </div>
                      Revenue Over Time
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium mt-1 ml-9">
                      Completed order revenue (last 30 days)
                    </p>
                  </div>
                  <div className="flex gap-0.5 border rounded-xl p-0.5 bg-gray-50 border-gray-200">
                    {["daily", "weekly", "monthly"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTimeFilter(t as any)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all capitalize ${
                          timeFilter === t
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-[256px] h-64">
                  {businessData.sales_performance?.revenue_over_time?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-2">
                        <Info className="h-6 w-6 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium">No revenue in selected period</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <AreaChart
                        data={businessData.sales_performance?.revenue_over_time}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 9, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "14px",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                            fontSize: "11px",
                            padding: "10px 14px",
                          }}
                          labelStyle={{ fontWeight: 700 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue (ZAR)"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* KPI Side Cards */}
            <div className="flex flex-col gap-4">
              {/* Sell-Through Rate */}
              <Card className="border-gray-100 shadow-sm bg-white flex-1">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <Target className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sell-through Rate</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">
                      {businessData.sales_performance?.sell_through_rate}%
                    </p>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 border text-[9px] font-bold px-1.5 py-0.5">
                      Target 50%
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, businessData.sales_performance?.sell_through_rate || 0)}%` }}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">% of catalog that converts to sales</p>
                </CardContent>
              </Card>

              {/* Avg Days to Sell */}
              <Card className="border-gray-100 shadow-sm bg-white flex-1">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Days to Sell</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 tracking-tight mt-1">
                    {businessData.sales_performance?.avg_days_to_sell}<span className="text-lg text-gray-400 ml-1">days</span>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-2">From listing creation to sale completion</p>
                </CardContent>
              </Card>

              {/* Repeat Buyer Rate */}
              <Card className="border-gray-100 shadow-sm bg-white flex-1">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-pink-50 rounded-lg flex items-center justify-center">
                      <Repeat className="h-4 w-4 text-pink-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Repeat Buyers</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 tracking-tight mt-1">
                    {businessData.sales_performance?.repeat_buyer_rate}%
                  </p>
                  <p className="text-[10px] text-gray-400 mt-2">Buyers who purchased 2+ times</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FUNNEL + BEST CATEGORIES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel Conversion */}
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 text-base mb-5 flex items-center gap-2">
                  <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                    <Percent className="h-4 w-4 text-purple-600" />
                  </div>
                  Sales Funnel
                </h3>
                <div className="space-y-5">
                  {[
                    {
                      label: "Views",
                      sublabel: `${businessData.listing_performance?.views_per_listing || 0} avg per listing`,
                      rate: 100,
                      color: "from-indigo-500 to-indigo-400",
                      metric: `${businessData.listing_performance?.time_to_first_view_hours || 0}h to first view`,
                    },
                    {
                      label: "Chats Initiated",
                      sublabel: `${businessData.listing_performance?.view_to_chat_rate}% view-to-chat`,
                      rate: businessData.listing_performance?.view_to_chat_rate || 0,
                      color: "from-purple-500 to-purple-400",
                      metric: `${businessData.listing_performance?.time_to_first_chat_hours || 0}h to first chat`,
                    },
                    {
                      label: "Confirmed Sales",
                      sublabel: `${businessData.listing_performance?.chat_to_sale_rate}% chat-to-sale`,
                      rate: businessData.listing_performance?.chat_to_sale_rate || 0,
                      color: "from-emerald-500 to-emerald-400",
                      metric: "Completed purchases",
                    },
                  ].map((step, i) => (
                    <div key={step.label} className="relative">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-gray-100 rounded-full text-[9px] font-black flex items-center justify-center text-gray-500">{i + 1}</span>
                          <span className="font-bold text-gray-700">{step.label}</span>
                          <span className="text-[10px] text-gray-400">({step.sublabel})</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">{step.metric}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-xl overflow-hidden">
                        <div
                          style={{ width: `${Math.max(3, step.rate)}%` }}
                          className={`bg-gradient-to-r ${step.color} h-full rounded-xl transition-all duration-700`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Best Categories */}
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 text-base mb-5 flex items-center gap-2">
                  <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                  </div>
                  Best Categories
                </h3>
                {businessData.sales_performance?.best_categories?.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No category data yet</p>
                ) : (
                  <div className="min-h-[200px] h-52">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart
                        data={businessData.sales_performance?.best_categories}
                        layout="vertical"
                        margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="category"
                          tick={{ fontSize: 10, fill: "#6b7280" }}
                          axisLine={false}
                          tickLine={false}
                          width={100}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: "14px", border: "1px solid #e5e7eb", fontSize: "11px", padding: "8px 12px" }}
                        />
                        <Bar dataKey="sold_count" name="Sold" radius={[0, 6, 6, 0]}>
                          {(businessData.sales_performance?.best_categories || []).map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* DEAD STOCK + PEAK BUYING TIMES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dead Stock */}
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-600 uppercase tracking-widest">
                  <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </div>
                  Dead Stock Flags
                </h3>
                <p className="text-[10px] text-gray-400 leading-relaxed mb-4">
                  Listings with zero views. Consider repricing or improving photos.
                </p>
                {businessData.listing_performance?.zero_view_listings?.length === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                    <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xs text-emerald-700 font-semibold">
                      All items have registered traffic!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto">
                    {businessData.listing_performance?.zero_view_listings?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-xs hover:bg-red-50/50 transition-colors"
                      >
                        <span className="font-bold text-gray-900 truncate flex-1 mr-2">{item.title}</span>
                        <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg shrink-0 border border-red-100">
                          R{item.price}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Peak Buying Times */}
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 text-base mb-5 flex items-center gap-2">
                  <div className="w-7 h-7 bg-sky-50 rounded-lg flex items-center justify-center shrink-0">
                    <CalendarDays className="h-4 w-4 text-sky-600" />
                  </div>
                  Peak Buying Times
                </h3>
                {peakTimes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No purchase patterns yet</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {peakTimes.slice(0, 8).map((pt: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-600 w-20 shrink-0">{pt.label}</span>
                        <div className="flex-1 bg-gray-100 h-3 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.max(8, (pt.count / Math.max(1, peakTimes[0]?.count)) * 100)}%` }}
                            className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 w-8 text-right">{pt.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* FINANCIALS & MARKET COMPARISON */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Market Price Comparison */}
            <Card className="border-gray-100 shadow-sm bg-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 text-base mb-5 flex items-center gap-2">
                  <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                    <Layers className="h-4 w-4 text-indigo-600" />
                  </div>
                  Market Pricing Comparison
                </h3>
                {businessData.market_comparison?.price_comparison?.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    Add listings to check pricing competitiveness.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {businessData.market_comparison?.price_comparison?.map((comp: any) => (
                      <div key={comp.category} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="capitalize text-gray-700">{comp.category}</span>
                          <span className="text-gray-400">
                            Mine: <strong className="text-gray-700">R{comp.my_average_price}</strong> vs Market:{" "}
                            <strong className="text-gray-700">R{comp.market_average_price || 0}</strong>
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
                          <div
                            style={{
                              width: `${
                                (Number(comp.my_average_price) /
                                  Math.max(1, Number(comp.market_average_price) || 1)) *
                                50
                              }%`,
                            }}
                            className="bg-indigo-500 h-full rounded-l-full"
                          />
                          <div
                            style={{
                              width: `${
                                (Number(comp.market_average_price || 0) /
                                  Math.max(1, Number(comp.my_average_price) || 1)) *
                                50
                              }%`,
                            }}
                            className="bg-gray-300 h-full rounded-r-full"
                          />
                        </div>
                        <div className="flex gap-3 text-[9px] text-gray-400">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Your avg</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Market avg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Demand Signal */}
            <Card className="border-gray-100 shadow-sm bg-white bg-gradient-to-br from-amber-50/30 to-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2">
                  <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                    <Search className="h-4 w-4 text-amber-600" />
                  </div>
                  Demand Signals
                </h3>
                <p className="text-[10px] text-gray-400 leading-relaxed mb-4">
                  Items searched by buyers this week that you haven't listed yet.
                </p>
                {businessData.market_comparison?.focus_demand_signals?.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    No matching demand signals this week.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {businessData.market_comparison?.focus_demand_signals?.map((ds: any) => (
                      <div
                        key={ds.query}
                        className="flex items-start justify-between p-3 bg-white border border-amber-100 rounded-xl text-xs hover:border-amber-200 transition-all shadow-sm"
                      >
                        <div>
                          <p className="font-bold text-gray-800">"{ds.query}"</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {ds.query_count} searches this week
                          </p>
                        </div>
                        <Badge className="bg-amber-600 hover:bg-amber-700 text-white border-0 font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 text-[10px]">
                          List <ArrowRight className="h-3 w-3" />
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RESTOCK NUDGES */}
          {businessData.restock_nudges?.length > 0 && (
            <Card className="border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-white shadow-sm rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-bold text-indigo-900 text-base mb-4 flex items-center gap-2">
                  <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                  </div>
                  Seasonal Restock Nudges
                </h3>
                <div className="space-y-3">
                  {businessData.restock_nudges.map((nudge: any) => (
                    <div
                      key={nudge.title}
                      className="p-4 bg-white border border-indigo-100 rounded-xl flex items-center justify-between gap-4 hover:border-indigo-200 transition-colors"
                    >
                      <p className="text-sm font-medium text-indigo-950">{nudge.message}</p>
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
        /* FREE TIER UPSELL */
        <Card className="border border-dashed border-gray-300 bg-gray-50/50 p-10 text-center rounded-2xl relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-book-100 text-book-800 text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg flex items-center gap-1">
            <Lock className="h-3 w-3 text-book-700" /> Tier 1 Exclusive
          </div>
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-book-50 rounded-2xl flex items-center justify-center mx-auto border border-book-100 shadow-sm">
              <Trophy className="h-7 w-7 text-book-600" />
            </div>
            <h4 className="font-bold text-gray-900 text-lg">Unlock Business Analytics Suite</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Revenue trends, conversion funnels, demand signals, category performance, peak buying times, pricing comparisons, and restock nudges.
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
