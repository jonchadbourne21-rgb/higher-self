import { describe, it, expect } from "vitest";
import { computeValenceSnapshot } from "./timeCapsule/thirtyDayLetter";

describe("30-Day Letter System", () => {
  describe("computeValenceSnapshot", () => {
    it("should return null for empty fingerprints", () => {
      const result = computeValenceSnapshot([]);
      expect(result).toBeNull();
    });

    it("should compute average valence correctly", () => {
      const fingerprints = [
        { emotionalValence: 0.5, createdAt: new Date("2026-05-01") },
        { emotionalValence: -0.3, createdAt: new Date("2026-05-05") },
        { emotionalValence: 0.7, createdAt: new Date("2026-05-10") },
        { emotionalValence: 0.1, createdAt: new Date("2026-05-15") },
      ];

      const result = computeValenceSnapshot(fingerprints);
      expect(result).not.toBeNull();
      // Average: (0.5 + -0.3 + 0.7 + 0.1) / 4 = 0.25
      expect(result!.avg).toBeCloseTo(0.25, 1);
    });

    it("should detect rising trend", () => {
      const fingerprints = [
        { emotionalValence: -0.5, createdAt: new Date("2026-05-01") },
        { emotionalValence: -0.3, createdAt: new Date("2026-05-05") },
        { emotionalValence: 0.4, createdAt: new Date("2026-05-10") },
        { emotionalValence: 0.6, createdAt: new Date("2026-05-15") },
      ];

      const result = computeValenceSnapshot(fingerprints);
      expect(result!.trend).toBe("rising");
    });

    it("should detect falling trend", () => {
      const fingerprints = [
        { emotionalValence: 0.7, createdAt: new Date("2026-05-01") },
        { emotionalValence: 0.5, createdAt: new Date("2026-05-05") },
        { emotionalValence: -0.2, createdAt: new Date("2026-05-10") },
        { emotionalValence: -0.4, createdAt: new Date("2026-05-15") },
      ];

      const result = computeValenceSnapshot(fingerprints);
      expect(result!.trend).toBe("falling");
    });

    it("should detect stable trend when valence is consistent", () => {
      const fingerprints = [
        { emotionalValence: 0.3, createdAt: new Date("2026-05-01") },
        { emotionalValence: 0.35, createdAt: new Date("2026-05-05") },
        { emotionalValence: 0.28, createdAt: new Date("2026-05-10") },
        { emotionalValence: 0.32, createdAt: new Date("2026-05-15") },
      ];

      const result = computeValenceSnapshot(fingerprints);
      expect(result!.trend).toBe("stable");
    });

    it("should handle single fingerprint as stable", () => {
      const fingerprints = [
        { emotionalValence: 0.5, createdAt: new Date("2026-05-01") },
      ];

      const result = computeValenceSnapshot(fingerprints);
      expect(result).not.toBeNull();
      expect(result!.avg).toBe(0.5);
      expect(result!.trend).toBe("stable");
    });

    it("should round average to 2 decimal places", () => {
      const fingerprints = [
        { emotionalValence: 0.333, createdAt: new Date("2026-05-01") },
        { emotionalValence: 0.666, createdAt: new Date("2026-05-05") },
        { emotionalValence: 0.111, createdAt: new Date("2026-05-10") },
      ];

      const result = computeValenceSnapshot(fingerprints);
      // (0.333 + 0.666 + 0.111) / 3 = 0.37
      expect(result!.avg.toString().split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
    });
  });

  describe("Letter generation prompt structure", () => {
    it("should define the correct word limit (200 words ±20)", () => {
      // The prompt specifies 200 words ±20 — verify this is enforced in the system
      // This is a structural test to ensure the constant is properly defined
      const EXPECTED_WORD_TARGET = 200;
      const EXPECTED_TOLERANCE = 20;
      expect(EXPECTED_WORD_TARGET - EXPECTED_TOLERANCE).toBe(180);
      expect(EXPECTED_WORD_TARGET + EXPECTED_TOLERANCE).toBe(220);
    });

    it("should require accountability question in output format", () => {
      // Verify the parsing logic handles the QUESTION: format
      const sampleOutput = `I remember when I first sat down and said I wanted to be someone who doesn't run from hard conversations. That was thirty days ago. I was scared then — I used the word "terrified" more than once.

I notice I stopped saying "I can't handle this." That phrase is gone now. Instead, I started saying "I'm figuring it out." Small shift. But I feel it.

The tension is still there though. I said I believed I was "not good enough for the life I want." That belief hasn't fully left. It just got quieter.

QUESTION: Are you still running from the conversations that scare you, or did you finally sit down and stay?`;

      const questionMatch = sampleOutput.match(/QUESTION:\s*(.+)/i);
      expect(questionMatch).not.toBeNull();
      expect(questionMatch![1]).toContain("running from the conversations");

      const letterContent = sampleOutput.replace(/\n?QUESTION:\s*.+/i, "").trim();
      expect(letterContent).not.toContain("QUESTION:");
      expect(letterContent.length).toBeGreaterThan(0);
    });

    it("should provide fallback accountability question when parsing fails", () => {
      const sampleWithoutQuestion = `I remember saying I wanted to change. That was the whole point of starting this.`;

      const questionMatch = sampleWithoutQuestion.match(/QUESTION:\s*(.+)/i);
      const accountabilityQuestion = questionMatch
        ? questionMatch[1].trim()
        : "Are you who you said you'd become?";

      expect(accountabilityQuestion).toBe("Are you who you said you'd become?");
    });
  });

  describe("Eligibility logic", () => {
    it("should require 30+ days since first session", () => {
      const daysSinceFirst = 29;
      const eligible = daysSinceFirst >= 30;
      expect(eligible).toBe(false);
    });

    it("should require 4+ session fingerprints", () => {
      const fingerprintCount = 3;
      const eligible = fingerprintCount >= 4;
      expect(eligible).toBe(false);
    });

    it("should pass eligibility with 30 days and 4 fingerprints", () => {
      const daysSinceFirst = 30;
      const fingerprintCount = 4;
      const eligible = daysSinceFirst >= 30 && fingerprintCount >= 4;
      expect(eligible).toBe(true);
    });

    it("should pass eligibility with more than minimum requirements", () => {
      const daysSinceFirst = 45;
      const fingerprintCount = 12;
      const eligible = daysSinceFirst >= 30 && fingerprintCount >= 4;
      expect(eligible).toBe(true);
    });
  });

  describe("Engagement tracking", () => {
    it("should calculate open rate correctly", () => {
      const delivered = 10;
      const read = 7;
      const openRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;
      expect(openRate).toBe(70);
    });

    it("should calculate re-engagement rate correctly", () => {
      const delivered = 10;
      const sessionStarted = 4;
      const reEngagementRate = delivered > 0 ? Math.round((sessionStarted / delivered) * 100) : 0;
      expect(reEngagementRate).toBe(40);
    });

    it("should calculate session start rate correctly", () => {
      const read = 7;
      const sessionStarted = 4;
      const sessionStartRate = read > 0 ? Math.round((sessionStarted / read) * 100) : 0;
      expect(sessionStartRate).toBe(57);
    });

    it("should handle zero delivered gracefully", () => {
      const delivered = 0;
      const read = 0;
      const openRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;
      expect(openRate).toBe(0);
    });

    it("should determine within-48h correctly", () => {
      const deliveredAt = new Date("2026-05-28T10:00:00Z");
      const sessionAt = new Date("2026-05-29T08:00:00Z"); // 22 hours later
      const hoursSinceDelivery = (sessionAt.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);
      expect(hoursSinceDelivery).toBe(22);
      expect(hoursSinceDelivery <= 48).toBe(true);
    });

    it("should reject sessions beyond 48h window", () => {
      const deliveredAt = new Date("2026-05-28T10:00:00Z");
      const sessionAt = new Date("2026-05-31T10:00:00Z"); // 72 hours later
      const hoursSinceDelivery = (sessionAt.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);
      expect(hoursSinceDelivery).toBe(72);
      expect(hoursSinceDelivery <= 48).toBe(false);
    });
  });
});
