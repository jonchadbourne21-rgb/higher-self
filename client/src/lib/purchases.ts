/**
 * In-app purchases abstraction (RevenueCat).
 *
 * WHY THIS EXISTS: Apple rejects iOS apps that sell digital subscriptions
 * (the Pro tier) via external payment links like Stripe web checkout.
 * On iOS/Android the purchase must go through the store's In-App Purchase.
 * RevenueCat gives one API over both stores; Stripe stays for the web app.
 *
 * Usage:
 *   - On native: configure() once at startup, then present paywall /
 *     purchasePackage() from the Pricing page instead of opening Stripe.
 *   - On web: all functions no-op / return null — Pricing keeps using Stripe.
 *
 * STILL NEEDED FROM YOU:
 *   1. Create a RevenueCat project, add App Store Connect + Play Console keys
 *   2. Set VITE_REVENUECAT_IOS_KEY / VITE_REVENUECAT_ANDROID_KEY env vars
 *   3. Server: verify RevenueCat webhooks to grant Pro entitlement
 *      (mirror of the existing Stripe webhook flow in server/_core/stripe-webhook.ts)
 *   4. Create products in App Store Connect / Play Console matching your tiers
 */

import { isNative, getPlatform } from "@/lib/platform";

type PurchasesPlugin = {
  configure(opts: { apiKey: string; appUserID?: string }): void;
  getOfferings(): Promise<{
    current?: { availablePackages: unknown[] } | null;
  }>;
  purchasePackage(opts: { aPackage: unknown }): Promise<unknown>;
  restorePurchases(): Promise<unknown>;
  getCustomerInfo(): Promise<{
    entitlements: { active: Record<string, unknown> };
  }>;
};

let purchases: PurchasesPlugin | null = null;
let configured = false;

async function getPurchases(): Promise<PurchasesPlugin | null> {
  if (purchases) return purchases;
  try {
    const mod = await import("@revenuecat/purchases-capacitor");
    purchases = mod.Purchases as unknown as PurchasesPlugin;
    return purchases;
  } catch {
    return null;
  }
}

function apiKeyForPlatform(): string | undefined {
  const platform = getPlatform();
  if (platform === "ios") return import.meta.env.VITE_REVENUECAT_IOS_KEY;
  if (platform === "android") return import.meta.env.VITE_REVENUECAT_ANDROID_KEY;
  return undefined;
}

/** Call once at startup on native. No-op on web. Returns false if unconfigured. */
export async function initPurchases(appUserId?: string): Promise<boolean> {
  if (!isNative() || configured) return configured;
  const sdk = await getPurchases();
  const apiKey = apiKeyForPlatform();
  if (!sdk || !apiKey) return false;
  try {
    sdk.configure({ apiKey, appUserID: appUserId });
    configured = true;
  } catch {
    return false;
  }
  return true;
}

/** True if the user has an active Pro entitlement via the stores. */
export async function hasProEntitlement(): Promise<boolean> {
  const sdk = await getPurchases();
  if (!sdk || !configured) return false;
  try {
    const info = await sdk.getCustomerInfo();
    return Object.keys(info.entitlements.active).length > 0;
  } catch {
    return false;
  }
}

export async function getCurrentOfferings() {
  const sdk = await getPurchases();
  if (!sdk || !configured) return null;
  try {
    return (await sdk.getOfferings()).current ?? null;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: unknown) {
  const sdk = await getPurchases();
  if (!sdk || !configured) throw new Error("Purchases not configured");
  return sdk.purchasePackage({ aPackage: pkg });
}

export async function restorePurchases() {
  const sdk = await getPurchases();
  if (!sdk || !configured) return null;
  try {
    return await sdk.restorePurchases();
  } catch {
    return null;
  }
}
