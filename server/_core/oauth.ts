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
 * Decode the redirectUri from the OAuth state parameter.
 *
 * The client encodes: state = btoa(redirectUri)
 * where redirectUri = window.location.origin + "/api/oauth/callback"
 * e.g. "https://higherself-lqwmd5t8.manus.space/api/oauth/callback"
 *
 * The state may be URL-encoded when it arrives (base64 chars +, =, / become %2B, %3D, %2F).
 * We must URL-decode it first, then base64-decode it.
 *
 * This is the ONLY reliable source of the exact redirectUri the client used —
 * we cannot reconstruct it from request headers because the server runs on an
 * internal Cloud Run hostname, not the public manus.space domain.
 */
function decodeRedirectUriFromState(state: string): string {
  try {
    // Step 1: URL-decode the state (handles %2B -> +, %3D -> =, %2F -> /)
    const urlDecoded = decodeURIComponent(state);
    // Step 2: Base64-decode to get the original redirectUri
    const redirectUri = Buffer.from(urlDecoded, "base64").toString("utf-8");
    console.log("[OAuth] Decoded redirectUri from state:", redirectUri);
    return redirectUri;
  } catch (e1) {
    try {
      // Fallback: try decoding without URL-decoding first
      const redirectUri = Buffer.from(state, "base64").toString("utf-8");
      console.log("[OAuth] Decoded redirectUri from state (fallback):", redirectUri);
      return redirectUri;
    } catch (e2) {
      console.error("[OAuth] Failed to decode state:", state, e1, e2);
      throw new Error("Failed to decode OAuth state parameter");
    }
  }
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
      console.log("[OAuth] Callback received, code length:", code?.length, "state:", state?.substring(0, 20) + "...");

      // Decode the exact redirectUri the client sent — this MUST match what Manus has registered
      const redirectUri = decodeRedirectUriFromState(state);

      console.log("[OAuth] Attempting token exchange with redirectUri:", redirectUri);
      // Pass empty state since we're providing the explicit redirectUri
      const tokenResponse = await sdk.exchangeCodeForToken(code, "", redirectUri);
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
      res.redirect(302, "/?auth_error=1");
    }
  });
}
