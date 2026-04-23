import { and, asc, desc, eq, gte, inArray, like, lt, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import {
  InsertUser,
  calendarEvents,
  chatMessages,
  chatSessions,
  dailyCheckIns,
  growthMilestones,
  habitCompletions,
  habits,
  journalCategories,
  journalEntries,
  lifeDomainScores,
  notificationPreferences,
  pushSubscriptions,
  savedInsights,
  userProfiles,
  users,
  weeklyInsights,
  weeklyReflections,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const poolConnection = mysql.createPool(process.env.DATABASE_URL!);
      _db = drizzle(poolConnection);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function markOnboardingComplete(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ onboardingCompleted: true }).where(eq(users.id, userId));
}

export async function saveSeedIntent(userId: number, seedIntent: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ seedIntent }).where(eq(users.id, userId));
}

// ─── User Profiles ────────────────────────────────────────────────────────────

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function upsertUserProfile(userId: number, data: Partial<typeof userProfiles.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserProfile(userId);
  if (existing) {
    await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId));
  } else {
    // Insert new profile - inline JSON with sql.raw() to avoid prepared statement issues
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const coreValuesArr = data.coreValues ?? [];
    // Escape single quotes in JSON string and wrap for safe SQL inlining
    const escapedJson = JSON.stringify(coreValuesArr).replace(/'/g, "''");
    await db.execute(
      sql`INSERT INTO user_profiles (
        userId, coreValues, shortTermGoals, longTermVision, personalityNotes,
        beliefs, avatarEmoji, preferredName, createdAt, updatedAt
      ) VALUES (
        ${userId},
        ${sql.raw(`'${escapedJson}'`)},
        ${data.shortTermGoals ?? null},
        ${data.longTermVision ?? null},
        ${data.personalityNotes ?? null},
        ${data.beliefs ?? null},
        ${data.avatarEmoji ?? "🌟"},
        ${data.preferredName ?? null},
        ${now},
        ${now}
      )`
    );
  }
}

// ─── Life Domain Scores ───────────────────────────────────────────────────────

export async function getLatestDomainScores(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get the most recent score per domain
  const domains = ["mindset", "relationships", "work", "health", "spirituality", "finances"] as const;
  const results = await Promise.all(
    domains.map(async (domain) => {
      const rows = await db
        .select()
        .from(lifeDomainScores)
        .where(and(eq(lifeDomainScores.userId, userId), eq(lifeDomainScores.domain, domain)))
        .orderBy(desc(lifeDomainScores.recordedAt))
        .limit(1);
      return rows[0] ?? null;
    })
  );
  return results.filter(Boolean);
}

export async function getDomainScoreHistory(userId: number, domain: string, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(lifeDomainScores)
    .where(
      and(
        eq(lifeDomainScores.userId, userId),
        eq(lifeDomainScores.domain, domain as any),
        gte(lifeDomainScores.recordedAt, since)
      )
    )
    .orderBy(desc(lifeDomainScores.recordedAt));
}

export async function insertDomainScore(
  userId: number,
  domain: typeof lifeDomainScores.$inferInsert["domain"],
  score: number,
  notes?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(lifeDomainScores).values({ userId, domain, score, notes });
}

// ─── Habits ───────────────────────────────────────────────────────────────────

export async function getUserHabits(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(habits).where(and(eq(habits.userId, userId), eq(habits.isActive, true)));
}

export async function createHabit(data: typeof habits.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(habits).values(data);
}

export async function deleteHabit(habitId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(habits).set({ isActive: false }).where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
}

export async function getTodayCompletions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.userId, userId),
        gte(habitCompletions.completedAt, startOfDay),
        lte(habitCompletions.completedAt, endOfDay)
      )
    );
}

export async function toggleHabitCompletion(habitId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const existing = await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.habitId, habitId),
        eq(habitCompletions.userId, userId),
        gte(habitCompletions.completedAt, startOfDay),
        lte(habitCompletions.completedAt, endOfDay)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    await db.delete(habitCompletions).where(eq(habitCompletions.id, existing[0].id));
    return false;
  } else {
    await db.insert(habitCompletions).values({ habitId, userId });
    return true;
  }
}

export async function getHabitStreaks(userId: number) {
  const db = await getDb();
  if (!db) return {};
  const userHabits = await getUserHabits(userId);
  const streaks: Record<number, number> = {};
  for (const habit of userHabits) {
    // Count consecutive days with completions
    let streak = 0;
    let checkDate = new Date();
    for (let i = 0; i < 365; i++) {
      const start = new Date(checkDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(checkDate);
      end.setHours(23, 59, 59, 999);
      const completions = await db
        .select()
        .from(habitCompletions)
        .where(
          and(
            eq(habitCompletions.habitId, habit.id),
            gte(habitCompletions.completedAt, start),
            lte(habitCompletions.completedAt, end)
          )
        )
        .limit(1);
      if (completions.length > 0) {
        streak++;
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
    streaks[habit.id] = streak;
  }
  return streaks;
}

// ─── Daily Check-ins ──────────────────────────────────────────────────────────

export async function getTodayCheckIn(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const result = await db
    .select()
    .from(dailyCheckIns)
    .where(and(eq(dailyCheckIns.userId, userId), gte(dailyCheckIns.createdAt, startOfDay)))
    .orderBy(desc(dailyCheckIns.createdAt))
    .limit(1);
  return result[0] ?? null;
}

export async function createCheckIn(data: typeof dailyCheckIns.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(dailyCheckIns).values(data);
  return result;
}

export async function updateCheckInAiResponse(checkInId: number, aiResponse: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(dailyCheckIns).set({ aiResponse }).where(eq(dailyCheckIns.id, checkInId));
}

export async function getRecentCheckIns(userId: number, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(dailyCheckIns)
    .where(and(eq(dailyCheckIns.userId, userId), gte(dailyCheckIns.createdAt, since)))
    .orderBy(desc(dailyCheckIns.createdAt));
}

// ─── Journal Entries ──────────────────────────────────────────────────────────

export async function getJournalEntries(
  userId: number,
  limit = 50,
  filters?: {
    search?: string;
    categoryId?: number | null;
    dateFrom?: Date;
    dateTo?: Date;
    moodTag?: string;
  }
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(journalEntries.userId, userId)];
  if (filters?.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      sql`(${journalEntries.title} LIKE ${term} OR ${journalEntries.content} LIKE ${term})`
    );
  }
  if (filters?.categoryId !== undefined && filters.categoryId !== null) {
    conditions.push(eq(journalEntries.categoryId, filters.categoryId));
  }
  if (filters?.dateFrom) conditions.push(gte(journalEntries.createdAt, filters.dateFrom));
  if (filters?.dateTo) conditions.push(lte(journalEntries.createdAt, filters.dateTo));
  if (filters?.moodTag) conditions.push(eq(journalEntries.moodTag, filters.moodTag));
  return db
    .select()
    .from(journalEntries)
    .where(and(...conditions))
    .orderBy(desc(journalEntries.createdAt))
    .limit(limit);
}

export async function getJournalEntry(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .limit(1);
  return result[0];
}

export async function createJournalEntry(data: typeof journalEntries.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(journalEntries).values(data);
  return result;
}

export async function updateJournalEntryAi(
  id: number,
  userId: number,
  aiPerspective: string,
  themes: string[]
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(journalEntries)
    .set({ aiPerspective, themes })
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));
}

// ─── Journal Categories ─────────────────────────────────────────────────────────

export async function getJournalCategories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(journalCategories)
    .where(eq(journalCategories.userId, userId))
    .orderBy(journalCategories.name);
}

export async function createJournalCategory(
  userId: number,
  name: string,
  color: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(journalCategories).values({ userId, name, color });
}

export async function deleteJournalCategory(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  // Remove category from entries first
  await db
    .update(journalEntries)
    .set({ categoryId: null })
    .where(and(eq(journalEntries.categoryId, id), eq(journalEntries.userId, userId)));
  await db
    .delete(journalCategories)
    .where(and(eq(journalCategories.id, id), eq(journalCategories.userId, userId)));
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

/**
 * Get the current session ID for a user.
 * Returns the sessionId of the most recent message, or null if no messages exist.
 * NULL sessionId = legacy messages (shown in the first/default session).
 */
export async function getCurrentSessionId(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ sessionId: chatMessages.sessionId })
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(1);
  if (result.length === 0) return null;
  return result[0].sessionId ?? null;
}

/**
 * Get chat history for a specific session.
 * If sessionId is null, returns messages where sessionId IS NULL (legacy messages).
 */
export async function getChatHistory(userId: number, sessionId?: string | null, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const { isNull } = await import("drizzle-orm");
  const condition = sessionId != null
    ? and(eq(chatMessages.userId, userId), eq(chatMessages.sessionId, sessionId))
    : and(eq(chatMessages.userId, userId), isNull(chatMessages.sessionId));
  const rows = await db
    .select()
    .from(chatMessages)
    .where(condition)
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export async function saveChatMessage(data: typeof chatMessages.$inferInsert): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [result] = await db.insert(chatMessages).values(data);
  return (result as any).insertId as number;
}

// ─── Weekly Insights ──────────────────────────────────────────────────────────

export async function getLatestInsight(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(weeklyInsights)
    .where(eq(weeklyInsights.userId, userId))
    .orderBy(desc(weeklyInsights.createdAt))
    .limit(1);
  return result[0];
}

export async function getAllInsights(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(weeklyInsights)
    .where(eq(weeklyInsights.userId, userId))
    .orderBy(desc(weeklyInsights.createdAt))
    .limit(20);
}

export async function saveWeeklyInsight(data: typeof weeklyInsights.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(weeklyInsights).values(data);
}

// ─── Growth Milestones ────────────────────────────────────────────────────────

export async function getMilestones(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(growthMilestones)
    .where(eq(growthMilestones.userId, userId))
    .orderBy(desc(growthMilestones.achievedAt));
}

export async function createMilestone(data: typeof growthMilestones.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(growthMilestones).values(data);
}

// ─── Push Subscriptions ──────────────────────────────────────────────────────

export async function upsertPushSubscription(
  userId: number,
  endpoint: string,
  p256dh: string,
  auth: string,
  timezone: string
) {
  const db = await getDb();
  if (!db) return;
  // Deactivate any existing subscriptions for this user first
  await db
    .update(pushSubscriptions)
    .set({ isActive: false })
    .where(eq(pushSubscriptions.userId, userId));
  // Insert new active subscription
  await db.insert(pushSubscriptions).values({
    userId,
    endpoint,
    p256dh,
    auth,
    timezone,
    isActive: true,
  });
}

export async function deactivatePushSubscription(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(pushSubscriptions)
    .set({ isActive: false })
    .where(eq(pushSubscriptions.userId, userId));
}

export async function getActivePushSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)))
    .limit(1);
  return result[0];
}

/** Returns all active subscriptions across all users — used by the daily scheduler */
export async function getAllActivePushSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.isActive, true));
}

// ─── Notification Preferences ─────────────────────────────────────────────────

export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return result[0];
}

export async function upsertNotificationPreferences(
  userId: number,
  prefs: { dailyReminderEnabled?: boolean; reminderHour?: number; timezone?: string }
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getNotificationPreferences(userId);
  if (existing) {
    await db
      .update(notificationPreferences)
      .set({ ...prefs })
      .where(eq(notificationPreferences.userId, userId));
  } else {
    await db.insert(notificationPreferences).values({ userId, ...prefs });
  }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getMoodTrend(userId: number, days = 14) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      date: sql<string>`DATE(${dailyCheckIns.createdAt})`,
      avgMood: sql<number>`AVG(${dailyCheckIns.mood})`,
      avgEnergy: sql<number>`AVG(${dailyCheckIns.energy})`,
      avgStress: sql<number>`AVG(${dailyCheckIns.stress})`,
    })
    .from(dailyCheckIns)
    .where(and(eq(dailyCheckIns.userId, userId), gte(dailyCheckIns.createdAt, since)))
    .groupBy(sql`DATE(${dailyCheckIns.createdAt})`)
    .orderBy(sql`DATE(${dailyCheckIns.createdAt})`);
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export async function getCalendarEvents(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  // Fetch events that either start in this month OR are recurring and started before month end
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, userId),
        // Include: starts in month, OR recurring (started before month end)
        sql`(
          (${calendarEvents.eventDate} >= ${monthStart} AND ${calendarEvents.eventDate} < ${monthEnd})
          OR (
            ${calendarEvents.recurrence} != 'none'
            AND ${calendarEvents.eventDate} < ${monthEnd}
            AND (${calendarEvents.recurrenceEnd} IS NULL OR ${calendarEvents.recurrenceEnd} >= ${monthStart})
          )
        )`
      )
    )
    .orderBy(calendarEvents.eventDate);

  // Expand recurring events into instances that fall within this month
  const expanded: typeof rows = [];
  for (const event of rows) {
    if (event.recurrence === "none") {
      expanded.push(event);
      continue;
    }
    // Generate occurrences within the month
    const origin = new Date(event.eventDate);
    const recEnd = event.recurrenceEnd ? new Date(event.recurrenceEnd) : null;
    let cursor = new Date(origin);
    // Fast-forward cursor to first occurrence >= monthStart
    while (cursor < monthStart) {
      if (event.recurrence === "weekly") cursor = new Date(cursor.getTime() + 7 * 86400000);
      else { cursor = new Date(cursor); cursor.setUTCMonth(cursor.getUTCMonth() + 1); }
    }
    while (cursor < monthEnd) {
      if (recEnd && cursor > recEnd) break;
      expanded.push({ ...event, eventDate: new Date(cursor) });
      if (event.recurrence === "weekly") cursor = new Date(cursor.getTime() + 7 * 86400000);
      else { cursor = new Date(cursor); cursor.setUTCMonth(cursor.getUTCMonth() + 1); }
    }
  }
  return expanded.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

export async function createCalendarEvent(data: {
  userId: number;
  title: string;
  type: "therapy" | "goal" | "habit" | "reminder" | "other";
  eventDate: Date;
  endDate?: Date;
  notes?: string;
  color?: string;
  isAllDay?: boolean;
  recurrence?: "none" | "weekly" | "monthly";
  recurrenceEnd?: Date;
}) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.insert(calendarEvents).values({
    userId: data.userId,
    title: data.title,
    type: data.type,
    eventDate: data.eventDate,
    endDate: data.endDate ?? null,
    notes: data.notes ?? null,
    color: data.color ?? "#8b5cf6",
    isAllDay: data.isAllDay ?? false,
    recurrence: data.recurrence ?? "none",
    recurrenceEnd: data.recurrenceEnd ?? null,
  });
  return (result as any).insertId as number;
}

export async function updateCalendarEvent(
  userId: number,
  id: number,
  data: {
    title?: string;
    type?: "therapy" | "goal" | "habit" | "reminder" | "other";
    eventDate?: Date;
    endDate?: Date;
    notes?: string;
    color?: string;
    isAllDay?: boolean;
    recurrence?: "none" | "weekly" | "monthly";
    recurrenceEnd?: Date;
  }
) {
  const db = await getDb();
  if (!db) return;
  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.type !== undefined) update.type = data.type;
  if (data.eventDate !== undefined) update.eventDate = data.eventDate;
  if (data.endDate !== undefined) update.endDate = data.endDate;
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.color !== undefined) update.color = data.color;
  if (data.isAllDay !== undefined) update.isAllDay = data.isAllDay;
  if (data.recurrence !== undefined) update.recurrence = data.recurrence;
  if (data.recurrenceEnd !== undefined) update.recurrenceEnd = data.recurrenceEnd;
  if (Object.keys(update).length === 0) return;
  await db
    .update(calendarEvents)
    .set(update)
    .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
}

export async function deleteCalendarEvent(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(calendarEvents)
    .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
}

// ─── Full Onboarding ──────────────────────────────────────────────────────

export async function saveFullOnboarding(
  userId: number,
  data: {
    coreValues: string[];
    shortTermGoals: string;
    longTermVision: string;
    personalityNotes: string;
    beliefs: string;
    preferredName: string;
  }
) {
  const db = await getDb();
  if (!db) return;

  // Save to user_profiles
  await upsertUserProfile(userId, {
    coreValues: data.coreValues,
    shortTermGoals: data.shortTermGoals,
    longTermVision: data.longTermVision,
    personalityNotes: data.personalityNotes,
    beliefs: data.beliefs,
    preferredName: data.preferredName,
  });

  // Mark onboarding as completed in users table
  await db.update(users).set({ onboardingCompleted: true }).where(eq(users.id, userId));
}

// ─── Saved Insights ────────────────────────────────────────────────────────────────────────────────

export async function saveInsight(
  userId: number,
  data: { chatMessageId?: number; content: string; reactionType: "heart" | "star"; note?: string }
) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(savedInsights).values({
    userId,
    chatMessageId: data.chatMessageId ?? null,
    content: data.content,
    reactionType: data.reactionType,
    note: data.note ?? null,
  });
  return result;
}

export async function listInsights(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(savedInsights)
    .where(eq(savedInsights.userId, userId))
    .orderBy(savedInsights.savedAt);
}

export async function deleteInsight(userId: number, insightId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(savedInsights)
    .where(and(eq(savedInsights.id, insightId), eq(savedInsights.userId, userId)));
}

// ─── Chat Sessions ────────────────────────────────────────────────────────────

/**
 * Returns a list of distinct chat sessions for a user, ordered by most recent first.
 * Each entry includes the sessionId (null = legacy), the first message timestamp,
 * the last message timestamp, and the total message count.
 */
export async function getChatSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { isNull: _isNull, count, min, max } = await import("drizzle-orm");

  const rows = await db
    .select({
      sessionId: chatMessages.sessionId,
      firstMessage: min(chatMessages.createdAt),
      lastMessage: max(chatMessages.createdAt),
      messageCount: count(chatMessages.id),
    })
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .groupBy(chatMessages.sessionId)
    .orderBy(desc(max(chatMessages.createdAt)));

  return rows.map((r) => ({
    sessionId: r.sessionId ?? null,
    firstMessage: r.firstMessage ? new Date(r.firstMessage) : null,
    lastMessage: r.lastMessage ? new Date(r.lastMessage) : null,
    messageCount: Number(r.messageCount),
  }));
}

// ─── Chat Session Titles ──────────────────────────────────────────────────────

/** Get the title for a specific session (null if not set or session not found) */
export async function getChatSessionTitle(userId: number, sessionId: string | null): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ title: chatSessions.title })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.userId, userId),
        sessionId === null ? sql`${chatSessions.sessionId} IS NULL` : eq(chatSessions.sessionId, sessionId)
      )
    )
    .limit(1);
  return rows[0]?.title ?? null;
}

/** Get all session titles for a user as a map of sessionId → title */
export async function getChatSessionTitles(userId: number): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db
    .select({ sessionId: chatSessions.sessionId, title: chatSessions.title })
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId));
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (row.title) {
      map[row.sessionId ?? "__legacy__"] = row.title;
    }
  }
  return map;
}

/** Upsert a title for a session (insert if no row exists, update if it does) */
export async function updateSessionTitle(userId: number, sessionId: string | null, title: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Check if a row exists for this session
  const existing = await db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.userId, userId),
        sessionId === null ? sql`${chatSessions.sessionId} IS NULL` : eq(chatSessions.sessionId, sessionId)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(chatSessions)
      .set({ title: title.trim() || null })
      .where(eq(chatSessions.id, existing[0].id));
  } else {
    await db.insert(chatSessions).values({ userId, sessionId, title: title.trim() || null });
  }
}

// ─── Session Title Generation ─────────────────────────────────────────────────
/** Fetch up to 20 messages of a session for use in AI title generation */
export async function getSessionMessagesForTitle(
  userId: number,
  sessionId: string | null
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        sessionId === null
          ? sql`${chatMessages.sessionId} IS NULL`
          : eq(chatMessages.sessionId, sessionId)
      )
    )
    .orderBy(chatMessages.createdAt)
    .limit(20);
  return rows as Array<{ role: "user" | "assistant"; content: string }>;
}

/** Returns true if a session already has a non-empty title */
export async function sessionHasTitle(userId: number, sessionId: string | null): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ title: chatSessions.title })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.userId, userId),
        sessionId === null
          ? sql`${chatSessions.sessionId} IS NULL`
          : eq(chatSessions.sessionId, sessionId)
      )
    )
    .limit(1);
  return rows.length > 0 && rows[0].title !== null && rows[0].title !== "";
}

// ─── Weekly Reflections ───────────────────────────────────────────────────────
/** Get the Monday ISO date string for a given date */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

/** Fetch all chat sessions from the past 7 days for a user */
export async function getWeekSessionsForDigest(userId: number, weekStart: string): Promise<
  Array<{ sessionId: string | null; title: string | null; messageCount: number; content: string }>
> {
  const db = await getDb();
  if (!db) return [];

  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get sessions for the week
  const { isNull: _isNull, count, min, max } = await import("drizzle-orm");
  const sessionRows = await db
    .select({
      sessionId: chatMessages.sessionId,
      messageCount: count(chatMessages.id),
      firstMessage: min(chatMessages.createdAt),
      lastMessage: max(chatMessages.createdAt),
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        gte(chatMessages.createdAt, weekStartDate),
        lt(chatMessages.createdAt, weekEndDate)
      )
    )
    .groupBy(chatMessages.sessionId)
    .orderBy(desc(max(chatMessages.createdAt)));

  // Fetch titles for these sessions
  const sessionIds = sessionRows.map((r) => r.sessionId).filter((id) => id !== null) as string[];
  const titleMap: Record<string, string | null> = {};
  if (sessionIds.length > 0) {
    const titleRows = await db
      .select({ sessionId: chatSessions.sessionId, title: chatSessions.title })
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.userId, userId),
          inArray(chatSessions.sessionId, sessionIds)
        )
      );
    titleRows.forEach((row) => {
      if (row.sessionId) titleMap[row.sessionId] = row.title || null;
    });
  }

  // Fetch message content for each session (up to 10 user messages per session)
  const result = await Promise.all(
    sessionRows.map(async (row) => {
      const msgs = await db
        .select({ role: chatMessages.role, content: chatMessages.content })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, userId),
            row.sessionId === null
              ? sql`${chatMessages.sessionId} IS NULL`
              : eq(chatMessages.sessionId, row.sessionId)
          )
        )
        .orderBy(chatMessages.createdAt)
        .limit(10);
      const content = msgs.map((m) => `${m.role}: ${m.content}`).join("\n");
      const sessionIdKey = row.sessionId || "";
      return {
        sessionId: row.sessionId ?? null,
        title: (row.sessionId && titleMap[row.sessionId]) || null,
        messageCount: Number(row.messageCount),
        content,
      };
    })
  );

  return result;
}

/** Save a weekly reflection digest to the database */
export async function saveWeeklyReflection(
  userId: number,
  weekStart: string,
  summary: string,
  sessionCount: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(weeklyReflections).values({
    userId,
    weekStart,
    summary,
    sessionCount,
  });
}

/** Get the latest weekly reflection for a user */
export async function getLatestWeeklyReflection(userId: number): Promise<{
  weekStart: string;
  summary: string;
  sessionCount: number;
  createdAt: Date;
} | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(weeklyReflections)
    .where(eq(weeklyReflections.userId, userId))
    .orderBy(desc(weeklyReflections.createdAt))
    .limit(1);
  return rows[0] || null;
}

/** Check if a digest already exists for a given week */
export async function weeklyReflectionExists(userId: number, weekStart: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: weeklyReflections.id })
    .from(weeklyReflections)
    .where(and(eq(weeklyReflections.userId, userId), eq(weeklyReflections.weekStart, weekStart)))
    .limit(1);
  return rows.length > 0;
}

/** Get all users in the system (for scheduled jobs) */
export async function getAllUsers(): Promise<Array<{ id: number; name: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name }).from(users);
}


/** Get the user's last session ID */
export async function getLastSessionId(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ lastSessionId: users.lastSessionId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.lastSessionId || null;
}

/** Update the user's last session ID */
export async function updateLastSessionId(userId: number, sessionId: string | null): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSessionId: sessionId }).where(eq(users.id, userId));
}

// ─── Calendar Events ──────────────────────────────────────────────────────
/** Get the next 3 upcoming events for a user (starting from now) */
export async function getUpcomingEvents(
  userId: number,
  limit: number = 3
): Promise<Array<{ id: number; title: string; eventDate: Date; type: string }>> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();

  const rows = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      eventDate: calendarEvents.eventDate,
      type: calendarEvents.type,
    })
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.eventDate, now)
      )
    )
    .orderBy(asc(calendarEvents.eventDate))
    .limit(limit);

  return rows;
}
