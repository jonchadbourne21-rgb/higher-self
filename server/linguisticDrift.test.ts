import { describe, it, expect } from "vitest";
import {
  extractSelfDescriptiveVocabulary,
  compareVocabulary,
  computeDriftScore,
  getWeekStartUTC,
} from "./db/linguisticDrift";

describe("Linguistic Drift Tracker", () => {
  describe("extractSelfDescriptiveVocabulary", () => {
    it("should extract vocabulary from self-descriptive statements", () => {
      const texts = [
        "I am becoming more confident in my decisions.",
        "I feel overwhelmed by responsibilities sometimes.",
        "I'm learning to set boundaries with people.",
        "I believe I can grow through this challenge.",
      ];

      const vocab = extractSelfDescriptiveVocabulary(texts);

      expect(vocab.size).toBeGreaterThan(0);
      // Should find words from self-descriptive statements
      expect(vocab.has("confident") || vocab.has("becoming")).toBe(true);
    });

    it("should exclude stop words", () => {
      const texts = [
        "I am the person who is very much like that.",
        "I feel that this is something I should do.",
      ];

      const vocab = extractSelfDescriptiveVocabulary(texts);

      // Stop words should not appear
      expect(vocab.has("the")).toBe(false);
      expect(vocab.has("very")).toBe(false);
      expect(vocab.has("that")).toBe(false);
      expect(vocab.has("this")).toBe(false);
    });

    it("should handle empty input", () => {
      const vocab = extractSelfDescriptiveVocabulary([]);
      expect(vocab.size).toBe(0);
    });

    it("should handle text with no self-descriptive markers", () => {
      const texts = [
        "The weather is nice today.",
        "Let's go to the store.",
        "What time is the meeting?",
      ];

      const vocab = extractSelfDescriptiveVocabulary(texts);
      // May still find some via the adjective pattern, but should be minimal
      expect(vocab.size).toBeLessThan(5);
    });

    it("should detect adjectives used with I am/I'm", () => {
      const texts = [
        "I'm resilient and I'm determined to succeed.",
        "I am grateful for my progress.",
      ];

      const vocab = extractSelfDescriptiveVocabulary(texts);
      expect(vocab.has("resilient") || vocab.has("determined") || vocab.has("grateful")).toBe(true);
    });
  });

  describe("compareVocabulary", () => {
    it("should identify retired words", () => {
      const previous = new Map([
        ["anxious", 3],
        ["stuck", 2],
        ["hopeful", 1],
      ]);
      const current = new Map([
        ["hopeful", 2],
        ["growing", 1],
      ]);

      const result = compareVocabulary(previous, current);

      expect(result.retired).toContain("anxious");
      expect(result.retired).toContain("stuck");
      expect(result.retired).not.toContain("hopeful");
    });

    it("should identify new words", () => {
      const previous = new Map([
        ["anxious", 3],
        ["stuck", 2],
      ]);
      const current = new Map([
        ["anxious", 1],
        ["confident", 2],
        ["growing", 1],
      ]);

      const result = compareVocabulary(previous, current);

      expect(result.newWords).toContain("confident");
      expect(result.newWords).toContain("growing");
      expect(result.newWords).not.toContain("anxious");
    });

    it("should identify shared words", () => {
      const previous = new Map([
        ["learning", 2],
        ["growing", 1],
      ]);
      const current = new Map([
        ["learning", 3],
        ["growing", 2],
        ["thriving", 1],
      ]);

      const result = compareVocabulary(previous, current);

      expect(result.shared).toContain("learning");
      expect(result.shared).toContain("growing");
    });

    it("should handle empty maps", () => {
      const empty = new Map<string, number>();
      const filled = new Map([["word", 1]]);

      const result1 = compareVocabulary(empty, filled);
      expect(result1.retired).toHaveLength(0);
      expect(result1.newWords).toContain("word");

      const result2 = compareVocabulary(filled, empty);
      expect(result2.retired).toContain("word");
      expect(result2.newWords).toHaveLength(0);
    });
  });

  describe("computeDriftScore", () => {
    it("should return positive score when new words align with goals", () => {
      const newWords = ["confident", "leadership", "discipline"];
      const retiredWords = ["lazy", "distracted"];
      const goalText = "I want to become a confident leader with strong discipline";

      const score = computeDriftScore(newWords, retiredWords, goalText);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should return negative score when retiring goal-aligned words", () => {
      const newWords = ["overwhelmed", "stuck"];
      const retiredWords = ["confident", "growing", "leadership"];
      const goalText = "I want to grow into a confident leader";

      const score = computeDriftScore(newWords, retiredWords, goalText);

      expect(score).toBeLessThan(0);
      expect(score).toBeGreaterThanOrEqual(-1);
    });

    it("should return 0 when no goals are set", () => {
      const score = computeDriftScore(["word1"], ["word2"], "");
      expect(score).toBe(0);
    });

    it("should return 0 when no vocabulary changes", () => {
      const score = computeDriftScore([], [], "Some goal text here");
      expect(score).toBe(0);
    });

    it("should give positive signal for retiring negative self-talk", () => {
      const newWords = ["capable"];
      const retiredWords = ["worthless", "hopeless", "failure"];
      const goalText = "I want to feel worthy and capable";

      const score = computeDriftScore(newWords, retiredWords, goalText);

      // Retiring negative self-talk + adopting goal-aligned words = strong positive
      expect(score).toBeGreaterThan(0);
    });

    it("should give negative signal for adopting negative self-talk", () => {
      const newWords = ["hopeless", "stuck", "worthless"];
      const retiredWords = ["hopeful"];
      const goalText = "I want to feel confident and worthy";

      const score = computeDriftScore(newWords, retiredWords, goalText);

      expect(score).toBeLessThan(0);
    });

    it("should always return a value between -1 and 1", () => {
      // Extreme case with many signals
      const newWords = Array(20).fill("confident");
      const retiredWords = Array(20).fill("worthless");
      const goalText = "confident strong capable worthy";

      const score = computeDriftScore(newWords, retiredWords, goalText);

      expect(score).toBeGreaterThanOrEqual(-1);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe("getWeekStartUTC", () => {
    it("should return Monday 00:00 UTC for a Wednesday", () => {
      // 2026-05-27 is a Wednesday
      const wed = new Date("2026-05-27T15:30:00Z");
      const weekStart = getWeekStartUTC(wed);

      expect(weekStart.getUTCDay()).toBe(1); // Monday
      expect(weekStart.getUTCHours()).toBe(0);
      expect(weekStart.getUTCMinutes()).toBe(0);
      expect(weekStart.getUTCDate()).toBe(25); // May 25, 2026 is Monday
    });

    it("should return same Monday for a Monday input", () => {
      // 2026-05-25 is a Monday
      const mon = new Date("2026-05-25T10:00:00Z");
      const weekStart = getWeekStartUTC(mon);

      expect(weekStart.getUTCDay()).toBe(1);
      expect(weekStart.getUTCDate()).toBe(25);
    });

    it("should return previous Monday for a Sunday", () => {
      // 2026-05-31 is a Sunday
      const sun = new Date("2026-05-31T23:59:59Z");
      const weekStart = getWeekStartUTC(sun);

      expect(weekStart.getUTCDay()).toBe(1); // Monday
      expect(weekStart.getUTCDate()).toBe(25); // May 25
    });
  });
});
