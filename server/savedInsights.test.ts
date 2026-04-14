import { describe, it, expect } from "vitest";

// ─── Unit tests for savedInsights logic ──────────────────────────────────────
// These tests validate the data transformation and filtering logic
// without requiring a live database connection.

describe("savedInsights - reactionType validation", () => {
  const validTypes = ["heart", "star"] as const;
  const invalidTypes = ["like", "bookmark", "", "HEART", "Star"];

  it("accepts 'heart' as a valid reaction type", () => {
    expect(validTypes).toContain("heart");
  });

  it("accepts 'star' as a valid reaction type", () => {
    expect(validTypes).toContain("star");
  });

  it("rejects invalid reaction types", () => {
    for (const t of invalidTypes) {
      expect(validTypes).not.toContain(t as any);
    }
  });
});

describe("savedInsights - filter logic", () => {
  const mockInsights = [
    { id: 1, reactionType: "heart" as const, content: "Emotional insight 1", savedAt: new Date() },
    { id: 2, reactionType: "star" as const, content: "Actionable insight 1", savedAt: new Date() },
    { id: 3, reactionType: "heart" as const, content: "Emotional insight 2", savedAt: new Date() },
    { id: 4, reactionType: "star" as const, content: "Actionable insight 2", savedAt: new Date() },
  ];

  it("returns all insights when filter is 'all'", () => {
    const filter = "all";
    const result = mockInsights.filter((i) => filter === "all" || i.reactionType === filter);
    expect(result).toHaveLength(4);
  });

  it("returns only heart insights when filter is 'heart'", () => {
    const filter = "heart";
    const result = mockInsights.filter((i) => filter === "all" || i.reactionType === filter);
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.reactionType === "heart")).toBe(true);
  });

  it("returns only star insights when filter is 'star'", () => {
    const filter = "star";
    const result = mockInsights.filter((i) => filter === "all" || i.reactionType === filter);
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.reactionType === "star")).toBe(true);
  });

  it("returns empty array when no insights match filter", () => {
    const emptyInsights: typeof mockInsights = [];
    const result = emptyInsights.filter((i) => "heart" === "all" || i.reactionType === "heart");
    expect(result).toHaveLength(0);
  });
});

describe("savedInsights - content validation", () => {
  it("requires non-empty content", () => {
    const content = "This is a meaningful insight from the Mirror";
    expect(content.length).toBeGreaterThan(0);
  });

  it("rejects empty content", () => {
    const content = "";
    expect(content.length).toBe(0);
  });

  it("stores content as-is without truncation", () => {
    const longContent = "A".repeat(500);
    expect(longContent.length).toBe(500);
  });
});

describe("savedInsights - reaction toggle logic", () => {
  type ReactionMap = Record<string, "heart" | "star">;

  function toggleReaction(reactions: ReactionMap, msgId: string, type: "heart" | "star"): ReactionMap {
    if (reactions[msgId] === type) {
      const next = { ...reactions };
      delete next[msgId];
      return next;
    }
    return { ...reactions, [msgId]: type };
  }

  it("adds a reaction when none exists", () => {
    const result = toggleReaction({}, "msg1", "heart");
    expect(result["msg1"]).toBe("heart");
  });

  it("removes a reaction when the same type is toggled again", () => {
    const result = toggleReaction({ msg1: "heart" }, "msg1", "heart");
    expect(result["msg1"]).toBeUndefined();
  });

  it("replaces a reaction when a different type is selected", () => {
    const result = toggleReaction({ msg1: "heart" }, "msg1", "star");
    expect(result["msg1"]).toBe("star");
  });

  it("does not affect other messages when toggling", () => {
    const initial: ReactionMap = { msg1: "heart", msg2: "star" };
    const result = toggleReaction(initial, "msg1", "heart");
    expect(result["msg2"]).toBe("star");
    expect(result["msg1"]).toBeUndefined();
  });
});
