/**
 * Platform-aware login redirect.
 *
 * Web: full-page navigation to the OAuth portal (existing behavior).
 * Native: opens the system browser via startNativeLogin so the OAuth
 * callback can return into the app through the higherself:// deep link.
 */

import { isNative } from "@/lib/platform";
import { startNativeLogin } from "@/lib/nativeAuth";

export function redirectToLogin(url: string): void {
  if (isNative()) {
    void startNativeLogin().then((opened) => {
      if (!opened && typeof window !== "undefined") {
        window.location.href = url;
      }
    });
    return;
  }
  if (typeof window !== "undefined") {
    window.location.href = url;
  }
}
