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

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-book-50 via-white to-book-100">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute top-10 -left-20 w-72 h-72 bg-book-200 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -right-20 w-96 h-96 bg-book-300/40 rounded-full blur-3xl" />
        </div>

        <div className="container relative mx-auto max-w-5xl px-4 py-20 sm:py-28 text-center">
          <Badge className="mb-6 inline-flex items-center gap-2 bg-book-600 text-white hover:bg-book-700 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4" />
            Coming Soon
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            ReBooked <span className="text-book-600">Business</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            A dedicated programme for verified schools, bookstores, uniform shops and bulk sellers across South Africa — launching soon.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="bg-book-600 hover:bg-book-700 text-white rounded-full px-8"
            >
              <Link to="/contact-us">
                Join the Waitlist
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full px-8 border-book-300 text-book-700 hover:bg-book-50"
            >
              <Link to="/">Back to Home</Link>
            </Button>
          </div>

          <div className="mt-10 inline-flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            Estimated launch: <span className="font-semibold text-book-700">Q3 2026</span>
          </div>
        </div>
      </section>

      {/* ─── What's Coming ─── */}
      <section className="py-16 sm:py-20 bg-white border-y border-gray-100">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <Badge className="mb-3 bg-book-100 text-book-700 hover:bg-book-200 border border-book-200">What to expect</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Built for serious sellers
            </h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
              ReBooked Business gives verified businesses the tools to scale on the platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Percent, title: "Lower Commissions", desc: "Reduced platform fees for verified business sellers moving volume." },
              { icon: BadgeCheck, title: "Verified Badge", desc: "A trust badge on every listing — buyers know who they're dealing with." },
              { icon: Zap, title: "Bulk Listing Tools", desc: "Upload hundreds of items at once with CSV import and inventory sync." },
              { icon: Truck, title: "Priority Logistics", desc: "Discounted shipping rates and same-day pickup with our partners." },
              { icon: Users, title: "Store Pages", desc: "Your own branded storefront with all your active listings in one place." },
              { icon: Shield, title: "Dedicated Support", desc: "A direct line to our team — onboarding help, escalations, and account management." },
            ].map(({ icon: Icon, title, desc }) => (
              <Card
                key={title}
                className="border border-gray-200 hover:border-book-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div className="w-11 h-11 rounded-lg bg-book-100 text-book-600 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Who it's for ─── */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              { icon: Building2, label: "Schools & Tuck Shops" },
              { icon: BadgeCheck, label: "Uniform Retailers" },
              { icon: Sparkles, label: "Stationery & Book Stores" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-2xl bg-white border border-gray-200 p-6 flex items-center gap-4 hover:border-book-300 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-book-600 text-white flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-gray-900">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 bg-book-700">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Want early access?
          </h2>
          <p className="text-book-100 mb-8 leading-relaxed">
            Get in touch and we'll add you to the early-access list — first invitations go out before the public launch.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-book-700 hover:bg-book-50 rounded-full px-8"
          >
            <Link to="/contact-us">
              Contact Sales
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default ReBookedBusinessPage;
