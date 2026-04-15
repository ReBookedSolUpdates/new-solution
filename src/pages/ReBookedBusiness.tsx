import React from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Layers,
  MapPin,
  Percent,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

const ReBookedBusinessPage = () => {
  return (
    <Layout>
      <SEO
        title="ReBooked Business | Verified Seller Programme | ReBooked Solutions"
        description="Join ReBooked Business, our verified seller tier for South African schools and retailers. Lower commissions, auto-commit, buyer badges, and store-level deals."
        keywords="rebooked business, verified seller, south africa, textbooks, uniforms, school supplies, commission, small business"
        url="https://www.rebookedsolutions.co.za/rebooked-business"
      />

      {/* Simple Hero */}
      <div className="bg-white border-b border-stone-200">
        <div className="container mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-book-100 text-book-700 hover:bg-book-200">Seller Programme</Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 mb-4">
              ReBooked Business
            </h1>
            <p className="text-lg text-stone-600 mb-6">
              Verified seller programme for registered South African businesses. Get lower commissions, instant listings, and build your presence on ReBooked.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-book-600 hover:bg-book-700">
                <Link to="/contact-us">
                  Apply Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/listings">Browse Marketplace</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-16">
        {/* Who Qualifies */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-10">Who Can Apply</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-stone-100">
                  <FileText className="h-5 w-5 text-book-700" />
                </div>
                <h3 className="font-semibold text-stone-900">CIPC Registered</h3>
              </div>
              <p className="text-sm text-stone-600">Your business must be registered with South Africa's Companies and Intellectual Property Commission.</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-stone-100">
                  <CreditCard className="h-5 w-5 text-book-700" />
                </div>
                <h3 className="font-semibold text-stone-900">Bank Verified</h3>
              </div>
              <p className="text-sm text-stone-600">Provide a bank letter confirming your business name matches your Paystack payout account.</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-stone-100">
                  <Shield className="h-5 w-5 text-book-700" />
                </div>
                <h3 className="font-semibold text-stone-900">Manual Review</h3>
              </div>
              <p className="text-sm text-stone-600">Our team verifies your documents within 3-5 business days and activates your verified status.</p>
            </div>
          </div>
        </div>

        {/* Core Benefits */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-10">What You Get</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <Percent className="h-5 w-5 text-book-700" />
                <h3 className="font-semibold text-stone-900">Lower Commission</h3>
              </div>
              <p className="text-sm text-stone-600 mb-3">Pay 6.5% instead of 10% — that's a 35% reduction in fees. At scale, this means thousands saved monthly.</p>
              <p className="text-xs text-stone-500">Save 150 Rand per 1,000 Rand sale</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="h-5 w-5 text-book-700" />
                <h3 className="font-semibold text-stone-900">Instant Auto-Commit</h3>
              </div>
              <p className="text-sm text-stone-600 mb-3">Listings commit automatically when purchased. No 48-hour waiting window, no manual confirmation.</p>
              <p className="text-xs text-stone-500">Buyers get instant certainty</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <BadgeCheck className="h-5 w-5 text-book-700" />
                <h3 className="font-semibold text-stone-900">Verified Badge</h3>
              </div>
              <p className="text-sm text-stone-600 mb-3">Your verified badge appears on your profile, every listing, and your store page.</p>
              <p className="text-xs text-stone-500">Builds buyer trust instantly</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <Layers className="h-5 w-5 text-book-700" />
                <h3 className="font-semibold text-stone-900">Store-Level Deals</h3>
              </div>
              <p className="text-sm text-stone-600 mb-3">Run discounts across your entire store (e.g., 15% off). Perfect for bulk moves and seasonal sales.</p>
              <p className="text-xs text-stone-500">Boost sales with one action</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="h-5 w-5 text-book-700" />
                <h3 className="font-semibold text-stone-900">Your Store Page</h3>
              </div>
              <p className="text-sm text-stone-600 mb-3">Get a custom URL (rebookedsolutions.co.za/store/your-name) with smart proximity-based ordering.</p>
              <p className="text-xs text-stone-500">One-stop shop for buyers</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="h-5 w-5 text-book-700" />
                <h3 className="font-semibold text-stone-900">Proximity Sorting</h3>
              </div>
              <p className="text-sm text-stone-600 mb-3">Your listings auto-reorder by location proximity on your store page, always showing what's closest first.</p>
              <p className="text-xs text-stone-500">Higher relevance = higher conversions</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-10">How to Get Verified</h2>

          <div className="space-y-3">
            {[
              { num: 1, title: "Prepare Documents", desc: "Gather your CIPC certificate and bank letter confirming your business details match your Paystack account." },
              { num: 2, title: "Submit Application", desc: "Contact us through the form or email us directly with your documents and business information." },
              { num: 3, title: "Manual Verification", desc: "Our team reviews your CIPC and bank documents within 3–5 business days." },
              { num: 4, title: "Approved & Live", desc: "Once verified, we activate your account. Your verified badge, lower commission, and auto-commit activate immediately." },
            ].map((step) => (
              <div key={step.num} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-book-700 text-white text-sm font-semibold">
                    {step.num}
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-stone-900">{step.title}</h3>
                  <p className="text-sm text-stone-600 mt-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-10">Questions?</h2>

          <div className="space-y-4">
            {[
              { q: "Do I need to be registered?", a: "Yes. ReBooked Business is exclusively for CIPC-registered South African businesses. Standard sellers can still use ReBooked as regular users." },
              { q: "What happens to my existing listings?", a: "All your existing and future listings automatically enjoy 6.5% commissions, instant auto-commit, and your verified badge." },
              { q: "How long does verification take?", a: "Our team manually reviews applications within 3-5 business days and confirms your business registration." },
              { q: "Can I run multiple deals?", a: "Yes. You can run as many concurrent promotions as you want with different percentages and date ranges." },
              { q: "What if I'm declined?", a: "We'll email you with feedback. Common reasons include document mismatches. You can reapply once issues are resolved." },
              { q: "How is my store URL set?", a: "Your store URL is based on your verified business name and finalized during approval." },
            ].map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-stone-200 bg-white p-6">
                <h3 className="font-semibold text-stone-900 mb-2">{item.q}</h3>
                <p className="text-sm text-stone-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center">
          <h2 className="text-3xl font-bold text-stone-900 mb-3">Ready to Grow Your Business?</h2>
          <p className="text-stone-600 mb-6 max-w-2xl mx-auto">
            Join ReBooked Business and start selling with lower commissions, instant listings, and the trust that comes with a verified badge.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-book-600 hover:bg-book-700">
              <Link to="/contact-us">
                Start Application
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/listings">Browse Marketplace</Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReBookedBusinessPage;
