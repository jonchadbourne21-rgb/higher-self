import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, BookOpen, Sparkles, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { useLocation } from "wouter";

export default function Echo() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.echo.stats.useQuery();
  const { data: history, isLoading: historyLoading } = trpc.echo.history.useQuery({ limit: 20 });
  const { data: pending } = trpc.echo.getPending.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

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
                Keep journaling. When your Mirror notices a pattern between entries, it will surface an Echo — a reflection from your past self.
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
}

function EchoHistoryCard({ echo, index, navigate }: { echo: EchoHistoryItem; index: number; navigate: (path: string) => void }) {
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
          <div className="flex items-center gap-2">
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
          </div>
          {/* Reframing line */}
          <p className="text-white/70 text-sm leading-relaxed line-clamp-2">
            {echo.reframingLine}
          </p>
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
