/**
 * API base URL resolution.
 *
 * On the web the app is served from the same origin as the API, so a relative
 * "/api/trpc" remains correct.
 *
 * Inside a Capacitor WebView the bundle is served from `capacitor://localhost`
 * (iOS) or `http://localhost` (Android), so native builds must call an absolute
 * API origin. Build 4 uses the Railway backend and no Manus host.
 *
 * Override per-build when intentionally targeting staging:
 *   VITE_API_BASE_URL=https://staging.example.com pnpm cap:build
 */

import { isNative } from "@/lib/platform";

const CONFIGURED_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");
const NATIVE_FALLBACK_BASE = "https://mirrored-backend-production.up.railway.app";

/** Origin to prefix API paths with. Empty string means same-origin web. */
export function getApiBaseUrl(): string {
  if (CONFIGURED_BASE) return CONFIGURED_BASE;
  if (isNative()) return NATIVE_FALLBACK_BASE;
  return "";
}

/** Build an absolute API URL on native, or leave it relative on web. */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}
