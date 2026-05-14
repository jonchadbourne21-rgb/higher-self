import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";

interface Milestone {
  id: number;
  habitId: number;
  habitName: string;
  habitEmoji: string | null;
  habitDomain: string;
  streakDays: number;
  achievedAt: Date;
}

interface MilestoneCardProps {
  milestone: Milestone;
}

const STREAK_CONFIG: Record<number, { icon: string; label: string; borderClass: string; badgeClass: string; glowClass: string }> = {
  7:   { icon: "🔥", label: "7-Day Streak",   borderClass: "border-blue-500/40",   badgeClass: "bg-blue-500/20 text-blue-300",   glowClass: "shadow-blue-500/10" },
  14:  { icon: "⚡", label: "14-Day Streak",  borderClass: "border-violet-500/40", badgeClass: "bg-violet-500/20 text-violet-300", glowClass: "shadow-violet-500/10" },
  30:  { icon: "👑", label: "30-Day Streak",  borderClass: "border-amber-500/40",  badgeClass: "bg-amber-500/20 text-amber-300",  glowClass: "shadow-amber-500/10" },
  100: { icon: "💎", label: "100-Day Streak", borderClass: "border-rose-500/40",   badgeClass: "bg-rose-500/20 text-rose-300",    glowClass: "shadow-rose-500/10" },
};

function getConfig(streakDays: number) {
  return STREAK_CONFIG[streakDays] ?? {
    icon: "⭐",
    label: `${streakDays}-Day Streak`,
    borderClass: "border-border/40",
    badgeClass: "bg-muted text-muted-foreground",
    glowClass: "",
  };
}

/**
 * MilestoneCard displays a single achievement badge for a streak milestone.
 * Uses dark-theme-aware CSS variables for consistent appearance.
 */
export function MilestoneCard({ milestone }: MilestoneCardProps) {
  const cfg = getConfig(milestone.streakDays);

  return (
    <Card className={`p-4 border-2 ${cfg.borderClass} bg-card/60 backdrop-blur-sm transition-all hover:shadow-md hover:${cfg.glowClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Habit Emoji */}
          <div className="text-3xl leading-none mt-0.5">{milestone.habitEmoji ?? "📌"}</div>

          {/* Milestone Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{milestone.habitName}</h3>
            <p className="text-sm text-muted-foreground capitalize">{milestone.habitDomain}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {format(new Date(milestone.achievedAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Milestone Badge */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="text-2xl">{cfg.icon}</div>
          <Badge className={`${cfg.badgeClass} whitespace-nowrap text-xs border-0`}>
            {cfg.label}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

interface CurrentStreakBannerProps {
  streak: number;
}

/**
 * CurrentStreakBanner shows the user's active streak with a motivational nudge.
 */
export function CurrentStreakBanner({ streak }: CurrentStreakBannerProps) {
  const nextMilestone = [7, 14, 30, 100].find((m) => m > streak) ?? 100;
  const daysLeft = nextMilestone - streak;

  const getMessage = () => {
    if (streak === 0) return "Start your first check-in today to begin your streak!";
    if (streak < 3)   return `${daysLeft} days to your first milestone. You're just getting started 🌱`;
    if (streak < 7)   return `${daysLeft} days to your 🔥 7-day badge. Keep showing up!`;
    if (streak < 14)  return `${daysLeft} days to your ⚡ 14-day badge. You're on fire!`;
    if (streak < 30)  return `${daysLeft} days to your 👑 30-day badge. Unstoppable!`;
    if (streak < 100) return `${daysLeft} days to the 💎 100-day diamond. Legendary territory!`;
    return "You've hit 100 days. You are the streak. 💎";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center gap-4 mb-6"
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/20 shrink-0">
        <Flame className="w-7 h-7 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-amber-400">{streak}</span>
          <span className="text-sm text-muted-foreground">day streak</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{getMessage()}</p>
      </div>
    </motion.div>
  );
}

interface MilestonesListProps {
  milestones: Milestone[];
  isLoading?: boolean;
  currentStreak?: number;
}

/**
 * MilestonesList displays all milestone achievements grouped by streak level,
 * with a current streak banner at the top.
 */
export function MilestonesList({ milestones, isLoading, currentStreak }: MilestonesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const grouped = {
    100: milestones.filter((m) => m.streakDays === 100),
    30:  milestones.filter((m) => m.streakDays === 30),
    14:  milestones.filter((m) => m.streakDays === 14),
    7:   milestones.filter((m) => m.streakDays === 7),
  };

  const sections: Array<{ key: 7 | 14 | 30 | 100; items: Milestone[] }> = [
    { key: 100, items: grouped[100] },
    { key: 30,  items: grouped[30] },
    { key: 14,  items: grouped[14] },
    { key: 7,   items: grouped[7] },
  ];

  const hasMilestones = milestones.length > 0;

  return (
    <div>
      {/* Current streak banner */}
      {currentStreak !== undefined && <CurrentStreakBanner streak={currentStreak} />}

      {!hasMilestones ? (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-muted-foreground text-sm">No milestones yet.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Keep building your streaks — your first badge is at 7 days!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map(({ key, items }) => {
            if (items.length === 0) return null;
            const cfg = getConfig(key);
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{cfg.icon}</span>
                  <h3 className="font-semibold text-foreground">{cfg.label}s</h3>
                  <span className="text-xs text-muted-foreground font-medium">({items.length})</span>
                </div>
                <div className="grid gap-3">
                  {items.map((m) => (
                    <MilestoneCard key={m.id} milestone={m} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
