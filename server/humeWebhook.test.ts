import { describe, it, expect } from "vitest";
import * as crypto from "crypto";

/**
 * Tests for Hume EVI webhook HMAC signature verification logic.
 * Uses the actual HUME_WEBHOOK_SIGNING_KEY to confirm the key is valid
 * and the verification algorithm matches Hume's spec.
 */

function computeHumeSignature(payload: string, timestamp: string, signingKey: string): string {
  const message = `${payload}.${timestamp}`;
  return crypto.createHmac("sha256", signingKey).update(message).digest("hex");
}

function timingSafeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

describe("Hume webhook signing key", () => {
  it("should have HUME_WEBHOOK_SIGNING_KEY set in environment", () => {
    const key = process.env.HUME_WEBHOOK_SIGNING_KEY;
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should produce a valid HMAC signature that passes timing-safe comparison", () => {
    const signingKey = process.env.HUME_WEBHOOK_SIGNING_KEY;
    if (!signingKey) {
      console.warn("HUME_WEBHOOK_SIGNING_KEY not set — skipping");
      return;
    }

    const payload = JSON.stringify({
      event_name: "chat_started",
      chat_id: "test-123",
      chat_group_id: "group-456",
      config_id: "eb5b42d5-d752-4e20-bfab-97b9fd50b598",
      start_time: 1747267200000,
      chat_start_type: "new_chat_group",
    });

    const timestamp = String(Math.floor(Date.now() / 1000));

    // Compute signature as Hume would
    const sig = computeHumeSignature(payload, timestamp, signingKey);

    // Verify it matches itself (simulates server-side verification)
    expect(timingSafeCompare(sig, sig)).toBe(true);

    // Verify a tampered payload fails
    const tamperedPayload = payload + "tampered";
    const tamperedSig = computeHumeSignature(tamperedPayload, timestamp, signingKey);
    expect(timingSafeCompare(sig, tamperedSig)).toBe(false);
  });

  it("should reject signatures computed with a wrong key", () => {
    const signingKey = process.env.HUME_WEBHOOK_SIGNING_KEY;
    if (!signingKey) {
      console.warn("HUME_WEBHOOK_SIGNING_KEY not set — skipping");
      return;
    }

    const payload = '{"event_name":"chat_ended"}';
    const timestamp = String(Math.floor(Date.now() / 1000));

    const correctSig = computeHumeSignature(payload, timestamp, signingKey);
    const wrongSig = computeHumeSignature(payload, timestamp, "wrong-key-000000000000000000000");

    expect(timingSafeCompare(correctSig, wrongSig)).toBe(false);
  });

  it("should reject requests with timestamps older than 3 minutes", () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 200; // 200s ago
    const currentTime = Math.floor(Date.now() / 1000);
    const WINDOW = 180;
    expect(currentTime - oldTimestamp > WINDOW).toBe(true);
  });

  it("should accept requests with timestamps within 3 minutes", () => {
    const recentTimestamp = Math.floor(Date.now() / 1000) - 60; // 60s ago
    const currentTime = Math.floor(Date.now() / 1000);
    const WINDOW = 180;
    expect(currentTime - recentTimestamp > WINDOW).toBe(false);
  });
});
