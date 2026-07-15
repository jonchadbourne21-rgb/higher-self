import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { ArrowLeft, Loader2, TrendingUp } from "lucide-react";
import { AIThinking, AIReveal } from "@/components/AIThinking";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CheckInInsight() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [isSaving, setIsSaving] = useState(false);

  // Get the insight from location state
  const [dailyInsight, setDailyInsight] = useState<string | null>(null);
  const [weeklyInsight, setWeeklyInsight] = useState<any>(null);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    // Get insight from session storage or navigate back if not found
    const storedInsight = sessionStorage.getItem("checkInInsight");
    if (storedInsight) {
      setDailyInsight(storedInsight);
      sessionStorage.removeItem("checkInInsight");
    } else {
      navigate("/check-in");
    }
  }, [navigate]);

  // Fetch weekly insight
  const generateWeeklyMutation = trpc.weeklyInsight.generateWeeklyInsight.useMutation({
    onSuccess: (data: any) => {
      setWeeklyInsight(data.insight);
      setIsLoadingWeekly(false);
    },
    onError: () => {
      setIsLoadingWeekly(false);
    },
  });

  useEffect(() => {
    if (dailyInsight && isLoadingWeekly) {
      generateWeeklyMutation.mutate();
    }
  }, [dailyInsight, isLoadingWeekly]);

  const saveWeeklyInsightMutation = trpc.checkIn.saveWeeklyInsight.useMutation({
    onSuccess: () => {
      toast.success("Insight saved for the week!");
      navigate("/");
    },
    onError: () => {
      toast.error("Failed to save insight");
      setIsSaving(false);
    },
  });

  const handleSaveAndContinue = async () => {
    if (!dailyInsight) return;
    setIsSaving(true);
    saveWeeklyInsightMutation.mutate({ insight: dailyInsight });
  };

  const isToday = new Date().getDay() === 0; // Sunday

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-20 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={() => navigate("/check-in")}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Insight</h1>
            <p className="text-sm text-muted-foreground">
              {isToday ? "Weekly reflection & today's check-in" : "Today's check-in & weekly patterns"}
            </p>
          </div>
        </motion.div>

        {/* Daily Insight Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mb-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-3">Today's Check-In</h2>
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 rounded-2xl p-6 border border-teal-200 dark:border-teal-800 min-h-[200px] flex flex-col justify-center">
            {dailyInsight ? (
              <AIReveal className="space-y-4">
                <Streamdown className="text-foreground leading-relaxed text-sm">
                  {dailyInsight}
                </Streamdown>
              </AIReveal>
            ) : (
              <AIThinking messages={[
                "Your Higher Self is reflecting…",
                "Weaving today's insights…",
                "Almost ready…",
              ]} interval={2500} />
            )}
          </div>
        </motion.div>

        {/* Weekly Insight Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={20} className="text-teal-600" />
            <h2 className="text-lg font-semibold text-foreground">
              {isToday ? "Last Week's Reflection" : "This Week's Patterns"}
            </h2>
          </div>

          {isLoadingWeekly ? (
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 rounded-2xl p-6 border border-rose-200 dark:border-rose-800 min-h-[250px] flex items-center justify-center">
              <AIThinking messages={[
                "Analyzing your week…",
                "Spotting patterns in your journey…",
                "Connecting this week to your story…",
                "Finding what matters most…",
                "Your Higher Self is reflecting…",
              ]} />
            </div>
          ) : weeklyInsight ? (
            <AIReveal className="space-y-4">
              {/* Growth Score */}
              {weeklyInsight.growthScore !== undefined && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-muted-foreground mb-1">Growth Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-amber-600">{weeklyInsight.growthScore}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                </div>
              )}

              {/* Patterns */}
              {weeklyInsight.patterns && Array.isArray(weeklyInsight.patterns) && weeklyInsight.patterns.length > 0 && (
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 rounded-2xl p-6 border border-rose-200 dark:border-rose-800">
                  <h3 className="font-semibold text-foreground mb-3">Patterns Detected</h3>
                  <ul className="space-y-2">
                    {weeklyInsight.patterns.map((p: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-foreground text-sm">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {weeklyInsight.patterns && typeof weeklyInsight.patterns === 'string' && weeklyInsight.patterns.length > 0 && (
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 rounded-2xl p-6 border border-rose-200 dark:border-rose-800">
                  <h3 className="font-semibold text-foreground mb-3">Patterns Detected</h3>
                  <Streamdown className="text-foreground leading-relaxed text-sm">
                    {weeklyInsight.patterns}
                  </Streamdown>
                </div>
              )}

              {/* Insight Text */}
              {weeklyInsight.insightText && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800">
                  <h3 className="font-semibold text-foreground mb-3">Weekly Insight</h3>
                  <Streamdown className="text-foreground leading-relaxed text-sm">
                    {weeklyInsight.insightText}
                  </Streamdown>
                </div>
              )}

              {/* Actionable Steps */}
              {weeklyInsight.actionableSteps && Array.isArray(weeklyInsight.actionableSteps) && weeklyInsight.actionableSteps.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl p-6 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-foreground mb-3">Next Steps for Growth</h3>
                  <ul className="space-y-2">
                    {weeklyInsight.actionableSteps.map((step: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-foreground text-sm">
                        <span className="text-amber-500 mt-0.5">→</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {weeklyInsight.actionableSteps && typeof weeklyInsight.actionableSteps === 'string' && weeklyInsight.actionableSteps.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl p-6 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-foreground mb-3">Next Steps for Growth</h3>
                  <Streamdown className="text-foreground leading-relaxed text-sm">
                    {weeklyInsight.actionableSteps}
                  </Streamdown>
                </div>
              )}
            </AIReveal>
          ) : (
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 rounded-2xl p-6 border border-rose-200 dark:border-rose-800 text-center">
              <p className="text-sm text-muted-foreground">Weekly insights will appear here as you complete check-ins</p>
            </div>
          )}
        </motion.div>

        {/* Save and Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="space-y-3"
        >
          <Button
            onClick={handleSaveAndContinue}
            disabled={!dailyInsight || isSaving}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 rounded-xl font-semibold transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "✓ Save & Continue"
            )}
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full h-12 rounded-xl font-semibold"
          >
            Skip for now
          </Button>
        </motion.div>

        {/* Info text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.4 }}
          className="text-xs text-muted-foreground text-center mt-6"
        >
          Your insights highlight patterns and growth across all your Mirror sessions, journals, and habits
        </motion.p>
      </div>
    </AppShell>
  );
}
