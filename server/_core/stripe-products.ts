/**
 * Stripe Products Configuration
 * Define all Stripe products and prices for the Pro tier
 */

export const STRIPE_PRODUCTS = {
  PRO_TIER: {
    name: "Mirrored Pro",
    description: "Unlimited chats, journals, and growth insights",
  },
};

export const STRIPE_PRICES = {
  PRO_MONTHLY: {
    amount: 399, // $3.99 in cents
    currency: "usd",
    interval: "month",
    intervalCount: 1,
    displayName: "$3.99/month",
    bonusSpins: 1,
  },
  PRO_ANNUAL: {
    amount: 4999, // $49.99 in cents
    currency: "usd",
    interval: "year",
    intervalCount: 1,
    displayName: "$49.99/year",
    bonusSpins: 3,
  },
};

/**
 * Get price ID from environment
 * These will be created in Stripe Dashboard or via API
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
