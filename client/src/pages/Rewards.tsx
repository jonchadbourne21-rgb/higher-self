import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Gift, Star, Zap, Trophy, ChevronRight, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";

// ── Wheel segments ──────────────────────────────────────────────────────────
const SEGMENTS = [
  { id: "month_pro", label: "1 Month\nFree Pro", color: "oklch(0.55 0.18 290)", textColor: "#fff", icon: "👑" },
  { id: "five_percent_off", label: "5% Off\nAnnual", color: "oklch(0.35 0.08 280)", textColor: "#ddd", icon: "💰" },
  { id: "try_again", label: "Try\nAgain", color: "oklch(0.22 0.06 280)", textColor: "#aaa", icon: "🔄" },
  { id: "week_trial", label: "1 Week\nFree Trial", color: "oklch(0.45 0.14 185)", textColor: "#fff", icon: "⭐" },
  { id: "reward_points", label: "+5\nPoints", color: "oklch(0.50 0.12 160)", textColor: "#fff", icon: "✨" },
  { id: "five_percent_off_2", label: "5% Off\nAnnual", color: "oklch(0.35 0.08 280)", textColor: "#ddd", icon: "💰" },
  { id: "try_again_2", label: "Try\nAgain", color: "oklch(0.22 0.06 280)", textColor: "#aaa", icon: "🔄" },
  { id: "reward_points_2", label: "+5\nPoints", color: "oklch(0.50 0.12 160)", textColor: "#fff", icon: "✨" },
];

// Map result IDs to segment indices for landing
const RESULT_TO_SEGMENT: Record<string, number> = {
  month_pro: 0,
  five_percent_off: 1,
  try_again: 2,
  week_trial: 3,
  reward_points: 4,
};

// ── Spin Wheel Component ────────────────────────────────────────────────────
function SpinWheel({
  onSpin,
  spinning,
  disabled,
}: {
  onSpin: () => void;
  spinning: boolean;
  disabled: boolean;
}) {
  const [rotation, setRotation] = useState(0);

  return (
    <div className="relative flex flex-col items-center">
      {/* Wheel */}
      <div className="relative w-64 h-64">
        {/* Outer glow ring */}
        <div
          className="absolute inset-[-4px] rounded-full"
          style={{
            background: "conic-gradient(oklch(0.65 0.16 185), oklch(0.55 0.18 290), oklch(0.65 0.16 185))",
            filter: "blur(4px)",
            opacity: spinning ? 0.8 : 0.4,
            transition: "opacity 0.3s",
          }}
        />
        {/* Wheel SVG */}
        <motion.svg
          viewBox="0 0 200 200"
          className="w-full h-full relative z-10"
          animate={{ rotate: rotation }}
          transition={
            spinning
              ? { duration: 4, ease: [0.2, 0.8, 0.3, 1] }
              : { duration: 0 }
          }
        >
          {SEGMENTS.map((seg, i) => {
            const angle = 360 / SEGMENTS.length;
            const startAngle = i * angle - 90;
            const endAngle = startAngle + angle;
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            const x1 = 100 + 95 * Math.cos(startRad);
            const y1 = 100 + 95 * Math.sin(startRad);
            const x2 = 100 + 95 * Math.cos(endRad);
            const y2 = 100 + 95 * Math.sin(endRad);
            const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
            const textX = 100 + 60 * Math.cos(midAngle);
            const textY = 100 + 60 * Math.sin(midAngle);
            const textRotation = (startAngle + endAngle) / 2 + 90;

            return (
              <g key={i}>
                <path
                  d={`M100,100 L${x1},${y1} A95,95 0 0,1 ${x2},${y2} Z`}
                  fill={seg.color}
                  stroke="oklch(0.13 0.04 280)"
                  strokeWidth="1"
                />
                <text
                  x={textX}
                  y={textY}
                  fill={seg.textColor}
                  fontSize="7"
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                >
                  {seg.label.split("\n").map((line, li) => (
                    <tspan key={li} x={textX} dy={li === 0 ? "-3" : "9"}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
          {/* Center circle */}
          <circle cx="100" cy="100" r="18" fill="oklch(0.17 0.04 280)" stroke="oklch(0.65 0.16 185)" strokeWidth="2" />
          <text x="100" y="100" fill="oklch(0.65 0.16 185)" fontSize="10" fontWeight="700" textAnchor="middle" dominantBaseline="middle">
            SPIN
          </text>
        </motion.svg>
        {/* Pointer triangle at top */}
        <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 z-20">
          <div
            className="w-0 h-0"
            style={{
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "18px solid oklch(0.65 0.16 185)",
              filter: "drop-shadow(0 2px 4px oklch(0.65 0.16 185 / 0.5))",
            }}
          />
        </div>
      </div>

      {/* Spin button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onSpin}
        disabled={disabled || spinning}
        className="mt-5 px-8 py-3 rounded-2xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: disabled
            ? "oklch(0.25 0.04 280)"
            : "linear-gradient(135deg, oklch(0.50 0.14 185), oklch(0.55 0.14 200))",
          color: disabled ? "oklch(0.50 0.03 270)" : "#fff",
          boxShadow: disabled ? "none" : "0 4px 20px oklch(0.50 0.14 185 / 0.3)",
        }}
      >
        {spinning ? (
          <span className="flex items-center gap-2">
            <RotateCcw size={16} className="animate-spin" /> Spinning...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Sparkles size={16} /> Spin the Wheel
          </span>
        )}
      </motion.button>
    </div>
  );
}

// ── Prize Result Modal ──────────────────────────────────────────────────────
function PrizeModal({
  open,
  prizeLabel,
  isWelcome,
  onClose,
}: {
  open: boolean;
  prizeLabel: string | null;
  isWelcome: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          style={{ background: "oklch(0.08 0.02 280 / 0.8)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="w-full max-w-sm rounded-3xl p-8 text-center space-y-5"
            style={{
              background: "oklch(0.17 0.04 280)",
              border: "1px solid oklch(0.65 0.16 185 / 0.3)",
              boxShadow: "0 8px 40px oklch(0.65 0.16 185 / 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              className="text-6xl"
            >
              🎉
            </motion.div>
            <h2 className="text-2xl font-serif text-foreground">You Won!</h2>
            <div
              className="rounded-2xl p-4"
              style={{ background: "oklch(0.65 0.16 185 / 0.1)", border: "1px solid oklch(0.65 0.16 185 / 0.2)" }}
            >
              <p className="text-lg font-semibold text-primary">{prizeLabel}</p>
            </div>
            {isWelcome && (
              <div
                className="rounded-xl p-4 text-left space-y-2"
                style={{ background: "oklch(0.55 0.18 290 / 0.1)", border: "1px solid oklch(0.55 0.18 290 / 0.2)" }}
              >
                <p className="text-sm font-semibold text-accent-foreground flex items-center gap-2">
                  <Zap size={14} className="text-amber-400" /> Want another spin?
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Check in <strong className="text-foreground">3 days in a row</strong> to earn a free spin on the reward wheel.
                  Every daily check-in also earns you <strong className="text-foreground">1 reward point</strong>!
                </p>
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="w-full py-3 rounded-2xl font-semibold text-sm text-white"
              style={{
                background: "linear-gradient(135deg, oklch(0.50 0.14 185), oklch(0.55 0.14 200))",
              }}
            >
              Awesome!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Source label helper ──────────────────────────────────────────────────────
function sourceLabel(source: string): string {
  switch (source) {
    case "checkin": return "Daily Check-in";
    case "habit": return "Habit Completion";
    case "journal": return "Journal Entry";
    case "chat": return "AI Chat";
    case "spin": return "Wheel Spin";
    case "redemption": return "Redeemed";
    default: return source;
  }
}

function sourceIcon(source: string): string {
  switch (source) {
    case "checkin": return "✅";
    case "habit": return "🎯";
    case "journal": return "📝";
    case "chat": return "💬";
    case "spin": return "🎰";
    case "redemption": return "🎁";
    default: return "⭐";
  }
}

// ── Main Rewards Page ───────────────────────────────────────────────────────
export default function Rewards() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [spinning, setSpinning] = useState(false);
  const [prizeModal, setPrizeModal] = useState<{ open: boolean; label: string | null; isWelcome: boolean }>({
    open: false,
    label: null,
    isWelcome: false,
  });
  const [activeTab, setActiveTab] = useState<"spin" | "points" | "redeem">("spin");

  const { data: dashboard, refetch } = trpc.rewards.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const spinMutation = trpc.rewards.spin.useMutation();
  const redeemMutation = trpc.rewards.redeem.useMutation();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading, navigate]);

  const handleSpin = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);

    const type = !dashboard?.welcomeSpinUsed ? "welcome" : "streak";
    try {
      const result = await spinMutation.mutateAsync({ type });
      if (!result.success) {
        toast.error(result.error || "Spin failed");
        setSpinning(false);
        return;
      }

      // Wait for animation
      setTimeout(() => {
        setSpinning(false);
        setPrizeModal({
          open: true,
          label: result.prizeLabel,
          isWelcome: type === "welcome",
        });
        refetch();
      }, 4200);
    } catch (e) {
      toast.error("Something went wrong");
      setSpinning(false);
    }
  }, [spinning, dashboard?.welcomeSpinUsed, spinMutation, refetch]);

  const handleRedeem = useCallback(
    async (tierId: string) => {
      try {
        const result = await redeemMutation.mutateAsync({ tierId });
        if (result.success) {
          toast.success("Reward redeemed! Check your account.");
          refetch();
        } else {
          toast.error(result.error || "Redemption failed");
        }
      } catch {
        toast.error("Something went wrong");
      }
    },
    [redeemMutation, refetch]
  );

  const canSpin = useMemo(() => {
    if (!dashboard) return false;
    // Welcome spin not used yet
    if (!dashboard.welcomeSpinUsed) return true;
    // TODO: check if 3-day streak qualifies for another spin
    return false;
  }, [dashboard]);

  const tabs = [
    { id: "spin" as const, label: "Spin", icon: Sparkles },
    { id: "points" as const, label: "Points", icon: Star },
    { id: "redeem" as const, label: "Redeem", icon: Gift },
  ];

  return (
    <AppShell>
      <div className="px-5 pt-4 pb-6 space-y-5">
        {/* ── Points balance header ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Reward Points</p>
          <div className="flex items-center justify-center gap-3">
            <motion.span
              key={dashboard?.totalPoints}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-serif font-light text-primary"
            >
              {dashboard?.totalPoints ?? 0}
            </motion.span>
            <Star size={24} className="text-amber-400 fill-amber-400" />
          </div>
          <p className="text-xs text-muted-foreground">Earn points from check-ins, habits, and spins</p>
        </motion.div>

        {/* ── Tab switcher ───────────────────────────────────────────── */}
        <div
          className="flex rounded-2xl p-1"
          style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.24 0.04 280)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={
                activeTab === tab.id
                  ? { background: "oklch(0.65 0.16 185 / 0.15)", color: "oklch(0.65 0.16 185)" }
                  : { color: "oklch(0.58 0.03 270)" }
              }
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Spin tab ───────────────────────────────────────────────── */}
        {activeTab === "spin" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Welcome spin banner */}
            {!dashboard?.welcomeSpinUsed && (
              <div
                className="rounded-2xl p-4 text-center space-y-1"
                style={{
                  background: "linear-gradient(135deg, oklch(0.55 0.18 290 / 0.15), oklch(0.65 0.16 185 / 0.15))",
                  border: "1px solid oklch(0.65 0.16 185 / 0.25)",
                }}
              >
                <p className="text-sm font-semibold text-primary">🎁 Welcome Gift!</p>
                <p className="text-xs text-muted-foreground">
                  You have a free spin waiting. Try your luck!
                </p>
              </div>
            )}

            <SpinWheel onSpin={handleSpin} spinning={spinning} disabled={!canSpin} />

            {dashboard?.welcomeSpinUsed && !canSpin && (
              <div
                className="rounded-2xl p-4 text-center space-y-2"
                style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.24 0.04 280)" }}
              >
                <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-2">
                  <Zap size={14} className="text-amber-400" /> Earn More Spins
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Check in <strong className="text-foreground">3 days in a row</strong> to unlock another free spin.
                  Keep your streak alive!
                </p>
              </div>
            )}

            {/* Recent spins */}
            {dashboard?.spinHistory && dashboard.spinHistory.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Recent Spins</p>
                <div className="space-y-2">
                  {dashboard.spinHistory.slice(0, 5).map((spin) => (
                    <div
                      key={spin.id}
                      className="flex items-center justify-between rounded-xl p-3"
                      style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.24 0.04 280)" }}
                    >
                      <span className="text-sm text-foreground">{spin.prizeValue || spin.result}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(spin.spinnedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Points tab ─────────────────────────────────────────────── */}
        {activeTab === "points" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* How to earn */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">How to Earn</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "✅", label: "Daily Check-in", points: "+1 pt" },
                  { icon: "🎯", label: "Complete Habit", points: "+1 pt" },
                  { icon: "📝", label: "Journal Entry", points: "+1 pt" },
                  { icon: "🎰", label: "Wheel Spin", points: "+5 pts" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-3 text-center space-y-1"
                    style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.24 0.04 280)" }}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                    <p className="text-xs font-semibold text-primary">{item.points}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Points history */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Points History</p>
              {dashboard?.history && dashboard.history.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl p-3"
                      style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.24 0.04 280)" }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{sourceIcon(entry.source)}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{sourceLabel(entry.source)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: entry.points > 0 ? "oklch(0.65 0.16 185)" : "oklch(0.55 0.20 25)" }}
                      >
                        {entry.points > 0 ? "+" : ""}{entry.points}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="rounded-2xl p-8 text-center"
                  style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.24 0.04 280)" }}
                >
                  <p className="text-3xl mb-3">⭐</p>
                  <p className="text-sm text-muted-foreground">No points yet. Complete your first check-in!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Redeem tab ─────────────────────────────────────────────── */}
        {activeTab === "redeem" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Redeem Points</p>
              {dashboard?.redemptionTiers.map((tier) => {
                const canAfford = (dashboard?.totalPoints ?? 0) >= tier.points;
                return (
                  <div
                    key={tier.id}
                    className="rounded-2xl p-4 space-y-3"
                    style={{
                      background: canAfford
                        ? "oklch(0.65 0.16 185 / 0.08)"
                        : "oklch(0.17 0.04 280)",
                      border: `1px solid ${canAfford ? "oklch(0.65 0.16 185 / 0.25)" : "oklch(0.24 0.04 280)"}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{tier.name}</p>
                        <p className="text-xs text-muted-foreground">{tier.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-serif font-semibold text-primary">{tier.points}</p>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleRedeem(tier.id)}
                      disabled={!canAfford || redeemMutation.isPending}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: canAfford
                          ? "linear-gradient(135deg, oklch(0.50 0.14 185), oklch(0.55 0.14 200))"
                          : "oklch(0.22 0.06 280)",
                        color: canAfford ? "#fff" : "oklch(0.50 0.03 270)",
                      }}
                    >
                      {canAfford ? "Redeem" : `Need ${tier.points - (dashboard?.totalPoints ?? 0)} more pts`}
                    </motion.button>
                  </div>
                );
              })}
            </div>

            {/* Streak milestones */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Streak Milestones</p>
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.24 0.04 280)" }}
              >
                {[
                  { days: 30, reward: "2 Months Free Pro", icon: "🎯", color: "oklch(0.65 0.16 185)" },
                  { days: 100, reward: "1 Year Free Pro", icon: "🏆", color: "oklch(0.55 0.18 290)" },
                ].map((milestone) => {
                  const achieved = dashboard?.streakRewards?.some((r) => r.streakDays === milestone.days);
                  return (
                    <div key={milestone.days} className="flex items-center gap-3">
                      <span className="text-2xl">{achieved ? "✅" : milestone.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {milestone.days}-Day Streak
                        </p>
                        <p className="text-xs" style={{ color: milestone.color }}>
                          {milestone.reward}
                        </p>
                      </div>
                      {achieved && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ background: "oklch(0.65 0.16 185 / 0.15)", color: "oklch(0.65 0.16 185)" }}>
                          Earned!
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Prize modal */}
      <PrizeModal
        open={prizeModal.open}
        prizeLabel={prizeModal.label}
        isWelcome={prizeModal.isWelcome}
        onClose={() => setPrizeModal({ open: false, label: null, isWelcome: false })}
      />
    </AppShell>
  );
}
