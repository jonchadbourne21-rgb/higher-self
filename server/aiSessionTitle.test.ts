import { describe, it, expect } from "vitest";

// ─── Unit tests for AI session title generation logic ─────────────────────────
// These tests cover the pure logic used in the generateTitle procedure:
// transcript building, title sanitization, and skip conditions.

// ─── Helpers mirroring the production logic ───────────────────────────────────

function buildTranscript(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxChars = 1500
): string {
  return messages
    .map((m) => `${m.role === "user" ? "User" : "Mirror"}: ${m.content.slice(0, 200)}`)
    .join("\n")
    .slice(0, maxChars);
}

function sanitizeTitle(raw: string, maxLen = 120): string {
  return raw.replace(/^["']|["']$/g, "").trim().slice(0, maxLen);
}

function shouldSkip(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  alreadyTitled: boolean
): boolean {
  return alreadyTitled || messages.length < 2;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AI session title — skip conditions", () => {
  it("skips when session already has a title", () => {
    const msgs = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there" },
    ];
    expect(shouldSkip(msgs, true)).toBe(true);
  });

  it("skips when there are fewer than 2 messages", () => {
    expect(shouldSkip([], false)).toBe(true);
    expect(shouldSkip([{ role: "user" as const, content: "Hi" }], false)).toBe(true);
  });

  it("does not skip when session has 2+ messages and no title", () => {
    const msgs = [
      { role: "user" as const, content: "I'm struggling with anxiety" },
      { role: "assistant" as const, content: "Tell me more about that" },
    ];
    expect(shouldSkip(msgs, false)).toBe(false);
  });
});

describe("AI session title — transcript building", () => {
  it("prefixes user messages with 'User:' and assistant with 'Mirror:'", () => {
    const msgs = [
      { role: "user" as const, content: "I feel stuck" },
      { role: "assistant" as const, content: "What does stuck feel like?" },
    ];
    const transcript = buildTranscript(msgs);
    expect(transcript).toContain("User: I feel stuck");
    expect(transcript).toContain("Mirror: What does stuck feel like?");
  });

  it("truncates individual message content to 200 chars", () => {
    const longContent = "a".repeat(300);
    const msgs = [
      { role: "user" as const, content: longContent },
      { role: "assistant" as const, content: "Short reply" },
    ];
    const transcript = buildTranscript(msgs);
    // The user line should be "User: " + 200 a's = 206 chars
    const userLine = transcript.split("\n")[0];
    expect(userLine.length).toBe(206); // "User: " (6) + 200 chars
  });

  it("truncates total transcript to maxChars", () => {
    const msgs = Array.from({ length: 50 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: "x".repeat(200),
    }));
    const transcript = buildTranscript(msgs, 1500);
    expect(transcript.length).toBeLessThanOrEqual(1500);
  });

  it("preserves message order (oldest first)", () => {
    const msgs = [
      { role: "user" as const, content: "First message" },
      { role: "assistant" as const, content: "Second message" },
      { role: "user" as const, content: "Third message" },
    ];
    const transcript = buildTranscript(msgs);
    const firstIdx = transcript.indexOf("First message");
    const secondIdx = transcript.indexOf("Second message");
    const thirdIdx = transcript.indexOf("Third message");
    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });
});

describe("AI session title — title sanitization", () => {
  it("strips surrounding double quotes", () => {
    expect(sanitizeTitle('"Facing the fear of failure"')).toBe("Facing the fear of failure");
  });

  it("strips surrounding single quotes", () => {
    expect(sanitizeTitle("'Finding clarity in chaos'")).toBe("Finding clarity in chaos");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeTitle("  Letting go of perfectionism  ")).toBe("Letting go of perfectionism");
  });

  it("truncates to maxLen characters", () => {
    const longTitle = "a".repeat(200);
    expect(sanitizeTitle(longTitle, 120).length).toBe(120);
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeTitle("")).toBe("");
    expect(sanitizeTitle("   ")).toBe("");
  });

  it("strips trailing quote even when it appears inside the title", () => {
    // The regex /^["']|["']$/g strips the first and last character if they are quotes.
    // So a title ending in a quote (like 'inner critic') will have that trailing quote removed.
    const title = "I can't stop the 'inner critic'";
    // Trailing single quote IS stripped by the sanitizer (by design)
    expect(sanitizeTitle(title)).toBe("I can't stop the 'inner critic");
  });

  it("handles title with only one surrounding quote character", () => {
    // Only the leading quote should be stripped (no trailing quote to strip)
    expect(sanitizeTitle('"No closing quote')).toBe("No closing quote");
  });
});

describe("AI session title — real-world title examples", () => {
  const examples = [
    '"Facing the fear of failure"',
    '"Finding clarity in chaos"',
    '"Letting go of perfectionism"',
    '"Breaking free from self-doubt"',
    '"Reconnecting with inner purpose"',
  ];

  examples.forEach((raw) => {
    it(`sanitizes: ${raw}`, () => {
      const result = sanitizeTitle(raw);
      expect(result).not.toMatch(/^["']/);
      expect(result).not.toMatch(/["']$/);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(120);
    });
  });
});
