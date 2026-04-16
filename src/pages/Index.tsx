import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, BookOpen, Shirt, Backpack, Palette, Landmark, FlaskConical, Trophy, Sigma,
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

  const [searchQuery, setSearchQuery] = useState("");
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/books?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const categories = [
    { name: "Textbooks", icon: <BookOpen className="h-6 w-6" /> },
    { name: "Uniforms", icon: <Shirt className="h-6 w-6" /> },
    { name: "School Supplies", icon: <Backpack className="h-6 w-6" /> },
    { name: "Mathematics", icon: <Sigma className="h-6 w-6" /> },
    { name: "Science", icon: <FlaskConical className="h-6 w-6" /> },
    { name: "Sports & Equipment", icon: <Trophy className="h-6 w-6" /> },
    { name: "Arts & Craft", icon: <Palette className="h-6 w-6" /> },
    { name: "Economics", icon: <Landmark className="h-6 w-6" /> },
  ];

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

      {/* ═══ HERO — Search integrated into left column ═══ */}
      <section className="min-h-[520px] bg-book-100 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-0">
            {/* Left */}
            <div className="py-12 sm:py-16 lg:py-20 lg:pr-12">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-[2px] bg-book-600 inline-block" />
                <span className="text-xs font-bold uppercase tracking-wider text-book-700">
                  Books · Uniforms · Everything In Between
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-bold text-gray-900 leading-[1.08] mb-5">
                Buy Smart.<br />Sell Easy.<br />
                <span className="italic text-book-700">School Ready.</span>
              </h1>

              <p className="text-base sm:text-lg text-gray-600 max-w-[420px] leading-relaxed mb-8">
                Textbooks, uniforms, sports equipment, stationery and more —
                buy affordable secondhand school items or sell what you no longer need,
                all handled securely through ReBooked Solutions.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <Button
                  size="lg"
                  className="bg-book-600 hover:bg-book-700 shadow-lg shadow-book-600/30"
                  onClick={() => navigate("/textbooks")}
                >
                  <Search className="h-4 w-4 mr-1" /> Browse Listings
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-book-300 text-book-700 bg-white hover:bg-book-50"
                  onClick={() => navigate("/create-listing")}
                >
                  Sell Your Items
                </Button>
              </div>

              {/* Search bar — moved into hero */}
              <form onSubmit={handleSearch} className="flex max-w-[460px] rounded-xl border-2 border-book-300 bg-white overflow-hidden shadow-md">
                <input
                  type="text"
                  placeholder="Search for textbooks, uniforms, supplies…"
                  className="flex-1 px-4 py-3 text-sm border-none outline-none bg-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="px-5 bg-book-600 text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-book-700 transition-colors">
                  <Search className="h-4 w-4" /> Search
                </button>
              </form>

              {/* Trust signals */}
              <div className="flex flex-wrap gap-5 mt-6">
                {["Secure payments", "Verified listings", "Nationwide delivery"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-book-600" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — image */}
            <div className="hidden lg:block relative h-full min-h-[520px]">
              <div className="absolute inset-0 bg-gradient-to-br from-book-300/60 to-book-400/40 rounded-l-3xl overflow-hidden">
                <img
                  src="/lovable-uploads/bd1bff70-5398-480d-ab05-1a01e839c2d0.png"
                  alt="Three students smiling with textbooks"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
              {/* Floating badge */}
              <div className="absolute bottom-12 -left-5 bg-white rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 z-10">
                <div className="w-9 h-9 bg-book-100 rounded-lg flex items-center justify-center text-lg">📚</div>
                <div>
                  <strong className="block text-sm font-bold text-gray-900">246+ Students</strong>
                  <span className="text-[11px] text-gray-500">buying &amp; selling daily</span>
                </div>
              </div>
            </div>

            {/* Mobile image */}
            <div className="lg:hidden order-2">
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

      {/* ═══ CATEGORIES — Discovery strip directly below hero ═══ */}
      <section className="py-8 sm:py-10 bg-white border-b" ref={catReveal.ref}>
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Shop by Category</h2>
            <p className="text-sm text-gray-500 mt-1">Browse curated collections across all school essentials</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categories.map((cat, i) => (
              <Link
                key={cat.name}
                to="/listings"
                className={`group flex flex-col items-center gap-2.5 p-5 rounded-xl bg-book-100 border-2 border-transparent
                  hover:border-book-500 hover:bg-book-200
                  transition-all duration-300 ease-in-out
                  hover:-translate-y-1 hover:shadow-md
                  ${catReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
                style={{ transitionDelay: catReveal.visible ? `${i * 60}ms` : '0ms' }}
              >
                <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center shadow-sm text-book-700 group-hover:text-book-800 transition-colors">
                  {cat.icon}
                </div>
                <span className="text-xs font-semibold text-gray-600 text-center leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY CHOOSE — Asymmetric 1/3 sticky + 2/3 cards ═══ */}
      <section className="py-16 sm:py-24 bg-gray-50" ref={whyReveal.ref}>
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-12 lg:gap-16 items-start">
            {/* Sticky left */}
            <div className="lg:sticky lg:top-20">
              <Badge className="mb-4 bg-book-100 text-book-700 border border-book-300 hover:bg-book-200">✦ Why Us</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Why Choose <span className="text-book-600">ReBooked</span> Solutions?
              </h2>
              <p className="text-gray-500 leading-relaxed mb-8">
                We're building a sustainable ecosystem where South African students thrive — affordable access, secure transactions, and real support every step of the way.
              </p>
              {/* Trust pills */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: <Shield className="h-4 w-4" />, label: "Buyer Protection" },
                  { icon: <CheckCircle className="h-4 w-4" />, label: "Verified Listings" },
                  { icon: <MessageSquare className="h-4 w-4" />, label: "Human Support" },
                  { icon: <Lock className="h-4 w-4" />, label: "Secure Payouts" },
                ].map((p) => (
                  <div key={p.label} className="flex items-center gap-2.5 bg-book-100 border border-book-200 rounded-lg p-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-book-600">{p.icon}</div>
                    <span className="text-xs font-semibold text-gray-600">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — card grid */}
            <div className="space-y-4">
              {/* 3 value prop cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: <Leaf className="h-5 w-5 text-book-600" />, title: "Sustainable Learning", desc: "Give textbooks and school items a second life, supporting a more affordable and sustainable education ecosystem while keeping school costs manageable for families." },
                  { icon: <ShieldCheck className="h-5 w-5 text-book-600" />, title: "Guaranteed Security", desc: "Every transaction is protected by bank-level security. Funds are only released when transactions complete successfully — no exceptions." },
                  { icon: <Truck className="h-5 w-5 text-book-600" />, title: "Smart Logistics", desc: "Integrated with The Courier Guy and Pudo for pickups and reliable delivery across South Africa. Track your order every step of the way." },
                ].map((c) => (
                  <div key={c.title} className="bg-white border border-gray-200 rounded-xl p-6 relative overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-book-500" />
                    <div className="w-11 h-11 bg-book-100 rounded-lg flex items-center justify-center mb-3">{c.icon}</div>
                    <h3 className="font-bold text-sm text-gray-900 mb-1.5">{c.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>

              {/* 4 protection badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: <Shield className="h-5 w-5 text-book-600" />, title: "Buyer Protection", desc: "Funds held secure until you confirm receipt" },
                  { icon: <CheckCircle className="h-5 w-5 text-book-600" />, title: "Verified Listings", desc: "All reviewed for accuracy and authenticity" },
                  { icon: <MessageSquare className="h-5 w-5 text-book-600" />, title: "Human Support", desc: "Dedicated team for dispute resolution" },
                  { icon: <Lock className="h-5 w-5 text-book-600" />, title: "Secure Payouts", desc: "PCI-compliant payment via BobPay" },
                ].map((p) => (
                  <div key={p.title} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <div className="flex justify-center mb-2">{p.icon}</div>
                    <h4 className="text-xs font-bold text-gray-900 mb-1">{p.title}</h4>
                    <p className="text-[11px] text-gray-500 leading-snug">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ REBOOKED BUSINESS — Full-width dark-green banner ═══ */}
      <section className="relative overflow-hidden bg-book-900 py-16 sm:py-20" ref={bizReveal.ref}>
        {/* Decorative circle */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <Badge className="mb-4 bg-white/10 text-white/80 border-white/20 hover:bg-white/20">For Business</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">ReBooked Business</h2>
              <p className="text-white/70 leading-relaxed mb-8 max-w-md">
                Verified seller programme for registered South African businesses looking to scale. List school items at volume with priority placement and a dedicated business dashboard.
              </p>
              <Button asChild size="lg" className="bg-white text-book-900 hover:bg-gray-100 font-bold">
                <Link to="/rebooked-business">Learn More <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>

            {/* Right — stat cards + feature pills */}
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: "6.5%", label: "Commission rate", highlight: "vs 10% for standard sellers" },
                  { value: "⚡", label: "Instant Listings", highlight: "Auto-commit with fast waiting period" },
                  { value: "✓", label: "Verified Badge", highlight: "Build buyer trust on every listing" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/[0.08] border border-white/15 rounded-xl p-5 text-center">
                    <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
                    <div className="text-xs text-white/60">{s.label}</div>
                    <div className="text-[11px] text-yellow-400 font-semibold mt-1">{s.highlight}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {["📦 Bulk Listing Tools", "📊 Business Analytics", "🏅 Verified Badge", "⚡ Priority Support"].map((f) => (
                  <span key={f} className="bg-white/10 border border-white/20 rounded-lg px-3.5 py-2 text-xs text-white/85 font-medium">{f}</span>
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
