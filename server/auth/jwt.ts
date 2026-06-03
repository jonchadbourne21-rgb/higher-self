import { SignJWT } from "jose";
import { getDb } from "../db";
import { sessions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const DEFAULT_TEST_JWT_SECRET = "test-only-jwt-secret-do-not-use-in-production";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") {
      return new TextEncoder().encode(DEFAULT_TEST_JWT_SECRET);
    }
    throw new Error("JWT_SECRET is required");
  }
  return new TextEncoder().encode(secret);
}
const ACCESS_TOKEN_TTL_SECONDS = 600; // 10 minutes

/**
 * Creates a long-lived session row and issues a short-lived JWT token.
 *
 * The JWT is the "hall pass" — it's short-lived and stateless.
 * The session row is the source of truth — it's long-lived and can be revoked.
 *
 * Flow:
 * 1. Create session row in database (30 days)
 * 2. Issue JWT token with session ID + user ID (10 minutes)
 * 3. Return both to OAuth callback
 * 4. OAuth callback sets JWT as HTTP-only cookie
 */
export async function createSessionAndToken(
  userId: number,
  userAgent?: string,
  ip?: string
) {
  // Step 1: Create the long-lived session row
  const sessionId = `sess_${nanoid(24)}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    revokedAt: null,
    userAgent,
    ipAddress: ip,
    createdAt: new Date(),
  });

  // Step 2: Issue short-lived JWT
  // The JWT only contains session ID and user ID, not user data
  // This keeps the token small and stateless
  const token = await new SignJWT({
    sid: sessionId, // session ID (can be revoked)
    uid: userId, // user ID (for quick access)
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());

  return {
    token, // JWT to send to client
    sessionId, // session ID for audit logging
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  };
}

/**
 * Called by OAuth callback to set the session cookie.
 * The cookie is HTTP-only, so JavaScript cannot access it.
 * The browser automatically sends it with every request.
 */
export async function setAuthCookie(res: any, userId: number) {
  const { token, maxAge } = await createSessionAndToken(userId);

  // Set HTTP-only cookie
  // The browser will automatically include this in every request
  res.setHeader("Set-Cookie", [
    `session_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
  ]);
}

/**
 * Revokes a session by setting the revokedAt timestamp.
 * This is called during logout.
 */
export async function revokeSession(sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}
