import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface EchoData {
  id: number;
  sourceEntryId: number;
  sourceContent: string;
  sourceTitle: string | null;
  sourceCreatedAt: string | Date;
  reframingLine: string;
  isCompound: boolean;
  compoundEntries?: Array<{ id: number; content: string; createdAt: string | Date }>;
}

/**
 * EchoReveal — Cinematic full-screen reveal of a past journal entry
 * 
 * Sequence:
 * 1. 2s silence (breathing orb)
 * 2. Timestamp fade ("3 weeks ago, you wrote...")
 * 3. Entry excerpt fade
 * 4. Mirror reframing line
 * 5. Controls (Reflect / Dismiss)
 */
export function EchoReveal() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<"silence" | "timestamp" | "entry" | "reframing" | "controls" | "done">("silence");
  const [echo, setEcho] = useState<EchoData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading } = trpc.echo.getPending.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // Don't re-fetch for 5 minutes
    refetchOnWindowFocus: false,
  });

  const dismissMutation = trpc.echo.dismiss.useMutation();
  const reflectMutation = trpc.echo.reflect.useMutation();

  useEffect(() => {
    if (data && !dismissed) {
      setEcho(data as EchoData);
    }
  }, [data, dismissed]);

  // Cinematic sequence timing
  useEffect(() => {
    if (!echo) return;
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setPhase("timestamp"), 2000));
    timers.push(setTimeout(() => setPhase("entry"), 3500));
    timers.push(setTimeout(() => setPhase("reframing"), 6000));
    timers.push(setTimeout(() => setPhase("controls"), 8000));
    return () => timers.forEach(clearTimeout);
  }, [echo]);

  const handleDismiss = useCallback(() => {
    if (!echo) return;
    dismissMutation.mutate({ echoId: echo.id });
    setDismissed(true);
    setPhase("done");
  }, [echo, dismissMutation]);

  const handleReflect = useCallback(() => {
    if (!echo) return;
    reflectMutation.mutate({ echoId: echo.id });
    setDismissed(true);
    setPhase("done");
    // Navigate to journal with the echo content pre-loaded as context
    navigate(`/journal?echoSource=${echo.sourceEntryId}`);
  }, [echo, reflectMutation, navigate]);

  // Don't render if no echo or already dismissed
  if (isLoading || !echo || dismissed || phase === "done") return null;

  const timeAgo = formatTimeAgo(new Date(echo.sourceCreatedAt));
  const excerpt = echo.sourceContent.length > 280 
    ? echo.sourceContent.slice(0, 280) + "..." 
    : echo.sourceContent;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a14]/98 backdrop-blur-xl"
      >
        {/* Dismiss X button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          whileHover={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
          onClick={handleDismiss}
          className="absolute top-6 right-6 p-2 text-white/40 hover:text-white/80 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </motion.button>

        <div className="max-w-lg mx-auto px-8 text-center">
          {/* Phase 1: Silence — breathing orb */}
          <AnimatePresence mode="wait">
            {phase === "silence" && (
              <motion.div
                key="silence"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="relative w-16 h-16">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-teal-500/20"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    className="absolute inset-2 rounded-full bg-teal-500/30"
                  />
                  <div className="absolute inset-4 rounded-full bg-teal-500/50" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 2: Timestamp */}
          <AnimatePresence>
            {(phase === "timestamp" || phase === "entry" || phase === "reframing" || phase === "controls") && (
              <motion.div
                key="timestamp"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="mb-8"
              >
                <div className="inline-flex items-center gap-2 text-teal-400/70 text-sm font-light tracking-wide">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeAgo}, you wrote...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 3: Entry excerpt */}
          <AnimatePresence>
            {(phase === "entry" || phase === "reframing" || phase === "controls") && (
              <motion.div
                key="entry"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="mb-10"
              >
                {echo.sourceTitle && (
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-3 font-light">
                    {echo.sourceTitle}
                  </p>
                )}
                <blockquote className="text-white/80 text-lg leading-relaxed font-serif italic border-l-2 border-teal-500/30 pl-5 text-left">
                  "{excerpt}"
                </blockquote>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 4: Mirror reframing line */}
          <AnimatePresence>
            {(phase === "reframing" || phase === "controls") && (
              <motion.div
                key="reframing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="mb-10"
              >
                <div className="relative">
                  <div className="absolute -left-3 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-400/40 to-transparent" />
                  <p className="text-amber-200/90 text-base leading-relaxed font-light pl-3">
                    {echo.reframingLine}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 5: Controls */}
          <AnimatePresence>
            {phase === "controls" && (
              <motion.div
                key="controls"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col items-center gap-3"
              >
                <button
                  onClick={handleReflect}
                  className="flex items-center gap-2 px-6 py-3 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 hover:border-teal-500/50 rounded-full text-teal-300 text-sm font-medium transition-all duration-300"
                >
                  <BookOpen className="w-4 h-4" />
                  Reflect on this
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-white/30 hover:text-white/50 text-xs font-light transition-colors duration-300 mt-2"
                >
                  Not now
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compound echo: show multiple entries */}
          {echo.isCompound && echo.compoundEntries && phase === "entry" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mt-4 text-white/30 text-xs"
            >
              Pattern seen across {echo.compoundEntries.length} entries
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) return "Earlier today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}
