import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Plus, X, Check, Trash2, CalendarPlus } from "lucide-react";
import { toast } from "sonner";

// Each domain has its own identity: color class, accent hex for the progress bar,
// and a subtle tinted background for the card.
const DOMAIN_INFO = {
  mindset: {
    label: "Mindset",
    emoji: "🧠",
    colorClass: "domain-mindset",
    barColor: "oklch(0.46 0.20 295)",   // violet
    cardBg: "oklch(0.97 0.03 295 / 0.5)",
    cardBorder: "oklch(0.85 0.06 295 / 0.5)",
    desc: "Mental clarity, emotional regulation, peace",
  },
  relationships: {
    label: "Relationships",
    emoji: "❤️",
    colorClass: "domain-relationships",
    barColor: "oklch(0.58 0.20 15)",    // rose
    cardBg: "oklch(0.97 0.03 15 / 0.5)",
    cardBorder: "oklch(0.85 0.06 15 / 0.5)",
    desc: "Love, connection, communication",
  },
  work: {
    label: "Work & Purpose",
    emoji: "⚡",
    colorClass: "domain-work",
    barColor: "oklch(0.72 0.18 60)",    // amber
    cardBg: "oklch(0.97 0.04 60 / 0.5)",
    cardBorder: "oklch(0.85 0.08 60 / 0.5)",
    desc: "Career, creativity, contribution",
  },
  health: {
    label: "Health",
    emoji: "🌿",
    colorClass: "domain-health",
    barColor: "oklch(0.55 0.18 155)",   // teal
    cardBg: "oklch(0.97 0.03 155 / 0.5)",
    cardBorder: "oklch(0.85 0.06 155 / 0.5)",
    desc: "Body, energy, sleep, nutrition",
  },
  spirituality: {
    label: "Spirituality",
    emoji: "✨",
    colorClass: "domain-spirituality",
    barColor: "oklch(0.55 0.18 230)",   // sky blue
    cardBg: "oklch(0.97 0.03 230 / 0.5)",
    cardBorder: "oklch(0.85 0.06 230 / 0.5)",
    desc: "Meaning, connection, transcendence",
  },
  finances: {
    label: "Finances",
    emoji: "🌊",
    colorClass: "domain-finances",
    barColor: "oklch(0.55 0.16 165)",   // green
    cardBg: "oklch(0.97 0.03 165 / 0.5)",
    cardBorder: "oklch(0.85 0.06 165 / 0.5)",
    desc: "Abundance, security, generosity",
  },
};

type Domain = keyof typeof DOMAIN_INFO;

export default function Domains() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitDomain, setNewHabitDomain] = useState<Domain>("mindset");
  const [newHabitEmoji, setNewHabitEmoji] = useState("✨");
  const [showUpdateScore, setShowUpdateScore] = useState<Domain | null>(null);
  const [newScore, setNewScore] = useState(5);

  // Calendar integration state
  const [calendarPrompt, setCalendarPrompt] = useState<{ habitName: string; domain: Domain } | null>(null);
  const [calGoalDate, setCalGoalDate] = useState("");
  const [calRecurrence, setCalRecurrence] = useState<"none" | "weekly" | "monthly">("weekly");

  const { data: domainScores, refetch: refetchScores } = trpc.domains.scores.useQuery(undefined, { enabled: isAuthenticated });
  const { data: habits, refetch: refetchHabits } = trpc.habits.list.useQuery(undefined, { enabled: isAuthenticated });

  const toggleMutation = trpc.habits.toggle.useMutation({
    onSuccess: () => refetchHabits(),
  });

  const createCalendarEvent = trpc.calendar.create.useMutation({
    onSuccess: () => {
      toast.success("Added to Calendar!");
      setCalendarPrompt(null);
      setCalGoalDate("");
    },
  });

  const createHabitMutation = trpc.habits.create.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Habit added!");
      setShowAddHabit(false);
      // Offer to schedule this habit on the calendar
      setCalendarPrompt({ habitName: vars.name, domain: vars.domain as Domain });
      setCalGoalDate("");
      setCalRecurrence("weekly");
      setNewHabitName("");
      refetchHabits();
    },
  });

  const deleteHabitMutation = trpc.habits.delete.useMutation({
    onSuccess: () => refetchHabits(),
  });

  const updateScoreMutation = trpc.domains.updateScore.useMutation({
    onSuccess: () => {
      toast.success("Domain score updated!");
      setShowUpdateScore(null);
      refetchScores();
    },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  const getScoreForDomain = (domain: Domain) => {
    return domainScores?.find((s) => s?.domain === domain)?.score ?? 0;
  };

  const getHabitsForDomain = (domain: Domain) => {
    return habits?.filter((h) => h.domain === domain) ?? [];
  };

  return (
    <>
    <AppShell>
      <div className="px-5 pt-8 pb-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-light">Life Domains</h1>
            <p className="text-xs text-muted-foreground mt-1">Track every dimension of your growth</p>
          </div>
          <button
            onClick={() => setShowAddHabit(true)}
            className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-all"
          >
            <Plus size={18} className="text-primary" />
          </button>
        </div>

        {/* Domain cards */}
        <div className="space-y-4">
          {(Object.entries(DOMAIN_INFO) as [Domain, typeof DOMAIN_INFO[Domain]][]).map(([domain, info], i) => {
            const score = getScoreForDomain(domain);
            const domainHabits = getHabitsForDomain(domain);
            const completedCount = domainHabits.filter((h) => h.completedToday).length;

            return (
              <motion.div
                key={domain}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-3xl p-5 space-y-4"
                style={{
                  background: `linear-gradient(145deg, white 60%, ${info.cardBg})`,
                  border: `1px solid ${info.cardBorder}`,
                  boxShadow: `0 2px 12px ${info.cardBg.replace("0.5)", "0.3)")}`,
                }}
              >
                {/* Domain header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Colored emoji badge */}
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                      style={{ background: info.cardBg, border: `1px solid ${info.cardBorder}` }}
                    >
                      {info.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{info.label}</p>
                      <p className="text-xs text-muted-foreground">{info.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowUpdateScore(domain); setNewScore(score || 5); }}
                    className="flex flex-col items-center min-w-[40px]"
                  >
                    <span
                      className="text-2xl font-serif font-semibold"
                      style={{ color: info.barColor }}
                    >
                      {score > 0 ? score.toFixed(1) : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 10</span>
                  </button>
                </div>

                {/* Score bar */}
                {score > 0 && (
                  <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: info.barColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${score * 10}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                    />
                  </div>
                )}

                {/* Habits */}
                {domainHabits.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">Habits</p>
                      <span className="text-xs font-medium" style={{ color: info.barColor }}>
                        {completedCount}/{domainHabits.length} today
                      </span>
                    </div>
                    {domainHabits.map((habit) => (
                      <div key={habit.id} className="flex items-center gap-3">
                        <button
                          onClick={() => toggleMutation.mutate({ habitId: habit.id })}
                          className="w-7 h-7 rounded-lg border flex items-center justify-center transition-all"
                          style={
                            habit.completedToday
                              ? { backgroundColor: info.barColor, borderColor: info.barColor }
                              : { borderColor: info.cardBorder }
                          }
                        >
                          {habit.completedToday && <Check size={14} className="text-white" />}
                        </button>
                        <span className="text-base">{habit.emoji}</span>
                        <span className={`text-sm flex-1 ${habit.completedToday ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {habit.name}
                        </span>
                        {habit.streak > 0 && (
                          <span className="text-xs" style={{ color: info.barColor }}>🔥 {habit.streak}</span>
                        )}
                        <button
                          onClick={() => deleteHabitMutation.mutate({ habitId: habit.id })}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {domainHabits.length === 0 && (
                  <button
                    onClick={() => { setNewHabitDomain(domain); setShowAddHabit(true); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> Add a habit
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

    </AppShell>

      {/* Add Habit Modal — outside AppShell so it covers the nav */}
      <AnimatePresence>
        {showAddHabit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-end max-w-[480px] mx-auto"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full glass rounded-t-3xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif">New Habit</h3>
                <button onClick={() => setShowAddHabit(false)} className="text-muted-foreground">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newHabitEmoji}
                    onChange={(e) => setNewHabitEmoji(e.target.value)}
                    className="w-14 bg-input border border-border rounded-xl px-3 py-3 text-center text-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="Habit name..."
                    className="flex-1 bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Domain</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(DOMAIN_INFO) as [Domain, typeof DOMAIN_INFO[Domain]][]).map(([d, info]) => (
                      <button
                        key={d}
                        onClick={() => setNewHabitDomain(d)}
                        className="flex items-center gap-2 p-2 rounded-xl border text-xs transition-all"
                        style={
                          newHabitDomain === d
                            ? { background: info.cardBg, borderColor: info.cardBorder, color: info.barColor }
                            : {}
                        }
                      >
                        <span>{info.emoji}</span>
                        <span className="truncate">{info.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => createHabitMutation.mutate({ name: newHabitName, domain: newHabitDomain, emoji: newHabitEmoji })}
                disabled={!newHabitName.trim() || createHabitMutation.isPending}
                className="w-full rounded-2xl py-5"
              >
                Add Habit
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar prompt after habit creation */}
      <AnimatePresence>
        {calendarPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-background/90 backdrop-blur-sm flex items-end max-w-[480px] mx-auto"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full glass rounded-t-3xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <CalendarPlus size={16} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Add to Calendar?</h3>
                </div>
                <button onClick={() => setCalendarPrompt(null)} className="text-muted-foreground">
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-foreground/70">
                Schedule <span className="font-semibold text-foreground">{calendarPrompt.habitName}</span> as a recurring calendar event to stay on track.
              </p>

              {/* Start date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  value={calGoalDate}
                  onChange={(e) => setCalGoalDate(e.target.value)}
                />
              </div>

              {/* Repeat */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Repeat</label>
                <div className="flex gap-2">
                  {(["none", "weekly", "monthly"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setCalRecurrence(r)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                        calRecurrence === r
                          ? "bg-violet-600 text-white border-transparent"
                          : "border-border text-foreground/60 bg-background hover:bg-muted"
                      }`}
                    >
                      {r === "none" ? "Once" : r === "weekly" ? "Weekly" : "Monthly"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCalendarPrompt(null)}
                  className="flex-1 py-3 rounded-2xl border border-border text-sm font-medium text-foreground/60 hover:bg-muted transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => {
                    if (!calGoalDate) { toast.error("Please pick a start date"); return; }
                    const [y, mo, d] = calGoalDate.split("-").map(Number);
                    const eventDate = new Date(y, mo - 1, d, 9, 0);
                    createCalendarEvent.mutate({
                      title: calendarPrompt.habitName,
                      type: "habit",
                      eventDate: eventDate.getTime(),
                      recurrence: calRecurrence,
                      notes: `${DOMAIN_INFO[calendarPrompt.domain].label} habit`,
                    });
                  }}
                  disabled={createCalendarEvent.isPending}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                >
                  {createCalendarEvent.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><CalendarPlus size={15} /> Add to Calendar</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Score Modal */}
      <AnimatePresence>
        {showUpdateScore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-end max-w-[480px] mx-auto"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full glass rounded-t-3xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif">
                  {DOMAIN_INFO[showUpdateScore].emoji} Update Score
                </h3>
                <button onClick={() => setShowUpdateScore(null)} className="text-muted-foreground">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <span
                    className="text-5xl font-serif font-semibold"
                    style={{ color: DOMAIN_INFO[showUpdateScore].barColor }}
                  >
                    {newScore}
                  </span>
                  <span className="text-muted-foreground text-lg"> / 10</span>
                </div>
                <input
                  type="range" min={1} max={10} step={0.5} value={newScore}
                  onChange={(e) => setNewScore(Number(e.target.value))}
                  className="w-full accent-primary"
                  style={{ accentColor: DOMAIN_INFO[showUpdateScore].barColor }}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Struggling</span><span>Thriving</span>
                </div>
              </div>

              <Button
                onClick={() => updateScoreMutation.mutate({ domain: showUpdateScore, score: newScore })}
                disabled={updateScoreMutation.isPending}
                className="w-full rounded-2xl py-5"
              >
                Save Score
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
