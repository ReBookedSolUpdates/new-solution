import React from "react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ArrowRight,
  Hash,
  Bookmark,
  AlertTriangle,
  Check,
  X,
  Sparkles,
} from "lucide-react";

const TextbooksInfo = () => {
  return (
    <Layout>
      <SEO
        title="Textbooks Guide — CAPS, IEB, Cambridge &amp; University | ReBooked Solutions"
        description="The complete guide to buying and selling textbooks: editions, condition grading, allowed materials, and ISBN tips."
        keywords="textbooks, CAPS, IEB, Cambridge, university textbooks, study guides, past papers"
        url="https://www.rebookedsolutions.co.za/textbooks-info"
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-book-100 to-white border-b border-gray-100 py-16">
        <div className="container mx-auto px-4 max-w-6xl text-center">
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 bg-book-700 text-white px-4 py-1.5 rounded-full text-xs uppercase tracking-wider font-semibold shadow-sm">
              <BookOpen className="w-4 h-4" /> The Textbook Guide
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Buy &amp; Sell <span className="text-book-600">Textbooks Smarter</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Save on prescribed school and university books, study guides, and prescribed readers — or sell your old books to fund next semester.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button asChild size="lg" className="bg-book-600 hover:bg-book-700 text-white rounded-full px-8 font-semibold shadow-md">
                <Link to="/listings">Browse Textbooks <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-book-600 text-book-700 hover:bg-book-50 rounded-full px-8 font-semibold">
                <Link to="/create-listing">List a Textbook</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-12">
          {/* Overview Section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-book-600" />
              Overview
            </h2>
            <p className="text-gray-600 text-base leading-relaxed">
              Textbooks and books are the core of what ReBooked Solutions was built to solve. New textbooks are brutally expensive for SA families — our marketplace lets students buy quality second-hand books at a fraction of the original price. We cover CAPS, IEB, Cambridge, and university-level material. Clear edition, condition, and curriculum information is mandatory for every listing.
            </p>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* What You Can Sell */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xl font-bold text-green-700 flex items-center gap-2">
                <Check className="w-6 h-6" /> What You Can Sell
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600 border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="py-2.5 px-3 font-semibold text-gray-700">Category</th>
                      <th className="py-2.5 px-3 font-semibold text-gray-700">Notes / Conditions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">CAPS textbooks</td>
                      <td className="py-3 px-3">All Gr 1–12 approved titles. Include subject, grade, and publisher.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">IEB &amp; Cambridge textbooks</td>
                      <td className="py-3 px-3">Clearly state the curriculum — IEB or Cambridge — in the listing title.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">University textbooks</td>
                      <td className="py-3 px-3">Must include institution, module code, and year of study where known.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Study guides &amp; revision books</td>
                      <td className="py-3 px-3">Mind the Gap, X-kit, Impak, Headstart etc. State edition.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Prescribed novels &amp; readers</td>
                      <td className="py-3 px-3">Fiction/poetry prescribed by schools. Include author + school/grade.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Non-fiction reference books</td>
                      <td className="py-3 px-3">Dictionaries, encyclopaedias, atlases, science references.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Language learning books</td>
                      <td className="py-3 px-3">Zulu, Xhosa, Afrikaans, French, etc. Include publisher and level.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Children's picture books</td>
                      <td className="py-3 px-3">Grade R – 3 readers and storybooks in good condition.</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Sheet music &amp; exam prep</td>
                      <td className="py-3 px-3">ABRSM, Unisa music grades, past paper books. State grade/level.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* What Is Banned */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xl font-bold text-red-700 flex items-center gap-2">
                <X className="w-6 h-6" /> What Is Banned
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600 border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="py-2.5 px-3 font-semibold text-gray-700">Item</th>
                      <th className="py-2.5 px-3 font-semibold text-gray-700">Why It's Not Allowed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Photocopied / pirated books</td>
                      <td className="py-3 px-3">Copyright violation — strictly prohibited. Listings will be removed immediately.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Missing/torn pages</td>
                      <td className="py-3 px-3">A book with missing content is not fit for purpose. Not allowed.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Exam answer books / scripts</td>
                      <td className="py-3 px-3">Selling completed exam scripts or answer pads is prohibited.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Illegal or harmful content</td>
                      <td className="py-3 px-3">Books promoting hate speech, violence, or illegal activity are banned.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Outdated editions (undisclosed)</td>
                      <td className="py-3 px-3">Selling an old edition without stating it clearly is considered misleading.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Downloaded digital files</td>
                      <td className="py-3 px-3">PDFs, ePubs, or e-book files — digital resale is not permitted.</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Excessive writing / annotations</td>
                      <td className="py-3 px-3">Heavy annotation throughout that obscures text is not acceptable.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Condition Grading Guide */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bookmark className="w-6 h-6 text-book-600" />
              Condition Grading Guide
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600 border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="py-2.5 px-3 font-semibold text-gray-700">Grade</th>
                    <th className="py-2.5 px-3 font-semibold text-gray-700">Description</th>
                    <th className="py-2.5 px-3 font-semibold text-gray-700">Allowed?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3.5 px-3 font-bold text-gray-900">Like New</td>
                    <td className="py-3.5 px-3">No writing, no highlights, no marks. Cover and spine fully intact.</td>
                    <td className="py-3.5 px-3"><span className="text-green-700 bg-green-50 px-2.5 py-1 rounded-full text-xs font-semibold">Yes — premium price</span></td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3.5 px-3 font-bold text-gray-900">Good</td>
                    <td className="py-3.5 px-3">Minor pencil notes only. Spine intact. Cover at most lightly scuffed.</td>
                    <td className="py-3.5 px-3"><span className="text-green-700 bg-green-50 px-2.5 py-1 rounded-full text-xs font-semibold">Yes</span></td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3.5 px-3 font-bold text-gray-900">Fair</td>
                    <td className="py-3.5 px-3">Some highlighting or writing. All pages present. Disclosed in listing.</td>
                    <td className="py-3.5 px-3"><span className="text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full text-xs font-semibold">Yes — disclose defects</span></td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-3 font-bold text-gray-900">Poor</td>
                    <td className="py-3.5 px-3">Heavy writing, broken spine, water damage, or missing pages.</td>
                    <td className="py-3.5 px-3"><span className="text-red-700 bg-red-50 px-2.5 py-1 rounded-full text-xs font-semibold">No — not listable</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Edition Matters Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 shadow-sm flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-amber-900">Edition Matters</h3>
              <p className="text-sm text-amber-950/90 leading-relaxed">
                Always state the edition number and year on the cover. Curriculum changes mean a 2019 edition may be incompatible with current syllabi. If you're unsure, photograph the title page and let buyers decide. Check what the same book sells for new and price 40–60% below.
              </p>
            </div>
          </div>

          {/* Listing Tips */}
          <div className="bg-gradient-to-r from-book-100 to-white border border-book-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-book-900 flex items-center gap-2">
              <Hash className="w-6 h-6 text-book-700" />
              Listing &amp; Selling Tips
            </h2>
            <ul className="space-y-3 text-sm text-book-950 list-disc list-inside">
              <li><strong>Include the ISBN if visible:</strong> It lets buyers verify the exact edition instantly.</li>
              <li><strong>Photograph key pages:</strong> Capture the cover, spine, and any highlighted/written pages for full transparency.</li>
              <li><strong>University textbooks:</strong> Always include the exact module code (e.g. ACC1011, PHY2020) so students search and match modules perfectly.</li>
              <li><strong>Bundle subject sets:</strong> Pair core textbooks with study guides (e.g. Gr 12 Physical Science + study guide) to sell faster.</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TextbooksInfo;
