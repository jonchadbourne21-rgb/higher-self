/**
 * Tests for 10-day free trial logic in subscriptions.ts
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getTrialDaysRemaining,
  isOnTrial,
  isTrialExpired,
} from "./subscriptions";

// ─── getTrialDaysRemaining ────────────────────────────────────────────────────

describe("getTrialDaysRemaining", () => {
  it("returns 10 when trial just started (same day)", () => {
    const now = new Date();
    expect(getTrialDaysRemaining(now)).toBe(10);
  });

  it("returns 5 when trial started 5 days ago", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(getTrialDaysRemaining(fiveDaysAgo)).toBe(5);
  });

  it("returns 1 when trial started 9 days ago", () => {
    const nineDaysAgo = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000);
    expect(getTrialDaysRemaining(nineDaysAgo)).toBe(1);
  });

  it("returns 0 when trial started exactly 10 days ago", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(getTrialDaysRemaining(tenDaysAgo)).toBe(0);
  });

  it("returns 0 when trial started 15 days ago (expired)", () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    expect(getTrialDaysRemaining(fifteenDaysAgo)).toBe(0);
  });

  it("returns 0 when trialStartDate is null", () => {
    expect(getTrialDaysRemaining(null)).toBe(0);
  });

  it("returns 0 when trialStartDate is undefined", () => {
    expect(getTrialDaysRemaining(undefined)).toBe(0);
  });

  it("never returns negative values", () => {
    const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    expect(getTrialDaysRemaining(hundredDaysAgo)).toBeGreaterThanOrEqual(0);
  });
});

// ─── isOnTrial ────────────────────────────────────────────────────────────────

describe("isOnTrial", () => {
  it("returns true when tier is free, status is active, and trial started today", () => {
    const now = new Date();
    expect(isOnTrial("free", "active", now)).toBe(true);
  });

  it("returns true when trial started 5 days ago", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(isOnTrial("free", "active", fiveDaysAgo)).toBe(true);
  });

  it("returns false when trial started 10 days ago (expired)", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(isOnTrial("free", "active", tenDaysAgo)).toBe(false);
  });

  it("returns false when tier is pro (paid user, not on trial)", () => {
    const now = new Date();
    expect(isOnTrial("pro", "active", now)).toBe(false);
  });

  it("returns false when tier is pro_voice (paid user, not on trial)", () => {
    const now = new Date();
    expect(isOnTrial("pro_voice", "active", now)).toBe(false);
  });

  it("returns false when status is canceled", () => {
    const now = new Date();
    expect(isOnTrial("free", "canceled", now)).toBe(false);
  });

  it("returns false when trialStartDate is null", () => {
    expect(isOnTrial("free", "active", null)).toBe(false);
  });

  it("returns false when trialStartDate is undefined", () => {
    expect(isOnTrial("free", "active", undefined)).toBe(false);
  });
});

// ─── isTrialExpired ───────────────────────────────────────────────────────────

describe("isTrialExpired", () => {
  it("returns true when free user's trial started 10+ days ago", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(isTrialExpired("free", tenDaysAgo)).toBe(true);
  });

  it("returns true when free user's trial started 30 days ago", () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(isTrialExpired("free", thirtyDaysAgo)).toBe(true);
  });

  it("returns false when free user's trial started 5 days ago (still active)", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(isTrialExpired("free", fiveDaysAgo)).toBe(false);
  });

  it("returns false when free user's trial started today", () => {
    const now = new Date();
    expect(isTrialExpired("free", now)).toBe(false);
  });

  it("returns false when tier is pro (paid users are not in trial)", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(isTrialExpired("pro", tenDaysAgo)).toBe(false);
  });

  it("returns false when tier is pro_voice (paid users are not in trial)", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(isTrialExpired("pro_voice", tenDaysAgo)).toBe(false);
  });

  it("returns false when trialStartDate is null (trial never started)", () => {
    expect(isTrialExpired("free", null)).toBe(false);
  });

  it("returns false when trialStartDate is undefined (trial never started)", () => {
    expect(isTrialExpired("free", undefined)).toBe(false);
  });
});

// ─── Integration: trial lifecycle ────────────────────────────────────────────

describe("trial lifecycle", () => {
  it("new user: trial is active, not expired", () => {
    const now = new Date();
    expect(isOnTrial("free", "active", now)).toBe(true);
    expect(isTrialExpired("free", now)).toBe(false);
    expect(getTrialDaysRemaining(now)).toBe(10);
  });

  it("mid-trial user (day 5): trial is active, not expired", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(isOnTrial("free", "active", fiveDaysAgo)).toBe(true);
    expect(isTrialExpired("free", fiveDaysAgo)).toBe(false);
    expect(getTrialDaysRemaining(fiveDaysAgo)).toBe(5);
  });

  it("expired trial user (day 11): trial is not active, is expired", () => {
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000);
    expect(isOnTrial("free", "active", elevenDaysAgo)).toBe(false);
    expect(isTrialExpired("free", elevenDaysAgo)).toBe(true);
    expect(getTrialDaysRemaining(elevenDaysAgo)).toBe(0);
  });

  it("paid pro user: never on trial, never expired", () => {
    const now = new Date();
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(isOnTrial("pro", "active", now)).toBe(false);
    expect(isOnTrial("pro", "active", oldDate)).toBe(false);
    expect(isTrialExpired("pro", oldDate)).toBe(false);
  });

  it("paid pro_voice user: never on trial, never expired", () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(isOnTrial("pro_voice", "active", oldDate)).toBe(false);
    expect(isTrialExpired("pro_voice", oldDate)).toBe(false);
  });
});
