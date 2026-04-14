import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const CORE_VALUES = [
  "Authenticity", "Compassion", "Courage", "Creativity", "Discipline",
  "Family", "Freedom", "Gratitude", "Growth", "Harmony", "Honesty",
  "Humility", "Integrity", "Joy", "Kindness", "Love", "Mindfulness",
  "Peace", "Purpose", "Resilience", "Service", "Spirituality", "Wisdom",
];

const DEFAULT_HABITS = [
  { name: "Morning meditation", domain: "mindset" as const, emoji: "🧘" },
  { name: "Gratitude journaling", domain: "mindset" as const, emoji: "📝" },
  { name: "Daily exercise", domain: "health" as const, emoji: "💪" },
  { name: "Read for 20 minutes", domain: "mindset" as const, emoji: "📚" },
  { name: "Connect with a loved one", domain: "relationships" as const, emoji: "❤️" },
  { name: "Digital detox hour", domain: "health" as const, emoji: "📵" },
];

const DOMAIN_LABELS = {
  mindset: { label: "Mindset & Mental Health", emoji: "🧠", desc: "Clarity, peace, emotional regulation" },
  relationships: { label: "Relationships", emoji: "❤️", desc: "Connection, love, communication" },
  work: { label: "Work & Purpose", emoji: "⚡", desc: "Career, creativity, contribution" },
  health: { label: "Health & Vitality", emoji: "🌿", desc: "Body, energy, sleep, nutrition" },
  spirituality: { label: "Spirituality", emoji: "✨", desc: "Connection, meaning, transcendence" },
  finances: { label: "Finances", emoji: "🌊", desc: "Abundance, security, generosity" },
};

type Domain = keyof typeof DOMAIN_LABELS;

export default function Onboarding() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);

  const [preferredName, setPreferredName] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [domainScores, setDomainScores] = useState<Record<Domain, number>>({
    mindset: 5, relationships: 5, work: 5, health: 5, spirituality: 5, finances: 5,
  });
  const [shortTermGoals, setShortTermGoals] = useState("");
  const [longTermVision, setLongTermVision] = useState("");
  const [beliefs, setBeliefs] = useState("");
  const [selectedHabits, setSelectedHabits] = useState<typeof DEFAULT_HABITS>([]);

  const utils = trpc.useUtils();
  const completeMutation = trpc.profile.completeOnboarding.useMutation({
    onSuccess: async () => {
      toast.success("Your journey begins now ✦");
      await utils.auth.me.invalidate();
      navigate("/home");
    },
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  const steps = [
    { title: "Welcome", subtitle: "Let's begin with your name" },
    { title: "Your Values", subtitle: "What matters most to you?" },
    { title: "Life Assessment", subtitle: "Where are you right now?" },
    { title: "Your Vision", subtitle: "Where are you going?" },
    { title: "Your Beliefs", subtitle: "What do you believe about yourself?" },
    { title: "Daily Habits", subtitle: "Choose habits to track" },
  ];

  const totalSteps = steps.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const canProceed = () => {
    if (step === 0) return preferredName.trim().length > 0;
    if (step === 1) return selectedValues.length >= 3;
    if (step === 3) return shortTermGoals.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = () => {
    completeMutation.mutate({
      preferredName,
      coreValues: selectedValues,
      shortTermGoals,
      longTermVision,
      beliefs,
      domainScores: Object.entries(domainScores).map(([domain, score]) => ({
        domain: domain as Domain,
        score,
      })),
      defaultHabits: selectedHabits,
    });
  };

  const toggleValue = (v: string) => {
    setSelectedValues((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : prev.length < 7 ? [...prev, v] : prev
    );
  };

  const toggleHabit = (h: typeof DEFAULT_HABITS[0]) => {
    setSelectedHabits((prev) =>
      prev.some((x) => x.name === h.name) ? prev.filter((x) => x.name !== h.name) : [...prev, h]
    );
  };

  return (
    <div className="h-dvh bg-aurora flex flex-col max-w-[480px] mx-auto overflow-hidden">
      {/* Progress bar */}
      <div className="h-1.5 bg-violet-100">
        <motion.div
          className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, oklch(0.46 0.14 185), oklch(0.62 0.14 155))' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Header */}
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} className="text-muted-foreground p-1">
            <ChevronLeft size={20} />
          </button>
        ) : (
          <div />
        )}
        <span className="text-xs text-muted-foreground tracking-widest uppercase">
          {step + 1} / {totalSteps}
        </span>
        <div />
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
            <div className="space-y-1">
              <h2 className="text-3xl font-serif font-light text-foreground">{steps[step].title}</h2>
              <p className="text-muted-foreground text-sm">{steps[step].subtitle}</p>
            </div>

            {/* Step 0: Name */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="glass rounded-2xl p-6 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, oklch(0.46 0.14 185 / 0.15), oklch(0.62 0.14 155 / 0.12))', border: '1.5px solid oklch(0.46 0.14 185 / 0.25)', boxShadow: '0 4px 24px oklch(0.46 0.14 185 / 0.15)' }}>
                    <span className="text-4xl">✦</span>
                  </div>
                  <p className="text-center text-sm text-muted-foreground leading-relaxed">
                    I am your Higher Self — the most evolved, peaceful, and wise version of you. I'm here to walk this journey with you.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">What shall I call you?</label>
                  <input
                    type="text"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    placeholder="Your preferred name..."
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-base"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Step 1: Values */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Select 3–7 values that resonate deeply with who you are.</p>
                <div className="flex flex-wrap gap-2">
                  {CORE_VALUES.map((v) => {
                    const selected = selectedValues.includes(v);
                    return (
                      <button
                        key={v}
                        onClick={() => toggleValue(v)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                          selected
                            ? "text-white border-transparent"
                            : "bg-white text-muted-foreground border-border hover:border-violet-300 hover:text-foreground hover:bg-violet-50"
                        }`}
                        style={selected ? { background: 'linear-gradient(135deg, oklch(0.46 0.14 185), oklch(0.52 0.14 200))' } : undefined}
                      >
                        {selected && <Check size={12} className="inline mr-1" />}
                        {v}
                      </button>
                    );
                  })}
                </div>
                {selectedValues.length > 0 && (
                  <p className="text-xs text-primary">{selectedValues.length} selected</p>
                )}
              </div>
            )}

            {/* Step 2: Domain scores */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Rate each area of your life honestly. This is your baseline — no judgment.</p>
                {Object.entries(DOMAIN_LABELS).map(([domain, info]) => (
                  <div key={domain} className="glass rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{info.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{info.label}</p>
                          <p className="text-xs text-muted-foreground">{info.desc}</p>
                        </div>
                      </div>
                      <span className="text-2xl font-serif text-primary font-light">
                        {domainScores[domain as Domain]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={domainScores[domain as Domain]}
                      onChange={(e) =>
                        setDomainScores((prev) => ({ ...prev, [domain]: Number(e.target.value) }))
                      }
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Struggling</span>
                      <span>Thriving</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 3: Vision & Goals */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">What do you want to achieve in the next 3 months?</label>
                  <textarea
                    value={shortTermGoals}
                    onChange={(e) => setShortTermGoals(e.target.value)}
                    placeholder="I want to..."
                    rows={3}
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">What does your ideal life look like in 5 years?</label>
                  <textarea
                    value={longTermVision}
                    onChange={(e) => setLongTermVision(e.target.value)}
                    placeholder="In my ideal life, I am..."
                    rows={4}
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Beliefs */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="glass rounded-2xl p-4">
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    "The beliefs we hold about ourselves shape every choice we make. Bringing them into awareness is the first step to freedom."
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">What limiting beliefs do you carry? What do you believe about yourself that holds you back?</label>
                  <textarea
                    value={beliefs}
                    onChange={(e) => setBeliefs(e.target.value)}
                    placeholder="I believe I am... / I struggle with believing that I..."
                    rows={5}
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Habits */}
            {step === 5 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Choose habits you'd like to track daily. You can add more later.</p>
                <div className="space-y-2">
                  {DEFAULT_HABITS.map((h) => {
                    const selected = selectedHabits.some((x) => x.name === h.name);
                    return (
                      <button
                        key={h.name}
                        onClick={() => toggleHabit(h)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 text-left ${
                          selected
                            ? "bg-violet-50 border-violet-300 text-foreground"
                            : "bg-white border-border text-muted-foreground hover:text-foreground hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-xl">{h.emoji}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{h.name}</p>
                          <p className={`text-xs capitalize ${`domain-${h.domain}`}`}>{h.domain}</p>
                        </div>
                        {selected && <Check size={16} className="text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer button */}
      <div className="px-6 pb-8 pt-4">
        <Button
          onClick={handleNext}
          disabled={!canProceed() || completeMutation.isPending}
          className="w-full py-6 rounded-2xl text-base font-semibold text-white border-0" style={{ background: 'linear-gradient(135deg, oklch(0.46 0.14 185), oklch(0.52 0.14 200))', boxShadow: '0 6px 28px oklch(0.46 0.14 185 / 0.25)' }}
        >
          {completeMutation.isPending ? (
            <span className="animate-pulse">Creating your profile...</span>
          ) : step === totalSteps - 1 ? (
            <>Begin My Journey <span className="ml-2">✦</span></>
          ) : (
            <>Continue <ChevronRight size={18} className="ml-1" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
