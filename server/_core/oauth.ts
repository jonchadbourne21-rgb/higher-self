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
      console.log("[OAuth] redirectUri from query:", redirectUri);

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
      console.log("[OAuth] Setting cookie with options:", JSON.stringify(cookieOptions));
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Always redirect to relative root — the SPA router handles the rest
      console.log("[OAuth] Login successful, redirecting to /");
      res.redirect(302, "/");
    } catch (error: any) {
      const errMsg = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error instanceof Error ? error.message : String(error);
      const sqlError = error?.sqlMessage || error?.code || "";
      console.error("[OAuth] Callback failed:", errMsg, sqlError ? `| SQL: ${sqlError}` : "");
      if (error?.sql) console.error("[OAuth] Failed SQL:", error.sql);
      // Redirect to landing page with error instead of showing raw JSON
      res.redirect(302, "/?auth_error=1");
    }
  });
}
