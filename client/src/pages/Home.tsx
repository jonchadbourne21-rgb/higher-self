import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import AppShell from "@/components/AppShell";
import { Sparkles, ChevronRight, Sun, Moon, Bell, Gift, User } from "lucide-react";
import WelcomeSpinModal from "@/components/WelcomeSpinModal";
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

  const { data: upcomingEvents } = trpc.calendar.upcoming.useQuery(undefined, { enabled: isAuthenticated });
  const { data: habitStreak } = trpc.habits.currentStreak.useQuery(undefined, { enabled: isAuthenticated });
  const { data: rewardPoints } = trpc.rewards.points.useQuery(undefined, { enabled: isAuthenticated });
  const { data: welcomeSpin } = trpc.rewards.welcomeSpinAvailable.useQuery(undefined, { enabled: isAuthenticated });
  const [showWelcomeSpin, setShowWelcomeSpin] = useState(false);

  // Auto-show welcome spin modal for new users
  useEffect(() => {
    if (welcomeSpin?.available && isAuthenticated && !loading) {
      // Small delay so the Home page renders first, then the modal overlays
      const timer = setTimeout(() => setShowWelcomeSpin(true), 600);
      return () => clearTimeout(timer);
    }
  }, [welcomeSpin?.available, isAuthenticated, loading]);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
    if (!loading && isAuthenticated && !(user as any)?.onboardingCompleted) navigate("/onboarding");
  }, [isAuthenticated, loading, user, navigate]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetingIcon = hour < 17
    ? <Sun size={15} className="text-amber-400" />
    : <Moon size={15} className="text-violet-400" />;

  const name = profile?.preferredName || user?.name?.split(" ")[0] || "friend";
  const today = format(new Date(), "EEEE, MMMM d");

  const quickActions = [
    {
      icon: "🪞",
      label: "Talk to Mirror",
      path: "/chat",
      done: false,
    },
    {
      icon: "📝",
      label: "Journal",
      path: "/journal",
      done: false,
    },
    {
      icon: "🧭",
      label: "Life Domains",
      path: "/domains",
      done: false,
    },
    {
      icon: "📅",
      label: "Calendar",
      path: "/calendar",
      done: false,
    },
  ];

  return (
    <>
    <AppShell>
      <div className="px-5 pt-4 pb-4 space-y-5">

        {/* ── Greeting header ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-1"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              {greetingIcon}
              <span>{today}</span>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/pricing">
                <button className="px-3 py-1.5 rounded-full transition-colors text-xs font-semibold"
                  style={{ background: "oklch(0.65 0.16 185 / 0.15)", color: "oklch(0.65 0.16 185)" }}>
                  Upgrade
                </button>
              </Link>
              <Link href="/notifications">
                <button className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground">
                  <Bell className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/settings">
                <button className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground">
                  <User className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
          <h1 className="text-3xl font-serif font-light text-foreground leading-tight">
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              style={{ display: "inline-block" }}
            >
              {greeting},
            </motion.span>
            <br />
            <AnimatedName name={profile?.preferredName || user?.name?.split(" ")[0] || ""} />
          </h1>
        </motion.div>

        {/* ── Check-in card ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          {todayCheckIn ? (
            <div
              className="rounded-2xl p-5 space-y-3"
              style={{
                background: "oklch(0.17 0.04 280)",
                border: "1px solid oklch(0.28 0.06 290 / 0.6)",
                boxShadow: "0 4px 20px oklch(0.10 0.04 280 / 0.3)",
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-primary">Today's Check-in</p>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                  style={{ background: "oklch(0.65 0.16 185 / 0.15)", color: "oklch(0.65 0.16 185)" }}>
                  ✓ Done
                </span>
              </div>
              <div className="flex gap-4">
                {[
                  { label: "Mood", value: todayCheckIn.mood },
                  { label: "Energy", value: todayCheckIn.energy },
                  { label: "Stress", value: todayCheckIn.stress },
                ].map(({ label, value }) => (
                  <div key={label} className="flex-1 text-center">
                    <p className="text-2xl font-serif font-light text-primary">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {todayCheckIn.aiResponse && (
                <div className="border-t pt-3" style={{ borderColor: "oklch(0.28 0.05 280)" }}>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    "{todayCheckIn.aiResponse.slice(0, 130)}..."
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Link href="/checkin">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="rounded-2xl p-5 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, oklch(0.46 0.14 185), oklch(0.52 0.14 200))",
                  boxShadow: "0 6px 28px oklch(0.46 0.14 185 / 0.25)",
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

        {/* ── Quick actions grid ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          className="space-y-3"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Quick Access</p>
          <div className="grid grid-cols-2 gap-3 auto-rows-max">
            {quickActions.slice(0, 2).map((action) => (
              <Link key={action.path} href={action.path}>
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  className="rounded-2xl p-4 space-y-3 cursor-pointer transition-all hover:shadow-md"
                  style={{
                    background: "oklch(0.17 0.04 280)",
                    border: "1px solid oklch(0.28 0.05 280 / 0.6)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{action.icon}</span>
                    {action.done && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "oklch(0.65 0.16 185 / 0.15)", color: "oklch(0.65 0.16 185)" }}>
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                </motion.div>
              </Link>
            ))}
            {/* Life Domains card with streak badge */}
            <Link href="/domains">
              <motion.div
                whileTap={{ scale: 0.96 }}
                className="rounded-2xl p-4 space-y-3 cursor-pointer transition-all hover:shadow-md"
                style={{
                  background: "oklch(0.17 0.04 280)",
                  border: "1px solid oklch(0.28 0.05 280 / 0.6)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🧭</span>
                  {habitStreak && habitStreak.streak > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ background: "oklch(0.55 0.14 290 / 0.2)", color: "oklch(0.70 0.14 290)" }}>
                      🔥 {habitStreak.streak} day
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground">Life Domains</p>
              </motion.div>
            </Link>
            {/* Calendar card with upcoming events preview */}
            <Link href="/calendar">
              <motion.div
                whileTap={{ scale: 0.96 }}
                className="rounded-2xl p-4 space-y-3 cursor-pointer transition-all hover:shadow-md"
                style={{
                  background: "oklch(0.17 0.04 280)",
                  border: "1px solid oklch(0.28 0.05 280 / 0.6)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">📅</span>
                </div>
                <p className="text-sm font-semibold text-foreground">Calendar</p>
                {upcomingEvents && upcomingEvents.length > 0 ? (
                  <div className="space-y-1.5 text-xs">
                    {upcomingEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="text-primary line-clamp-1">
                        <span className="font-medium">{event.title}</span>
                        <span className="text-muted-foreground ml-1">
                          {format(new Date(event.eventDate), "MMM d")}
                        </span>
                      </div>
                    ))}
                    {upcomingEvents.length > 2 && (
                      <p className="text-primary font-medium">+{upcomingEvents.length - 2} more</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No upcoming events</p>
                )}
              </motion.div>
            </Link>
          </div>
        </motion.div>

        {/* ── Rewards card ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.20 }}
        >
          <Link href="/rewards">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="rounded-2xl p-5 cursor-pointer"
              style={{
                background: welcomeSpin?.available
                  ? "linear-gradient(135deg, oklch(0.55 0.18 290 / 0.2), oklch(0.65 0.16 185 / 0.2))"
                  : "oklch(0.17 0.04 280)",
                border: welcomeSpin?.available
                  ? "1px solid oklch(0.65 0.16 185 / 0.3)"
                  : "1px solid oklch(0.28 0.05 280 / 0.6)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "oklch(0.65 0.16 185 / 0.15)" }}>
                    <Gift size={20} className="text-primary" />
                  </div>
                  <div>
                    {welcomeSpin?.available ? (
                      <>
                        <p className="text-sm font-semibold text-primary">🎁 Free Welcome Spin!</p>
                        <p className="text-xs text-muted-foreground">Try your luck on the reward wheel</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground">Rewards</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="text-primary font-semibold">{rewardPoints?.total ?? 0}</span> points earned
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* ── Growth dashboard link ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.24 }}
        >
          <Link href="/dashboard">
            <div
              className="rounded-2xl p-5 space-y-3 cursor-pointer transition-all hover:shadow-md"
              style={{
                background: "oklch(0.17 0.04 280)",
                border: "1px solid oklch(0.28 0.05 280 / 0.6)",
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-primary uppercase tracking-widest font-medium">Growth Dashboard</p>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-serif text-primary">✦</div>
                <p className="text-sm text-muted-foreground">Insights, reflections & your evolution</p>
              </div>
            </div>
          </Link>
        </motion.div>

      </div>
    </AppShell>
    {/* Welcome spin modal - auto-pops for new users */}
    <WelcomeSpinModal
      open={showWelcomeSpin}
      onClose={() => setShowWelcomeSpin(false)}
    />
    </>
  );
}
