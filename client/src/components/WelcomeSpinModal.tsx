import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useRef } from "react";
import { Sparkles, Zap, Crown, Gift } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ── Dare messages (randomly picked when user lands on dare) ──────────────────
const DARE_MESSAGES = [
  "Text someone right now and tell them one thing you appreciate about them 💌",
  "Stand up, do 10 jumping jacks, and say 'I'm unstoppable' out loud 🏃",
  "Go outside, touch some grass, and take one deep breath of fresh air 🌿",
  "Send a voice note to a friend just saying 'Hey, thinking of you' 🎙️",
  "Do your best power pose for 30 seconds — yes, right now 💪",
  "Write down 3 things that made you smile this week, no matter how small 😄",
  "Put on your favourite song and dance for at least 30 seconds 🎵",
  "Drink a full glass of water right now. Hydration is self-care 💧",
  "Look in the mirror and say one genuine compliment to yourself 🪞",
  "Step away from your screen for 5 minutes and just breathe 🧘",
];

export function getRandomDareMessage(): string {
  return DARE_MESSAGES[Math.floor(Math.random() * DARE_MESSAGES.length)];
}

// ── Wheel segments (8 slices, 45° each) ─────────────────────────────────────
const SEGMENTS = [
  { id: "month_pro", label: "1 Month\nFree Pro", color: "#7c3aed", textColor: "#fff", icon: "👑" },
  { id: "dare", label: "Take a\nDare! 🎯", color: "#92400e", textColor: "#fde68a", icon: "🎯" },
  { id: "try_again", label: "Try\nAgain", color: "#1e1b4b", textColor: "#94a3b8", icon: "🔄" },
  { id: "week_trial", label: "1 Week\nFree Trial", color: "#0d9488", textColor: "#fff", icon: "⭐" },
  { id: "reward_points", label: "+5\nPoints", color: "#059669", textColor: "#fff", icon: "✨" },
  { id: "dare_2", label: "Take a\nDare! 🎯", color: "#78350f", textColor: "#fde68a", icon: "🎯" },
  { id: "try_again_2", label: "Try\nAgain", color: "#1e1b4b", textColor: "#94a3b8", icon: "🔄" },
  { id: "reward_points_2", label: "+5\nPoints", color: "#059669", textColor: "#fff", icon: "✨" },
];

// Map backend result to a segment index the pointer should land on
const RESULT_TO_SEGMENT_INDEX: Record<string, number[]> = {
  month_pro: [0],
  dare: [1, 5],
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
 * Calculate the final rotation so the pointer (at top, 0°/360°) lands in the
 * middle of the target segment.
 *
 * Segment 0 starts at -90° (12 o'clock) and goes clockwise.
 * The wheel rotates clockwise, so we need the target segment's center to
 * end up at the top (0° in screen space = -90° in our coordinate system).
 *
 * segmentCenter (in wheel coords) = segmentIndex * 45 + 22.5  (starting from -90°)
 * Actual angle from top = segmentIndex * 45 + 22.5
 * To land pointer on it, wheel must rotate so that angle is at top:
 *   finalAngle = 360 - (segmentIndex * 45 + 22.5) + randomJitter
 * Plus multiple full rotations for dramatic effect.
 */
function calcLandingRotation(segmentIndex: number, currentRotation: number): number {
  const segAngle = 360 / SEGMENTS.length; // 45°
  const segCenter = segmentIndex * segAngle + segAngle / 2; // center of segment from 12 o'clock
  // We want the wheel to rotate so segCenter aligns with top (pointer)
  // Wheel rotates clockwise, so: target = 360 - segCenter
  const targetOffset = 360 - segCenter;
  // Add jitter within ±15° so it doesn't always hit dead center
  const jitter = (Math.random() - 0.5) * (segAngle * 0.6);
  // Add 5-8 full rotations for drama
  const fullSpins = (5 + Math.floor(Math.random() * 3)) * 360;
  // Normalize current rotation to avoid negative modulo issues
  const base = Math.ceil(currentRotation / 360) * 360;
  return base + fullSpins + targetOffset + jitter;
}

interface WelcomeSpinModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WelcomeSpinModal({ open, onClose }: WelcomeSpinModalProps) {
  const [phase, setPhase] = useState<"intro" | "spinning" | "result">("intro");
  const [rotation, setRotation] = useState(0);
  const [prizeLabel, setPrizeLabel] = useState<string | null>(null);
  const [grantActivated, setGrantActivated] = useState(false);
  const spinMutation = trpc.rewards.spin.useMutation();
  const utils = trpc.useUtils();
  const wheelRef = useRef<HTMLDivElement>(null);

  const handleSpin = useCallback(async () => {
    if (phase !== "intro") return;
    setPhase("spinning");

    try {
      const result = await spinMutation.mutateAsync({ type: "welcome" });
      if (!result.success || !result.result) {
        toast.error(result.error || "Spin failed");
        setPhase("intro");
        return;
      }

      // Calculate where the wheel should land
      const segIdx = pickSegmentIndex(result.result);
      const landingRotation = calcLandingRotation(segIdx, rotation);
      setRotation(landingRotation);

      // Show result after spin animation completes
      setTimeout(() => {
        setPrizeLabel(result.prizeLabel);
        setGrantActivated(result.grantActivated ?? false);
        setPhase("result");
        // Invalidate rewards queries so Home card updates
        utils.rewards.welcomeSpinAvailable.invalidate();
        utils.rewards.points.invalidate();
        utils.rewards.dashboard.invalidate();
        utils.subscription.isProUser.invalidate();
        utils.subscription.getStatus.invalidate();
      }, 4500);
    } catch {
      toast.error("Something went wrong");
      setPhase("intro");
    }
  }, [phase, rotation, spinMutation, utils]);

  const handleClose = useCallback(() => {
    setPhase("intro");
    setPrizeLabel(null);
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center"
          style={{ background: "oklch(0.08 0.03 280 / 0.95)" }}
        >
          {/* ── Intro / Spinning phase ─────────────────────────────── */}
          {(phase === "intro" || phase === "spinning") && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center px-6 w-full max-w-sm"
            >
              {/* Title */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-6"
              >
                <p className="text-3xl mb-2">🎁</p>
                <h2 className="text-2xl font-serif text-foreground">Welcome Gift!</h2>
                <p className="text-sm text-muted-foreground mt-1">Spin the wheel for a free reward</p>
              </motion.div>

              {/* Wheel */}
              <div className="relative w-72 h-72 mb-6">
                {/* Outer glow */}
                <div
                  className="absolute inset-[-6px] rounded-full transition-opacity duration-500"
                  style={{
                    background: "conic-gradient(#0d9488, #7c3aed, #0d9488)",
                    filter: "blur(6px)",
                    opacity: phase === "spinning" ? 0.9 : 0.4,
                  }}
                />

                {/* Wheel container */}
                <div
                  ref={wheelRef}
                  className="w-full h-full relative z-10 rounded-full overflow-hidden"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: phase === "spinning"
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
                      const x1 = 100 + 96 * Math.cos(startRad);
                      const y1 = 100 + 96 * Math.sin(startRad);
                      const x2 = 100 + 96 * Math.cos(endRad);
                      const y2 = 100 + 96 * Math.sin(endRad);
                      const midRad = ((startAngle + endAngle) / 2) * (Math.PI / 180);
                      const iconX = 100 + 50 * Math.cos(midRad);
                      const iconY = 100 + 50 * Math.sin(midRad);
                      const textX = 100 + 70 * Math.cos(midRad);
                      const textY = 100 + 70 * Math.sin(midRad);
                      const textRotation = (startAngle + endAngle) / 2 + 90;

                      return (
                        <g key={i}>
                          <path
                            d={`M100,100 L${x1},${y1} A96,96 0 0,1 ${x2},${y2} Z`}
                            fill={seg.color}
                            stroke="#0f0a2a"
                            strokeWidth="0.8"
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
                            fontSize="6.5"
                            fontWeight="700"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                          >
                            {seg.label.split("\n").map((line, li) => (
                              <tspan key={li} x={textX} dy={li === 0 ? "-3.5" : "8"}>
                                {line}
                              </tspan>
                            ))}
                          </text>
                        </g>
                      );
                    })}
                    {/* Center hub */}
                    <circle cx="100" cy="100" r="16" fill="#0f0a2a" stroke="#0d9488" strokeWidth="2" />
                    <text
                      x="100" y="100"
                      fill="#0d9488"
                      fontSize="8"
                      fontWeight="800"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      letterSpacing="0.5"
                    >
                      SPIN
                    </text>
                  </svg>
                </div>

                {/* Pointer at top */}
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-20">
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "12px solid transparent",
                      borderRight: "12px solid transparent",
                      borderTop: "22px solid #0d9488",
                      filter: "drop-shadow(0 2px 6px rgba(13,148,136,0.6))",
                    }}
                  />
                </div>
              </div>

              {/* Spin button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSpin}
                disabled={phase === "spinning"}
                className="px-10 py-3.5 rounded-2xl font-bold text-base transition-all disabled:opacity-50"
                style={{
                  background: phase === "spinning"
                    ? "#1e293b"
                    : "linear-gradient(135deg, #0d9488, #14b8a6)",
                  color: phase === "spinning" ? "#64748b" : "#fff",
                  boxShadow: phase === "spinning" ? "none" : "0 4px 24px rgba(13,148,136,0.4)",
                }}
              >
                {phase === "spinning" ? (
                  <span className="flex items-center gap-2">
                    <Sparkles size={18} className="animate-pulse" /> Spinning...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles size={18} /> Spin the Wheel!
                  </span>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* ── Result phase ───────────────────────────────────────── */}
          {phase === "result" && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-full max-w-sm mx-6 rounded-3xl p-8 text-center space-y-5"
              style={{
                background: "oklch(0.17 0.04 280)",
                border: "1px solid oklch(0.65 0.16 185 / 0.3)",
                boxShadow: "0 8px 48px oklch(0.65 0.16 185 / 0.2)",
              }}
            >
              {(() => {
                const isProPrize = prizeLabel?.includes("Pro") || prizeLabel?.includes("Trial");
                const isDare = prizeLabel?.toLowerCase().includes("dare") || prizeLabel?.includes("🎯");
                const dareMessage = isDare ? getRandomDareMessage() : null;
                return (
                  <>
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.15, type: "spring", stiffness: 250 }}
                      className="text-7xl"
                    >
                      {isProPrize ? "👑" : isDare ? "🎯" : "🎉"}
                    </motion.div>

                    <h2 className="text-2xl font-serif text-foreground">
                      {isProPrize && grantActivated ? "You're Pro Now!" : isDare ? "You've Been Dared!" : "You Won!"}
                    </h2>

                    <div
                      className="rounded-2xl p-5"
                      style={{
                        background: isDare ? "oklch(0.25 0.08 45 / 0.3)" : "oklch(0.65 0.16 185 / 0.12)",
                        border: isDare ? "1px solid oklch(0.65 0.15 60 / 0.4)" : "1px solid oklch(0.65 0.16 185 / 0.25)",
                      }}
                    >
                      {isDare ? (
                        <p className="text-sm leading-relaxed" style={{ color: "#fde68a" }}>{dareMessage}</p>
                      ) : (
                        <p className="text-xl font-bold text-primary">{prizeLabel}</p>
                      )}
                    </div>

                    {/* Dare consolation nudge */}
                    {isDare && (
                      <div
                        className="rounded-xl p-4 text-left space-y-1"
                        style={{ background: "oklch(0.20 0.04 280)", border: "1px solid oklch(0.35 0.06 280 / 0.4)" }}
                      >
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Complete your dare for a mood boost 😄 Good luck next time on the wheel!
                        </p>
                      </div>
                    )}

                    {/* Pro activation message */}
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

                    {/* Stacked reward message */}
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

                    {/* 3-day streak nudge */}
                    <div
                      className="rounded-xl p-4 text-left space-y-2"
                      style={{
                        background: "oklch(0.55 0.18 290 / 0.1)",
                        border: "1px solid oklch(0.55 0.18 290 / 0.2)",
                      }}
                    >
                      <p className="text-sm font-semibold text-accent-foreground flex items-center gap-2">
                        <Zap size={14} className="text-amber-400" /> Want another spin?
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Check in <strong className="text-foreground">3 days in a row</strong> to earn a
                        free spin on the reward wheel. Every daily check-in also earns you{" "}
                        <strong className="text-foreground">1 reward point</strong>!
                      </p>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClose}
                      className="w-full py-3.5 rounded-2xl font-bold text-base text-white"
                      style={{
                        background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                        boxShadow: "0 4px 20px rgba(13,148,136,0.3)",
                      }}
                    >
                      {isProPrize && grantActivated ? "Start Exploring Pro!" : "Let's Go!"}
                    </motion.button>
                  </>
                );
              })()}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
