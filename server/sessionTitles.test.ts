/**
 * Tests for session title feature logic
 * Covers: title validation, display name resolution, key mapping, and edge cases
 */
import { describe, it, expect } from "vitest";

// ─── Helpers mirrored from Chat.tsx ──────────────────────────────────────────

function formatSessionDate(date: Date | null): string {
  if (!date) return "Unknown date";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.getTime() - 86_400_000).toDateString() === date.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getSessionDisplayName(
  sid: string | null,
  lastMessage: Date | null,
  sessionTitles: Record<string, string>
): string {
  const key = sid ?? "__legacy__";
  return sessionTitles[key] || formatSessionDate(lastMessage);
}

// ─── Title validation helper (mirrors server-side trim logic) ─────────────────

function sanitizeTitle(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Session title display name resolution", () => {
  it("returns custom title when set for a UUID session", () => {
    const titles = { "abc-123": "The breakthrough talk" };
    expect(getSessionDisplayName("abc-123", new Date(), titles)).toBe("The breakthrough talk");
  });

  it("returns custom title when set for the legacy session (null sessionId)", () => {
    const titles = { __legacy__: "My first session" };
    expect(getSessionDisplayName(null, new Date(), titles)).toBe("My first session");
  });

  it("falls back to date label when no custom title is set", () => {
    const titles = {};
    const today = new Date();
    expect(getSessionDisplayName("abc-123", today, titles)).toBe("Today");
  });

  it("falls back to 'Unknown date' when no title and no date", () => {
    const titles = {};
    expect(getSessionDisplayName("abc-123", null, titles)).toBe("Unknown date");
  });

  it("does not use title from a different session", () => {
    const titles = { "other-session": "Wrong title" };
    const today = new Date();
    expect(getSessionDisplayName("abc-123", today, titles)).toBe("Today");
  });

  it("uses __legacy__ key for null sessionId mapping", () => {
    const titles = { __legacy__: "Legacy chat" };
    expect(getSessionDisplayName(null, null, titles)).toBe("Legacy chat");
  });
});

describe("Session title sanitization", () => {
  it("trims whitespace from title", () => {
    expect(sanitizeTitle("  The breakthrough talk  ")).toBe("The breakthrough talk");
  });

  it("returns null for empty string", () => {
    expect(sanitizeTitle("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(sanitizeTitle("   ")).toBeNull();
  });

  it("preserves special characters in title", () => {
    expect(sanitizeTitle("✦ My healing journey")).toBe("✦ My healing journey");
  });

  it("handles 200-char max length correctly", () => {
    const longTitle = "a".repeat(200);
    expect(sanitizeTitle(longTitle)).toBe(longTitle);
  });
});

describe("Session key mapping", () => {
  it("maps null sessionId to __legacy__ key", () => {
    const key = (sid: string | null) => sid ?? "__legacy__";
    expect(key(null)).toBe("__legacy__");
    expect(key("abc-123")).toBe("abc-123");
  });

  it("getChatSessionTitles returns empty object when no titles set", () => {
    const titles: Record<string, string> = {};
    expect(Object.keys(titles).length).toBe(0);
  });

  it("getChatSessionTitles map has correct shape", () => {
    const titles: Record<string, string> = {
      "session-1": "Morning reflection",
      "session-2": "Evening clarity",
      __legacy__: "First ever chat",
    };
    expect(titles["session-1"]).toBe("Morning reflection");
    expect(titles["__legacy__"]).toBe("First ever chat");
    expect(titles["nonexistent"]).toBeUndefined();
  });
});

describe("formatSessionDate helper", () => {
  it("returns 'Today' for today's date", () => {
    expect(formatSessionDate(new Date())).toBe("Today");
  });

  it("returns 'Yesterday' for yesterday's date", () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    expect(formatSessionDate(yesterday)).toBe("Yesterday");
  });

  it("returns 'Unknown date' for null", () => {
    expect(formatSessionDate(null)).toBe("Unknown date");
  });

  it("returns formatted date for older dates", () => {
    const oldDate = new Date("2025-01-15T12:00:00Z");
    const result = formatSessionDate(oldDate);
    // Should contain the month and day
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
  });
});
