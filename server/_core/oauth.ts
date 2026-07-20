import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { setAuthCookie, createSessionAndToken } from "../auth/jwt";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Decode the state parameter to extract the origin for redirect.
 * The frontend encodes the full redirectUri in state via btoa().
 * We extract just the origin from it.
 */
function parseState(state: string): { origin: string; returnPath: string } {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf-8");
    // decoded is the full redirectUri, e.g. "https://themirroredapp.com/api/oauth/callback"
    const url = new URL(decoded);
    return { origin: url.origin, returnPath: "/" };
  } catch {
    return { origin: "", returnPath: "/" };
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    // Native client flag — when present, redirect to deep link instead of web
    const clientType = getQueryParam(req, "client");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      // Standard template approach: let SDK decode redirectUri from state
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Upsert user in database
      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Get the user to retrieve their ID for JWT session
      const user = await db.getUserByOpenId(userInfo.openId);

      // Set JWT-based session cookie (primary auth path)
      if (user) {
        await setAuthCookie(res, user.id);
      }

      // Set legacy SDK session cookie (fallback auth path)
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // NATIVE PATH: redirect to deep link with JWT token
      if (clientType === "native" && user) {
        const { token } = await createSessionAndToken(user.id);
        const nativeRedirect = `higherself://oauth/callback?_t=${encodeURIComponent(token)}`;
        res.redirect(302, nativeRedirect);
        return;
      }

      // WEB PATH: use parseState to extract origin for proper cross-domain redirect
      const { origin } = parseState(state);
      if (origin) {
        res.redirect(302, `${origin}/`);
      } else {
        // Fallback to relative redirect if state parsing fails
        res.redirect(302, "/");
      }
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("[OAuth] Callback failed:", errMsg);

      // Native error path
      if (clientType === "native") {
        res.redirect(302, "higherself://oauth/callback?error=auth_failed");
        return;
      }

      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
