import React from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
const ReBookedBusinessPage = () => {
  return (
    <Layout>
      <SEO
        title="ReBooked Business — Coming Soon | ReBooked Solutions"
        description="ReBooked Business — the verified seller programme for South African schools, retailers, and bulk sellers. Coming soon."
        keywords="rebooked business, verified seller, south africa, textbooks, uniforms, bulk seller, school marketplace"
        url="https://www.rebookedsolutions.co.za/rebooked-business"
      />

      <div className="bg-white border-b border-gray-100 py-12 text-center">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-1.5 text-book-700 bg-book-50 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Coming Soon
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-black leading-tight">
              ReBooked <span className="text-book-600">Business</span>
            </h1>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              A dedicated programme for verified schools, bookstores, uniform shops and bulk sellers across South Africa — launching soon.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
              <Button asChild size="default" className="bg-book-600 hover:bg-book-700 text-white rounded-full px-6 font-semibold">
                <Link to="/contact-us">Join the Waitlist</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-3">About the Programme</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                ReBooked Business is a dedicated program engineered for bulk sellers, educational institutions, uniform suppliers, and certified retailers. It is designed to help you streamline distribution, manage high-volume listings, and build instant trust with buyers across South Africa.
              </p>
            </div>

            {/* What to expect */}
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900">What to Expect</h2>
                <p className="text-gray-500 text-xs">Features built specifically for serious high-volume sellers.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: Percent, title: "Lower Commissions", desc: "Reduced platform fees for verified business sellers moving volume." },
                  { icon: BadgeCheck, title: "Verified Badge", desc: "A trust badge on every listing — buyers know who they're dealing with." },
                  { icon: Zap, title: "Bulk Listing Tools", desc: "Upload hundreds of items at once with CSV import and inventory sync." },
                  { icon: Truck, title: "Priority Logistics", desc: "Discounted shipping rates and same-day pickup with our partners." },
                  { icon: Users, title: "Store Pages", desc: "Your own branded storefront with all your active listings in one place." },
                  { icon: Shield, title: "Dedicated Support", desc: "A direct line to our team — onboarding help, escalations, and account management." },
                ].map(({ icon: Icon, title, desc }) => (
                  <Card key={title} className="border border-gray-200/80 hover:border-book-300 transition-colors shadow-sm text-left">
                    <CardContent className="p-5 text-left">
                      <div className="w-9 h-9 rounded-lg bg-book-100 text-book-600 flex items-center justify-center mb-3">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1 text-left">{title}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed text-left">{desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column / Sidebar */}
          <div className="space-y-6">
            {/* Waitlist Card */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-book-600" />
                <h3 className="font-bold text-gray-900 text-sm">Waitlist Status</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Launch is estimated for <span className="font-semibold text-book-700">Q3 2026</span>. Early invitations will go out to verified waitlist partners before public release.
              </p>
              <Button asChild className="w-full bg-book-600 hover:bg-book-700 text-white rounded-lg">
                <Link to="/contact-us">Request Early Access</Link>
              </Button>
            </div>

            {/* Who is it for */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-sm">Target Partners</h3>
              <div className="space-y-3">
                {[
                  { icon: Building2, label: "Schools & Tuck Shops" },
                  { icon: BadgeCheck, label: "Uniform Retailers" },
                  { icon: Sparkles, label: "Stationery & Book Stores" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 p-2 border border-gray-100 rounded-xl bg-gray-50/50">
                    <div className="w-8 h-8 rounded-lg bg-book-600 text-white flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="font-bold text-xs text-gray-900">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReBookedBusinessPage;
