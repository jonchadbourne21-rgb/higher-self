import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifySessionToken } from "../auth/validator";
import { parse as parseCookieHeader } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  isDemo?: boolean;
};

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
  if (opts.req.headers["x-demo-mode"] === "true") {
    return { req: opts.req, res: opts.res, user: DEMO_USER, isDemo: true };
  }

  let user: User | null = null;
  try {
    const cookies = parseCookieHeader(opts.req.headers.cookie || "");
    const cookieToken = cookies.session_token;
    const authHeader = opts.req.headers.authorization;
    const bearerToken =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : undefined;
    const sessionToken = bearerToken || cookieToken;

    if (sessionToken) {
      user = await verifySessionToken(sessionToken);
    }
  } catch {
    // Authentication is optional for public procedures. Protected procedures
    // enforce user presence downstream.
    user = null;
  }

  return { req: opts.req, res: opts.res, user };
}
