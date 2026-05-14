import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Landing() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = "Mentrove — Your AI Mirror for Personal Growth";
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
      <div
        className="h-dvh flex items-center justify-center"
        style={{ background: "oklch(0.05 0.02 260)" }}
      >
        <motion.img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663398434536/LQwmD5t86EFFZjkEDkXbgz/mentrove-icon-transparent-XGQUfu4fN7im4fQNKmSvzr.webp"
          alt="Mentrove"
          className="w-20 h-20 rounded-full object-cover"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.92, 1.08, 0.92] }}
          transition={{ repeat: Infinity, duration: 2.4 }}
          style={{ filter: "drop-shadow(0 0 24px oklch(0.55 0.18 295 / 0.6))" }}
        />
      </div>
    );
  }

  return (
    <div
      className="h-dvh flex flex-col items-center justify-between max-w-[480px] mx-auto w-full px-8 py-12 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, oklch(0.22 0.12 295 / 0.9) 0%, oklch(0.08 0.04 270) 60%, oklch(0.05 0.02 260) 100%)",
      }}
    >
      {/* ── Top spacer ────────────────────────────────────────────────────── */}
      <div />

      {/* ── Brand lockup (mandala + wordmark + tagline) ───────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        className="flex flex-col items-center gap-6 text-center"
      >
        {/* Mandala with pulsing rings */}
        <div className="relative">
          <motion.img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663398434536/LQwmD5t86EFFZjkEDkXbgz/mentrove-icon-transparent-XGQUfu4fN7im4fQNKmSvzr.webp"
            alt="Mentrove"
            className="w-44 h-44 object-cover rounded-full"
            style={{ filter: "drop-shadow(0 0 40px oklch(0.55 0.18 295 / 0.7))" }}
          />
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.08, 0.3] }}
            transition={{ repeat: Infinity, duration: 3.5 }}
            className="absolute -inset-5 rounded-full"
            style={{ border: "1px solid oklch(0.55 0.18 295 / 0.25)" }}
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.04, 0.15] }}
            transition={{ repeat: Infinity, duration: 3.5, delay: 0.5 }}
            className="absolute -inset-10 rounded-full"
            style={{ border: "1px solid oklch(0.55 0.18 295 / 0.12)" }}
          />
        </div>

        {/* Wordmark */}
        <div className="space-y-2">
          <h1
            className="text-5xl tracking-[0.25em] font-light"
            style={{
              color: "oklch(0.96 0.02 80)",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              textShadow: "0 0 30px oklch(0.55 0.18 295 / 0.4)",
            }}
          >
            MENTR
            <svg width="42" height="42" viewBox="0 0 24 24" className="inline-block align-middle -mt-1" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="11" stroke="oklch(0.70 0.12 290)" strokeWidth="0.3" opacity="0.4" />
              <circle cx="12" cy="12" r="10" stroke="oklch(0.85 0.04 270)" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="6.5" stroke="oklch(0.70 0.10 290)" strokeWidth="0.8" />
              <path d="M12 7 L12.8 11.2 L17 12 L12.8 12.8 L12 17 L11.2 12.8 L7 12 L11.2 11.2 Z" fill="oklch(0.90 0.05 270)" opacity="0.9" />
              <circle cx="12" cy="12" r="1.2" fill="oklch(0.95 0.02 270)" />
            </svg>
            VE
          </h1>
          <div
            className="h-px w-48 mx-auto"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.55 0.18 295 / 0.5), transparent)",
            }}
          />
          <p
            className="text-base font-light leading-relaxed max-w-xs mx-auto"
            style={{ color: "oklch(0.72 0.06 295)", letterSpacing: "0.05em" }}
          >
            Your AI mirror guides you toward inner peace, emotional maturity, and authentic living.
          </p>
        </div>
      </motion.div>

      {/* ── Bottom: CTA + FAQ ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="w-full space-y-4"
      >
        {/* CTA button */}
        <a
          href={getLoginUrl()}
          className="block w-full py-4 rounded-2xl text-base font-semibold tracking-wide text-center transition-all duration-200 active:scale-95"
          style={{
            background: "linear-gradient(135deg, oklch(0.55 0.18 185), oklch(0.62 0.16 170))",
            color: "oklch(0.98 0.01 185)",
            boxShadow: "0 0 32px oklch(0.55 0.18 185 / 0.4)",
            border: "none",
          }}
        >
          Start My Journey →
        </a>

        {/* Subtext */}
        <p
          className="text-center text-xs"
          style={{ color: "oklch(0.5 0.06 295)" }}
        >
          Free to start · Your data stays private
        </p>

        {/* FAQ link */}
        <div className="text-center pt-1">
          <a
            href="/faq"
            className="text-xs tracking-widest uppercase transition-opacity hover:opacity-80"
            style={{ color: "oklch(0.55 0.1 295)", letterSpacing: "0.15em" }}
          >
            Safety & FAQ
          </a>
        </div>
      </motion.div>
    </div>
  );
}
