import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ReadyToGetStarted = () => {
  const navigate = useNavigate();
  const isAuthenticated = false;

  return (
    <section className="relative overflow-hidden bg-book-700 py-16 sm:py-24">
      {/* Decorative circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-white/[0.04] pointer-events-none" />
      <div className="relative z-10 container mx-auto px-4 max-w-2xl text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1] mb-4">
          Ready to<br /><span className="italic text-book-300">Get Started?</span>
        </h2>
        <p className="text-base sm:text-lg text-white/70 leading-relaxed mb-9">
          Join thousands of students already saving money on school items. Join ReBooked Solutions to buy and sell school items securely — and help others do the same.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => navigate(isAuthenticated ? "/create-listing" : "/register")}
            className="bg-white text-book-700 hover:bg-gray-100 font-bold shadow-lg px-9"
          >
            ✦ {isAuthenticated ? "List Your Items" : "Sign Up Free"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/getting-started")}
            className="border-2 border-white/40 text-white hover:bg-white/10 px-9 bg-transparent"
          >
            Getting Started →
          </Button>
        </div>
        <p className="mt-6 text-xs text-white/50">
          Join <span className="text-white/70">thousands</span> of students already saving money on school items
        </p>
      </div>
    </section>
  );
};

export default ReadyToGetStarted;
