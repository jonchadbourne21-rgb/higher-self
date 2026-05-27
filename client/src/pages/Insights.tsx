import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Sparkles, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

export default function Insights() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: allInsights, refetch, isLoading } = trpc.insights.all.useQuery(undefined, { enabled: isAuthenticated });

  const generateMutation = trpc.insights.generate.useMutation({
    onSuccess: () => {
      toast.success("New insight generated ✦");
      refetch();
    },
    onError: () => toast.error("Failed to generate insight. Try again."),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  const latest = allInsights?.[0];

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-light">Insights</h1>
            <p className="text-xs text-muted-foreground mt-1">Patterns, wisdom, and next steps</p>
          </div>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-all disabled:opacity-50"
          >
            {generateMutation.isPending ? (
              <RefreshCw size={16} className="text-primary animate-spin" />
            ) : (
              <Sparkles size={16} className="text-primary" />
            )}
          </button>
        </div>

        {/* Generate CTA */}
        {!latest && !isLoading && (
          <div className="glass rounded-3xl p-6 space-y-4 border border-primary/20 glow-gold">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <span className="text-2xl">🔮</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Generate Your First Insight</p>
                <p className="text-xs text-muted-foreground">Your Higher Self will analyze your patterns</p>
              </div>
            </div>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="w-full rounded-2xl py-5 glow-gold"
            >
              {generateMutation.isPending ? (
                <span className="animate-pulse">Analyzing your patterns...</span>
              ) : (
                <><Sparkles size={16} className="mr-2" /> Generate Insight</>
              )}
            </Button>
          </div>
        )}

        {/* Latest insight */}
        {latest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="glass rounded-3xl p-5 space-y-4 border border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <span className="text-xs">✦</span>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">Latest Insight</p>
                </div>
                <p className="text-xs text-muted-foreground">{format(new Date(latest.createdAt), "MMM d")}</p>
              </div>

              {/* Growth score */}
              <div className="flex items-center gap-3">
                <div className="text-3xl font-serif text-primary">{Math.round(latest.growthScore || 0)}</div>
                <div>
                  <p className="text-xs text-foreground">Growth Score</p>
                  <div className="h-1.5 w-24 bg-border rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${latest.growthScore || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="streamdown-content">
                <Streamdown>{latest.insightText}</Streamdown>
              </div>
            </div>

            {/* Patterns */}
            {Array.isArray(latest.patterns) && latest.patterns.length > 0 && (
              <div className="glass rounded-3xl p-5 space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Patterns Observed</p>
                <div className="space-y-2">
                  {(latest.patterns as string[]).map((pattern, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-primary text-sm mt-0.5">◆</span>
                      <p className="text-sm text-foreground leading-relaxed">{pattern}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable steps */}
            {Array.isArray(latest.actionableSteps) && latest.actionableSteps.length > 0 && (
              <div className="glass rounded-3xl p-5 space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">This Week's Actions</p>
                <div className="space-y-3">
                  {(latest.actionableSteps as string[]).map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-primary font-medium">{i + 1}</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refresh */}
            <Button
              variant="outline"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="w-full rounded-2xl py-5"
            >
              {generateMutation.isPending ? (
                <span className="animate-pulse">Generating...</span>
              ) : (
                <><RefreshCw size={16} className="mr-2" /> Generate New Insight</>
              )}
            </Button>
          </motion.div>
        )}

        {/* History */}
        {allInsights && allInsights.length > 1 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Previous Insights</p>
            {allInsights.slice(1).map((insight) => (
              <div key={insight.id} className="glass rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{format(new Date(insight.createdAt), "MMMM d, yyyy")}</p>
                  <span className="text-xs text-primary">{Math.round(insight.growthScore || 0)} score</span>
                </div>
                <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{insight.insightText}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
