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
import { checkAndProcessExpiredGrants, isPermanentProUser } from "../db/rewardGrants";
import {
  getProMonthlyPriceId,
  getProAnnualPriceId,
  getProVoiceMonthlyPriceId,
  getProVoiceAnnualPriceId,
  STRIPE_PRICES,
  FREE_LIMITS,
} from "../_core/stripe-products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const subscriptionRouter = router({
  /**
   * Get current subscription status for the user
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    // Permanent Pro override
    if (isPermanentProUser(ctx.user.id)) {
      const subscription = await getOrCreateSubscription(ctx.user.id);
      return {
        tier: "pro_voice" as const,
        status: "active" as const,
        isProUser: true,
        isProVoiceUser: true,
        startDate: subscription.startDate,
        endDate: null,
        stripeCustomerId: subscription.stripeCustomerId,
      };
    }
    const subscription = await getOrCreateSubscription(ctx.user.id);
    const isProStatus = await isProUser(ctx.user.id);

    return {
      tier: subscription.tier,
      status: subscription.status,
      isProUser: isProStatus,
      isProVoiceUser: subscription.tier === "pro_voice" && subscription.status === "active",
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      stripeCustomerId: subscription.stripeCustomerId,
    };
  }),

  /**
   * Create a checkout session for Pro or Pro + Voice Mirror upgrade
   * Returns the Stripe checkout URL
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        billingCycle: z.enum(["monthly", "annual"]),
        tier: z.enum(["pro", "pro_voice"]).default("pro"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        let priceId: string;

        if (input.tier === "pro_voice") {
          priceId =
            input.billingCycle === "monthly"
              ? getProVoiceMonthlyPriceId()
              : getProVoiceAnnualPriceId();
        } else {
          priceId =
            input.billingCycle === "monthly"
              ? getProMonthlyPriceId()
              : getProAnnualPriceId();
        }

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
            tier: input.tier,
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
   * Get pricing information for all tiers
   */
  getPricing: protectedProcedure.query(async () => {
    return {
      pro: {
        monthly: {
          amount: STRIPE_PRICES.PRO_MONTHLY.amount,
          currency: "usd",
          displayAmount: "$5.99",
          interval: "month",
          bonusSpins: STRIPE_PRICES.PRO_MONTHLY.bonusSpins,
        },
        annual: {
          amount: STRIPE_PRICES.PRO_ANNUAL.amount,
          currency: "usd",
          displayAmount: "$59.99",
          interval: "year",
          savings: "Save 17%",
          bonusSpins: STRIPE_PRICES.PRO_ANNUAL.bonusSpins,
        },
      },
      proVoice: {
        monthly: {
          amount: STRIPE_PRICES.PRO_VOICE_MONTHLY.amount,
          currency: "usd",
          displayAmount: "$8.99",
          interval: "month",
          bonusSpins: STRIPE_PRICES.PRO_VOICE_MONTHLY.bonusSpins,
        },
        annual: {
          amount: STRIPE_PRICES.PRO_VOICE_ANNUAL.amount,
          currency: "usd",
          displayAmount: "$89.99",
          interval: "year",
          savings: "Save 17%",
          bonusSpins: STRIPE_PRICES.PRO_VOICE_ANNUAL.bonusSpins,
        },
      },
      freeLimits: FREE_LIMITS,
    };
  }),

  /**
   * Cancel the user's subscription
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
   * Also returns whether they have pro_voice tier
   */
  isProUser: protectedProcedure.query(async ({ ctx }) => {
    // Permanent Pro override — always Pro with voice
    if (isPermanentProUser(ctx.user.id)) {
      return { isProUser: true, isProVoiceUser: true };
    }
    const subscription = await getOrCreateSubscription(ctx.user.id);
    // First check Stripe subscription
    const stripeProStatus = await isProUser(ctx.user.id);
    if (stripeProStatus) {
      return {
        isProUser: true,
        isProVoiceUser: subscription.tier === "pro_voice" && subscription.status === "active",
      };
    }
    // Then check reward grants (also processes expired ones)
    const grantStatus = await checkAndProcessExpiredGrants(ctx.user.id);
    return { isProUser: grantStatus.isPro, isProVoiceUser: false };
  }),
});
