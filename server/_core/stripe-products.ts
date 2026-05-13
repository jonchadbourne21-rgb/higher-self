/**
 * Stripe Products Configuration
 * Define all Stripe products and prices for the Pro tier
 */

export const STRIPE_PRODUCTS = {
  PRO_TIER: {
    name: "Mentrove Pro",
    description: "Unlimited chats, journals, and growth insights",
  },
};

export const STRIPE_PRICES = {
  PRO_MONTHLY: {
    amount: 299, // $2.99 in cents
    currency: "usd",
    interval: "month",
    intervalCount: 1,
    displayName: "$2.99/month",
  },
  PRO_ANNUAL: {
    amount: 3999, // $39.99 in cents
    currency: "usd",
    interval: "year",
    intervalCount: 1,
    displayName: "$39.99/year",
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
