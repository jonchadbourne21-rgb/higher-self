import { Request, Response } from "express";
import Stripe from "stripe";
import { getDb } from "../db";
import { subscriptions, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-04-22.dahlia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Handle Stripe webhook events for subscription management
 * This function should be called with express.raw({ type: 'application/json' })
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  // ⚠️ CRITICAL: Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[Webhook] Invoice paid:", invoice.id);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[Webhook] Error processing event:", err);
    res.status(500).send("Webhook processing error");
  }
}

/**
 * Handle checkout.session.completed event
 * User has successfully completed payment
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log("[Webhook] Checkout session completed:", session.id);

  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("[Webhook] No user_id in session metadata");
    return;
  }

  const stripeCustomerId = session.customer as string;
  const stripeSubscriptionId = session.subscription as string;

  if (!stripeSubscriptionId) {
    console.error("[Webhook] No subscription ID in session");
    return;
  }

  // Get subscription details from Stripe
  const subscription = (await stripe.subscriptions.retrieve(stripeSubscriptionId)) as Stripe.Subscription;

  // Update subscription in database
  const priceId = subscription.items.data[0]?.price.id;
  const tier = getPriceIdTier(priceId);

  // Upsert subscription record
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const existingSub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, parseInt(userId)))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  if (existingSub) {
    await db
      .update(subscriptions)
      .set({
        tier,
        status: "active",
        stripeCustomerId,
        stripeSubscriptionId,
        startDate: new Date(((subscription as any).current_period_start || 0) * 1000),
        endDate: new Date(((subscription as any).current_period_end || 0) * 1000),
      })
      .where(eq(subscriptions.userId, parseInt(userId)));
  } else {
    await db.insert(subscriptions).values({
      userId: parseInt(userId),
      tier,
      status: "active",
      stripeCustomerId,
      stripeSubscriptionId,
      startDate: new Date(((subscription as any).current_period_start || 0) * 1000),
      endDate: new Date(((subscription as any).current_period_end || 0) * 1000),
    });
  }

  console.log(`[Webhook] User ${userId} upgraded to ${tier} tier`);
}

/**
 * Handle customer.subscription.updated event
 * Subscription status changed (e.g., payment failed, renewed)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("[Webhook] Subscription updated:", subscription.id);

  const customerId = subscription.customer as string;

  // Find subscription by Stripe customer ID
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const sub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  if (!sub) {
    console.error("[Webhook] Subscription not found for customer:", customerId);
    return;
  }

  const status = subscription.status === "active" ? "active" : "canceled";
  const priceId = subscription.items.data[0]?.price.id;
  const tier = getPriceIdTier(priceId);

  await db
    .update(subscriptions)
    .set({
      status: status as "active" | "canceled" | "expired",
      tier,
      endDate: new Date(((subscription as any).current_period_end || 0) * 1000),
    })
    .where(eq(subscriptions.userId, sub.userId));

  console.log(`[Webhook] User ${sub.userId} subscription updated to ${status}`);
}

/**
 * Handle customer.subscription.deleted event
 * Subscription was cancelled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[Webhook] Subscription deleted:", subscription.id);

  const customerId = subscription.customer as string;

  // Find subscription by Stripe customer ID
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const sub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1)
    .then((rows: any[]) => rows[0]);

  if (!sub) {
    console.error("[Webhook] Subscription not found for customer:", customerId);
    return;
  }

  // Downgrade to free tier
  await db
    .update(subscriptions)
    .set({
      tier: "free",
      status: "canceled",
    })
    .where(eq(subscriptions.userId, sub.userId));

  console.log(`[Webhook] User ${sub.userId} subscription cancelled, downgraded to free`);
}

/**
 * Map Stripe price ID to subscription tier
 */
function getPriceIdTier(priceId?: string): "free" | "pro" {
  if (!priceId) return "free";

  const proMonthlyPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proAnnualPriceId = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;

  if (priceId === proMonthlyPriceId || priceId === proAnnualPriceId) {
    return "pro";
  }

  return "free";
}
