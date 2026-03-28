import { and, desc, eq, gte, like, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import {
  InsertUser,
  calendarEvents,
  chatMessages,
  dailyCheckIns,
  growthMilestones,
  habitCompletions,
  habits,
  journalCategories,
  journalEntries,
  lifeDomainScores,
  notificationPreferences,
  pushSubscriptions,
  userProfiles,
  users,
  weeklyInsights,
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
  if (!db) return undefined;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const result = await db
    .select()
    .from(dailyCheckIns)
    .where(and(eq(dailyCheckIns.userId, userId), gte(dailyCheckIns.createdAt, startOfDay)))
    .orderBy(desc(dailyCheckIns.createdAt))
    .limit(1);
  return result[0];
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

export async function getChatHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

export async function saveChatMessage(data: typeof chatMessages.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMessages).values(data);
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
  // Start/end of the requested month (UTC)
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.eventDate, start),
        lte(calendarEvents.eventDate, end)
      )
    )
    .orderBy(calendarEvents.eventDate);
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
