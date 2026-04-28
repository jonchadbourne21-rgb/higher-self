import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Milestone {
  id: number;
  habitId: number;
  habitName: string;
  habitEmoji: string;
  habitDomain: string;
  streakDays: number;
  achievedAt: Date;
}

interface MilestoneCardProps {
  milestone: Milestone;
}

/**
 * MilestoneCard displays a single achievement badge for a streak milestone
 * Shows habit name, emoji, streak level, and achievement date
 */
export function MilestoneCard({ milestone }: MilestoneCardProps) {
  const getMilestoneColor = (streakDays: number) => {
    switch (streakDays) {
      case 7:
        return "bg-blue-50 border-blue-200";
      case 14:
        return "bg-purple-50 border-purple-200";
      case 30:
        return "bg-amber-50 border-amber-200";
      case 100:
        return "bg-rose-50 border-rose-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getMilestoneIcon = (streakDays: number) => {
    switch (streakDays) {
      case 7:
        return "🔥"; // 7-day streak
      case 14:
        return "⚡"; // 14-day streak
      case 30:
        return "👑"; // 30-day streak
      case 100:
        return "💎"; // 100-day streak
      default:
        return "⭐";
    }
  };

  const getMilestoneBadgeColor = (streakDays: number) => {
    switch (streakDays) {
      case 7:
        return "bg-blue-100 text-blue-800";
      case 14:
        return "bg-purple-100 text-purple-800";
      case 30:
        return "bg-amber-100 text-amber-800";
      case 100:
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMilestoneLabel = (streakDays: number) => {
    switch (streakDays) {
      case 7:
        return "7-Day Streak";
      case 14:
        return "14-Day Streak";
      case 30:
        return "30-Day Streak";
      case 100:
        return "100-Day Streak";
      default:
        return `${streakDays}-Day Streak`;
    }
  };

  return (
    <Card className={`p-4 ${getMilestoneColor(milestone.streakDays)} border-2 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Habit Emoji */}
          <div className="text-3xl">{milestone.habitEmoji}</div>

          {/* Milestone Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{milestone.habitName}</h3>
            <p className="text-sm text-gray-600 capitalize">{milestone.habitDomain}</p>
            <p className="text-xs text-gray-500 mt-1">{format(new Date(milestone.achievedAt), "MMM d, yyyy")}</p>
          </div>
        </div>

        {/* Milestone Badge */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-2xl">{getMilestoneIcon(milestone.streakDays)}</div>
          <Badge className={`${getMilestoneBadgeColor(milestone.streakDays)} whitespace-nowrap text-xs`}>
            {getMilestoneLabel(milestone.streakDays)}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

interface MilestonesListProps {
  milestones: Milestone[];
  isLoading?: boolean;
}

/**
 * MilestonesList displays all milestone achievements grouped by level
 */
export function MilestonesList({ milestones, isLoading }: MilestonesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">No milestones yet. Keep building your streaks! 🚀</p>
      </div>
    );
  }

  // Group milestones by streak level
  const grouped = {
    100: milestones.filter((m) => m.streakDays === 100),
    30: milestones.filter((m) => m.streakDays === 30),
    14: milestones.filter((m) => m.streakDays === 14),
    7: milestones.filter((m) => m.streakDays === 7),
  };

  return (
    <div className="space-y-8">
      {/* 100-Day Streaks */}
      {grouped[100].length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💎</span>
            <h3 className="font-bold text-lg text-rose-700">100-Day Streaks</h3>
            <span className="text-sm text-rose-600 font-semibold">({grouped[100].length})</span>
          </div>
          <div className="grid gap-3">
            {grouped[100].map((m) => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>
        </div>
      )}

      {/* 30-Day Streaks */}
      {grouped[30].length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">👑</span>
            <h3 className="font-bold text-lg text-amber-700">30-Day Streaks</h3>
            <span className="text-sm text-amber-600 font-semibold">({grouped[30].length})</span>
          </div>
          <div className="grid gap-3">
            {grouped[30].map((m) => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>
        </div>
      )}

      {/* 14-Day Streaks */}
      {grouped[14].length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">⚡</span>
            <h3 className="font-bold text-lg text-purple-700">14-Day Streaks</h3>
            <span className="text-sm text-purple-600 font-semibold">({grouped[14].length})</span>
          </div>
          <div className="grid gap-3">
            {grouped[14].map((m) => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>
        </div>
      )}

      {/* 7-Day Streaks */}
      {grouped[7].length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔥</span>
            <h3 className="font-bold text-lg text-blue-700">7-Day Streaks</h3>
            <span className="text-sm text-blue-600 font-semibold">({grouped[7].length})</span>
          </div>
          <div className="grid gap-3">
            {grouped[7].map((m) => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
