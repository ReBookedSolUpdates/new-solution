import { BookOpen, GraduationCap, Home, ExternalLink } from "lucide-react";

const ecosystemItems = [
  {
    name: "ReBooked Solutions",
    tagline: "The Marketplace",
    description:
      "South Africa's leading student marketplace for textbooks, uniforms, stationery, sports and extracurricular gear. Buy and sell secondhand school items — all transactions secured with buyer protection and real-time logistics.",
    icon: BookOpen,
    iconBg: "bg-book-100",
    iconColor: "text-book-600",
    href: "https://www.rebookedsolutions.co.za/",
    internal: true,
    tint: "bg-gradient-to-br from-book-100 to-book-100/50",
    dotColor: "bg-book-500",
    dividerColor: "bg-book-300",
    nameHighlight: "text-book-600",
  },
  {
    name: "ReBooked Genius",
    tagline: "AI Study Companion",
    description:
      "AI-powered learning for South African students. Practice with real CAPS, IEB & NSC exam questions, get instant feedback, access AI-generated study notes, and master your syllabus with a personal AI tutor — available 24/7.",
    icon: GraduationCap,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    href: "https://genius.rebookedsolutions.co.za/",
    internal: false,
    tint: "bg-gradient-to-br from-blue-50 to-book-100/30",
    dotColor: "bg-book-600",
    dividerColor: "bg-book-400",
    nameHighlight: "text-book-600",
  },
  {
    name: "ReBooked Living",
    tagline: "Student Accommodation",
    description:
      "Discover student-friendly accommodation near South African universities. Browse verified listings with photos, reviews, and full location details — all in one place.",
    icon: Home,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    href: "https://living.rebookedsolutions.co.za/",
    internal: false,
    tint: "bg-gradient-to-br from-green-50 to-book-100/30",
    dotColor: "bg-book-800",
    dividerColor: "bg-book-700",
    nameHighlight: "text-book-800",
  },
];

const EcosystemSection = () => (
  <section className="py-16 sm:py-24 bg-white">
    <div className="container mx-auto px-4 max-w-6xl">
      {/* Heading */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <span className="inline-flex items-center gap-1.5 bg-book-100 text-book-700 border border-book-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
          The Ecosystem
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          The <span className="text-book-600">ReBooked Solutions</span> Ecosystem
        </h2>
        <p className="text-gray-500 leading-relaxed">
          Three platforms, one mission — making education more accessible and affordable for every South African student.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ecosystemItems.map((item) => (
          <a
            key={item.name}
            href={item.internal ? undefined : item.href}
            target={item.internal ? undefined : "_blank"}
            rel={item.internal ? undefined : "noopener noreferrer"}
            onClick={item.internal ? (e) => e.preventDefault() : undefined}
            className={`relative flex flex-col rounded-xl border-2 border-gray-200 p-8 transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 cursor-pointer overflow-hidden ${item.tint}`}
          >
            {/* Status dot */}
            <div className={`absolute top-5 right-5 w-2.5 h-2.5 rounded-full ${item.dotColor}`} />

            {/* Superlabel */}
            <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-gray-400 mb-2">
              {item.tagline}
            </span>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {item.name.replace("ReBooked ", "ReBooked ")
                .split("ReBooked ").map((part, i) =>
                  i === 0 ? null : (
                    <span key={i}>ReBooked <span className={item.nameHighlight}>{part}</span></span>
                  )
                )}
            </h3>
            <div className={`w-10 h-[2px] rounded-full ${item.dividerColor} mb-4`} />
            <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-6">
              {item.description}
            </p>

            {!item.internal && (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-book-700 bg-white rounded-lg border border-book-300 px-4 py-2 w-fit">
                Visit Site <ExternalLink className="h-3.5 w-3.5" />
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  </section>
);

export default EcosystemSection;
