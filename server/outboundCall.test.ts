/**
 * Outbound Call System — Vitest Tests
 * ─────────────────────────────────────
 * Tests for sendOutboundCallNotification, buildEntropyAwarePrompt,
 * generateVoicemail, getUserVoicemails, markCallAnswered, markVoicemailListened.
 *
 * All database interactions are mocked so no real DB is needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── DB chain mocks ────────────────────────────────────────────────────────────
let mockUpdateWhere: ReturnType<typeof vi.fn>;
let mockUpdateSet: ReturnType<typeof vi.fn>;
let mockUpdate: ReturnType<typeof vi.fn>;
let mockInsertValues: ReturnType<typeof vi.fn>;
let mockInsert: ReturnType<typeof vi.fn>;
let mockSelectLimit: ReturnType<typeof vi.fn>;
let mockSelectOrderBy: ReturnType<typeof vi.fn>;
let mockSelectWhere: ReturnType<typeof vi.fn>;
let mockSelectFrom: ReturnType<typeof vi.fn>;
let mockSelect: ReturnType<typeof vi.fn>;

function initMocks() {
  mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
  mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
  mockInsertValues = vi.fn().mockResolvedValue([{ insertId: 42 }]);
  mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
  mockSelectLimit = vi.fn().mockResolvedValue([]);
  mockSelectOrderBy = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  // orderBy also needs to be awaitable for getUserVoicemails (no .limit())
  mockSelectOrderBy.mockImplementation(() => {
    const obj = { limit: mockSelectLimit };
    // Make it thenable so `await db.select()...orderBy()` resolves to []
    (obj as unknown as Promise<unknown[]>).then = (resolve: (v: unknown[]) => void) => {
      Promise.resolve([]).then(resolve);
      return obj as unknown as Promise<unknown[]>;
    };
    (obj as unknown as Promise<unknown[]>).catch = () => obj as unknown as Promise<unknown[]>;
    return obj;
  });
  mockSelectWhere = vi.fn().mockReturnValue({ orderBy: mockSelectOrderBy, limit: mockSelectLimit });
  mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });
}

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: vi.fn().mockImplementation(async () => ({
      insert: (...args: unknown[]) => mockInsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      select: (...args: unknown[]) => mockSelect(...args),
    })),
    getActivePushSubscription: vi.fn().mockResolvedValue({
      endpoint: "https://push.example.com/sub123",
      p256dh: "fake-p256dh-key",
      auth: "fake-auth-key",
    }),
    getUserProfile: vi.fn().mockResolvedValue({
      userId: 1,
      preferredName: "Alex",
      seedIntent: "Become more confident",
    }),
    getRecentCheckIns: vi.fn().mockResolvedValue([
      { mood: 6, energy: 5, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { mood: 5, energy: 4, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    ]),
  };
});

vi.mock("./pushNotifications", () => ({
  sendPushNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content:
            "Hey Alex... I noticed you've been quiet lately. I just wanted to check in and remind you that the work you started matters. What's one thing you can do today to move forward?",
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
    .mockResolvedValue({ url: "https://s3.example.com/voicemail-123.mp3", key: "voicemails/1/42-abc.mp3" }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("Outbound Call System", () => {
  beforeEach(() => {
    initMocks();
    vi.clearAllMocks();
    // Re-init after clearAllMocks to restore implementations
    initMocks();
  });

  // ── sendOutboundCallNotification ──────────────────────────────────────────
  describe("sendOutboundCallNotification", () => {
    it("should return true when push subscription exists and notification is sent", async () => {
      const { sendOutboundCallNotification } = await import("./outboundCall");
      const result = await sendOutboundCallNotification(1, 78);
      expect(result).toBe(true);
    });

    it("should create a voicemail record before sending the push", async () => {
      const { sendOutboundCallNotification } = await import("./outboundCall");
      await sendOutboundCallNotification(1, 78);
      expect(mockInsert).toHaveBeenCalled();
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          entropyScore: 78,
          wasAnswered: false,
          status: "pending_generation",
        })
      );
    });

    it("should call sendPushNotification with the correct title", async () => {
      const { sendPushNotification } = await import("./pushNotifications");
      const { sendOutboundCallNotification } = await import("./outboundCall");
      await sendOutboundCallNotification(1, 78);
      expect(sendPushNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          title: "Your Higher Self is calling...",
        })
      );
    });

    it("should return false when user has no push subscription", async () => {
      const { getActivePushSubscription } = await import("./db");
      (getActivePushSubscription as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { sendOutboundCallNotification } = await import("./outboundCall");
      const result = await sendOutboundCallNotification(99, 70);
      expect(result).toBe(false);
    });

    it("should include the voicemailId in the notification URL", async () => {
      const { sendPushNotification } = await import("./pushNotifications");
      const { sendOutboundCallNotification } = await import("./outboundCall");
      await sendOutboundCallNotification(1, 78);
      expect(sendPushNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          url: expect.stringContaining("voicemailId="),
        })
      );
    });
  });

  // ── buildEntropyAwarePrompt ───────────────────────────────────────────────
  describe("buildEntropyAwarePrompt", () => {
    it("should return a non-empty string", async () => {
      const { buildEntropyAwarePrompt } = await import("./outboundCall");
      const prompt = await buildEntropyAwarePrompt(1);
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("should mention entropy in the prompt", async () => {
      const { buildEntropyAwarePrompt } = await import("./outboundCall");
      const prompt = await buildEntropyAwarePrompt(1);
      expect(prompt.toLowerCase()).toContain("entropy");
    });

    it("should include the user's name from their profile", async () => {
      const { buildEntropyAwarePrompt } = await import("./outboundCall");
      const prompt = await buildEntropyAwarePrompt(1);
      expect(prompt).toContain("Alex");
    });

    it("should include safety crisis resource guidance", async () => {
      const { buildEntropyAwarePrompt } = await import("./outboundCall");
      const prompt = await buildEntropyAwarePrompt(1);
      expect(prompt).toContain("988");
    });

    it("should fall back gracefully when db is unavailable", async () => {
      const { getDb } = await import("./db");
      (getDb as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { buildEntropyAwarePrompt } = await import("./outboundCall");
      const prompt = await buildEntropyAwarePrompt(1);
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  // ── generateVoicemail ─────────────────────────────────────────────────────
  describe("generateVoicemail", () => {
    it("should return transcript and audioUrl on success", async () => {
      const { generateVoicemail } = await import("./outboundCall");
      const result = await generateVoicemail(1, 42);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty("transcript");
      expect(result).toHaveProperty("audioUrl");
    });

    it("should call LLM to generate the voicemail script", async () => {
      const { invokeLLM } = await import("./_core/llm");
      const { generateVoicemail } = await import("./outboundCall");
      await generateVoicemail(1, 42);
      expect(invokeLLM).toHaveBeenCalledTimes(1);
    });

    it("should call Hume TTS with the generated transcript", async () => {
      const { humeTextToSpeech } = await import("./humeTts");
      const { generateVoicemail } = await import("./outboundCall");
      await generateVoicemail(1, 42);
      expect(humeTextToSpeech).toHaveBeenCalledTimes(1);
      expect(humeTextToSpeech).toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.any(String) })
      );
    });

    it("should upload the audio buffer to S3", async () => {
      const { storagePut } = await import("./storage");
      const { generateVoicemail } = await import("./outboundCall");
      await generateVoicemail(1, 42);
      expect(storagePut).toHaveBeenCalledTimes(1);
      expect(storagePut).toHaveBeenCalledWith(
        expect.stringContaining("voicemails/"),
        expect.any(Buffer),
        "audio/mpeg"
      );
    });

    it("should update the voicemail record with status 'ready' on success", async () => {
      const { generateVoicemail } = await import("./outboundCall");
      await generateVoicemail(1, 42);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: "ready" })
      );
    });

    it("should return null when db is unavailable", async () => {
      const { getDb } = await import("./db");
      (getDb as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { generateVoicemail } = await import("./outboundCall");
      const result = await generateVoicemail(1, 42);
      expect(result).toBeNull();
    });

    it("should return null and mark status 'failed' when LLM returns empty content", async () => {
      const { invokeLLM } = await import("./_core/llm");
      (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });
      const { generateVoicemail } = await import("./outboundCall");
      const result = await generateVoicemail(1, 42);
      expect(result).toBeNull();
      expect(mockUpdateSet).toHaveBeenCalledWith({ status: "failed" });
    });

    it("should return null and save transcript when TTS fails", async () => {
      const { humeTextToSpeech } = await import("./humeTts");
      (humeTextToSpeech as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("TTS service unavailable")
      );
      const { generateVoicemail } = await import("./outboundCall");
      const result = await generateVoicemail(1, 42);
      expect(result).toBeNull();
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" })
      );
    });
  });

  // ── getUserVoicemails ─────────────────────────────────────────────────────
  describe("getUserVoicemails", () => {
    it("should return an array", async () => {
      const { getUserVoicemails } = await import("./outboundCall");
      const result = await getUserVoicemails(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return empty array when db is unavailable", async () => {
      const { getDb } = await import("./db");
      (getDb as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { getUserVoicemails } = await import("./outboundCall");
      const result = await getUserVoicemails(1);
      expect(result).toEqual([]);
    });
  });

  // ── markCallAnswered ──────────────────────────────────────────────────────
  describe("markCallAnswered", () => {
    it("should not throw", async () => {
      const { markCallAnswered } = await import("./outboundCall");
      await expect(markCallAnswered(42)).resolves.not.toThrow();
    });

    it("should update the voicemail record with wasAnswered=true and status='ready'", async () => {
      const { markCallAnswered } = await import("./outboundCall");
      await markCallAnswered(42);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdateSet).toHaveBeenCalledWith({ wasAnswered: true, status: "ready" });
    });
  });

  // ── markVoicemailListened ─────────────────────────────────────────────────
  describe("markVoicemailListened", () => {
    it("should not throw", async () => {
      const { markVoicemailListened } = await import("./outboundCall");
      await expect(markVoicemailListened(42)).resolves.not.toThrow();
    });

    it("should update the voicemail record with a listenedAt timestamp", async () => {
      const { markVoicemailListened } = await import("./outboundCall");
      await markVoicemailListened(42);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({ listenedAt: expect.any(Date) })
      );
    });
  });
});
