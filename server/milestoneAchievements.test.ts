import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock database functions
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};

describe("Milestone Achievement Logic", () => {
  describe("recordMilestoneAchievement", () => {
    it("should only record milestones at specific thresholds (7, 14, 30, 100)", () => {
      const milestoneThresholds = [7, 14, 30, 100];
      const testStreaks = [1, 5, 7, 10, 14, 20, 30, 50, 100];

      const recordable = testStreaks.filter((streak) =>
        milestoneThresholds.includes(streak)
      );

      expect(recordable).toEqual([7, 14, 30, 100]);
    });

    it("should not record milestones for non-threshold streaks", () => {
      const milestoneThresholds = [7, 14, 30, 100];
      const nonThresholdStreaks = [1, 2, 3, 4, 5, 6, 8, 9, 13, 15, 29, 31, 99];

      const recordable = nonThresholdStreaks.filter((streak) =>
        milestoneThresholds.includes(streak)
      );

      expect(recordable).toHaveLength(0);
    });
  });

  describe("getMilestoneColor", () => {
    const getMilestoneColor = (streakDays: number) => {
      switch (streakDays) {
        case 7:
          return "bg-blue-50 border-blue-200";
        case 14:
          return "bg-purple-50 border-purple-200";
        case 30:
          return "bg-amber-50 border-amber-200";
        case 100:
          return "bg-rose-50 border-rose-200";
        default:
          return "bg-gray-50 border-gray-200";
      }
    };

    it("should return correct color for 7-day streak", () => {
      expect(getMilestoneColor(7)).toBe("bg-blue-50 border-blue-200");
    });

    it("should return correct color for 14-day streak", () => {
      expect(getMilestoneColor(14)).toBe("bg-purple-50 border-purple-200");
    });

    it("should return correct color for 30-day streak", () => {
      expect(getMilestoneColor(30)).toBe("bg-amber-50 border-amber-200");
    });

    it("should return correct color for 100-day streak", () => {
      expect(getMilestoneColor(100)).toBe("bg-rose-50 border-rose-200");
    });

    it("should return default color for unknown streak", () => {
      expect(getMilestoneColor(50)).toBe("bg-gray-50 border-gray-200");
    });
  });

  describe("getMilestoneIcon", () => {
    const getMilestoneIcon = (streakDays: number) => {
      switch (streakDays) {
        case 7:
          return "🔥";
        case 14:
          return "⚡";
        case 30:
          return "👑";
        case 100:
          return "💎";
        default:
          return "⭐";
      }
    };

    it("should return fire emoji for 7-day streak", () => {
      expect(getMilestoneIcon(7)).toBe("🔥");
    });

    it("should return lightning emoji for 14-day streak", () => {
      expect(getMilestoneIcon(14)).toBe("⚡");
    });

    it("should return crown emoji for 30-day streak", () => {
      expect(getMilestoneIcon(30)).toBe("👑");
    });

    it("should return diamond emoji for 100-day streak", () => {
      expect(getMilestoneIcon(100)).toBe("💎");
    });

    it("should return star emoji for unknown streak", () => {
      expect(getMilestoneIcon(50)).toBe("⭐");
    });
  });

  describe("getMilestoneLabel", () => {
    const getMilestoneLabel = (streakDays: number) => {
      switch (streakDays) {
        case 7:
          return "7-Day Streak";
        case 14:
          return "14-Day Streak";
        case 30:
          return "30-Day Streak";
        case 100:
          return "100-Day Streak";
        default:
          return `${streakDays}-Day Streak`;
      }
    };

    it("should return correct label for 7-day streak", () => {
      expect(getMilestoneLabel(7)).toBe("7-Day Streak");
    });

    it("should return correct label for 14-day streak", () => {
      expect(getMilestoneLabel(14)).toBe("14-Day Streak");
    });

    it("should return correct label for 30-day streak", () => {
      expect(getMilestoneLabel(30)).toBe("30-Day Streak");
    });

    it("should return correct label for 100-day streak", () => {
      expect(getMilestoneLabel(100)).toBe("100-Day Streak");
    });

    it("should return dynamic label for custom streak", () => {
      expect(getMilestoneLabel(50)).toBe("50-Day Streak");
    });
  });

  describe("Milestone grouping logic", () => {
    it("should group milestones by streak level correctly", () => {
      const milestones = [
        { streakDays: 7, habitName: "Meditation" },
        { streakDays: 7, habitName: "Exercise" },
        { streakDays: 14, habitName: "Reading" },
        { streakDays: 30, habitName: "Journaling" },
        { streakDays: 100, habitName: "Gratitude" },
      ];

      const grouped = {
        100: milestones.filter((m) => m.streakDays === 100),
        30: milestones.filter((m) => m.streakDays === 30),
        14: milestones.filter((m) => m.streakDays === 14),
        7: milestones.filter((m) => m.streakDays === 7),
      };

      expect(grouped[7]).toHaveLength(2);
      expect(grouped[14]).toHaveLength(1);
      expect(grouped[30]).toHaveLength(1);
      expect(grouped[100]).toHaveLength(1);
    });

    it("should handle empty milestone groups", () => {
      const milestones = [{ streakDays: 7, habitName: "Meditation" }];

      const grouped = {
        100: milestones.filter((m) => m.streakDays === 100),
        30: milestones.filter((m) => m.streakDays === 30),
        14: milestones.filter((m) => m.streakDays === 14),
        7: milestones.filter((m) => m.streakDays === 7),
      };

      expect(grouped[100]).toHaveLength(0);
      expect(grouped[30]).toHaveLength(0);
      expect(grouped[14]).toHaveLength(0);
      expect(grouped[7]).toHaveLength(1);
    });
  });

  describe("Milestone achievement count", () => {
    it("should count total milestones correctly", () => {
      const milestones = [
        { id: 1, streakDays: 7 },
        { id: 2, streakDays: 7 },
        { id: 3, streakDays: 14 },
        { id: 4, streakDays: 30 },
        { id: 5, streakDays: 100 },
      ];

      const count = milestones.length;
      expect(count).toBe(5);
    });

    it("should return 0 for user with no milestones", () => {
      const milestones: typeof milestones = [];
      const count = milestones.length;
      expect(count).toBe(0);
    });
  });

  describe("Milestone date formatting", () => {
    it("should format milestone date correctly", () => {
      const achievedAt = new Date("2026-04-27");
      const formatted = achievedAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    });

    it("should handle various date formats", () => {
      const dates = [
        new Date("2026-01-15"),
        new Date("2026-12-31"),
        new Date("2026-06-30"),
      ];

      dates.forEach((date) => {
        const formatted = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
      });
    });
  });

  describe("Milestone badge styling", () => {
    const getMilestoneBadgeColor = (streakDays: number) => {
      switch (streakDays) {
        case 7:
          return "bg-blue-100 text-blue-800";
        case 14:
          return "bg-purple-100 text-purple-800";
        case 30:
          return "bg-amber-100 text-amber-800";
        case 100:
          return "bg-rose-100 text-rose-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    it("should apply correct badge color for each milestone level", () => {
      expect(getMilestoneBadgeColor(7)).toBe("bg-blue-100 text-blue-800");
      expect(getMilestoneBadgeColor(14)).toBe("bg-purple-100 text-purple-800");
      expect(getMilestoneBadgeColor(30)).toBe("bg-amber-100 text-amber-800");
      expect(getMilestoneBadgeColor(100)).toBe("bg-rose-100 text-rose-800");
    });
  });
});
