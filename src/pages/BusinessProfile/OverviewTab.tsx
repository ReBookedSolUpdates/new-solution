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
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Commission Saved running tracker at top */}
      {isTier1 && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-600" />
            <p className="font-semibold">
              Thank you for partnering! You have saved <strong>R{Math.round(totalEarnings * 0.035)}</strong> this month on ReBooked Solutions.
            </p>
          </div>
          <Badge className="bg-emerald-600 border-0 hover:bg-emerald-700 text-white font-bold px-3 py-1">
            6.5% Commission
          </Badge>
        </div>
      )}

      {/* Key Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Stock", value: activeStock, icon: Package, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Total Sold", value: soldItems, icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-100" },
          { label: "Total Earnings", value: `R${totalEarnings.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Store Views", value: listingViews, icon: Eye, color: "text-purple-600 bg-purple-50 border-purple-100" },
        ].map((stat) => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-5 flex flex-col justify-between h-full relative min-h-[110px]">
              <div className="flex justify-between items-start w-full">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stat.color} border`}>
                  <stat.icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="text-center py-2 flex-1 flex items-center justify-center">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
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
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                        {Math.round((1 - book.price / book.original_price) * 100)}% OFF
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDeal(book.id)}
                        className="text-red-650 hover:bg-red-50 hover:text-red-700 text-[10px] font-bold px-2 py-1 h-auto rounded-xl"
                      >
                        Remove Promo
                      </Button>
                    </div>
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
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="views" name="Views" stroke="#7c3aed" strokeWidth={2} fill="url(#colorViews)" />
                    <Area type="monotone" dataKey="sold" name="Sold" stroke="#10b981" strokeWidth={2} fill="url(#colorSold)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-400">* Based on real listing views and sold transactions.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
