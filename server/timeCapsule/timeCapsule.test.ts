import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock the DB module
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

describe("Time Capsule - Fingerprint Extraction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should export extractAndSaveFingerprint function", async () => {
    const { extractAndSaveFingerprint } = await import("./fingerprint");
    expect(extractAndSaveFingerprint).toBeDefined();
    expect(typeof extractAndSaveFingerprint).toBe("function");
  });

  it("should return null for empty messages", async () => {
    const { extractAndSaveFingerprint } = await import("./fingerprint");
    const result = await extractAndSaveFingerprint(1, "chat", "session-1", []);
    expect(result).toBeFalsy();
  });

  it("should return null for very short messages", async () => {
    const { extractAndSaveFingerprint } = await import("./fingerprint");
    const result = await extractAndSaveFingerprint(1, "chat", "session-1", ["hi", "ok"]);
    expect(result).toBeFalsy();
  });

  it("should call LLM with correct extraction prompt structure", async () => {
    const { invokeLLM } = await import("../_core/llm");
    const { getDb } = await import("../db");
    
    // Mock LLM to return valid JSON
    (invokeLLM as any).mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            emotionalTone: "anxious determination",
            coreBelief: "I'm not good enough yet but I can be",
            unresolvedTension: "wanting success but fearing the cost",
            rawExcerpts: ["I keep pushing but something feels off", "Maybe I'm not ready"],
            aspirationalSelf: "Someone who trusts their own timing",
          }),
        },
      }],
    });

    // Mock DB
    const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) });
    (getDb as any).mockResolvedValue({
      insert: mockInsert,
    });

    const { extractAndSaveFingerprint } = await import("./fingerprint");
    const messages = [
      "I've been thinking a lot about whether I'm on the right path. Sometimes I feel like I'm just going through the motions.",
      "I keep pushing but something feels off. Like I'm performing success instead of living it.",
      "Maybe I'm not ready for what I say I want. Or maybe I'm more ready than I think.",
    ];

    await extractAndSaveFingerprint(1, "chat", "session-1", messages);

    expect(invokeLLM).toHaveBeenCalledOnce();
    const call = (invokeLLM as any).mock.calls[0][0];
    expect(call.messages[0].role).toBe("system");
    expect(call.messages[0].content).toContain("psychological fingerprint");
    expect(call.messages[1].role).toBe("user");
    expect(call.messages[1].content).toContain("I keep pushing");
  });

  it("should handle LLM returning invalid JSON gracefully", async () => {
    const { invokeLLM } = await import("../_core/llm");
    (invokeLLM as any).mockResolvedValue({
      choices: [{ message: { content: "This is not JSON" } }],
    });

    const { extractAndSaveFingerprint } = await import("./fingerprint");
    const messages = [
      "I've been thinking a lot about my life and where I'm headed with all of this uncertainty.",
      "Sometimes I wonder if I'm making the right choices or just avoiding the hard ones.",
    ];

    const result = await extractAndSaveFingerprint(1, "chat", "session-1", messages);
    expect(result).toBeFalsy();
  });

  it("should handle LLM errors gracefully", async () => {
    const { invokeLLM } = await import("../_core/llm");
    (invokeLLM as any).mockRejectedValue(new Error("API timeout"));

    const { extractAndSaveFingerprint } = await import("./fingerprint");
    const messages = [
      "I've been thinking a lot about my life and where I'm headed with all of this uncertainty.",
      "Sometimes I wonder if I'm making the right choices or just avoiding the hard ones.",
    ];

    const result = await extractAndSaveFingerprint(1, "chat", "session-1", messages);
    expect(result).toBeFalsy();
  });
});

describe("Time Capsule - Letter Generation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should export generateLetter function", async () => {
    const { generateLetter } = await import("./letterGenerator");
    expect(generateLetter).toBeDefined();
    expect(typeof generateLetter).toBe("function");
  });

  it("should return null for empty fingerprints", async () => {
    const { generateLetter } = await import("./letterGenerator");
    const result = await generateLetter([]);
    expect(result).toBeNull();
  });

  it("should call LLM with fingerprint context for letter generation", async () => {
    const { invokeLLM } = await import("../_core/llm");
    (invokeLLM as any).mockResolvedValue({
      choices: [{
        message: {
          content: "Hey. Remember when you said you'd stop running? You said those words — 'I'm done performing.' Did you mean it? Did you become the person who trusts their own timing?",
        },
      }],
    });

    const { generateLetter } = await import("./letterGenerator");
    const fingerprints = [
      {
        id: 1,
        userId: 1,
        sessionType: "chat" as const,
        sessionId: "s1",
        emotionalTone: "anxious determination",
        coreBelief: "I'm not good enough yet",
        unresolvedTension: "wanting success but fearing the cost",
        rawExcerpts: ["I keep pushing but something feels off"],
        aspirationalSelf: "Someone who trusts their own timing",
        extractedAt: new Date("2025-01-15"),
      },
      {
        id: 2,
        userId: 1,
        sessionType: "voice" as const,
        sessionId: "s2",
        emotionalTone: "quiet sadness",
        coreBelief: "I don't deserve rest",
        unresolvedTension: "needing to stop but feeling guilty",
        rawExcerpts: ["I'm done performing", "When do I get to just be?"],
        aspirationalSelf: "A person who rests without guilt",
        extractedAt: new Date("2025-01-20"),
      },
      {
        id: 3,
        userId: 1,
        sessionType: "checkin" as const,
        sessionId: "s3",
        emotionalTone: "hopeful exhaustion",
        coreBelief: "Change is possible but slow",
        unresolvedTension: "impatience with growth",
        rawExcerpts: ["I can see who I want to be but can't reach them yet"],
        aspirationalSelf: null,
        extractedAt: new Date("2025-01-25"),
      },
    ];

    const result = await generateLetter(fingerprints as any);

    expect(invokeLLM).toHaveBeenCalledOnce();
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");

    // Verify the prompt includes fingerprint data
    const call = (invokeLLM as any).mock.calls[0][0];
    expect(call.messages[0].content).toContain("psychological confrontation");
    expect(call.messages[1].content).toContain("anxious determination");
    expect(call.messages[1].content).toContain("I keep pushing but something feels off");
    expect(call.messages[1].content).toContain("Someone who trusts their own timing");
  });

  it("should handle LLM failure gracefully", async () => {
    const { invokeLLM } = await import("../_core/llm");
    (invokeLLM as any).mockRejectedValue(new Error("Rate limited"));

    const { generateLetter } = await import("./letterGenerator");
    const fingerprints = [
      {
        id: 1, userId: 1, sessionType: "chat", sessionId: "s1",
        emotionalTone: "test", coreBelief: "test", unresolvedTension: "test",
        rawExcerpts: ["test"], aspirationalSelf: null, extractedAt: new Date(),
      },
    ];

    const result = await generateLetter(fingerprints as any);
    expect(result).toBeNull();
  });
});

describe("Time Capsule - Letter Lifecycle", () => {
  it("should export getUserLetters function", async () => {
    const { getUserLetters } = await import("./letterGenerator");
    expect(getUserLetters).toBeDefined();
  });

  it("should export markLetterDelivered function", async () => {
    const { markLetterDelivered } = await import("./letterGenerator");
    expect(markLetterDelivered).toBeDefined();
  });

  it("should export markLetterRead function", async () => {
    const { markLetterRead } = await import("./letterGenerator");
    expect(markLetterRead).toBeDefined();
  });

  it("should export getUnreadLetterCount function", async () => {
    const { getUnreadLetterCount } = await import("./letterGenerator");
    expect(getUnreadLetterCount).toBeDefined();
  });
});

describe("Time Capsule - Scheduled Job Handler", () => {
  it("should export timeCapsuleHandler", async () => {
    const { timeCapsuleHandler } = await import("../jobs/timeCapsuleJob");
    expect(timeCapsuleHandler).toBeDefined();
    expect(typeof timeCapsuleHandler).toBe("function");
  });

  it("should reject non-cron requests with 403", async () => {
    const { timeCapsuleHandler } = await import("../jobs/timeCapsuleJob");
    
    const req = { headers: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    await timeCapsuleHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "cron-only endpoint" });
  });
});
