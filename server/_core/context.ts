import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifySessionToken } from "../auth/validator";
import { parse as parseCookieHeader } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  isDemo?: boolean;
};

/**
 * tRPC Context Builder — runs on every request.
 * This is where the JWT validator is called.
 *
 * Flow:
 * 1. Extract session cookie from request
 * 2. Verify JWT signature
 * 3. Check session in database (catches revocations)
 * 4. Return user data or null
 */
// Demo user for bypassing OAuth in demo mode
const DEMO_USER: User = {
  id: 999999,
  openId: "demo-user-readonly",
  name: "Demo User",
  email: "demo@mirrored.app",
  loginMethod: "demo",
  role: "user",
  onboardingCompleted: true,
  seedIntent: "Inner Peace",
  lastSessionId: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  welcomeSpinUsed: true,
  lastStreakSpinDate: null,
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Demo mode — return a read-only demo user without hitting the database
  if (opts.req.headers["x-demo-mode"] === "true") {
    return { req: opts.req, res: opts.res, user: DEMO_USER, isDemo: true };
  }

  try {
    // First try new JWT-based authentication
    const cookies = parseCookieHeader(opts.req.headers.cookie || "");
    const sessionToken = cookies.session_token;

    if (sessionToken) {
      user = await verifySessionToken(sessionToken);
    }

    // Fallback to legacy OAuth authentication if JWT fails
    if (!user) {
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
