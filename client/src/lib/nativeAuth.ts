/**
 * Native OAuth flow (Capacitor).
 *
 * Web flow (unchanged): window.location.href → OAuth portal → server callback
 * sets a cookie, or redirects back with ?_t=JWT which main.tsx picks up.
 *
 * Native flow:
 *   1. startNativeLogin() opens the OAuth portal in the system browser
 *      (ASWebAuthenticationSession on iOS / Chrome Custom Tab on Android)
 *      with redirect URI = higherself://oauth/callback
 *   2. The server callback redirects to that deep link with ?_t=JWT
 *   3. handleNativeAuthCallback() (registered in main.tsx via
 *      App.addListener("appUrlOpen")) extracts the token, stores it via the
 *      storage abstraction, and closes the browser
 *
 * SERVER NOTE: the OAuth callback on the server must allow
 * `higherself://oauth/callback` as a redirect target for native clients.
 * Pass `?client=native` (added by startNativeLogin) so the server knows to
 * redirect to the deep link instead of a web URL.
 */

import { isNative } from "@/lib/platform";
import { storage, STORAGE_KEYS } from "@/lib/storage";
import { getLoginUrl } from "@/const";

const NATIVE_CALLBACK_SCHEME = "higherself";
const NATIVE_CALLBACK_HOST = "oauth/callback";

type BrowserPlugin = {
  open(opts: { url: string; presentationStyle?: string }): Promise<void>;
  close(): Promise<void>;
};

type AppPlugin = {
  addListener(
    event: "appUrlOpen",
    cb: (data: { url: string }) => void
  ): Promise<{ remove(): Promise<void> }>;
};

async function getBrowser(): Promise<BrowserPlugin | null> {
  try {
    const mod = await import("@capacitor/browser");
    return mod.Browser as unknown as BrowserPlugin;
  } catch {
    return null;
  }
}

/**
 * Open the OAuth portal in the system browser. Returns false if the native
 * browser plugin is unavailable (caller should fall back to web behavior).
 */
export async function startNativeLogin(): Promise<boolean> {
  if (!isNative()) return false;
  const browser = await getBrowser();
  if (!browser) return false;

  const url = new URL(getLoginUrl());
  url.searchParams.set("client", "native");
  url.searchParams.set("redirectUri", `${NATIVE_CALLBACK_SCHEME}://${NATIVE_CALLBACK_HOST}`);

  await browser.open({ url: url.toString(), presentationStyle: "popover" });
  return true;
}

/**
 * Register the deep-link listener that completes native login.
 * Call once at app startup (main.tsx). Safe no-op on web.
 */
export async function registerNativeAuthCallback(): Promise<void> {
  if (!isNative()) return;
  try {
    const mod = await import("@capacitor/app");
    const App = mod.App as unknown as AppPlugin;
    await App.addListener("appUrlOpen", async ({ url }) => {
      try {
        const parsed = new URL(url);
        const isAuthCallback =
          parsed.protocol === `${NATIVE_CALLBACK_SCHEME}:` &&
          (parsed.host === "oauth" || url.includes(NATIVE_CALLBACK_HOST));
        if (!isAuthCallback) return;

        const token = parsed.searchParams.get("_t");
        if (token) {
          storage.setItem(STORAGE_KEYS.sessionToken, token);
        }
        const browser = await getBrowser();
        await browser?.close();
        // Reload so tRPC picks up the stored token and auth state refreshes.
        globalThis.location?.replace("/home");
      } catch {
        /* malformed deep link — ignore */
      }
    });
  } catch {
    /* @capacitor/app unavailable */
  }
}
