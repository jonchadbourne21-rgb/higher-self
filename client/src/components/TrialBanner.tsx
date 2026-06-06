/**
 * TrialBanner — shown during the 10-day free trial
 * Displays days remaining and a soft upgrade CTA.
 * Dismisses for the session but reappears on next visit.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function TrialBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [, navigate] = useLocation();

  const { data: status } = trpc.subscription.getStatus.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  // Only show during active trial
  if (!status?.isOnTrial || dismissed) return null;

  const days = status.trialDaysRemaining ?? 0;
  const isLastDay = days <= 1;

  const urgencyColor = isLastDay
    ? "oklch(0.72 0.18 35)"   // amber-orange for last day
    : "oklch(0.65 0.16 185)"; // teal for normal

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="mx-3 mt-2 mb-0 rounded-xl px-3 py-2 flex items-center gap-2.5"
        style={{
          background: `${urgencyColor}18`,
          border: `1px solid ${urgencyColor}40`,
        }}
      >
        <Sparkles size={14} style={{ color: urgencyColor, flexShrink: 0 }} />

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold leading-tight" style={{ color: urgencyColor }}>
            {isLastDay
              ? "Last day of your free trial!"
              : `${days} day${days !== 1 ? "s" : ""} left in your free trial`}
          </p>
          <p className="text-[10px] leading-tight mt-0.5" style={{ color: "oklch(0.65 0.03 270)" }}>
            Full access to Mirror, Voice & all features
          </p>
        </div>

        <button
          onClick={() => navigate("/pricing")}
          className="text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 transition-transform active:scale-95"
          style={{
            background: urgencyColor,
            color: "oklch(0.10 0.02 280)",
          }}
        >
          Upgrade
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-0.5 rounded-md transition-opacity hover:opacity-70"
          style={{ color: "oklch(0.50 0.03 270)" }}
          aria-label="Dismiss"
        >
          <X size={12} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
