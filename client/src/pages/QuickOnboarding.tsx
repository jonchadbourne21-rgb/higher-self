import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

const INTENT_TILES = [
  { id: "inner-peace", label: "Inner Peace", emoji: "🧘", color: "from-violet-400 to-violet-600" },
  { id: "clarity", label: "Clarity", emoji: "🔮", color: "from-blue-400 to-blue-600" },
  { id: "confidence", label: "Confidence", emoji: "⚡", color: "from-amber-400 to-amber-600" },
  { id: "healing", label: "Healing", emoji: "🌿", color: "from-emerald-400 to-emerald-600" },
  { id: "focus", label: "Focus", emoji: "🎯", color: "from-rose-400 to-rose-600" },
];

type Step = "name" | "intent";

export default function QuickOnboarding() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("name");
  const [preferredName, setPreferredName] = useState("");
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = trpc.useUtils();
  const savePreferredNameMutation = trpc.onboarding.savePreferredName.useMutation();
  const saveSeedIntentMutation = trpc.onboarding.saveSeedIntent.useMutation();

  // Redirect logic
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    if (user?.onboardingCompleted) {
      navigate("/home");
      return;
    }
  }, [isAuthenticated, loading, user?.onboardingCompleted, navigate]);

  const handleNameSubmit = async () => {
    const trimmed = preferredName.trim();
    if (!trimmed) {
      toast.error("Please enter your name so we can personalise your experience.");
      return;
    }
    setIsSubmitting(true);
    try {
      await savePreferredNameMutation.mutateAsync({ preferredName: trimmed });
      await utils.auth.me.invalidate();
      setStep("intent");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectIntent = async (intentId: string) => {
    setSelectedIntent(intentId);
    setIsSubmitting(true);
    try {
      const intentLabel = INTENT_TILES.find((t) => t.id === intentId)?.label || intentId;
      await saveSeedIntentMutation.mutateAsync({ seedIntent: intentLabel });
      await utils.auth.me.invalidate();
      toast.success("Your journey begins ✦");
      navigate("/home");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
      setSelectedIntent(null);
    }
  };

  if (loading) {
    return (
      <div className="h-dvh bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-primary/30 rounded-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.onboardingCompleted) return null;

  const stepIndex = step === "name" ? 0 : 1;
  const totalSteps = 2;
  const progressPct = ((stepIndex + 1) / (totalSteps + 1)) * 100; // +1 for full onboarding ahead

  return (
    <div className="h-dvh bg-background flex flex-col max-w-[480px] mx-auto px-6 py-10 overflow-y-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-primary">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <span className="text-sm text-muted-foreground">{Math.round(progressPct)}%</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Name ─────────────────────────────────────────── */}
        {step === "name" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col flex-1"
          >
            <div className="text-center mb-10">
              <div className="text-5xl mb-4">👋</div>
              <h1 className="text-3xl font-serif text-foreground mb-2">
                What should we call you?
              </h1>
              <p className="text-muted-foreground text-sm">
                Your AI mirror will use this to make every conversation feel personal.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                placeholder="Your first name or nickname"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                className="text-center text-lg h-14 bg-card border-border"
                autoFocus
                maxLength={50}
              />
              <Button
                onClick={handleNameSubmit}
                disabled={isSubmitting || !preferredName.trim()}
                className="w-full h-12 text-base font-semibold"
              >
                {isSubmitting ? "Saving…" : "Continue →"}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              You can always change this later in Settings.
            </p>
          </motion.div>
        )}

        {/* ── Step 2: Intent ───────────────────────────────────────── */}
        {step === "intent" && (
          <motion.div
            key="intent"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col flex-1"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif text-foreground mb-2">
                What brings you to your mirror today?
              </h1>
              <p className="text-muted-foreground text-sm">Choose your intention to begin</p>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-6">
              {INTENT_TILES.map((tile) => (
                <Card
                  key={tile.id}
                  onClick={() => !isSubmitting && handleSelectIntent(tile.id)}
                  className={`p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                    selectedIntent === tile.id ? "ring-2 ring-primary" : ""
                  } ${isSubmitting && selectedIntent !== tile.id ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className={`bg-gradient-to-br ${tile.color} rounded-lg px-5 py-4 flex items-center gap-4 text-white`}>
                    <span className="text-3xl">{tile.emoji}</span>
                    <h2 className="text-lg font-semibold">{tile.label}</h2>
                  </div>
                </Card>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Your AI mirror will personalise your experience based on your choice.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
