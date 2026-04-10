import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import AppShell from "@/components/AppShell";
import { Sparkles, ChevronRight, Sun, Moon, Star, Bell, Settings } from "lucide-react";
import { format } from "date-fns";

// Staggered word-by-word animation for the greeting name
function AnimatedName({ name }: { name: string }) {
  const words = name.split(" ");
  return (
    <span className="text-violet-gradient inline-flex flex-wrap gap-x-[0.25em]">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: 0.35 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "inline-block" }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: todayCheckIn } = trpc.checkIn.today.useQuery(undefined, { enabled: isAuthenticated });
  const { data: latestInsight } = trpc.insights.latest.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
    if (!loading && isAuthenticated && !(user as any)?.onboardingCompleted) navigate("/onboarding");
    // Route to QuickOnboarding if onboarding complete but seedIntent not yet captured
    if (!loading && isAuthenticated && (user as any)?.onboardingCompleted && !(user as any)?.seedIntent) {
      navigate("/quick-onboarding");
    }
  }, [isAuthenticated, loading, user, navigate]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetingIcon = hour < 17
    ? <Sun size={15} className="text-amber-500" />
    : <Moon size={15} className="text-violet-500" />;

  const name = profile?.preferredName || user?.name?.split(" ")[0] || "friend";
  const today = format(new Date(), "EEEE, MMMM d");

  const quickActions = [
    {
      icon: "✦",
      label: "Daily Check-in",
      path: "/checkin",
      done: !!todayCheckIn,
      bg: "bg-violet-50",
      iconColor: "text-violet-600",
      border: "border-violet-100",
    },
    {
      icon: "🪞",
      label: "Talk to Mirror",
      path: "/chat",
      done: false,
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      border: "border-amber-100",
    },
    {
      icon: "📝",
      label: "Journal",
      path: "/journal",
      done: false,
      bg: "bg-sky-50",
      iconColor: "text-sky-600",
      border: "border-sky-100",
    },
    {
      icon: "🧭",
      label: "Life Domains",
      path: "/domains",
      done: false,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      border: "border-emerald-100",
    },
  ];

  return (
    <AppShell>
      <div className="px-5 pt-10 pb-4 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-1"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
              {greetingIcon}
              <span>{today}</span>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/notifications">
                <button className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground">
                  <Bell className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/settings">
                <button className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground">
                  <Settings className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
          <h1 className="text-4xl font-serif font-light text-foreground leading-tight">
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              style={{ display: "inline-block" }}
            >
              {greeting},
            </motion.span>
            <br />
            <AnimatedName name={name} />
          </h1>
        </motion.div>

        {/* ── Check-in card ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          {todayCheckIn ? (
            /* Completed check-in — violet tinted card */
            <div
              className="rounded-3xl p-5 space-y-3"
              style={{
                background: "linear-gradient(135deg, oklch(0.96 0.04 295), oklch(0.98 0.02 80))",
                border: "1px solid oklch(0.88 0.06 295 / 0.6)",
                boxShadow: "0 4px 20px oklch(0.46 0.20 295 / 0.08)",
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-violet-700">Today's Check-in</p>
                <span className="text-xs text-violet-600 bg-violet-100 px-2.5 py-0.5 rounded-full font-medium">✓ Done</span>
              </div>
              <div className="flex gap-4">
                {[
                  { label: "Mood", value: todayCheckIn.mood },
                  { label: "Energy", value: todayCheckIn.energy },
                  { label: "Stress", value: todayCheckIn.stress },
                ].map(({ label, value }) => (
                  <div key={label} className="flex-1 text-center">
                    <p className="text-2xl font-serif font-light text-violet-700">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {todayCheckIn.aiResponse && (
                <div className="border-t border-violet-200/60 pt-3">
                  <p className="text-xs text-violet-800/70 leading-relaxed italic">
                    "{todayCheckIn.aiResponse.slice(0, 130)}..."
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* CTA to check in — amber gradient prompt */
            <Link href="/checkin">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="rounded-3xl p-5 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, oklch(0.46 0.20 295), oklch(0.55 0.18 320))",
                  boxShadow: "0 6px 28px oklch(0.46 0.20 295 / 0.22)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-white">How are you today?</p>
                    <p className="text-xs text-white/70">Complete your daily check-in</p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Sparkles size={20} className="text-white" />
                  </div>
                </div>
              </motion.div>
            </Link>
          )}
        </motion.div>

        {/* ── Quick actions grid ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          className="space-y-3"
        >
          <h2 className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Your Space</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link key={action.path} href={action.path}>
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  className={`rounded-2xl p-4 space-y-3 cursor-pointer border transition-all hover:shadow-sm ${action.bg} ${action.border}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{action.icon}</span>
                    {action.done && (
                      <span className="text-xs text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full font-medium">✓</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── Latest insight / generate prompt ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.24 }}
        >
          {latestInsight ? (
            <Link href="/insights">
              <div
                className="rounded-3xl p-5 space-y-3 cursor-pointer transition-all hover:shadow-md"
                style={{
                  background: "linear-gradient(145deg, oklch(0.97 0.03 60), oklch(0.99 0.01 80))",
                  border: "1px solid oklch(0.88 0.06 60 / 0.6)",
                  boxShadow: "0 2px 16px oklch(0.72 0.18 60 / 0.08)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Star size={12} className="text-amber-500 fill-amber-500" />
                    <p className="text-xs text-amber-700 uppercase tracking-widest font-medium">Latest Insight</p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                  {latestInsight.insightText}
                </p>
                {Array.isArray(latestInsight.actionableSteps) && latestInsight.actionableSteps.length > 0 && (
                  <span className="text-xs text-amber-600 font-medium">
                    {latestInsight.actionableSteps.length} action steps →
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <Link href="/insights">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="rounded-3xl p-5 cursor-pointer border-2 border-dashed border-violet-200 hover:border-violet-300 transition-all bg-violet-50/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔮</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Generate Your First Insight</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Let your Higher Self analyze your patterns</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground ml-auto shrink-0" />
                </div>
              </motion.div>
            </Link>
          )}
        </motion.div>

        {/* ── Growth dashboard link ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.32 }}
        >
          <Link href="/dashboard">
            <div
              className="rounded-3xl p-5 space-y-3 cursor-pointer transition-all hover:shadow-md"
              style={{
                background: "linear-gradient(145deg, oklch(0.97 0.02 155), oklch(0.99 0.01 80))",
                border: "1px solid oklch(0.86 0.06 155 / 0.6)",
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-emerald-700 uppercase tracking-widest font-medium">Growth Dashboard</p>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-serif text-emerald-600">✦</div>
                <p className="text-sm text-muted-foreground">View your evolution across all life domains</p>
              </div>
            </div>
          </Link>
        </motion.div>

      </div>
    </AppShell>
  );
}
