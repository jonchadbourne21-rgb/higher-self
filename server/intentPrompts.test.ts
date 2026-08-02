import { describe, it, expect } from "vitest";
import {
  buildIntentSpecificPrompt,
  buildLongFormPrompt,
  MIRROR_SELF_IDENTITY,
  HIGHER_SELF_IDENTITY,
  CONVERSATIONAL_BREVITY,
  SeedIntent,
} from "./intentPrompts";

const mockContext = {
  name: "Alex",
  valuesStr: "Authenticity, Growth, Connection",
  goalsStr: "Build deeper relationships, advance career",
  visionStr: "Live with purpose and impact others positively",
  beliefsStr: "I can grow through challenges",
  avgMood: "7.2",
  domainStr: "mindset: 7/10, relationships: 6/10, work: 8/10, health: 7/10, spirituality: 6/10, finances: 7/10",
};

const ALL_INTENTS: SeedIntent[] = ["Inner Peace", "Clarity", "Confidence", "Healing", "Focus"];

describe("Mirror-Self identity", () => {
  it("is shared verbatim by every intent", () => {
    ALL_INTENTS.forEach((intent) => {
      expect(buildIntentSpecificPrompt(intent, mockContext)).toContain(MIRROR_SELF_IDENTITY);
    });
  });

  it("is scoped to live conversation and never reaches long-form surfaces", () => {
    // Mirror-Self is for chat and voice only. Weekly insights, digests, program
    // feedback, outbound calls and letters keep the Higher Self voice.
    const longForm = buildLongFormPrompt("Write their weekly reflection.");
    expect(longForm).not.toContain(MIRROR_SELF_IDENTITY);
    expect(longForm).not.toContain("Mirror-Self");
    expect(longForm).toContain(HIGHER_SELF_IDENTITY);
  });

  it("establishes the Mirror-Self as a person, not an assistant", () => {
    expect(MIRROR_SELF_IDENTITY).toContain("Mirror-Self");
    expect(MIRROR_SELF_IDENTITY).toContain("not an assistant");
  });

  it("carries the anti-formula instruction", () => {
    expect(MIRROR_SELF_IDENTITY).toContain("You break patterns");
    expect(MIRROR_SELF_IDENTITY).toContain("No autopilot");
  });

  it("keeps the philosophy invisible", () => {
    // The lenses are named so the model knows which to use, but it is told never
    // to surface them. Losing this instruction is how jargon leaks into replies.
    expect(MIRROR_SELF_IDENTITY).toContain("Never name a philosopher");
    expect(MIRROR_SELF_IDENTITY).toContain("never use the jargon");
  });

  it("contains no template placeholders, so profile-less surfaces can reuse it", () => {
    expect(MIRROR_SELF_IDENTITY).not.toContain("${");
    expect(MIRROR_SELF_IDENTITY).not.toContain("undefined");
  });
});

describe("intent focus", () => {
  it("points Inner Peace at presence and acceptance", () => {
    const prompt = buildIntentSpecificPrompt("Inner Peace", mockContext);
    expect(prompt).toContain("Inner Peace");
    expect(prompt).toContain("present moment");
    expect(prompt).toContain("acceptance");
    expect(prompt).toContain("control");
  });

  it("points Clarity at patterns and what's underneath", () => {
    const prompt = buildIntentSpecificPrompt("Clarity", mockContext);
    expect(prompt).toContain("Clarity");
    expect(prompt).toContain("patterns");
    expect(prompt).toContain("underneath");
  });

  it("points Confidence at strengths and action", () => {
    const prompt = buildIntentSpecificPrompt("Confidence", mockContext);
    expect(prompt).toContain("Confidence");
    expect(prompt).toContain("strengths");
    expect(prompt).toContain("action");
  });

  it("points Healing at pain and self-compassion", () => {
    const prompt = buildIntentSpecificPrompt("Healing", mockContext);
    expect(prompt).toContain("Healing");
    expect(prompt).toContain("pain");
    expect(prompt).toContain("Self-compassion");
  });

  it("points Focus at priorities and cutting noise", () => {
    const prompt = buildIntentSpecificPrompt("Focus", mockContext);
    expect(prompt).toContain("Focus");
    expect(prompt).toContain("noise");
    expect(prompt).toContain("priority");
  });

  it("gives each intent a distinct prompt", () => {
    const prompts = ALL_INTENTS.map((i) => buildIntentSpecificPrompt(i, mockContext));
    expect(new Set(prompts).size).toBe(ALL_INTENTS.length);
  });

  it("omits the focus block entirely when no intent is set", () => {
    const prompt = buildIntentSpecificPrompt(undefined, mockContext);
    expect(prompt).not.toContain("Today they're reaching for");
    ALL_INTENTS.forEach((intent) => {
      expect(prompt).not.toContain(`reaching for ${intent}`);
    });
  });

  it("falls back to no focus for an unrecognised intent rather than throwing", () => {
    const prompt = buildIntentSpecificPrompt("Unknown Intent" as SeedIntent, mockContext);
    expect(prompt).toContain(MIRROR_SELF_IDENTITY);
    expect(prompt).not.toContain("Today they're reaching for");
  });

  it("cannot be fooled by an inherited Object.prototype key", () => {
    // "constructor" and "toString" are on every object; a naive `in` check would
    // treat them as valid intents and index into undefined.
    expect(() =>
      buildIntentSpecificPrompt("constructor" as SeedIntent, mockContext)
    ).not.toThrow();
    expect(buildIntentSpecificPrompt("toString" as SeedIntent, mockContext)).not.toContain(
      "Today they're reaching for"
    );
  });
});

describe("user context", () => {
  it("is present in every intent prompt", () => {
    ALL_INTENTS.forEach((intent) => {
      const prompt = buildIntentSpecificPrompt(intent, mockContext);
      expect(prompt).toContain("Alex");
      expect(prompt).toContain("Authenticity, Growth, Connection");
      expect(prompt).toContain("Build deeper relationships");
      expect(prompt).toContain("Live with purpose");
      expect(prompt).toContain("I can grow through challenges");
      expect(prompt).toContain("7.2");
    });
  });

  it("keeps the labelled structure", () => {
    const prompt = buildIntentSpecificPrompt("Clarity", mockContext);
    expect(prompt).toContain("WHAT YOU KNOW ABOUT ALEX");
    expect(prompt).toContain("Core Values:");
    expect(prompt).toContain("Short-term Goals:");
    expect(prompt).toContain("Long-term Vision:");
    expect(prompt).toContain("Beliefs they hold:");
  });

  it("tells the model not to recite the profile back", () => {
    expect(buildIntentSpecificPrompt("Focus", mockContext)).toContain("Don't recite it back");
  });

  it("handles an empty profile without leaking placeholders", () => {
    const emptyContext = {
      name: "friend",
      valuesStr: "not yet defined",
      goalsStr: "not yet set",
      visionStr: "not yet defined",
      beliefsStr: "not yet shared",
      avgMood: "unknown",
      domainStr: "not yet assessed",
    };
    const prompt = buildIntentSpecificPrompt("Inner Peace", emptyContext);
    expect(prompt).toContain("friend");
    expect(prompt).toContain("not yet defined");
    expect(prompt).not.toContain("undefined");
  });
});

describe("brevity is conversational only", () => {
  it("applies to chat and voice prompts", () => {
    ALL_INTENTS.forEach((intent) => {
      expect(buildIntentSpecificPrompt(intent, mockContext)).toContain(CONVERSATIONAL_BREVITY);
    });
    expect(buildIntentSpecificPrompt(undefined, mockContext)).toContain(CONVERSATIONAL_BREVITY);
  });

  it("is absent from long-form prompts", () => {
    // A weekly insight, a 200-word letter and a voicemail all need length. If the
    // 1-3 sentence rule leaked into them they would come out truncated.
    const longForm = buildLongFormPrompt("Write a 250-350 word Sunday reflection.");
    expect(longForm).not.toContain(CONVERSATIONAL_BREVITY);
    expect(longForm).not.toContain("One to three sentences");
  });
});

describe("buildLongFormPrompt", () => {
  it("appends the surface's own instructions", () => {
    const prompt = buildLongFormPrompt("Write a 30-60 second voicemail.");
    expect(prompt).toContain("Write a 30-60 second voicemail.");
  });

  it("includes profile context when supplied", () => {
    expect(buildLongFormPrompt("Reflect on their week.", mockContext)).toContain("Alex");
  });

  it("omits the context block entirely when no profile is loaded", () => {
    const prompt = buildLongFormPrompt("Reflect on their week.");
    expect(prompt).not.toContain("WHAT YOU KNOW ABOUT");
    expect(prompt).not.toContain("undefined");
  });
});


describe("Higher Self identity (non-conversational surfaces)", () => {
  it("is used by every long-form prompt", () => {
    expect(buildLongFormPrompt("Write a voicemail.")).toContain(HIGHER_SELF_IDENTITY);
  });

  it("is distinct from the Mirror-Self", () => {
    expect(HIGHER_SELF_IDENTITY).not.toBe(MIRROR_SELF_IDENTITY);
    expect(HIGHER_SELF_IDENTITY).toContain("literal Higher Self");
  });

  it("never appears in a conversational prompt", () => {
    ALL_INTENTS.forEach((intent) => {
      expect(buildIntentSpecificPrompt(intent, mockContext)).not.toContain(HIGHER_SELF_IDENTITY);
    });
  });

  it("contains no template placeholders", () => {
    expect(HIGHER_SELF_IDENTITY).not.toContain("${");
    expect(HIGHER_SELF_IDENTITY).not.toContain("undefined");
  });
});

describe("learning context injection", () => {
  it("is included when supplied", () => {
    const prompt = buildLongFormPrompt(
      "Write their weekly reflection.",
      mockContext,
      "RELEVANT MEMORIES FROM YOUR PAST:\n[Journal Entry — Mar 3]\nI keep avoiding the same conversation."
    );
    expect(prompt).toContain("I keep avoiding the same conversation");
  });

  it("is omitted cleanly when retrieval returned nothing", () => {
    // buildLearningContext degrades to "" on failure; that must not leave a
    // dangling blank section in the prompt.
    const prompt = buildLongFormPrompt("Write their weekly reflection.", mockContext, "");
    expect(prompt).not.toContain("\n\n\n");
    expect(prompt).toContain("Write their weekly reflection.");
  });

  it("is omitted when the caller passes nothing at all", () => {
    const prompt = buildLongFormPrompt("Write their weekly reflection.", mockContext);
    expect(prompt).toContain("Write their weekly reflection.");
    expect(prompt).not.toContain("undefined");
  });
});
