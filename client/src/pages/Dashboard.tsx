import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import AppShell from "@/components/AppShell";
import { ChevronRight } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { format } from "date-fns";

const DOMAIN_COLORS = {
  mindset: "#a78bfa",
  relationships: "#f87171",
  work: "#fbbf24",
  health: "#34d399",
  spirituality: "#818cf8",
  finances: "#2dd4bf",
};

const DOMAIN_LABELS: Record<string, string> = {
  mindset: "Mindset",
  relationships: "Relations",
  work: "Work",
  health: "Health",
  spirituality: "Spirit",
  finances: "Finances",
};

export default function Dashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: overview, isLoading } = trpc.dashboard.overview.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  const radarData = (overview?.domainScores || []).map((d) => ({
    domain: DOMAIN_LABELS[d?.domain || ""] || d?.domain,
    score: d?.score || 0,
    fullMark: 10,
  }));

  const moodData = (overview?.moodTrend || []).map((d) => ({
    date: d.date ? format(new Date(d.date), "MMM d") : "",
    mood: Number(d.avgMood?.toFixed(1)) || 0,
    energy: Number(d.avgEnergy?.toFixed(1)) || 0,
  }));

  const avgScore = overview?.avgGrowthScore || 0;

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif font-light">Growth</h1>
          <p className="text-xs text-muted-foreground mt-1">Your evolution, visualized</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-3xl bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Overall score */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-3xl p-6 flex items-center gap-6"
            >
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="oklch(0.22 0.03 200)" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke="oklch(0.62 0.14 155)" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(avgScore / 100) * 201} 201`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-serif text-primary">{avgScore}</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-lg font-serif text-foreground">Overall Growth</p>
                <p className="text-xs text-muted-foreground mt-1">Based on your domain scores</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1 flex-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-1000"
                      style={{ width: `${avgScore}%` }}
                    />
                  </div>
                  <span className="text-xs text-primary">{avgScore}%</span>
                </div>
              </div>
            </motion.div>

            {/* Radar chart */}
            {radarData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-3xl p-5 space-y-3"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Life Balance</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="oklch(0.22 0.03 200)" />
                      <PolarAngleAxis
                        dataKey="domain"
                        tick={{ fill: "oklch(0.50 0.04 185)", fontSize: 11 }}
                      />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="oklch(0.62 0.14 155)"
                        fill="oklch(0.62 0.14 155)"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Mood trend */}
            {moodData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-3xl p-5 space-y-3"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Mood & Energy Trend</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={moodData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.03 200)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "oklch(0.50 0.04 185)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fill: "oklch(0.50 0.04 185)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={20}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "oklch(0.16 0.03 200)",
                          border: "1px solid oklch(0.22 0.03 200)",
                          borderRadius: "12px",
                          color: "oklch(0.95 0.01 80)",
                          fontSize: "12px",
                        }}
                      />
                      <Line
                        type="monotone" dataKey="mood" stroke="oklch(0.62 0.14 155)"
                        strokeWidth={2} dot={false} name="Mood"
                      />
                      <Line
                        type="monotone" dataKey="energy" stroke="oklch(0.65 0.10 155)"
                        strokeWidth={2} dot={false} name="Energy"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground">Mood</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded-full" style={{ background: "oklch(0.65 0.10 155)" }} />
                    <span className="text-xs text-muted-foreground">Energy</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Domain scores grid */}
            {(overview?.domainScores || []).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Domain Scores</p>
                <div className="grid grid-cols-2 gap-3">
                  {(overview?.domainScores || []).map((d) => (
                    <div key={d?.domain} className="glass rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground capitalize">{DOMAIN_LABELS[d?.domain || ""] || d?.domain}</span>
                        <span className="text-lg font-serif text-primary">{d?.score?.toFixed(1)}</span>
                      </div>
                      <div className="h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${(d?.score || 0) * 10}%`,
                            background: DOMAIN_COLORS[d?.domain as keyof typeof DOMAIN_COLORS] || "oklch(0.62 0.14 155)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recent milestones */}
            {(overview?.milestones || []).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">Recent Milestones</p>
                  <Link href="/timeline">
                    <span className="text-xs text-primary flex items-center gap-1">
                      All <ChevronRight size={12} />
                    </span>
                  </Link>
                </div>
                <div className="space-y-2">
                  {(overview?.milestones || []).map((m) => (
                    <div key={m.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                      <span className="text-xl">{m.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(m.achievedAt), "MMM d")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Empty state */}
            {(overview?.domainScores || []).length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                <span className="text-5xl">📊</span>
                <p className="text-muted-foreground text-sm">Complete your onboarding to see your growth dashboard.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
