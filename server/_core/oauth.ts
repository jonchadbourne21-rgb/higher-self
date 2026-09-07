import { createHash } from "node:crypto";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { setAuthCookie, createSessionAndToken } from "../auth/jwt";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || "com.mirrored.aiself";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 200) : null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 && trimmed.length <= 320 ? trimmed : null;
}

function appleOpenId(subject: string): string {
  // Do not expose Apple's raw stable subject as the product-level openId.
  const digest = createHash("sha256").update(subject).digest("hex");
  return `apple:${digest.slice(0, 58)}`;
}

/**
 * Decode the legacy state parameter to extract the origin for redirect.
 * This remains only as a temporary web-compatibility bridge on the parity
 * branch. Native Build 4 uses /api/auth/apple and Mirrored JWT sessions.
 */
function parseState(state: string): { origin: string; returnPath: string } {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf-8");
    const url = new URL(decoded);
    return { origin: url.origin, returnPath: "/" };
  } catch {
    return { origin: "", returnPath: "/" };
  }
}

export function registerOAuthRoutes(app: Express) {
  /**
   * Native Sign in with Apple exchange.
   *
   * The iOS client obtains an Apple identity JWT from AuthenticationServices.
   * This server verifies signature + issuer + audience before trusting claims,
   * upserts the Mirrored account, and issues the same revocable Mirrored JWT
   * used by the rest of the canonical tRPC application.
   */
  app.post("/api/auth/apple", async (req: Request, res: Response) => {
    const identityToken =
      typeof req.body?.identityToken === "string" ? req.body.identityToken : "";
    const suppliedEmail = normalizeEmail(req.body?.email);
    const suppliedName = normalizeName(req.body?.name);

    if (!identityToken) {
      res.status(400).json({ error: "identityToken is required" });
      return;
    }

    try {
      const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: APPLE_ISSUER,
        audience: APPLE_CLIENT_ID,
        algorithms: ["RS256"],
      });

      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        res.status(401).json({ error: "Apple identity token is missing subject" });
        return;
      }

      const openId = appleOpenId(payload.sub);
      const tokenEmail = normalizeEmail(payload.email);
      const email = tokenEmail || suppliedEmail;

      await db.upsertUser({
        openId,
        loginMethod: "apple",
        lastSignedIn: new Date(),
        ...(suppliedName ? { name: suppliedName } : {}),
        ...(email ? { email } : {}),
      });

      const user = await db.getUserByOpenId(openId);
      if (!user) {
        res.status(500).json({ error: "Failed to create or load Mirrored account" });
        return;
      }

      const { token, maxAge } = await createSessionAndToken(
        user.id,
        req.get("user-agent"),
        req.ip
      );

      res.status(200).json({
        token,
        maxAge,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          onboardingCompleted: user.onboardingCompleted,
        },
      });
    } catch (error) {
      console.error("[AppleAuth] Identity verification failed", error);
      res.status(401).json({ error: "Apple identity verification failed" });
    }
  });

  // Legacy web callback retained temporarily during parity migration. It is
  // explicitly disallowed from the final no-Manus runtime gate.
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const clientType = getQueryParam(req, "client");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

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

      const user = await db.getUserByOpenId(userInfo.openId);

      if (user) {
        await setAuthCookie(res, user.id);
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      if (clientType === "native" && user) {
        const { token } = await createSessionAndToken(user.id);
        const nativeRedirect = `mirrored://oauth/callback?_t=${encodeURIComponent(token)}`;
        res.redirect(302, nativeRedirect);
        return;
      }

      const { origin } = parseState(state);
      if (origin) {
        res.redirect(302, `${origin}/`);
      } else {
        res.redirect(302, "/");
      }
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("[OAuth] Callback failed:", errMsg);

      if (clientType === "native") {
        res.redirect(302, "mirrored://oauth/callback?error=auth_failed");
        return;
      }

      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
