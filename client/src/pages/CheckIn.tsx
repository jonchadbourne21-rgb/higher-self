import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { ChevronLeft, ChevronRight, Sparkles, BellRing, BellOff, Loader2 } from "lucide-react";
import { AIThinking, AIReveal } from "@/components/AIThinking";
import { useNotifications } from "@/hooks/useNotifications";
import { Streamdown } from "streamdown";
import { session, STORAGE_KEYS } from "@/lib/storage";

const MOOD_EMOJIS = ["😔", "😞", "😕", "😐", "🙂", "😊", "😄", "🌟", "✨", "🌈"];

const STEP_LABELS = [
  { title: "How are you?", subtitle: "Mood, energy & stress — all in one" },
  { title: "Today's reflection", subtitle: "A question just for today" },
  { title: "Going deeper", subtitle: "One more thing worth exploring" },
];

export default function CheckIn() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  // Step state
  const [step, setStep] = useState(0);

  // Step 1: vitals
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5);

  // Step 2: AI reflection prompt + answer
  const [reflectionPrompt, setReflectionPrompt] = useState("");
  const [reflectionAnswer, setReflectionAnswer] = useState("");

  // Step 3: AI follow-up question + answer
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");

  // Result
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const { data: todayCheckIn, isLoading: checkInLoading } = trpc.checkIn.today.useQuery(undefined, { enabled: isAuthenticated });

  // Initialize done immediately once todayCheckIn resolves — avoids flash of form
  const [done, setDone] = useState(false);

  // Load the AI daily prompt on mount
  const { data: dailyPromptData, isLoading: promptLoading } = trpc.checkIn.getDailyPrompt.useQuery(
    undefined,
    { enabled: isAuthenticated && !todayCheckIn }
  );

  // Set the prompt text once loaded
  useEffect(() => {
    if (dailyPromptData?.prompt && !reflectionPrompt) {
      setReflectionPrompt(dailyPromptData.prompt);
    }
  }, [dailyPromptData]);

  // Notification opt-in
  const { isSupported, isSubscribed, permission, isSubscribing, subscribe } = useNotifications();
  const [notifDismissed, setNotifDismissed] = useState(false);
  const showNotifPrompt = isSupported && !isSubscribed && permission !== "denied" && !notifDismissed;

  // Generate AI follow-up when user moves from step 2 → step 3
  const generateFollowUpMutation = trpc.checkIn.generateFollowUp.useMutation({
    onSuccess: (data) => {
      setFollowUpQuestion(data.question);
    },
    onError: () => {
      setFollowUpQuestion("What's really underneath all of this for you?");
    },
  });

  const submitMutation = trpc.checkIn.submit.useMutation({
    onSuccess: (data) => {
      setAiResponse(data.aiResponse);
      if (data.streakSpinEarned) {
        setTimeout(() => {
          toast.success("🔥 3-day streak! Keep the momentum going.", {
            duration: 4000,
          });
        }, 1500);
      }
      if (data.aiResponse) {
        session.setItem(STORAGE_KEYS.checkInInsight, data.aiResponse);
        navigate("/check-in-insight");
      } else {
        setDone(true);
      }
    },
    onError: () => toast.error("Failed to save check-in"),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
    if (todayCheckIn) setDone(true);
  }, [isAuthenticated, loading, todayCheckIn]);

  const handleNext = () => {
    if (step === 1) {
      // Moving to step 3 — generate the AI follow-up question
      if (reflectionAnswer.trim()) {
        generateFollowUpMutation.mutate({
          mood,
          energy,
          stress,
          reflectionPrompt,
          reflectionAnswer,
        });
      } else {
        setFollowUpQuestion("What's one thing you'd like to feel more of tomorrow?");
      }
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = () => {
    submitMutation.mutate({
      mood,
      energy,
      stress,
      reflectionTheme: dailyPromptData?.theme || undefined,
      reflectionPrompt,
      reflectionAnswer,
      followUpQuestion,
      followUpAnswer,
    });
  };

  // ── Loading guard — prevents flash of form while fetching today's check-in ────
  if ((loading || checkInLoading) && !done) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  // ── Completed state ──────────────────────────────────────────────────────────
  if ((done || !!todayCheckIn) && !submitMutation.isPending) {
    const ci = todayCheckIn ?? null;
    return (
      <AppShell>
        <div className="px-5 pt-8 pb-4 space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/home")} className="text-muted-foreground">
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-2xl font-serif">Today's Check-in</h1>
          </div>

          <div className="glass rounded-3xl p-6 space-y-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Your Higher Self responds</p>
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <span className="text-xl">✶</span>
            </div>
            {(aiResponse || ci?.aiResponse) ? (
              <div className="streamdown-content">
                <Streamdown>{aiResponse || ci?.aiResponse || ""}</Streamdown>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">Your reflection has been saved.</p>
            )}
          </div>

          {ci && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Mood", value: ci.mood, emoji: MOOD_EMOJIS[ci.mood - 1] },
                { label: "Energy", value: ci.energy, emoji: "⚡" },
                { label: "Stress", value: ci.stress, emoji: "🌊" },
              ].map((item) => (
                <div key={item.label} className="glass rounded-2xl p-4 text-center space-y-1">
                  <span className="text-2xl">{item.emoji}</span>
                  <p className="text-2xl font-serif text-primary">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {ci?.reflectionAnswer && (
            <div className="glass rounded-2xl p-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                {ci.reflectionPrompt || "Reflection"}
              </p>
              <p className="text-sm text-foreground">{ci.reflectionAnswer}</p>
            </div>
          )}

          {ci?.followUpAnswer && (
            <div className="glass rounded-2xl p-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                {ci.followUpQuestion || "Going deeper"}
              </p>
              <p className="text-sm text-foreground">{ci.followUpAnswer}</p>
            </div>
          )}

          {/* Notification opt-in prompt */}
          {showNotifPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <BellRing className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">Want a daily reminder?</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Get a personalised nudge every morning at 6am — your goals, your pace.
                  </p>
                </div>
                <button
                  onClick={() => setNotifDismissed(true)}
                  className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0"
                >
                  <BellOff className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={async () => { await subscribe(); setNotifDismissed(true); }}
                disabled={isSubscribing}
                className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-violet-700 transition-colors disabled:opacity-60"
              >
                {isSubscribing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enabling…</>
                ) : (
                  <><BellRing className="w-4 h-4" /> Yes, remind me daily</>
                )}
              </button>
            </motion.div>
          )}

          <Button onClick={() => navigate("/home")} className="w-full rounded-2xl py-5">
            Return Home
          </Button>
        </div>
      </AppShell>
    );
  }

  // ── 3-step flow ──────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="px-5 pt-8 pb-4 flex flex-col min-h-[calc(100dvh-4rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate("/home")}
            className="text-muted-foreground"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-serif">{STEP_LABELS[step].title}</h1>
            <p className="text-xs text-muted-foreground">{STEP_LABELS[step].subtitle}</p>
          </div>
          <span className="text-xs text-muted-foreground font-medium">{step + 1} / 3</span>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-border rounded-full mb-8">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((step + 1) / 3) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Step content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* ── Step 1: Mood + Energy + Stress ──────────────────────── */}
              {step === 0 && (
                <div className="space-y-6">
                  {/* Mood */}
                  <div className="glass rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{MOOD_EMOJIS[mood - 1]}</span>
                        <p className="text-sm font-medium">Mood</p>
                      </div>
                      <span className="text-2xl font-serif text-primary">{mood}/10</span>
                    </div>
                    <input
                      type="range" min={1} max={10} value={mood}
                      onChange={(e) => setMood(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Very low</span><span>Wonderful</span>
                    </div>
                  </div>

                  {/* Energy */}
                  <div className="glass rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        <p className="text-sm font-medium">Energy</p>
                      </div>
                      <span className="text-2xl font-serif text-primary">{energy}/10</span>
                    </div>
                    <input
                      type="range" min={1} max={10} value={energy}
                      onChange={(e) => setEnergy(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Drained</span><span>Fully charged</span>
                    </div>
                  </div>

                  {/* Stress */}
                  <div className="glass rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🌊</span>
                        <p className="text-sm font-medium">Stress</p>
                      </div>
                      <span className="text-2xl font-serif text-primary">{stress}/10</span>
                    </div>
                    <input
                      type="range" min={1} max={10} value={stress}
                      onChange={(e) => setStress(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Very calm</span><span>Very stressed</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: AI-generated reflection prompt ───────────────── */}
              {step === 1 && (
                <div className="space-y-5">
                  {promptLoading || !reflectionPrompt ? (
                    <div className="glass rounded-2xl p-6">
                      <AIThinking messages={[
                        "Crafting today's question…",
                        "Reviewing your recent journey…",
                        "Finding the right thread to pull…",
                      ]} interval={2500} />
                    </div>
                  ) : (
                    <AIReveal className="glass rounded-2xl p-5 border border-primary/20">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">✦</span>
                        <p className="text-base font-medium leading-relaxed text-foreground">
                          {reflectionPrompt}
                        </p>
                      </div>
                      {dailyPromptData?.theme && (
                        <p className="text-xs text-muted-foreground mt-3 ml-8 capitalize">
                          Today's theme: {dailyPromptData.theme.split(" —")[0]}
                        </p>
                      )}
                    </AIReveal>
                  )}

                  <textarea
                    value={reflectionAnswer}
                    onChange={(e) => setReflectionAnswer(e.target.value)}
                    placeholder="Take your time…"
                    rows={6}
                    className="w-full bg-input border border-border rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                    autoFocus
                  />
                </div>
              )}

              {/* ── Step 3: AI-generated follow-up question ──────────────── */}
              {step === 2 && (
                <div className="space-y-5">
                  {generateFollowUpMutation.isPending || !followUpQuestion ? (
                    <div className="glass rounded-2xl p-6">
                      <AIThinking messages={[
                        "Reading between the lines…",
                        "Noticing what you didn't say…",
                        "Going deeper…",
                      ]} interval={2500} />
                    </div>
                  ) : (
                    <AIReveal className="glass rounded-2xl p-5 border border-amber-500/20">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">🔍</span>
                        <p className="text-base font-medium leading-relaxed text-foreground">
                          {followUpQuestion}
                        </p>
                      </div>
                    </AIReveal>
                  )}

                  <textarea
                    value={followUpAnswer}
                    onChange={(e) => setFollowUpAnswer(e.target.value)}
                    placeholder="Be honest with yourself…"
                    rows={6}
                    className="w-full bg-input border border-border rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                    autoFocus
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-6">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="rounded-2xl py-5 px-5"
            >
              <ChevronLeft size={18} />
            </Button>
          )}

          {step < 2 ? (
            <Button
              onClick={handleNext}
              className="flex-1 rounded-2xl py-5"
              disabled={step === 1 && promptLoading}
            >
              Continue <ChevronRight size={18} className="ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="flex-1 rounded-2xl py-5 glow-gold"
            >
              {submitMutation.isPending ? (
                <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Reflecting…</span>
              ) : (
                <><Sparkles size={16} className="mr-2" /> Complete Check-in</>
              )}
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
