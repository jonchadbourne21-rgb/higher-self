/**
 * API base URL resolution.
 *
 * On the web the app is served from the same origin as the API, so a relative
 * "/api/trpc" is correct.
 *
 * Inside a Capacitor WebView it is not. The bundle is served from
 * `capacitor://localhost` (iOS) or `http://localhost` (Android), so a relative
 * path resolves against the local bundle instead of the server and every API
 * call 404s against the packaged assets. Native builds must therefore call an
 * absolute origin.
 *
 * Set VITE_API_BASE_URL at build time for native builds, e.g.
 *   VITE_API_BASE_URL=https://themirroredapp.com pnpm cap:build
 *
 * Whatever host you use must also appear in `server.allowNavigation` in
 * capacitor.config.ts, and the server must send permissive CORS headers for it
 * (auth is Bearer-token based, so cookies are not required cross-origin).
 */

import { isNative } from "@/lib/platform";

const CONFIGURED_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");

/**
 * Origin to prefix API paths with. Empty string means "same origin" (web).
 */
export function getApiBaseUrl(): string {
  if (CONFIGURED_BASE) return CONFIGURED_BASE;

  if (isNative()) {
    // Misconfigured native build — surface it loudly rather than failing with a
    // confusing 404 on every request.
    console.error(
      "[apiBase] VITE_API_BASE_URL is not set. Native builds cannot use relative " +
        "API paths — set it before running `pnpm cap:build` or the app will not " +
        "be able to reach the server."
    );
  }

  return "";
}

/** Build an absolute API URL on native, or leave it relative on web. */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}
