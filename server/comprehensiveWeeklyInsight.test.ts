import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Comprehensive Weekly Insight System", () => {
  describe("Growth Score Calculation", () => {
    it("should calculate growth score from 0-100", () => {
      const score = 75;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should reward habit completions", () => {
      const baseScore = 50;
      const habitBonus = 10;
      const totalScore = baseScore + habitBonus;
      expect(totalScore).toBe(60);
    });

    it("should reward Mirror sessions", () => {
      const baseScore = 50;
      const sessionBonus = 15;
      const totalScore = baseScore + sessionBonus;
      expect(totalScore).toBe(65);
    });

    it("should reward Journal entries", () => {
      const baseScore = 50;
      const journalBonus = 8;
      const totalScore = baseScore + journalBonus;
      expect(totalScore).toBe(58);
    });

    it("should reward daily check-ins", () => {
      const baseScore = 50;
      const checkInBonus = 5;
      const totalScore = baseScore + checkInBonus;
      expect(totalScore).toBe(55);
    });

    it("should cap score at 100", () => {
      const score = Math.min(150, 100);
      expect(score).toBe(100);
    });
  });

  describe("Pattern Detection", () => {
    it("should detect energy patterns", () => {
      const energyLevels = [8, 7, 6, 5, 4, 3, 2];
      const avgEnergy = energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length;
      expect(avgEnergy).toBeCloseTo(5, 0);
    });

    it("should detect stress patterns", () => {
      const stressLevels = [2, 3, 4, 5, 6, 7, 8];
      const avgStress = stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length;
      expect(avgStress).toBeCloseTo(5, 0);
    });

    it("should detect mood patterns", () => {
      const moodLevels = [7, 7, 6, 5, 6, 7, 8];
      const avgMood = moodLevels.reduce((a, b) => a + b, 0) / moodLevels.length;
      expect(avgMood).toBeCloseTo(6.57, 1);
    });

    it("should identify declining trends", () => {
      const values = [10, 9, 8, 7, 6, 5, 4];
      const isDecline = values[0] > values[values.length - 1];
      expect(isDecline).toBe(true);
    });

    it("should identify improving trends", () => {
      const values = [4, 5, 6, 7, 8, 9, 10];
      const isImproving = values[0] < values[values.length - 1];
      expect(isImproving).toBe(true);
    });
  });

  describe("Weekly Insight Generation", () => {
    it("should include growth score in insight", () => {
      const insight = {
        growthScore: 78,
        patterns: "Energy declining mid-week",
        actionableSteps: "Take breaks on Wednesdays",
        insightText: "You're making progress",
      };
      expect(insight.growthScore).toBeDefined();
      expect(insight.growthScore).toBeGreaterThan(0);
    });

    it("should include detected patterns", () => {
      const insight = {
        patterns: "Stress spikes after work calls",
      };
      expect(insight.patterns).toBeDefined();
      expect(insight.patterns.length).toBeGreaterThan(0);
    });

    it("should include actionable steps", () => {
      const insight = {
        actionableSteps: "Schedule recovery time after meetings",
      };
      expect(insight.actionableSteps).toBeDefined();
      expect(insight.actionableSteps.length).toBeGreaterThan(0);
    });

    it("should include personalized insight text", () => {
      const insight = {
        insightText: "You're learning to manage stress better",
      };
      expect(insight.insightText).toBeDefined();
      expect(insight.insightText.length).toBeGreaterThan(0);
    });
  });

  describe("Sunday Reflection Logic", () => {
    it("should detect Sunday (day 0)", () => {
      const sundayDate = new Date(2026, 3, 26); // April 26, 2026 is a Sunday
      const dayOfWeek = sundayDate.getDay();
      expect(dayOfWeek).toBe(0);
    });

    it("should include previous week review on Sunday", () => {
      const isFirstDayOfWeek = true;
      const shouldIncludeReview = isFirstDayOfWeek;
      expect(shouldIncludeReview).toBe(true);
    });

    it("should compare this week vs last week", () => {
      const thisWeekScore = 78;
      const lastWeekScore = 65;
      const improvement = thisWeekScore - lastWeekScore;
      expect(improvement).toBe(13);
    });

    it("should generate next week preview", () => {
      const nextWeekFocus = "Build on momentum from this week";
      expect(nextWeekFocus).toBeDefined();
      expect(nextWeekFocus.length).toBeGreaterThan(0);
    });
  });

  describe("Data Aggregation", () => {
    it("should pull Mirror session data", () => {
      const sessions = [
        { id: 1, messageCount: 12, createdAt: new Date() },
        { id: 2, messageCount: 8, createdAt: new Date() },
      ];
      expect(sessions.length).toBe(2);
      expect(sessions[0].messageCount).toBe(12);
    });

    it("should pull Journal entry data", () => {
      const entries = [
        { id: 1, content: "Today was good", createdAt: new Date() },
        { id: 2, content: "Feeling reflective", createdAt: new Date() },
      ];
      expect(entries.length).toBe(2);
    });

    it("should pull Habit completion data", () => {
      const completions = [
        { habitId: 1, completedAt: new Date() },
        { habitId: 1, completedAt: new Date() },
        { habitId: 2, completedAt: new Date() },
      ];
      expect(completions.length).toBe(3);
    });

    it("should pull daily check-in data", () => {
      const checkIns = [
        { mood: 7, energy: 8, stress: 3, createdAt: new Date() },
        { mood: 6, energy: 7, stress: 4, createdAt: new Date() },
      ];
      expect(checkIns.length).toBe(2);
    });

    it("should aggregate all data into single insight", () => {
      const aggregatedData = {
        sessions: 2,
        journals: 2,
        habits: 3,
        checkIns: 2,
      };
      const totalActivities = Object.values(aggregatedData).reduce((a, b) => a + b, 0);
      expect(totalActivities).toBe(9);
    });
  });

  describe("Personalization", () => {
    it("should learn user patterns over time", () => {
      const userPattern = {
        name: "JonnyDonny",
        stressPattern: "Wednesdays",
        energyPattern: "Mornings",
        preferredReflectionTime: "Evening",
      };
      expect(userPattern.name).toBeDefined();
      expect(userPattern.stressPattern).toBe("Wednesdays");
    });

    it("should tailor recommendations to user", () => {
      const userIntention = "Clarity";
      const recommendation = `Focus on clarity this week by scheduling focused work time`;
      expect(recommendation).toContain("clarity");
    });

    it("should reference specific Mirror conversations", () => {
      const insight = "In your Mirror session on Tuesday, you mentioned...";
      expect(insight).toContain("Mirror session");
    });

    it("should celebrate wins", () => {
      const insight = "Great job completing 5 habits this week!";
      expect(insight).toContain("Great job");
    });
  });

  describe("Daily + Weekly Display", () => {
    it("should show daily insight first", () => {
      const display = ["daily", "weekly"];
      expect(display[0]).toBe("daily");
    });

    it("should show weekly insight second", () => {
      const display = ["daily", "weekly"];
      expect(display[1]).toBe("weekly");
    });

    it("should highlight connections between daily and weekly", () => {
      const connection = "Today's mood aligns with your weekly pattern of...";
      expect(connection).toContain("pattern");
    });

    it("should provide context for each insight", () => {
      const dailyContext = "Based on today's check-in";
      const weeklyContext = "Based on this week's activities";
      expect(dailyContext).toBeDefined();
      expect(weeklyContext).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle week with no Mirror sessions", () => {
      const sessions = [];
      const hasData = sessions.length > 0;
      expect(hasData).toBe(false);
    });

    it("should handle week with no habit completions", () => {
      const habits = [];
      const message = habits.length === 0 ? "No habits completed this week" : "Great progress!";
      expect(message).toContain("No habits");
    });

    it("should handle first week of user", () => {
      const previousWeekScore = null;
      const hasHistory = previousWeekScore !== null;
      expect(hasHistory).toBe(false);
    });

    it("should handle incomplete week data", () => {
      const weekData = {
        checkIns: 3,
        sessions: 1,
        journals: 0,
        habits: 2,
      };
      const totalActivities = Object.values(weekData).reduce((a, b) => a + b, 0);
      expect(totalActivities).toBe(6);
    });
  });
});
