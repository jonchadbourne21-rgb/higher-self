import { eq, and, desc, or } from "drizzle-orm";
import { rewardGrants } from "../../drizzle/schema";
import { getDb } from "../db";
import { getOrCreateSubscription, upgradeToProTier, downgradeToFreeTier } from "./subscriptions";

// Map spin results / redemption tiers to grant details
const GRANT_DETAILS: Record<string, { label: string; durationDays: number }> = {
  month_pro: { label: "1 Month Free Pro", durationDays: 30 },
  week_trial: { label: "1 Week Free Trial", durationDays: 7 },
  week_pro: { label: "1 Week Pro Access", durationDays: 7 },
  month_pro_redeem: { label: "1 Month Pro Access", durationDays: 30 },
  three_month_pro: { label: "3 Months Pro Access", durationDays: 90 },
  year_pro: { label: "1 Year Pro Access", durationDays: 365 },
  two_months_pro: { label: "2 Months Free Pro", durationDays: 60 },
  one_year_pro: { label: "1 Year Free Pro", durationDays: 365 },
};

/**
 * Create a reward grant and immediately try to activate it.
 * If user is already Pro, it stays as "pending" (stacked).
 * If user is not Pro, it activates immediately.
 */
export async function createRewardGrant(
  userId: number,
  grantType: string,
  source: "spin" | "redemption" | "streak"
): Promise<{ grantId: number; activated: boolean; expiresAt: Date | null }> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const details = GRANT_DETAILS[grantType];
  if (!details) throw new Error(`Unknown grant type: ${grantType}`);

  // Insert the grant as pending
  const result = await db.insert(rewardGrants).values({
    userId,
    grantType,
    label: details.label,
    durationDays: details.durationDays,
    source,
    status: "pending",
  });

  const grantId = (result as any)[0]?.insertId;

  // Try to activate it immediately
  const activated = await tryActivateNextGrant(userId);

  if (activated) {
    // Fetch the grant to get its expiresAt
    const grant = await db
      .select()
      .from(rewardGrants)
      .where(eq(rewardGrants.id, grantId))
      .limit(1);
    return { grantId, activated: true, expiresAt: grant[0]?.expiresAt ?? null };
  }

  return { grantId, activated: false, expiresAt: null };
}

/**
 * Try to activate the next pending grant for a user.
 * Only activates if no grant is currently active.
 * Returns true if a grant was activated.
 */
export async function tryActivateNextGrant(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Check if there's already an active grant
  const activeGrants = await db
    .select()
    .from(rewardGrants)
    .where(
      and(
        eq(rewardGrants.userId, userId),
        eq(rewardGrants.status, "active")
      )
    )
    .limit(1);

  if (activeGrants.length > 0) {
    const active = activeGrants[0];
    // Check if it's expired
    if (active.expiresAt && new Date(active.expiresAt) <= new Date()) {
      // Mark as used
      await db
        .update(rewardGrants)
        .set({ status: "used" })
        .where(eq(rewardGrants.id, active.id));
    } else {
      // Still active, don't activate another
      return false;
    }
  }

  // Find the oldest pending grant
  const pendingGrants = await db
    .select()
    .from(rewardGrants)
    .where(
      and(
        eq(rewardGrants.userId, userId),
        eq(rewardGrants.status, "pending")
      )
    )
    .orderBy(rewardGrants.createdAt)
    .limit(1);

  if (pendingGrants.length === 0) {
    // No pending grants — check if user should be downgraded
    // Only downgrade if they don't have a Stripe subscription
    const sub = await getOrCreateSubscription(userId);
    if (sub.tier === "pro" && !sub.stripeSubscriptionId) {
      await downgradeToFreeTier(userId);
    }
    return false;
  }

  const grant = pendingGrants[0];
  const now = new Date();

  // For week_trial grants, align start to the top of the current hour
  // so the trial starts at e.g. 3:00 PM and ends exactly 7 days later at 3:00 PM
  let activatedAt: Date;
  if (grant.grantType === "week_trial") {
    activatedAt = new Date(now);
    activatedAt.setMinutes(0, 0, 0); // round down to top of the hour
  } else {
    activatedAt = now;
  }
  const expiresAt = new Date(activatedAt.getTime() + grant.durationDays * 24 * 60 * 60 * 1000);

  // Activate the grant
  await db
    .update(rewardGrants)
    .set({
      status: "active",
      activatedAt,
      expiresAt,
    })
    .where(eq(rewardGrants.id, grant.id));

  // Upgrade the user to Pro
  await upgradeToProTier(userId, undefined, undefined, expiresAt);

  return true;
}

/**
 * Check and process expired grants for a user.
 * If the active grant has expired, mark it as used and try to activate the next one.
 * If no more grants, downgrade to free.
 * Returns the current Pro status.
 */
export async function checkAndProcessExpiredGrants(userId: number): Promise<{
  isPro: boolean;
  activeGrant: typeof rewardGrants.$inferSelect | null;
  pendingGrants: (typeof rewardGrants.$inferSelect)[];
  expiresAt: Date | null;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Find active grant
  const activeGrants = await db
    .select()
    .from(rewardGrants)
    .where(
      and(
        eq(rewardGrants.userId, userId),
        eq(rewardGrants.status, "active")
      )
    )
    .limit(1);

  if (activeGrants.length > 0) {
    const active = activeGrants[0];
    // Check if expired
    if (active.expiresAt && new Date(active.expiresAt) <= new Date()) {
      // Mark as used
      await db
        .update(rewardGrants)
        .set({ status: "used" })
        .where(eq(rewardGrants.id, active.id));

      // Try to activate next grant
      const activated = await tryActivateNextGrant(userId);

      if (activated) {
        // Fetch the newly active grant
        const newActive = await db
          .select()
          .from(rewardGrants)
          .where(
            and(
              eq(rewardGrants.userId, userId),
              eq(rewardGrants.status, "active")
            )
          )
          .limit(1);

        const pending = await getPendingGrants(userId);
        return {
          isPro: true,
          activeGrant: newActive[0] || null,
          pendingGrants: pending,
          expiresAt: newActive[0]?.expiresAt ?? null,
        };
      } else {
        // No more grants, user is free now
        const pending = await getPendingGrants(userId);
        return { isPro: false, activeGrant: null, pendingGrants: pending, expiresAt: null };
      }
    }

    // Active and not expired
    const pending = await getPendingGrants(userId);
    return {
      isPro: true,
      activeGrant: active,
      pendingGrants: pending,
      expiresAt: active.expiresAt,
    };
  }

  // No active grant — try to activate a pending one
  const activated = await tryActivateNextGrant(userId);
  if (activated) {
    const newActive = await db
      .select()
      .from(rewardGrants)
      .where(
        and(
          eq(rewardGrants.userId, userId),
          eq(rewardGrants.status, "active")
        )
      )
      .limit(1);

    const pending = await getPendingGrants(userId);
    return {
      isPro: true,
      activeGrant: newActive[0] || null,
      pendingGrants: pending,
      expiresAt: newActive[0]?.expiresAt ?? null,
    };
  }

  const pending = await getPendingGrants(userId);
  return { isPro: false, activeGrant: null, pendingGrants: pending, expiresAt: null };
}

/**
 * Get all pending grants for a user (stacked rewards)
 */
export async function getPendingGrants(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  return await db
    .select()
    .from(rewardGrants)
    .where(
      and(
        eq(rewardGrants.userId, userId),
        eq(rewardGrants.status, "pending")
      )
    )
    .orderBy(rewardGrants.createdAt);
}

/**
 * Get all grants for a user (for history display)
 */
export async function getAllGrants(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  return await db
    .select()
    .from(rewardGrants)
    .where(eq(rewardGrants.userId, userId))
    .orderBy(desc(rewardGrants.createdAt));
}

/**
 * Get count of pending grants
 */
export async function getPendingGrantCount(userId: number): Promise<number> {
  const pending = await getPendingGrants(userId);
  return pending.length;
}
