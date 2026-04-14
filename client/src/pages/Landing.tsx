import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.14, duration: 0.55 },
  }),
};

export default function Landing() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = "Higher Self — Your AI Mirror for Personal Growth";
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth_error") === "1") {
      toast.error("Sign-in failed. Please try again.");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (!(user as any)?.onboardingCompleted) {
        navigate("/onboarding");
      } else {
        navigate("/home");
      }
    }
  }, [isAuthenticated, loading, user]);

  if (loading) {
    return (
      <div className="h-dvh bg-aurora flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.05, 0.95] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
          className="text-primary text-4xl font-serif"
        >
          ✦
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="h-dvh flex flex-col items-center justify-between px-6 py-12 max-w-[480px] mx-auto overflow-y-auto"
      style={{
        background:
          "radial-gradient(ellipse at 20% 0%, oklch(0.46 0.14 185 / 0.07) 0%, transparent 50%), " +
          "radial-gradient(ellipse at 80% 15%, oklch(0.62 0.14 155 / 0.07) 0%, transparent 50%), " +
          "oklch(0.98 0.008 80)",
      }}
    >
      {/* ── Top logo mark ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.75 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="flex flex-col items-center gap-3"
      >
        <div className="relative">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.46 0.14 185 / 0.15), oklch(0.62 0.14 155 / 0.12))",
              border: "1.5px solid oklch(0.46 0.14 185 / 0.25)",
              boxShadow: "0 4px 24px oklch(0.46 0.14 185 / 0.15)",
            }}
          >
            <span className="text-3xl text-violet-gradient">✦</span>
          </div>
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute -inset-3 rounded-full"
            style={{ border: "1px solid oklch(0.46 0.14 185 / 0.2)" }}
          />
        </div>
        <p className="text-xs tracking-[0.35em] text-violet-500 uppercase font-medium">Higher Self</p>
      </motion.div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center gap-8 max-w-sm">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
          <h1 className="text-5xl font-serif font-light leading-tight text-foreground">
            Become who you
            <br />
            <span className="text-violet-gradient italic">were meant to be</span>
          </h1>
          <p className="text-base font-light text-muted-foreground leading-relaxed">
            Your AI mirror guides you toward inner peace, emotional maturity, and authentic living.
          </p>
        </motion.div>

        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3 w-full"
        >
          <a
            href={getLoginUrl()}
            className="w-full py-4 rounded-2xl font-semibold text-base tracking-wide text-center text-white transition-all duration-200 active:scale-95"
            style={{
              background: "linear-gradient(135deg, oklch(0.46 0.14 185), oklch(0.52 0.14 200))",
              boxShadow: "0 6px 28px oklch(0.46 0.14 185 / 0.30)",
            }}
          >
            Begin Your Journey
          </a>
          <p className="text-xs text-muted-foreground">Free to start · Your data stays private</p>
        </motion.div>
      </div>

      {/* ── Feature chips ─────────────────────────────────────────────────── */}
      <motion.div
        custom={2}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4 w-full"
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            { emoji: "🪞", label: "AI Mirror", bg: "bg-violet-50", border: "border-violet-100" },
            { emoji: "🌱", label: "Daily Growth", bg: "bg-emerald-50", border: "border-emerald-100" },
            { emoji: "✨", label: "Inner Peace", bg: "bg-amber-50", border: "border-amber-100" },
          ].map((f) => (
            <div
              key={f.label}
              className={`${f.bg} border ${f.border} rounded-2xl p-3 flex flex-col items-center gap-2`}
            >
              <span className="text-2xl">{f.emoji}</span>
              <span className="text-xs text-foreground font-semibold">{f.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
