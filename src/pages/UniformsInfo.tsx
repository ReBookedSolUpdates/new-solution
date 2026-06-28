import React from "react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Shirt,
  ArrowRight,
  Ruler,
  WashingMachine,
  Tag,
  AlertTriangle,
  ShieldCheck,
  Check,
  X,
  Sparkles,
} from "lucide-react";

const UniformsInfo = () => {
  return (
    <Layout>
      <SEO
        title="School Uniforms — Buying &amp; Selling Guide | ReBooked Solutions"
        description="Buy and sell second-hand school uniforms. Check grades, rules, allowed items, and condition requirements."
        keywords="school uniforms, blazer, school shoes, sports kit, buy uniforms, sell uniforms"
        url="https://www.rebookedsolutions.co.za/uniforms-info"
      />

      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-book-100 to-white border-b border-gray-100 py-16 text-center">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-1.5 text-book-700 bg-book-50 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Shirt className="w-3.5 h-3.5" /> The Uniform Guide
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Wear it. Outgrow it. <span className="text-book-600">Pass it on.</span>
            </h1>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              School &amp; sports uniforms — Grades, rules &amp; guidelines. Turn outgrown uniforms into affordable opportunities for other South African families.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
              <Button asChild size="default" className="bg-book-600 hover:bg-book-700 text-white rounded-full px-6 font-semibold shadow-md">
                <Link to="/listings">Browse Uniforms</Link>
              </Button>
              <Button asChild size="default" variant="outline" className="border-book-600 text-book-700 hover:bg-book-50 rounded-full px-6 font-semibold">
                <Link to="/create-listing">List a Piece</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-12">
          {/* Overview Section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-book-600" />
              Overview
            </h2>
            <p className="text-gray-600 text-base leading-relaxed">
              ReBooked Solutions allows the buying and selling of second-hand school uniforms to make quality education accessible and affordable for every South African family. Uniforms are one of the fastest-moving categories on the platform — but strict condition and listing standards apply to protect buyers and keep the marketplace trustworthy.
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
                      <th className="py-2.5 px-3 font-semibold text-gray-700">Item</th>
                      <th className="py-2.5 px-3 font-semibold text-gray-700">Notes / Conditions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">School shirts / blouses</td>
                      <td className="py-3 px-3">Any curriculum school. Must be clearly identified by school name in listing.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">School trousers &amp; skirts</td>
                      <td className="py-3 px-3">Any style — grey, navy, black. State waist/length size accurately.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">School dresses / tunics</td>
                      <td className="py-3 px-3">Common in primary schools. Include school name and size.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">School jerseys &amp; blazers</td>
                      <td className="py-3 px-3">High-value items — photograph badges and crests clearly.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">School sports kit</td>
                      <td className="py-3 px-3">Rugby, soccer, netball, athletics uniforms. Include club/team name.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">School tie &amp; belt</td>
                      <td className="py-3 px-3">Minor accessories — must be clean and undamaged.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">School tracksuit</td>
                      <td className="py-3 px-3">Official branded tracksuits only. No generic tracksuits as 'school kit'.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">School hat / cap</td>
                      <td className="py-3 px-3">Sun hats, caps with school branding. Hygiene rules apply.</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">School socks &amp; stockings</td>
                      <td className="py-3 px-3">Sealed/new only. Used socks and stockings are NOT permitted.</td>
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
                      <td className="py-3 px-3 font-medium text-gray-900">Used socks, underwear &amp; tights</td>
                      <td className="py-3 px-3">Hygiene and health reasons — no exceptions whatsoever.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Damaged / heavily stained items</td>
                      <td className="py-3 px-3">Torn seams, visible holes, or permanent stains — not allowed.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Counterfeit / fake school crests</td>
                      <td className="py-3 px-3">Forged or unofficial badges mislead buyers and breach school policy.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Private school items (restrictions)</td>
                      <td className="py-3 px-3">Some private schools prohibit third-party resale. Check school policy first.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Defaced name tags</td>
                      <td className="py-3 px-3">Labels must be intact or cleanly removed — scratched-out names suggest tampering.</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">Formal university gowns / robes</td>
                      <td className="py-3 px-3">Academic regalia is not within the school uniform category scope.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Condition Grading Guide */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Ruler className="w-6 h-6 text-book-600" />
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
                    <td className="py-3.5 px-3">Worn once or twice. No marks, pulls, or fading. Original shape retained.</td>
                    <td className="py-3.5 px-3"><span className="text-green-700 bg-green-50 px-2.5 py-1 rounded-full text-xs font-semibold">Yes — premium price</span></td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3.5 px-3 font-bold text-gray-900">Good</td>
                    <td className="py-3.5 px-3">Gently used. Minor wash-fade only. No visible stains or damage.</td>
                    <td className="py-3.5 px-3"><span className="text-green-700 bg-green-50 px-2.5 py-1 rounded-full text-xs font-semibold">Yes</span></td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3.5 px-3 font-bold text-gray-900">Fair</td>
                    <td className="py-3.5 px-3">Visible wear, slight fading, or small marks. Must be disclosed in listing.</td>
                    <td className="py-3.5 px-3"><span className="text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full text-xs font-semibold">Yes — disclose defects</span></td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-3 font-bold text-gray-950">Poor</td>
                    <td className="py-3.5 px-3">Significant staining, thinning fabric, visible repairs, or broken zips.</td>
                    <td className="py-3.5 px-3"><span className="text-red-700 bg-red-50 px-2.5 py-1 rounded-full text-xs font-semibold">No — not listable</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Listing Tips */}
          <div className="bg-gradient-to-r from-book-100 to-white border border-book-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-book-900 flex items-center gap-2">
              <WashingMachine className="w-6 h-6 text-book-700" />
              Listing &amp; Selling Tips
            </h2>
            <ul className="space-y-3 text-sm text-book-950 list-disc list-inside">
              <li><strong>Always include the school name in your title:</strong> Parents specifically search by school name.</li>
              <li><strong>Photograph the crest/badge clearly:</strong> This is the number one detail buyers look for to verify authenticity.</li>
              <li><strong>Provide exact measurements:</strong> Size labels vary greatly between brands and schools — provide chest/waist/height measurements.</li>
              <li><strong>Wash and iron before listing:</strong> Clean, well-presented uniforms sell up to 3 times faster!</li>
              <li><strong>Be transparent about name labels:</strong> Inform buyers if name tags have been removed or altered.</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UniformsInfo;
