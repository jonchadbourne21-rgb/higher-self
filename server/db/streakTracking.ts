import { getDb } from "../db";
import { streaks } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Check if user has a 3-day consistency streak (any combo of habits/journals/chats)
 * Returns true if they have 3 consecutive days of activity
 */
export async function checkThreeDayStreak(userId: number): Promise<boolean> {
  const database = await getDb();
  if (!database) return false;

  // Get all streaks for this user
  const userStreaks = await database
    .select()
    .from(streaks)
    .where(eq(streaks.userId, userId));

  // Check if any streak is at 3 days or more
  for (const streak of userStreaks) {
    if (streak.currentStreak >= 3) {
      return true;
    }
  }

  return false;
}

/**
 * Track activity for a user (chat, journal, or habit completion)
 * Updates or creates streak record
 */
export async function trackActivity(
  userId: number,
  streakType: "chat" | "journal" | "habit"
): Promise<{ streakCount: number; isNewStreak: boolean }> {
  const database = await getDb();
  if (!database) return { streakCount: 0, isNewStreak: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find existing streak for this user and streak type
  const existingStreak = await database
    .select()
    .from(streaks)
    .where(
      and(
        eq(streaks.userId, userId),
        eq(streaks.streakType, streakType)
      )
    )
    .limit(1);

  if (existingStreak.length === 0) {
    // New streak
    await database.insert(streaks).values({
      userId,
      streakType,
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: today,
    });

    return { streakCount: 1, isNewStreak: true };
  }

  const streak = existingStreak[0];
  const lastActivity = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
  
  if (lastActivity) {
    lastActivity.setHours(0, 0, 0, 0);
  }

  const daysDifference = lastActivity
    ? Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    : 1;

  let newCount = streak.currentStreak;
  let newLongest = streak.longestStreak;

  if (daysDifference === 0) {
    // Same day, no change to streak
    newCount = streak.currentStreak;
  } else if (daysDifference === 1) {
    // Consecutive day, increment streak
    newCount = streak.currentStreak + 1;
    newLongest = Math.max(newCount, streak.longestStreak);
  } else {
    // Streak broken, reset to 1
    newCount = 1;
  }

  // Update streak
  await database
    .update(streaks)
    .set({
      currentStreak: newCount,
      longestStreak: newLongest,
      lastActivityDate: today,
    })
    .where(eq(streaks.id, streak.id));

  return { streakCount: newCount, isNewStreak: false };
}

/**
 * Get current streak count for a user and streak type
 */
export async function getStreakCount(
  userId: number,
  streakType: "chat" | "journal" | "habit"
): Promise<number> {
  const database = await getDb();
  if (!database) return 0;

  const streak = await database
    .select()
    .from(streaks)
    .where(
      and(
        eq(streaks.userId, userId),
        eq(streaks.streakType, streakType)
      )
    )
    .limit(1);

  return streak.length > 0 ? streak[0].currentStreak : 0;
}

/**
 * Check if user has reached 30-day milestone
 */
export async function checkThirtyDayMilestone(userId: number): Promise<boolean> {
  const database = await getDb();
  if (!database) return false;

  const userStreaks = await database
    .select()
    .from(streaks)
    .where(eq(streaks.userId, userId));

  for (const streak of userStreaks) {
    if (streak.currentStreak >= 30) {
      return true;
    }
  }

  return false;
}

/**
 * Check if user has reached 100-day milestone
 */
export async function checkHundredDayMilestone(userId: number): Promise<boolean> {
  const database = await getDb();
  if (!database) return false;

  const userStreaks = await database
    .select()
    .from(streaks)
    .where(eq(streaks.userId, userId));

  for (const streak of userStreaks) {
    if (streak.currentStreak >= 100) {
      return true;
    }
  }

  return false;
}

/**
 * Reset streak for a user (when they miss a day)
 */
export async function resetStreak(
  userId: number,
  streakType: "chat" | "journal" | "habit"
): Promise<void> {
  const database = await getDb();
  if (!database) return;

  await database
    .update(streaks)
    .set({
      currentStreak: 0,
      lastActivityDate: new Date(),
    })
    .where(
      and(
        eq(streaks.userId, userId),
        eq(streaks.streakType, streakType)
      )
    );
}
