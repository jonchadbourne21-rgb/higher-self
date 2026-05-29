import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Check, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/* ── Curated values (grouped for visual appeal) ───────────────────────────── */
const CORE_VALUES = [
  "Authenticity", "Compassion", "Courage", "Creativity", "Discipline",
  "Freedom", "Gratitude", "Growth", "Harmony", "Honesty",
  "Joy", "Kindness", "Love", "Mindfulness",
  "Peace", "Purpose", "Resilience", "Spirituality", "Wisdom",
];

/* ── Intent tiles ─────────────────────────────────────────────────────────── */
const INTENTS = [
  { id: "inner-peace", label: "Inner Peace", emoji: "🧘", desc: "Calm the noise" },
  { id: "clarity", label: "Clarity", emoji: "🔮", desc: "See clearly" },
  { id: "confidence", label: "Confidence", emoji: "⚡", desc: "Own your power" },
  { id: "healing", label: "Healing", emoji: "🌿", desc: "Let go & grow" },
  { id: "focus", label: "Focus", emoji: "🎯", desc: "Lock in" },
];

export default function Onboarding() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);

  /* ── Form state ───────────────────────────────────────────────────────── */
  const [preferredName, setPreferredName] = useState("");
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [oneGoal, setOneGoal] = useState("");

  const utils = trpc.useUtils();
  const completeMutation = trpc.profile.completeOnboarding.useMutation({
    onSuccess: async () => {
      toast.success("Your journey begins now ✦");
      await utils.auth.me.invalidate();
      navigate("/home");
    },
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  const saveSeedIntentMutation = trpc.onboarding.saveSeedIntent.useMutation();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  /* ── Steps ────────────────────────────────────────────────────────────── */
  const steps = [
    { title: "Welcome", subtitle: "Let's personalize your experience" },
    { title: "What Drives You", subtitle: "Pick 3 values that define you" },
    { title: "Your Focus", subtitle: "One thing you want to work on" },
  ];

  const totalSteps = steps.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const canProceed = () => {
    if (step === 0) return preferredName.trim().length > 0 && selectedIntent !== null;
    if (step === 1) return selectedValues.length >= 3;
    if (step === 2) return oneGoal.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    // Save seed intent first
    if (selectedIntent) {
      const intentLabel = INTENTS.find((i) => i.id === selectedIntent)?.label || selectedIntent;
      try {
        await saveSeedIntentMutation.mutateAsync({ seedIntent: intentLabel });
      } catch {
        // Non-critical, continue
      }
    }

    // Complete onboarding with streamlined data
    completeMutation.mutate({
      preferredName,
      coreValues: selectedValues,
      shortTermGoals: oneGoal,
      longTermVision: "",
      beliefs: "",
      domainScores: [
        { domain: "mindset", score: 5 },
        { domain: "relationships", score: 5 },
        { domain: "work", score: 5 },
        { domain: "health", score: 5 },
        { domain: "spirituality", score: 5 },
        { domain: "finances", score: 5 },
      ],
    });
  };

  const toggleValue = (v: string) => {
    setSelectedValues((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : prev.length < 5 ? [...prev, v] : prev
    );
  };

  return (
    <>
      {/* ── Step 0: Name + Intent (splash style) ─────────────────────────── */}
      {step === 0 && (
        <div
          className="h-dvh flex flex-col max-w-[480px] mx-auto px-6 py-8 overflow-y-auto"
          style={{
            background:
              "radial-gradient(ellipse at 50% 20%, oklch(0.22 0.12 295 / 0.9) 0%, oklch(0.08 0.04 270) 60%, oklch(0.05 0.02 260) 100%)",
          }}
        >
          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-500"
                style={{
                  background: i <= step
                    ? "linear-gradient(90deg, oklch(0.55 0.18 185), oklch(0.62 0.16 170))"
                    : "oklch(0.25 0.04 280)",
                }}
              />
            ))}
          </div>

          {/* Mandala */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center mb-4"
          >
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663398434536/LQwmD5t86EFFZjkEDkXbgz/mentrove-icon-transparent-XGQUfu4fN7im4fQNKmSvzr.webp"
              alt="Mirrored"
              className="w-24 h-24 object-cover rounded-full"
              style={{ filter: "drop-shadow(0 0 24px oklch(0.55 0.18 295 / 0.5))" }}
            />
          </motion.div>

          {/* Name input */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2 mb-6"
          >
            <label
              className="text-xs tracking-widest uppercase"
              style={{ color: "oklch(0.65 0.08 295)" }}
            >
              What shall I call you?
            </label>
            <input
              type="text"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="Your name..."
              className="w-full rounded-xl px-4 py-3 text-base focus:outline-none"
              style={{
                background: "oklch(0.14 0.05 295 / 0.6)",
                border: "1px solid oklch(0.45 0.12 295 / 0.4)",
                color: "oklch(0.95 0.02 80)",
                backdropFilter: "blur(12px)",
              }}
              autoFocus
            />
          </motion.div>

          {/* Intent selection */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-3 mb-6"
          >
            <label
              className="text-xs tracking-widest uppercase"
              style={{ color: "oklch(0.65 0.08 295)" }}
            >
              What brings you here?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INTENTS.map((intent) => {
                const selected = selectedIntent === intent.id;
                return (
                  <motion.button
                    key={intent.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSelectedIntent(intent.id)}
                    className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-all duration-200"
                    style={{
                      background: selected
                        ? "oklch(0.55 0.18 185 / 0.15)"
                        : "oklch(0.14 0.05 295 / 0.4)",
                      border: `1px solid ${selected ? "oklch(0.55 0.18 185 / 0.5)" : "oklch(0.30 0.06 295 / 0.3)"}`,
                    }}
                  >
                    <span className="text-xl">{intent.emoji}</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: selected ? "oklch(0.65 0.16 185)" : "oklch(0.88 0.02 270)" }}>
                        {intent.label}
                      </p>
                      <p className="text-xs" style={{ color: "oklch(0.55 0.04 270)" }}>{intent.desc}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleNext}
            disabled={!canProceed()}
            className="w-full py-4 rounded-2xl text-base font-semibold tracking-wide transition-all duration-200 disabled:opacity-40 mb-4"
            style={{
              background: canProceed()
                ? "linear-gradient(135deg, oklch(0.55 0.18 185), oklch(0.62 0.16 170))"
                : "oklch(0.3 0.05 295 / 0.5)",
              color: "oklch(0.98 0.01 185)",
              boxShadow: canProceed() ? "0 0 32px oklch(0.55 0.18 185 / 0.4)" : "none",
            }}
          >
            Continue <ChevronRight size={18} className="inline ml-1" />
          </motion.button>
        </div>
      )}

      {/* ── Steps 1–2: Values & Goal ────────────────────────────────────── */}
      {step > 0 && (
        <div
          className="h-dvh flex flex-col max-w-[480px] mx-auto overflow-hidden"
          style={{ background: "oklch(0.08 0.04 270)" }}
        >
          {/* Progress dots */}
          <div className="flex items-center gap-2 px-6 pt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-500"
                style={{
                  background: i <= step
                    ? "linear-gradient(90deg, oklch(0.55 0.18 185), oklch(0.62 0.16 170))"
                    : "oklch(0.25 0.04 280)",
                }}
              />
            ))}
          </div>

          {/* Header */}
          <div className="px-6 pt-5 pb-2 flex items-center justify-between">
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm flex items-center gap-1 transition-opacity hover:opacity-80"
              style={{ color: "oklch(0.60 0.08 295)" }}
            >
              ← Back
            </button>
            <span className="text-xs tracking-widest uppercase" style={{ color: "oklch(0.50 0.04 270)" }}>
              {step + 1} of {totalSteps}
            </span>
            <div className="w-12" />
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-4 overflow-y-auto scrollbar-hide">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Step header */}
                <div className="space-y-1">
                  <h2
                    className="text-3xl font-serif font-light"
                    style={{ color: "oklch(0.95 0.02 80)" }}
                  >
                    {steps[step].title}
                  </h2>
                  <p className="text-sm" style={{ color: "oklch(0.55 0.04 270)" }}>
                    {steps[step].subtitle}
                  </p>
                </div>

                {/* Step 1: Values */}
                {step === 1 && (
                  <div className="space-y-4">
                    <p className="text-sm" style={{ color: "oklch(0.60 0.06 295)" }}>
                      Pick 3–5 values that resonate with who you are. Your AI mirror uses these to understand you.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CORE_VALUES.map((v) => {
                        const selected = selectedValues.includes(v);
                        return (
                          <motion.button
                            key={v}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleValue(v)}
                            className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                            style={{
                              background: selected
                                ? "linear-gradient(135deg, oklch(0.50 0.14 185), oklch(0.55 0.14 200))"
                                : "oklch(0.14 0.05 295 / 0.5)",
                              border: `1px solid ${selected ? "oklch(0.55 0.14 185 / 0.5)" : "oklch(0.30 0.06 295 / 0.3)"}`,
                              color: selected ? "#fff" : "oklch(0.75 0.04 270)",
                            }}
                          >
                            {selected && <Check size={12} className="inline mr-1" />}
                            {v}
                          </motion.button>
                        );
                      })}
                    </div>
                    {selectedValues.length > 0 && (
                      <p className="text-xs" style={{ color: "oklch(0.65 0.16 185)" }}>
                        {selectedValues.length} selected {selectedValues.length < 3 ? `— pick ${3 - selectedValues.length} more` : "✓"}
                      </p>
                    )}
                  </div>
                )}

                {/* Step 2: One goal */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div
                      className="rounded-2xl p-4"
                      style={{
                        background: "oklch(0.55 0.18 295 / 0.06)",
                        border: "1px solid oklch(0.55 0.18 295 / 0.15)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} style={{ color: "oklch(0.55 0.18 295)" }} />
                        <span className="text-xs font-medium" style={{ color: "oklch(0.65 0.08 295)" }}>
                          Your AI mirror will reference this daily
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: "oklch(0.70 0.06 295)" }}>
                        What's the one thing you most want to change, achieve, or become in the next few months?
                      </p>
                    </div>
                    <textarea
                      value={oneGoal}
                      onChange={(e) => setOneGoal(e.target.value)}
                      placeholder="I want to..."
                      rows={4}
                      className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none"
                      style={{
                        background: "oklch(0.14 0.05 295 / 0.6)",
                        border: "1px solid oklch(0.45 0.12 295 / 0.4)",
                        color: "oklch(0.95 0.02 80)",
                      }}
                      autoFocus
                    />
                    <p className="text-xs" style={{ color: "oklch(0.45 0.04 270)" }}>
                      You can always update this later. Just speak from the heart.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer button */}
          <div className="px-6 pb-8 pt-4">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              disabled={!canProceed() || completeMutation.isPending}
              className="w-full py-4 rounded-2xl text-base font-semibold tracking-wide transition-all duration-200 disabled:opacity-40"
              style={{
                background: canProceed()
                  ? "linear-gradient(135deg, oklch(0.55 0.18 185), oklch(0.62 0.16 170))"
                  : "oklch(0.3 0.05 295 / 0.5)",
                color: "oklch(0.98 0.01 185)",
                boxShadow: canProceed() ? "0 0 32px oklch(0.55 0.18 185 / 0.4)" : "none",
              }}
            >
              {completeMutation.isPending ? (
                <span className="animate-pulse">Setting up your mirror...</span>
              ) : step === totalSteps - 1 ? (
                <>Let's Go <span className="ml-1">✦</span></>
              ) : (
                <>Continue <ChevronRight size={18} className="inline ml-1" /></>
              )}
            </motion.button>
          </div>
        </div>
      )}
    </>
  );
}
