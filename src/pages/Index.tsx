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
    { name: "Textbooks", icon: <BookOpen className="h-6 w-6" /> },
    { name: "Uniforms", icon: <Shirt className="h-6 w-6" /> },
    { name: "School Supplies", icon: <Backpack className="h-6 w-6" /> },
    { name: "Mathematics", icon: <Sigma className="h-6 w-6" /> },
    { name: "Science", icon: <FlaskConical className="h-6 w-6" /> },
    { name: "Sports & Equipment", icon: <Trophy className="h-6 w-6" /> },
    { name: "Arts & Craft", icon: <Palette className="h-6 w-6" /> },
    { name: "Economics", icon: <Landmark className="h-6 w-6" /> },
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

      {/* ═══ HERO — Redesigned 2-column layout with collage visuals ═══ */}
      <section className="min-h-[60vh] bg-book-100 overflow-hidden">
        <div className="container mx-auto px-4 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left content */}
            <div className="space-y-6 text-center lg:text-left lg:-translate-x-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold uppercase tracking-tight leading-[0.95] text-gray-900">
                Rebooked
                <br />
                Solutions
              </h1>

              <div className="inline-block bg-book-700 text-white px-6 py-3 rounded-full">
                <span className="text-sm sm:text-base font-semibold tracking-wide uppercase">
                  Books · Uniforms · Everything In Between
                </span>
              </div>

              <p className="text-sm sm:text-base uppercase tracking-widest leading-relaxed max-w-lg mx-auto lg:mx-0 text-gray-600 font-semibold">
                ReBooked Solutions — South Africa's trusted school marketplace for buying and selling textbooks, uniforms, and school supplies safely and affordably.
              </p>

              <div className="flex flex-col gap-3 items-center lg:items-start w-full sm:w-auto">
                <button className="inline-flex items-center justify-center bg-book-600 text-white font-semibold text-base px-8 py-2 rounded-full hover:opacity-90 transition-opacity w-full max-w-md mx-auto lg:mx-0">
                  Shop Now
                </button>
                <Link to="/create-listing" className="inline-flex items-center justify-center w-full max-w-md rounded-full border border-book-600 bg-white px-8 py-2 text-base font-semibold text-book-700 hover:bg-book-50 transition-colors">
                  Make A Listing
                </Link>
              </div>

              <div className="flex flex-wrap gap-6 pt-2 justify-center lg:justify-start">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-600 font-semibold">
                  <Shield className="w-4 h-4" />
                  <span>Secure Payments</span>
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-600 font-semibold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Verified Listings</span>
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-600 font-semibold">
                  <Truck className="w-4 h-4" />
                  <span>Nationwide Delivery</span>
                </div>
              </div>
            </div>

            {/* Mobile carousel (visible on small screens) */}
            <div className="lg:hidden">
              <Carousel opts={{ align: "center", containScroll: "trimSnaps", dragFree: true, loop: false }} setApi={setHeroApi}>
                <CarouselContent className="touch-pan-x">
                  {heroImages.map((image) => (
                    <CarouselItem key={image.alt} className="min-w-full">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-[16rem] sm:h-[18rem] object-cover rounded-[2rem]"
                        loading="lazy"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
                {/* pagination dots */}
                <div className="flex items-center justify-center gap-2 mt-3">
                  {heroImages.map((_, idx) => (
                    <button
                      key={idx}
                      aria-label={`Go to slide ${idx + 1}`}
                      onClick={() => heroApi?.scrollTo(idx)}
                      className={
                        "h-2 w-8 rounded-full transition-all duration-200 bg-white/50" + (heroIndex === idx ? " bg-white" : " bg-white/30")
                      }
                    />
                  ))}
                </div>
            </div>

            {/* Right image grid */}
              <div className="hidden lg:grid grid-cols-1 gap-4 sm:grid-cols-[0.88fr_1.12fr] sm:gap-5 lg:gap-6">
              <div className="grid gap-4 sm:gap-5 lg:gap-6">
                <img
                  src="https://images.pexels.com/photos/256455/pexels-photo-256455.jpeg"
                  alt="Students with textbooks"
                    className="w-full h-[19rem] sm:h-[22rem] lg:h-[26rem] object-cover rounded-[2rem]"
                  width={640}
                  height={800}
                />
                <img
                  src="https://images.pexels.com/photos/4145190/pexels-photo-4145190.jpeg"
                  alt="Students sharing supplies"
                    className="w-full h-[13rem] sm:h-[13rem] lg:h-[14.5rem] object-cover rounded-[2rem]"
                  loading="lazy"
                  width={640}
                  height={640}
                />
              </div>

              <div className="grid gap-4 sm:gap-5 lg:gap-6">
                <img
                  src="https://images.pexels.com/photos/1720186/pexels-photo-1720186.jpeg"
                  alt="Student with books"
                  className="w-full h-[14rem] sm:h-[14rem] lg:h-[16rem] object-cover rounded-[2rem]"
                  loading="lazy"
                  width={640}
                  height={640}
                />
                <img
                  src="/lovable-uploads/bd1bff70-5398-480d-ab05-1a01e839c2d0.png"
                  alt="Student in blazer"
                  className="w-full h-[18rem] sm:h-[22rem] lg:h-[26rem] object-cover rounded-[2rem]"
                  loading="lazy"
                  width={640}
                  height={800}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CATEGORIES — Clean card grid ═══ */}
      <section className="py-12 sm:py-16 bg-white border-b" ref={catReveal.ref}>
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Shop by Category</h2>
            <p className="text-gray-500">Browse curated collections across all school essentials</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {categories.map((cat, i) => (
              <Link
                key={cat.name}
                to="/listings"
                className={`group flex flex-col items-center gap-3 p-6 rounded-xl bg-white border border-gray-200
                  hover:border-book-400 hover:shadow-lg hover:bg-book-50
                  transition-all duration-300 ease-in-out
                  hover:-translate-y-1
                  ${catReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
                style={{ transitionDelay: catReveal.visible ? `${i * 60}ms` : '0ms' }}
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
                  { value: <span className="inline-block text-2xl font-bold">6.5%</span>, label: "Commission rate", highlight: "vs 10% for standard sellers" },
                  { value: <Zap className="h-6 w-6 mx-auto text-white" />, label: "Instant Listings", highlight: "Auto-commit with fast waiting period" },
                  { value: <BadgeCheck className="h-6 w-6 mx-auto text-white" />, label: "Verified Badge", highlight: "Build buyer trust on every listing" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/[0.08] border border-white/15 rounded-xl p-5 text-center">
                    <div className="mb-1">{s.value}</div>
                    <div className="text-xs text-white/60">{s.label}</div>
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
