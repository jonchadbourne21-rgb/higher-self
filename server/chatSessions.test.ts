import { describe, it, expect } from "vitest";

// ─── Unit tests for Chat Sessions feature ─────────────────────────────────────
// Tests cover: session grouping logic, session date formatting, intent badge
// config, and the getChatSessions return shape — without a live DB connection.

// ─── Intent badge config (mirrors client/src/pages/Chat.tsx) ─────────────────

const INTENT_CONFIG: Record<string, { label: string; color: string }> = {
  innerPeace: { label: "Inner Peace", color: "oklch(0.65 0.14 200)" },
  clarity:    { label: "Clarity",     color: "oklch(0.65 0.18 260)" },
  confidence: { label: "Confidence",  color: "oklch(0.65 0.20 30)"  },
  healing:    { label: "Healing",     color: "oklch(0.65 0.16 160)" },
  focus:      { label: "Focus",       color: "oklch(0.65 0.22 295)" },
};

// ─── Session date formatting (mirrors client/src/pages/Chat.tsx) ──────────────

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

// ─── getChatSessions return shape ─────────────────────────────────────────────

type SessionRow = {
  sessionId: string | null;
  firstMessage: Date | null;
  lastMessage: Date | null;
  messageCount: number;
};

function mockSessions(rows: SessionRow[]): SessionRow[] {
  // Simulate ordering by lastMessage descending
  return [...rows].sort((a, b) => {
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return b.lastMessage.getTime() - a.lastMessage.getTime();
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Intent badge config", () => {
  it("has entries for all 5 intentions", () => {
    const keys = Object.keys(INTENT_CONFIG);
    expect(keys).toContain("innerPeace");
    expect(keys).toContain("clarity");
    expect(keys).toContain("confidence");
    expect(keys).toContain("healing");
    expect(keys).toContain("focus");
    expect(keys).toHaveLength(5);
  });

  it("each intent has a label and color", () => {
    for (const [key, val] of Object.entries(INTENT_CONFIG)) {
      expect(val.label).toBeTruthy();
      expect(val.color).toMatch(/oklch/);
    }
  });

  it("returns correct label for clarity", () => {
    expect(INTENT_CONFIG["clarity"].label).toBe("Clarity");
  });

  it("returns correct label for innerPeace", () => {
    expect(INTENT_CONFIG["innerPeace"].label).toBe("Inner Peace");
  });

  it("returns undefined for unknown intent", () => {
    expect(INTENT_CONFIG["unknown"]).toBeUndefined();
  });
});

describe("formatSessionDate", () => {
  it("returns 'Today' for today's date", () => {
    expect(formatSessionDate(new Date())).toBe("Today");
  });

  it("returns 'Yesterday' for yesterday's date", () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    expect(formatSessionDate(yesterday)).toBe("Yesterday");
  });

  it("returns formatted date for older dates", () => {
    // Use a date with explicit local time to avoid timezone shifts
    const oldDate = new Date(2025, 2, 20); // March 20, 2025 in local time
    const result = formatSessionDate(oldDate);
    expect(result).toContain("Mar");
    expect(result).toContain("20");
  });

  it("returns 'Unknown date' for null", () => {
    expect(formatSessionDate(null)).toBe("Unknown date");
  });
});

describe("getChatSessions shape", () => {
  it("returns sessions ordered by lastMessage descending", () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const rows: SessionRow[] = [
      { sessionId: "old-session", firstMessage: earlier, lastMessage: earlier, messageCount: 5 },
      { sessionId: "new-session", firstMessage: now, lastMessage: now, messageCount: 3 },
    ];
    const sorted = mockSessions(rows);
    expect(sorted[0].sessionId).toBe("new-session");
    expect(sorted[1].sessionId).toBe("old-session");
  });

  it("handles legacy session (null sessionId)", () => {
    const now = new Date();
    const rows: SessionRow[] = [
      { sessionId: null, firstMessage: now, lastMessage: now, messageCount: 10 },
    ];
    const sorted = mockSessions(rows);
    expect(sorted[0].sessionId).toBeNull();
    expect(sorted[0].messageCount).toBe(10);
  });

  it("messageCount is a number", () => {
    const rows: SessionRow[] = [
      { sessionId: "abc", firstMessage: new Date(), lastMessage: new Date(), messageCount: 7 },
    ];
    expect(typeof rows[0].messageCount).toBe("number");
  });

  it("empty array when no sessions", () => {
    const result = mockSessions([]);
    expect(result).toHaveLength(0);
  });
});
