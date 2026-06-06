/**
 * Stripe Products Configuration
 * Define all Stripe products and prices for subscription tiers
 *
 * Tiers:
 * - Trial (10 days): Full Pro + Voice Mirror access, auto-converts to free after 10 days
 * - Free: Limited access after trial expires
 * - Pro ($9.99/mo or $104.99/yr): Unlimited chats, journals, programs, growth insights
 * - Premium Pro ($13.99/mo or $149.99/yr): Everything in Pro + unlimited Voice Mirror sessions
 */

export const TRIAL_DURATION_DAYS = 10;

export const STRIPE_PRODUCTS = {
  PRO_TIER: {
    name: "MIRRORED Pro",
    description: "Unlimited chats, journals, programs, and growth insights",
  },
  PRO_VOICE_TIER: {
    name: "MIRRORED Premium Pro",
    description: "Everything in Pro plus unlimited Voice Mirror sessions",
  },
};

export const STRIPE_PRICES = {
  PRO_MONTHLY: {
    amount: 999, // $9.99 in cents
    currency: "usd",
    interval: "month" as const,
    intervalCount: 1,
    displayName: "$9.99/month",
    bonusSpins: 1,
    tier: "pro" as const,
  },
  PRO_ANNUAL: {
    amount: 10499, // $104.99 in cents
    currency: "usd",
    interval: "year" as const,
    intervalCount: 1,
    displayName: "$104.99/year",
    bonusSpins: 3,
    tier: "pro" as const,
    savingsLabel: "Save 12%", // vs 12 × $9.99 = $119.88
  },
  PRO_VOICE_MONTHLY: {
    amount: 1399, // $13.99 in cents
    currency: "usd",
    interval: "month" as const,
    intervalCount: 1,
    displayName: "$13.99/month",
    bonusSpins: 2,
    tier: "pro_voice" as const,
  },
  PRO_VOICE_ANNUAL: {
    amount: 14999, // $149.99 in cents
    currency: "usd",
    interval: "year" as const,
    intervalCount: 1,
    displayName: "$149.99/year",
    bonusSpins: 5,
    tier: "pro_voice" as const,
    savingsLabel: "Save 11%", // vs 12 × $13.99 = $167.88
  },
};

/** Free tier limits (after trial expires) */
export const FREE_LIMITS = {
  VOICE_RESPONSES_PER_MONTH: 0,   // Voice disabled on free after trial
  CHATS_PER_DAY: 3,
  JOURNALS_PER_WEEK: 2,
  MAX_PROGRAM_ENROLLMENTS: 0,
};

/** Pro tier limits (voice still limited unless pro_voice) */
export const PRO_LIMITS = {
  VOICE_RESPONSES_PER_MONTH: 0, // Need Premium Pro for voice
  MAX_PROGRAM_ENROLLMENTS: Infinity,
};

/** Premium Pro + Voice tier — unlimited everything */
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
