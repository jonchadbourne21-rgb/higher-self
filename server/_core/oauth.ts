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
 * Decode the state parameter from the OAuth callback.
 * State can be:
 *   1. New format: base64(JSON { redirectUri, returnOrigin, returnPath })
 *   2. Legacy format: base64(redirectUri string)
 */
function decodeState(state: string): {
  redirectUri: string;
  returnOrigin: string;
  returnPath: string;
} {
  try {
    // URL-decode first (browsers may URL-encode the base64 padding ==)
    const raw = Buffer.from(decodeURIComponent(state), "base64").toString("utf-8");
    // Try JSON format first
    try {
      const parsed = JSON.parse(raw);
      if (parsed.redirectUri) {
        // Extract origin from redirectUri (e.g., "https://example.com/api/oauth/callback" -> "https://example.com")
        const returnOrigin = new URL(parsed.redirectUri).origin;
        return {
          redirectUri: parsed.redirectUri,
          returnOrigin,
          returnPath: parsed.returnPath || "/",
        };
      }
    } catch {
      // Not JSON — fall through to legacy format
    }
    // Legacy format: state is just the redirectUri string
    return {
      redirectUri: raw,
      returnOrigin: new URL(raw).origin,
      returnPath: "/",
    };
  } catch {
    // Last resort fallback
    return {
      redirectUri: "",
      returnOrigin: "",
      returnPath: "/",
    };
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
      console.log("[OAuth] Callback received, code length:", code?.length);

      // Decode state to get redirectUri and where to send the user after login
      const { redirectUri, returnOrigin, returnPath } = decodeState(state);
      console.log("[OAuth] Decoded state — redirectUri:", redirectUri, "returnOrigin:", returnOrigin);

      // The redirectUri must match exactly what was sent in the authorization request
      const tokenResponse = await sdk.exchangeCodeForToken(code, state, redirectUri || undefined);
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

      // Set cookie (works on manus.space and dev domains)
      const cookieOptions = getSessionCookieOptions(req);
      console.log("[OAuth] Setting cookie with options:", JSON.stringify(cookieOptions));
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Build the final redirect URL.
      // Since we now use the current domain as redirectUri, the callback fires on the same domain.
      // We redirect to returnPath with the session token in ?_t= for localStorage fallback auth.
      const finalPath = returnPath || "/";
      const separator = finalPath.includes("?") ? "&" : "?";
      const finalUrl = `${finalPath}${separator}_t=${encodeURIComponent(sessionToken)}`;

      console.log("[OAuth] Login successful, redirecting to:", finalUrl);
      res.redirect(302, finalUrl);
    } catch (error: any) {
      const errMsg = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error instanceof Error ? error.message : String(error);
      console.error("[OAuth] Callback failed:", errMsg);
      res.redirect(302, "/?auth_error=1");
    }
  });
}
