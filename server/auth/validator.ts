import { jwtVerify } from "jose";
import { getDb } from "../db";
import { sessions, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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

/**
 * Verifies the JWT token and checks if the session is revoked.
 *
 * Flow:
 * 1. Extract JWT from cookie
 * 2. Verify JWT signature
 * 3. Check JWT expiration
 * 4. Look up session in database
 * 5. Check if session is revoked
 * 6. Check if session is expired
 * 7. Return user data
 */
export async function verifySessionToken(token: string) {
  try {
    // Step 1 & 2: Verify JWT signature
    const verified = await jwtVerify(token, getJwtSecret());
    const payload = verified.payload as { sid: string; uid: number };

    // Step 3: Extract session ID from JWT
    const sessionId = payload.sid;
    const userId = payload.uid;

    // Step 4: Look up session in database
    const db = await getDb();
    if (!db) return null;

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!session) {
      return null; // Session not found
    }

    // Step 5: Check if session is revoked
    if (session.revokedAt !== null) {
      return null; // Session has been revoked
    }

    // Step 6: Check if session is expired
    if (session.expiresAt < new Date()) {
      return null; // Session has expired
    }

    // Step 7: Return user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return user || null;
  } catch (error) {
    // JWT verification failed (invalid signature, expired, etc.)
    return null;
  }
}
