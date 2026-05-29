/**
 * Voice Procedures — Vitest Tests
 * ────────────────────────────────
 * Tests for voice.mintToken, voice.createSession, voice.saveMessage,
 * voice.endSession, voice.getSessions, voice.getSessionMessages,
 * and voice.saveToJournal tRPC procedures.
 *
 * All database interactions are mocked so no real DB is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SESSION = {
  id: 1,
  userId: 1,
  sessionUuid: "550e8400-e29b-41d4-a716-446655440000",
  startedAt: new Date("2026-05-28T10:00:00Z"),
  endedAt: null,
};

const MOCK_MESSAGES = [
  {
    id: 1,
    sessionId: 1,
    role: "user" as const,
    transcript: "I've been feeling anxious about my presentation tomorrow.",
    emotion1Name: "anxiety",
    emotion1Score: 0.85,
    emotion2Name: "fear",
    emotion2Score: 0.65,
    emotion3Name: "determination",
    emotion3Score: 0.45,
    createdAt: new Date("2026-05-28T10:00:05Z"),
  },
  {
    id: 2,
    sessionId: 1,
    role: "assistant" as const,
    transcript: "I hear that you're feeling anxious. Let's explore what specifically is causing that anxiety.",
    emotion1Name: null,
    emotion1Score: null,
    emotion2Name: null,
    emotion2Score: null,
    emotion3Name: null,
    emotion3Score: null,
    createdAt: new Date("2026-05-28T10:00:10Z"),
  },
  {
    id: 3,
    sessionId: 1,
    role: "user" as const,
    transcript: "I think it's the fear of being judged by my colleagues.",
    emotion1Name: "fear",
    emotion1Score: 0.75,
    emotion2Name: "vulnerability",
    emotion2Score: 0.60,
    emotion3Name: null,
    emotion3Score: null,
    createdAt: new Date("2026-05-28T10:00:20Z"),
  },
];

// ── DB chain mocks ───────────────────────────────────────────────────────────
// These are declared with let so they can be assigned after vi.mock hoisting
let mockInsertReturningId: ReturnType<typeof vi.fn>;
let mockInsertValues: ReturnType<typeof vi.fn>;
let mockInsert: ReturnType<typeof vi.fn>;
let mockUpdateWhere: ReturnType<typeof vi.fn>;
let mockUpdateSet: ReturnType<typeof vi.fn>;
let mockUpdate: ReturnType<typeof vi.fn>;
let mockSelectLimit: ReturnType<typeof vi.fn>;
let mockSelectOrderBy: ReturnType<typeof vi.fn>;
let mockSelectWhere: ReturnType<typeof vi.fn>;
let mockSelectFrom: ReturnType<typeof vi.fn>;
let mockSelect: ReturnType<typeof vi.fn>;

function initMocks() {
  mockInsertReturningId = vi.fn();
  mockInsertValues = vi.fn().mockReturnValue({ $returningId: mockInsertReturningId });
  mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
  mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
  mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
  mockSelectLimit = vi.fn().mockResolvedValue([]);
  mockSelectOrderBy = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  mockSelectWhere = vi.fn().mockReturnValue({ orderBy: mockSelectOrderBy, limit: mockSelectLimit });
  mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
  mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });
}

function resetSelectChain() {
  mockSelect.mockReturnValue({ from: mockSelectFrom });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelectWhere.mockReturnValue({ orderBy: mockSelectOrderBy, limit: mockSelectLimit });
  mockSelectOrderBy.mockReturnValue({ limit: mockSelectLimit });
  mockSelectLimit.mockResolvedValue([]);
  mockInsert.mockReturnValue({ values: mockInsertValues });
  mockInsertValues.mockReturnValue({ $returningId: mockInsertReturningId });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
}

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: vi.fn().mockImplementation(async () => ({
      insert: (...args: unknown[]) => mockInsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      select: (...args: unknown[]) => mockSelect(...args),
    })),
    // All other helpers needed by appRouter
    getUserProfile: vi.fn().mockResolvedValue(null),
    upsertUserProfile: vi.fn().mockResolvedValue(undefined),
    markOnboardingComplete: vi.fn().mockResolvedValue(undefined),
    getTodayCheckIn: vi.fn().mockResolvedValue(null),
    getRecentCheckIns: vi.fn().mockResolvedValue([]),
    createCheckIn: vi.fn().mockResolvedValue(undefined),
    updateCheckInAiResponse: vi.fn().mockResolvedValue(undefined),
    getUserHabits: vi.fn().mockResolvedValue([]),
    getTodayCompletions: vi.fn().mockResolvedValue([]),
    getHabitStreaks: vi.fn().mockResolvedValue({}),
    createHabit: vi.fn().mockResolvedValue(undefined),
    toggleHabitCompletion: vi.fn().mockResolvedValue(true),
    deleteHabit: vi.fn().mockResolvedValue(undefined),
    getLatestDomainScores: vi.fn().mockResolvedValue([]),
    getDomainScoreHistory: vi.fn().mockResolvedValue([]),
    getJournalEntries: vi.fn().mockResolvedValue([]),
    getJournalEntry: vi.fn().mockResolvedValue(null),
    createJournalEntry: vi.fn().mockResolvedValue(undefined),
    updateJournalEntryAi: vi.fn().mockResolvedValue(undefined),
    getJournalCategories: vi.fn().mockResolvedValue([]),
    createJournalCategory: vi.fn().mockResolvedValue(undefined),
    deleteJournalCategory: vi.fn().mockResolvedValue(undefined),
    getChatHistory: vi.fn().mockResolvedValue([]),
    saveChatMessage: vi.fn().mockResolvedValue(undefined),
    getLatestInsight: vi.fn().mockResolvedValue(null),
    getAllInsights: vi.fn().mockResolvedValue([]),
    saveWeeklyInsight: vi.fn().mockResolvedValue(undefined),
    getMilestones: vi.fn().mockResolvedValue([]),
    createMilestone: vi.fn().mockResolvedValue(undefined),
    getMoodTrend: vi.fn().mockResolvedValue([]),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(undefined),
    getCurrentSessionId: vi.fn().mockResolvedValue(null),
    getChatSessions: vi.fn().mockResolvedValue([]),
    getChatSessionTitles: vi.fn().mockResolvedValue([]),
    updateSessionTitle: vi.fn().mockResolvedValue(undefined),
    getSessionMessagesForTitle: vi.fn().mockResolvedValue([]),
    sessionHasTitle: vi.fn().mockResolvedValue(false),
    getLatestWeeklyReflection: vi.fn().mockResolvedValue(null),
    getWeekStart: vi.fn().mockReturnValue(new Date()),
    getNotificationPreferences: vi.fn().mockResolvedValue(null),
    upsertNotificationPreferences: vi.fn().mockResolvedValue(undefined),
    upsertPushSubscription: vi.fn().mockResolvedValue(undefined),
    deactivatePushSubscription: vi.fn().mockResolvedValue(undefined),
    getActivePushSubscription: vi.fn().mockResolvedValue(null),
    getCurrentStreak: vi.fn().mockResolvedValue(0),
    getHabitStreak: vi.fn().mockResolvedValue(0),
    saveInsight: vi.fn().mockResolvedValue(undefined),
    listInsights: vi.fn().mockResolvedValue([]),
    deleteInsight: vi.fn().mockResolvedValue(undefined),
    saveSeedIntent: vi.fn().mockResolvedValue(undefined),
    saveFullOnboarding: vi.fn().mockResolvedValue(undefined),
    getUserMilestones: vi.fn().mockResolvedValue([]),
    getUserMilestonesByLevel: vi.fn().mockResolvedValue([]),
    getUserMilestoneCount: vi.fn().mockResolvedValue(0),
    getLastSessionId: vi.fn().mockResolvedValue(null),
    updateLastSessionId: vi.fn().mockResolvedValue(undefined),
    getCheckInStreak: vi.fn().mockResolvedValue(0),
    getLastStreakSpinDate: vi.fn().mockResolvedValue(null),
    setLastStreakSpinDate: vi.fn().mockResolvedValue(undefined),
    deleteUserAccount: vi.fn().mockResolvedValue(undefined),
    getCalendarEvents: vi.fn().mockResolvedValue([]),
    createCalendarEvent: vi.fn().mockResolvedValue(1),
    updateCalendarEvent: vi.fn().mockResolvedValue(undefined),
    deleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
    getUpcomingEvents: vi.fn().mockResolvedValue([]),
    getWeekMirrorSessions: vi.fn().mockResolvedValue([]),
    getSessionMessageCount: vi.fn().mockResolvedValue(0),
    getWeekJournalEntries: vi.fn().mockResolvedValue([]),
    getWeekHabitCompletions: vi.fn().mockResolvedValue([]),
    getWeekCheckIns: vi.fn().mockResolvedValue([]),
    calculateWeeklyGrowthScore: vi.fn().mockResolvedValue(0),
    saveWeeklyReflection: vi.fn().mockResolvedValue(undefined),
    getWeekSessionsForDigest: vi.fn().mockResolvedValue([]),
    getAllUsers: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("./db/subscriptions", () => ({
  isProUser: vi.fn().mockResolvedValue(true),
  getUserSubscription: vi.fn().mockResolvedValue(null),
  createSubscription: vi.fn().mockResolvedValue(undefined),
  updateSubscriptionStatus: vi.fn().mockResolvedValue(undefined),
  getOrCreateSubscription: vi.fn().mockResolvedValue({ id: 1, tier: "free", stripeCustomerId: null, stripeSubscriptionId: null }),
  upgradeToProTier: vi.fn().mockResolvedValue(undefined),
  downgradeToFreeTier: vi.fn().mockResolvedValue(undefined),
  cancelSubscription: vi.fn().mockResolvedValue(undefined),
  extendProSubscription: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db/usage", () => ({
  hasReachedDailyChatLimit: vi.fn().mockResolvedValue(false),
  incrementChatUsage: vi.fn().mockResolvedValue(undefined),
  hasReachedWeeklyJournalLimit: vi.fn().mockResolvedValue(false),
  incrementJournalUsage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db/rewards", () => ({
  addRewardPoints: vi.fn().mockResolvedValue(undefined),
  recordWheelSpin: vi.fn().mockResolvedValue(undefined),
  getRewardPoints: vi.fn().mockResolvedValue(0),
  getTotalRewardPoints: vi.fn().mockResolvedValue(0),
  getRewardPointsHistory: vi.fn().mockResolvedValue([]),
  getWheelSpinHistory: vi.fn().mockResolvedValue([]),
  getLastWheelSpin: vi.fn().mockResolvedValue(null),
  hasUsedWelcomeSpin: vi.fn().mockResolvedValue(false),
  markWelcomeSpinUsed: vi.fn().mockResolvedValue(undefined),
  redeemPoints: vi.fn().mockResolvedValue({ success: true, remainingPoints: 0 }),
  getStreakRewards: vi.fn().mockResolvedValue([]),
  hasReceivedStreakReward: vi.fn().mockResolvedValue(false),
  getPendingStreakSpins: vi.fn().mockResolvedValue(0),
  spinWheel: vi.fn().mockReturnValue({ prize: "10 points", points: 10, type: "points" }),
  recordStreakReward: vi.fn().mockResolvedValue(undefined),
  getDareStreak: vi.fn().mockResolvedValue(0),
  checkAndAwardDareStreakBonus: vi.fn().mockResolvedValue(false),
}));

vi.mock("./db/rewardGrants", () => ({
  createRewardGrant: vi.fn().mockResolvedValue({ activated: true, expiresAt: null }),
  checkAndProcessExpiredGrants: vi.fn().mockResolvedValue({ isPro: false, activeGrant: null, pendingGrants: [], expiresAt: null }),
  getAllGrants: vi.fn().mockResolvedValue([]),
  getPendingGrantCount: vi.fn().mockResolvedValue(0),
  tryActivateNextGrant: vi.fn().mockResolvedValue(false),
  getPendingGrants: vi.fn().mockResolvedValue([]),
}));

vi.mock("./db/streaks", () => ({
  trackStreak: vi.fn().mockResolvedValue(undefined),
  getStreak: vi.fn().mockResolvedValue(null),
  resetStreak: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db/programs", () => ({
  listActivePrograms: vi.fn().mockResolvedValue([]),
  getProgramById: vi.fn().mockResolvedValue(null),
  getProgramBySlug: vi.fn().mockResolvedValue(null),
  getLessonsForProgram: vi.fn().mockResolvedValue([]),
  getLessonByDay: vi.fn().mockResolvedValue(null),
  getUserEnrollment: vi.fn().mockResolvedValue(null),
  getUserEnrollments: vi.fn().mockResolvedValue([]),
  enrollUserInProgram: vi.fn().mockResolvedValue(undefined),
  updateEnrollmentProgress: vi.fn().mockResolvedValue(undefined),
  getLessonResponse: vi.fn().mockResolvedValue(null),
  getAllLessonResponses: vi.fn().mockResolvedValue([]),
  computeProgramStreak: vi.fn().mockResolvedValue(0),
  saveLessonResponse: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Mocked LLM response" } }],
  }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./pushNotifications", () => ({
  sendPushNotification: vi.fn().mockResolvedValue(true),
  scheduleDailyReminders: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./rag/embeddings", () => ({
  retrieveContextForChat: vi.fn().mockResolvedValue(""),
  upsertJournalEmbedding: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./intentPrompts", () => ({
  buildIntentSpecificPrompt: vi.fn().mockResolvedValue("You are a helpful assistant."),
}));

vi.mock("./_core/safety", () => ({
  detectCrisisKeywords: vi.fn().mockReturnValue(false),
  SAFETY_KILL_SWITCH_RESPONSE: "Safety response",
  logSafetyBreach: vi.fn().mockResolvedValue(undefined),
}));

// ── Context factory ──────────────────────────────────────────────────────────

type AuthUser = NonNullable<TrpcContext["user"]>;

function createCtx(overrides: Partial<AuthUser> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-open-id",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      onboardingCompleted: true,
      ...overrides,
    } as AuthUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

// Initialize mocks before any tests
import { beforeAll } from "vitest";
beforeAll(() => {
  initMocks();
});

describe("voice.mintToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initMocks();
  });

  it("returns apiKey and configId from environment", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.voice.mintToken();

    expect(result).toHaveProperty("apiKey");
    expect(result).toHaveProperty("configId");
    expect(typeof result.apiKey).toBe("string");
    expect(typeof result.configId).toBe("string");
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(caller.voice.mintToken()).rejects.toThrow();
  });
});

describe("voice.createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initMocks();
  });

  it("creates a session and returns the session ID", async () => {
    mockInsertReturningId.mockResolvedValueOnce([{ id: 42 }]);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.voice.createSession();

    expect(result).toEqual({ sessionId: 42 });
    expect(mockInsert).toHaveBeenCalled();
  });

  it("passes the correct userId when creating a session", async () => {
    mockInsertReturningId.mockResolvedValueOnce([{ id: 1 }]);

    const caller = appRouter.createCaller(createCtx({ id: 99 }));
    await caller.voice.createSession();

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 99 })
    );
  });

  it("includes a sessionUuid in the insert", async () => {
    mockInsertReturningId.mockResolvedValueOnce([{ id: 1 }]);

    const caller = appRouter.createCaller(createCtx());
    await caller.voice.createSession();

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionUuid: expect.any(String),
      })
    );
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(caller.voice.createSession()).rejects.toThrow();
  });
});

describe("voice.saveMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initMocks();
  });

  it("saves a user message with emotions", async () => {
    // Mock session ownership check
    mockSelectLimit.mockResolvedValueOnce([MOCK_SESSION]);
    // Mock message insert
    mockInsertValues.mockReturnValueOnce({ $returningId: vi.fn() });

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.voice.saveMessage({
      sessionId: 1,
      role: "user",
      content: "I feel anxious",
      emotions: [
        { name: "anxiety", score: 0.85 },
        { name: "fear", score: 0.65 },
        { name: "determination", score: 0.45 },
      ],
    });

    expect(result).toEqual({ ok: true });
  });

  it("saves an assistant message without emotions", async () => {
    mockSelectLimit.mockResolvedValueOnce([MOCK_SESSION]);
    mockInsertValues.mockReturnValueOnce({ $returningId: vi.fn() });

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.voice.saveMessage({
      sessionId: 1,
      role: "assistant",
      content: "I hear you. Let's explore that feeling.",
    });

    expect(result).toEqual({ ok: true });
  });

  it("throws NOT_FOUND when session doesn't belong to user", async () => {
    mockSelectLimit.mockResolvedValueOnce([]); // No matching session

    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.voice.saveMessage({
        sessionId: 999,
        role: "user",
        content: "test",
      })
    ).rejects.toThrow("Session not found");
  });

  it("validates role is 'user' or 'assistant'", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.voice.saveMessage({
        sessionId: 1,
        role: "invalid" as any,
        content: "test",
      })
    ).rejects.toThrow();
  });

  it("requires sessionId as a number", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.voice.saveMessage({
        sessionId: "abc" as any,
        role: "user",
        content: "test",
      })
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(
      caller.voice.saveMessage({
        sessionId: 1,
        role: "user",
        content: "test",
      })
    ).rejects.toThrow();
  });
});

describe("voice.endSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initMocks();
  });

  it("ends a session and returns ok", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.voice.endSession({ sessionId: 1 });

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("sets endedAt to a Date", async () => {
    const caller = appRouter.createCaller(createCtx());
    await caller.voice.endSession({ sessionId: 1 });

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        endedAt: expect.any(Date),
      })
    );
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(caller.voice.endSession({ sessionId: 1 })).rejects.toThrow();
  });
});

describe("voice.getSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initMocks();
  });

  it("returns sessions for the authenticated user", async () => {
    mockSelectLimit.mockResolvedValueOnce([MOCK_SESSION]);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.voice.getSessions();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 1, userId: 1 });
  });

  it("returns empty array when no sessions exist", async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.voice.getSessions();

    expect(result).toEqual([]);
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(caller.voice.getSessions()).rejects.toThrow();
  });
});

describe("voice.getSessionMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initMocks();
  });

  it("returns messages for a valid session", async () => {
    // First select: session ownership check
    mockSelectLimit.mockResolvedValueOnce([MOCK_SESSION]);
    // Second select: messages query (no .limit, uses .orderBy)
    mockSelectOrderBy.mockResolvedValueOnce(MOCK_MESSAGES);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.voice.getSessionMessages({ sessionId: 1 });

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ role: "user", transcript: expect.any(String) });
    expect(result[1]).toMatchObject({ role: "assistant" });
  });

  it("throws NOT_FOUND when session doesn't belong to user", async () => {
    mockSelectLimit.mockResolvedValueOnce([]); // No matching session

    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.voice.getSessionMessages({ sessionId: 999 })
    ).rejects.toThrow("Session not found");
  });

  it("returns empty array when session has no messages", async () => {
    mockSelectLimit.mockResolvedValueOnce([MOCK_SESSION]);
    mockSelectOrderBy.mockResolvedValueOnce([]);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.voice.getSessionMessages({ sessionId: 1 });

    expect(result).toEqual([]);
  });

  it("returns messages with emotion data", async () => {
    mockSelectLimit.mockResolvedValueOnce([MOCK_SESSION]);
    mockSelectOrderBy.mockResolvedValueOnce([MOCK_MESSAGES[0]]);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.voice.getSessionMessages({ sessionId: 1 });

    expect(result[0].emotion1Name).toBe("anxiety");
    expect(result[0].emotion1Score).toBe(0.85);
    expect(result[0].emotion2Name).toBe("fear");
    expect(result[0].emotion3Name).toBe("determination");
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(
      caller.voice.getSessionMessages({ sessionId: 1 })
    ).rejects.toThrow();
  });
});

describe("voice.saveToJournal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initMocks();
  });

  it("saves a voice session transcript as a journal entry", async () => {
    // Session ownership check
    mockSelectLimit.mockResolvedValueOnce([MOCK_SESSION]);
    // Messages query
    mockSelectOrderBy.mockResolvedValueOnce(MOCK_MESSAGES);

    const { createJournalEntry } = await import("./db");

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.voice.saveToJournal({ sessionId: 1 });

    expect(result).toEqual({ ok: true });
    expect(createJournalEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        title: expect.stringContaining("Voice Mirror"),
        content: expect.stringContaining("Me:"),
        moodTag: "reflective",
      })
    );
  });

  it("formats transcript with Me/Mirror labels", async () => {
    mockSelectLimit.mockResolvedValueOnce([MOCK_SESSION]);
    mockSelectOrderBy.mockResolvedValueOnce(MOCK_MESSAGES);

    const { createJournalEntry } = await import("./db");

    const caller = appRouter.createCaller(createCtx());
    await caller.voice.saveToJournal({ sessionId: 1 });

    const callArgs = (createJournalEntry as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.content).toContain("Me: I've been feeling anxious");
    expect(callArgs.content).toContain("Mirror: I hear that you're feeling anxious");
  });

  it("throws NOT_FOUND when session doesn't belong to user", async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.voice.saveToJournal({ sessionId: 999 })
    ).rejects.toThrow("Session not found");
  });

  it("throws BAD_REQUEST when session has no messages", async () => {
    mockSelectLimit.mockResolvedValueOnce([MOCK_SESSION]);
    mockSelectOrderBy.mockResolvedValueOnce([]);

    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.voice.saveToJournal({ sessionId: 1 })
    ).rejects.toThrow("No messages in session");
  });

  it("includes session date in the journal title", async () => {
    mockSelectLimit.mockResolvedValueOnce([MOCK_SESSION]);
    mockSelectOrderBy.mockResolvedValueOnce(MOCK_MESSAGES);

    const { createJournalEntry } = await import("./db");

    const caller = appRouter.createCaller(createCtx());
    await caller.voice.saveToJournal({ sessionId: 1 });

    const callArgs = (createJournalEntry as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.title).toMatch(/Voice Mirror/);
  });

  it("filters out system messages from transcript", async () => {
    const messagesWithSystem = [
      ...MOCK_MESSAGES,
      {
        id: 4,
        sessionId: 1,
        role: "system" as const,
        transcript: "System initialization message",
        emotion1Name: null,
        emotion1Score: null,
        emotion2Name: null,
        emotion2Score: null,
        emotion3Name: null,
        emotion3Score: null,
        createdAt: new Date("2026-05-28T10:00:00Z"),
      },
    ];

    mockSelectLimit.mockResolvedValueOnce([MOCK_SESSION]);
    mockSelectOrderBy.mockResolvedValueOnce(messagesWithSystem);

    const { createJournalEntry } = await import("./db");

    const caller = appRouter.createCaller(createCtx());
    await caller.voice.saveToJournal({ sessionId: 1 });

    const callArgs = (createJournalEntry as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.content).not.toContain("System initialization message");
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(
      caller.voice.saveToJournal({ sessionId: 1 })
    ).rejects.toThrow();
  });
});
