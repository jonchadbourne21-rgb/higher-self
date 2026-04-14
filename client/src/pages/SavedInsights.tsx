import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Heart, Star, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function SavedInsights() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"all" | "heart" | "star">("all");

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  const { data: insights, refetch } = trpc.savedInsights.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteMutation = trpc.savedInsights.delete.useMutation({
    onSuccess: () => {
      toast.success("Insight removed");
      refetch();
    },
    onError: () => toast.error("Couldn't remove insight. Try again."),
  });

  const filtered = insights?.filter((i) => filter === "all" || i.reactionType === filter) ?? [];

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Header */}
        <div className="px-5 pt-8 pb-4 border-b border-border/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-medium text-foreground">Saved Insights</h1>
              <p className="text-xs text-muted-foreground">Wisdom you've collected from your Mirror</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(["all", "heart", "star"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filter === f
                    ? f === "heart"
                      ? "bg-pink-500/20 text-pink-500 border border-pink-400/40"
                      : f === "star"
                      ? "bg-amber-500/20 text-amber-500 border border-amber-400/40"
                      : "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground border border-border/40 hover:border-border"
                }`}
              >
                {f === "heart" && <Heart className="w-3 h-3" />}
                {f === "star" && <Star className="w-3 h-3" />}
                {f === "all" ? "All" : f === "heart" ? "Emotional" : "Actionable"}
                {f !== "all" && (
                  <span className="opacity-60">
                    ({insights?.filter((i) => i.reactionType === f).length ?? 0})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-4 space-y-3">
          {!insights && (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-2xl p-4 animate-pulse">
                  <div className="h-3 bg-muted/50 rounded w-1/4 mb-3" />
                  <div className="h-4 bg-muted/50 rounded w-full mb-2" />
                  <div className="h-4 bg-muted/50 rounded w-3/4" />
                </div>
              ))}
            </div>
          )}

          {insights && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-16 gap-4 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                {filter === "heart" ? (
                  <Heart className="w-7 h-7 text-pink-400/60" />
                ) : filter === "star" ? (
                  <Star className="w-7 h-7 text-amber-400/60" />
                ) : (
                  <BookOpen className="w-7 h-7 text-primary/40" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/70 mb-1">
                  {filter === "all" ? "No insights saved yet" : `No ${filter === "heart" ? "emotional" : "actionable"} insights yet`}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {filter === "all"
                    ? "Tap the 💜 or ⭐ buttons on any Mirror response to save insights here"
                    : `Tap the ${filter === "heart" ? "💜" : "⭐"} button on Mirror responses to save ${filter === "heart" ? "emotional" : "actionable"} insights`}
                </p>
              </div>
              <button
                onClick={() => navigate("/chat")}
                className="mt-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/20 transition-all"
              >
                Open Mirror ✦
              </button>
            </div>
          )}

          <AnimatePresence>
            {filtered.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.04 }}
                className="glass rounded-2xl p-4 group"
              >
                {/* Insight header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {insight.reactionType === "heart" ? (
                      <span className="flex items-center gap-1 text-xs text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-400/20">
                        <Heart className="w-3 h-3" fill="currentColor" /> Emotional
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                        <Star className="w-3 h-3" fill="currentColor" /> Actionable
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground/60">{formatDate(insight.savedAt)}</span>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate({ id: insight.id })}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive"
                    title="Remove insight"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Insight content */}
                <p className="text-sm text-foreground/80 leading-relaxed line-clamp-6">
                  {insight.content}
                </p>

                {/* Optional note */}
                {insight.note && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <p className="text-xs text-muted-foreground italic">"{insight.note}"</p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}
