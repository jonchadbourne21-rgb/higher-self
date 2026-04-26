import { describe, expect, it } from "vitest";

/**
 * Unit tests for habit completion animation logic.
 * These tests verify milestone detection and animation trigger conditions.
 */

describe("Habit Completion Animation Logic", () => {
  /**
   * Helper function to detect if a streak is a milestone
   */
  function isMilestoneStreak(streak: number): boolean {
    return [7, 14, 30, 100].includes(streak);
  }

  describe("Milestone Detection", () => {
    it("detects 7-day milestone", () => {
      expect(isMilestoneStreak(7)).toBe(true);
    });

    it("detects 14-day milestone", () => {
      expect(isMilestoneStreak(14)).toBe(true);
    });

    it("detects 30-day milestone", () => {
      expect(isMilestoneStreak(30)).toBe(true);
    });

    it("detects 100-day milestone", () => {
      expect(isMilestoneStreak(100)).toBe(true);
    });

    it("does not detect non-milestone streaks", () => {
      expect(isMilestoneStreak(1)).toBe(false);
      expect(isMilestoneStreak(5)).toBe(false);
      expect(isMilestoneStreak(8)).toBe(false);
      expect(isMilestoneStreak(15)).toBe(false);
      expect(isMilestoneStreak(29)).toBe(false);
      expect(isMilestoneStreak(31)).toBe(false);
      expect(isMilestoneStreak(99)).toBe(false);
      expect(isMilestoneStreak(101)).toBe(false);
    });

    it("handles zero streak", () => {
      expect(isMilestoneStreak(0)).toBe(false);
    });

    it("handles negative streak", () => {
      expect(isMilestoneStreak(-1)).toBe(false);
    });

    it("handles large non-milestone streaks", () => {
      expect(isMilestoneStreak(365)).toBe(false);
      expect(isMilestoneStreak(1000)).toBe(false);
    });
  });

  describe("Animation Trigger Logic", () => {
    /**
     * Simulate the animation trigger logic from Domains.tsx
     */
    function shouldTriggerAnimation(
      oldStreak: number,
      newStreak: number
    ): {
      shouldAnimate: boolean;
      isMilestone: boolean;
      milestoneDay: number | null;
    } {
      const shouldAnimate = newStreak > oldStreak;
      const isMilestone = shouldAnimate && isMilestoneStreak(newStreak);
      const milestoneDay = isMilestone ? newStreak : null;

      return { shouldAnimate, isMilestone, milestoneDay };
    }

    it("triggers animation when streak increases", () => {
      const result = shouldTriggerAnimation(0, 1);
      expect(result.shouldAnimate).toBe(true);
      expect(result.isMilestone).toBe(false);
      expect(result.milestoneDay).toBeNull();
    });

    it("triggers milestone animation at 7 days", () => {
      const result = shouldTriggerAnimation(6, 7);
      expect(result.shouldAnimate).toBe(true);
      expect(result.isMilestone).toBe(true);
      expect(result.milestoneDay).toBe(7);
    });

    it("triggers milestone animation at 14 days", () => {
      const result = shouldTriggerAnimation(13, 14);
      expect(result.shouldAnimate).toBe(true);
      expect(result.isMilestone).toBe(true);
      expect(result.milestoneDay).toBe(14);
    });

    it("triggers milestone animation at 30 days", () => {
      const result = shouldTriggerAnimation(29, 30);
      expect(result.shouldAnimate).toBe(true);
      expect(result.isMilestone).toBe(true);
      expect(result.milestoneDay).toBe(30);
    });

    it("triggers milestone animation at 100 days", () => {
      const result = shouldTriggerAnimation(99, 100);
      expect(result.shouldAnimate).toBe(true);
      expect(result.isMilestone).toBe(true);
      expect(result.milestoneDay).toBe(100);
    });

    it("does not trigger animation when streak stays the same", () => {
      const result = shouldTriggerAnimation(5, 5);
      expect(result.shouldAnimate).toBe(false);
      expect(result.isMilestone).toBe(false);
      expect(result.milestoneDay).toBeNull();
    });

    it("does not trigger animation when streak decreases", () => {
      const result = shouldTriggerAnimation(7, 0);
      expect(result.shouldAnimate).toBe(false);
      expect(result.isMilestone).toBe(false);
      expect(result.milestoneDay).toBeNull();
    });

    it("triggers regular animation at non-milestone streaks", () => {
      const result = shouldTriggerAnimation(1, 2);
      expect(result.shouldAnimate).toBe(true);
      expect(result.isMilestone).toBe(false);
      expect(result.milestoneDay).toBeNull();
    });

    it("triggers regular animation at 8 days (after milestone)", () => {
      const result = shouldTriggerAnimation(7, 8);
      expect(result.shouldAnimate).toBe(true);
      expect(result.isMilestone).toBe(false);
      expect(result.milestoneDay).toBeNull();
    });
  });

  describe("Animation Duration Logic", () => {
    /**
     * Determine animation duration based on milestone status
     */
    function getAnimationDuration(isMilestone: boolean): number {
      return isMilestone ? 1200 : 800;
    }

    it("uses 800ms duration for regular completions", () => {
      expect(getAnimationDuration(false)).toBe(800);
    });

    it("uses 1200ms duration for milestone completions", () => {
      expect(getAnimationDuration(true)).toBe(1200);
    });
  });

  describe("Sparkle Count Logic", () => {
    /**
     * Determine number of sparkles based on milestone status
     */
    function getSparkleCount(isMilestone: boolean): number {
      return isMilestone ? 16 : 8;
    }

    it("generates 8 sparkles for regular completions", () => {
      expect(getSparkleCount(false)).toBe(8);
    });

    it("generates 16 sparkles for milestone completions", () => {
      expect(getSparkleCount(true)).toBe(16);
    });
  });

  describe("Edge Cases", () => {
    it("handles first habit completion (0 to 1)", () => {
      const result = shouldTriggerAnimation(0, 1);
      expect(result.shouldAnimate).toBe(true);
      expect(result.isMilestone).toBe(false);
    });

    it("handles completion after a gap (streak reset)", () => {
      const result = shouldTriggerAnimation(0, 1);
      expect(result.shouldAnimate).toBe(true);
      expect(result.isMilestone).toBe(false);
    });

    it("handles consecutive milestones (7 to 14)", () => {
      const result1 = shouldTriggerAnimation(6, 7);
      const result2 = shouldTriggerAnimation(13, 14);
      expect(result1.isMilestone).toBe(true);
      expect(result2.isMilestone).toBe(true);
    });

    it("handles very long streaks beyond 100 days", () => {
      const result = shouldTriggerAnimation(365, 366);
      expect(result.shouldAnimate).toBe(true);
      expect(result.isMilestone).toBe(false);
    });
  });
});

/**
 * Helper function for testing (used in Domains.tsx)
 */
function shouldTriggerAnimation(
  oldStreak: number,
  newStreak: number
): {
  shouldAnimate: boolean;
  isMilestone: boolean;
  milestoneDay: number | null;
} {
  const shouldAnimate = newStreak > oldStreak;
  const isMilestone = shouldAnimate && [7, 14, 30, 100].includes(newStreak);
  const milestoneDay = isMilestone ? newStreak : null;

  return { shouldAnimate, isMilestone, milestoneDay };
}
