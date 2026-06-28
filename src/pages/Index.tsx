import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import {
  BookOpen, Shirt, Backpack, Palette, Landmark, FlaskConical, Trophy, Sigma,
  Leaf, ShieldCheck, Truck, ArrowRight, Building2, Zap, BadgeCheck, Percent,
  CheckCircle, Shield, MessageSquare, Lock, Package, ExternalLink
} from "lucide-react";
import FeaturedBooks from "@/components/home/FeaturedBooks";
import HowItWorks from "@/components/home/HowItWorks";
import ReadyToGetStarted from "@/components/home/ReadyToGetStarted";
import EcosystemSection from "@/components/home/EcosystemSection";
import debugLogger from "@/utils/debugLogger";

/* ── Scroll-triggered fade-in hook ── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

const Index = () => {
  debugLogger.info("Index", "Index page mounted");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const hasVerificationParams =
      searchParams.has("token") ||
      searchParams.has("token_hash") ||
      (searchParams.has("type") && searchParams.has("email"));
    if (hasVerificationParams) {
      navigate(`/verify?${searchParams.toString()}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const categories = [
    { name: "Textbooks", icon: <BookOpen className="h-6 w-6" />, to: "/textbooks-info" },
    { name: "Uniforms", icon: <Shirt className="h-6 w-6" />, to: "/uniforms-info" },
    { name: "School Supplies", icon: <Backpack className="h-6 w-6" />, to: "/school-supplies-info" },
    { name: "Mathematics", icon: <Sigma className="h-6 w-6" />, to: "/listings?search=mathematics" },
    { name: "Science", icon: <FlaskConical className="h-6 w-6" />, to: "/listings?search=science" },
    { name: "Sports & Equipment", icon: <Trophy className="h-6 w-6" />, to: "/listings?search=sports" },
    { name: "Arts & Craft", icon: <Palette className="h-6 w-6" />, to: "/listings?search=art" },
    { name: "Economics", icon: <Landmark className="h-6 w-6" />, to: "/listings?search=economics" },
  ];

  const heroImages = [
    {
      src: "https://images.pexels.com/photos/256455/pexels-photo-256455.jpeg",
      alt: "Students with textbooks",
    },
    {
      src: "https://images.pexels.com/photos/1720186/pexels-photo-1720186.jpeg",
      alt: "Student with books",
    },
    {
      src: "https://images.pexels.com/photos/4145190/pexels-photo-4145190.jpeg",
      alt: "Students learning together",
    },
    {
      src: "/lovable-uploads/bd1bff70-5398-480d-ab05-1a01e839c2d0.png",
      alt: "Student in blazer",
    },
  ];

  const [heroApi, setHeroApi] = useState<CarouselApi | null>(null);
  const [heroIndex, setHeroIndex] = useState<number>(0);

  useEffect(() => {
    if (!heroApi) return;
    const onSelect = () => {
      try {
        setHeroIndex(heroApi.selectedScrollSnap());
      } catch (e) {
        setHeroIndex(0);
      }
    };
    onSelect();
    heroApi.on("select", onSelect);
    heroApi.on("reInit", onSelect);
    return () => {
      heroApi.off("select", onSelect);
      heroApi.off("reInit", onSelect);
    };
  }, [heroApi]);

  // autoplay the hero carousel every 4s (loops)
  useEffect(() => {
    if (!heroApi) return;
    const id = setInterval(() => {
      try {
        const current = heroApi.selectedScrollSnap();
        const next = (current + 1) % heroImages.length;
        heroApi.scrollTo(next);
      } catch (e) {
        /* ignore */
      }
    }, 4000);
    return () => clearInterval(id);
  }, [heroApi, heroImages.length]);

  /* scroll-reveal refs */
  const catReveal = useScrollReveal();
  const whyReveal = useScrollReveal();
  const bizReveal = useScrollReveal();
  const ecoReveal = useScrollReveal();

  return (
    <Layout>
      <SEO
        title="ReBooked Solutions - Buy & Sell School Items"
        description="South Africa's trusted platform for buying and selling school-related items. Find affordable textbooks, uniforms, sports equipment, and school supplies — all in one place."
        keywords="school items, school textbooks, school uniforms, school supplies, buy sell school, students, South Africa, ReBooked Solutions"
        url="https://www.rebookedsolutions.co.za/"
      />

      {/* ═══ HERO ═══ */}
      <section className="bg-book-100 overflow-hidden">
        <div className="container mx-auto px-4 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left — text content */}
            <div className="space-y-6 text-center lg:text-left">
              <Badge className="bg-book-600 text-white border-book-600 hover:bg-book-700">
                Books · Uniforms · Everything In Between
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-gray-900">
                Rebooked <span className="text-book-600">Solutions</span>
              </h1>

              <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                South Africa's trusted school marketplace for buying and selling textbooks, uniforms, and school supplies safely and affordably.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-center lg:items-start">
                <Button
                  size="lg"
                  onClick={() => navigate("/listings")}
                  className="bg-book-600 hover:bg-book-700 text-white font-semibold px-8 rounded-full w-full sm:w-auto"
                >
                  Shop Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/create-listing")}
                  className="border-book-600 text-book-700 hover:bg-book-50 font-semibold px-8 rounded-full w-full sm:w-auto"
                >
                  Make A Listing
                </Button>
              </div>

              <div className="flex flex-wrap gap-6 pt-2 justify-center lg:justify-start">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-600 font-semibold">
                  <Shield className="w-4 h-4 text-book-600" />
                  <span>Secure Payments</span>
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-600 font-semibold">
                  <CheckCircle className="w-4 h-4 text-book-600" />
                  <span>Verified Listings</span>
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-600 font-semibold">
                  <Truck className="w-4 h-4 text-book-600" />
                  <span>Nationwide Delivery</span>
                </div>
              </div>
            </div>

            {/* Right — single image */}
            <div>
              <img
                src="/lovable-uploads/bd1bff70-5398-480d-ab05-1a01e839c2d0.png"
                alt="Student in blazer"
                className="w-full h-[20rem] sm:h-[24rem] lg:h-[28rem] object-cover rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CATEGORIES — Clean card grid (no entrance animation) ═══ */}
      <section className="py-12 sm:py-16 bg-white border-b">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Shop by Category</h2>
            <p className="text-gray-500">Browse curated collections across all school essentials</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={cat.to}
                className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-white border border-gray-200
                  hover:border-book-400 hover:shadow-lg hover:bg-book-50
                  transition-all duration-300 ease-in-out hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-book-100 rounded-lg flex items-center justify-center text-book-600 group-hover:bg-book-200 transition-colors">
                  {cat.icon}
                </div>
                <span className="text-sm font-semibold text-gray-700 text-center leading-snug">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY CHOOSE — Centered section ═══ */}
      <section className="py-16 sm:py-24 bg-gray-50" ref={whyReveal.ref}>
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 inline-block bg-book-100 text-book-700 border border-book-300 hover:bg-book-200">Why Us</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose <span className="text-book-600">ReBooked</span> Solutions?
            </h2>
            <p className="text-gray-500 leading-relaxed max-w-2xl mx-auto mb-8">
              We're building a sustainable ecosystem where South African students thrive — affordable access, secure transactions, and real support every step of the way.
            </p>
          </div>
          <div className="space-y-4">
            {/* Card grid */}
            <div className="space-y-4">
              {/* 3 value prop cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
                {[
                  { icon: <Leaf className="h-6 w-6 text-book-600" />, title: "Sustainable Learning", desc: "Give textbooks and school items a second life, supporting a more affordable and sustainable education ecosystem while keeping school costs manageable for families." },
                  { icon: <ShieldCheck className="h-6 w-6 text-book-600" />, title: "Guaranteed Security", desc: "Every transaction is protected by bank-level security. Funds are only released when transactions complete successfully — no exceptions." },
                  { icon: <Truck className="h-6 w-6 text-book-600" />, title: "Smart Logistics", desc: "Integrated with The Courier Guy and Pudo for pickups and reliable delivery across South Africa. Track your order every step of the way." },
                ].map((c) => (
                  <div key={c.title} className="bg-white border border-gray-200 rounded-xl p-7 sm:p-8 relative overflow-hidden hover:shadow-md transition-shadow duration-300 min-h-[200px]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-book-500" />
                    <div className="w-14 h-14 bg-book-100 rounded-lg flex items-center justify-center mb-4">{c.icon}</div>
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2">{c.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>

              {/* 4 protection badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: <Shield className="h-6 w-6 text-book-600" />, title: "Buyer Protection", desc: "Funds held secure until you confirm receipt" },
                  { icon: <CheckCircle className="h-6 w-6 text-book-600" />, title: "Verified Listings", desc: "All reviewed for accuracy and authenticity" },
                  { icon: <MessageSquare className="h-6 w-6 text-book-600" />, title: "Human Support", desc: "Dedicated team for dispute resolution" },
                  { icon: <Lock className="h-6 w-6 text-book-600" />, title: "Secure Payouts", desc: "PCI-compliant payment via BobPay" },
                ].map((p) => (
                  <div key={p.title} className="bg-white border border-gray-200 rounded-xl p-5 text-center hover:shadow-md transition-shadow">
                    <div className="flex justify-center mb-3">{p.icon}</div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">{p.title}</h4>
                    <p className="text-xs text-gray-500 leading-snug">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ REBOOKED BUSINESS — Full-width card banner ═══ */}
      <section className="relative overflow-hidden bg-book-600 py-12 sm:py-16" ref={bizReveal.ref}>
        {/* Decorative circle */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left */}
            <div className="text-center lg:text-left">
              <Badge className="mb-4 bg-white/10 text-white/80 border-white/20 hover:bg-white/20">For Business</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">ReBooked Business</h2>
              <p className="text-white/80 leading-relaxed mb-6 max-w-md mx-auto lg:mx-0">
                Verified seller programme for registered South African businesses looking to scale. List school items at volume with priority placement and a dedicated business dashboard.
              </p>
              <Button asChild size="lg" className="bg-white text-book-900 hover:bg-gray-100 font-bold">
                <Link to="/rebooked-business">Learn More <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>

            {/* Right — stat cards + feature pills */}
            <div className="space-y-5 text-center">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: <span className="inline-block text-3xl font-bold text-white">6.5%</span>, label: "Commission rate", highlight: "vs 10% for standard sellers" },
                  { value: <Zap className="h-7 w-7 mx-auto text-white" />, label: "Instant Listings", highlight: "Auto-commit with fast waiting period" },
                  { value: <BadgeCheck className="h-7 w-7 mx-auto text-white" />, label: "Verified Badge", highlight: "Build buyer trust on every listing" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/[0.08] border border-white/15 rounded-xl p-5 sm:p-6 text-center min-h-[140px] flex flex-col items-center justify-center">
                    <div className="mb-2 text-white">{s.value}</div>
                    <div className="text-xs text-white/70">{s.label}</div>
                    <div className="text-[11px] text-white font-semibold mt-1">{s.highlight}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2.5 justify-center">
                {[
                  { icon: <Package className="h-4 w-4" />, text: "Bulk Listing Tools" },
                  { icon: <BadgeCheck className="h-4 w-4" />, text: "Verified Badge" },
                  { icon: <Zap className="h-4 w-4" />, text: "Priority Support" }
                ].map((f) => (
                  <span key={f.text} className="bg-white/10 border border-white/20 rounded-lg px-3.5 py-2 text-xs text-white/85 font-medium flex items-center gap-2">
                    {f.icon}
                    {f.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Items Section */}
      <FeaturedBooks />

      {/* ReBooked Ecosystem Section */}
      <div ref={ecoReveal.ref}>
        <EcosystemSection />
      </div>

      {/* How It Works Section */}
      <HowItWorks />

      {/* Ready to Get Started Section */}
      <ReadyToGetStarted />
    </Layout>
  );
};

export default Index;
