import { describe, it, expect } from "vitest";
import {
  calcCheckinScore,
  calcJournalTrendScore,
  calcHabitScore,
  calcProsodyScore,
  calculateEntropyScore,
  ENTROPY_THRESHOLD,
  CONSECUTIVE_DAYS_REQUIRED,
} from "./db/entropyDetection";

describe("Entropy Detection Engine", () => {
  describe("calcCheckinScore", () => {
    it("returns 0 for 0 days since check-in", () => {
      expect(calcCheckinScore(0)).toBe(0);
    });

    it("returns ~43 for 3 days since check-in", () => {
      const score = calcCheckinScore(3);
      expect(score).toBeCloseTo(42.86, 1);
    });

    it("returns 100 for 7 days since check-in", () => {
      expect(calcCheckinScore(7)).toBe(100);
    });

    it("caps at 100 for more than 7 days", () => {
      expect(calcCheckinScore(14)).toBe(100);
      expect(calcCheckinScore(30)).toBe(100);
    });
  });

  describe("calcJournalTrendScore", () => {
    it("returns 80 when user has no journal entries", () => {
      expect(calcJournalTrendScore(0, 0, false)).toBe(80);
    });

    it("returns 40 when only recent entries exist (no previous)", () => {
      expect(calcJournalTrendScore(500, 0, true)).toBe(40);
    });

    it("returns low score when entries are growing (ratio > 1.5)", () => {
      expect(calcJournalTrendScore(300, 100, true)).toBe(0);
    });

    it("returns ~30 when entries are stable (ratio = 1.0)", () => {
      expect(calcJournalTrendScore(200, 200, true)).toBe(30);
    });

    it("returns high score when entries are declining (ratio < 1.0)", () => {
      const score = calcJournalTrendScore(50, 200, true);
      expect(score).toBeGreaterThan(60);
    });

    it("returns 100 when entries dropped to zero", () => {
      expect(calcJournalTrendScore(0, 200, true)).toBe(100);
    });
  });

  describe("calcHabitScore", () => {
    it("returns 50 when user has no habits", () => {
      expect(calcHabitScore(0, false)).toBe(50);
    });

    it("returns 0 for 100% completion rate", () => {
      expect(calcHabitScore(1.0, true)).toBe(0);
    });

    it("returns 100 for 0% completion rate", () => {
      expect(calcHabitScore(0, true)).toBe(100);
    });

    it("returns 50 for 50% completion rate", () => {
      expect(calcHabitScore(0.5, true)).toBe(50);
    });
  });

  describe("calcProsodyScore", () => {
    it("returns 50 when no voice sessions available", () => {
      expect(calcProsodyScore(null)).toBe(50);
    });

    it("returns 0 for max energy (1.0)", () => {
      expect(calcProsodyScore(1.0)).toBe(0);
    });

    it("returns 100 for min energy (0.0)", () => {
      expect(calcProsodyScore(0.0)).toBe(100);
    });

    it("returns 50 for mid energy (0.5)", () => {
      expect(calcProsodyScore(0.5)).toBe(50);
    });
  });

  describe("calculateEntropyScore", () => {
    it("returns 0 when all components are 0", () => {
      expect(
        calculateEntropyScore({
          checkinScore: 0,
          journalScore: 0,
          habitScore: 0,
          prosodyScore: 0,
        })
      ).toBe(0);
    });

    it("returns 100 when all components are 100", () => {
      expect(
        calculateEntropyScore({
          checkinScore: 100,
          journalScore: 100,
          habitScore: 100,
          prosodyScore: 100,
        })
      ).toBe(100);
    });

    it("applies correct weights (30%, 20%, 30%, 20%)", () => {
      // Only checkin at 100, rest at 0 → 30
      expect(
        calculateEntropyScore({
          checkinScore: 100,
          journalScore: 0,
          habitScore: 0,
          prosodyScore: 0,
        })
      ).toBe(30);

      // Only journal at 100, rest at 0 → 20
      expect(
        calculateEntropyScore({
          checkinScore: 0,
          journalScore: 100,
          habitScore: 0,
          prosodyScore: 0,
        })
      ).toBe(20);

      // Only habits at 100, rest at 0 → 30
      expect(
        calculateEntropyScore({
          checkinScore: 0,
          journalScore: 0,
          habitScore: 100,
          prosodyScore: 0,
        })
      ).toBe(30);

      // Only prosody at 100, rest at 0 → 20
      expect(
        calculateEntropyScore({
          checkinScore: 0,
          journalScore: 0,
          habitScore: 0,
          prosodyScore: 100,
        })
      ).toBe(20);
    });

    it("clamps to 0-100 range", () => {
      expect(
        calculateEntropyScore({
          checkinScore: -50,
          journalScore: -50,
          habitScore: -50,
          prosodyScore: -50,
        })
      ).toBe(0);
    });
  });

  describe("threshold constants", () => {
    it("threshold is 65", () => {
      expect(ENTROPY_THRESHOLD).toBe(65);
    });

    it("requires 2 consecutive days", () => {
      expect(CONSECUTIVE_DAYS_REQUIRED).toBe(2);
    });
  });

  describe("realistic scenarios", () => {
    it("active user has low entropy", () => {
      // Checked in today, growing journal, 80% habits, energetic voice
      const score = calculateEntropyScore({
        checkinScore: calcCheckinScore(0),
        journalScore: calcJournalTrendScore(300, 200, true),
        habitScore: calcHabitScore(0.8, true),
        prosodyScore: calcProsodyScore(0.7),
      });
      expect(score).toBeLessThan(30);
    });

    it("disengaging user has high entropy", () => {
      // 5 days since check-in, declining journal, 20% habits, low energy
      const score = calculateEntropyScore({
        checkinScore: calcCheckinScore(5),
        journalScore: calcJournalTrendScore(50, 200, true),
        habitScore: calcHabitScore(0.2, true),
        prosodyScore: calcProsodyScore(0.2),
      });
      expect(score).toBeGreaterThan(65);
    });

    it("new user with no data gets moderate entropy", () => {
      // No check-ins (30 days default), no journal, no habits, no voice
      const score = calculateEntropyScore({
        checkinScore: calcCheckinScore(30),
        journalScore: calcJournalTrendScore(0, 0, false),
        habitScore: calcHabitScore(0, false),
        prosodyScore: calcProsodyScore(null),
      });
      // 100*0.3 + 80*0.2 + 50*0.3 + 50*0.2 = 30 + 16 + 15 + 10 = 71
      expect(score).toBe(71);
    });
  });
});
