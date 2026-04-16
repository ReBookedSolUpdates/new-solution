import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ReadyToGetStarted = () => {
  const navigate = useNavigate();
  const isAuthenticated = false;

  return (
    <section className="relative overflow-hidden bg-book-600 py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-3xl animate-[spin_170s_linear_infinite]" />
        <div className="absolute bottom-10 right-10 h-52 w-52 rounded-full bg-book-900/10 blur-3xl animate-[spin_140s_linear_infinite]" />
      </div>
      <div className="relative z-10 container mx-auto px-4 max-w-4xl lg:max-w-6xl text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] mb-4">
          Ready to<br /><span className="italic text-book-100">Get Started?</span>
        </h2>
        <p className="text-base md:text-lg lg:text-xl text-white/80 leading-relaxed mb-9 max-w-3xl mx-auto">
          Join thousands of students already saving money on school items. Join ReBooked Solutions to buy and sell school items securely — and help others do the same.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => navigate(isAuthenticated ? "/create-listing" : "/register")}
            className="bg-white text-book-600 hover:bg-gray-100 font-bold shadow-lg px-9"
          >
            {isAuthenticated ? "List Your Items" : "Sign Up Free"}
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
