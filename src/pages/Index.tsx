import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Shirt, Backpack, Palette, Landmark, FlaskConical, Trophy, Sigma, CheckCircle, Leaf, ShieldCheck, Truck } from "lucide-react";
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
      <section className="py-8 sm:py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-900">
            Find What You Need
          </h2>
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto relative">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <input
                type="text"
                placeholder="Search for textbooks, uniforms, school supplies..."
                className="w-full p-3 sm:p-4 sm:pr-16 rounded-lg sm:rounded-r-none border border-gray-300 focus:outline-none focus:ring-2 focus:ring-book-500 focus:border-transparent text-base sm:text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="bg-book-600 text-white p-3 sm:p-2 rounded-lg sm:rounded-l-none sm:absolute sm:right-2 sm:top-2 hover:bg-book-700 transition duration-200 flex items-center justify-center"
              >
                <Search className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-2" />
                <span className="sm:hidden">Search</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-8 sm:mb-12 text-gray-900">
            Browse All Listings
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 sm:gap-6 max-w-7xl mx-auto">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/books?category=${encodeURIComponent(category.name)}`}
                className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 text-center hover:shadow-lg transition-shadow"
              >
                <span className="mb-2 sm:mb-4 block flex items-center justify-center">
                  {category.icon}
                </span>
                <h3 className="font-semibold text-gray-900 text-xs sm:text-base leading-tight">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>


      {/* Why Choose ReBooked Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why <span className="text-book-600">ReBooked Solutions?</span>
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              We're building more than just a marketplace; we're creating a sustainable ecosystem for South African students to thrive.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
            {/* Feature 1 */}
            <div className="p-8 rounded-lg bg-white border border-gray-200 transition-shadow hover:shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Leaf className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Sustainable Learning</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Give your items a second life. We help reduce the environmental impact of education while making school essentials affordable for everyone.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-lg bg-white border border-gray-200 transition-shadow hover:shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Guaranteed Security</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Shop with confidence. Our BobPay integration ensures your funds are only released when the transaction is successfully completed.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-lg bg-white border border-gray-200 transition-shadow hover:shadow-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Truck className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Smart Logistics</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Nationwide door-to-door and locker shipping powered by The Courier Guy and Pudo. Reliable tracking and fast pickups for sellers across South Africa.
              </p>
            </div>
          </div>

          {/* Trust & Safety Section */}
          <div className="bg-book-50 rounded-lg p-8 sm:p-12 border border-book-200">
            <div className="flex flex-col lg:flex-row items-center gap-10">
              <div className="lg:w-1/2 text-center lg:text-left">
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  Your Security is Our Priority
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  We've built a multi-layered protection system to ensure every transaction on ReBooked is safe, transparent, and fair for both students and parents.
                </p>
              </div>

              <div className="lg:w-1/2 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-start gap-3">
                  <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Buyer Protection</h4>
                    <p className="text-gray-500 text-xs mt-1">Funds are held securely until you confirm receipt.</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Verified Listings</h4>
                    <p className="text-gray-500 text-xs mt-1">All listings are reviewed to ensure accuracy and authenticity.</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-start gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Human Support</h4>
                    <p className="text-gray-500 text-xs mt-1">Dedicated support team for dispute resolution.</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-start gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Secure Payouts</h4>
                    <p className="text-gray-500 text-xs mt-1">PCI-compliant payment processing via BobPay.</p>
                  </div>
                </div>
              </div>
            </div>
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
