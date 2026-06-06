import { TRPCError } from "@trpc/server";
import { z } from "zod";
import Stripe from "stripe";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getOrCreateSubscription,
  isProUser,
  upgradeToProTier,
  downgradeToFreeTier,
  isOnTrial,
  getTrialDaysRemaining,
} from "../db/subscriptions";
import {
  checkAndProcessExpiredGrants,
  isPermanentProUser,
} from "../db/rewardGrants";
import {
  getProMonthlyPriceId,
  getProAnnualPriceId,
  getProVoiceMonthlyPriceId,
  getProVoiceAnnualPriceId,
  STRIPE_PRICES,
  FREE_LIMITS,
  TRIAL_DURATION_DAYS,
} from "../_core/stripe-products";

function getStripe(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is required for subscription payments");
  }
  return new Stripe(apiKey);
}

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
        isOnTrial: false,
        trialDaysRemaining: 0,
        trialDurationDays: TRIAL_DURATION_DAYS,
        startDate: subscription.startDate,
        endDate: null,
        stripeCustomerId: subscription.stripeCustomerId,
      };
    }

    const subscription = await getOrCreateSubscription(ctx.user.id);
    const isProStatus = await isProUser(ctx.user.id);
    const trialActive = isOnTrial(
      subscription.tier,
      subscription.status,
      subscription.trialStartDate
    );
    const daysRemaining = getTrialDaysRemaining(subscription.trialStartDate);

    return {
      tier: subscription.tier,
      status: subscription.status,
      isProUser: isProStatus,
      isProVoiceUser:
        trialActive ||
        (subscription.tier === "pro_voice" && subscription.status === "active"),
      isOnTrial: trialActive,
      trialDaysRemaining: daysRemaining,
      trialDurationDays: TRIAL_DURATION_DAYS,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      stripeCustomerId: subscription.stripeCustomerId,
    };
  }),

  /**
   * Create a checkout session for Pro or Premium Pro upgrade.
   * Returns the Stripe checkout URL.
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

        const session = await getStripe().checkout.sessions.create({
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
      trialDays: TRIAL_DURATION_DAYS,
      pro: {
        monthly: {
          amount: STRIPE_PRICES.PRO_MONTHLY.amount,
          currency: "usd",
          displayAmount: "$9.99",
          interval: "month",
          bonusSpins: STRIPE_PRICES.PRO_MONTHLY.bonusSpins,
        },
        annual: {
          amount: STRIPE_PRICES.PRO_ANNUAL.amount,
          currency: "usd",
          displayAmount: "$104.99",
          interval: "year",
          savings: "Save 12%",
          bonusSpins: STRIPE_PRICES.PRO_ANNUAL.bonusSpins,
        },
      },
      proVoice: {
        monthly: {
          amount: STRIPE_PRICES.PRO_VOICE_MONTHLY.amount,
          currency: "usd",
          displayAmount: "$13.99",
          interval: "month",
          bonusSpins: STRIPE_PRICES.PRO_VOICE_MONTHLY.bonusSpins,
        },
        annual: {
          amount: STRIPE_PRICES.PRO_VOICE_ANNUAL.amount,
          currency: "usd",
          displayAmount: "$149.99",
          interval: "year",
          savings: "Save 11%",
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
        await getStripe().subscriptions.cancel(
          subscription.stripeSubscriptionId
        );
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
   * Check if user is a Pro subscriber (checks Stripe, reward grants, and active trial)
   */
  isProUser: protectedProcedure.query(async ({ ctx }) => {
    // Permanent Pro override — always Pro with voice
    if (isPermanentProUser(ctx.user.id)) {
      return { isProUser: true, isProVoiceUser: true, isOnTrial: false, trialDaysRemaining: 0 };
    }

    const subscription = await getOrCreateSubscription(ctx.user.id);
    const trialActive = isOnTrial(
      subscription.tier,
      subscription.status,
      subscription.trialStartDate
    );
    const daysRemaining = getTrialDaysRemaining(subscription.trialStartDate);

    // Trial counts as full Pro + Voice access
    if (trialActive) {
      return {
        isProUser: true,
        isProVoiceUser: true,
        isOnTrial: true,
        trialDaysRemaining: daysRemaining,
      };
    }

    // Check Stripe subscription
    const stripeProStatus = await isProUser(ctx.user.id);
    if (stripeProStatus) {
      return {
        isProUser: true,
        isProVoiceUser:
          subscription.tier === "pro_voice" && subscription.status === "active",
        isOnTrial: false,
        trialDaysRemaining: 0,
      };
    }

    // Check reward grants
    const grantStatus = await checkAndProcessExpiredGrants(ctx.user.id);
    return {
      isProUser: grantStatus.isPro,
      isProVoiceUser: false,
      isOnTrial: false,
      trialDaysRemaining: 0,
    };
  }),
});
