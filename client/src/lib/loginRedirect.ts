/**
 * Platform-aware login entry.
 *
 * Native: Sign in with Apple → Railway → Mirrored JWT.
 * Web: legacy URL handling remains temporarily for browser compatibility and
 * must be replaced before the final no-Manus runtime gate closes.
 */

import { isNative } from "@/lib/platform";
import { startNativeLogin } from "@/lib/nativeAuth";

export function redirectToLogin(url: string): void {
  if (isNative()) {
    // Never fall through to the legacy URL on native. A failed Apple attempt
    // remains a failed Apple attempt rather than silently reintroducing Manus.
    void startNativeLogin();
    return;
  }

  if (typeof window !== "undefined") {
    window.location.href = url;
  }
}
