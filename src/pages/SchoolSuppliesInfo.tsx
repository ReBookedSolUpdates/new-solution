import React from "react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Backpack,
  Pencil,
  AlertTriangle,
  Check,
  X,
  Sparkles,
  Calculator,
  Laptop,
} from "lucide-react";

const SchoolSuppliesInfo = () => {
  return (
    <Layout>
      <SEO
        title="School Supplies — Stationery, Calculators &amp; More | ReBooked Solutions"
        description="Stationery, calculators, bags, accessories, tech, and music. Rules, guidelines, and what you can buy/sell."
        keywords="school supplies, stationery, Casio calculator, school bags, South Africa"
        url="https://www.rebookedsolutions.co.za/school-supplies-info"
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-book-100 to-white border-b border-gray-100 py-16 text-center">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-1.5 text-book-700 bg-book-50 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Backpack className="w-3.5 h-3.5" /> The Supplies Guide
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Every supply on the <span className="text-book-600">school list.</span>
            </h1>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Clean, functional gear from calculators to art supplies and school bags. Learn the rules for listing and buying stationery.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
              <Button asChild size="default" className="bg-book-600 hover:bg-book-700 text-white rounded-full px-6 font-semibold shadow-md">
                <Link to="/listings">Shop Supplies</Link>
              </Button>
              <Button asChild size="default" variant="outline" className="border-book-600 text-book-700 hover:bg-book-50 rounded-full px-6 font-semibold">
                <Link to="/create-listing">List a Supply</Link>
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
              School supplies cover everything a student needs beyond books and uniform — from pens and calculators to school bags and art equipment. This category is divided into four sub-sections: Stationery, Bags &amp; Accessories, Mathematical &amp; Scientific Equipment, and Technology. Each has specific rules around what may and may not be listed.
            </p>
          </div>

          {/* Subsections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 1. Stationery */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-book-600" /> 1. Stationery
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-gray-600 border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="py-2 px-2.5 font-semibold text-gray-700">What You Can Sell</th>
                      <th className="py-2 px-2.5 font-semibold text-gray-700">Notes / Conditions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Rulers, geometry items</td>
                      <td className="py-2.5 px-2.5">Standard 30cm rulers, geometry sets. Must be intact and legible.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Pencils, pens, markers</td>
                      <td className="py-2.5 px-2.5">New or barely used. Dried-out pens are not allowed.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Notebooks &amp; exercise books</td>
                      <td className="py-2.5 px-2.5">Unused only. Partially used notebooks are not permitted.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Art supplies</td>
                      <td className="py-2.5 px-2.5">Paints, brushes, colour pencils, pastels — state usage level clearly.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Folders, binders, inserts</td>
                      <td className="py-2.5 px-2.5">New or in very good condition. No ripped covers or torn rings.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Geometry sets</td>
                      <td className="py-2.5 px-2.5">Full sets or individual pieces. Must be clean and functional.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Scissors &amp; craft tools</td>
                      <td className="py-2.5 px-2.5">Standard school scissors. Must be safe — no exposed sharp edges.</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Correction fluid &amp; tape</td>
                      <td className="py-2.5 px-2.5">Sealed / new only. Open correction fluid has a short shelf life.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Bags & Accessories */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Backpack className="w-5 h-5 text-book-600" /> 2. Bags &amp; Accessories
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-gray-600 border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="py-2 px-2.5 font-semibold text-gray-700">What You Can Sell</th>
                      <th className="py-2 px-2.5 font-semibold text-gray-700">Notes / Conditions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">School backpacks</td>
                      <td className="py-2.5 px-2.5">Any brand, any size. Must be clean, with intact zips and no major tears.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Lunch boxes &amp; bottles</td>
                      <td className="py-2.5 px-2.5">Must be food-safe and thoroughly cleaned. No lingering odours.</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Pencil cases</td>
                      <td className="py-2.5 px-2.5">Any style. Must be empty and clean.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Mathematical & Scientific Equipment */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-book-600" /> 3. Mathematical &amp; Scientific Equipment
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-gray-600 border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="py-2 px-2.5 font-semibold text-gray-700">What You Can Sell</th>
                      <th className="py-2 px-2.5 font-semibold text-gray-700">Notes / Conditions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Scientific calculators</td>
                      <td className="py-2.5 px-2.5">Casio, Sharp, HP — exam-approved models only. Battery included preferred.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Graphic calculators</td>
                      <td className="py-2.5 px-2.5">State if Texas Instruments, Casio or other brand. Include manual if available.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Drawing instruments</td>
                      <td className="py-2.5 px-2.5">T-squares, compasses, technical drawing kits. Functional and complete.</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Lab equipment (basic)</td>
                      <td className="py-2.5 px-2.5">Measuring cylinders, safety goggles, aprons — school-grade items only.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Technology */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Laptop className="w-5 h-5 text-book-600" /> 4. Technology
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-gray-600 border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="py-2 px-2.5 font-semibold text-gray-700">What You Can Sell</th>
                      <th className="py-2 px-2.5 font-semibold text-gray-700">Notes / Conditions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">USB / flash drives</td>
                      <td className="py-2.5 px-2.5">Must be tested and working. State capacity clearly.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Headphones / earphones</td>
                      <td className="py-2.5 px-2.5">Used audio accessories allowed — must be sanitised before listing.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Basic laptops &amp; tablets</td>
                      <td className="py-2.5 px-2.5">Functional devices with accurate specs. No cracked screens or dead batteries.</td>
                    </tr>
                    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Laptop bags &amp; sleeves</td>
                      <td className="py-2.5 px-2.5">Protective sleeves and bags for devices. Good condition only.</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-2.5 font-medium text-gray-900">Charging cables &amp; adapters</td>
                      <td className="py-2.5 px-2.5">Working cables only. No frayed or damaged cables.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* What Is Banned */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
              <X className="w-6 h-6" /> What Is Banned
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600 border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="py-2.5 px-3 font-semibold text-gray-700">Banned Item</th>
                    <th className="py-2.5 px-3 font-semibold text-gray-700">Why It's Not Allowed</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-bold text-gray-900">Used consumables (pens, glue, fluid)</td>
                    <td className="py-3 px-3">Once opened and used, liquid/paste items cannot be resold for hygiene and quality.</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-bold text-gray-900">Partially used notebooks / books</td>
                    <td className="py-3 px-3">Buyers cannot use pages already written in. Sell new notebooks only.</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-bold text-gray-900">Broken or faulty electronics</td>
                    <td className="py-3 px-3">Faulty calculators, dead tablets, cracked screens — must not be listed as working.</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-bold text-gray-900">Expired/dried art supplies</td>
                    <td className="py-3 px-3">Dried-out paint, expired adhesives, or mouldy brushes are not permitted.</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-bold text-gray-900">Sharp tools without safe packaging</td>
                    <td className="py-3 px-3">X-Acto knives, box cutters, or exposed compasses must be safely wrapped.</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-bold text-gray-900">Uncertified chargers / adapters</td>
                    <td className="py-3 px-3">Generic chargers without SABS/CE markings pose severe fire and safety risks.</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-bold text-gray-900">Personal hygiene items</td>
                    <td className="py-3 px-3">Hand sanitisers, soaps, or personal care products are outside the supplies scope.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Listing Tips */}
          <div className="bg-gradient-to-r from-book-100 to-white border border-book-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-book-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-book-700" />
              Listing &amp; Selling Tips
            </h2>
            <ul className="space-y-3 text-sm text-book-955 list-disc list-inside">
              <li><strong>Bundle stationery sets:</strong> Pair items like rulers, compasses, protractors, and set squares together for quicker sales.</li>
              <li><strong>Calculators:</strong> Always test all functions, ensure the battery is working, and photograph the model number clearly.</li>
              <li><strong>Clean presentation:</strong> Clean and wipe down every item before photographing — visual appeal sells.</li>
              <li><strong>Electronics:</strong> Include original accessories (like chargers or sleeves) to increase value.</li>
              <li><strong>Bags:</strong> Photograph all zips, straps, pockets, and interior compartments. Hide nothing!</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SchoolSuppliesInfo;
