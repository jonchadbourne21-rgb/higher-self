import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AIThinkingProps {
  /** Context-specific messages that rotate during generation */
  messages?: string[];
  /** How long each message stays visible (ms) */
  interval?: number;
  /** Optional className for the outer container */
  className?: string;
}

const DEFAULT_MESSAGES = [
  "Reflecting on your journey…",
  "Connecting the dots…",
  "Finding patterns in your story…",
  "Listening between the lines…",
  "Your Higher Self is thinking…",
];

export function AIThinking({
  messages = DEFAULT_MESSAGES,
  interval = 3000,
  className = "",
}: AIThinkingProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, interval);
    return () => clearInterval(timer);
  }, [messages.length, interval]);

  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      {/* Animated orb */}
      <div className="relative w-16 h-16 mb-5">
        {/* Outer ring pulse */}
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/30"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Middle ring */}
        <motion.div
          className="absolute inset-1 rounded-full border border-primary/20"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        {/* Core orb */}
        <motion.div
          className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 backdrop-blur-sm border border-primary/40"
          animate={{ scale: [0.9, 1.05, 0.9] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Center sparkle */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center text-primary"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <span className="text-lg">✶</span>
        </motion.div>
      </div>

      {/* Rotating status message */}
      <div className="h-6 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-muted-foreground font-medium text-center"
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Wrapper that crossfades from AIThinking → revealed content.
 * Use this around any content that appears after an AI generation completes.
 */
export function AIReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Compact inline version for buttons/small spaces */
export function AIThinkingInline({
  messages = ["Thinking…", "Reflecting…", "Connecting…"],
  interval = 2500,
}: { messages?: string[]; interval?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, interval);
    return () => clearInterval(timer);
  }, [messages.length, interval]);

  return (
    <span className="inline-flex items-center gap-2">
      <motion.span
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="inline-block"
      >
        ✶
      </motion.span>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="animate-pulse"
        >
          {messages[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
