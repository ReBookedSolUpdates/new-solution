import React from "react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Shirt,
  Footprints,
  Crown,
  Wind,
  Sun,
  Snowflake,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Trophy,
  Activity,
  Tent,
  Lightbulb,
  Ruler,
  ShieldCheck,
  Recycle,
  PiggyBank,
} from "lucide-react";

const UniformsInfo = () => {
  const uniformTypes = [
    { icon: <Shirt className="h-6 w-6" />, name: "School Shirts & Blouses", desc: "Short-sleeve, long-sleeve, white, blue, branded with school crest." },
    { icon: <Crown className="h-6 w-6" />, name: "Blazers & Jerseys", desc: "School-crest blazers, V-neck jerseys, cardigans — usually highest-cost items." },
    { icon: <Wind className="h-6 w-6" />, name: "Trousers, Shorts & Skirts", desc: "Grey/charcoal trousers, summer shorts, pleated skirts in school colours." },
    { icon: <Sun className="h-6 w-6" />, name: "Summer Dresses", desc: "Checked or plain summer dresses for primary & high school girls." },
    { icon: <Snowflake className="h-6 w-6" />, name: "Tracksuits & Hoodies", desc: "Winter tracksuit pants, jackets and hoodies in school colours." },
    { icon: <Footprints className="h-6 w-6" />, name: "School Shoes", desc: "Black leather lace-ups, slip-ons, Toughees, sandals — most-bought item." },
    { icon: <Trophy className="h-6 w-6" />, name: "Sports Kit", desc: "Hockey skirts, rugby jerseys, soccer kit, athletics vests, swimming costumes." },
    { icon: <Tent className="h-6 w-6" />, name: "PT Kit", desc: "PT shirts, shorts, sneakers, sweatbands — the basics for school sports days." },
  ];

  const sportsGear = [
    "Hockey Sticks & Shin Guards",
    "Cricket Bats, Pads & Helmets",
    "Tennis & Squash Racquets",
    "Soccer & Rugby Boots",
    "Swimming Goggles & Caps",
    "Athletic Spikes & Track Shoes",
    "Mouth Guards",
    "Gym Bags & Sport Bottles",
  ];

  const accessories = [
    "School Ties & Bowties",
    "School Belts (black/brown)",
    "Socks (long, short, ankle, sport)",
    "School Hats & Caps",
    "Hair ribbons & scrunchies",
    "Beanies & Scarves (winter)",
    "School Aprons (Home Ec / Tech)",
    "Lab Coats (Science)",
  ];

  return (
    <Layout>
      <SEO
        title="School Uniforms Guide | ReBooked Solutions"
        description="Buy and sell school uniforms — blazers, shoes, sports kit, accessories. Sized, school-specific listings for South African primary and high schools."
        keywords="school uniforms, school shoes, blazer, sports kit, hockey, rugby, cricket, tracksuit, South Africa"
        url="https://www.rebookedsolutions.co.za/uniforms-info"
      />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-book-50 via-white to-book-100">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute top-10 -left-20 w-72 h-72 bg-book-200 rounded-full blur-3xl" />
          <div className="absolute bottom-10 -right-20 w-96 h-96 bg-book-300/40 rounded-full blur-3xl" />
        </div>

        <div className="container relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <Badge className="mb-5 inline-flex items-center gap-2 bg-book-600 text-white hover:bg-book-700 px-4 py-1.5 text-sm">
                <Shirt className="h-4 w-4" />
                Category Guide · Uniforms
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-5">
                School uniforms,<br />
                <span className="text-book-600">half the price</span>, twice the life.
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
                From a barely-worn blazer to your Grade 7's school shoes — give uniforms a second life and save serious money. Every size, every school.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="bg-book-600 hover:bg-book-700 rounded-full px-8">
                  <Link to="/listings">
                    Browse Uniforms
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-book-300 text-book-700 hover:bg-book-50 rounded-full px-8">
                  <Link to="/create-listing">List a Uniform</Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              {[
                { icon: <PiggyBank className="h-6 w-6" />, label: "Save up to 70%", sub: "vs. retail uniform shops" },
                { icon: <Recycle className="h-6 w-6" />, label: "Sustainable", sub: "Reduce textile waste" },
                { icon: <Trophy className="h-6 w-6" />, label: "Sports Gear", sub: "Hockey, rugby, cricket" },
                { icon: <ShieldCheck className="h-6 w-6" />, label: "Buyer Protection", sub: "Refund if not as described" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-white/80 backdrop-blur-sm border border-book-100 p-4 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-book-100 text-book-700 flex items-center justify-center mb-2.5">
                    {item.icon}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-6xl py-16 sm:py-20 space-y-20">
        {/* Uniform Items */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Uniform Items We List</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Everything from shirts to shoes, summer kit to winter gear.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {uniformTypes.map((t) => (
              <Card key={t.name} className="border-book-100 hover:border-book-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-5">
                  <div className="w-12 h-12 rounded-xl bg-book-100 text-book-700 flex items-center justify-center mb-3">
                    {t.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{t.name}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{t.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Sports gear */}
        <section className="bg-gradient-to-br from-book-50 via-white to-book-50 rounded-3xl p-8 sm:p-12 border border-book-100">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Sports Equipment</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Hockey, cricket, rugby, swimming, athletics — pre-loved gear at a fraction of new prices.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sportsGear.map((g) => (
              <div key={g} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-book-100 hover:border-book-300 hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-lg bg-book-100 text-book-700 flex items-center justify-center flex-shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-gray-800">{g}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Accessories */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Accessories & Extras</h2>
            <p className="text-gray-600">The small things that complete the uniform.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {accessories.map((a) => (
              <div key={a} className="flex items-center gap-2 p-3 rounded-xl bg-book-50 border border-book-100 text-book-800 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-book-600 flex-shrink-0" />
                {a}
              </div>
            ))}
          </div>
        </section>

        {/* Sizing Guide */}
        <section className="bg-white rounded-3xl p-8 sm:p-12 border border-book-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-book-100 text-book-700 flex items-center justify-center">
              <Ruler className="h-6 w-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Sizing Guide</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Numeric (chest / age)</h3>
              <div className="flex flex-wrap gap-2">
                {["Age 4–5", "Age 6–7", "Age 8–9", "Age 10–11", "Age 12–13", "Age 14–15", "Age 16+"].map((s) => (
                  <span key={s} className="text-xs bg-book-50 text-book-700 px-3 py-1.5 rounded-full font-medium border border-book-100">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Letter sizing</h3>
              <div className="flex flex-wrap gap-2">
                {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                  <span key={s} className="text-xs bg-book-50 text-book-700 px-3 py-1.5 rounded-full font-medium border border-book-100">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Shoe sizes (UK)</h3>
              <p className="text-sm text-gray-600">From kids size 10 → adult size 12.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Skirt / trouser lengths</h3>
              <p className="text-sm text-gray-600">Always note waist measurement and hem length.</p>
            </div>
          </div>
        </section>

        {/* Tips */}
        <section className="bg-gradient-to-br from-book-600 to-book-700 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="relative max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Lightbulb className="h-6 w-6" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">Selling & Buying Tips</h2>
            </div>
            <ul className="space-y-3">
              {[
                "Always include the school name and crest visibility — it helps the right buyers find your listing.",
                "Take clear photos of front, back, tags, the school crest, and any wear.",
                "Wash and iron items before photographing — presentation sells.",
                "Be honest about pilling, fading, missing buttons or tears.",
                "Sports gear: list any safety expiry dates (helmets, mouth guards).",
                "Shoes: include sole condition and inner-sole wear.",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-book-100 flex-shrink-0 mt-0.5" />
                  <span className="text-white/90">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Not allowed */}
        <section className="bg-amber-50 rounded-2xl p-6 sm:p-8 border border-amber-200">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-amber-900 mb-2">Not Allowed</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                Visibly damaged or unsanitary clothing, expired sports safety gear (helmets/mouth guards over the manufacturer's date), and counterfeit branded items.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <Sparkles className="h-10 w-10 text-book-600 mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Sell Your Uniform · Save On Yours</h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-8">
            Outgrown a blazer? Need a Grade 9 hockey stick? ReBooked has you covered.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-book-600 hover:bg-book-700 rounded-full px-8">
              <Link to="/listings">Browse Uniforms <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-book-300 text-book-700 hover:bg-book-50 rounded-full px-8">
              <Link to="/create-listing">List Yours Now</Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default UniformsInfo;
