import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import * as db from "../db";
import { createSessionAndToken } from "../auth/jwt";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || "com.mirrored.aiself";

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 200) : null;
}
function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed && trimmed.length <= 320 ? trimmed : null;
}
function normalizeNonce(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}
function appleOpenId(subject: string): string {
  return `apple:${createHash("sha256").update(subject).digest("hex").slice(0, 58)}`;
}

export function registerOAuthRoutes(app: Express) {
  app.post("/api/auth/apple", async (req: Request, res: Response) => {
    const identityToken = typeof req.body?.identityToken === "string" ? req.body.identityToken : "";
    const expectedNonce = normalizeNonce(req.body?.nonce);
    const suppliedEmail = normalizeEmail(req.body?.email);
    const suppliedName = normalizeName(req.body?.name);

    if (!identityToken) return void res.status(400).json({ error: "identityToken is required" });
    if (!expectedNonce) return void res.status(400).json({ error: "valid nonce is required" });

    try {
      const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: APPLE_ISSUER,
        audience: APPLE_CLIENT_ID,
        algorithms: ["RS256"],
      });
      if (typeof payload.sub !== "string" || !payload.sub) {
        return void res.status(401).json({ error: "Apple identity token is missing subject" });
      }
      if (typeof payload.nonce !== "string" || payload.nonce.toLowerCase() !== expectedNonce) {
        return void res.status(401).json({ error: "Apple identity nonce verification failed" });
      }

      const openId = appleOpenId(payload.sub);
      const email = normalizeEmail(payload.email) || suppliedEmail;
      await db.upsertUser({
        openId,
        loginMethod: "apple",
        lastSignedIn: new Date(),
        ...(suppliedName ? { name: suppliedName } : {}),
        ...(email ? { email } : {}),
      });
      const user = await db.getUserByOpenId(openId);
      if (!user) return void res.status(500).json({ error: "Failed to create or load Mirrored account" });

      const { token, maxAge } = await createSessionAndToken(user.id, req.get("user-agent"), req.ip);
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
    } catch {
      res.status(401).json({ error: "Apple identity verification failed" });
    }
  });
}
