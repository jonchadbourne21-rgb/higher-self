/**
 * Platform detection — safe on web, native, and SSR.
 *
 * Uses @capacitor/core only when actually running inside a native shell,
 * so the web bundle never requires the native bridge at module load time.
 */

let cachedNative: boolean | null = null;

export function isNative(): boolean {
  if (cachedNative !== null) return cachedNative;
  try {
    // Capacitor injects window.Capacitor in the native WebView.
    const cap = (globalThis as Record<string, unknown>).Capacitor as
      | { isNativePlatform?: () => boolean; getPlatform?: () => string }
      | undefined;
    cachedNative = Boolean(cap?.isNativePlatform?.());
  } catch {
    cachedNative = false;
  }
  return cachedNative;
}

export function getPlatform(): "ios" | "android" | "web" {
  if (!isNative()) return "web";
  try {
    const cap = (globalThis as Record<string, unknown>).Capacitor as
      | { getPlatform?: () => string }
      | undefined;
    const p = cap?.getPlatform?.();
    if (p === "ios" || p === "android") return p;
  } catch {
    /* fall through */
  }
  return "web";
}
