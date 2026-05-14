import { TRPCError } from "@trpc/server";
import { z } from "zod";
import Stripe from "stripe";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getOrCreateSubscription,
  isProUser,
  upgradeToProTier,
  downgradeToFreeTier,
} from "../db/subscriptions";
import { checkAndProcessExpiredGrants } from "../db/rewardGrants";
import { getProMonthlyPriceId, getProAnnualPriceId } from "../_core/stripe-products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const subscriptionRouter = router({
  /**
   * Get current subscription status for the user
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await getOrCreateSubscription(ctx.user.id);
    const isProStatus = await isProUser(ctx.user.id);

    return {
      tier: subscription.tier,
      status: subscription.status,
      isProUser: isProStatus,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      stripeCustomerId: subscription.stripeCustomerId,
    };
  }),

  /**
   * Create a checkout session for Pro tier upgrade
   * Returns the Stripe checkout URL
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        billingCycle: z.enum(["monthly", "annual"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const priceId =
          input.billingCycle === "monthly"
            ? getProMonthlyPriceId()
            : getProAnnualPriceId();

        const session = await stripe.checkout.sessions.create({
          customer_email: ctx.user.email || undefined,
          payment_method_types: ["card"],
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: `${ctx.req.headers.origin}/settings?subscription=success`,
          cancel_url: `${ctx.req.headers.origin}/settings?subscription=canceled`,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            customer_email: ctx.user.email || "",
            customer_name: ctx.user.name || "",
          },
          allow_promotion_codes: true,
        });

        if (!session.url) {
          throw new Error("Failed to create checkout session");
        }

        return {
          checkoutUrl: session.url,
          sessionId: session.id,
        };
      } catch (error) {
        console.error("[Subscription] Checkout error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session",
        });
      }
    }),

  /**
   * Get Pro tier pricing information
   */
  getPricing: protectedProcedure.query(async () => {
    return {
      monthly: {
        amount: 299,
        currency: "usd",
        displayAmount: "$2.99",
        interval: "month",
      },
      annual: {
        amount: 3999,
        currency: "usd",
        displayAmount: "$39.99",
        interval: "year",
        savings: "Save $6.89/year",
      },
    };
  }),

  /**
   * Cancel the user's Pro subscription
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const subscription = await getOrCreateSubscription(ctx.user.id);

      if (subscription.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      }

      await downgradeToFreeTier(ctx.user.id);

      return {
        success: true,
        message: "Subscription canceled",
      };
    } catch (error) {
      console.error("[Subscription] Cancel error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cancel subscription",
      });
    }
  }),

  /**
   * Check if user is a Pro subscriber (checks both Stripe and reward grants)
   */
  isProUser: protectedProcedure.query(async ({ ctx }) => {
    // First check Stripe subscription
    const stripeProStatus = await isProUser(ctx.user.id);
    if (stripeProStatus) return { isProUser: true };
    // Then check reward grants (also processes expired ones)
    const grantStatus = await checkAndProcessExpiredGrants(ctx.user.id);
    return { isProUser: grantStatus.isPro };
  }),
});
