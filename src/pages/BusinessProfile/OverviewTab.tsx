import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  CheckCircle,
  DollarSign,
  Eye,
  Percent,
  Sparkles,
  TrendingUp,
  Info,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
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

interface OverviewTabProps {
  activeStock: number;
  soldItems: number;
  totalEarnings: number;
  listingViews: number;
  walletBalance: number;
  commissionLabel: string;
  listings: any[];
  topViewedListings: any[];
  chartData: any[];
  loadingWallet: boolean;
  isTier1: boolean;
  handleRemoveDeal: (id: string) => Promise<void>;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  activeStock,
  soldItems,
  totalEarnings,
  listingViews,
  walletBalance,
  commissionLabel,
  listings,
  topViewedListings,
  chartData,
  loadingWallet,
  isTier1,
  handleRemoveDeal,
}) => {
  // Calculate conversion rate for Tier 1 badge
  const conversionRate = listingViews > 0 ? ((soldItems / listingViews) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6 animate-fadeIn">
      {isTier1 && (
        <Card className="border border-emerald-200 bg-emerald-50/40 shadow-none rounded-xl">
          <CardContent className="p-5 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Business Tier 1 Active</h4>
              <p className="text-xs text-gray-650 mt-0.5">
                {totalEarnings > 0 ? (
                  <>
                    You have saved <strong className="text-emerald-800 font-bold">R{Math.round(totalEarnings * 0.035).toLocaleString()}</strong> in commission fees compared to the standard 10% rate.
                  </>
                ) : (
                  <>Your 6.5% commission rate is active. Savings will appear here once you complete your first sale.</>
                )}
              </p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-250 font-bold text-xs px-2.5 py-1 rounded-lg">
              6.5% Rate
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Primary KPI Cards — 2x2 grid with gradient accent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Active Stock",
            value: activeStock.toLocaleString(),
            icon: Package,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            borderAccent: "border-l-blue-500",
            subtitle: `${listings.length} total listings`,
          },
          {
            label: "Items Sold",
            value: soldItems.toLocaleString(),
            icon: CheckCircle,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            borderAccent: "border-l-emerald-500",
            subtitle: `${conversionRate}% conversion rate`,
          },
          {
            label: "Total Earnings",
            value: `R${totalEarnings.toLocaleString()}`,
            icon: DollarSign,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
            borderAccent: "border-l-amber-500",
            subtitle: `After ${commissionLabel} commission`,
          },
          {
            label: "Store Views",
            value: listingViews.toLocaleString(),
            icon: Eye,
            iconBg: "bg-purple-50",
            iconColor: "text-purple-600",
            borderAccent: "border-l-purple-500",
            subtitle: listingViews > 0 ? `~${Math.round(listingViews / Math.max(1, listings.length))} per listing` : "No views yet",
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={`border border-gray-100 shadow-sm bg-white border-l-4 ${stat.borderAccent} hover:shadow-md transition-all duration-300 group`}
          >
            <CardContent className="p-5 flex flex-col justify-between h-full min-h-[120px]">
              <div className="flex justify-between items-start w-full">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.iconBg} group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="mt-auto">
                <p className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
                <p className="text-[10px] text-gray-400 font-medium mt-1">{stat.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Wallet + Commission Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border border-gray-100 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5 bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-white">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Wallet Balance</span>
              </div>
              {loadingWallet ? (
                <div className="animate-pulse h-9 bg-emerald-100 rounded-lg w-28" />
              ) : (
                <p className="text-3xl font-bold text-emerald-700 tracking-tight">R{walletBalance.toFixed(2)}</p>
              )}
              <p className="text-[10px] text-gray-400 mt-2 font-medium">Available to withdraw or spend</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5 bg-gradient-to-br from-book-50 via-book-50/30 to-white">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-book-100 flex items-center justify-center">
                  <Percent className="h-4 w-4 text-book-600" />
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Commission Rate</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{commissionLabel}</p>
              <p className="text-[10px] text-gray-400 mt-2 font-medium">
                {isTier1 ? "Tier 1 — You keep 93.5% of each sale" : "Business Free — You keep 90% of each sale"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Promos + Top Viewed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                <Percent className="h-4 w-4 text-red-500" />
              </div>
              Active Deals & Promos
            </h3>
            {listings.filter(b => !!b.original_price && b.original_price > b.price).length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400">No active deals.</p>
                <p className="text-[10px] text-gray-400 mt-1">Set a deal in the Deals & Upload tab.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {listings.filter(b => !!b.original_price && b.original_price > b.price).slice(0, 5).map((book) => (
                  <div key={book.id} className="flex items-center gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <img src={book.image_url || book.front_cover} alt={book.title} className="w-10 h-10 object-cover rounded-xl shrink-0 border border-gray-100" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-gray-900 truncate">{book.title}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-gray-400 line-through">R{book.original_price}</span>
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                        <span className="text-[10px] font-bold text-red-600">R{book.price}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] bg-red-50 text-red-700 px-2 py-0.5 rounded-lg font-bold border border-red-100">
                        {Math.round((1 - book.price / book.original_price) * 100)}% OFF
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDeal(book.id)}
                        className="text-red-500 hover:bg-red-50 hover:text-red-700 text-[10px] font-bold px-2 py-1 h-auto rounded-xl"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm">
              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>
              Top Viewed Listings
            </h3>
            {topViewedListings.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400">No views registered yet.</p>
                <p className="text-[10px] text-gray-400 mt-1">Share your listings to start getting traffic.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topViewedListings.map((book, idx) => (
                  <div key={book.id} className="flex items-center gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div className="relative">
                      <img src={book.image_url || book.front_cover} alt={book.title} className="w-10 h-10 object-cover rounded-xl shrink-0 border border-gray-100" />
                      {idx < 3 && (
                        <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-book-600 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-sm">
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-gray-900 truncate">{book.title}</h4>
                      <p className="text-[10px] text-gray-400 truncate">{book.author || "School supply"}</p>
                    </div>
                    <span className="font-bold text-xs text-book-700 bg-book-50 px-2.5 py-1 rounded-xl flex items-center gap-1 shrink-0 border border-book-100">
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
      <Card className="border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
              <div className="w-7 h-7 bg-book-50 rounded-lg flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-book-600" />
              </div>
              Sales & Demand Performance
            </h3>
            {chartData.length > 0 && (
              <Badge variant="outline" className="text-[10px] font-semibold text-gray-500 border-gray-200">
                Last 6 Months
              </Badge>
            )}
          </div>
          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                <Info className="h-7 w-7 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No active listings to analyze</p>
              <p className="text-xs text-gray-400 mt-1">Upload items to view sales trends.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="min-h-[208px] h-52">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', fontSize: '12px', padding: '10px 14px' }}
                      labelStyle={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="views" name="Views" stroke="#7c3aed" strokeWidth={2.5} fill="url(#colorViews)" />
                    <Area type="monotone" dataKey="sold" name="Sold" stroke="#10b981" strokeWidth={2.5} fill="url(#colorSold)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-5 px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-[10px] text-gray-500 font-medium">Views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-gray-500 font-medium">Sold</span>
                </div>
                <span className="text-[10px] text-gray-400 ml-auto">Based on real listing data</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
