import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, X } from "lucide-react";

interface IncomingCallProps {
  visible: boolean;
  voicemailId: number;
  onAnswer: () => void;
  onDecline: () => void;
  onDismiss: () => void;
}

/**
 * Full-screen "incoming call" overlay that appears when the user's
 * Higher Self is calling (triggered by entropy detection).
 */
export function IncomingCall({ visible, voicemailId, onAnswer, onDecline, onDismiss }: IncomingCallProps) {
  const [ringCount, setRingCount] = useState(0);

  // Auto-dismiss after 30 seconds (go to voicemail)
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      onDecline();
    }, 30000);
    return () => clearTimeout(timer);
  }, [visible, onDecline]);

  // Pulse animation counter
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setRingCount((c) => c + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl"
        >
          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="absolute top-6 right-6 text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Pulsing rings */}
          <div className="relative mb-12">
            {/* Outer pulse rings */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-purple-400/30"
              animate={{
                scale: [1, 2.5],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
              }}
              style={{ width: 120, height: 120, top: -10, left: -10 }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-purple-400/20"
              animate={{
                scale: [1, 3],
                opacity: [0.4, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.5,
              }}
              style={{ width: 120, height: 120, top: -10, left: -10 }}
            />

            {/* Avatar circle */}
            <motion.div
              className="w-[100px] h-[100px] rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-500/30"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Sacred geometry icon */}
              <svg width="50" height="50" viewBox="0 0 50 50" fill="none" className="opacity-90">
                <circle cx="25" cy="25" r="20" stroke="white" strokeWidth="1" opacity="0.6" />
                <circle cx="25" cy="25" r="12" stroke="white" strokeWidth="1" opacity="0.8" />
                <circle cx="25" cy="15" r="8" stroke="white" strokeWidth="0.5" opacity="0.4" />
                <circle cx="18" cy="29" r="8" stroke="white" strokeWidth="0.5" opacity="0.4" />
                <circle cx="32" cy="29" r="8" stroke="white" strokeWidth="0.5" opacity="0.4" />
                <circle cx="25" cy="25" r="3" fill="white" opacity="0.9" />
              </svg>
            </motion.div>
          </div>

          {/* Label */}
          <motion.div
            className="text-center mb-16"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-light text-white tracking-wide mb-2">
              Your Higher Self
            </h2>
            <motion.p
              className="text-purple-300/80 text-sm tracking-widest uppercase"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              is calling...
            </motion.p>
          </motion.div>

          {/* Action buttons */}
          <div className="flex items-center gap-16">
            {/* Decline */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                onClick={onDecline}
                className="w-16 h-16 rounded-full bg-red-500/90 flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </motion.button>
              <span className="text-xs text-white/50">Decline</span>
            </div>

            {/* Answer */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                onClick={onAnswer}
                className="w-16 h-16 rounded-full bg-green-500/90 flex items-center justify-center shadow-lg shadow-green-500/30 active:scale-95"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Phone className="w-7 h-7 text-white" />
              </motion.button>
              <span className="text-xs text-white/50">Answer</span>
            </div>
          </div>

          {/* Subtle hint */}
          <motion.p
            className="absolute bottom-8 text-white/30 text-xs text-center px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
          >
            {ringCount > 3 ? "If you don't answer, your Higher Self will leave a voicemail." : ""}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
