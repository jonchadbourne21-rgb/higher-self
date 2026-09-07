/**
 * Native Sign in with Apple flow for the canonical Capacitor app.
 *
 * iOS:
 * 1. AuthenticationServices produces an Apple identity JWT.
 * 2. The client sends that JWT + a bound nonce to the Railway backend.
 * 3. Railway verifies Apple signature/issuer/audience/nonce and returns a
 *    revocable Mirrored session JWT.
 * 4. The Mirrored JWT is stored through the existing native storage adapter,
 *    so every canonical tRPC screen continues to use the same auth contract.
 *
 * No Manus portal, callback, browser, or Manus identity is involved.
 */

import {
  AppleSignIn,
  SignInScope,
} from "@capawesome/capacitor-apple-sign-in";
import { apiUrl } from "@/lib/apiBase";
import { isNative } from "@/lib/platform";
import { storage, STORAGE_KEYS } from "@/lib/storage";

function randomHex(bytes = 32): string {
  const value = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(value);
  return Array.from(value, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

type AppleSessionResponse = {
  token?: string;
  user?: {
    onboardingCompleted?: boolean;
  };
  error?: string;
};

/**
 * Starts native Apple sign-in. The URL argument used by the old redirect
 * helper is intentionally irrelevant on native; this function owns the flow.
 */
export async function startNativeLogin(): Promise<boolean> {
  if (!isNative()) return false;

  try {
    // Apple recommends a fresh nonce for each authorization attempt. The raw
    // value never leaves the process; AuthenticationServices receives its
    // SHA-256 digest and the server verifies the same value in the identity JWT.
    const rawNonce = randomHex();
    const hashedNonce = await sha256Hex(rawNonce);

    const result = await AppleSignIn.signIn({
      scopes: [SignInScope.Email, SignInScope.FullName],
      nonce: hashedNonce,
    });

    if (!result.idToken) {
      throw new Error("APPLE_ID_TOKEN_MISSING");
    }

    const name = [result.givenName, result.familyName]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join(" ")
      .trim();

    const response = await globalThis.fetch(apiUrl("/api/auth/apple"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identityToken: result.idToken,
        nonce: hashedNonce,
        email: result.email,
        name: name || undefined,
      }),
    });

    let body: AppleSessionResponse = {};
    try {
      body = (await response.json()) as AppleSessionResponse;
    } catch {
      // Preserve a generic failure below; never expose raw provider responses.
    }

    if (!response.ok || !body.token) {
      throw new Error("MIRRORED_SESSION_EXCHANGE_FAILED");
    }

    storage.setItem(STORAGE_KEYS.sessionToken, body.token);

    // A brand-new Apple identity must not bypass the canonical onboarding.
    const nextPath = body.user?.onboardingCompleted ? "/home" : "/onboarding";
    globalThis.location?.replace(nextPath);
    return true;
  } catch {
    if (typeof globalThis.alert === "function") {
      globalThis.alert("Sign in with Apple could not be completed. Please try again.");
    }
    return false;
  }
}

/**
 * Kept for bootstrap compatibility while the old deep-link listener is removed.
 * Apple AuthenticationServices returns directly to this process, so no callback
 * registration is needed for Build 4.
 */
export async function registerNativeAuthCallback(): Promise<void> {
  return;
}
