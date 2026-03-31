import { motion } from "framer-motion";
import { ChevronLeft, Lock, Shield, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

export default function About() {
  const [, navigate] = useLocation();

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">About HigherSelf</h1>
        </div>

        <div className="px-5 py-8 space-y-8 max-w-2xl">
          {/* ── Your Private Vault ─────────────────────────────────────────── */}
          <motion.section
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                <Lock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Your Private Vault</h2>
                <p className="text-sm text-foreground/70 mt-2 leading-relaxed">
                  Every thought you share with HigherSelf is encrypted and stored securely. Your reflections, insights, and conversations are yours alone — no human reads them, and no AI trains on them. This is your vault for honest self-exploration.
                </p>
              </div>
            </div>
          </motion.section>

          {/* ── Encryption-First ────────────────────────────────────────────── */}
          <motion.section
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Encryption-First Design</h2>
                <p className="text-sm text-foreground/70 mt-2 leading-relaxed">
                  Your data is encrypted end-to-end. We don't have backdoors, and we don't sell your data. Privacy isn't a feature we added — it's the foundation we built on. You can reflect authentically knowing your thoughts are protected.
                </p>
              </div>
            </div>
          </motion.section>

          {/* ── Not Medical Advice ──────────────────────────────────────────── */}
          <motion.section
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Important Disclaimer</h2>
                <p className="text-sm text-foreground/70 mt-2 leading-relaxed">
                  HigherSelf is an AI-powered self-reflection tool designed for personal growth and coaching. <strong>It is not a replacement for professional medical advice, diagnosis, or treatment by a licensed therapist.</strong> If you are experiencing a mental health crisis, depression, suicidal thoughts, or any serious condition, please reach out to a healthcare professional or crisis hotline immediately.
                </p>
              </div>
            </div>
          </motion.section>

          {/* ── How It Works ────────────────────────────────────────────────── */}
          <motion.section
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-foreground">How HigherSelf Works</h2>
            <div className="space-y-3">
              {[
                { num: "1", title: "You Reflect", desc: "Share your thoughts, feelings, and questions with your AI mirror." },
                { num: "2", title: "AI Listens", desc: "The AI reflects back insights, patterns, and perspectives to help you see more clearly." },
                { num: "3", title: "You Grow", desc: "Over time, you build self-awareness, emotional clarity, and authentic growth." },
              ].map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold">
                    {step.num}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{step.title}</p>
                    <p className="text-xs text-foreground/60 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── Your Data Rights ────────────────────────────────────────────── */}
          <motion.section
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="space-y-4 bg-muted/30 rounded-2xl p-4"
          >
            <h3 className="font-semibold text-foreground text-sm">Your Data Rights</h3>
            <ul className="space-y-2 text-xs text-foreground/70">
              <li className="flex gap-2">
                <span className="text-violet-600">✓</span>
                <span>You own all your reflections and can export them anytime</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-600">✓</span>
                <span>You can delete your account and all associated data permanently</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-600">✓</span>
                <span>We never sell, share, or train AI models on your data</span>
              </li>
              <li className="flex gap-2">
                <span className="text-violet-600">✓</span>
                <span>You can request a copy of all your data at any time</span>
              </li>
            </ul>
          </motion.section>

          {/* ── Contact ─────────────────────────────────────────────────────── */}
          <motion.section
            custom={5}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-center text-xs text-foreground/50 pb-4"
          >
            <p>
              Questions about privacy or safety? Reach out to us anytime. Your trust is everything to us.
            </p>
          </motion.section>
        </div>
      </div>
    </AppShell>
  );
}
