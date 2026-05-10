import { eq } from "drizzle-orm";
import { subscriptions } from "../../drizzle/schema";
import { getDb } from "../db";

/**
 * Get or create a subscription record for a user
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
    // Create default free subscription
    await db.insert(subscriptions).values({
      userId,
      tier: "free",
      status: "active",
    });

    subscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
  }

  return subscription[0];
}

/**
 * Get user's subscription status
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
 * Check if user has active Pro subscription
 */
export async function isProUser(userId: number): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  return (
    subscription.tier === "pro" &&
    subscription.status === "active" &&
    (!subscription.endDate || new Date(subscription.endDate) > new Date())
  );
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
