import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import AppShell from "@/components/AppShell";
import { Sparkles, Sun, Moon, Bell, User, ChevronRight } from "lucide-react";
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

// Shared tile style
const TILE_STYLE = {
  background: "oklch(0.17 0.04 280)",
  border: "1px solid oklch(0.28 0.05 280 / 0.6)",
};

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: todayCheckIn } = trpc.checkIn.today.useQuery(undefined, { enabled: isAuthenticated });
  const { data: upcomingEvents } = trpc.calendar.upcoming.useQuery(undefined, { enabled: isAuthenticated });
  const { data: habitStreak } = trpc.habits.currentStreak.useQuery(undefined, { enabled: isAuthenticated });
  const { data: rewardPoints } = trpc.rewards.points.useQuery(undefined, { enabled: isAuthenticated });
  const { data: welcomeSpin } = trpc.rewards.welcomeSpinAvailable.useQuery(undefined, { enabled: isAuthenticated });
  const { data: rewardsDashboard } = trpc.rewards.dashboard.useQuery(undefined, {
    enabled: isAuthenticated && !welcomeSpin?.available,
  });
  const { data: proStatus } = trpc.rewards.proStatus.useQuery(undefined, { enabled: isAuthenticated });
  const isPro = proStatus?.isPro ?? false;
  const [showWelcomeSpin, setShowWelcomeSpin] = useState(false);

  useEffect(() => {
    if (welcomeSpin?.available && isAuthenticated && !loading) {
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
  const greetingIcon =
    hour < 17 ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-violet-400" />;
  const name = profile?.preferredName || user?.name?.split(" ")[0] || "friend";
  const today = format(new Date(), "EEEE, MMMM d");

  // Rewards tile accent
  const hasWelcomeSpin = welcomeSpin?.available;
  const pendingSpins = rewardsDashboard?.pendingStreakSpins ?? 0;
  const rewardsBg = hasWelcomeSpin
    ? "linear-gradient(135deg, oklch(0.55 0.18 290 / 0.22), oklch(0.65 0.16 185 / 0.22))"
    : pendingSpins > 0
    ? "linear-gradient(135deg, oklch(0.60 0.18 50 / 0.18), oklch(0.55 0.18 290 / 0.14))"
    : TILE_STYLE.background;
  const rewardsBorder = hasWelcomeSpin
    ? "1px solid oklch(0.65 0.16 185 / 0.35)"
    : pendingSpins > 0
    ? "1px solid oklch(0.60 0.18 50 / 0.4)"
    : TILE_STYLE.border;

  // Rewards label
  const rewardsLabel = hasWelcomeSpin
    ? "🎁 Welcome Spin!"
    : pendingSpins > 0
    ? `🎡 ${pendingSpins} Free Spin${pendingSpins > 1 ? "s" : ""}!`
    : `${rewardPoints?.total ?? 0} pts`;
  const rewardsLabelColor = hasWelcomeSpin || pendingSpins > 0 ? "oklch(0.75 0.16 55)" : undefined;

  // Calendar subtitle
  const calendarSub =
    upcomingEvents && upcomingEvents.length > 0
      ? upcomingEvents[0].title
      : "No upcoming events";

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
                  <button
                    className="px-3 py-1.5 rounded-full transition-colors text-xs font-semibold"
                    style={{ background: "oklch(0.65 0.16 185 / 0.15)", color: "oklch(0.65 0.16 185)" }}
                  >
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
              <AnimatedName name={name} />
            </h1>
          </motion.div>

          {/* ── Check-in card ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            {todayCheckIn ? (
              /* Completed — clickable link to the check-in detail / AI reflection */
              <Link href="/checkin">
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className="rounded-xl px-4 py-2.5 cursor-pointer"
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
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "oklch(0.65 0.16 185 / 0.15)", color: "oklch(0.65 0.16 185)" }}
                      >
                        ✓ Done
                      </span>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                  {todayCheckIn.aiResponse && (
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic">
                      "{todayCheckIn.aiResponse.slice(0, 80)}…"
                    </p>
                  )}
                </motion.div>
              </Link>
            ) : (
              /* Not done yet — CTA to start check-in */
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

          {/* ── Journey Access 3×2 grid (6 equal tiles) ────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
            className="space-y-1.5"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
              Journey Access
            </p>

            <div className="grid grid-cols-2 gap-2">
              {/* Row 1 */}
              <Link href="/chat" className="block">
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  className="rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md h-20"
                  style={TILE_STYLE}
                >
                  <span className="text-xl">🪞</span>
                  <p className="text-xs font-semibold text-foreground">Talk to Mirror</p>
                </motion.div>
              </Link>

              <Link href="/journal" className="block">
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  className="rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md h-20"
                  style={TILE_STYLE}
                >
                  <span className="text-xl">📝</span>
                  <p className="text-xs font-semibold text-foreground">Journal</p>
                </motion.div>
              </Link>

              {/* Row 2 */}
              <Link href="/domains" className="block">
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  className="rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md h-20"
                  style={TILE_STYLE}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xl">🧭</span>
                    {habitStreak && habitStreak.streak > 0 && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: "oklch(0.55 0.14 290 / 0.2)", color: "oklch(0.70 0.14 290)" }}
                      >
                        🔥 {habitStreak.streak}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-foreground">Life Domains</p>
                </motion.div>
              </Link>

              <Link href="/programs" className="block">
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  className="rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md h-20"
                  style={TILE_STYLE}
                >
                  <span className="text-xl">🎓</span>
                  <p className="text-xs font-semibold text-foreground">Programs</p>
                </motion.div>
              </Link>

              {/* Row 3 — Rewards tile */}
              <Link href="/rewards" className="block">
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  className="rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md h-20"
                  style={{ background: rewardsBg, border: rewardsBorder }}
                >
                  <span className="text-xl">🎁</span>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: rewardsLabelColor ?? "oklch(0.92 0.02 280)" }}
                  >
                    {rewardsLabel}
                  </p>
                </motion.div>
              </Link>

              {/* Row 3 — Calendar tile */}
              <Link href="/calendar" className="block">
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  className="rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md h-20"
                  style={TILE_STYLE}
                >
                  <span className="text-xl">📅</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Calendar</p>
                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{calendarSub}</p>
                  </div>
                </motion.div>
              </Link>
            </div>
          </motion.div>

        </div>
      </AppShell>

      {/* Welcome spin modal */}
      <WelcomeSpinModal open={showWelcomeSpin} onClose={() => setShowWelcomeSpin(false)} />
    </>
  );
}
