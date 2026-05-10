import { eq, and } from "drizzle-orm";
import { streaks } from "../../drizzle/schema";
import { getDb } from "../db";

type StreakType = "habit" | "journal" | "chat";

/**
 * Get or create a streak record for a user and type
 */
export async function getOrCreateStreak(userId: number, streakType: StreakType) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  let streak = await db
    .select()
    .from(streaks)
    .where(and(eq(streaks.userId, userId), eq(streaks.streakType, streakType)))
    .limit(1);

  if (streak.length === 0) {
    await db.insert(streaks).values({
      userId,
      streakType,
      currentStreak: 0,
      longestStreak: 0,
    });

    streak = await db
      .select()
      .from(streaks)
      .where(and(eq(streaks.userId, userId), eq(streaks.streakType, streakType)))
      .limit(1);
  }

  return streak[0];
}

/**
 * Get all streaks for a user
 */
export async function getUserStreaks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  return await db.select().from(streaks).where(eq(streaks.userId, userId));
}

/**
 * Update streak - increment or reset based on last activity date
 */
export async function updateStreak(userId: number, streakType: StreakType) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const streak = await getOrCreateStreak(userId, streakType);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let lastActivityDate = streak.lastActivityDate
    ? new Date(streak.lastActivityDate)
    : null;
  if (lastActivityDate) {
    lastActivityDate.setHours(0, 0, 0, 0);
  }

  let newCurrentStreak = streak.currentStreak;

  // If last activity was today, don't increment
  if (lastActivityDate && lastActivityDate.getTime() === today.getTime()) {
    return streak; // Already counted today
  }

  // If last activity was yesterday, increment streak
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastActivityDate && lastActivityDate.getTime() === yesterday.getTime()) {
    newCurrentStreak = streak.currentStreak + 1;
  } else {
    // Streak broken or first time
    newCurrentStreak = 1;
  }

  // Update longest streak if needed
  const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);

  await db
    .update(streaks)
    .set({
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastActivityDate: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(streaks.userId, userId), eq(streaks.streakType, streakType)));

  return {
    ...streak,
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    lastActivityDate: new Date(),
  };
}

/**
 * Reset streak (when broken)
 */
export async function resetStreak(userId: number, streakType: StreakType) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(streaks)
    .set({
      currentStreak: 0,
      lastActivityDate: null,
      updatedAt: new Date(),
    })
    .where(and(eq(streaks.userId, userId), eq(streaks.streakType, streakType)));
}

/**
 * Check if user has reached a streak milestone (30 or 100 days)
 * Returns the milestone reached or null
 */
export async function checkStreakMilestone(
  userId: number,
  streakType: StreakType
): Promise<"30_days" | "100_days" | null> {
  const streak = await getOrCreateStreak(userId, streakType);

  if (streak.currentStreak === 100) {
    return "100_days";
  }

  if (streak.currentStreak === 30) {
    return "30_days";
  }

  return null;
}

/**
 * Get current streak for a user and type
 */
export async function getCurrentStreak(userId: number, streakType: StreakType) {
  const streak = await getOrCreateStreak(userId, streakType);
  return streak.currentStreak;
}

/**
 * Get longest streak for a user and type
 */
export async function getLongestStreak(userId: number, streakType: StreakType) {
  const streak = await getOrCreateStreak(userId, streakType);
  return streak.longestStreak;
}

/**
 * Check if user has a 3-day consistency streak (any combination of habit/journal/chat)
 */
export async function hasThreeDayConsistencyStreak(userId: number): Promise<boolean> {
  const userStreaks = await getUserStreaks(userId);

  // Check if any streak type has at least 3 days
  return userStreaks.some((s) => s.currentStreak >= 3);
}
