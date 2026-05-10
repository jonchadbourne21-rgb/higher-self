import { eq, and } from "drizzle-orm";
import { chatUsageDaily, journalUsageWeekly } from "../../drizzle/schema";
import { getDb } from "../db";

/**
 * Get today's date as a string (YYYY-MM-DD)
 */
function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

/**
 * Get the start date of the current week (Monday)
 */
function getWeekStartDate(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const weekStart = new Date(today.setDate(diff));
  return weekStart.toISOString().split("T")[0];
}

/**
 * Get today's chat count for a user
 */
export async function getTodaysChatCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const today = getTodayDate();
  const result = await db
    .select()
    .from(chatUsageDaily)
    .where(
      and(
        eq(chatUsageDaily.userId, userId),
        eq(chatUsageDaily.usageDate, today as any)
      )
    )
    .limit(1);

  return result[0]?.chatCount || 0;
}

/**
 * Increment today's chat count for a user
 */
export async function incrementChatUsage(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const today = getTodayDate();
  const currentCount = await getTodaysChatCount(userId);

  if (currentCount === 0) {
    // Create new record
    await db.insert(chatUsageDaily).values({
      userId,
      usageDate: today as any,
      chatCount: 1,
    });
    return 1;
  } else {
    // Update existing record
    await db
      .update(chatUsageDaily)
      .set({
        chatCount: currentCount + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chatUsageDaily.userId, userId),
          eq(chatUsageDaily.usageDate, today as any)
        )
      );
    return currentCount + 1;
  }
}

/**
 * Check if user has reached daily chat limit (5 for free users)
 */
export async function hasReachedDailyChatLimit(userId: number): Promise<boolean> {
  const count = await getTodaysChatCount(userId);
  return count >= 5;
}

/**
 * Get this week's journal count for a user
 */
export async function getWeeksJournalCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const weekStart = getWeekStartDate();
  const result = await db
    .select()
    .from(journalUsageWeekly)
    .where(
      and(
        eq(journalUsageWeekly.userId, userId),
        eq(journalUsageWeekly.weekStartDate, weekStart as any)
      )
    )
    .limit(1);

  return result[0]?.journalCount || 0;
}

/**
 * Increment this week's journal count for a user
 */
export async function incrementJournalUsage(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const weekStart = getWeekStartDate();
  const currentCount = await getWeeksJournalCount(userId);

  if (currentCount === 0) {
    // Create new record
    await db.insert(journalUsageWeekly).values({
      userId,
      weekStartDate: weekStart as any,
      journalCount: 1,
    });
    return 1;
  } else {
    // Update existing record
    await db
      .update(journalUsageWeekly)
      .set({
        journalCount: currentCount + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(journalUsageWeekly.userId, userId),
          eq(journalUsageWeekly.weekStartDate, weekStart as any)
        )
      );
    return currentCount + 1;
  }
}

/**
 * Check if user has reached weekly journal limit (4 for free users)
 */
export async function hasReachedWeeklyJournalLimit(userId: number): Promise<boolean> {
  const count = await getWeeksJournalCount(userId);
  return count >= 4;
}

/**
 * Reset daily chat usage (for testing or admin purposes)
 */
export async function resetDailyChatUsage(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const today = getTodayDate();
  await db
    .delete(chatUsageDaily)
    .where(
      and(
        eq(chatUsageDaily.userId, userId),
        eq(chatUsageDaily.usageDate, today as any)
      )
    );
}

/**
 * Reset weekly journal usage (for testing or admin purposes)
 */
export async function resetWeeklyJournalUsage(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const weekStart = getWeekStartDate();
  await db
    .delete(journalUsageWeekly)
    .where(
      and(
        eq(journalUsageWeekly.userId, userId),
        eq(journalUsageWeekly.weekStartDate, weekStart as any)
      )
    );
}
