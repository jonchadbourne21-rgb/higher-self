import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Reconstruct the exact redirectUri that was registered with the Manus OAuth portal.
 * The client sends: redirectUri = window.location.origin + "/api/oauth/callback"
 * We must send the SAME value back during token exchange.
 *
 * Strategy: reconstruct from the incoming request's host header + known path.
 * This is always correct regardless of how state was encoded.
 */
function getRedirectUri(req: Request): string {
  // x-forwarded-host is set by the Manus proxy on the published domain
  const host = req.headers["x-forwarded-host"] || req.headers.host || req.hostname;
  const proto = req.headers["x-forwarded-proto"]
    ? (Array.isArray(req.headers["x-forwarded-proto"])
        ? req.headers["x-forwarded-proto"][0]
        : req.headers["x-forwarded-proto"].split(",")[0].trim())
    : req.protocol;

  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/oauth/callback`;
  console.log("[OAuth] Reconstructed redirectUri:", redirectUri);
  return redirectUri;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      console.log("[OAuth] Callback received, code length:", code?.length);

      // Reconstruct redirectUri from the request — most reliable, no encoding issues
      const redirectUri = getRedirectUri(req);

      const tokenResponse = await sdk.exchangeCodeForToken(code, state, redirectUri);
      console.log("[OAuth] Token exchange succeeded");

      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      console.log("[OAuth] Got user info, openId:", userInfo.openId ? "present" : "missing");

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || userInfo.openId,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to root — the SPA router handles the rest
      console.log("[OAuth] Login successful, redirecting to /");
      res.redirect(302, "/");
    } catch (error: any) {
      const errMsg = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error instanceof Error ? error.message : String(error);
      console.error("[OAuth] Callback failed:", errMsg);
      // Redirect to landing page with error instead of showing raw JSON
      res.redirect(302, "/?auth_error=1");
    }
  });
}
