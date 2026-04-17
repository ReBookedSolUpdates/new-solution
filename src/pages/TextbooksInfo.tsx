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
    { name: "CAPS", desc: "Grade R–12 South African national curriculum. Most common." },
    { name: "IEB", desc: "Independent Examinations Board. Used by many private high schools." },
    { name: "Cambridge", desc: "International — IGCSE, AS & A Levels. Common in private schools." },
  ];

  return (
    <Layout>
      <SEO
        title="Textbooks Guide | ReBooked Solutions"
        description="Everything you need to know about buying and selling textbooks on ReBooked — types, subjects, curricula (CAPS, IEB, Cambridge), grades & university years."
        keywords="textbooks, CAPS, IEB, Cambridge, study guides, past papers, set works, university course books, South Africa"
        url="https://www.rebookedsolutions.co.za/textbooks-info"
      />

      {/* Hero */}
      <section className="bg-book-50 border-b border-book-100">
        <div className="container mx-auto px-4 py-14 sm:py-20 max-w-6xl">
          <div className="max-w-3xl">
            <Badge className="bg-book-100 text-book-700 hover:bg-book-200 mb-4">
              <BookOpen className="h-3.5 w-3.5 mr-1" /> Category Guide
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Textbooks on ReBooked
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              From thick CAPS Grade 12 hardcovers to slim study guides and university course books — find or sell every kind of textbook used by South African students.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-book-600 hover:bg-book-700">
                <Link to="/listings">
                  Browse Textbooks
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-book-300 text-book-700 hover:bg-book-50">
                <Link to="/create-listing">List a Textbook</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-6xl py-14 sm:py-20 space-y-20">
        {/* Types of Textbooks */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Types of Textbooks</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Different formats, thicknesses and uses — know exactly what you're listing or buying.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {textbookTypes.map((t) => (
              <Card key={t.name} className="border-book-100 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-book-100 text-book-700 flex items-center justify-center mb-3">
                    {t.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{t.name}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Subjects */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Common Subjects</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Every subject taught in SA schools and at most universities — list yours under the right category.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjects.map((s) => (
              <div key={s.name} className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-book-300 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-book-50 text-book-600 flex items-center justify-center flex-shrink-0">
                  {s.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">{s.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{s.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Curricula */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Curricula We Support</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Tag your listing with the correct curriculum so buyers can find exactly what their school uses.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {curricula.map((c) => (
              <Card key={c.name} className="border-book-200">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-book-600 text-white flex items-center justify-center mb-3">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{c.name}</h3>
                  <p className="text-sm text-gray-600">{c.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Levels */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Grades & University Years</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Filter and tag from Grade R right through to fourth-year university and postgrad.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="border-book-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <School className="h-6 w-6 text-book-600" />
                  <h3 className="font-bold text-gray-900">School Grades</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["Grade R", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"].map((g) => (
                    <span key={g} className="text-xs bg-book-50 text-book-700 px-2.5 py-1.5 rounded text-center font-medium">{g}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border-book-100">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <GraduationCap className="h-6 w-6 text-book-600" />
                  <h3 className="font-bold text-gray-900">University Levels</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["1st Year", "2nd Year", "3rd Year", "4th Year / Honours", "Masters", "PhD"].map((g) => (
                    <span key={g} className="text-xs bg-book-50 text-book-700 px-2.5 py-1.5 rounded text-center font-medium">{g}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Tips */}
        <section className="bg-book-50 rounded-3xl p-8 sm:p-12 border border-book-100">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-book-600 text-white flex items-center justify-center">
                <Lightbulb className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Tips Before You List or Buy</h2>
            </div>
            <ul className="space-y-3">
              {[
                "Check the edition number — newer editions often replace older ones in syllabi.",
                "Note the ISBN if you can — it helps buyers find the exact book.",
                "List the condition honestly: New, Good, Better, Average, Below Average.",
                "Mention if there's writing, highlighting or missing pages.",
                "For sets (e.g. textbook + workbook), list them together to sell faster.",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-book-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* What's NOT allowed */}
        <section className="bg-amber-50 rounded-2xl p-8 border border-amber-200">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-amber-900 mb-2">Not Allowed</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                Photocopied or pirated books, scanned PDFs, water-damaged or mouldy books, and books missing more than 5% of pages.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <Sparkles className="h-10 w-10 text-book-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Ready to Browse or List?</h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-6">
            Join thousands of South African students saving and earning on ReBooked.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-book-600 hover:bg-book-700">
              <Link to="/listings">Browse Textbooks <ArrowRight className="ml-2 h-4 w-4" /></Link>
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

export default TextbooksInfo;
