import { describe, it, expect } from "vitest";

// Mirror the pure helper functions from Chat.tsx so we can test them server-side

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  id: string;
  createdAt?: Date;
};

function shouldShowTimestamp(prev: ChatMessage, current: ChatMessage): boolean {
  if (!prev.createdAt || !current.createdAt) return false;
  const diffMs = current.createdAt.getTime() - prev.createdAt.getTime();
  return diffMs >= 60 * 60 * 1000; // 1 hour in ms
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.getTime() - 86_400_000).toDateString() === date.toDateString();

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return time;
  if (isYesterday) return `Yesterday · ${time}`;
  return (
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ` · ${time}`
  );
}

function makeMsg(minsAgo: number, role: "user" | "assistant" = "user"): ChatMessage {
  const d = new Date(Date.now() - minsAgo * 60 * 1000);
  return { role, content: "test", id: String(minsAgo), createdAt: d };
}

describe("shouldShowTimestamp", () => {
  it("returns false when messages are less than 60 minutes apart", () => {
    const prev = makeMsg(90);
    const curr = makeMsg(50); // 40 min gap
    expect(shouldShowTimestamp(prev, curr)).toBe(false);
  });

  it("returns false when messages are exactly 59 minutes apart", () => {
    const prev = makeMsg(120);
    const curr = makeMsg(61); // 59 min gap
    expect(shouldShowTimestamp(prev, curr)).toBe(false);
  });

  it("returns true when messages are exactly 60 minutes apart", () => {
    const prev = makeMsg(120);
    const curr = makeMsg(60); // exactly 60 min gap
    expect(shouldShowTimestamp(prev, curr)).toBe(true);
  });

  it("returns true when messages are more than 60 minutes apart", () => {
    const prev = makeMsg(200);
    const curr = makeMsg(10); // 190 min gap
    expect(shouldShowTimestamp(prev, curr)).toBe(true);
  });

  it("returns false when prev has no createdAt", () => {
    const prev: ChatMessage = { role: "user", content: "hi", id: "1" };
    const curr = makeMsg(10);
    expect(shouldShowTimestamp(prev, curr)).toBe(false);
  });

  it("returns false when current has no createdAt", () => {
    const prev = makeMsg(120);
    const curr: ChatMessage = { role: "user", content: "hi", id: "2" };
    expect(shouldShowTimestamp(prev, curr)).toBe(false);
  });
});

describe("formatTimestamp", () => {
  it("formats a time today as just the time (no date)", () => {
    const now = new Date();
    const result = formatTimestamp(now);
    // Should not contain a month abbreviation for today
    expect(result).not.toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
    // Should contain AM or PM
    expect(result).toMatch(/AM|PM/);
  });

  it("formats a time yesterday with 'Yesterday ·' prefix", () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    const result = formatTimestamp(yesterday);
    expect(result.startsWith("Yesterday ·")).toBe(true);
  });

  it("formats an older date with month and day", () => {
    const oldDate = new Date(2024, 0, 15, 10, 30); // Jan 15, 2024
    const result = formatTimestamp(oldDate);
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("·");
  });
});
