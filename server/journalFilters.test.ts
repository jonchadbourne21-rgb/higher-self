/**
 * Journal List Filters & Get Procedure — Vitest Tests
 * ────────────────────────────────────────────────────
 * Tests for journal.list filter parameters (search, categoryId, dateFrom, dateTo, moodTag)
 * and journal.get procedure (entry retrieval + NOT_FOUND handling).
 *
 * These tests mock the database helpers so no real DB is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ENTRIES = [
  {
    id: 1,
    userId: 1,
    title: "Morning gratitude",
    content: "I am grateful for the sunrise today",
    aiPerspective: "Your gratitude practice is deepening.",
    moodTag: "Grateful",
    themes: ["gratitude", "presence"],
    categoryId: 10,
    createdAt: new Date("2026-05-01T08:00:00Z"),
    updatedAt: new Date("2026-05-01T08:00:00Z"),
  },
  {
    id: 2,
    userId: 1,
    title: "Evening reflection",
    content: "Today I faced a difficult conversation at work",
    aiPerspective: "Courage shows up in small moments.",
    moodTag: "Anxious",
    themes: ["courage", "growth"],
    categoryId: 20,
    createdAt: new Date("2026-05-10T20:00:00Z"),
    updatedAt: new Date("2026-05-10T20:00:00Z"),
  },
];

const SINGLE_ENTRY = {
  id: 1,
  userId: 1,
  title: "Morning gratitude",
  content: "I am grateful for the sunrise today",
  aiPerspective: "Your gratitude practice is deepening.",
  moodTag: "Grateful",
  themes: ["gratitude", "presence"],
  categoryId: 10,
  createdAt: new Date("2026-05-01T08:00:00Z"),
  updatedAt: new Date("2026-05-01T08:00:00Z"),
};

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getJournalEntries: vi.fn().mockResolvedValue([]),
    getJournalEntry: vi.fn().mockResolvedValue(null),
    createJournalEntry: vi.fn().mockResolvedValue(undefined),
    updateJournalEntryAi: vi.fn().mockResolvedValue(undefined),
    getJournalCategories: vi.fn().mockResolvedValue([]),
    createJournalCategory: vi.fn().mockResolvedValue(undefined),
    deleteJournalCategory: vi.fn().mockResolvedValue(undefined),
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
    getDb: vi.fn().mockResolvedValue(null),
  };
});

vi.mock("./db/subscriptions", () => ({
  isProUser: vi.fn().mockResolvedValue(true),
  getUserSubscription: vi.fn().mockResolvedValue(null),
  createSubscription: vi.fn().mockResolvedValue(undefined),
  updateSubscriptionStatus: vi.fn().mockResolvedValue(undefined),
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
}));

vi.mock("./db/rewardGrants", () => ({
  createRewardGrant: vi.fn().mockResolvedValue({ activated: true, expiresAt: null }),
  checkAndProcessExpiredGrants: vi.fn().mockResolvedValue({ isPro: false, activeGrant: null, pendingGrants: [], expiresAt: null }),
  getAllGrants: vi.fn().mockResolvedValue([]),
  getPendingGrantCount: vi.fn().mockResolvedValue(0),
}));

vi.mock("./db/streaks", () => ({
  trackStreak: vi.fn().mockResolvedValue(undefined),
  getStreak: vi.fn().mockResolvedValue(null),
  resetStreak: vi.fn().mockResolvedValue(undefined),
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
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
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

describe("journal.list — filter parameters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes search filter to getJournalEntries", async () => {
    const { getJournalEntries } = await import("./db");
    (getJournalEntries as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_ENTRIES);

    const caller = appRouter.createCaller(createCtx());
    await caller.journal.list({ limit: 20, search: "gratitude" });

    expect(getJournalEntries).toHaveBeenCalledWith(1, 20, {
      search: "gratitude",
    });
  });

  it("passes categoryId filter to getJournalEntries", async () => {
    const { getJournalEntries } = await import("./db");
    (getJournalEntries as ReturnType<typeof vi.fn>).mockResolvedValue([MOCK_ENTRIES[0]]);

    const caller = appRouter.createCaller(createCtx());
    await caller.journal.list({ limit: 50, categoryId: 10 });

    expect(getJournalEntries).toHaveBeenCalledWith(1, 50, {
      categoryId: 10,
    });
  });

  it("passes null categoryId to getJournalEntries (uncategorized filter)", async () => {
    const { getJournalEntries } = await import("./db");
    (getJournalEntries as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const caller = appRouter.createCaller(createCtx());
    await caller.journal.list({ limit: 50, categoryId: null });

    expect(getJournalEntries).toHaveBeenCalledWith(1, 50, {
      categoryId: null,
    });
  });

  it("passes dateFrom filter to getJournalEntries", async () => {
    const { getJournalEntries } = await import("./db");
    (getJournalEntries as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const dateFrom = new Date("2026-05-01T00:00:00Z");
    const caller = appRouter.createCaller(createCtx());
    await caller.journal.list({ limit: 50, dateFrom });

    expect(getJournalEntries).toHaveBeenCalledWith(1, 50, {
      dateFrom,
    });
  });

  it("passes dateTo filter to getJournalEntries", async () => {
    const { getJournalEntries } = await import("./db");
    (getJournalEntries as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const dateTo = new Date("2026-05-31T23:59:59Z");
    const caller = appRouter.createCaller(createCtx());
    await caller.journal.list({ limit: 50, dateTo });

    expect(getJournalEntries).toHaveBeenCalledWith(1, 50, {
      dateTo,
    });
  });

  it("passes moodTag filter to getJournalEntries", async () => {
    const { getJournalEntries } = await import("./db");
    (getJournalEntries as ReturnType<typeof vi.fn>).mockResolvedValue([MOCK_ENTRIES[0]]);

    const caller = appRouter.createCaller(createCtx());
    await caller.journal.list({ limit: 50, moodTag: "Grateful" });

    expect(getJournalEntries).toHaveBeenCalledWith(1, 50, {
      moodTag: "Grateful",
    });
  });

  it("passes multiple filters simultaneously", async () => {
    const { getJournalEntries } = await import("./db");
    (getJournalEntries as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const dateFrom = new Date("2026-05-01T00:00:00Z");
    const dateTo = new Date("2026-05-31T23:59:59Z");
    const caller = appRouter.createCaller(createCtx());
    await caller.journal.list({
      limit: 10,
      search: "gratitude",
      categoryId: 10,
      dateFrom,
      dateTo,
      moodTag: "Grateful",
    });

    expect(getJournalEntries).toHaveBeenCalledWith(1, 10, {
      search: "gratitude",
      categoryId: 10,
      dateFrom,
      dateTo,
      moodTag: "Grateful",
    });
  });

  it("uses default limit of 50 when not specified", async () => {
    const { getJournalEntries } = await import("./db");
    (getJournalEntries as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const caller = appRouter.createCaller(createCtx());
    await caller.journal.list({});

    expect(getJournalEntries).toHaveBeenCalledWith(1, 50, {});
  });

  it("returns entries matching the filter", async () => {
    const { getJournalEntries } = await import("./db");
    (getJournalEntries as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_ENTRIES);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.journal.list({ limit: 50 });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 1, title: "Morning gratitude" });
    expect(result[1]).toMatchObject({ id: 2, title: "Evening reflection" });
  });

  it("returns empty array when no entries match", async () => {
    const { getJournalEntries } = await import("./db");
    (getJournalEntries as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.journal.list({ limit: 50, search: "nonexistent" });

    expect(result).toEqual([]);
  });

  it("passes the authenticated user id to getJournalEntries", async () => {
    const { getJournalEntries } = await import("./db");
    (getJournalEntries as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const caller = appRouter.createCaller(createCtx({ id: 42 }));
    await caller.journal.list({ limit: 10 });

    expect(getJournalEntries).toHaveBeenCalledWith(42, 10, {});
  });

  it("throws UNAUTHORIZED when called without authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(caller.journal.list({ limit: 10 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("journal.get — entry retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a journal entry by id", async () => {
    const { getJournalEntry } = await import("./db");
    (getJournalEntry as ReturnType<typeof vi.fn>).mockResolvedValue(SINGLE_ENTRY);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.journal.get({ id: 1 });

    expect(result).toMatchObject({
      id: 1,
      title: "Morning gratitude",
      content: "I am grateful for the sunrise today",
    });
  });

  it("calls getJournalEntry with the entry id and user id", async () => {
    const { getJournalEntry } = await import("./db");
    (getJournalEntry as ReturnType<typeof vi.fn>).mockResolvedValue(SINGLE_ENTRY);

    const caller = appRouter.createCaller(createCtx({ id: 7 }));
    await caller.journal.get({ id: 42 });

    expect(getJournalEntry).toHaveBeenCalledWith(42, 7);
  });

  it("throws NOT_FOUND when entry does not exist", async () => {
    const { getJournalEntry } = await import("./db");
    (getJournalEntry as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const caller = appRouter.createCaller(createCtx());
    await expect(caller.journal.get({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND when entry belongs to another user", async () => {
    const { getJournalEntry } = await import("./db");
    // getJournalEntry filters by userId, so it returns null for wrong user
    (getJournalEntry as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const caller = appRouter.createCaller(createCtx({ id: 99 }));
    await expect(caller.journal.get({ id: 1 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns entry with all expected fields", async () => {
    const { getJournalEntry } = await import("./db");
    (getJournalEntry as ReturnType<typeof vi.fn>).mockResolvedValue(SINGLE_ENTRY);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.journal.get({ id: 1 });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("aiPerspective");
    expect(result).toHaveProperty("moodTag");
    expect(result).toHaveProperty("themes");
    expect(result).toHaveProperty("categoryId");
    expect(result).toHaveProperty("createdAt");
  });

  it("throws UNAUTHORIZED when called without authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(caller.journal.get({ id: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
