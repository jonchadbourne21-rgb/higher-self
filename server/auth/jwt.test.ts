/**
 * JWT Authentication Flow — Mock-Based Vitest Tests
 * ──────────────────────────────────────────────────
 * Tests for createSessionAndToken, revokeSession, and verifySessionToken.
 * All database interactions are mocked so no real DB connection is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the database layer ──────────────────────────────────────────────────

const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue(undefined),
});
const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  }),
});
const mockFindFirstSession = vi.fn();
const mockFindFirstUser = vi.fn();

vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    query: {
      sessions: { findFirst: (...args: unknown[]) => mockFindFirstSession(...args) },
      users: { findFirst: (...args: unknown[]) => mockFindFirstUser(...args) },
    },
  }),
}));

import { createSessionAndToken, revokeSession } from "./jwt";
import { verifySessionToken } from "./validator";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("JWT Authentication Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSessionAndToken", () => {
    it("should create a session and return a valid JWT token", async () => {
      const { token, sessionId, maxAge } = await createSessionAndToken(42);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT has 3 parts
      expect(sessionId).toMatch(/^sess_/);
      expect(maxAge).toBe(600); // 10 minutes
    });

    it("should insert a session row in the database", async () => {
      await createSessionAndToken(42);

      expect(mockInsert).toHaveBeenCalled();
      const insertValues = mockInsert.mock.results[0]?.value.values;
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 42,
          revokedAt: null,
        })
      );
    });

    it("should set session expiration to approximately 30 days", async () => {
      await createSessionAndToken(42);

      const insertValues = mockInsert.mock.results[0]?.value.values;
      const callArgs = insertValues.mock.calls[0][0];
      const expiresAt = callArgs.expiresAt as Date;

      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const diff = expiresAt.getTime() - Date.now();
      expect(Math.abs(diff - thirtyDaysMs)).toBeLessThan(5000); // Within 5 seconds
    });

    it("should store userAgent and ipAddress when provided", async () => {
      await createSessionAndToken(42, "Mozilla/5.0", "192.168.1.1");

      const insertValues = mockInsert.mock.results[0]?.value.values;
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: "Mozilla/5.0",
          ipAddress: "192.168.1.1",
        })
      );
    });

    it("should generate unique session IDs", async () => {
      const result1 = await createSessionAndToken(1);
      const result2 = await createSessionAndToken(1);

      expect(result1.sessionId).not.toBe(result2.sessionId);
    });

    it("JWT payload should contain session ID and user ID", async () => {
      const { token } = await createSessionAndToken(42);

      const parts = token.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));

      expect(payload).toHaveProperty("sid");
      expect(payload).toHaveProperty("uid");
      expect(payload.uid).toBe(42);
      expect(payload.sid).toMatch(/^sess_/);
    });

    it("JWT should expire in 10 minutes", async () => {
      const { token } = await createSessionAndToken(42);

      const parts = token.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));

      const ttlSeconds = payload.exp - payload.iat;
      expect(ttlSeconds).toBe(600); // 10 minutes
    });

    it("JWT should NOT contain user data (name, email, role)", async () => {
      const { token } = await createSessionAndToken(42);

      const parts = token.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));

      expect(payload).not.toHaveProperty("name");
      expect(payload).not.toHaveProperty("email");
      expect(payload).not.toHaveProperty("role");
    });
  });

  describe("verifySessionToken", () => {
    it("should verify a valid JWT and return the user", async () => {
      const { token, sessionId } = await createSessionAndToken(42);

      // Mock session lookup: active, not revoked, not expired
      mockFindFirstSession.mockResolvedValueOnce({
        id: sessionId,
        userId: 42,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        createdAt: new Date(),
      });

      // Mock user lookup
      const mockUser = {
        id: 42,
        openId: "test-open-id",
        name: "Test User",
        email: "test@example.com",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
      mockFindFirstUser.mockResolvedValueOnce(mockUser);

      const user = await verifySessionToken(token);

      expect(user).toBeDefined();
      expect(user!.id).toBe(42);
      expect(user!.name).toBe("Test User");
    });

    it("should reject a revoked session", async () => {
      const { token, sessionId } = await createSessionAndToken(42);

      // Mock session lookup: revoked
      mockFindFirstSession.mockResolvedValueOnce({
        id: sessionId,
        userId: 42,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(), // Session is revoked
        createdAt: new Date(),
      });

      const user = await verifySessionToken(token);
      expect(user).toBeNull();
    });

    it("should reject an expired session", async () => {
      const { token, sessionId } = await createSessionAndToken(42);

      // Mock session lookup: expired
      mockFindFirstSession.mockResolvedValueOnce({
        id: sessionId,
        userId: 42,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        revokedAt: null,
        createdAt: new Date(),
      });

      const user = await verifySessionToken(token);
      expect(user).toBeNull();
    });

    it("should return null for a non-existent session", async () => {
      const { token } = await createSessionAndToken(42);

      // Mock session lookup: not found
      mockFindFirstSession.mockResolvedValueOnce(null);

      const user = await verifySessionToken(token);
      expect(user).toBeNull();
    });

    it("should reject an invalid JWT signature", async () => {
      const { token } = await createSessionAndToken(42);

      // Tamper with the token
      const parts = token.split(".");
      const tamperedToken = parts[0] + "." + parts[1] + ".invalidsignature";

      const user = await verifySessionToken(tamperedToken);
      expect(user).toBeNull();
    });

    it("should reject a completely invalid token", async () => {
      const user = await verifySessionToken("not-a-jwt");
      expect(user).toBeNull();
    });

    it("should reject an empty token", async () => {
      const user = await verifySessionToken("");
      expect(user).toBeNull();
    });

    it("should return null when user is not found in database", async () => {
      const { token, sessionId } = await createSessionAndToken(42);

      // Mock session lookup: valid
      mockFindFirstSession.mockResolvedValueOnce({
        id: sessionId,
        userId: 42,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        createdAt: new Date(),
      });

      // Mock user lookup: not found
      mockFindFirstUser.mockResolvedValueOnce(null);

      const user = await verifySessionToken(token);
      expect(user).toBeNull();
    });
  });

  describe("revokeSession", () => {
    it("should call update on the sessions table", async () => {
      await revokeSession("sess_test123");

      expect(mockUpdate).toHaveBeenCalled();
    });

    it("should set revokedAt to a Date", async () => {
      await revokeSession("sess_test123");

      const setFn = mockUpdate.mock.results[0]?.value.set;
      expect(setFn).toHaveBeenCalledWith(
        expect.objectContaining({
          revokedAt: expect.any(Date),
        })
      );
    });

    it("session should be revocable independently of JWT expiration", async () => {
      const { token, sessionId } = await createSessionAndToken(42);

      // First verify: session is valid
      mockFindFirstSession.mockResolvedValueOnce({
        id: sessionId,
        userId: 42,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        createdAt: new Date(),
      });
      mockFindFirstUser.mockResolvedValueOnce({ id: 42, name: "Test" });

      const userBefore = await verifySessionToken(token);
      expect(userBefore).toBeDefined();

      // Revoke the session
      await revokeSession(sessionId);

      // Second verify: session is now revoked
      mockFindFirstSession.mockResolvedValueOnce({
        id: sessionId,
        userId: 42,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(), // Now revoked
        createdAt: new Date(),
      });

      const userAfter = await verifySessionToken(token);
      expect(userAfter).toBeNull();
    });

    it("should allow immediate re-login after logout", async () => {
      // Create first session
      const { sessionId: oldSessionId } = await createSessionAndToken(42);

      // Revoke (logout)
      await revokeSession(oldSessionId);

      // Create new session (re-login)
      const { token: newToken, sessionId: newSessionId } = await createSessionAndToken(42);

      // New session is valid
      mockFindFirstSession.mockResolvedValueOnce({
        id: newSessionId,
        userId: 42,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        createdAt: new Date(),
      });
      mockFindFirstUser.mockResolvedValueOnce({ id: 42, name: "Test" });

      const user = await verifySessionToken(newToken);
      expect(user).toBeDefined();
      expect(user!.id).toBe(42);
    });
  });
});
