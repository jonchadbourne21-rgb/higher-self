import { motion } from "framer-motion";
import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import CrisisDisclaimerFooter from "@/components/CrisisDisclaimerFooter";
import { getLoginUrl } from "@/const";

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
    document.title = "Synapset — AI-Powered Self-Reflection & Personal Growth";
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth_error")) {
      // User cancelled login or auth failed
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/home");
    }
  }, [isAuthenticated, loading, navigate]);

  const loginUrl = getLoginUrl("/home");

  return (
    <div className="min-h-screen bg-aurora flex flex-col items-center justify-center px-5 py-8 gap-12 max-w-[480px] mx-auto">
      {/* ── Hero section ───────────────────────────────────────────────────── */}
      <motion.div
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center text-center gap-6 pt-8"
      >
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-4xl shadow-lg"
            style={{
              boxShadow:
                "0 20px 40px oklch(0.54 0.22 295 / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.4)",
            }}
          >
            ✦
          </div>
          <div
            className="absolute -inset-3 rounded-full"
            style={{ border: "1px solid oklch(0.46 0.20 295 / 0.2)" }}
          />
        </div>
        <p className="text-xs tracking-[0.35em] text-violet-500 uppercase font-medium">Synapset | AI-Supported Self-Therapy 🌱</p>
      </motion.div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center gap-8 max-w-sm">
        {/* ── Privacy & Encryption Badge ─────────────────────────────── */}
        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium"
        >
          <span>🔒</span>
          <span>Encryption-first self-reflection</span>
        </motion.div>

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

        {/* ── Main tagline ────────────────────────────────────────────────── */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          <h1 className="text-4xl font-bold text-foreground leading-tight">
            Process your thoughts, unlock your intuition, and find clarity in minutes.
          </h1>
          <p className="text-sm text-foreground/60 leading-relaxed">
            Private, secure, and built for your evolution
          </p>
        </motion.div>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="w-full space-y-3 pt-2"
        >
          {isAuthenticated ? (
            <button
              onClick={() => navigate("/home")}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg hover:shadow-xl"
            >
              Enter Synapset
            </button>
          ) : (
            <a
              href={loginUrl}
              className="block w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg hover:shadow-xl text-center"
            >
              Begin Your Journey
            </a>
          )}
        </motion.div>
      </div>

      {/* ── Medical Disclaimer Footer ──────────────────────────────────── */}
      <motion.div
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="text-center text-[11px] text-muted-foreground leading-relaxed max-w-sm"
      >
        <p>
          Synapset is an AI-powered self-reflection tool designed for personal growth and coaching. It is not a replacement for professional medical advice, diagnosis, or treatment by a licensed therapist. If you are experiencing a mental health crisis, please contact a healthcare professional or crisis hotline immediately.
        </p>
      </motion.div>
      <CrisisDisclaimerFooter />
    </div>
  );
}
