import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Calculator,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  HeartHandshake,
  PackageCheck,
  PencilRuler,
  PenTool,
  School,
  Shirt,
  ShoppingBag,
  Sparkles,
  Trophy,
  Truck,
} from "lucide-react";

const LOCKER_GUIDE = [
  "Mini: about 41cm x 38cm x 64cm",
  "Medium: about 41cm x 41cm x 64cm",
  "Large: about 44cm x 53cm x 64cm",
  "X-Large: about 45cm x 59cm x 64cm",
];

type FeatureCard = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

type CategoryPageData = {
  path: string;
  title: string;
  subtitle: string;
  seoDescription: string;
  heroIcon: React.ReactNode;
  heroBadges: string[];
  intro: string;
  highlights: FeatureCard[];
  listingChecklist: string[];
  buyerChecklist: string[];
  examples: string[];
  shippingTips: string[];
  supportNote: string;
};

const CATEGORY_PAGES: CategoryPageData[] = [
  {
    path: "/textbook-guide",
    title: "Textbooks",
    subtitle: "List the right edition, explain the condition properly, and help buyers avoid expensive mistakes.",
    seoDescription:
      "ReBooked textbook guide for school and university books, including ISBN tips, condition notes, edition checks, and shipping guidance.",
    heroIcon: <BookOpen className="h-6 w-6 text-book-700" />,
    heroBadges: ["School books", "University books", "Readers and study texts"],
    intro:
      "Textbooks need clarity more than hype. Buyers care about the exact edition, whether pages are complete, how much writing is inside, and whether the book is still acceptable for class. A strong textbook listing answers those questions before the buyer has to ask.",
    highlights: [
      {
        title: "Edition accuracy matters",
        description: "If there is an ISBN, edition number, publication year, or curriculum version, include it. Wrong editions create the most avoidable disputes.",
        icon: <GraduationCap className="h-5 w-5 text-book-700" />,
      },
      {
        title: "Condition must be specific",
        description: "Say whether there is highlighting, notes, underlining, torn corners, water damage, loose pages, or a name written inside.",
        icon: <ClipboardList className="h-5 w-5 text-book-700" />,
      },
      {
        title: "Photos should verify the details",
        description: "Front cover, back cover, spine, contents page, and a few inner pages usually do more work than a long paragraph.",
        icon: <Sparkles className="h-5 w-5 text-book-700" />,
      },
    ],
    listingChecklist: [
      "Include title, author, ISBN, grade or university year, and subject.",
      "State whether it is a learner book, reader, workbook, study guide, or prescribed text.",
      "Mention if access codes, inserts, or answer sections are included or missing.",
      "Describe writing honestly: none, light, moderate, or heavy.",
      "If you are selling a bundle, list every book in the set clearly.",
    ],
    buyerChecklist: [
      "Confirm the exact edition or ISBN before checking out.",
      "Read the condition description and inspect photo close-ups for notes or wear.",
      "Check whether your lecturer or school allows older editions.",
      "Ask about missing supplements before you pay if they matter for the course.",
    ],
    examples: [
      "Mathematics Grade 11 CAPS textbook with light pencil notes and clean answer pages.",
      "Second-year accounting prescribed text, 8th edition, no missing pages, one owner.",
      "Reader set with 3 novels included, all shown in the listing photos.",
    ],
    shippingTips: [
      "Single textbook: Mini or Medium locker usually works.",
      "2-3 heavy textbooks: Medium or Large depending on thickness.",
      "Large semester bundles: use door-to-door if the parcel is dense or heavy.",
    ],
    supportNote:
      "If you are unsure whether a textbook belongs under textbooks or supplies, ask one question: is the core value the reading material itself? If yes, list it here.",
  },
  {
    path: "/uniform-guide",
    title: "Uniforms",
    subtitle: "Make sizing, school branding, and wear level obvious so buyers know exactly what they are getting.",
    seoDescription:
      "ReBooked uniforms guide covering school uniforms, sportswear, shoes, branding, sizing notes, and parcel guidance.",
    heroIcon: <Shirt className="h-6 w-6 text-book-700" />,
    heroBadges: ["School uniform", "Sportswear", "School shoes"],
    intro:
      "Uniform buyers are trying to solve a practical problem fast. They need to know the school, the garment type, the fit, and whether the item still looks presentable. The best listings feel straightforward, measured, and trustworthy.",
    highlights: [
      {
        title: "School identity comes first",
        description: "Show logos, badges, trims, tie colours, blazer pockets, and any house or sport-specific branding clearly.",
        icon: <School className="h-5 w-5 text-book-700" />,
      },
      {
        title: "Measurements beat label sizes",
        description: "Tag sizes vary. Include chest, waist, length, shoe size, or skirt length where relevant.",
        icon: <BadgeCheck className="h-5 w-5 text-book-700" />,
      },
      {
        title: "State wear honestly",
        description: "Mention fading, shine, shrinking, loose hems, repairs, stains, scuffs, or sole wear before the buyer has to ask.",
        icon: <HeartHandshake className="h-5 w-5 text-book-700" />,
      },
    ],
    listingChecklist: [
      "Include school name, garment type, season, and whether it is formal, sports, or house wear.",
      "For blazers, dresses, shirts, skirts, and trousers, give actual measurements where possible.",
      "For shoes, list the size, brand, colour, and sole condition.",
      "For sportswear, mention if it is hockey, tennis, netball, rugby, athletics, or general PE kit.",
      "Say if a bundle includes socks, tie, hat, blazer, tracksuit, or extras.",
    ],
    buyerChecklist: [
      "Compare the listed measurements with the learner's current uniform, not only the size tag.",
      "Check school branding and colours carefully before purchase.",
      "Look for photos of cuffs, collars, knees, hems, soles, and logos.",
      "Ask whether the item was altered if the fit needs to be exact.",
    ],
    examples: [
      "Winter blazer with crest, size 34, excellent outer condition, minor lining wear.",
      "Black school shoes size 5 with light scuffing and strong sole grip.",
      "Girls sports skort and golf shirt set for tennis or hockey practice.",
    ],
    shippingTips: [
      "Shirts, skirts, shorts, and small sportswear pieces: Mini or Medium locker.",
      "Blazers, dresses, jackets, and bundled sets: Medium or Large locker.",
      "Shoes or multiple winter items: Large locker or door-to-door if tightly packed.",
    ],
    supportNote:
      "Uniform listings sell faster when the buyer can instantly see school compatibility. A close photo of the badge and one full-length photo usually help the most.",
  },
  {
    path: "/school-supplies-guide",
    title: "School Supplies",
    subtitle: "Stationery, calculators, art kits, sports gear, and practical extras need detailed contents and size notes.",
    seoDescription:
      "ReBooked school supplies guide for stationery, calculators, art kits, sports gear, shoes, and allowed item details.",
    heroIcon: <PencilRuler className="h-6 w-6 text-book-700" />,
    heroBadges: ["Stationery", "Sports gear", "Practical school extras"],
    intro:
      "This page is for the things around learning: pens, pencils, scientific calculators, geometry sets, lunch gear, art supplies, musical accessories, and sports equipment like hockey sticks, tennis rackets, pads, and training bags. The listing has to explain exactly what is included and whether it is still usable.",
    highlights: [
      {
        title: "List the contents clearly",
        description: "If it is a bundle, break it down item by item so buyers are not guessing what will arrive.",
        icon: <Briefcase className="h-5 w-5 text-book-700" />,
      },
      {
        title: "Brand and model matter",
        description: "This is especially important for calculators, geometry tools, art sets, and sports equipment.",
        icon: <Calculator className="h-5 w-5 text-book-700" />,
      },
      {
        title: "Mention suitability",
        description: "For sports gear, include age, size, length, handedness, or school-use suitability where relevant.",
        icon: <Trophy className="h-5 w-5 text-book-700" />,
      },
    ],
    listingChecklist: [
      "State exactly what the buyer receives: quantity, brand, colour, accessories, and condition.",
      "For stationery, mention if pens, pencils, rulers, files, or refills are new or partly used.",
      "For calculators, give the model number and note whether batteries are included.",
      "For sports items like hockey sticks, tennis rackets, pads, boots, or kit bags, include size or length.",
      "For art sets or technology kits, mention missing pieces, opened packs, or wear on cases.",
    ],
    buyerChecklist: [
      "Check whether the item is allowed by the school before purchasing.",
      "Confirm model numbers for calculators and subject-specific equipment.",
      "Read the contents list carefully on bundles to avoid assumptions.",
      "For sports gear, compare size and length with current equipment.",
    ],
    examples: [
      "Exam-approved scientific calculator with slide cover and working display.",
      "Art kit bundle with brushes, charcoal, acrylics, and carry case.",
      "Hockey stick, shin guards, and bag listed together with sizes shown.",
    ],
    shippingTips: [
      "Stationery packs, calculators, and compact kits: Mini or Medium locker.",
      "Shoes, helmets, lunch boxes, and bulky pencil cases: Medium or Large locker.",
      "Long items like hockey sticks, cricket bats, or oversized tripods: door-to-door only.",
    ],
    supportNote:
      "When in doubt, over-explain the bundle. Supplies cover a wide range of items, so your listing should remove guesswork completely.",
  },
];

const CATEGORY_BY_PATH = Object.fromEntries(
  CATEGORY_PAGES.map((page) => [page.path, page]),
) as Record<string, CategoryPageData>;

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  textbooks: "/textbook-guide",
  uniforms: "/uniform-guide",
  "school-supplies": "/school-supplies-guide",
};

const SectionCard = ({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) => (
  <Card className="rounded-3xl border border-stone-200 shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg text-stone-900">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 text-sm text-stone-700">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-3 rounded-2xl bg-stone-50 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-book-700" />
          <p>{item}</p>
        </div>
      ))}
    </CardContent>
  </Card>
);

const CategoryInfoPage = () => {
  const location = useLocation();
  const { slug } = useParams();
  const resolvedPath = CATEGORY_BY_PATH[location.pathname]
    ? location.pathname
    : slug && LEGACY_CATEGORY_MAP[slug]
      ? LEGACY_CATEGORY_MAP[slug]
      : "/textbook-guide";
  const page = CATEGORY_BY_PATH[resolvedPath] || CATEGORY_BY_PATH["/textbook-guide"];

  return (
    <Layout>
      <SEO
        title={`${page.title} Guide | ReBooked Solutions`}
        description={page.seoDescription}
        keywords={`${page.title.toLowerCase()}, rebooked solutions, school marketplace, buying guide, selling guide, south africa`}
        url={`https://www.rebookedsolutions.co.za${page.path}`}
      />

      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-[2rem] border border-stone-200 bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.45),_transparent_35%),linear-gradient(135deg,_#fffbeb,_#ffffff_55%,_#f5f5f4)] p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {page.heroBadges.map((badge) => (
              <Badge key={badge} variant="secondary" className="rounded-full bg-white/80 text-stone-700">
                {badge}
              </Badge>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 shadow-sm">{page.heroIcon}</div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-book-700">
                  Category Guide
                </p>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                {page.title}
              </h1>
              <p className="mt-3 text-base leading-7 text-stone-700 sm:text-lg">
                {page.subtitle}
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
                {page.intro}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild className="bg-book-600 hover:bg-book-700">
                <Link to="/listings">
                  Browse listings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/create-listing">Create a listing</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {page.highlights.map((highlight) => (
            <Card key={highlight.title} className="rounded-3xl border border-stone-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex rounded-2xl bg-book-50 p-3">
                  {highlight.icon}
                </div>
                <h2 className="text-lg font-semibold text-stone-900">{highlight.title}</h2>
                <p className="mt-2 text-sm leading-7 text-stone-600">{highlight.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <SectionCard
            title="What Sellers Should Include"
            items={page.listingChecklist}
            icon={<PackageCheck className="h-5 w-5 text-book-700" />}
          />
          <SectionCard
            title="What Buyers Should Check"
            items={page.buyerChecklist}
            icon={<ShoppingBag className="h-5 w-5 text-book-700" />}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl border border-stone-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-stone-900">
                <PenTool className="h-5 w-5 text-book-700" />
                Good Listing Examples
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-stone-700">
              {page.examples.map((example) => (
                <div key={example} className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                  {example}
                </div>
              ))}
              <p className="rounded-2xl bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
                {page.supportNote}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-stone-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-stone-900">
                <Truck className="h-5 w-5 text-book-700" />
                Parcel Size Guidance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-stone-700">
              {page.shippingTips.map((tip) => (
                <div key={tip} className="rounded-2xl bg-stone-50 px-4 py-3">
                  {tip}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 rounded-3xl border border-stone-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-stone-900">
              <Truck className="h-5 w-5 text-book-700" />
              Courier Guy Locker Dimensions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {LOCKER_GUIDE.map((line) => (
                <div
                  key={line}
                  className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-medium text-stone-700"
                >
                  {line}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-6 text-stone-500">
              Locker dimensions can vary slightly by location. If an item is long, bulky, tightly packed, or oddly shaped, use door-to-door delivery instead of forcing a locker booking.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CategoryInfoPage;
