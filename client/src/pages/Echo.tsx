import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, BookOpen, Sparkles, ChevronRight, Flame, Zap, Target, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { useLocation } from "wouter";
import { toast } from "sonner";

// Category icons and colors for challenges
const CHALLENGE_STYLES: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  grounding: { icon: "🌿", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  connection: { icon: "🤝", color: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  movement: { icon: "⚡", color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  perspective: { icon: "🔭", color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  expression: { icon: "🎨", color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  courage: { icon: "🦁", color: "text-orange-300", bg: "bg-orange-500/10", border: "border-orange-500/20" },
};

export default function Echo() {
  const [, navigate] = useLocation();
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [activeEchoId, setActiveEchoId] = useState<number | null>(null);

  const { data: stats, isLoading: statsLoading } = trpc.echo.stats.useQuery();
  const { data: history, isLoading: historyLoading } = trpc.echo.history.useQuery({ limit: 20 });
  const { data: pending } = trpc.echo.getPending.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const utils = trpc.useUtils();

  const acceptMutation = trpc.echo.acceptChallenge.useMutation({
    onSuccess: () => {
      toast.success("Challenge accepted. You've got this.");
      utils.echo.getPending.invalidate();
    },
  });

  const completeMutation = trpc.echo.completeChallenge.useMutation({
    onSuccess: () => {
      toast.success("Challenge complete. Your higher self is proud.");
      setShowReflection(false);
      setReflectionText("");
      setActiveEchoId(null);
      utils.echo.getPending.invalidate();
      utils.echo.history.invalidate();
      utils.echo.stats.invalidate();
    },
  });

  const skipMutation = trpc.echo.skipChallenge.useMutation({
    onSuccess: () => {
      toast("Challenge set aside. It'll be here when you're ready.", { icon: "🌙" });
      utils.echo.getPending.invalidate();
    },
  });

  const handleAcceptChallenge = (echoId: number) => {
    setActiveEchoId(echoId);
    acceptMutation.mutate({ echoId });
  };

  const handleCompleteChallenge = () => {
    if (!activeEchoId) return;
    completeMutation.mutate({
      echoId: activeEchoId,
      reflection: reflectionText.trim() || undefined,
    });
  };

  const handleSkipChallenge = (echoId: number) => {
    skipMutation.mutate({ echoId });
  };

  const challengeStyle = pending?.challengeCategory
    ? CHALLENGE_STYLES[pending.challengeCategory] || CHALLENGE_STYLES.courage
    : null;

  return (
    <AppShell>
      <div className="container max-w-lg mx-auto px-4 py-6 pb-32 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-500/10 border border-teal-500/20 mb-2">
            <span className="text-2xl">🔮</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Echo</h1>
          <p className="text-sm text-white/50 font-light">
            Your past self speaks to your present
          </p>
        </motion.div>

        {/* Stats Row */}
        {!statsLoading && stats && (stats.total > 0 || stats.pending > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3"
          >
            <StatCard label="Echoes" value={stats.total} />
            <StatCard label="Reflected" value={stats.reflected} accent />
            <StatCard label="Pending" value={stats.pending} />
          </motion.div>
        )}

        {/* Pending Echo Card */}
        {pending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-purple-500/5 p-5"
          >
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-teal-400/70 bg-teal-500/10 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                New
              </span>
            </div>
            <p className="text-xs text-white/40 mb-3 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(new Date(pending.sourceCreatedAt))}, you wrote...
            </p>
            <blockquote className="text-white/70 text-sm leading-relaxed italic border-l-2 border-teal-500/30 pl-3 mb-4 line-clamp-3">
              "{pending.sourceContent.length > 150 ? pending.sourceContent.slice(0, 150) + "..." : pending.sourceContent}"
            </blockquote>
            <p className="text-amber-200/80 text-sm font-light leading-relaxed mb-4">
              {pending.reframingLine}
            </p>
            <button
              onClick={() => navigate(`/journal?echoSource=${pending.sourceEntryId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/25 rounded-full text-teal-300 text-xs font-medium transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Reflect on this
            </button>
          </motion.div>
        )}

        {/* Challenge Card — appears when Echo has a challenge attached */}
        <AnimatePresence>
          {pending?.challengeText && challengeStyle && !showReflection && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 20 }}
              className={`relative overflow-hidden rounded-2xl border ${challengeStyle.border} ${challengeStyle.bg} p-5`}
            >
              {/* Category badge */}
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${challengeStyle.color}`}>
                  <span className="text-base">{challengeStyle.icon}</span>
                  {pending.challengeCategory} challenge
                </span>
                <Flame className={`w-4 h-4 ${challengeStyle.color} opacity-60`} />
              </div>

              {/* Challenge text */}
              <p className="text-white/90 text-sm leading-relaxed font-medium mb-5">
                {pending.challengeText}
              </p>

              {/* Motivational subtext */}
              <p className="text-white/30 text-[11px] italic mb-4">
                Your higher self knows you can do this. One small act against the current.
              </p>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAcceptChallenge(pending.id)}
                  disabled={acceptMutation.isPending}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 ${challengeStyle.bg} hover:bg-white/10 border ${challengeStyle.border} rounded-full ${challengeStyle.color} text-xs font-semibold transition-all`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  {acceptMutation.isPending ? "..." : "I'll do it"}
                </button>
                <button
                  onClick={() => handleSkipChallenge(pending.id)}
                  disabled={skipMutation.isPending}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-full text-white/40 text-xs font-medium transition-all"
                >
                  Not today
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Challenge Completion Flow */}
        <AnimatePresence>
          {showReflection && activeEchoId && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium">Challenge complete</p>
                  <p className="text-white/40 text-[11px]">How did that feel?</p>
                </div>
              </div>

              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="A few words on what shifted... (optional)"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white/80 text-sm placeholder:text-white/25 focus:outline-none focus:border-emerald-500/30 resize-none"
                rows={3}
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCompleteChallenge}
                  disabled={completeMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 rounded-full text-emerald-300 text-xs font-semibold transition-all"
                >
                  <Target className="w-3.5 h-3.5" />
                  {completeMutation.isPending ? "Saving..." : "Done"}
                </button>
                <button
                  onClick={() => { setShowReflection(false); setActiveEchoId(null); }}
                  className="px-3 py-2.5 text-white/30 text-xs hover:text-white/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Challenge — show "I did it" button if challenge was accepted */}
        {activeEchoId && !showReflection && acceptMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
          >
            <p className="text-white/60 text-xs mb-3 text-center">
              Take your time. When you're done...
            </p>
            <button
              onClick={() => setShowReflection(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 rounded-full text-amber-300 text-sm font-semibold transition-all"
            >
              <Check className="w-4 h-4" />
              I did it
            </button>
          </motion.div>
        )}

        {/* Empty State */}
        {!pending && !historyLoading && (!history || history.length === 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-12 space-y-4"
          >
            <div className="relative w-20 h-20 mx-auto">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-teal-500/10"
              />
              <div className="absolute inset-4 rounded-full bg-teal-500/15 flex items-center justify-center">
                <span className="text-2xl opacity-60">🔮</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-white/60 text-sm font-medium">No echoes yet</p>
              <p className="text-white/35 text-xs leading-relaxed max-w-xs mx-auto">
                Keep journaling. When your Mirror notices a pattern between entries, it will surface an Echo — a reflection from your past self, sometimes with a challenge to help you break through.
              </p>
            </div>
          </motion.div>
        )}

        {/* Echo History */}
        {history && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 px-1">
              Past Echoes
            </h2>
            <div className="space-y-2">
              {history.map((echo, idx) => (
                <EchoHistoryCard key={echo.id} echo={echo} index={idx} navigate={navigate} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
      <p className={`text-lg font-semibold ${accent ? "text-teal-400" : "text-white/80"}`}>
        {value}
      </p>
      <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

interface EchoHistoryItem {
  id: number;
  sourceEntryId: number;
  sourceTitle: string | null;
  sourceExcerpt: string;
  sourceCreatedAt: string | Date;
  reframingLine: string;
  isCompound: boolean;
  surfacedAt: string | Date | null;
  wasReflected: boolean;
  wasDismissed: boolean;
  challengeText?: string | null;
  challengeCategory?: string | null;
  challengeCompleted?: boolean;
  challengeSkipped?: boolean;
}

function EchoHistoryCard({ echo, index, navigate }: { echo: EchoHistoryItem; index: number; navigate: (path: string) => void }) {
  const style = echo.challengeCategory ? CHALLENGE_STYLES[echo.challengeCategory] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
      onClick={() => navigate(`/journal/${echo.sourceEntryId}`)}
      className="group rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-teal-500/20 p-4 cursor-pointer transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Source entry info */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-white/30 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {echo.surfacedAt ? formatShortDate(new Date(echo.surfacedAt)) : ""}
            </span>
            {echo.wasReflected && (
              <span className="text-[9px] text-teal-400/70 bg-teal-500/10 px-1.5 py-0.5 rounded-full">
                reflected
              </span>
            )}
            {echo.isCompound && (
              <span className="text-[9px] text-purple-400/70 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                pattern
              </span>
            )}
            {echo.challengeCompleted && (
              <span className="text-[9px] text-emerald-400/70 bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Check className="w-2 h-2" />
                challenge done
              </span>
            )}
            {echo.challengeText && !echo.challengeCompleted && !echo.challengeSkipped && (
              <span className={`text-[9px] ${style?.color || "text-amber-400/70"} ${style?.bg || "bg-amber-500/10"} px-1.5 py-0.5 rounded-full`}>
                {echo.challengeCategory || "challenge"}
              </span>
            )}
          </div>
          {/* Reframing line */}
          <p className="text-white/70 text-sm leading-relaxed line-clamp-2">
            {echo.reframingLine}
          </p>
          {/* Challenge text if present */}
          {echo.challengeText && (
            <p className={`text-xs leading-relaxed line-clamp-1 ${style?.color || "text-amber-300/60"} opacity-70`}>
              ⚡ {echo.challengeText}
            </p>
          )}
          {/* Source excerpt */}
          <p className="text-white/30 text-xs line-clamp-1 italic">
            {echo.sourceTitle || echo.sourceExcerpt}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 mt-2 flex-shrink-0 transition-colors" />
      </div>
    </motion.div>
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

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
