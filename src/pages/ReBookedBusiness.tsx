import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle,
  Percent,
  Package,
  MessageSquare,
  UploadCloud,
  Shield,
  TrendingUp,
  MapPin,
  Instagram,
  Clock,
  Truck,
  DollarSign,
  BarChart3,
} from "lucide-react";

const ReBookedBusinessPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeemCode = async () => {
    if (!user) {
      toast.error("Please sign in first to redeem a code.");
      navigate("/auth");
      return;
    }
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
      navigate("/business-profile");
    } catch (err: any) {
      toast.error(err.message || "Failed to redeem code");
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="ReBooked Business | ReBooked Solutions"
        description="ReBooked Business — bulk listing tools, lower commission rates, and a verified storefront for school supply distributors."
      />

      <div className="container mx-auto px-4 py-10 max-w-6xl">
        {/* Header */}
        <div className="mb-10 text-center flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-book-50 border border-book-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-book-600" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900">ReBooked Business</h1>
              <p className="text-sm text-gray-500">Partner programme for professional sellers</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto text-center">
            ReBooked Business is a programme for schools, bookshops, distributors, and professional sellers who want to manage large inventories, run promotions, and sell at scale on ReBooked Solutions. Business accounts get access to tools that aren't available to standard sellers.
          </p>
        </div>

        {/* What's included — full width 3-col grid */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-4">What's included</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: UploadCloud,
                title: "Bulk uploads",
                desc: "Add hundreds of listings in one go. Use the inline manual grid editor or import a CSV spreadsheet with all your stock details.",
              },
              {
                icon: Percent,
                title: "Deals & promotions",
                desc: "Run percentage-off or fixed-rand discount campaigns on individual items or entire categories like Textbooks, Uniforms, or Stationery.",
              },
              {
                icon: MessageSquare,
                title: "Built-in chat",
                desc: "A dedicated Chats tab in your dashboard lets you reply to buyer enquiries without leaving the page.",
              },
              {
                icon: BadgeCheck,
                title: "Verified Partner badge",
                desc: "Complete 5 orders as a seller and your public storefront card displays a verified checkmark and 'Verified Business Partner' label.",
              },
              {
                icon: Package,
                title: "Inventory management",
                desc: "See all your listings in one table. Track available stock, sold quantities, active deals, and edit or remove items inline.",
              },
              {
                icon: Building2,
                title: "Public storefront card",
                desc: "Customise your business display name and Instagram handle. Choose whether your address and phone number are visible to buyers.",
              },
              {
                icon: BarChart3,
                title: "Analytics dashboard",
                desc: "View total earnings, page views, sold item counts, and your top-performing listings in a dedicated analytics tab.",
              },
              {
                icon: DollarSign,
                title: "Dedicated payouts tab",
                desc: "Manage your banking details, wallet balance, and payout requests from a separate Payouts & Funds section in the dashboard.",
              },
              {
                icon: MapPin,
                title: "Address management",
                desc: "Set your pickup and delivery addresses directly inside the business settings. Changes apply to all your listings automatically.",
              },
            ].map((item, i) => (
              <Card key={i} className="border border-gray-200">
                <CardContent className="p-4 flex gap-3">
                  <div className="w-9 h-9 rounded-lg bg-book-50 border border-book-100 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-book-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator className="mb-12" />

        {/* Commission rates + Badge requirement — side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Commission rates */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Commission rates</h2>
            <Card className="border border-gray-200 h-full">
              <CardContent className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  All ReBooked Business accounts pay a flat <strong>10% platform fee</strong> (Business Free). Upgrade to <strong>Business Tier 1 (R79/month)</strong> for a reduced <strong>6.5% fee</strong> and access to premium features.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-100">
                    <p className="text-2xl font-bold text-gray-900">10%</p>
                    <p className="text-xs text-gray-500 mt-0.5">Business Free</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                    <p className="text-2xl font-bold text-emerald-700">6.5%</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Business Tier 1 (R79/mo)</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1.5">
                  <p className="flex gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                    No setup, membership, or upload fees. Commission is only on completed sales.
                  </p>
                  <p className="flex gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                    Tier 1 commission applies from your very first sale — no minimums required.
                  </p>
                  <p className="flex gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                    Individual sellers are on a separate standard rate and are unaffected by Business tiers.
                  </p>
                </div>

                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <p className="text-xs text-emerald-800">
                    <strong>Example:</strong> A R300 textbook sale at Tier 1 (6.5%) means you receive R280.50 — 3.5% more than the Free plan.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column — badge + how it works */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Verified Business badge</h2>
              <Card className="border border-gray-200">
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm text-gray-600">
                    The <strong>Verified ReBooked Business</strong> badge is granted to your account after a manual review by the ReBooked team. It signals to buyers that you are a trusted, professional supplier.
                  </p>
                  <p className="text-sm text-gray-600">
                    Tier 1 subscribers display a prominent <strong>Business Tier 1</strong> badge on their public store card, with full contact info visible to buyers.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                    <BadgeCheck className="h-4 w-4 shrink-0" />
                    <span className="font-semibold">Verified ReBooked Business — Tier 1</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">How delivery works</h2>
              <Card className="border border-gray-200">
                <CardContent className="p-5 text-sm text-gray-600 space-y-2">
                  <p>Business accounts use the same delivery system as all ReBooked sellers:</p>
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <p className="flex gap-2">
                      <Truck className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                      Courier pickup is arranged after you confirm (commit) each order.
                    </p>
                    <p className="flex gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                      You can also offer in-person pickup if you and the buyer are local.
                    </p>
                    <p className="flex gap-2">
                      <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                      Orders that aren't confirmed within the time window expire automatically.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Separator className="mb-12" />

        {/* How to join */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">How to join</h2>
            <Card className="border border-gray-200 h-full">
              <CardContent className="p-5 text-sm text-gray-600 space-y-3">
                <p>Business accounts are granted by the ReBooked team. If you're a school, bookshop, or distributor looking to sell on the platform:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
                  <li>Create a standard ReBooked account and verify your email.</li>
                  <li>Go to the <strong>Contact Us</strong> page and request business access. Include your business name and what you sell.</li>
                  <li>Our team reviews your application — this usually takes 1–2 business days.</li>
                  <li>Once approved, your account is upgraded and you can access the full business dashboard.</li>
                </ol>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Frequently asked questions</h2>
            <Card className="border border-gray-200 h-full">
              <CardContent className="p-5 text-sm text-gray-600 space-y-4">
                <div>
                  <p className="font-semibold text-gray-900">Can I still list items individually?</p>
                  <p className="text-xs text-gray-500 mt-0.5">Yes. The "List Individual Item" button inside the Bulk Upload tab takes you to the same listing form standard sellers use.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">What happens if I drop below 30 listings?</p>
                  <p className="text-xs text-gray-500 mt-0.5">Your commission rate reverts to 10% until you list enough items again. The change is automatic.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Is there a cost to join?</p>
                  <p className="text-xs text-gray-500 mt-0.5">No. There are no fees for the business programme. We only take commission on completed sales.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Can I run a deal and change it later?</p>
                  <p className="text-xs text-gray-500 mt-0.5">Yes. You can apply, modify, or remove promotions at any time from the Deals & Stock tab.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Redeem Code Section */}
        {user && (!profile?.isBusiness || (profile as any)?.subscription_tier !== "tier_1") && (
          <div className="mb-12 max-w-md mx-auto text-center">
            <Card className="border border-emerald-250 bg-emerald-50/20 rounded-2xl shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-gray-900 text-sm flex items-center justify-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-emerald-600" /> Have a Partner Promo Code?
                </h3>
                <p className="text-xs text-gray-500">
                  Enter your promo code (e.g. "supabase") below to immediately unlock Tier 1 Business benefits.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    className="flex-1 px-3.5 py-1.5 border rounded-xl text-sm focus:ring-2 focus:ring-book-500 outline-none border-gray-200 uppercase tracking-wider text-center"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={handleRedeemCode}
                    disabled={isRedeeming || !redeemCode.trim()}
                    className="bg-book-600 hover:bg-book-700 text-white text-xs px-4 rounded-xl font-semibold"
                  >
                    {isRedeeming ? "Redeeming..." : "Redeem"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CTA */}
        <div className="text-center py-4">
          {profile?.isBusiness ? (
            <Button
              onClick={() => navigate("/business-profile")}
              className="bg-book-600 hover:bg-book-700 text-white font-semibold h-10 px-6 rounded-xl"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : user ? (
            <Button
              onClick={() => navigate("/contact-us")}
              className="bg-book-600 hover:bg-book-700 text-white font-semibold h-10 px-6 rounded-xl"
            >
              Apply for Business Access
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/auth")}
              className="bg-book-600 hover:bg-book-700 text-white font-semibold h-10 px-6 rounded-xl"
            >
              Sign Up to Get Started
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ReBookedBusinessPage;
