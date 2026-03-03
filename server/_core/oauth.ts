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
 * The Manus proxy sets x-forwarded-host and x-forwarded-proto headers.
 * We use those to reconstruct the exact public-facing origin.
 */
function getRedirectUri(req: Request): string {
  // x-forwarded-host is set by the Manus/Cloudflare proxy
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host || req.hostname;

  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(",")[0].trim()) || req.protocol || "https";

  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/oauth/callback`;
  console.log("[OAuth] Reconstructed redirectUri:", redirectUri);
  console.log("[OAuth] Request headers:", JSON.stringify({
    host: req.headers.host,
    "x-forwarded-host": req.headers["x-forwarded-host"],
    "x-forwarded-proto": req.headers["x-forwarded-proto"],
    "x-forwarded-for": req.headers["x-forwarded-for"],
    protocol: req.protocol,
    hostname: req.hostname,
  }));
  return redirectUri;
}

export function registerOAuthRoutes(app: Express) {
  // Debug endpoint to inspect request headers from the proxy
  app.get("/api/debug/headers", (req: Request, res: Response) => {
    res.json({
      headers: req.headers,
      hostname: req.hostname,
      protocol: req.protocol,
      reconstructedRedirectUri: getRedirectUri(req),
    });
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const redirectUri = getRedirectUri(req);
      console.log("[OAuth] Attempting token exchange with redirectUri:", redirectUri);

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

      console.log("[OAuth] Login successful, redirecting to /");
      res.redirect(302, "/");
    } catch (error: any) {
      const errData = error?.response?.data;
      const errMsg = errData
        ? JSON.stringify(errData)
        : error instanceof Error ? error.message : String(error);
      console.error("[OAuth] Callback failed. Error:", errMsg);
      console.error("[OAuth] Full error response:", JSON.stringify({
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      }));
      res.redirect(302, "/?auth_error=1");
    }
  });
}
