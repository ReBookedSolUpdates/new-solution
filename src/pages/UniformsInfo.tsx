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
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Trophy,
  Activity,
  Tent,
  Glasses,
  ShieldCheck,
  Lightbulb,
  Ruler,
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
    { icon: <Activity className="h-5 w-5" />, name: "Hockey Sticks & Shin Guards" },
    { icon: <Trophy className="h-5 w-5" />, name: "Cricket Bats, Pads & Helmets" },
    { icon: <Activity className="h-5 w-5" />, name: "Tennis & Squash Racquets" },
    { icon: <Activity className="h-5 w-5" />, name: "Soccer & Rugby Boots" },
    { icon: <Activity className="h-5 w-5" />, name: "Swimming Goggles & Caps" },
    { icon: <Activity className="h-5 w-5" />, name: "Athletic Spikes & Track Shoes" },
    { icon: <Activity className="h-5 w-5" />, name: "Mouth Guards" },
    { icon: <Activity className="h-5 w-5" />, name: "Gym Bags & Sport Bottles" },
  ];

  const accessories = [
    "School Ties & Bowties",
    "School Belts (black/brown)",
    "Socks (long, short, ankle, sport)",
    "School Hats & Caps",
    "Hair ribbons & scrunchies (in school colours)",
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

      <section className="bg-book-50 border-b border-book-100">
        <div className="container mx-auto px-4 py-14 sm:py-20 max-w-6xl">
          <div className="max-w-3xl">
            <Badge className="bg-book-100 text-book-700 hover:bg-book-200 mb-4">
              <Shirt className="h-3.5 w-3.5 mr-1" /> Category Guide
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              School Uniforms & Sportswear
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              From a barely-worn blazer to your Grade 7's school shoes — give uniforms a second life and save serious money. Every item, every size, every school.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-book-600 hover:bg-book-700">
                <Link to="/listings">
                  Browse Uniforms
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-book-300 text-book-700 hover:bg-book-50">
                <Link to="/create-listing">List a Uniform</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-6xl py-14 sm:py-20 space-y-20">
        {/* Uniform Items */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Uniform Items We List</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Everything from shirts to shoes, summer kit to winter gear.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {uniformTypes.map((t) => (
              <Card key={t.name} className="border-book-100 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="w-12 h-12 rounded-lg bg-book-100 text-book-700 flex items-center justify-center mb-3">
                    {t.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">{t.name}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{t.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Sports gear */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Sports Equipment</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Hockey, cricket, rugby, swimming, athletics — pre-loved gear at a fraction of new prices.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {sportsGear.map((g) => (
              <div key={g.name} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-book-300 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-book-50 text-book-600 flex items-center justify-center flex-shrink-0">
                  {g.icon}
                </div>
                <span className="text-sm font-medium text-gray-800">{g.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Accessories */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Accessories & Extras</h2>
            <p className="text-gray-500">The small things that complete the uniform.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {accessories.map((a) => (
              <div key={a} className="flex items-center gap-2 p-3 rounded-lg bg-book-50 text-book-800 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-book-600 flex-shrink-0" />
                {a}
              </div>
            ))}
          </div>
        </section>

        {/* Sizing Guide */}
        <section className="bg-white rounded-3xl p-8 border border-book-100">
          <div className="flex items-center gap-3 mb-6">
            <Ruler className="h-7 w-7 text-book-600" />
            <h2 className="text-2xl font-bold text-gray-900">Sizing Guide</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Numeric (chest / age)</h3>
              <div className="flex flex-wrap gap-2">
                {["Age 4–5", "Age 6–7", "Age 8–9", "Age 10–11", "Age 12–13", "Age 14–15", "Age 16+"].map((s) => (
                  <span key={s} className="text-xs bg-book-50 text-book-700 px-3 py-1.5 rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Letter sizing</h3>
              <div className="flex flex-wrap gap-2">
                {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                  <span key={s} className="text-xs bg-book-50 text-book-700 px-3 py-1.5 rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Shoe sizes (UK)</h3>
              <p className="text-xs text-gray-500">From kids size 10 → adult size 12.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Skirt / trouser lengths</h3>
              <p className="text-xs text-gray-500">Always note waist measurement and hem length.</p>
            </div>
          </div>
        </section>

        {/* Tips */}
        <section className="bg-book-50 rounded-3xl p-8 sm:p-12 border border-book-100">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-book-600 text-white flex items-center justify-center">
                <Lightbulb className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Selling & Buying Tips</h2>
            </div>
            <ul className="space-y-3">
              {[
                "Always include the school name (and crest visibility) — it helps the right buyers find your listing.",
                "Take clear photos of front, back, any tags, the school crest, and any wear.",
                "Wash and iron items before photographing — presentation sells.",
                "Be honest about pilling, fading, missing buttons or tears.",
                "Sports gear: list any safety expiry dates (helmets, mouth guards).",
                "Shoes: include sole condition and inner-sole wear.",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-book-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Not allowed */}
        <section className="bg-amber-50 rounded-2xl p-8 border border-amber-200">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-amber-900 mb-2">Not Allowed</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                Visibly damaged or unsanitary clothing, expired sports safety gear (helmets/mouth guards over the manufacturer's date), and counterfeit branded items.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <Sparkles className="h-10 w-10 text-book-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Sell Your Uniform • Save On Yours</h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-6">
            Outgrown a blazer? Need a Grade 9 hockey stick? ReBooked has you covered.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-book-600 hover:bg-book-700">
              <Link to="/listings">Browse Uniforms <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-book-300 text-book-700 hover:bg-book-50">
              <Link to="/create-listing">List Yours Now</Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default UniformsInfo;
