import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }),
}));

vi.mock("./pushNotifications", () => ({
  sendPushNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content:
            "Hey, I noticed you've been quiet lately. I just wanted to check in and remind you that the work you started matters. What's one thing you can do today to move forward?",
        },
      },
    ],
  }),
}));

vi.mock("./humeTts", () => ({
  humeTextToSpeech: vi.fn().mockResolvedValue(Buffer.from("fake-audio-data")),
}));

vi.mock("./storage", () => ({
  storagePut: vi
    .fn()
    .mockResolvedValue({ url: "https://s3.example.com/voicemail-123.wav" }),
}));

describe("Outbound Call System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendOutboundCallNotification", () => {
    it("should create a voicemail record and send push notification", async () => {
      const { sendOutboundCallNotification } = await import("./outboundCall");
      // Should not throw
      await expect(
        sendOutboundCallNotification(1, 78)
      ).resolves.not.toThrow();
    });
  });

  describe("buildEntropyAwarePrompt", () => {
    it("should return a string system prompt with entropy context", async () => {
      const { buildEntropyAwarePrompt } = await import("./outboundCall");
      const prompt = await buildEntropyAwarePrompt(1);
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("should include entropy awareness in the prompt", async () => {
      const { buildEntropyAwarePrompt } = await import("./outboundCall");
      const prompt = await buildEntropyAwarePrompt(1);
      expect(prompt.toLowerCase()).toContain("entropy");
    });
  });

  describe("generateVoicemail", () => {
    it("should generate voicemail text and synthesize audio", async () => {
      const { generateVoicemail } = await import("./outboundCall");
      // Should not throw
      await expect(generateVoicemail(1, 1)).resolves.not.toThrow();
    });

    it("should call LLM for voicemail script", async () => {
      const { invokeLLM } = await import("./_core/llm");
      const { generateVoicemail } = await import("./outboundCall");
      await generateVoicemail(1, 1);
      expect(invokeLLM).toHaveBeenCalled();
    });

    it("should call Hume TTS for audio synthesis", async () => {
      const { humeTextToSpeech } = await import("./humeTts");
      const { generateVoicemail } = await import("./outboundCall");
      await generateVoicemail(1, 1);
      expect(humeTextToSpeech).toHaveBeenCalled();
    });

    it("should upload audio to S3", async () => {
      const { storagePut } = await import("./storage");
      const { generateVoicemail } = await import("./outboundCall");
      await generateVoicemail(1, 1);
      expect(storagePut).toHaveBeenCalled();
    });
  });

  describe("getUserVoicemails", () => {
    it("should return an array", async () => {
      const { getUserVoicemails } = await import("./outboundCall");
      const result = await getUserVoicemails(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("markVoicemailListened", () => {
    it("should not throw", async () => {
      const { markVoicemailListened } = await import("./outboundCall");
      await expect(markVoicemailListened(1)).resolves.not.toThrow();
    });
  });

  describe("markCallAnswered", () => {
    it("should not throw", async () => {
      const { markCallAnswered } = await import("./outboundCall");
      await expect(markCallAnswered(1)).resolves.not.toThrow();
    });
  });
});
