import React from "react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  BookOpen,
  GraduationCap,
  School,
  Library,
  BookMarked,
  PenTool,
  Calculator,
  Beaker,
  Globe,
  Languages,
  Music2,
  Palette,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Microscope,
  TrendingUp,
  Lightbulb,
  Star,
  ShieldCheck,
} from "lucide-react";

const TextbooksInfo = () => {
  const textbookTypes = [
    { icon: <BookOpen className="h-6 w-6" />, name: "Hardcover Textbooks", desc: "Thick, durable spine — most CAPS Grade 8-12 syllabus books, university course books." },
    { icon: <BookMarked className="h-6 w-6" />, name: "Softcover Workbooks", desc: "Thinner, often consumable — Grade R-7 workbooks, study guides, exam pads." },
    { icon: <Bookmark className="h-6 w-6" />, name: "Past Exam Papers", desc: "IEB, CAPS NSC, and Cambridge past papers with memos. Bound or loose-leaf." },
    { icon: <Library className="h-6 w-6" />, name: "Reference Books", desc: "Dictionaries, atlases, encyclopaedias, lab manuals — usually thicker hardcovers." },
    { icon: <PenTool className="h-6 w-6" />, name: "Study Guides", desc: "Mind the Gap, X-Kit Achieve, The Answer Series — typically softcover, ~150-300 pages." },
    { icon: <Layers className="h-6 w-6" />, name: "Set-Work Novels", desc: "Prescribed English/Afrikaans/Zulu literature for Grade 10-12 and university lit courses." },
  ];

  const subjects = [
    { icon: <Calculator className="h-5 w-5" />, name: "Mathematics", note: "Algebra, Calculus, Stats — Pure & Lit" },
    { icon: <Beaker className="h-5 w-5" />, name: "Physical Sciences", note: "Physics & Chemistry combined" },
    { icon: <Microscope className="h-5 w-5" />, name: "Life Sciences", note: "Biology, Genetics, Ecology" },
    { icon: <Globe className="h-5 w-5" />, name: "Geography", note: "Climate, GIS, Mapwork" },
    { icon: <Languages className="h-5 w-5" />, name: "Languages", note: "English HL/FAL, Afrikaans, isiZulu, Sesotho, etc." },
    { icon: <TrendingUp className="h-5 w-5" />, name: "Accounting & Economics", note: "Includes Business Studies, EMS" },
    { icon: <Music2 className="h-5 w-5" />, name: "Music & Dramatic Arts", note: "Theory books, scores, drama scripts" },
    { icon: <Palette className="h-5 w-5" />, name: "Visual Arts & Design", note: "Art history, technique guides" },
  ];

  const curricula = [
    { name: "CAPS", desc: "South African national curriculum (Grade R - 12)" },
    { name: "IEB", desc: "Independent Examinations Board (private schools)" },
    { name: "Cambridge", desc: "International AS/A Levels & IGCSE" },
    { name: "University", desc: "Undergraduate & postgraduate prescribed texts" },
  ];

  const conditions = [
    { label: "New", desc: "Unused, no marks, sealed where applicable.", color: "bg-green-100 text-green-800" },
    { label: "Good", desc: "Light reading wear, clean pages, intact spine.", color: "bg-book-100 text-book-800" },
    { label: "Better", desc: "Some highlighting/notes, all pages present.", color: "bg-amber-100 text-amber-800" },
    { label: "Average", desc: "Visible wear, heavy notes, but fully readable.", color: "bg-orange-100 text-orange-800" },
    { label: "Below Average", desc: "Heavy wear, possibly loose pages — disclose clearly.", color: "bg-red-100 text-red-800" },
  ];

  return (
    <Layout>
      <SEO
        title="Textbooks Guide — CAPS, IEB, Cambridge & University | ReBooked Solutions"
        description="A complete guide to buying and selling textbooks on ReBooked — CAPS, IEB, Cambridge, university prescribed books, study guides and past papers."
        keywords="textbooks, CAPS, IEB, Cambridge, university textbooks, study guides, past papers, South Africa"
        url="https://www.rebookedsolutions.co.za/textbooks-info"
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
                <BookOpen className="h-4 w-4" />
                Category Guide · Textbooks
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-5">
                Every textbook,<br />
                <span className="text-book-600">every curriculum</span>, half the price.
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
                From your Grade 8 maths workbook to a final-year medical textbook — find it pre-loved, list yours, and save thousands every year.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="bg-book-600 hover:bg-book-700 rounded-full px-8">
                  <Link to="/listings">
                    Browse Textbooks
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-book-300 text-book-700 hover:bg-book-50 rounded-full px-8">
                  <Link to="/create-listing">List a Textbook</Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              {[
                { icon: <School className="h-6 w-6" />, label: "CAPS · IEB · Cambridge", sub: "All major SA curricula" },
                { icon: <GraduationCap className="h-6 w-6" />, label: "Grade R → Tertiary", sub: "Every level covered" },
                { icon: <ShieldCheck className="h-6 w-6" />, label: "Buyer Protection", sub: "Money-back guarantee" },
                { icon: <Star className="h-6 w-6" />, label: "Verified Sellers", sub: "Real students & schools" },
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
        {/* Curricula */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Curricula We Support</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">List or find textbooks from any South African or international curriculum.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {curricula.map((c) => (
              <Card key={c.name} className="border-book-100 hover:border-book-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-book-600 mb-2">{c.name}</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{c.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Textbook Types */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Textbook Types</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">From thin softcover workbooks to thick hardcover references — we list it all.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {textbookTypes.map((t) => (
              <Card key={t.name} className="border-book-100 hover:border-book-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-book-100 text-book-700 flex items-center justify-center mb-4">
                    {t.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{t.name}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Subjects */}
        <section className="bg-gradient-to-br from-book-50 via-white to-book-50 rounded-3xl p-8 sm:p-12 border border-book-100">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Popular Subjects</h2>
            <p className="text-gray-600">From the foundation phase through matric and into university.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjects.map((s) => (
              <div
                key={s.name}
                className="flex items-start gap-3 bg-white rounded-2xl p-4 border border-book-100 hover:border-book-300 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-book-100 text-book-700 flex items-center justify-center flex-shrink-0">
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{s.name}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">{s.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Condition Guide */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Condition Guide</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Honest grading helps buyers and sellers — here's how we describe condition.</p>
          </div>
          <div className="space-y-3">
            {conditions.map((c) => (
              <div
                key={c.label}
                className="flex items-start sm:items-center gap-4 p-5 rounded-2xl bg-white border border-book-100 hover:border-book-300 transition-colors"
              >
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 ${c.color}`}>
                  {c.label}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{c.desc}</p>
              </div>
            ))}
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
              <h2 className="text-2xl sm:text-3xl font-bold">Selling Tips</h2>
            </div>
            <ul className="space-y-3">
              {[
                "Include the exact edition, year, and ISBN — buyers search for these.",
                "Photograph the front cover, spine, back cover, and any heavily-marked inside pages.",
                "Mention the curriculum (CAPS / IEB / Cambridge) and specific grade.",
                "List university books with the course code (e.g. ECON1010, BIOL2233).",
                "Be honest about highlighting, missing pages, or a damaged spine — disclosed flaws sell.",
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
                Photocopied or pirated textbooks, books with missing pages, and any material in violation of copyright. Listings will be removed and accounts may be suspended.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <Sparkles className="h-10 w-10 text-book-600 mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Ready to save (or earn)?</h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-8">Join thousands of South African students using ReBooked.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-book-600 hover:bg-book-700 rounded-full px-8">
              <Link to="/listings">
                Browse Textbooks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
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

export default TextbooksInfo;
