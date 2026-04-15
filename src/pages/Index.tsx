import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Shirt, Backpack, Palette, Landmark, FlaskConical, Trophy, Sigma, CheckCircle, Leaf, ShieldCheck, Truck, ArrowRight, Building2, BarChart3, Zap, BadgeCheck, Percent } from "lucide-react";
import FeaturedBooks from "@/components/home/FeaturedBooks";
import HowItWorks from "@/components/home/HowItWorks";
import ReadyToGetStarted from "@/components/home/ReadyToGetStarted";
import EcosystemSection from "@/components/home/EcosystemSection";
import debugLogger from "@/utils/debugLogger";

const Index = () => {
  debugLogger.info("Index", "Index page mounted");

  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if this is actually a verification link that ended up on the homepage
  useEffect(() => {
    debugLogger.info("Index", "Checking search params for verification");
    const hasVerificationParams =
      searchParams.has("token") ||
      searchParams.has("token_hash") ||
      (searchParams.has("type") && searchParams.has("email"));

    if (hasVerificationParams) {
      debugLogger.info("Index", "Verification params detected, redirecting to verify page");
      // Preserve all search parameters and redirect to verify page
      navigate(`/verify?${searchParams.toString()}`, { replace: true });
      return;
    }
  }, [searchParams, navigate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      debugLogger.info("Index", "Search submitted", { query: searchQuery });
      navigate(`/books?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Import Shirt for Uniform, Backpack for supplies
  const categories = [
    { name: "Textbooks", icon: <BookOpen className="h-7 w-7 sm:h-10 sm:w-10 text-book-700" /> },
    { name: "Uniforms", icon: <Shirt className="h-7 w-7 sm:h-10 sm:w-10 text-book-700" /> },
    { name: "School Supplies", icon: <Backpack className="h-7 w-7 sm:h-10 sm:w-10 text-book-700" /> },
    { name: "Mathematics", icon: <Sigma className="h-7 w-7 sm:h-10 sm:w-10 text-book-700" /> },
    { name: "Science", icon: <FlaskConical className="h-7 w-7 sm:h-10 sm:w-10 text-book-700" /> },
    { name: "Sports & Equipment", icon: <Trophy className="h-7 w-7 sm:h-10 sm:w-10 text-book-700" /> },
    { name: "Arts & Craft", icon: <Palette className="h-7 w-7 sm:h-10 sm:w-10 text-book-700" /> },
    { name: "Economics", icon: <Landmark className="h-7 w-7 sm:h-10 sm:w-10 text-book-700" /> },
  ];

  return (
    <Layout>
      <SEO
        title="ReBooked Solutions - Buy & Sell School Items"
        description="South Africa's trusted platform for buying and selling school-related items. Find affordable textbooks, uniforms, sports equipment, and school supplies — all in one place."
        keywords="school items, school textbooks, school uniforms, school supplies, buy sell school, students, South Africa, ReBooked Solutions"
        url="https://www.rebookedsolutions.co.za/"
      />

      {/* Hero Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-book-100 to-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-12">
            {/* Copy */}
            <div className="order-1 text-center lg:text-left">
              <div className="inline-block rounded-full bg-book-200 text-book-800 text-xs sm:text-sm px-3 py-1 mb-4">
                Books. Uniforms. Everything In Between.
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                Buy Smart. Sell Easy. School Ready.
              </h1>
              <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8 max-w-xl mx-auto lg:mx-0">
                Textbooks, uniforms, sports equipment, stationery and more —
                buy affordable secondhand school items or sell what you no longer need,
                all handled securely through ReBooked Solutions.
              </p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4 sm:justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[190px] bg-book-600 hover:bg-book-700"
                  onClick={() => navigate("/textbooks")}
                >
                  Browse Listings
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto sm:min-w-[190px] border-book-600 text-book-700 hover:bg-book-100"
                  onClick={() => navigate("/create-listing")}
                >
                  Sell Your Items
                </Button>
              </div>
            </div>

            {/* Image */}
            <div className="order-2">
              <img
                src="/lovable-uploads/bd1bff70-5398-480d-ab05-1a01e839c2d0.png"
                alt="Three students smiling with textbooks"
                className="w-full rounded-xl shadow-lg object-cover aspect-[4/3]"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile-Optimized Search Section */}
      <section className="py-10 sm:py-14 bg-white border-b border-stone-200">
        <div className="container mx-auto px-4 max-w-3xl">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <input
                type="text"
                placeholder="Search for textbooks, uniforms, school supplies..."
                className="w-full px-5 py-3 sm:py-4 sm:pr-16 rounded-2xl sm:rounded-r-none border border-stone-300 focus:outline-none focus:ring-2 focus:ring-book-500 focus:border-transparent text-base bg-white transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="bg-book-600 text-white px-6 py-3 rounded-2xl sm:rounded-l-none sm:absolute sm:right-2 sm:top-[6px] hover:bg-book-700 transition duration-200 flex items-center justify-center gap-2 font-medium"
              >
                <Search className="h-5 w-5" />
                <span className="hidden sm:inline text-sm">Search</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Categories Section - Improved Layout */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-3">
              Shop by Category
            </h2>
            <p className="text-stone-600">Browse curated collections across all school essentials</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/listings`}
                className="group rounded-2xl border border-stone-200 p-4 sm:p-5 text-center hover:shadow-md hover:border-book-300 transition-all duration-200 bg-white hover:bg-stone-50"
              >
                <span className="mb-3 block flex items-center justify-center text-stone-700 group-hover:text-book-700 transition-colors">
                  {category.icon}
                </span>
                <h3 className="font-semibold text-stone-900 text-xs sm:text-sm leading-tight">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>
      {/* Why Choose ReBooked Section - Improved */}
      <section className="py-16 sm:py-24 bg-stone-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              Why Choose <span className="text-book-600">ReBooked Solutions?</span>
            </h2>
            <p className="text-base text-stone-600">
              We're building a sustainable ecosystem where South African students thrive — affordable access, secure transactions, and real support every step of the way.
            </p>
          </div>

          {/* Three Main Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Feature 1 */}
            <Card className="rounded-2xl border border-stone-200 bg-white hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-5">
                  <Leaf className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-3">Sustainable Learning</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Give items a second life. We reduce education's environmental impact while keeping school essentials affordable for everyone.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="rounded-2xl border border-stone-200 bg-white hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-5">
                  <ShieldCheck className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-3">Guaranteed Security</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Shop with complete confidence. Our BobPay integration ensures funds are only released when transactions complete successfully.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="rounded-2xl border border-stone-200 bg-white hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-5">
                  <Truck className="h-7 w-7 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-3">Smart Logistics</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Nationwide door-to-door and locker shipping via The Courier Guy and Pudo. Fast pickups and reliable tracking across South Africa.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trust & Safety Section */}
          <div className="rounded-3xl border border-stone-300 bg-white p-8 sm:p-12 shadow-sm">
            <h3 className="text-2xl font-bold text-stone-900 mb-8 text-center">
              Multi-Layered Protection
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-green-50 border border-green-200 p-5 text-center">
                <div className="inline-flex p-3 bg-green-100 rounded-lg mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-bold text-stone-900 text-sm mb-1">Buyer Protection</h4>
                <p className="text-stone-600 text-xs">Funds held secure until you confirm receipt</p>
              </div>

              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5 text-center">
                <div className="inline-flex p-3 bg-blue-100 rounded-lg mb-3">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-bold text-stone-900 text-sm mb-1">Verified Listings</h4>
                <p className="text-stone-600 text-xs">All reviewed for accuracy and authenticity</p>
              </div>

              <div className="rounded-2xl bg-purple-50 border border-purple-200 p-5 text-center">
                <div className="inline-flex p-3 bg-purple-100 rounded-lg mb-3">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-bold text-stone-900 text-sm mb-1">Human Support</h4>
                <p className="text-stone-600 text-xs">Dedicated team for dispute resolution</p>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-center">
                <div className="inline-flex p-3 bg-amber-100 rounded-lg mb-3">
                  <CheckCircle className="h-6 w-6 text-amber-600" />
                </div>
                <h4 className="font-bold text-stone-900 text-sm mb-1">Secure Payouts</h4>
                <p className="text-stone-600 text-xs">PCI-compliant payment via BobPay</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ReBooked Business Section - Nice & Simple */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <Badge className="mb-4 bg-book-100 text-book-700 hover:bg-book-200">For Businesses</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-3">
              ReBooked Business
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              Verified seller programme for registered South African businesses wanting to scale
            </p>
          </div>

          {/* 3 Simple Benefit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center hover:shadow-md transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-amber-100">
                  <Percent className="h-6 w-6 text-amber-700" />
                </div>
              </div>
              <h3 className="font-bold text-stone-900 mb-2">6.5% Commission</h3>
              <p className="text-sm text-stone-600">vs 10% for standard sellers — save 35% on fees</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center hover:shadow-md transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <Zap className="h-6 w-6 text-green-700" />
                </div>
              </div>
              <h3 className="font-bold text-stone-900 mb-2">Instant Listings</h3>
              <p className="text-sm text-stone-600">Auto-commit with zero waiting period</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center hover:shadow-md transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <BadgeCheck className="h-6 w-6 text-blue-700" />
                </div>
              </div>
              <h3 className="font-bold text-stone-900 mb-2">Verified Badge</h3>
              <p className="text-sm text-stone-600">Build buyer trust on every listing</p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button asChild size="lg" className="bg-book-600 hover:bg-book-700 rounded-lg">
              <Link to="/rebooked-business">
                Learn More
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Items Section */}
      <FeaturedBooks />

      {/* ReBooked Ecosystem Section */}
      <EcosystemSection />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Ready to Get Started Section */}
      <ReadyToGetStarted />
    </Layout>
  );
};

export default Index;
