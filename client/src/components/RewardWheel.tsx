import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";

export type WheelPrize = "month_free" | "dare" | "try_again" | "week_free" | "reward_points";

interface RewardWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onSpinComplete?: (prize: WheelPrize) => void;
}

const WHEEL_PRIZES: Array<{ id: WheelPrize; label: string; color: string; odds: number }> = [
  { id: "month_free", label: "1 Month Free", color: "oklch(0.70 0.20 20)", odds: 0.05 },
  { id: "dare", label: "Take a Dare! 🎯", color: "oklch(0.55 0.18 30)", odds: 0.2375 },
  { id: "try_again", label: "Try Again!", color: "oklch(0.60 0.15 260)", odds: 0.2375 },
  { id: "week_free", label: "1 Week Free", color: "oklch(0.68 0.19 40)", odds: 0.2375 },
  { id: "reward_points", label: "5 Reward Points", color: "oklch(0.72 0.17 180)", odds: 0.2375 },
];

const SPIN_DURATION = 4; // seconds
const SEGMENTS_PER_PRIZE = 72; // 360 / 5 prizes

export function RewardWheel({ isOpen, onClose, onSpinComplete }: RewardWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedPrize, setSelectedPrize] = useState<WheelPrize | null>(null);

  const spinWheel = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setSelectedPrize(null);

    // Select prize based on weighted odds
    const selectedPrizeId = selectPrizeByOdds();
    const prizeIndex = WHEEL_PRIZES.findIndex((p) => p.id === selectedPrizeId);

    // Calculate rotation to land on selected prize
    // Each segment is 72 degrees (360 / 5)
    // We add extra rotations (3-5 full spins) for dramatic effect
    const extraSpins = 3 + Math.random() * 2;
    const baseRotation = prizeIndex * SEGMENTS_PER_PRIZE;
    const finalRotation = extraSpins * 360 + baseRotation;

    // Animate the spin
    let currentRotation = rotation;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (SPIN_DURATION * 1000), 1);

      // Easing function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newRotation = rotation + (finalRotation - rotation) * easeOut;

      setRotation(newRotation % 360);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setSelectedPrize(selectedPrizeId);
        onSpinComplete?.(selectedPrizeId);
      }
    };

    requestAnimationFrame(animate);
  };

  const selectPrizeByOdds = (): WheelPrize => {
    const random = Math.random();
    let cumulative = 0;

    for (const prize of WHEEL_PRIZES) {
      cumulative += prize.odds;
      if (random <= cumulative) {
        return prize.id;
      }
    }

    return WHEEL_PRIZES[WHEEL_PRIZES.length - 1].id;
  };

  const getDareMessage = (): string => {
    const dares = [
      "😄 Dare: Text someone right now and tell them one thing you genuinely appreciate about them. Go. Do it. We'll wait.",
      "💃 Dare: Stand up, do 10 jumping jacks, and yell \"I AM UNSTOPPABLE!\" (neighbors optional).",
      "🌞 Dare: Step outside for 60 seconds, breathe the air, and notice one thing you've never noticed before.",
      "😂 Dare: Watch or read something that makes you laugh out loud in the next 5 minutes. Laughter is medicine.",
      "📝 Dare: Write down 3 things you're proud of yourself for this week. No cheating — they count.",
      "🍫 Dare: Treat yourself to something small and delicious today. You've earned it.",
      "🎵 Dare: Play your favorite song right now and actually listen to it — no multitasking allowed.",
      "👋 Dare: Wave or smile at the next person you see. Spread a little light.",
      "💪 Dare: Strike a power pose for 30 seconds. Hands on hips, chin up. Science says it works.",
      "🌿 Dare: Touch some grass. Literally. Go outside, feel the ground, reset your nervous system.",
    ];
    return dares[Math.floor(Math.random() * dares.length)];
  };

  const getPrizeMessage = (prize: WheelPrize): string => {
    const messages: Record<WheelPrize, string> = {
      month_free: "🎉 You won 1 month of Pro! Your journey continues...",
      dare: getDareMessage(),
      try_again: "😄 Today's not the day, but keep building those streaks!",
      week_free: "🌟 1 week of Pro unlocked! Keep the momentum going!",
      reward_points: "⭐ 5 reward points added! Save them for the shop!",
    };
    return messages[prize];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-500" />
                <h2 className="text-2xl font-bold text-gray-900">Spin the Wheel!</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Wheel Container */}
            <div className="flex flex-col items-center gap-6">
              {/* Pointer */}
              <div className="absolute top-[120px] left-1/2 transform -translate-x-1/2 z-10">
                <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-amber-500" />
              </div>

              {/* Wheel */}
              <div className="relative w-64 h-64">
                <motion.svg
                  viewBox="0 0 200 200"
                  className="w-full h-full"
                  animate={{ rotate: rotation }}
                  transition={{ type: "tween", duration: 0 }}
                >
                  {WHEEL_PRIZES.map((prize, index) => {
                    const startAngle = (index * SEGMENTS_PER_PRIZE * Math.PI) / 180;
                    const endAngle = ((index + 1) * SEGMENTS_PER_PRIZE * Math.PI) / 180;

                    const x1 = 100 + 100 * Math.cos(startAngle);
                    const y1 = 100 + 100 * Math.sin(startAngle);
                    const x2 = 100 + 100 * Math.cos(endAngle);
                    const y2 = 100 + 100 * Math.sin(endAngle);

                    const largeArc = SEGMENTS_PER_PRIZE > 180 ? 1 : 0;

                    const textAngle = (startAngle + endAngle) / 2;
                    const textX = 100 + 65 * Math.cos(textAngle);
                    const textY = 100 + 65 * Math.sin(textAngle);
                    const textRotation = (textAngle * 180) / Math.PI;

                    return (
                      <g key={prize.id}>
                        {/* Segment */}
                        <path
                          d={`M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={prize.color}
                          stroke="white"
                          strokeWidth="2"
                        />

                        {/* Text */}
                        <text
                          x={textX}
                          y={textY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="11"
                          fontWeight="bold"
                          transform={`rotate(${textRotation} ${textX} ${textY})`}
                        >
                          {prize.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Center circle */}
                  <circle cx="100" cy="100" r="20" fill="white" stroke="oklch(0.65 0.15 200)" strokeWidth="2" />
                  <text x="100" y="105" textAnchor="middle" fontSize="24">
                    🎡
                  </text>
                </motion.svg>
              </div>

              {/* Spin Button */}
              <motion.button
                onClick={spinWheel}
                disabled={isSpinning}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {isSpinning ? "Spinning..." : "SPIN THE WHEEL"}
              </motion.button>

              {/* Result Message */}
              <AnimatePresence>
                {selectedPrize && !isSpinning && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200"
                  >
                    <p className="text-lg font-semibold text-gray-900">{getPrizeMessage(selectedPrize)}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Info Text */}
              <p className="text-sm text-gray-600 text-center">
                You earned this spin by maintaining a 3-day streak! Keep going to unlock more rewards.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
