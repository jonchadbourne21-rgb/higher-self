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
// JWT TTL matches the session row duration (45 days).
// A short 10-minute TTL with no refresh endpoint caused all users to be logged out
// after 10 minutes, breaking every authenticated API call.
const ACCESS_TOKEN_TTL_SECONDS = 45 * 24 * 60 * 60; // 45 days

/**
 * Creates a long-lived session row and issues a JWT token.
 *
 * Both the session row and the JWT are valid for 45 days.
 * The session row is the source of truth — it can be revoked server-side.
 * The JWT is the stateless hall pass verified on every request.
 *
 * Flow:
 * 1. Create session row in database (30 days)
 * 2. Issue JWT token with session ID + user ID (30 days)
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
  const expiresAt = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

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
