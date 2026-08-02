/**
 * CORS for the native app shells.
 *
 * On the web the page and the API share an origin, so no CORS is involved and
 * this middleware is a no-op — same-origin requests carry no Origin header.
 *
 * Inside a Capacitor WebView the bundle is loaded from device storage, so the
 * page origin is literally "capacitor://localhost" (iOS) or "http://localhost"
 * (Android), and every call to this server is cross-origin. Without these
 * headers the request still arrives and still succeeds — the WebView simply
 * discards the response before the app can read it, which is indistinguishable
 * from the server being down.
 *
 * This is an allowlist of two fixed origins, not a wildcard, and it grants no
 * access on its own: protected procedures still require a valid Bearer token.
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Origins the Capacitor WebView reports for the bundled app shell.
 * Keep in sync with `server.allowNavigation` in capacitor.config.ts.
 */
export const NATIVE_APP_ORIGINS = new Set([
  "capacitor://localhost",
  "http://localhost",
]);

export function nativeCors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  if (origin && NATIVE_APP_ORIGINS.has(origin)) {
    // Echo the exact origin — browsers reject a "*" wildcard on requests that
    // carry credentials, and the tRPC client sends credentials: "include".
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "authorization, content-type, x-demo-mode");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    // Responses differ by Origin; without this a shared cache could hand the
    // wrong headers to the next caller.
    res.header("Vary", "Origin");

    // The Authorization header makes these requests "non-simple", so the browser
    // sends a preflight OPTIONS first and withholds the real request until it is
    // answered.
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
  }

  next();
}
