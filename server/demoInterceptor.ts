/**
 * Demo Interceptor — provides pre-built responses for demo mode queries.
 * 
 * When ctx.isDemo is true, routers call these functions instead of hitting the DB.
 * This keeps demo logic centralized and easy to maintain/remove.
 * 
 * IMPORTANT: Return shapes must match what the real DB helpers return.
 */
import {
  demoProfile,
  demoCheckIns,
  demoDomainScores,
  demoJournalEntries,
  demoHabits,
  demoInsight,
  demoCalendarEvents,
  demoChatMessages,
  demoMilestones,
  DEMO_USER_ID,
} from "./demoData";

// ─── Profile ────────────────────────────────────────────────────────────────

export function getDemoProfile() {
  return demoProfile;
}

// ─── Check-ins ──────────────────────────────────────────────────────────────

export function getDemoTodayCheckIn() {
  return demoCheckIns[0]; // Most recent
}

export function getDemoRecentCheckIns(days: number) {
  return demoCheckIns.slice(0, Math.min(days, demoCheckIns.length));
}

export function getDemoAuraHistory() {
  return demoCheckIns
    .slice(0, 7)
    .reverse()
    .map((c) => ({
      date: c.createdAt,
      aura: Math.round(c.mood * 0.4 + c.energy * 0.3 + (11 - c.stress) * 0.3),
    }));
}

export function getDemoDailyPrompt() {
  return {
    prompt: "What's one thing you're learning about yourself this week that surprised you?",
    theme: "growth",
  };
}

// ─── Habits ─────────────────────────────────────────────────────────────────

export function getDemoHabits() {
  return demoHabits.map((h, i) => ({
    ...h,
    completedToday: i < 3, // First 3 completed today for demo
    streak: [12, 8, 5, 3, 14][i] ?? 0,
  }));
}

export function getDemoCurrentStreak() {
  return { streak: 7 };
}

export function getDemoMilestones() {
  return demoMilestones;
}

export function getDemoMilestonesByLevel() {
  return {
    bronze: demoMilestones.filter((m) => m.level === "bronze"),
    silver: demoMilestones.filter((m) => m.level === "silver"),
    gold: demoMilestones.filter((m) => m.level === "gold"),
  };
}

export function getDemoMilestoneCount() {
  return { count: demoMilestones.length };
}

// ─── Domains ────────────────────────────────────────────────────────────────

export function getDemoDomainScores() {
  return demoDomainScores;
}

export function getDemoDomainHistory(_domain: string, _days: number) {
  // Generate a simple trend for the demo
  const scores = [];
  for (let i = 6; i >= 0; i--) {
    scores.push({
      score: 5 + Math.round(Math.random() * 3),
      createdAt: new Date(Date.now() - i * 86400000),
    });
  }
  return scores;
}

// ─── Journal ────────────────────────────────────────────────────────────────

export function getDemoJournalEntries() {
  return demoJournalEntries;
}

export function getDemoJournalEntry(id: number) {
  return demoJournalEntries.find((e) => e.id === id) ?? null;
}

export function getDemoJournalCategories() {
  return [];
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export function getDemoChatHistory(_sessionId?: string | null) {
  return demoChatMessages;
}

export function getDemoChatSessions() {
  return [
    {
      sessionId: "demo-session-1",
      title: "Feeling Stuck",
      messageCount: 4,
      lastMessageAt: new Date(Date.now() - 2 * 86400000),
      firstMessage: new Date(Date.now() - 2 * 86400000),
      lastMessage: new Date(Date.now() - 2 * 86400000),
      createdAt: new Date(Date.now() - 2 * 86400000),
    },
  ];
}

export function getDemoChatSessionTitles(): Record<string, string> {
  return { "demo-session-1": "Feeling Stuck" };
}

// ─── Insights ───────────────────────────────────────────────────────────────

export function getDemoLatestInsight() {
  return demoInsight;
}

export function getDemoAllInsights() {
  return [demoInsight];
}

export function getDemoInsightPatterns() {
  return [
    {
      theme: "Morning routine impact",
      entryCount: 4,
      avgSimilarity: 0.78,
      recentEntries: [
        { content: "Woke up with a clear mind for the first time in weeks...", sourceType: "journal", createdAt: new Date(Date.now() - 3 * 86400000) },
        { content: "Meditation breakthrough — finding stillness", sourceType: "checkin", createdAt: new Date(Date.now() - 6 * 86400000) },
      ],
    },
    {
      theme: "Growth through discomfort",
      entryCount: 3,
      avgSimilarity: 0.72,
      recentEntries: [
        { content: "Had the conversation I'd been avoiding for two weeks...", sourceType: "journal", createdAt: new Date(Date.now() - 5 * 86400000) },
        { content: "I chose growth over comfort, and it opened something up", sourceType: "voice", createdAt: new Date(Date.now() - 4 * 86400000) },
      ],
    },
  ];
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export function getDemoDashboardOverview() {
  return {
    domainScores: demoDomainScores,
    moodTrend: demoCheckIns.map((c) => ({ date: c.createdAt.toISOString().slice(0, 10), avgMood: c.mood, avgEnergy: c.energy, avgStress: c.stress })),
    recentCheckIns: demoCheckIns.slice(0, 7),
    latestInsight: demoInsight,
    milestones: demoMilestones,
    habitCount: demoHabits.length,
    avgGrowthScore: 65,
    isPro: false,
  };
}

export function getDemoMoodTrend(_days: number) {
  return demoCheckIns.map((c, i) => ({
    date: c.createdAt.toISOString().slice(0, 10),
    avgMood: c.mood,
    avgEnergy: c.energy,
    avgStress: c.stress,
  }));
}

// ─── Calendar ───────────────────────────────────────────────────────────────

export function getDemoCalendarEvents(_year: number, _month: number) {
  // Return events mapped to the calendar schema fields
  return demoCalendarEvents.map((e) => ({
    id: e.id,
    userId: e.userId,
    title: e.title,
    type: "other" as const,
    eventDate: e.startTime,
    endDate: e.endTime,
    notes: e.description,
    color: e.color,
    isAllDay: e.allDay,
    recurrence: e.recurring ? ("weekly" as const) : ("none" as const),
    recurrenceEnd: null,
    createdAt: e.createdAt,
    updatedAt: e.createdAt,
  }));
}

export function getDemoUpcomingEvents() {
  return demoCalendarEvents.map((e) => ({
    id: e.id,
    userId: e.userId,
    title: e.title,
    type: "other" as const,
    eventDate: e.startTime,
    endDate: e.endTime,
    notes: e.description,
    color: e.color,
    isAllDay: e.allDay,
    recurrence: e.recurring ? ("weekly" as const) : ("none" as const),
    recurrenceEnd: null,
    createdAt: e.createdAt,
    updatedAt: e.createdAt,
  }));
}

// ─── Home ───────────────────────────────────────────────────────────────────

export function getDemoTileEngagement() {
  return {
    mirror: 12,
    journal: 8,
    habits: 21,
    programs: 4,
    rewards: 2,
    calendar: 3,
  };
}

export function getDemoDailyQuote() {
  return {
    quote: "The anticipation of discomfort is always worse than the discomfort itself.",
    date: new Date(Date.now() - 5 * 86400000),
  };
}

export function getDemoLatestDigest() {
  return {
    ...demoInsight,
    summary: demoInsight.insightText,
    sessionCount: 3,
    isCurrentWeek: true,
  };
}

// ─── Rewards ────────────────────────────────────────────────────────────────

export function getDemoProStatus() {
  return {
    isPro: false,
    activeGrant: null,
    pendingGrants: [],
    pendingCount: 0,
    expiresAt: null,
  };
}

// ─── Programs ───────────────────────────────────────────────────────────────

export function getDemoMyEnrollments() {
  return []; // No enrollments in demo — user sees the program catalog
}

// ─── Weekly Insight ─────────────────────────────────────────────────────────

export function getDemoWeeklyInsightWithDaily() {
  return {
    daily: demoCheckIns[0],
    weekly: demoInsight,
  };
}

// ─── Saved Insights ─────────────────────────────────────────────────────────

export function getDemoSavedInsights() {
  return [];
}
