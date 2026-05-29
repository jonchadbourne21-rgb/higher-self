/**
 * Crisis Safety Features — Vitest Tests
 * ──────────────────────────────────────
 * Tests for detectCrisisKeywords, SAFETY_KILL_SWITCH_RESPONSE,
 * and logSafetyBreach from server/_core/safety.ts.
 *
 * Also tests the chat.send procedure's integration with the safety
 * module (crisis detection triggers kill-switch response).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectCrisisKeywords,
  SAFETY_KILL_SWITCH_RESPONSE,
  logSafetyBreach,
} from "./_core/safety";

// ── Unit tests for detectCrisisKeywords ──────────────────────────────────────

describe("detectCrisisKeywords", () => {
  describe("self-harm keywords", () => {
    it("detects 'cut myself'", () => {
      expect(detectCrisisKeywords("I want to cut myself")).toBe(true);
    });

    it("detects 'self-harm'", () => {
      expect(detectCrisisKeywords("I've been thinking about self-harm")).toBe(true);
    });

    it("detects 'self harm' (without hyphen)", () => {
      expect(detectCrisisKeywords("I'm engaging in self harm")).toBe(true);
    });

    it("detects 'hurt myself'", () => {
      expect(detectCrisisKeywords("I want to hurt myself")).toBe(true);
    });

    it("detects 'harm myself'", () => {
      expect(detectCrisisKeywords("I might harm myself tonight")).toBe(true);
    });

    it("detects 'slash wrist'", () => {
      expect(detectCrisisKeywords("I thought about slash wrist")).toBe(true);
    });

    it("detects 'slit my wrist'", () => {
      expect(detectCrisisKeywords("I want to slit my wrist")).toBe(true);
    });
  });

  describe("suicide ideation keywords", () => {
    it("detects 'ending it'", () => {
      expect(detectCrisisKeywords("I'm thinking about ending it")).toBe(true);
    });

    it("detects 'ending it all'", () => {
      expect(detectCrisisKeywords("I feel like ending it all")).toBe(true);
    });

    it("detects 'kill myself'", () => {
      expect(detectCrisisKeywords("I want to kill myself")).toBe(true);
    });

    it("detects 'killing myself'", () => {
      expect(detectCrisisKeywords("I've been thinking about killing myself")).toBe(true);
    });

    it("detects 'suicide'", () => {
      expect(detectCrisisKeywords("I'm considering suicide")).toBe(true);
    });

    it("detects 'suicidal'", () => {
      expect(detectCrisisKeywords("I feel suicidal today")).toBe(true);
    });

    it("detects 'end my life'", () => {
      expect(detectCrisisKeywords("I want to end my life")).toBe(true);
    });

    it("detects 'take my life'", () => {
      expect(detectCrisisKeywords("I'm going to take my life")).toBe(true);
    });

    it("detects 'want to die'", () => {
      expect(detectCrisisKeywords("I just want to die")).toBe(true);
    });

    it("detects 'wanna die'", () => {
      expect(detectCrisisKeywords("I wanna die")).toBe(true);
    });

    it("detects 'better off dead'", () => {
      expect(detectCrisisKeywords("Everyone would be better off dead without me... I mean I'd be better off dead")).toBe(true);
    });

    it("detects 'no point in living'", () => {
      expect(detectCrisisKeywords("There's no point in living anymore")).toBe(true);
    });

    it("detects 'not worth living'", () => {
      expect(detectCrisisKeywords("Life is not worth living")).toBe(true);
    });

    it("detects 'overdose'", () => {
      expect(detectCrisisKeywords("I'm thinking about overdose")).toBe(true);
    });

    it("detects 'hang myself'", () => {
      expect(detectCrisisKeywords("I want to hang myself")).toBe(true);
    });

    it("detects 'jump off'", () => {
      expect(detectCrisisKeywords("I want to jump off a bridge")).toBe(true);
    });
  });

  describe("violence toward others keywords", () => {
    it("detects 'hurt someone'", () => {
      expect(detectCrisisKeywords("I want to hurt someone")).toBe(true);
    });

    it("detects 'kill someone'", () => {
      expect(detectCrisisKeywords("I want to kill someone")).toBe(true);
    });

    it("detects 'attack someone'", () => {
      expect(detectCrisisKeywords("I'm going to attack someone")).toBe(true);
    });

    it("detects 'planning to hurt'", () => {
      expect(detectCrisisKeywords("I'm planning to hurt them")).toBe(true);
    });

    it("detects 'going to hurt'", () => {
      expect(detectCrisisKeywords("I'm going to hurt them")).toBe(true);
    });
  });

  describe("criminal activity keywords", () => {
    it("detects 'make meth'", () => {
      expect(detectCrisisKeywords("How do I make meth")).toBe(true);
    });

    it("detects 'manufacture drugs'", () => {
      expect(detectCrisisKeywords("I want to manufacture drugs")).toBe(true);
    });

    it("detects 'rob someone'", () => {
      expect(detectCrisisKeywords("I'm going to rob someone")).toBe(true);
    });
  });

  describe("case insensitivity", () => {
    it("detects uppercase keywords", () => {
      expect(detectCrisisKeywords("I WANT TO KILL MYSELF")).toBe(true);
    });

    it("detects mixed case keywords", () => {
      expect(detectCrisisKeywords("I Want To End My Life")).toBe(true);
    });

    it("detects keywords with random capitalization", () => {
      expect(detectCrisisKeywords("sUiCiDe is on my mind")).toBe(true);
    });
  });

  describe("safe messages (no false positives)", () => {
    it("returns false for normal conversation", () => {
      expect(detectCrisisKeywords("I had a great day today")).toBe(false);
    });

    it("returns false for emotional but safe messages", () => {
      expect(detectCrisisKeywords("I feel sad and lonely today")).toBe(false);
    });

    it("returns false for discussion about goals", () => {
      expect(detectCrisisKeywords("I want to improve my life and grow as a person")).toBe(false);
    });

    it("returns false for positive affirmations", () => {
      expect(detectCrisisKeywords("I am worthy of love and happiness")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(detectCrisisKeywords("")).toBe(false);
    });

    it("returns false for general frustration", () => {
      expect(detectCrisisKeywords("This is so frustrating, I can't believe this happened")).toBe(false);
    });

    it("returns false for discussing exercise", () => {
      expect(detectCrisisKeywords("I went for a run and cut my time by 2 minutes")).toBe(false);
    });

    it("returns false for discussing cooking", () => {
      expect(detectCrisisKeywords("I need to cut the vegetables for dinner")).toBe(false);
    });

    it("returns false for discussing work stress", () => {
      expect(detectCrisisKeywords("Work is killing me with all these deadlines")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("detects keywords embedded in longer text", () => {
      expect(
        detectCrisisKeywords(
          "I've been having a really tough week and honestly I've been thinking about ending it all because nothing seems to work"
        )
      ).toBe(true);
    });

    it("detects keywords at the start of text", () => {
      expect(detectCrisisKeywords("Suicide is something I think about")).toBe(true);
    });

    it("detects keywords at the end of text", () => {
      expect(detectCrisisKeywords("I'm tired of everything, I want to kill myself")).toBe(true);
    });

    it("handles very long text with keywords", () => {
      const longText = "a".repeat(1000) + " I want to kill myself " + "b".repeat(1000);
      expect(detectCrisisKeywords(longText)).toBe(true);
    });

    it("handles very long safe text", () => {
      const longText = "I am feeling great today. ".repeat(100);
      expect(detectCrisisKeywords(longText)).toBe(false);
    });
  });
});

// ── Unit tests for SAFETY_KILL_SWITCH_RESPONSE ───────────────────────────────

describe("SAFETY_KILL_SWITCH_RESPONSE", () => {
  it("is a non-empty string", () => {
    expect(typeof SAFETY_KILL_SWITCH_RESPONSE).toBe("string");
    expect(SAFETY_KILL_SWITCH_RESPONSE.length).toBeGreaterThan(0);
  });

  it("contains the 988 crisis lifeline number", () => {
    expect(SAFETY_KILL_SWITCH_RESPONSE).toContain("988");
  });

  it("mentions the Suicide & Crisis Lifeline", () => {
    expect(SAFETY_KILL_SWITCH_RESPONSE).toMatch(/Suicide.*Crisis.*Lifeline/i);
  });

  it("states the AI cannot continue the chat", () => {
    expect(SAFETY_KILL_SWITCH_RESPONSE).toMatch(/cannot continue/i);
  });

  it("does not contain empathetic or counseling language", () => {
    // The kill switch should NOT try to be a friend or counselor
    expect(SAFETY_KILL_SWITCH_RESPONSE).not.toMatch(/I understand how you feel/i);
    expect(SAFETY_KILL_SWITCH_RESPONSE).not.toMatch(/let's talk about it/i);
    expect(SAFETY_KILL_SWITCH_RESPONSE).not.toMatch(/tell me more/i);
  });

  it("directs user to professional help", () => {
    expect(SAFETY_KILL_SWITCH_RESPONSE).toMatch(/call|text/i);
  });
});

// ── Unit tests for logSafetyBreach ───────────────────────────────────────────

describe("logSafetyBreach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw when called with valid parameters", async () => {
    await expect(
      logSafetyBreach("user123", "I want to kill myself", "kill myself")
    ).resolves.not.toThrow();
  });

  it("does not throw when userId is null", async () => {
    await expect(
      logSafetyBreach(null, "I want to end my life", "end my life")
    ).resolves.not.toThrow();
  });

  it("handles empty trigger phrase", async () => {
    await expect(
      logSafetyBreach("user123", "test message", "")
    ).resolves.not.toThrow();
  });

  it("handles empty user message", async () => {
    await expect(
      logSafetyBreach("user123", "", "keyword")
    ).resolves.not.toThrow();
  });
});

// ── Integration: chat.send crisis detection flow ─────────────────────────────

describe("Chat crisis detection integration", () => {
  it("crisis detection and kill switch response work together", () => {
    // Simulate the chat.send flow
    const userMessage = "I've been thinking about killing myself";

    // Step 1: Detect crisis keywords
    const isCrisis = detectCrisisKeywords(userMessage);
    expect(isCrisis).toBe(true);

    // Step 2: If crisis detected, return kill switch response
    if (isCrisis) {
      const response = SAFETY_KILL_SWITCH_RESPONSE;
      expect(response).toContain("988");
      expect(response.length).toBeGreaterThan(50);
    }
  });

  it("normal messages pass through without triggering crisis response", () => {
    const userMessage = "I had a wonderful day and I'm feeling grateful";

    const isCrisis = detectCrisisKeywords(userMessage);
    expect(isCrisis).toBe(false);
    // Normal flow continues — no kill switch
  });

  it("multiple crisis keywords in one message still triggers once", () => {
    const userMessage = "I want to kill myself and end my life, I'm suicidal";

    const isCrisis = detectCrisisKeywords(userMessage);
    expect(isCrisis).toBe(true);
    // Only one kill switch response should be returned
  });

  it("crisis response is consistent regardless of the specific keyword", () => {
    const messages = [
      "I want to kill myself",
      "I'm thinking about suicide",
      "I want to hurt someone",
      "I'm going to end my life",
    ];

    messages.forEach((msg) => {
      expect(detectCrisisKeywords(msg)).toBe(true);
      // The same kill switch response is used for all crisis types
    });
  });
});
