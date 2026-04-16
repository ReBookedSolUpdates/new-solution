import { Package, Search, TrendingDown } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Package,
    title: "List Your Items",
    description:
      "Create a listing for your school items in minutes — textbooks, uniforms, stationery, sports gear and more. Set your price and add photos in under two minutes.",
  },
  {
    number: "02",
    icon: Search,
    title: "Browse & Buy",
    description:
      "Find exactly what you need with smart category search and filters. All transactions are secured and backed and trusted by real students.",
  },
  {
    number: "03",
    icon: TrendingDown,
    title: "Save Money",
    description:
      "Buyers save on school costs. Sellers earn from items they no longer need. Everyone wins — and money stays in the student community.",
  },
];

const HowItWorks = () => (
  <section className="py-20 sm:py-28 bg-gray-50">
    <div className="container mx-auto px-4 max-w-6xl lg:max-w-7xl">
      {/* Header */}
      <div className="text-center mb-16 lg:mb-20">
        <span className="inline-flex items-center gap-1.5 bg-book-100 text-book-700 border border-book-300 text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
          Simple Process
        </span>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-3">
          Simple from start to finish.
        </h2>
        <p className="text-gray-500 text-lg md:text-xl max-w-3xl mx-auto">
          Three simple steps to buy or sell school items on ReBooked Solutions.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
        {/* Horizontal connector line (desktop only) */}
        <div className="hidden md:block absolute top-10 left-[calc(16.6%+20px)] right-[calc(16.6%+20px)] h-[2px] bg-book-300" />

        {steps.map((step) => (
          <div key={step.number} className="flex flex-col items-center text-center px-4 md:px-8 relative">
            {/* Large numbered circle */}
            <div className="relative z-10 w-24 h-24 md:w-28 md:h-28 rounded-full bg-book-600 flex items-center justify-center shadow-lg shadow-book-600/30 mb-6">
                <span className="text-3xl md:text-4xl font-bold text-white">{step.number}</span>
                {/* Small icon badge */}
                <div className="absolute -top-2 -right-2 w-9 h-9 md:w-10 md:h-10 bg-white rounded-full border-2 border-book-300 flex items-center justify-center">
                  <step.icon className="h-4 w-4 md:h-5 md:w-5 text-book-700" />
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-base md:text-lg text-gray-500 leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
