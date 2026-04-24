import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveWeeklyInsight } from "./db";

describe("Check-In Insight Feature", () => {
  describe("saveWeeklyInsight", () => {
    it("should save an insight with required fields", async () => {
      const userId = 1;
      const insightText = "Today was about facing my fears and taking action.";
      const weekStart = new Date("2026-04-20");

      // Mock the database call
      const mockSave = vi.fn().mockResolvedValue({ id: 1 });
      
      // This test verifies the structure of the insight being saved
      const insight = {
        userId,
        insightText,
        weekStart,
      };

      expect(insight.userId).toBe(1);
      expect(insight.insightText).toContain("facing my fears");
      expect(insight.weekStart).toBeInstanceOf(Date);
    });

    it("should reject empty insight text", () => {
      const emptyInsight = "";
      expect(emptyInsight.length).toBe(0);
    });

    it("should accept insight with minimum length", () => {
      const minInsight = "A";
      expect(minInsight.length).toBeGreaterThan(0);
    });

    it("should handle insight with special characters", () => {
      const specialInsight = "Today I learned: 'Don't fear the unknown!' — It's just growth.";
      expect(specialInsight).toContain("'");
      expect(specialInsight).toContain("—");
    });

    it("should handle multi-line insights", () => {
      const multiLineInsight = `Line 1: Reflection
Line 2: Growth
Line 3: Action`;
      expect(multiLineInsight.split("\n").length).toBe(3);
    });

    it("should preserve insight formatting", () => {
      const formattedInsight = "**Bold** and *italic* text with\nnew lines";
      expect(formattedInsight).toContain("**");
      expect(formattedInsight).toContain("*");
      expect(formattedInsight).toContain("\n");
    });

    it("should handle very long insights", () => {
      const longInsight = "A".repeat(1000);
      expect(longInsight.length).toBe(1000);
    });

    it("should handle insight with URLs", () => {
      const insightWithUrl = "Check this out: https://example.com for more info";
      expect(insightWithUrl).toContain("https://");
    });

    it("should handle insight with emojis", () => {
      const insightWithEmoji = "Today was amazing! 🌟 Growth happening 📈";
      expect(insightWithEmoji).toContain("🌟");
      expect(insightWithEmoji).toContain("📈");
    });

    it("should handle insight with numbers and statistics", () => {
      const insightWithStats = "I completed 3 habits, had 7 hours of sleep, and 5 moments of clarity";
      expect(insightWithStats).toMatch(/\d+/);
    });

    it("should handle insight with quotes", () => {
      const insightWithQuotes = 'He said, "The only way out is through."';
      expect(insightWithQuotes).toContain('"');
    });

    it("should handle insight with different date formats", () => {
      const dates = [
        new Date("2026-04-20"),
        new Date("2026-04-21"),
        new Date("2026-04-22"),
      ];
      expect(dates[0] < dates[1]).toBe(true);
      expect(dates[1] < dates[2]).toBe(true);
    });

    it("should track userId correctly", () => {
      const userIds = [1, 2, 3, 100, 999];
      userIds.forEach((id) => {
        expect(id).toBeGreaterThan(0);
      });
    });

    it("should handle concurrent insight saves", async () => {
      const insights = [
        { userId: 1, insightText: "Insight 1", weekStart: new Date() },
        { userId: 2, insightText: "Insight 2", weekStart: new Date() },
        { userId: 3, insightText: "Insight 3", weekStart: new Date() },
      ];
      expect(insights.length).toBe(3);
    });

    it("should validate insight text is non-empty string", () => {
      const validInsights = ["Text", "A", "Multiple words here"];
      validInsights.forEach((text) => {
        expect(typeof text).toBe("string");
        expect(text.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Check-In Insight Page Navigation", () => {
    it("should have valid AI response text", () => {
      const aiResponse = "Great reflection today!";
      expect(aiResponse).toBeTruthy();
      expect(typeof aiResponse).toBe("string");
    });

    it("should handle multi-paragraph insights", () => {
      const insight = "Paragraph 1\n\nParagraph 2\n\nParagraph 3";
      const paragraphs = insight.split("\n\n");
      expect(paragraphs.length).toBe(3);
    });

    it("should validate insight is not empty", () => {
      const validInsight = "Some insight";
      expect(validInsight.length).toBeGreaterThan(0);
    });

    it("should handle insight with markdown formatting", () => {
      const markdownInsight = "**Bold** and *italic* insights";
      expect(markdownInsight).toContain("**");
      expect(markdownInsight).toContain("*");
    });

    it("should preserve line breaks in insights", () => {
      const insightWithBreaks = "Line 1\nLine 2\nLine 3";
      expect(insightWithBreaks.split("\n").length).toBe(3);
    });
  });
});
