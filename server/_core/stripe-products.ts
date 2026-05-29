/**
 * Stripe Products Configuration
 * Define all Stripe products and prices for subscription tiers
 *
 * Tiers:
 * - Free: 5 voice responses/month, 1 program enrollment, 5 chats/day, 4 journals/week
 * - Pro ($5.99/mo): Unlimited chats, journals, programs. 5 voice responses/month.
 * - Pro + Voice Mirror ($8.99/mo): Everything in Pro + unlimited voice mirror sessions.
 */

export const STRIPE_PRODUCTS = {
  PRO_TIER: {
    name: "Mirrored Pro",
    description: "Unlimited chats, journals, programs, and growth insights",
  },
  PRO_VOICE_TIER: {
    name: "Mirrored Pro + Voice Mirror",
    description: "Everything in Pro plus unlimited voice mirror sessions",
  },
};

export const STRIPE_PRICES = {
  PRO_MONTHLY: {
    amount: 599, // $5.99 in cents
    currency: "usd",
    interval: "month" as const,
    intervalCount: 1,
    displayName: "$5.99/month",
    bonusSpins: 1,
    tier: "pro" as const,
  },
  PRO_ANNUAL: {
    amount: 5999, // $59.99 in cents
    currency: "usd",
    interval: "year" as const,
    intervalCount: 1,
    displayName: "$59.99/year",
    bonusSpins: 3,
    tier: "pro" as const,
  },
  PRO_VOICE_MONTHLY: {
    amount: 899, // $8.99 in cents
    currency: "usd",
    interval: "month" as const,
    intervalCount: 1,
    displayName: "$8.99/month",
    bonusSpins: 2,
    tier: "pro_voice" as const,
  },
  PRO_VOICE_ANNUAL: {
    amount: 8999, // $89.99 in cents
    currency: "usd",
    interval: "year" as const,
    intervalCount: 1,
    displayName: "$89.99/year",
    bonusSpins: 5,
    tier: "pro_voice" as const,
  },
};

/** Free tier limits */
export const FREE_LIMITS = {
  VOICE_RESPONSES_PER_MONTH: 5,
  CHATS_PER_DAY: 5,
  JOURNALS_PER_WEEK: 4,
  MAX_PROGRAM_ENROLLMENTS: 1,
};

/** Pro tier limits (voice still limited unless pro_voice) */
export const PRO_LIMITS = {
  VOICE_RESPONSES_PER_MONTH: 5, // Same as free — need pro_voice for unlimited
  MAX_PROGRAM_ENROLLMENTS: Infinity,
};

/** Pro + Voice tier — unlimited everything */
export const PRO_VOICE_LIMITS = {
  VOICE_RESPONSES_PER_MONTH: Infinity,
  MAX_PROGRAM_ENROLLMENTS: Infinity,
};

/**
 * Get price ID from environment
 */
export function getProMonthlyPriceId(): string {
  const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRO_MONTHLY_PRICE_ID environment variable is not set");
  }
  return priceId;
}

export function getProAnnualPriceId(): string {
  const priceId = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRO_ANNUAL_PRICE_ID environment variable is not set");
  }
  return priceId;
}

export function getProVoiceMonthlyPriceId(): string {
  const priceId = process.env.STRIPE_PRO_VOICE_MONTHLY_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRO_VOICE_MONTHLY_PRICE_ID environment variable is not set");
  }
  return priceId;
}

export function getProVoiceAnnualPriceId(): string {
  const priceId = process.env.STRIPE_PRO_VOICE_ANNUAL_PRICE_ID;
  if (!priceId) {
    throw new Error("STRIPE_PRO_VOICE_ANNUAL_PRICE_ID environment variable is not set");
  }
  return priceId;
}
