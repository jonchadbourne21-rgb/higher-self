import { eq, and, desc, like, sql } from "drizzle-orm";
import { rewardPointsHistory, wheelSpins, streakRewards } from "../../drizzle/schema";
import { getDb } from "../db";

type RewardSource = "habit" | "journal" | "chat" | "checkin" | "spin" | "redemption";
type WheelResult = "month_pro" | "dare" | "try_again" | "week_trial" | "reward_points";

/**
 * Add reward points to a user
 */
export async function addRewardPoints(
  userId: number,
  points: number,
  source: RewardSource,
  sourceId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db.insert(rewardPointsHistory).values({
    userId,
    points,
    source,
    sourceId,
  });
}

/**
 * Get total reward points for a user
 */
export async function getTotalRewardPoints(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result = await db
    .select()
    .from(rewardPointsHistory)
    .where(eq(rewardPointsHistory.userId, userId));

  return result.reduce((sum, record) => sum + record.points, 0);
}

/**
 * Get reward points history for a user
 */
export async function getRewardPointsHistory(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  return await db
    .select()
    .from(rewardPointsHistory)
    .where(eq(rewardPointsHistory.userId, userId))
    .orderBy(desc(rewardPointsHistory.createdAt));
}

/**
 * Spin the reward wheel with weighted odds
 * Odds:
 * - 5% chance: 1 month free Pro
 * - 23.75% chance: Take a Dare
 * - 23.75% chance: Try again
 * - 23.75% chance: 1 week free trial
 * - 23.75% chance: 5 reward points
 */
export function spinWheel(): WheelResult {
  const random = Math.random() * 100;

  if (random < 5) {
    return "month_pro";
  } else if (random < 28.75) {
    return "dare";
  } else if (random < 52.5) {
    return "try_again";
  } else if (random < 76.25) {
    return "week_trial";
  } else {
    return "reward_points";
  }
}

/**
 * Record a wheel spin result
 */
export async function recordWheelSpin(
  userId: number,
  result: WheelResult,
  prizeValue?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db.insert(wheelSpins).values({
    userId,
    result,
    prizeValue,
  });

  // If result is reward points, add 5 points
  if (result === "reward_points") {
    await addRewardPoints(userId, 5, "spin", `wheel_spin_${Date.now()}`);
  }
}

/**
 * Mark the user's welcome spin as used
 */
export async function markWelcomeSpinUsed(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { users } = await import("../../drizzle/schema");
  await db.update(users).set({ welcomeSpinUsed: true }).where(eq(users.id, userId));
}

/**
 * Check if user has used their welcome spin
 */
export async function hasUsedWelcomeSpin(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const { users } = await import("../../drizzle/schema");
  const result = await db.select({ welcomeSpinUsed: users.welcomeSpinUsed })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0]?.welcomeSpinUsed ?? false;
}

/**
 * Redeem reward points (deduct points)
 */
export async function redeemPoints(
  userId: number,
  points: number,
  description: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Verify user has enough points
  const total = await getTotalRewardPoints(userId);
  if (total < points) throw new Error("Insufficient points");

  await db.insert(rewardPointsHistory).values({
    userId,
    points: -points,
    source: "redemption",
    sourceId: description,
  });

  return { success: true, remainingPoints: total - points };
}

/**
 * Get wheel spin history for a user
 */
export async function getWheelSpinHistory(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  return await db
    .select()
    .from(wheelSpins)
    .where(eq(wheelSpins.userId, userId))
    .orderBy(desc(wheelSpins.spinnedAt));
}

/**
 * Get last wheel spin for a user
 */
export async function getLastWheelSpin(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result = await db
    .select()
    .from(wheelSpins)
    .where(eq(wheelSpins.userId, userId))
    .orderBy(desc(wheelSpins.spinnedAt))
    .limit(1);

  return result[0] || null;
}

/**
 * Record a streak reward (30 or 100 days)
 */
export async function recordStreakReward(
  userId: number,
  streakDays: number,
  rewardType: "two_months_pro" | "one_year_pro"
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db.insert(streakRewards).values({
    userId,
    streakDays,
    rewardType,
    rewardAppliedAt: new Date(),
  });
}

/**
 * Get streak rewards for a user
 */
export async function getStreakRewards(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  return await db
    .select()
    .from(streakRewards)
    .where(eq(streakRewards.userId, userId));
}

/**
 * Check if user has already received a reward for a specific streak milestone
 */
export async function hasReceivedStreakReward(
  userId: number,
  streakDays: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result = await db
    .select()
    .from(streakRewards)
    .where(
      and(
        eq(streakRewards.userId, userId),
        eq(streakRewards.streakDays, streakDays)
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Get the current consecutive dare streak (how many of the most recent spins were dares)
 */
export async function getDareStreak(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const recentSpins = await db
    .select({ result: wheelSpins.result })
    .from(wheelSpins)
    .where(eq(wheelSpins.userId, userId))
    .orderBy(desc(wheelSpins.spinnedAt))
    .limit(10);

  let streak = 0;
  for (const spin of recentSpins) {
    if (spin.result === "dare") {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Check if the user just hit a 3-dare streak and award 10 bonus points if so.
 * Returns true if bonus was awarded.
 */
export async function checkAndAwardDareStreakBonus(userId: number): Promise<boolean> {
  const streak = await getDareStreak(userId);
  // Award bonus on every 3rd consecutive dare (3, 6, 9, ...)
  if (streak > 0 && streak % 3 === 0) {
    await addRewardPoints(userId, 10, "spin", `dare_streak_bonus_${streak}_${Date.now()}`);
    return true;
  }
  return false;
}

/**
 * Count pending (unused) free spins for a user.
 * Sources: streak_spin_ (3-day streaks) and purchase_spin_ (subscription bonus).
 * Each actual wheel spin is recorded in wheelSpins.
 * Pending = total granted spins - spins used (total wheelSpins count minus welcome spin).
 */
export async function getPendingStreakSpins(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Count streak spin grants
  const streakGrantsResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(rewardPointsHistory)
    .where(
      and(
        eq(rewardPointsHistory.userId, userId),
        like(rewardPointsHistory.sourceId, "streak_spin_%")
      )
    );
  const streakGranted = Number(streakGrantsResult[0]?.count ?? 0);

  // Count purchase bonus spin grants
  const purchaseGrantsResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(rewardPointsHistory)
    .where(
      and(
        eq(rewardPointsHistory.userId, userId),
        like(rewardPointsHistory.sourceId, "purchase_spin_%")
      )
    );
  const purchaseGranted = Number(purchaseGrantsResult[0]?.count ?? 0);

  const totalGranted = streakGranted + purchaseGranted;

  // Count total wheel spins used (excluding the welcome spin which is tracked separately)
  const spinsResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(wheelSpins)
    .where(eq(wheelSpins.userId, userId));
  const totalSpins = Number(spinsResult[0]?.count ?? 0);

  // Welcome spin is 1 spin that doesn't come from streak/purchase grants
  const spinsUsedFromGrants = Math.max(0, totalSpins - 1);
  return Math.max(0, totalGranted - spinsUsedFromGrants);
}
