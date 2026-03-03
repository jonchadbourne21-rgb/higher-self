import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import AppShell from "@/components/AppShell";
import { Sparkles, BookOpen, Compass, MessageCircle, ChevronRight, Sun, Moon } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: todayCheckIn } = trpc.checkIn.today.useQuery(undefined, { enabled: isAuthenticated });
  const { data: latestInsight } = trpc.insights.latest.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
    if (!loading && isAuthenticated && !(user as any)?.onboardingCompleted) navigate("/onboarding");
  }, [isAuthenticated, loading, user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetingIcon = hour < 17 ? <Sun size={16} className="text-primary" /> : <Moon size={16} className="text-primary" />;

  const name = profile?.preferredName || user?.name?.split(" ")[0] || "friend";
  const today = format(new Date(), "EEEE, MMMM d");

  const quickActions = [
    { icon: "✦", label: "Daily Check-in", path: "/checkin", done: !!todayCheckIn, color: "text-primary" },
    { icon: "🪞", label: "Talk to Mirror", path: "/chat", done: false, color: "text-violet-400" },
    { icon: "📝", label: "Journal", path: "/journal", done: false, color: "text-sky-400" },
    { icon: "🧭", label: "Life Domains", path: "/domains", done: false, color: "text-emerald-400" },
  ];

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-1"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            {greetingIcon}
            <span>{today}</span>
          </div>
          <h1 className="text-3xl font-serif font-light text-foreground">
            {greeting},<br />
            <span className="text-gold-gradient">{name}</span>
          </h1>
        </motion.div>

        {/* Check-in status card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {todayCheckIn ? (
            <div className="glass rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Today's Check-in ✓</p>
                <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">Done</span>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 text-center">
                  <p className="text-2xl font-serif text-primary">{todayCheckIn.mood}</p>
                  <p className="text-xs text-muted-foreground">Mood</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-2xl font-serif text-primary">{todayCheckIn.energy}</p>
                  <p className="text-xs text-muted-foreground">Energy</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-2xl font-serif text-primary">{todayCheckIn.stress}</p>
                  <p className="text-xs text-muted-foreground">Stress</p>
                </div>
              </div>
              {todayCheckIn.aiResponse && (
                <div className="border-t border-border/50 pt-3">
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    "{todayCheckIn.aiResponse.slice(0, 120)}..."
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Link href="/checkin">
              <div className="glass rounded-3xl p-5 border border-primary/20 glow-gold cursor-pointer hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">How are you today?</p>
                    <p className="text-xs text-muted-foreground">Complete your daily check-in</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles size={18} className="text-primary" />
                  </div>
                </div>
              </div>
            </Link>
          )}
        </motion.div>

        {/* Quick actions grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="text-xs text-muted-foreground uppercase tracking-widest">Your Space</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, i) => (
              <Link key={action.path} href={action.path}>
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="glass rounded-2xl p-4 space-y-3 cursor-pointer hover:border-border transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{action.icon}</span>
                    {action.done && (
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">✓</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Latest insight */}
        {latestInsight && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link href="/insights">
              <div className="glass rounded-3xl p-5 space-y-3 cursor-pointer hover:border-primary/20 transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">Latest Insight</p>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                  {latestInsight.insightText}
                </p>
                {Array.isArray(latestInsight.actionableSteps) && latestInsight.actionableSteps.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-primary">{latestInsight.actionableSteps.length} action steps</span>
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        )}

        {/* Generate insight prompt */}
        {!latestInsight && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link href="/insights">
              <div className="glass rounded-3xl p-5 border border-dashed border-border/50 cursor-pointer hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔮</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Generate Your First Insight</p>
                    <p className="text-xs text-muted-foreground">Let your Higher Self analyze your patterns</p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Growth dashboard link */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link href="/dashboard">
            <div className="glass rounded-3xl p-5 space-y-3 cursor-pointer hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Growth Dashboard</p>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-serif text-primary">✦</div>
                <p className="text-sm text-muted-foreground">View your evolution across all life domains</p>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </AppShell>
  );
}
