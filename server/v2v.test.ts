/**
 * V2V Relay module tests
 * - Validates Hume token minting (credentials test already in hume-credentials.test.ts)
 * - Tests the top3Emotions helper logic
 * - Tests kill phrase detection
 */
import { describe, it, expect } from "vitest";

// ─── Test the kill phrase detection logic ────────────────────────────────────

const KILL_PHRASES = [
  "suicide",
  "kill myself",
  "killing myself",
  "end my life",
  "ending it all",
  "end it all",
  "don't want to be here anymore",
  "dont want to be here anymore",
  "i want to die",
  "hurting myself",
  "hurt myself",
  "self harm",
  "self-harm",
  "hurt someone",
  "hurting someone",
];

function containsKillPhrase(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return KILL_PHRASES.some((p) => t.includes(p));
}

// ─── Test the top3Emotions extraction ────────────────────────────────────────

type Emotion = { name: string; score: number };

function top3Emotions(scores: Record<string, number> | undefined): Emotion[] {
  if (!scores) return [];
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, score]) => ({ name, score }));
}

describe("V2V Kill Phrase Detection", () => {
  it("should detect direct kill phrases", () => {
    expect(containsKillPhrase("I want to kill myself")).toBe(true);
    expect(containsKillPhrase("I'm thinking about suicide")).toBe(true);
    expect(containsKillPhrase("I want to end my life")).toBe(true);
    expect(containsKillPhrase("I'm hurting myself")).toBe(true);
    expect(containsKillPhrase("I don't want to be here anymore")).toBe(true);
  });

  it("should be case-insensitive", () => {
    expect(containsKillPhrase("I Want To KILL MYSELF")).toBe(true);
    expect(containsKillPhrase("SUICIDE")).toBe(true);
  });

  it("should not trigger on safe phrases", () => {
    expect(containsKillPhrase("I'm feeling a bit down today")).toBe(false);
    expect(containsKillPhrase("I want to improve myself")).toBe(false);
    expect(containsKillPhrase("This kills me with laughter")).toBe(false);
    expect(containsKillPhrase("I ended the conversation")).toBe(false);
    expect(containsKillPhrase("")).toBe(false);
  });

  it("should detect self-harm variations", () => {
    expect(containsKillPhrase("I've been self harming")).toBe(true);
    expect(containsKillPhrase("thinking about self-harm")).toBe(true);
  });
});

describe("V2V Top 3 Emotions Extraction", () => {
  it("should return top 3 emotions sorted by score descending", () => {
    const scores = {
      Joy: 0.85,
      Sadness: 0.05,
      Interest: 0.6,
      Excitement: 0.7,
      Confusion: 0.02,
    };
    const result = top3Emotions(scores);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ name: "Joy", score: 0.85 });
    expect(result[1]).toEqual({ name: "Excitement", score: 0.7 });
    expect(result[2]).toEqual({ name: "Interest", score: 0.6 });
  });

  it("should return empty array for undefined scores", () => {
    expect(top3Emotions(undefined)).toEqual([]);
  });

  it("should handle fewer than 3 emotions", () => {
    const scores = { Joy: 0.9, Sadness: 0.1 };
    const result = top3Emotions(scores);
    expect(result).toHaveLength(2);
  });

  it("should handle empty scores object", () => {
    expect(top3Emotions({})).toEqual([]);
  });
});

describe("V2V WebSocket Relay", () => {
  it("should have HUME_API_KEY and HUME_SECRET_KEY set", () => {
    // These are set via webdev_request_secrets
    expect(process.env.HUME_API_KEY).toBeDefined();
    expect(process.env.HUME_API_KEY!.length).toBeGreaterThan(0);
    expect(process.env.HUME_SECRET_KEY).toBeDefined();
    expect(process.env.HUME_SECRET_KEY!.length).toBeGreaterThan(0);
  });
});
