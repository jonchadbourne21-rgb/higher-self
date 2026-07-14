/**
 * Settings Procedures — Vitest Tests
 * ────────────────────────────────────
 * Tests for settings.get and settings.update tRPC procedures.
 * Covers auth guards, default values, validation, and persistence.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock profile data ────────────────────────────────────────────────────────

const MOCK_PROFILE = {
  id: 1,
  userId: 1,
  preferredName: "Jonathan",
  phone: "+1-555-123-4567",
  contactEmail: "jonathan@example.com",
  therapistName: "Dr. Sarah Chen",
  therapistPhone: "+1-555-987-6543",
  therapistEmail: "sarah.chen@therapy.com",
  therapistNotes: "Weekly sessions on Tuesdays",
  avatarEmoji: "🧘",
  coreValues: ["growth", "peace"],
  shortTermGoals: "Meditate daily",
  longTermVision: "Inner peace",
  beliefs: "Everything is connected",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
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

describe("settings.get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default empty values when no profile exists", async () => {
    const { getUserProfile } = await import("./db");
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.settings.get();

    expect(result).toEqual({
      phone: "",
      contactEmail: "",
      therapistName: "",
      therapistPhone: "",
      therapistEmail: "",
      therapistNotes: "",
      preferredName: "",
      avatarEmoji: "🌟",
    });
  });

  it("returns profile data when profile exists", async () => {
    const { getUserProfile } = await import("./db");
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_PROFILE);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.settings.get();

    expect(result).toEqual({
      phone: "+1-555-123-4567",
      contactEmail: "jonathan@example.com",
      therapistName: "Dr. Sarah Chen",
      therapistPhone: "+1-555-987-6543",
      therapistEmail: "sarah.chen@therapy.com",
      therapistNotes: "Weekly sessions on Tuesdays",
      preferredName: "Jonathan",
      avatarEmoji: "🧘",
    });
  });

  it("calls getUserProfile with the current user id", async () => {
    const { getUserProfile } = await import("./db");
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const caller = appRouter.createCaller(createCtx({ id: 42 }));
    await caller.settings.get();

    expect(getUserProfile).toHaveBeenCalledWith(42);
  });

  it("returns default avatarEmoji '🌟' when profile has no emoji set", async () => {
    const { getUserProfile } = await import("./db");
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...MOCK_PROFILE,
      avatarEmoji: null,
    });

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.settings.get();

    expect(result.avatarEmoji).toBe("🌟");
  });

  it("handles partial profile data gracefully", async () => {
    const { getUserProfile } = await import("./db");
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      preferredName: "Jon",
      phone: null,
      contactEmail: null,
      therapistName: null,
      therapistPhone: null,
      therapistEmail: null,
      therapistNotes: null,
      avatarEmoji: null,
    });

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.settings.get();

    expect(result.preferredName).toBe("Jon");
    expect(result.phone).toBe("");
    expect(result.contactEmail).toBe("");
    expect(result.therapistName).toBe("");
    expect(result.avatarEmoji).toBe("🌟");
  });

  it("throws UNAUTHORIZED when called without authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(caller.settings.get()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("settings.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates settings and returns success", async () => {
    const { upsertUserProfile } = await import("./db");
    (upsertUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.settings.update({
      preferredName: "Jonathan",
      phone: "+1-555-000-1234",
    });

    expect(result).toEqual({ success: true });
  });

  it("calls upsertUserProfile with correct userId and input", async () => {
    const { upsertUserProfile } = await import("./db");
    (upsertUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx({ id: 7 }));
    await caller.settings.update({
      therapistName: "Dr. Lee",
      therapistEmail: "lee@therapy.com",
    });

    expect(upsertUserProfile).toHaveBeenCalledWith(7, {
      therapistName: "Dr. Lee",
      therapistEmail: "lee@therapy.com",
    });
  });

  it("accepts an empty update (no fields)", async () => {
    const { upsertUserProfile } = await import("./db");
    (upsertUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.settings.update({});

    expect(result).toEqual({ success: true });
  });

  it("accepts empty string for contactEmail (clears it)", async () => {
    const { upsertUserProfile } = await import("./db");
    (upsertUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.settings.update({ contactEmail: "" });

    expect(result).toEqual({ success: true });
    expect(upsertUserProfile).toHaveBeenCalledWith(1, { contactEmail: "" });
  });

  it("accepts empty string for therapistEmail (clears it)", async () => {
    const { upsertUserProfile } = await import("./db");
    (upsertUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.settings.update({ therapistEmail: "" });

    expect(result).toEqual({ success: true });
    expect(upsertUserProfile).toHaveBeenCalledWith(1, { therapistEmail: "" });
  });

  it("rejects invalid email format for contactEmail", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.settings.update({ contactEmail: "not-an-email" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects invalid email format for therapistEmail", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.settings.update({ therapistEmail: "invalid@" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects phone number longer than 30 characters", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.settings.update({ phone: "1".repeat(31) })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects preferredName longer than 100 characters", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.settings.update({ preferredName: "A".repeat(101) })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects therapistName longer than 200 characters", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.settings.update({ therapistName: "A".repeat(201) })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects avatarEmoji longer than 8 characters", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.settings.update({ avatarEmoji: "A".repeat(9) })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts valid email for contactEmail", async () => {
    const { upsertUserProfile } = await import("./db");
    (upsertUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.settings.update({ contactEmail: "valid@example.com" });

    expect(result).toEqual({ success: true });
  });

  it("accepts all fields at once", async () => {
    const { upsertUserProfile } = await import("./db");
    (upsertUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx({ id: 5 }));
    const input = {
      phone: "+1-555-111-2222",
      contactEmail: "me@example.com",
      therapistName: "Dr. Park",
      therapistPhone: "+1-555-333-4444",
      therapistEmail: "park@clinic.com",
      therapistNotes: "Bi-weekly sessions",
      preferredName: "Jon",
      avatarEmoji: "✨",
    };
    const result = await caller.settings.update(input);

    expect(result).toEqual({ success: true });
    expect(upsertUserProfile).toHaveBeenCalledWith(5, input);
  });

  it("throws UNAUTHORIZED when called without authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(
      caller.settings.update({ preferredName: "Hacker" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
