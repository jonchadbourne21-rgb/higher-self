import { eq } from "drizzle-orm";
import { subscriptions } from "../../drizzle/schema";
import { getDb } from "../db";
import { isPermanentProUser } from "./rewardGrants";
import { TRIAL_DURATION_DAYS } from "../_core/stripe-products";

// ─── Trial helpers ────────────────────────────────────────────────────────────

/**
 * Calculate how many days remain in the user's trial.
 * Returns 0 if trial has not started or has expired.
 */
export function getTrialDaysRemaining(trialStartDate: Date | null | undefined): number {
  if (!trialStartDate) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  const elapsed = Math.floor((Date.now() - new Date(trialStartDate).getTime()) / msPerDay);
  const remaining = TRIAL_DURATION_DAYS - elapsed;
  return Math.max(0, remaining);
}

/**
 * Returns true if the user's 10-day trial is still active.
 */
export function isOnTrial(
  tier: string,
  status: string,
  trialStartDate: Date | null | undefined
): boolean {
  if (tier !== "free" || status !== "active") return false;
  return getTrialDaysRemaining(trialStartDate) > 0;
}

/**
 * Returns true if the user's trial has fully expired (started but now past 10 days).
 */
export function isTrialExpired(
  tier: string,
  trialStartDate: Date | null | undefined
): boolean {
  if (tier !== "free") return false; // Paid users are not in trial
  if (!trialStartDate) return false; // Never started
  return getTrialDaysRemaining(trialStartDate) === 0;
}

// ─── Subscription CRUD ────────────────────────────────────────────────────────

/**
 * Get or create a subscription record for a user.
 * New users automatically start their 10-day trial.
 */
export async function getOrCreateSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  let subscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (subscription.length === 0) {
    // New user — start 10-day trial immediately
    const now = new Date();
    await db.insert(subscriptions).values({
      userId,
      tier: "free",
      status: "active",
      trialStartDate: now,
    });

    subscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
  } else if (!subscription[0].trialStartDate) {
    // Existing user without a trial start date — backfill with createdAt
    await db
      .update(subscriptions)
      .set({ trialStartDate: subscription[0].createdAt })
      .where(eq(subscriptions.userId, userId));
    subscription[0].trialStartDate = subscription[0].createdAt;
  }

  return subscription[0];
}

/**
 * Get user's subscription status (no auto-create)
 */
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return result[0] || null;
}

/**
 * Check if user has active Pro subscription (Stripe, reward grants, or active trial).
 * Both "pro" and "pro_voice" tiers count as Pro.
 * Active trial also counts as Pro access.
 */
export async function isProUser(userId: number): Promise<boolean> {
  // Permanent Pro override
  if (isPermanentProUser(userId)) return true;

  const subscription = await getUserSubscription(userId);

  // Active trial = full Pro access
  if (
    subscription &&
    isOnTrial(subscription.tier, subscription.status, subscription.trialStartDate)
  ) {
    return true;
  }

  // Check paid Stripe subscription — both pro and pro_voice count
  if (
    subscription &&
    (subscription.tier === "pro" || subscription.tier === "pro_voice") &&
    subscription.status === "active" &&
    (!subscription.endDate || new Date(subscription.endDate) > new Date())
  ) {
    return true;
  }

  // Check reward grants as fallback
  try {
    const { checkAndProcessExpiredGrants } = await import("./rewardGrants");
    const grantStatus = await checkAndProcessExpiredGrants(userId);
    return grantStatus.isPro;
  } catch {
    return false;
  }
}

/**
 * Check if user has active Pro + Voice Mirror subscription.
 * Active trial also counts as Pro Voice access.
 */
export async function isProVoiceUser(userId: number): Promise<boolean> {
  // Permanent Pro override — always has voice access
  if (isPermanentProUser(userId)) return true;

  const subscription = await getUserSubscription(userId);

  // Active trial = full Premium Pro (voice) access
  if (
    subscription &&
    isOnTrial(subscription.tier, subscription.status, subscription.trialStartDate)
  ) {
    return true;
  }

  if (
    subscription &&
    subscription.tier === "pro_voice" &&
    subscription.status === "active" &&
    (!subscription.endDate || new Date(subscription.endDate) > new Date())
  ) {
    return true;
  }
  return false;
}

/**
 * Upgrade user to Pro tier
 */
export async function upgradeToProTier(
  userId: number,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string,
  endDate?: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(subscriptions)
    .set({
      tier: "pro",
      status: "active",
      startDate: new Date(),
      endDate: endDate,
      stripeCustomerId: stripeCustomerId,
      stripeSubscriptionId: stripeSubscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}

/**
 * Upgrade user to Premium Pro + Voice Mirror tier
 */
export async function upgradeToProVoiceTier(
  userId: number,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string,
  endDate?: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(subscriptions)
    .set({
      tier: "pro_voice",
      status: "active",
      startDate: new Date(),
      endDate: endDate,
      stripeCustomerId: stripeCustomerId,
      stripeSubscriptionId: stripeSubscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}

/**
 * Downgrade user to Free tier
 */
export async function downgradeToFreeTier(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(subscriptions)
    .set({
      tier: "free",
      status: "active",
      endDate: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}

/**
 * Cancel user's subscription
 */
export async function cancelSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}

/**
 * Extend Pro subscription end date
 */
export async function extendProSubscription(userId: number, newEndDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(subscriptions)
    .set({
      endDate: newEndDate,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}
