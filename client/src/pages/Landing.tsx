import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6 },
  }),
};

export default function Landing() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Set SEO title and meta description
    document.title = "Higher Self — Your AI Mirror for Personal Growth";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Meet your AI Mirror — a personalized guide to emotional maturity, inner peace, and authentic living. Daily growth through reflection and wisdom."
      );
    }
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute(
        "content",
        "personal growth, emotional maturity, AI coach, self-awareness, inner peace, daily reflection, mindfulness, authentic living"
      );
    }
  }, []);

  useEffect(() => {
    // Show error toast if OAuth callback failed
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth_error") === "1") {
      toast.error("Sign-in failed. Please try again.");
      // Clean up the URL
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Check if onboarding is needed
      if (!(user as any)?.onboardingCompleted) {
        navigate("/onboarding");
      } else {
        navigate("/home");
      }
    }
  }, [isAuthenticated, loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-aurora flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-primary text-4xl font-serif"
        >
          ✦
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aurora flex flex-col items-center justify-between px-6 py-12 max-w-[480px] mx-auto">
      {/* Top ornament */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="flex flex-col items-center gap-3"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center glow-gold">
            <span className="text-3xl">✦</span>
          </div>
          <div className="absolute -inset-2 rounded-full border border-primary/10 animate-pulse" />
        </div>
        <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Higher Self</p>
      </motion.div>

      {/* Main content */}
      <div className="flex flex-col items-center text-center gap-8 max-w-sm">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
          <h1 className="text-5xl font-serif font-light leading-tight text-foreground">
            Become who you
            <br />
            <span className="text-gold-gradient italic">were meant to be</span>
          </h1>
          <h2 className="text-lg font-light text-muted-foreground mt-4">
            Transform your life with personalized AI guidance
          </h2>
        </motion.div>

        <motion.p
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-muted-foreground text-base leading-relaxed font-light"
        >
          Your AI mirror — a higher, more connected version of you — guides you toward inner peace, emotional maturity, and authentic living. Track your growth across life domains, reflect daily, and evolve into your best self.
        </motion.p>

        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3 w-full"
        >
          <a
            href={getLoginUrl()}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-medium text-base tracking-wide text-center glow-gold hover:bg-primary/90 transition-all duration-200 active:scale-95"
          >
            Begin Your Journey
          </a>
          <p className="text-xs text-muted-foreground">
            Free to start. Your data stays private.
          </p>
        </motion.div>
      </div>

      {/* Features */}
      <motion.div
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4 w-full"
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            { emoji: "🪞", label: "AI Mirror" },
            { emoji: "🌱", label: "Daily Growth" },
            { emoji: "✨", label: "Inner Peace" },
          ].map((f) => (
            <div key={f.label} className="glass rounded-2xl p-3 flex flex-col items-center gap-2">
              <span className="text-2xl">{f.emoji}</span>
              <span className="text-xs text-muted-foreground font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
