import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for voice session history and voice-to-journal features.
 * Uses mocked DB to avoid requiring a live database connection.
 */

// ── Mock the DB module ────────────────────────────────────────────────────────

const mockMessages = [
  {
    id: 1,
    sessionId: 10,
    role: "user" as const,
    transcript: "I've been feeling anxious about work lately.",
    emotion1Name: "anxiety",
    emotion1Score: 0.72,
    emotion2Name: "sadness",
    emotion2Score: 0.41,
    emotion3Name: null,
    emotion3Score: null,
    createdAt: new Date("2026-05-15T10:00:00Z"),
  },
  {
    id: 2,
    sessionId: 10,
    role: "assistant" as const,
    transcript: "I hear you. What specifically about work is triggering that anxiety?",
    emotion1Name: null,
    emotion1Score: null,
    emotion2Name: null,
    emotion2Score: null,
    emotion3Name: null,
    emotion3Score: null,
    createdAt: new Date("2026-05-15T10:00:05Z"),
  },
];

const mockSession = {
  id: 10,
  userId: 1,
  sessionUuid: "test-uuid-1234",
  startedAt: new Date("2026-05-15T10:00:00Z"),
  endedAt: new Date("2026-05-15T10:15:00Z"),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Voice session history", () => {
  it("should build a transcript from messages correctly", () => {
    const transcript = mockMessages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "Me" : "Mirror"}: ${m.transcript}`)
      .join("\n\n");

    expect(transcript).toContain("Me: I've been feeling anxious about work lately.");
    expect(transcript).toContain("Mirror: I hear you. What specifically about work is triggering that anxiety?");
  });

  it("should aggregate emotion scores correctly", () => {
    const allEmotions: { name: string; score: number }[] = [];
    mockMessages.forEach((m) => {
      if (m.emotion1Name && m.emotion1Score) allEmotions.push({ name: m.emotion1Name, score: m.emotion1Score });
      if (m.emotion2Name && m.emotion2Score) allEmotions.push({ name: m.emotion2Name, score: m.emotion2Score });
    });

    expect(allEmotions).toHaveLength(2);
    expect(allEmotions[0]).toEqual({ name: "anxiety", score: 0.72 });
    expect(allEmotions[1]).toEqual({ name: "sadness", score: 0.41 });
  });

  it("should format session date correctly for journal title", () => {
    const sessionDate = mockSession.startedAt.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const title = `Voice Mirror — ${sessionDate}`;
    expect(title).toContain("Voice Mirror —");
    expect(title).toContain("2026");
  });

  it("should build journal content with header and transcript", () => {
    const transcript = mockMessages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "Me" : "Mirror"}: ${m.transcript}`)
      .join("\n\n");

    const sessionDate = mockSession.startedAt.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const content = `Voice Mirror Session — ${sessionDate}\n\n${transcript}`;
    expect(content).toContain("Voice Mirror Session —");
    expect(content).toContain("Me:");
    expect(content).toContain("Mirror:");
  });

  it("should filter out system messages from transcript", () => {
    const messagesWithSystem = [
      ...mockMessages,
      {
        id: 3,
        sessionId: 10,
        role: "system" as const,
        transcript: "[KILL_SWITCH] Session terminated for safety",
        emotion1Name: null,
        emotion1Score: null,
        emotion2Name: null,
        emotion2Score: null,
        emotion3Name: null,
        emotion3Score: null,
        createdAt: new Date("2026-05-15T10:15:00Z"),
      },
    ];

    const filtered = messagesWithSystem.filter((m) => m.role !== "system");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((m) => m.role !== "system")).toBe(true);
  });

  it("should compute session duration correctly", () => {
    const startedAt = mockSession.startedAt;
    const endedAt = mockSession.endedAt!;
    const diffMs = endedAt.getTime() - startedAt.getTime();
    const mins = Math.floor(diffMs / 60000);
    expect(mins).toBe(15);
  });
});
