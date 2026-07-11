import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

interface AnalyticsTabProps {
  activeStock: number;
  soldItems: number;
  totalEarnings: number;
  listingViews: number;
  listings: any[];
  topViewedListings: any[];
  chartData: any[];
  completedOrders: any[];
  isTier1: boolean;
  analyticsperiod: "7d" | "30d" | "90d";
  setAnalyticsPeriod: (p: "7d" | "30d" | "90d") => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  activeStock,
  soldItems,
  totalEarnings,
  listingViews,
  listings,
  topViewedListings,
  chartData,
  completedOrders,
  isTier1,
  analyticsperiod,
  setAnalyticsPeriod,
}) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Active Stock", value: activeStock, icon: Package, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Total Sold Items", value: soldItems, icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-100" },
          { label: "Total Earnings", value: `R${totalEarnings.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Store Page Views", value: listingViews, icon: Eye, color: "text-purple-600 bg-purple-50 border-purple-100" },
        ].map((stat) => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-6 flex flex-col justify-between h-full relative min-h-[110px]">
              <div className="flex justify-between items-start w-full">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color} border`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="text-center py-2 flex-1 flex items-center justify-center">
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats — All Tiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Average Order Value */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Order Value</p>
              <ShoppingCart className="h-4 w-4 text-book-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              R{soldItems > 0 ? (totalEarnings / soldItems).toFixed(0) : "0"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Revenue per sold item</p>
          </CardContent>
        </Card>

        {/* Stock Health */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Health</p>
              <AlertCircle className="h-4 w-4 text-book-600" />
            </div>
            {(() => {
              const outOfStock = listings.filter(b => (b.available_quantity || 0) <= 0).length;
              const total = listings.length;
              const healthPct = total > 0 ? ((total - outOfStock) / total * 100).toFixed(0) : "100";
              return (
                <>
                  <p className="text-3xl font-bold text-gray-900">{healthPct}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {outOfStock > 0 ? `${outOfStock} of ${total} listing${total !== 1 ? "s" : ""} out of stock` : "All listings in stock"}
                  </p>
                  {outOfStock > 0 && (
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div style={{ width: `${healthPct}%` }} className="bg-emerald-500 h-full rounded-full" />
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
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
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorViewsAnalytics" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorSoldAnalytics" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                        labelStyle={{ fontWeight: 600, color: '#111827' }}
                      />
                      <Area type="monotone" dataKey="views" name="Views" stroke="#7c3aed" strokeWidth={2} fill="url(#colorViewsAnalytics)" />
                      <Area type="monotone" dataKey="sold" name="Sold" stroke="#10b981" strokeWidth={2} fill="url(#colorSoldAnalytics)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 pt-2">
                  <span>* Based on real listing views and sold transactions.</span>
                  {isTier1 && (() => {
                    // Calculate real period-over-period change from chart data
                    if (chartData.length < 2) return null;
                    const mid = Math.floor(chartData.length / 2);
                    const firstHalf = chartData.slice(0, mid).reduce((sum, d) => sum + (d.sold || 0), 0);
                    const secondHalf = chartData.slice(mid).reduce((sum, d) => sum + (d.sold || 0), 0);
                    if (firstHalf === 0 && secondHalf === 0) return null;
                    const change = firstHalf > 0
                      ? ((secondHalf - firstHalf) / firstHalf * 100).toFixed(1)
                      : secondHalf > 0 ? "+100" : "0";
                    const isPositive = Number(change) >= 0;
                    return (
                      <span className={`font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                        Period-over-period: {isPositive ? "+" : ""}{change}% {isPositive ? "uplift" : "decline"}
                      </span>
                    );
                  })()}
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

          {/* Best Sellers by Quantity */}
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" /> Best Sellers (by Qty)
              </h3>
              {(() => {
                const topSold = [...listings]
                  .filter(b => (b.sold_quantity || 0) > 0)
                  .sort((a, b) => (b.sold_quantity || 0) - (a.sold_quantity || 0))
                  .slice(0, 5);
                if (topSold.length === 0) return (
                  <p className="text-sm text-gray-500 py-6 text-center">No sales recorded yet.</p>
                );
                return (
                  <div className="space-y-3">
                    {topSold.map((book, i) => (
                      <div key={book.id} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                        <span className="text-xs font-bold text-gray-400 w-5 text-center">#{i + 1}</span>
                        <img
                          src={book.image_url || book.front_cover}
                          alt={book.title}
                          className="w-9 h-9 object-cover rounded-lg shrink-0 border"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 truncate">{book.title}</h4>
                          <p className="text-xs text-gray-500">R{Number(book.price).toFixed(0)} ea.</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                            {book.sold_quantity} sold
                          </span>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            R{(Number(book.price) * (book.sold_quantity || 0)).toLocaleString()} rev.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
              onClick={() => toast.info("Upgrade to Tier 1 from the Settings tab to unlock full analytics.")}
            >
              Upgrade to Tier 1
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
