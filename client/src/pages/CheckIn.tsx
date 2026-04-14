import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { ChevronLeft, ChevronRight, Sparkles, BellRing, BellOff, Loader2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Streamdown } from "streamdown";

const MOOD_EMOJIS = ["😔", "😞", "😕", "😐", "🙂", "😊", "😄", "🌟", "✨", "🌈"];

export default function CheckIn() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5);
  const [gratitude, setGratitude] = useState("");
  const [reflection, setReflection] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { data: todayCheckIn } = trpc.checkIn.today.useQuery(undefined, { enabled: isAuthenticated });
  const { data: habits } = trpc.habits.list.useQuery(undefined, { enabled: isAuthenticated });

  // Notification opt-in
  const { isSupported, isSubscribed, permission, isSubscribing, subscribe } = useNotifications();
  const [notifDismissed, setNotifDismissed] = useState(false);
  const showNotifPrompt = isSupported && !isSubscribed && permission !== "denied" && !notifDismissed;

  const submitMutation = trpc.checkIn.submit.useMutation({
    onSuccess: (data) => {
      setAiResponse(data.aiResponse);
      setDone(true);
    },
    onError: () => toast.error("Failed to save check-in"),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
    if (todayCheckIn) setDone(true);
  }, [isAuthenticated, loading, todayCheckIn]);

  const steps = [
    { title: "Mood", subtitle: "How are you feeling right now?" },
    { title: "Energy & Stress", subtitle: "Your vitals today" },
    { title: "Gratitude", subtitle: "What are you grateful for?" },
    { title: "Reflection", subtitle: "What's on your mind?" },
  ];

  const handleSubmit = () => {
    submitMutation.mutate({ mood, energy, stress, gratitude, reflection });
  };

  if (done && todayCheckIn && !submitMutation.isPending) {
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
              <span className="text-xl">✦</span>
            </div>
            {(aiResponse || todayCheckIn.aiResponse) ? (
              <div className="streamdown-content">
                <Streamdown>{aiResponse || todayCheckIn.aiResponse || ""}</Streamdown>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">Your reflection has been saved.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Mood", value: todayCheckIn.mood, emoji: MOOD_EMOJIS[todayCheckIn.mood - 1] },
              { label: "Energy", value: todayCheckIn.energy, emoji: "⚡" },
              { label: "Stress", value: todayCheckIn.stress, emoji: "🌊" },
            ].map((item) => (
              <div key={item.label} className="glass rounded-2xl p-4 text-center space-y-1">
                <span className="text-2xl">{item.emoji}</span>
                <p className="text-2xl font-serif text-primary">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          {todayCheckIn.gratitude && (
            <div className="glass rounded-2xl p-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Gratitude</p>
              <p className="text-sm text-foreground">{todayCheckIn.gratitude}</p>
            </div>
          )}

          {/* Notification opt-in prompt */}
          {showNotifPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl border border-violet-200 bg-violet-50 p-5 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <BellRing className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-violet-900">Want a daily reminder?</p>
                  <p className="text-xs text-violet-700 mt-0.5 leading-relaxed">
                    Get a personalised nudge every morning at 6am — your goals, your pace.
                  </p>
                </div>
                <button
                  onClick={() => setNotifDismissed(true)}
                  className="text-violet-400 hover:text-violet-600 p-1 flex-shrink-0"
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

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/home")} className="text-muted-foreground">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-serif">{steps[step].title}</h1>
            <p className="text-xs text-muted-foreground">{steps[step].subtitle}</p>
          </div>
          <span className="text-xs text-muted-foreground">{step + 1}/{steps.length}</span>
        </div>

        {/* Progress */}
        <div className="h-0.5 bg-border rounded-full mb-8">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
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
              {/* Mood */}
              {step === 0 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <span className="text-7xl">{MOOD_EMOJIS[mood - 1]}</span>
                    <p className="text-4xl font-serif text-primary">{mood}/10</p>
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
              )}

              {/* Energy & Stress */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="glass rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        <p className="text-sm font-medium">Energy Level</p>
                      </div>
                      <span className="text-2xl font-serif text-primary">{energy}</span>
                    </div>
                    <input
                      type="range" min={1} max={10} value={energy}
                      onChange={(e) => setEnergy(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div className="glass rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🌊</span>
                        <p className="text-sm font-medium">Stress Level</p>
                      </div>
                      <span className="text-2xl font-serif text-primary">{stress}</span>
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

              {/* Gratitude */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="glass rounded-2xl p-4">
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      "Gratitude transforms what we have into enough." Take a moment to notice what is good.
                    </p>
                  </div>
                  <textarea
                    value={gratitude}
                    onChange={(e) => setGratitude(e.target.value)}
                    placeholder="Today I am grateful for..."
                    rows={5}
                    className="w-full bg-input border border-border rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                  />
                </div>
              )}

              {/* Reflection */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="glass rounded-2xl p-4">
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      What's present for you today? What are you thinking about, feeling, or working through?
                    </p>
                  </div>
                  <textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Today I'm thinking about..."
                    rows={6}
                    className="w-full bg-input border border-border rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-6">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 rounded-2xl py-5">
              <ChevronLeft size={18} />
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} className="flex-1 rounded-2xl py-5">
              Continue <ChevronRight size={18} className="ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="flex-1 rounded-2xl py-5 glow-gold"
            >
              {submitMutation.isPending ? (
                <span className="animate-pulse">Reflecting...</span>
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
