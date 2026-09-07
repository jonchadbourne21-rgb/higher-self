import { isNative } from "@/lib/platform";
import { startNativeLogin } from "@/lib/nativeAuth";

/** Native Build 4 owns login through Sign in with Apple. */
export function redirectToLogin(webFallback = "/"): void {
  if (isNative()) {
    void startNativeLogin();
    return;
  }
  if (typeof window !== "undefined") {
    window.location.href = webFallback;
  }
}
