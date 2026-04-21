import { describe, it, expect } from "vitest";

/**
 * Tests for History Tab Search/Filter Logic
 * Tests the filtering of sessions by title and message count
 */

describe("History Tab Search/Filter", () => {
  // Helper: simulate getSessionDisplayName
  const getSessionDisplayName = (title: string | null, date: Date): string => {
    return title || date.toLocaleDateString();
  };

  // Helper: simulate filteredSessions logic
  const filterSessions = (
    sessions: Array<{ sessionId: string; title: string | null; messageCount: number; lastMessage: Date }>,
    query: string
  ) => {
    if (!query.trim()) return sessions;
    const q = query.toLowerCase();
    return sessions.filter((s) => {
      const displayName = getSessionDisplayName(s.title, s.lastMessage).toLowerCase();
      const messageCountStr = s.messageCount.toString();
      return displayName.includes(q) || messageCountStr.includes(q);
    });
  };

  it("should return all sessions when query is empty", () => {
    const sessions = [
      { sessionId: "1", title: "Facing fears", messageCount: 12, lastMessage: new Date("2026-04-18") },
      { sessionId: "2", title: "Breakthrough talk", messageCount: 8, lastMessage: new Date("2026-04-17") },
    ];
    const result = filterSessions(sessions, "");
    expect(result).toHaveLength(2);
  });

  it("should return all sessions when query is whitespace only", () => {
    const sessions = [
      { sessionId: "1", title: "Facing fears", messageCount: 12, lastMessage: new Date("2026-04-18") },
    ];
    const result = filterSessions(sessions, "   ");
    expect(result).toHaveLength(1);
  });

  it("should filter sessions by custom title (case-insensitive)", () => {
    const sessions = [
      { sessionId: "1", title: "Facing fears", messageCount: 12, lastMessage: new Date("2026-04-18") },
      { sessionId: "2", title: "Breakthrough talk", messageCount: 8, lastMessage: new Date("2026-04-17") },
      { sessionId: "3", title: "Daily reflection", messageCount: 5, lastMessage: new Date("2026-04-16") },
    ];
    const result = filterSessions(sessions, "facing");
    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe("1");
  });

  it("should filter sessions by partial title match", () => {
    const sessions = [
      { sessionId: "1", title: "Facing fears", messageCount: 12, lastMessage: new Date("2026-04-18") },
      { sessionId: "2", title: "Breakthrough talk", messageCount: 8, lastMessage: new Date("2026-04-17") },
    ];
    const result = filterSessions(sessions, "talk");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Breakthrough talk");
  });

  it("should filter sessions by message count", () => {
    const sessions = [
      { sessionId: "1", title: "Facing fears", messageCount: 12, lastMessage: new Date("2026-04-18") },
      { sessionId: "2", title: "Breakthrough talk", messageCount: 8, lastMessage: new Date("2026-04-17") },
      { sessionId: "3", title: "Daily reflection", messageCount: 125, lastMessage: new Date("2026-04-16") },
    ];
    const result = filterSessions(sessions, "12");
    expect(result).toHaveLength(2); // "12" and "125"
  });

  it("should filter sessions by exact message count", () => {
    const sessions = [
      { sessionId: "1", title: "Facing fears", messageCount: 12, lastMessage: new Date("2026-04-18") },
      { sessionId: "2", title: "Breakthrough talk", messageCount: 8, lastMessage: new Date("2026-04-17") },
    ];
    const result = filterSessions(sessions, "8");
    expect(result).toHaveLength(1);
    expect(result[0].messageCount).toBe(8);
  });

  it("should return empty array when no sessions match query", () => {
    const sessions = [
      { sessionId: "1", title: "Facing fears", messageCount: 12, lastMessage: new Date("2026-04-18") },
      { sessionId: "2", title: "Breakthrough talk", messageCount: 8, lastMessage: new Date("2026-04-17") },
    ];
    const result = filterSessions(sessions, "xyz");
    expect(result).toHaveLength(0);
  });

  it("should handle sessions with null title (fallback to date)", () => {
    const sessions = [
      { sessionId: "1", title: null, messageCount: 12, lastMessage: new Date("2026-04-18") },
      { sessionId: "2", title: "Breakthrough talk", messageCount: 8, lastMessage: new Date("2026-04-17") },
    ];
    // Searching for the date should match the first session
    const dateStr = new Date("2026-04-18").toLocaleDateString();
    const result = filterSessions(sessions, dateStr);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should be case-insensitive for message count search", () => {
    const sessions = [
      { sessionId: "1", title: "Facing fears", messageCount: 12, lastMessage: new Date("2026-04-18") },
    ];
    const result = filterSessions(sessions, "12");
    expect(result).toHaveLength(1);
  });

  it("should handle multiple word queries (partial match)", () => {
    const sessions = [
      { sessionId: "1", title: "Facing the fear of failure", messageCount: 12, lastMessage: new Date("2026-04-18") },
      { sessionId: "2", title: "Breakthrough talk", messageCount: 8, lastMessage: new Date("2026-04-17") },
    ];
    const result = filterSessions(sessions, "fear");
    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe("1");
  });

  it("should match title or message count (OR logic)", () => {
    const sessions = [
      { sessionId: "1", title: "Facing fears", messageCount: 12, lastMessage: new Date("2026-04-18") },
      { sessionId: "2", title: "Breakthrough talk", messageCount: 8, lastMessage: new Date("2026-04-17") },
      { sessionId: "3", title: "Daily reflection", messageCount: 5, lastMessage: new Date("2026-04-16") },
    ];
    // Query "8" should match session 2 by message count
    const result1 = filterSessions(sessions, "8");
    expect(result1).toHaveLength(1);
    expect(result1[0].sessionId).toBe("2");

    // Query "Facing" should match session 1 by title
    const result2 = filterSessions(sessions, "Facing");
    expect(result2).toHaveLength(1);
    expect(result2[0].sessionId).toBe("1");
  });

  it("should preserve session order after filtering", () => {
    const sessions = [
      { sessionId: "1", title: "Session A", messageCount: 10, lastMessage: new Date("2026-04-18") },
      { sessionId: "2", title: "Session B", messageCount: 20, lastMessage: new Date("2026-04-17") },
      { sessionId: "3", title: "Session C", messageCount: 15, lastMessage: new Date("2026-04-16") },
    ];
    const result = filterSessions(sessions, "Session");
    expect(result.map((s) => s.sessionId)).toEqual(["1", "2", "3"]);
  });

  it("should handle special characters in query", () => {
    const sessions = [
      { sessionId: "1", title: "Facing fears!", messageCount: 12, lastMessage: new Date("2026-04-18") },
      { sessionId: "2", title: "Breakthrough (talk)", messageCount: 8, lastMessage: new Date("2026-04-17") },
    ];
    // Query with special char should still match
    const result = filterSessions(sessions, "!");
    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe("1");
  });

  it("should handle very long title queries", () => {
    const sessions = [
      { sessionId: "1", title: "This is a very long title about facing fears and overcoming them", messageCount: 12, lastMessage: new Date("2026-04-18") },
      { sessionId: "2", title: "Short", messageCount: 8, lastMessage: new Date("2026-04-17") },
    ];
    const result = filterSessions(sessions, "very long title about");
    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe("1");
  });
});
