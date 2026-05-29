import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Sparkles, Sun, Moon, Bell, User, ChevronRight } from "lucide-react";
import WelcomeSpinModal from "@/components/WelcomeSpinModal";
import { format } from "date-fns";
import { BookOpen } from "lucide-react";
import AppShell from "@/components/AppShell";

// Inline SVG sparkline for the last 7 Aura scores
function AuraSparkline({ data }: { data: { date: Date; aura: number }[] }) {
  if (!data || data.length < 2) return null;
  const W = 120, H = 28, PAD = 2;
  const min = 1, max = 10;
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((d.aura - min) / (max - min)) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const lastPt = pts[pts.length - 1].split(",");
  const lastAura = data[data.length - 1].aura;
  const dotColor =
    lastAura >= 9 ? "oklch(0.82 0.18 55)" :
    lastAura >= 7 ? "oklch(0.78 0.16 185)" :
    lastAura >= 5 ? "oklch(0.72 0.12 240)" :
    lastAura >= 3 ? "oklch(0.65 0.10 280)" : "oklch(0.55 0.08 300)";
  return (
    <div className="flex items-center gap-2">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <polyline
          points={polyline}
          fill="none"
          stroke="oklch(0.65 0.16 185 / 0.5)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastPt[0]} cy={lastPt[1]} r="3" fill={dotColor} />
      </svg>
      <span className="text-[10px] text-muted-foreground">7-day aura</span>
    </div>
  );
}

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
  const { data: auraHistory } = trpc.checkIn.auraHistory.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myEnrollments } = trpc.programs.myEnrollments.useQuery(undefined, { enabled: isAuthenticated });
  const { data: tileEngagement } = trpc.home.tileEngagement.useQuery(undefined, { enabled: isAuthenticated });
  const isPro = proStatus?.isPro ?? false;
  const [showWelcomeSpin, setShowWelcomeSpin] = useState(false);
  const [showFaqPulse, setShowFaqPulse] = useState(false);

  // Show FAQ pulse for new users (first 3 visits only)
  useEffect(() => {
    const key = "mentrove_faq_pulse_dismissed";
    const dismissed = localStorage.getItem(key);
    if (!dismissed) {
      const count = parseInt(localStorage.getItem("mentrove_faq_pulse_count") || "0", 10);
      if (count < 3) {
        setShowFaqPulse(true);
        localStorage.setItem("mentrove_faq_pulse_count", String(count + 1));
      } else {
        localStorage.setItem(key, "1");
      }
    }
  }, []);

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
    // Dark Blue — calm, trustworthy, reward depth (default state)
    : "oklch(0.14 0.06 255)";
  const rewardsBorder = hasWelcomeSpin
    ? "1px solid oklch(0.65 0.16 185 / 0.35)"
    : pendingSpins > 0
    ? "1px solid oklch(0.60 0.18 50 / 0.4)"
    : "1px solid oklch(0.36 0.11 255 / 0.55)";

  // Rewards label
  const rewardsLabel = hasWelcomeSpin
    ? "🎁 Welcome Spin!"
    : pendingSpins > 0
    ? `🎡 ${pendingSpins} Free Spin${pendingSpins > 1 ? "s" : ""}!`
    : (rewardPoints?.total ?? 0) === 0
    ? "Earn your first spin →"
    : `${rewardPoints?.total ?? 0} pts`;
  const rewardsLabelColor = hasWelcomeSpin || pendingSpins > 0 ? "oklch(0.75 0.16 55)" : undefined;

  // Calendar subtitle
  const calendarSub =
    upcomingEvents && upcomingEvents.length > 0
      ? upcomingEvents[0].title
      : "No upcoming events";

  // Dynamic tile order based on engagement — most-used feature goes top-left
  const TILE_DEFS = useMemo(() => [
    { key: "mirror",   href: "/mirror",   emoji: "🪞", label: "Talk to Mirror",  sub: "Reflect & grow",   score: tileEngagement?.mirror ?? 0 },
    { key: "programs", href: "/programs", emoji: "🎓", label: "Programs",        sub: "Guided growth",   score: tileEngagement?.programs ?? 0 },
    { key: "habits",   href: "/domains",  emoji: "🧭", label: "Positive Habits", sub: "Build your habits", score: tileEngagement?.habits ?? 0 },
    { key: "journal",  href: "/journal",  emoji: "📝", label: "Journal",          sub: "Write your thoughts", score: tileEngagement?.journal ?? 0 },
    { key: "rewards",  href: "/rewards",  emoji: "🎁", label: rewardsLabel,      sub: "Spin & earn",     score: tileEngagement?.rewards ?? 0 },
    { key: "calendar", href: "/calendar", emoji: "📅", label: "Calendar",         sub: calendarSub || "Plan your week", score: tileEngagement?.calendar ?? 0 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [tileEngagement, rewardsLabel, calendarSub]);

  const sortedTiles = useMemo(
    () => [...TILE_DEFS].sort((a, b) => b.score - a.score),
    [TILE_DEFS]
  );

  // Aura score — weighted average of mood (40%), energy (30%), stress inverted (30%)
  const auraScore = todayCheckIn
    ? Math.round(
        (todayCheckIn.mood * 0.4 +
          todayCheckIn.energy * 0.3 +
          (11 - todayCheckIn.stress) * 0.3)
      )
    : null;
  const auraLabel =
    auraScore === null
      ? null
      : auraScore >= 9
      ? "✨ Radiant"
      : auraScore >= 7
      ? "💫 Vibrant"
      : auraScore >= 5
      ? "🌤 Balanced"
      : auraScore >= 3
      ? "🌧 Heavy"
      : "🌑 Low";
  const auraColor =
    auraScore === null
      ? "oklch(0.70 0.02 280)"
      : auraScore >= 9
      ? "oklch(0.82 0.18 55)"
      : auraScore >= 7
      ? "oklch(0.78 0.16 185)"
      : auraScore >= 5
      ? "oklch(0.72 0.12 240)"
      : auraScore >= 3
      ? "oklch(0.65 0.10 280)"
      : "oklch(0.55 0.08 300)";

  // Tile accent styles
  // Darker Forest Green — deeper than Positive Habits, grounding
  const TILE_MIRROR = {
    background: "oklch(0.12 0.07 145)",
    border: "1px solid oklch(0.32 0.13 145 / 0.55)",
  };
  // Deep Amethyst / Dark Indigo — introspection, wisdom (was Mirror)
  const TILE_JOURNAL = {
    background: "oklch(0.15 0.06 290)",
    border: "1px solid oklch(0.40 0.14 290 / 0.55)",
  };
  // Dark Slate Blue — calming, structured (was Journal)
  const TILE_DOMAINS = {
    background: "oklch(0.15 0.05 240)",
    border: "1px solid oklch(0.38 0.10 240 / 0.55)",
  };
  // Dark Crimson Red — intensity, drive, achievement
  const TILE_PROGRAMS = {
    background: "oklch(0.14 0.07 20)",
    border: "1px solid oklch(0.36 0.14 20 / 0.55)",
  };
  // Midnight Navy — neutral, structured, utility
  const TILE_CALENDAR = {
    background: "oklch(0.13 0.04 250)",
    border: "1px solid oklch(0.30 0.07 250 / 0.55)",
  };

  return (
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
                {isPro ? (
                  <Link href="/rewards">
                    <motion.button
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="px-3 py-1.5 rounded-full transition-colors text-xs font-semibold flex items-center gap-1"
                      style={{ background: "oklch(0.30 0.10 55 / 0.5)", color: "oklch(0.85 0.18 55)" }}
                    >
                      👑 Pro ✓
                    </motion.button>
                  </Link>
                ) : (
                  <Link href="/pricing">
                    <button
                      className="px-3 py-1.5 rounded-full transition-colors text-xs font-semibold"
                      style={{ background: "oklch(0.65 0.16 185 / 0.15)", color: "oklch(0.65 0.16 185)" }}
                    >
                      Upgrade
                    </button>
                  </Link>
                )}
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
              <span className="inline-flex items-center gap-2 flex-wrap">
                <AnimatedName name={name} />
                {isPro && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full align-middle"
                    style={{ background: "oklch(0.30 0.10 55)", color: "oklch(0.85 0.18 55)", verticalAlign: "middle" }}
                  >
                    👑 Pro
                  </motion.span>
                )}
              </span>
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
                        {auraScore !== null && (
                          <span className="text-xs font-semibold" style={{ color: auraColor }}>
                            Aura {auraScore}/10 · {auraLabel}
                          </span>
                        )}
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

          {/* ── Active Program Card ─────────────────────────────────── */}
          {myEnrollments && myEnrollments.filter(e => e.status === "in_progress" && e.program).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="space-y-1"
            >
              {myEnrollments
                .filter(e => e.status === "in_progress" && e.program)
                .map((enrollment) => {
                  const p = enrollment.program!;
                  const currentDay = enrollment.currentDay ?? 1;
                  const totalDays = p.durationDays;
                  const progress = Math.round(((currentDay - 1) / totalDays) * 100);
                  const ICONS: Record<string, string> = {
                    "21-Day Inner Voice Reset": "🪞",
                    "7-Day Emotional Mastery": "🌊",
                    "The Alan Watts Challenge": "🎭",
                    "The Stoic Path": "🏛️",
                  };
                  const CAT_ICONS: Record<string, string> = {
                    "emotional-mastery": "🌊", "building-presence": "✨",
                    "relationships": "❤️", "mindfulness": "🧘",
                    "self-awareness": "🪞", "zen-philosophy": "🎭", "stoicism": "🏛️",
                  };
                  const icon = ICONS[p.name] ?? CAT_ICONS[p.category] ?? "📖";
                  return (
                    <Link key={enrollment.id} href={`/programs/${p.id}`} className="block">
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className="rounded-xl px-4 py-3 cursor-pointer"
                        style={{
                          background: "linear-gradient(135deg, oklch(0.16 0.06 280), oklch(0.14 0.07 20 / 0.6))",
                          border: "1px solid oklch(0.32 0.10 280 / 0.5)",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{icon}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold text-foreground">{p.name}</p>
                                {(enrollment as any).streak >= 7 && (
                                  <span
                                    className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                    style={{ background: "oklch(0.55 0.18 50 / 0.25)", color: "oklch(0.80 0.18 50)" }}
                                  >
                                    🔥 {(enrollment as any).streak}d
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">Day {currentDay} of {totalDays}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(enrollment as any).streak > 0 && (enrollment as any).streak < 7 && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                                style={{ background: "oklch(0.45 0.10 50 / 0.2)", color: "oklch(0.70 0.12 50)" }}
                              >
                                🔥 {(enrollment as any).streak}
                              </span>
                            )}
                            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.25 0.04 280)" }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${progress}%`, background: "oklch(0.65 0.16 185)" }}
                              />
                            </div>
                            <ChevronRight size={14} className="text-muted-foreground" />
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
            </motion.div>
          )}

          {/* ── Aura Sparkline ──────────────────────────────────────────── */}
          {auraHistory && auraHistory.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18 }}
              className="px-1"
            >
              <AuraSparkline data={auraHistory} />
            </motion.div>
          )}

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
              {sortedTiles.map((tile, idx) => {
                // Per-tile accent styles
                const tileStyle =
                  tile.key === "mirror"   ? TILE_MIRROR :
                  tile.key === "programs" ? TILE_PROGRAMS :
                  tile.key === "habits"   ? TILE_DOMAINS :
                  tile.key === "journal"  ? TILE_JOURNAL :
                  tile.key === "rewards"  ? { background: rewardsBg, border: rewardsBorder } :
                  TILE_CALENDAR;

                return (
                  <Link key={tile.key} href={tile.href} className="block">
                    <motion.div
                      layout
                      layoutId={tile.key}
                      whileTap={{ scale: 0.96 }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: idx * 0.04 }}
                      className="rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md h-20"
                      style={tileStyle}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xl">{tile.emoji}</span>
                        {/* Habit streak badge */}
                        {tile.key === "habits" && habitStreak && habitStreak.streak > 0 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: "oklch(0.55 0.14 290 / 0.2)", color: "oklch(0.70 0.14 290)" }}
                          >
                            🔥 {habitStreak.streak}
                          </span>
                        )}
                        {/* Top-tile engagement indicator */}
                        {idx === 0 && tile.score > 0 && (
                          <span
                            className="text-[9px] px-1 py-0.5 rounded-full font-semibold"
                            style={{ background: "oklch(0.65 0.16 185 / 0.18)", color: "oklch(0.65 0.16 185)" }}
                          >
                            ★ top
                          </span>
                        )}
                      </div>
                      <div>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: tile.key === "rewards" ? (rewardsLabelColor ?? "oklch(0.92 0.02 280)") : undefined }}
                        >
                          {tile.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{tile.sub}</p>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </motion.div>

          {/* ── Footer links ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.28 }}
            className="flex justify-center items-center gap-3 pt-1 pb-4"
          >
            <Link href="/faq">
              <button
                onClick={() => {
                  setShowFaqPulse(false);
                  localStorage.setItem("mentrove_faq_pulse_dismissed", "1");
                }}
                className="text-xs transition-opacity hover:opacity-70 relative"
                style={{ color: "oklch(0.50 0.08 295)" }}
              >
                About & FAQ
                {showFaqPulse && (
                  <span
                    className="absolute -top-1 -right-2 w-2 h-2 rounded-full animate-ping"
                    style={{ background: "oklch(0.65 0.16 185)", animationDuration: "1.4s" }}
                  />
                )}
              </button>
            </Link>
            <span className="text-[10px]" style={{ color: "oklch(0.35 0.04 295)" }}>·</span>
            <Link href="/privacy">
              <button
                className="text-xs transition-opacity hover:opacity-70"
                style={{ color: "oklch(0.50 0.08 295)" }}
              >
                Privacy
              </button>
            </Link>
            <span className="text-[10px]" style={{ color: "oklch(0.35 0.04 295)" }}>·</span>
            <Link href="/terms">
              <button
                className="text-xs transition-opacity hover:opacity-70"
                style={{ color: "oklch(0.50 0.08 295)" }}
              >
                Terms
              </button>
            </Link>
          </motion.div>

      </div>
      {/* Welcome spin modal */}
      <WelcomeSpinModal open={showWelcomeSpin} onClose={() => setShowWelcomeSpin(false)} />
    </AppShell>
  );
}
