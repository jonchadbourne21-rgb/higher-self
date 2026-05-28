import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import AppShell from "@/components/AppShell";
import { ChevronRight, Star, Sparkles, Lock, Crown } from "lucide-react";
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

type TimeRange = "week" | "month" | "year";

export default function Dashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  const { data: overview, isLoading } = trpc.dashboard.overview.useQuery(undefined, { enabled: isAuthenticated });
  const { data: latestInsight } = trpc.insights.latest.useQuery(undefined, { enabled: isAuthenticated });
  const { data: weeklyDigest } = trpc.home.getLatestDigest.useQuery(undefined, { enabled: isAuthenticated });

  const isPro = overview?.isPro ?? false;

  // Fetch mood trend based on selected time range
  const daysForRange = useMemo(() => {
    switch (timeRange) {
      case "week": return 7;
      case "month": return 30;
      case "year": return 365;
    }
  }, [timeRange]);

  const { data: extendedMoodTrend } = trpc.dashboard.moodTrend.useQuery(
    { days: daysForRange },
    { enabled: isAuthenticated && (timeRange !== "week" || !overview?.moodTrend) }
  );

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  const radarData = (overview?.domainScores || []).map((d) => ({
    domain: DOMAIN_LABELS[d?.domain || ""] || d?.domain,
    score: d?.score || 0,
    fullMark: 10,
  }));

  // Use extended mood trend when available, otherwise fall back to overview data
  const rawMoodData = timeRange === "week" && overview?.moodTrend
    ? overview.moodTrend
    : extendedMoodTrend || [];

  const moodData = rawMoodData.map((d) => ({
    date: d.date ? format(new Date(d.date), timeRange === "year" ? "MMM" : "MMM d") : "",
    mood: Number(Number(d.avgMood || 0).toFixed(1)) || 0,
    energy: Number(Number(d.avgEnergy || 0).toFixed(1)) || 0,
  }));

  const avgScore = overview?.avgGrowthScore || 0;

  const handleTimeRangeChange = (range: TimeRange) => {
    if (range !== "week" && !isPro) {
      navigate("/pricing");
      return;
    }
    setTimeRange(range);
  };

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif font-light">Growth</h1>
          <p className="text-xs text-muted-foreground mt-1">Insights, reflections & your evolution</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-3xl bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Insights & Reflections ──────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Insights & Reflections</p>

              {/* Latest AI Insight */}
              {latestInsight ? (
                <Link href="/insights">
                  <div
                    className="rounded-2xl p-5 space-y-3 cursor-pointer transition-all hover:shadow-md"
                    style={{
                      background: "oklch(0.17 0.04 280)",
                      border: "1px solid oklch(0.28 0.05 280 / 0.6)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <p className="text-xs text-amber-400 uppercase tracking-widest font-medium">Latest Insight</p>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                      {latestInsight.insightText}
                    </p>
                    {Array.isArray(latestInsight.actionableSteps) && latestInsight.actionableSteps.length > 0 && (
                      <span className="text-xs text-primary font-medium">
                        {latestInsight.actionableSteps.length} action steps →
                      </span>
                    )}
                  </div>
                </Link>
              ) : (
                <Link href="/insights">
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="rounded-2xl p-5 cursor-pointer border-2 border-dashed transition-all"
                    style={{ borderColor: "oklch(0.55 0.14 290 / 0.4)", background: "oklch(0.55 0.14 290 / 0.05)" }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🔮</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Generate Your First Insight</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Let your mirror analyze your patterns</p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground ml-auto shrink-0" />
                    </div>
                  </motion.div>
                </Link>
              )}

              {/* Weekly Reflection */}
              {weeklyDigest && (
                <Link href="/insights">
                  <div
                    className="rounded-2xl p-5 space-y-3 cursor-pointer transition-all hover:shadow-md"
                    style={{
                      background: "oklch(0.17 0.04 280)",
                      border: "1px solid oklch(0.65 0.16 185 / 0.25)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={12} style={{ color: "oklch(0.65 0.16 185)" }} />
                        <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "oklch(0.65 0.16 185)" }}>
                          Weekly Reflection
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                      {weeklyDigest.summary}
                    </p>
                    <p className="text-xs text-primary font-medium">
                      {weeklyDigest.sessionCount} Mirror sessions this week
                    </p>
                  </div>
                </Link>
              )}
            </motion.div>

            {/* Pro-gated Growth Dashboard banner for free users */}
            {!isPro && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Link href="/pricing">
                  <div
                    className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.20 0.06 280), oklch(0.17 0.05 290))",
                      border: "1.5px solid oklch(0.65 0.16 185 / 0.3)",
                      boxShadow: "0 0 20px oklch(0.65 0.16 185 / 0.06)",
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "oklch(0.65 0.16 185 / 0.15)", border: "1px solid oklch(0.65 0.16 185 / 0.3)" }}
                      >
                        <Crown size={20} style={{ color: "oklch(0.65 0.16 185)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">Unlock Growth Dashboard</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Get monthly & yearly analytics, full mood trends, and deep insights with Pro
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Overall score — visible to all */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
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

            {/* Radar chart — visible to all */}
            {radarData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
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

            {/* Mood trend with time range selector */}
            {(moodData.length > 0 || isPro) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-3xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">Mood & Energy Trend</p>
                  {/* Time range tabs */}
                  <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "oklch(0.15 0.02 200)" }}>
                    {(["week", "month", "year"] as TimeRange[]).map((range) => {
                      const isActive = timeRange === range;
                      const isLocked = range !== "week" && !isPro;
                      return (
                        <button
                          key={range}
                          onClick={() => handleTimeRangeChange(range)}
                          className="relative px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-1"
                          style={{
                            background: isActive ? "oklch(0.22 0.04 200)" : "transparent",
                            color: isActive
                              ? "oklch(0.90 0.01 270)"
                              : isLocked
                                ? "oklch(0.40 0.03 270)"
                                : "oklch(0.60 0.03 270)",
                          }}
                        >
                          {isLocked && <Lock size={8} />}
                          {range === "week" ? "7d" : range === "month" ? "30d" : "1y"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {moodData.length > 0 ? (
                  <>
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
                  </>
                ) : (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Complete check-ins to see your mood trends</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Domain scores grid */}
            {(overview?.domainScores || []).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
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
                transition={{ delay: 0.5 }}
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
