import React from "react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Backpack,
  Pencil,
  Pen,
  PenTool,
  Eraser,
  Calculator,
  Compass,
  Ruler,
  Scissors,
  Paperclip,
  Highlighter,
  NotebookPen,
  Notebook,
  FileText,
  Clipboard,
  PaintBucket,
  Palette,
  Brush,
  FlaskConical,
  Microscope,
  Laptop,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Music,
  Drumstick,
  Box,
} from "lucide-react";

const SchoolSuppliesInfo = () => {
  const stationery = [
    { icon: <Pencil className="h-5 w-5" />, name: "Pencils (HB, 2B, colour)" },
    { icon: <Pen className="h-5 w-5" />, name: "Pens (blue, black, red)" },
    { icon: <Highlighter className="h-5 w-5" />, name: "Highlighters" },
    { icon: <Eraser className="h-5 w-5" />, name: "Erasers & Sharpeners" },
    { icon: <Ruler className="h-5 w-5" />, name: "Rulers (15cm / 30cm)" },
    { icon: <Scissors className="h-5 w-5" />, name: "Scissors" },
    { icon: <Paperclip className="h-5 w-5" />, name: "Glue Sticks & Pritt" },
    { icon: <PenTool className="h-5 w-5" />, name: "Fineliners & Markers" },
  ];

  const mathScience = [
    { icon: <Calculator className="h-5 w-5" />, name: "Casio fx-82ZA Plus", note: "The official SA matric calculator" },
    { icon: <Calculator className="h-5 w-5" />, name: "Graphing Calculators", note: "Casio fx-9860, Texas Instruments" },
    { icon: <Compass className="h-5 w-5" />, name: "Math Sets", note: "Compass, protractor, set squares" },
    { icon: <Ruler className="h-5 w-5" />, name: "Drawing Boards", note: "A3 / A2 for technical drawing" },
    { icon: <FlaskConical className="h-5 w-5" />, name: "Lab Beakers & Test Tubes", note: "For Physical Sciences practicals" },
    { icon: <Microscope className="h-5 w-5" />, name: "Microscopes & Slides", note: "Life Sciences gear" },
  ];

  const paperBooks = [
    { icon: <Notebook className="h-5 w-5" />, name: "A4 Exercise Books (32, 48, 72, 96 pages)" },
    { icon: <NotebookPen className="h-5 w-5" />, name: "Hardcover A4 Notebooks" },
    { icon: <FileText className="h-5 w-5" />, name: "File Paper / Refill Paper" },
    { icon: <FileText className="h-5 w-5" />, name: "Quad-ruled (Maths) books" },
    { icon: <Clipboard className="h-5 w-5" />, name: "A4 Files & Lever Arch (2-ring, 4-ring)" },
    { icon: <FileText className="h-5 w-5" />, name: "Plastic Sleeves & Dividers" },
    { icon: <Box className="h-5 w-5" />, name: "Display Books / Document Folders" },
    { icon: <FileText className="h-5 w-5" />, name: "Sticky Notes & Index Cards" },
  ];

  const artCraft = [
    { icon: <Palette className="h-5 w-5" />, name: "Watercolour & Acrylic Paints" },
    { icon: <Brush className="h-5 w-5" />, name: "Paint Brushes (sets)" },
    { icon: <PaintBucket className="h-5 w-5" />, name: "Crayons, Oil Pastels, Khoki Pens" },
    { icon: <FileText className="h-5 w-5" />, name: "Sketch Pads & Visual Diaries" },
    { icon: <Box className="h-5 w-5" />, name: "Modelling Clay / Polymer" },
    { icon: <Scissors className="h-5 w-5" />, name: "Craft Scissors & Card" },
  ];

  const techMusic = [
    { icon: <Laptop className="h-5 w-5" />, name: "USB Memory Sticks (8GB, 16GB, 32GB)" },
    { icon: <Laptop className="h-5 w-5" />, name: "Headphones / Earphones" },
    { icon: <Music className="h-5 w-5" />, name: "Recorders (descant, alto)" },
    { icon: <Music className="h-5 w-5" />, name: "Guitars, Keyboards (entry-level)" },
    { icon: <Drumstick className="h-5 w-5" />, name: "Drumsticks & practice pads" },
  ];

  return (
    <Layout>
      <SEO
        title="School Supplies Guide | ReBooked Solutions"
        description="Stationery, calculators, files, art supplies, lab gear and more. Find every school supply you need on ReBooked — or sell what you don't."
        keywords="school supplies, stationery, calculator, Casio, files, pens, pencils, art supplies, South Africa"
        url="https://www.rebookedsolutions.co.za/school-supplies-info"
      />

      <section className="bg-book-50 border-b border-book-100">
        <div className="container mx-auto px-4 py-14 sm:py-20 max-w-6xl">
          <div className="max-w-3xl">
            <Badge className="bg-book-100 text-book-700 hover:bg-book-200 mb-4">
              <Backpack className="h-3.5 w-3.5 mr-1" /> Category Guide
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              School Supplies on ReBooked
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              From a Casio fx-82ZA to art kits, lab equipment to A4 files — find or sell every supply on the school list, in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-book-600 hover:bg-book-700">
                <Link to="/listings">
                  Browse Supplies
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-book-300 text-book-700 hover:bg-book-50">
                <Link to="/create-listing">List a Supply</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-6xl py-14 sm:py-20 space-y-20">
        {/* Stationery */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Everyday Stationery</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">The basics — every student needs them, every year.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stationery.map((s) => (
              <div key={s.name} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-book-300 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-book-50 text-book-600 flex items-center justify-center flex-shrink-0">
                  {s.icon}
                </div>
                <span className="text-sm font-medium text-gray-800">{s.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Math & Science */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Maths & Science Equipment</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Calculators, math sets, lab gear — pre-loved at much better prices.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mathScience.map((m) => (
              <Card key={m.name} className="border-book-100 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-book-100 text-book-700 flex items-center justify-center flex-shrink-0">
                      {m.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{m.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{m.note}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Paper & Books */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Paper, Files & Folders</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Exercise books, lever arches, refill paper — all the paper goods on the list.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {paperBooks.map((p) => (
              <div key={p.name} className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-book-300 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-book-50 text-book-600 flex items-center justify-center flex-shrink-0">
                  {p.icon}
                </div>
                <span className="text-sm font-medium text-gray-800">{p.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Art & Craft */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Art & Craft Supplies</h2>
            <p className="text-gray-500">Paints, brushes, pads, clay — for art class or D&T.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {artCraft.map((a) => (
              <div key={a.name} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-book-50 text-center hover:bg-book-100 transition-colors">
                <div className="text-book-600">{a.icon}</div>
                <span className="text-xs font-semibold text-book-800">{a.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tech & Music */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Tech & Music</h2>
            <p className="text-gray-500">USB sticks, headphones, recorders and entry-level instruments.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {techMusic.map((t) => (
              <div key={t.name} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white">
                <div className="w-10 h-10 rounded-lg bg-book-50 text-book-600 flex items-center justify-center">
                  {t.icon}
                </div>
                <span className="text-sm font-medium text-gray-800">{t.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tips */}
        <section className="bg-book-50 rounded-3xl p-8 sm:p-12 border border-book-100">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-book-600 text-white flex items-center justify-center">
                <Lightbulb className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Buying & Selling Tips</h2>
            </div>
            <ul className="space-y-3">
              {[
                "Calculators: include the model number (e.g. Casio fx-82ZA Plus) — buyers search by model.",
                "Specify quantity left (e.g. 'pack of 10, 6 unused').",
                "For files & folders: note the size (A4/A5), ring count, colour and condition of the rings.",
                "Lab equipment: confirm pieces aren't chipped or cracked.",
                "Tech: state battery health and original cables/charger included.",
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
                Used hygiene items (open glue, dried-out markers), opened consumables, broken calculators, expired chemistry reagents, and any sharp items not safely packaged.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <Sparkles className="h-10 w-10 text-book-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Stock Up • Sell What You Don't Need</h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-6">
            Save on stationery and supplies, or earn from items gathering dust.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-book-600 hover:bg-book-700">
              <Link to="/listings">Browse Supplies <ArrowRight className="ml-2 h-4 w-4" /></Link>
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

export default SchoolSuppliesInfo;
