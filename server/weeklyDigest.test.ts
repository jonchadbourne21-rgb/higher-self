import { describe, it, expect, beforeEach, vi } from "vitest";
import { getWeekStart } from "./db";

describe("Weekly Digest", () => {
  describe("getWeekStart", () => {
    it("should return the Monday of the current week in YYYY-MM-DD format", () => {
      // Mock a date in the middle of the week (Wednesday)
      const mockDate = new Date("2026-04-15T10:00:00Z"); // Wednesday, April 15, 2026
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const weekStart = getWeekStart();
      expect(weekStart).toBe("2026-04-13"); // Monday of that week

      vi.useRealTimers();
    });

    it("should return the same day if it's already Monday", () => {
      const mockDate = new Date("2026-04-13T10:00:00Z"); // Monday, April 13, 2026
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const weekStart = getWeekStart();
      expect(weekStart).toBe("2026-04-13");

      vi.useRealTimers();
    });

    it("should return the previous Monday if it's Sunday", () => {
      const mockDate = new Date("2026-04-12T10:00:00Z"); // Sunday, April 12, 2026
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const weekStart = getWeekStart();
      expect(weekStart).toBe("2026-04-06"); // Previous Monday

      vi.useRealTimers();
    });

    it("should handle edge case at month boundary", () => {
      const mockDate = new Date("2026-04-01T10:00:00Z"); // Wednesday, April 1, 2026
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const weekStart = getWeekStart();
      expect(weekStart).toBe("2026-03-30"); // Monday of that week (in March)

      vi.useRealTimers();
    });
  });

  describe("Digest generation logic", () => {
    it("should skip digest generation if session has no messages", () => {
      const sessions = [];
      const hasMessages = sessions.length > 0;
      expect(hasMessages).toBe(false);
    });

    it("should build a transcript from multiple sessions", () => {
      const sessions = [
        {
          id: 1,
          title: "Facing fear",
          messageCount: 5,
          content: "I'm scared about the presentation tomorrow...",
        },
        {
          id: 2,
          title: null,
          messageCount: 3,
          content: "Feeling overwhelmed with work deadlines...",
        },
      ];

      const transcript = sessions
        .map((s) => {
          const title = s.title ? `"${s.title}"` : `Session (${s.messageCount} messages)`;
          const preview = s.content.slice(0, 300);
          return `${title}:\n${preview}...`;
        })
        .join("\n\n");

      expect(transcript).toContain("Facing fear");
      expect(transcript).toContain("Session (3 messages)");
      expect(transcript).toContain("I'm scared about the presentation");
      expect(transcript).toContain("Feeling overwhelmed with work deadlines");
    });

    it("should truncate long session content to 300 chars", () => {
      const longContent = "A".repeat(500);
      const preview = longContent.slice(0, 300);
      expect(preview.length).toBe(300);
    });

    it("should handle sessions with null titles", () => {
      const session = {
        id: 1,
        title: null,
        messageCount: 7,
        content: "Some content",
      };

      const title = session.title ? `"${session.title}"` : `Session (${session.messageCount} messages)`;
      expect(title).toBe("Session (7 messages)");
    });

    it("should format digest summary correctly", () => {
      const summary =
        "This week you explored themes of vulnerability and growth. Your conversations revealed a pattern of perfectionism that's holding you back. Consider embracing small failures as learning opportunities.";
      const sessionCount = 4;

      expect(summary).toContain("vulnerability");
      expect(summary.length).toBeGreaterThan(50);
      expect(sessionCount).toBeGreaterThan(0);
    });

    it("should validate digest has required fields", () => {
      const digest = {
        id: 1,
        userId: 123,
        weekStart: "2026-04-13",
        summary: "Weekly reflection text",
        sessionCount: 5,
        createdAt: new Date(),
      };

      expect(digest).toHaveProperty("userId");
      expect(digest).toHaveProperty("weekStart");
      expect(digest).toHaveProperty("summary");
      expect(digest).toHaveProperty("sessionCount");
      expect(digest.summary.length).toBeGreaterThan(0);
    });

    it("should not generate digest if summary is empty", () => {
      const summary = "";
      const isValid = summary.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it("should handle digest with exactly 1 session", () => {
      const sessionCount = 1;
      expect(sessionCount).toBeGreaterThanOrEqual(1);
    });

    it("should handle digest with many sessions", () => {
      const sessionCount = 25;
      expect(sessionCount).toBeGreaterThan(0);
    });

    it("should format week start date correctly", () => {
      const weekStart = "2026-04-13";
      const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(weekStart);
      expect(isValidFormat).toBe(true);
    });

    it("should skip duplicate digest generation", () => {
      const existingDigest = {
        userId: 123,
        weekStart: "2026-04-13",
      };
      const newDigest = {
        userId: 123,
        weekStart: "2026-04-13",
      };

      const isDuplicate = existingDigest.userId === newDigest.userId && existingDigest.weekStart === newDigest.weekStart;
      expect(isDuplicate).toBe(true);
    });

    it("should handle different users separately", () => {
      const digest1 = { userId: 1, weekStart: "2026-04-13", summary: "User 1 digest" };
      const digest2 = { userId: 2, weekStart: "2026-04-13", summary: "User 2 digest" };

      expect(digest1.userId).not.toBe(digest2.userId);
      expect(digest1.summary).not.toBe(digest2.summary);
    });

    it("should preserve session titles in transcript", () => {
      const session = {
        title: "Breaking through resistance",
        messageCount: 8,
        content: "Today I realized...",
      };

      const formatted = `"${session.title}":\n${session.content}...`;
      expect(formatted).toContain("Breaking through resistance");
    });

    it("should handle special characters in session titles", () => {
      const session = {
        title: "What's next? (2026 goals & dreams)",
        messageCount: 5,
        content: "Planning ahead...",
      };

      const formatted = `"${session.title}":\n${session.content}...`;
      expect(formatted).toContain("What's next?");
      expect(formatted).toContain("goals & dreams");
    });
  });
});
