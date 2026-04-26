import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface HabitCompletionAnimationProps {
  isCompleting: boolean;
  isMilestone?: boolean;
  milestoneDay?: number;
  onAnimationComplete?: () => void;
}

/**
 * Sparkle particle component for burst effect
 */
function Sparkle({ delay }: { delay: number }) {
  const angle = Math.random() * Math.PI * 2;
  const distance = 60 + Math.random() * 40;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;

  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full"
      style={{
        left: "50%",
        top: "50%",
        background: `hsl(${Math.random() * 60 + 30}, 100%, 60%)`,
        boxShadow: "0 0 6px currentColor",
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x, y, opacity: 0, scale: 0 }}
      transition={{
        duration: 0.8,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

/**
 * Pulse ring effect that expands outward
 */
function PulseRing({ delay }: { delay: number }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-lg border-2 border-emerald-400"
      initial={{ scale: 0.8, opacity: 1 }}
      animate={{ scale: 2, opacity: 0 }}
      transition={{
        duration: 0.6,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

/**
 * HabitCompletionAnimation
 *
 * Displays celebratory animations when a habit is completed.
 * - Regular completion: Pulse effect with sparkle burst
 * - Milestone (7, 14, 30, 100 days): Enhanced animation with multiple pulses and more sparkles
 *
 * Usage:
 * ```tsx
 * <HabitCompletionAnimation
 *   isCompleting={isCompletingHabit}
 *   isMilestone={streak === 7 || streak === 14 || streak === 30 || streak === 100}
 *   milestoneDay={streak}
 *   onAnimationComplete={() => setIsCompletingHabit(false)}
 * />
 * ```
 */
export function HabitCompletionAnimation({
  isCompleting,
  isMilestone = false,
  milestoneDay = 0,
  onAnimationComplete,
}: HabitCompletionAnimationProps) {
  const [sparkles, setSparkles] = useState<number[]>([]);

  useEffect(() => {
    if (isCompleting) {
      // Generate sparkles for the burst effect
      const sparkleCount = isMilestone ? 16 : 8;
      setSparkles(Array.from({ length: sparkleCount }, (_, i) => i));

      // Call completion callback after animation finishes
      const timer = setTimeout(() => {
        onAnimationComplete?.();
      }, isMilestone ? 1200 : 800);

      return () => clearTimeout(timer);
    }
  }, [isCompleting, isMilestone, onAnimationComplete]);

  if (!isCompleting) return null;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      {/* Milestone-specific enhanced animation */}
      {isMilestone && (
        <>
          {/* Multiple pulse rings for milestone celebration */}
          <div className="absolute w-16 h-16">
            <PulseRing delay={0} />
            <PulseRing delay={0.15} />
            <PulseRing delay={0.3} />
          </div>

          {/* Milestone text celebration */}
          <motion.div
            className="absolute text-center"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-5xl font-bold text-emerald-500 drop-shadow-lg">
              🔥
            </div>
            <motion.p
              className="text-sm font-semibold text-emerald-600 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {milestoneDay}-day streak!
            </motion.p>
          </motion.div>
        </>
      )}

      {/* Regular completion animation (single pulse) */}
      {!isMilestone && (
        <div className="absolute w-12 h-12">
          <PulseRing delay={0} />
        </div>
      )}

      {/* Sparkle burst effect */}
      <div className="absolute w-32 h-32">
        {sparkles.map((i) => (
          <Sparkle key={i} delay={i * 0.05} />
        ))}
      </div>

      {/* Success checkmark that appears and scales */}
      <motion.div
        className="absolute text-3xl"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "backOut" }}
      >
        ✓
      </motion.div>
    </div>
  );
}

export default HabitCompletionAnimation;
