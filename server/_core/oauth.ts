import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    // The redirectUri in the query param is the exact URI registered with Manus OAuth
    const redirectUri = getQueryParam(req, "redirectUri");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      console.log("[OAuth] Callback received, code length:", code?.length);
      // Pass the redirectUri from query params if available (most reliable)
      // Fall back to decoding from state for backwards compatibility
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

      // Determine redirect target: decode origin from state, fallback to /
      let redirectTo = "/";
      try {
        // state = btoa(redirectUri) where redirectUri = origin + /api/oauth/callback
        const decoded = Buffer.from(state, "base64").toString("utf-8");
        const url = new URL(decoded);
        redirectTo = url.origin + "/";
      } catch {
        // state wasn't a URL, just redirect to root
      }
      console.log("[OAuth] Redirecting to:", redirectTo);
      res.redirect(302, redirectTo);
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
