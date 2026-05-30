import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Gift, Star, Zap, Trophy, ChevronRight, Sparkles, RotateCcw, Crown, History } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

/** Fire a burst of confetti for premium prize wins */
function firePremiumConfetti() {
  const count = 200;
  const defaults = { origin: { y: 0.6 } };
  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
  }
  fire(0.25, { spread: 26, startVelocity: 55, colors: ["#a855f7", "#7c3aed", "#c084fc"] });
  fire(0.20, { spread: 60, colors: ["#f59e0b", "#fbbf24", "#fde68a"] });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ["#a855f7", "#7c3aed", "#f59e0b"] });
  fire(0.10, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ["#fff", "#f0abfc"] });
  fire(0.10, { spread: 120, startVelocity: 45, colors: ["#a855f7", "#f59e0b"] });
  // Second burst after 400ms for sustained effect
  setTimeout(() => {
    confetti({ particleCount: 80, spread: 70, origin: { x: 0.2, y: 0.5 }, colors: ["#a855f7", "#f59e0b", "#fff"] });
    confetti({ particleCount: 80, spread: 70, origin: { x: 0.8, y: 0.5 }, colors: ["#7c3aed", "#fbbf24", "#f0abfc"] });
  }, 400);
}

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

// Map backend result IDs to segment indices (some results have multiple segments)
const RESULT_TO_SEGMENT_INDEX: Record<string, number[]> = {
  month_pro: [0],
  five_percent_off: [1, 5],
  try_again: [2, 6],
  week_trial: [3],
  reward_points: [4, 7],
};

function pickSegmentIndex(result: string): number {
  const options = RESULT_TO_SEGMENT_INDEX[result];
  if (!options) return 0;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Calculate the final rotation so the pointer (at top, 0°) lands in the
 * middle of the target segment.
 *
 * Segment 0 starts at -90° (12 o'clock) and goes clockwise.
 * segmentCenter = segmentIndex * 45 + 22.5
 * To land pointer on it: target = 360 - segCenter
 * Plus multiple full rotations for dramatic effect.
 */
function calcLandingRotation(segmentIndex: number, currentRotation: number): number {
  const segAngle = 360 / SEGMENTS.length; // 45°
  const segCenter = segmentIndex * segAngle + segAngle / 2;
  const targetOffset = 360 - segCenter;
  // Add jitter within ±15° so it doesn't always hit dead center
  const jitter = (Math.random() - 0.5) * (segAngle * 0.6);
  // Add 5-8 full rotations for drama
  const fullSpins = (5 + Math.floor(Math.random() * 3)) * 360;
  // Normalize current rotation to avoid negative modulo issues
  const base = Math.ceil(currentRotation / 360) * 360;
  return base + fullSpins + targetOffset + jitter;
}

// ── Wheel tick sound via Web Audio API ─────────────────────────────────────
function useWheelSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const playTick = useCallback((pitch = 900, volume = 0.18) => {
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.07);
    } catch {
      // silently ignore — AudioContext may be blocked before user gesture
    }
  }, []);

  const playWin = useCallback(() => {
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      const ctx = ctxRef.current;
      // Three ascending tones for a satisfying win chime
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.4);
      });
    } catch {
      // silently ignore
    }
  }, []);

  return { playTick, playWin };
}

// ── Spin Wheel Component ────────────────────────────────────────────────────
function SpinWheel({
  onSpin,
  spinning,
  disabled,
  targetRotation,
}: {
  onSpin: () => void;
  spinning: boolean;
  disabled: boolean;
  targetRotation: number;
}) {
  const { playTick, playWin } = useWheelSound();
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate tick-tick-tick that slows down as the wheel decelerates
  useEffect(() => {
    if (spinning) {
      let elapsed = 0;
      const SPIN_DURATION = 4200;
      let lastTickTime = 0;

      const tick = () => {
        elapsed += 16;
        if (elapsed >= SPIN_DURATION) {
          if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
          playWin();
          return;
        }
        const progress = elapsed / SPIN_DURATION;
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const interval = 60 + easedProgress * 540;
        if (elapsed - lastTickTime >= interval) {
          const pitch = 900 - easedProgress * 300;
          const vol = 0.18 - easedProgress * 0.08;
          playTick(pitch, vol);
          lastTickTime = elapsed;
        }
      };

      tickIntervalRef.current = setInterval(tick, 16);
    } else {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    }
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, [spinning, playTick, playWin]);

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
        {/* Wheel container — CSS transition drives the spin */}
        <div
          className="w-full h-full relative z-10 rounded-full overflow-hidden"
          style={{
            transform: `rotate(${targetRotation}deg)`,
            transition: spinning
              ? "transform 4.2s cubic-bezier(0.15, 0.85, 0.25, 1)"
              : "none",
          }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
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
              const midRad = ((startAngle + endAngle) / 2) * (Math.PI / 180);
              const iconX = 100 + 50 * Math.cos(midRad);
              const iconY = 100 + 50 * Math.sin(midRad);
              const textX = 100 + 70 * Math.cos(midRad);
              const textY = 100 + 70 * Math.sin(midRad);
              const textRotation = (startAngle + endAngle) / 2 + 90;

              return (
                <g key={i}>
                  <path
                    d={`M100,100 L${x1},${y1} A95,95 0 0,1 ${x2},${y2} Z`}
                    fill={seg.color}
                    stroke="oklch(0.13 0.04 280)"
                    strokeWidth="1"
                  />
                  {/* Icon */}
                  <text
                    x={iconX}
                    y={iconY}
                    fontSize="12"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textRotation}, ${iconX}, ${iconY})`}
                  >
                    {seg.icon}
                  </text>
                  {/* Label */}
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
          </svg>
        </div>
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
  grantActivated,
  onClose,
}: {
  open: boolean;
  prizeLabel: string | null;
  isWelcome: boolean;
  grantActivated?: boolean;
  onClose: () => void;
}) {
  const isProPrize = prizeLabel?.includes("Pro") || prizeLabel?.includes("Trial");

  // Fire confetti when a premium prize modal opens
  useEffect(() => {
    if (open && isProPrize) {
      // Small delay so the modal animation starts first
      const t = setTimeout(() => firePremiumConfetti(), 250);
      return () => clearTimeout(t);
    }
  }, [open, isProPrize]);

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
              {isProPrize ? "👑" : "🎉"}
            </motion.div>
            <h2 className="text-2xl font-serif text-foreground">
              {isProPrize ? "You're Pro Now!" : "You Won!"}
            </h2>
            <div
              className="rounded-2xl p-4"
              style={{ background: "oklch(0.65 0.16 185 / 0.1)", border: "1px solid oklch(0.65 0.16 185 / 0.2)" }}
            >
              <p className="text-lg font-semibold text-primary">{prizeLabel}</p>
            </div>
            {isProPrize && grantActivated && (
              <div
                className="rounded-xl p-4 text-left space-y-2"
                style={{ background: "oklch(0.65 0.16 185 / 0.08)", border: "1px solid oklch(0.65 0.16 185 / 0.2)" }}
              >
                <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "oklch(0.65 0.16 185)" }}>
                  <Crown size={14} /> Pro Access Activated!
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your Pro features are now unlocked. Enjoy unlimited AI chats, journals, and more!
                  {prizeLabel?.includes("Month") && " Your access lasts for 30 days."}
                  {prizeLabel?.includes("Week") && " Your access lasts for 7 days."}
                </p>
              </div>
            )}
            {isProPrize && !grantActivated && (
              <div
                className="rounded-xl p-4 text-left space-y-2"
                style={{ background: "oklch(0.55 0.18 290 / 0.08)", border: "1px solid oklch(0.55 0.18 290 / 0.2)" }}
              >
                <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "oklch(0.55 0.18 290)" }}>
                  <Gift size={14} /> Saved to Rewards!
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You already have active Pro access, so this reward has been saved. It will automatically activate when your current Pro period ends!
                </p>
              </div>
            )}
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
              {isProPrize && grantActivated ? "Start Exploring Pro!" : "Awesome!"}
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
  const [wheelRotation, setWheelRotation] = useState(0);
  const [prizeModal, setPrizeModal] = useState<{ open: boolean; label: string | null; isWelcome: boolean; grantActivated: boolean }>({
    open: false,
    label: null,
    isWelcome: false,
    grantActivated: false,
  });
  const [activeTab, setActiveTab] = useState<"spin" | "points" | "redeem" | "history">("spin");

  const { data: dashboard, refetch } = trpc.rewards.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const spinMutation = trpc.rewards.spin.useMutation();
  const redeemMutation = trpc.rewards.redeem.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading, navigate]);

  const handleSpin = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);

    const type = !dashboard?.welcomeSpinUsed ? "welcome" : "streak";
    try {
      // 1. Call backend to get the result FIRST
      const result = await spinMutation.mutateAsync({ type });
      if (!result.success || !result.result) {
        toast.error(result.error || "Spin failed");
        setSpinning(false);
        return;
      }

      // 2. Calculate landing rotation for the correct segment
      const segIdx = pickSegmentIndex(result.result);
      const landingRotation = calcLandingRotation(segIdx, wheelRotation);
      setWheelRotation(landingRotation);

      // 3. Wait for the CSS spin animation to complete (4.2s + small buffer)
      setTimeout(() => {
        setSpinning(false);

        // Show dare streak bonus toast if awarded
        if (result.dareStreakBonusAwarded) {
          toast.success("🎯 Dare Streak! +10 bonus points awarded!", { duration: 4000 });
        }

        // 4. Show the prize modal AFTER the wheel has stopped
        setPrizeModal({
          open: true,
          label: result.prizeLabel,
          isWelcome: type === "welcome",
          grantActivated: result.grantActivated ?? false,
        });

        // Invalidate queries so dashboard updates
        refetch();
        utils.subscription.isProUser.invalidate();
        utils.subscription.getStatus.invalidate();
      }, 4500);
    } catch (e) {
      toast.error("Something went wrong");
      setSpinning(false);
    }
  }, [spinning, dashboard?.welcomeSpinUsed, spinMutation, refetch, wheelRotation, utils]);

  const handleRedeem = useCallback(
    async (tierId: string) => {
      try {
        const result = await redeemMutation.mutateAsync({ tierId });
        if (result.success) {
          if (result.grantActivated) {
            toast.success("Pro access activated! Enjoy your upgrade.");
          } else {
            toast.success("Reward saved! It will activate when your current Pro period ends.");
          }
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
    // Has pending streak spins banked
    if ((dashboard.pendingStreakSpins ?? 0) > 0) return true;
    return false;
  }, [dashboard]);

  const tabs = [
    { id: "spin" as const, label: "Spin", icon: Sparkles },
    { id: "points" as const, label: "Points", icon: Star },
    { id: "redeem" as const, label: "Redeem", icon: Gift },
    { id: "history" as const, label: "History", icon: History },
  ];

  return (
    <AppShell>
      <div className="px-5 pt-4 pb-6 space-y-5">
        {/* ── Pro Status Banner ──────────────────────────────────────── */}
        {dashboard?.isPro && dashboard.activeGrant && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 space-y-2"
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.16 185 / 0.15), oklch(0.55 0.18 290 / 0.15))",
              border: "1px solid oklch(0.65 0.16 185 / 0.3)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown size={18} style={{ color: "oklch(0.65 0.16 185)" }} />
                <span className="text-sm font-semibold text-foreground">Pro Active</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: "oklch(0.65 0.16 185 / 0.2)", color: "oklch(0.65 0.16 185)" }}>
                {dashboard.activeGrant.label}
              </span>
            </div>
            {dashboard.proExpiresAt && (
              <p className="text-xs text-muted-foreground">
                Expires {new Date(dashboard.proExpiresAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
            {dashboard.pendingGrants && dashboard.pendingGrants.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <Gift size={14} style={{ color: "oklch(0.55 0.18 290)" }} />
                <span className="text-xs" style={{ color: "oklch(0.55 0.18 290)" }}>
                  {dashboard.pendingGrants.length} reward{dashboard.pendingGrants.length > 1 ? "s" : ""} queued — will auto-activate next
                </span>
              </div>
            )}
          </motion.div>
        )}

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

            {/* Pending streak spins banner */}
            {dashboard?.welcomeSpinUsed && (dashboard?.pendingStreakSpins ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl p-4 text-center space-y-1"
                style={{
                  background: "linear-gradient(135deg, oklch(0.60 0.18 50 / 0.15), oklch(0.55 0.18 290 / 0.15))",
                  border: "1px solid oklch(0.60 0.18 50 / 0.35)",
                }}
              >
                <p className="text-sm font-semibold" style={{ color: "oklch(0.75 0.16 55)" }}>
                  🎡 {dashboard.pendingStreakSpins} Free Spin{(dashboard.pendingStreakSpins ?? 0) > 1 ? "s" : ""} Available!
                </p>
                <p className="text-xs text-muted-foreground">
                  You earned {(dashboard.pendingStreakSpins ?? 0) > 1 ? "these" : "this"} from your check-in streak. Spin to claim your reward!
                </p>
              </motion.div>
            )}

            <SpinWheel
              onSpin={handleSpin}
              spinning={spinning}
              disabled={!canSpin}
              targetRotation={wheelRotation}
            />

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

            {/* Dare streak badge */}
            {(dashboard?.dareStreak ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{
                  background: "linear-gradient(135deg, oklch(0.28 0.10 45 / 0.3), oklch(0.22 0.06 280 / 0.3))",
                  border: "1px solid oklch(0.60 0.18 50 / 0.4)",
                }}
              >
                <span className="text-2xl">🎯</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "oklch(0.80 0.16 55)" }}>
                    Dare Streak: {dashboard?.dareStreak}x
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(dashboard?.dareStreak ?? 0) % 3 === 0
                      ? "🏆 Bonus unlocked! +10 pts awarded"
                      : `${3 - ((dashboard?.dareStreak ?? 0) % 3)} more dare${3 - ((dashboard?.dareStreak ?? 0) % 3) === 1 ? "" : "s"} for +10 bonus pts`}
                  </p>
                </div>
                <div
                  className="flex gap-0.5"
                >
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: i <= ((dashboard?.dareStreak ?? 0) % 3 === 0 ? 3 : (dashboard?.dareStreak ?? 0) % 3)
                          ? "oklch(0.75 0.18 55)"
                          : "oklch(0.30 0.04 280)",
                      }}
                    />
                  ))}
                </div>
              </motion.div>
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

            {/* My Rewards Inventory */}
            {dashboard?.allGrants && dashboard.allGrants.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">My Rewards</p>
                <div className="space-y-2">
                  {dashboard.allGrants.map((grant) => (
                    <div
                      key={grant.id}
                      className="flex items-center justify-between rounded-xl p-3"
                      style={{
                        background: grant.status === "active"
                          ? "oklch(0.65 0.16 185 / 0.08)"
                          : grant.status === "pending"
                            ? "oklch(0.55 0.18 290 / 0.08)"
                            : "oklch(0.17 0.04 280)",
                        border: `1px solid ${
                          grant.status === "active"
                            ? "oklch(0.65 0.16 185 / 0.25)"
                            : grant.status === "pending"
                              ? "oklch(0.55 0.18 290 / 0.2)"
                              : "oklch(0.24 0.04 280)"
                        }`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {grant.status === "active" ? "👑" : grant.status === "pending" ? "🎁" : "✅"}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{grant.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {grant.status === "active" && grant.expiresAt
                              ? `Expires ${new Date(grant.expiresAt).toLocaleDateString()}`
                              : grant.status === "pending"
                                ? "Queued — activates next"
                                : grant.activatedAt
                                  ? `Used ${new Date(grant.activatedAt).toLocaleDateString()}`
                                  : "Used"}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{
                          background: grant.status === "active"
                            ? "oklch(0.65 0.16 185 / 0.2)"
                            : grant.status === "pending"
                              ? "oklch(0.55 0.18 290 / 0.2)"
                              : "oklch(0.30 0.02 270 / 0.5)",
                          color: grant.status === "active"
                            ? "oklch(0.65 0.16 185)"
                            : grant.status === "pending"
                              ? "oklch(0.55 0.18 290)"
                              : "oklch(0.55 0.02 270)",
                        }}
                      >
                        {grant.status === "active" ? "Active" : grant.status === "pending" ? "Queued" : "Used"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

        {/* ── History tab ────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Last 10 Spins</p>
              {dashboard?.spinHistory && dashboard.spinHistory.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.spinHistory.map((spin, idx) => {
                    const resultIcon =
                      spin.result === "month_pro" ? "👑" :
                      spin.result === "dare" ? "🎯" :
                      spin.result === "try_again" ? "🔄" :
                      spin.result === "week_trial" ? "⭐" :
                      spin.result === "reward_points" ? "✨" : "🎰";
                    const resultColor =
                      spin.result === "month_pro" ? "oklch(0.55 0.18 290)" :
                      spin.result === "dare" ? "oklch(0.75 0.16 55)" :
                      spin.result === "try_again" ? "oklch(0.50 0.03 270)" :
                      spin.result === "week_trial" ? "oklch(0.65 0.16 185)" :
                      "oklch(0.65 0.16 145)";
                    return (
                      <motion.div
                        key={spin.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="flex items-center gap-3 rounded-xl p-3"
                        style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.24 0.04 280)" }}
                      >
                        <span className="text-xl w-8 text-center">{resultIcon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {spin.prizeValue || spin.result}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(spin.spinnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <span
                          className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={{ background: "oklch(0.22 0.06 280)", color: resultColor }}
                        >
                          {spin.result === "month_pro" ? "1 Mo Pro" :
                           spin.result === "dare" ? "Dare" :
                           spin.result === "try_again" ? "No prize" :
                           spin.result === "week_trial" ? "1 Wk Pro" :
                           "+5 pts"}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="rounded-2xl p-8 text-center"
                  style={{ background: "oklch(0.17 0.04 280)", border: "1px solid oklch(0.24 0.04 280)" }}
                >
                  <p className="text-3xl mb-3">🎰</p>
                  <p className="text-sm font-medium text-foreground mb-1">No spins yet</p>
                  <p className="text-xs text-muted-foreground">Spin the wheel to start your history!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Prize modal */}
      <PrizeModal
        open={prizeModal.open}
        prizeLabel={prizeModal.label}
        isWelcome={prizeModal.isWelcome}
        grantActivated={prizeModal.grantActivated}
        onClose={() => setPrizeModal({ open: false, label: null, isWelcome: false, grantActivated: false })}
      />
    </AppShell>
  );
}
