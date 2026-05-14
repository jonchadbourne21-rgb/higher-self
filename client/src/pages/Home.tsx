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
  const { data: rewardsDashboard } = trpc.rewards.dashboard.useQuery(undefined, { enabled: isAuthenticated && !welcomeSpin?.available });
  const { data: proStatus } = trpc.rewards.proStatus.useQuery(undefined, { enabled: isAuthenticated });
  const isPro = proStatus?.isPro ?? false;
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
      <div className="px-4 pt-2 pb-2 space-y-2">

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
                <button className="relative p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground">
                  <User className="w-4 h-4" />
                  {isPro && (
                    <span
                      className="absolute -top-0.5 -right-0.5 text-[8px] font-bold leading-none px-1 py-0.5 rounded-full"
                      style={{ background: "oklch(0.65 0.16 185)", color: "oklch(0.10 0.02 280)" }}
                    >
                      PRO
                    </span>
                  )}
                </button>
              </Link>
            </div>
          </div>
          <h1 className="text-xl font-serif font-light text-foreground leading-tight">
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              style={{ display: "inline-block" }}
            >
              {greeting},
            </motion.span>
            <br />
            <AnimatedName name={profile?.preferredName || user?.name?.split(" ")[0] || name} />
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
              className="rounded-xl px-4 py-2.5"
              style={{
                background: "oklch(0.17 0.04 280)",
                border: "1px solid oklch(0.28 0.06 290 / 0.6)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-primary">Today's Check-in</p>
                  <div className="flex items-center gap-2">
                    {[
                      { label: "M", value: todayCheckIn.mood },
                      { label: "E", value: todayCheckIn.energy },
                      { label: "S", value: todayCheckIn.stress },
                    ].map(({ label, value }) => (
                      <span key={label} className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{value}</span>
                        <span className="ml-0.5">{label}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "oklch(0.65 0.16 185 / 0.15)", color: "oklch(0.65 0.16 185)" }}>
                  ✓ Done
                </span>
              </div>
            </div>
          ) : (
            <Link href="/checkin">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="rounded-xl px-4 py-2.5 cursor-pointer flex items-center justify-between"
                style={{
                  background: "linear-gradient(135deg, oklch(0.46 0.14 185), oklch(0.52 0.14 200))",
                  boxShadow: "0 4px 16px oklch(0.46 0.14 185 / 0.22)",
                }}
              >
                <div>
                  <p className="text-sm font-semibold text-white">How are you today?</p>
                  <p className="text-xs text-white/70">Complete your daily check-in</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={16} className="text-white" />
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
          className="space-y-2"
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Journey Access</p>

          {/* 2x2 grid — fixed height tiles, not aspect-square, to keep them compact */}
          <div className="grid grid-cols-2 gap-2">
            {/* Mirror */}
            <Link href="/chat" className="block">
              <motion.div
                whileTap={{ scale: 0.96 }}
                className="rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md h-20"
                style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.28 0.05 280 / 0.6)" }}
              >
                <span className="text-xl">🪞</span>
                <p className="text-xs font-semibold text-foreground">Talk to Mirror</p>
              </motion.div>
            </Link>

            {/* Journal */}
            <Link href="/journal" className="block">
              <motion.div
                whileTap={{ scale: 0.96 }}
                className="rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md h-20"
                style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.28 0.05 280 / 0.6)" }}
              >
                <span className="text-xl">📝</span>
                <p className="text-xs font-semibold text-foreground">Journal</p>
              </motion.div>
            </Link>

            {/* Life Domains with streak badge */}
            <Link href="/domains" className="block">
              <motion.div
                whileTap={{ scale: 0.96 }}
                className="rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md h-20"
                style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.28 0.05 280 / 0.6)" }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xl">🧭</span>
                  {habitStreak && habitStreak.streak > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: "oklch(0.55 0.14 290 / 0.2)", color: "oklch(0.70 0.14 290)" }}>
                      🔥 {habitStreak.streak}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-foreground">Life Domains</p>
              </motion.div>
            </Link>

            {/* Programs */}
            <Link href="/programs" className="block">
              <motion.div
                whileTap={{ scale: 0.96 }}
                className="rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md h-20"
                style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.28 0.05 280 / 0.6)" }}
              >
                <span className="text-xl">🎓</span>
                <p className="text-xs font-semibold text-foreground">Programs</p>
              </motion.div>
            </Link>
          </div>

          {/* Rewards row */}
          <Link href="/rewards">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="rounded-xl px-3 py-2 cursor-pointer"
              style={{
                background: welcomeSpin?.available
                  ? "linear-gradient(135deg, oklch(0.55 0.18 290 / 0.2), oklch(0.65 0.16 185 / 0.2))"
                  : (rewardsDashboard?.pendingStreakSpins ?? 0) > 0
                  ? "linear-gradient(135deg, oklch(0.60 0.18 50 / 0.15), oklch(0.55 0.18 290 / 0.12))"
                  : "oklch(0.17 0.04 280)",
                border: welcomeSpin?.available
                  ? "1px solid oklch(0.65 0.16 185 / 0.3)"
                  : (rewardsDashboard?.pendingStreakSpins ?? 0) > 0
                  ? "1px solid oklch(0.60 0.18 50 / 0.35)"
                  : "1px solid oklch(0.28 0.05 280 / 0.6)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(0.65 0.16 185 / 0.15)" }}>
                    <Gift size={14} className="text-primary" />
                  </div>
                  <div>
                    {welcomeSpin?.available ? (
                      <p className="text-xs font-semibold text-primary">🎁 Free Welcome Spin!</p>
                    ) : (rewardsDashboard?.pendingStreakSpins ?? 0) > 0 ? (
                      <p className="text-xs font-semibold" style={{ color: "oklch(0.75 0.16 55)" }}>
                        🎡 {rewardsDashboard?.pendingStreakSpins} Free Spin{(rewardsDashboard?.pendingStreakSpins ?? 0) > 1 ? "s" : ""} Ready!
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-foreground">
                        Rewards · <span className="text-primary">{rewardPoints?.total ?? 0} pts</span>
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </motion.div>
          </Link>

          {/* Full-width Calendar row */}
          <Link href="/calendar">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="rounded-xl px-3 py-2 cursor-pointer transition-all hover:shadow-md"
              style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.28 0.05 280 / 0.6)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📅</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Calendar</p>
                    {upcomingEvents && upcomingEvents.length > 0 ? (
                      <p className="text-[10px] text-primary mt-0">
                        {upcomingEvents[0].title}
                        <span className="text-muted-foreground ml-1">
                          · {format(new Date(upcomingEvents[0].eventDate), "MMM d")}
                        </span>
                        {upcomingEvents.length > 1 && (
                          <span className="text-muted-foreground"> +{upcomingEvents.length - 1} more</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">No upcoming events</p>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </div>
            </motion.div>
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
