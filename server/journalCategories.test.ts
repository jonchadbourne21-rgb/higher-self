/**
 * Journal Category Procedures — Vitest Tests
 * ─────────────────────────────────────────────
 * Tests for journal.categories.list, journal.categories.create,
 * and journal.categories.delete tRPC procedures.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";

// ── Shared mock data ──────────────────────────────────────────────────────────

const MOCK_CATEGORIES = [
  { id: 1, userId: 1, name: "Gratitude", color: "#8b5cf6", createdAt: new Date() },
  { id: 2, userId: 1, name: "Growth", color: "#10b981", createdAt: new Date() },
  { id: 3, userId: 1, name: "Dreams", color: "#f59e0b", createdAt: new Date() },
];

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    // Journal category helpers (dynamic imports in procedures)
    getJournalCategories: vi.fn().mockResolvedValue([]),
    createJournalCategory: vi.fn().mockResolvedValue(undefined),
    deleteJournalCategory: vi.fn().mockResolvedValue(undefined),
    // Other helpers used by appRouter at module load time
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

// ── Context factory ───────────────────────────────────────────────────────────

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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("journal.categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("returns all categories for the authenticated user", async () => {
      const { getJournalCategories } = await import("./db");
      (getJournalCategories as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_CATEGORIES);

      const caller = appRouter.createCaller(createCtx());
      const result = await caller.journal.categories.list();

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ id: 1, name: "Gratitude", color: "#8b5cf6" });
      expect(result[1]).toMatchObject({ id: 2, name: "Growth", color: "#10b981" });
      expect(result[2]).toMatchObject({ id: 3, name: "Dreams", color: "#f59e0b" });
    });

    it("calls getJournalCategories with the current user id", async () => {
      const { getJournalCategories } = await import("./db");
      (getJournalCategories as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const caller = appRouter.createCaller(createCtx({ id: 42 }));
      await caller.journal.categories.list();

      expect(getJournalCategories).toHaveBeenCalledWith(42);
    });

    it("returns an empty array when the user has no categories", async () => {
      const { getJournalCategories } = await import("./db");
      (getJournalCategories as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const caller = appRouter.createCaller(createCtx());
      const result = await caller.journal.categories.list();

      expect(result).toEqual([]);
    });

    it("throws UNAUTHORIZED when called without authentication", async () => {
      const caller = appRouter.createCaller(createUnauthCtx());
      await expect(caller.journal.categories.list()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("returns categories with all expected fields", async () => {
      const { getJournalCategories } = await import("./db");
      (getJournalCategories as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_CATEGORIES);

      const caller = appRouter.createCaller(createCtx());
      const result = await caller.journal.categories.list();

      result.forEach((cat) => {
        expect(cat).toHaveProperty("id");
        expect(cat).toHaveProperty("name");
        expect(cat).toHaveProperty("color");
        expect(cat).toHaveProperty("userId");
      });
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a category and returns success", async () => {
      const { createJournalCategory } = await import("./db");
      (createJournalCategory as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const caller = appRouter.createCaller(createCtx());
      const result = await caller.journal.categories.create({ name: "Mindfulness", color: "#6366f1" });

      expect(result).toEqual({ success: true });
    });

    it("calls createJournalCategory with correct userId, name, and color", async () => {
      const { createJournalCategory } = await import("./db");
      (createJournalCategory as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const caller = appRouter.createCaller(createCtx({ id: 7 }));
      await caller.journal.categories.create({ name: "Resilience", color: "#ef4444" });

      expect(createJournalCategory).toHaveBeenCalledWith(7, "Resilience", "#ef4444");
    });

    it("uses default color #8b5cf6 when no color is provided", async () => {
      const { createJournalCategory } = await import("./db");
      (createJournalCategory as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const caller = appRouter.createCaller(createCtx());
      await caller.journal.categories.create({ name: "Gratitude" });

      expect(createJournalCategory).toHaveBeenCalledWith(1, "Gratitude", "#8b5cf6");
    });

    it("rejects an empty name", async () => {
      const caller = appRouter.createCaller(createCtx());
      await expect(
        caller.journal.categories.create({ name: "" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("rejects a name longer than 100 characters", async () => {
      const caller = appRouter.createCaller(createCtx());
      await expect(
        caller.journal.categories.create({ name: "A".repeat(101) })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("accepts a name exactly 100 characters long", async () => {
      const { createJournalCategory } = await import("./db");
      (createJournalCategory as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const caller = appRouter.createCaller(createCtx());
      const result = await caller.journal.categories.create({ name: "A".repeat(100) });

      expect(result).toEqual({ success: true });
    });

    it("throws UNAUTHORIZED when called without authentication", async () => {
      const caller = appRouter.createCaller(createUnauthCtx());
      await expect(
        caller.journal.categories.create({ name: "Test" })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes a category and returns success", async () => {
      const { deleteJournalCategory } = await import("./db");
      (deleteJournalCategory as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const caller = appRouter.createCaller(createCtx());
      const result = await caller.journal.categories.delete({ id: 1 });

      expect(result).toEqual({ success: true });
    });

    it("calls deleteJournalCategory with the category id and current user id", async () => {
      const { deleteJournalCategory } = await import("./db");
      (deleteJournalCategory as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const caller = appRouter.createCaller(createCtx({ id: 5 }));
      await caller.journal.categories.delete({ id: 99 });

      expect(deleteJournalCategory).toHaveBeenCalledWith(99, 5);
    });

    it("rejects a non-numeric id", async () => {
      const caller = appRouter.createCaller(createCtx());
      await expect(
        // @ts-expect-error — intentionally passing wrong type
        caller.journal.categories.delete({ id: "not-a-number" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("throws UNAUTHORIZED when called without authentication", async () => {
      const caller = appRouter.createCaller(createUnauthCtx());
      await expect(
        caller.journal.categories.delete({ id: 1 })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("passes user ownership guard — only deletes own categories", async () => {
      const { deleteJournalCategory } = await import("./db");
      (deleteJournalCategory as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // User 3 tries to delete category 1 (which belongs to user 1 in the DB)
      // The procedure passes userId to deleteJournalCategory which enforces ownership in SQL
      const caller = appRouter.createCaller(createCtx({ id: 3 }));
      await caller.journal.categories.delete({ id: 1 });

      // Verify the correct userId (3) was forwarded so the DB layer can enforce ownership
      expect(deleteJournalCategory).toHaveBeenCalledWith(1, 3);
    });
  });

  // ── suggestTitle ─────────────────────────────────────────────────────────────

  describe("suggestTitle", () => {
    it("returns 3 title suggestions from the LLM", async () => {
      const { invokeLLM } = await import("./_core/llm");
      (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ titles: ["Chasing the Light Within", "The Exhaustion I Won't Name", "Learning to Speak Kindly to Myself"] }) } }],
      });

      const caller = appRouter.createCaller(createCtx());
      const result = await caller.journal.suggestTitle({
        content: "Today I realized that the way I talk to myself matters more than I thought. I've been so hard on myself lately and it's been draining my energy.",
      });

      // Should return all 3 titles
      expect(result.titles).toHaveLength(3);
      expect(result.titles[0]).toBe("Chasing the Light Within");
      expect(result.titles[1]).toBe("The Exhaustion I Won't Name");
      expect(result.titles[2]).toBe("Learning to Speak Kindly to Myself");
      // title field should be the first title for backward compatibility
      expect(result.title).toBe("Chasing the Light Within");
    });

    it("falls back gracefully when LLM returns a plain string instead of JSON", async () => {
      const { invokeLLM } = await import("./_core/llm");
      (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValue({
        choices: [{ message: { content: "The Weight of Unspoken Words" } }],
      });

      const caller = appRouter.createCaller(createCtx());
      const result = await caller.journal.suggestTitle({
        content: "I keep holding back what I really want to say to the people I love, and it's starting to feel like a wall between us.",
      });

      // Fallback: single title returned in both fields
      expect(result.titles).toHaveLength(1);
      expect(result.title).toBe("The Weight of Unspoken Words");
    });

    it("rejects content shorter than 30 characters", async () => {
      const caller = appRouter.createCaller(createCtx());
      await expect(
        caller.journal.suggestTitle({ content: "Too short" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("accepts content exactly 30 characters long", async () => {
      const { invokeLLM } = await import("./_core/llm");
      (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ titles: ["A Quiet Moment of Clarity", "Still Waters Run Deep", "The Space Between Breaths"] }) } }],
      });

      const caller = appRouter.createCaller(createCtx());
      const result = await caller.journal.suggestTitle({
        content: "A".repeat(30),
      });

      expect(result).toHaveProperty("title");
      expect(typeof result.title).toBe("string");
      expect(result.titles.length).toBeGreaterThan(0);
    });

    it("throws UNAUTHORIZED when called without authentication", async () => {
      const caller = appRouter.createCaller(createUnauthCtx());
      await expect(
        caller.journal.suggestTitle({ content: "A".repeat(30) })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("returns non-empty title strings for all suggestions", async () => {
      const { invokeLLM } = await import("./_core/llm");
      (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ titles: ["Becoming Who I Always Was", "The Version I Keep Hiding", "Walking Toward My Own Name"] }) } }],
      });

      const caller = appRouter.createCaller(createCtx());
      const result = await caller.journal.suggestTitle({
        content: "I spent the morning writing about who I used to be and who I want to become.",
      });

      expect(result.title.length).toBeGreaterThan(0);
      result.titles.forEach((t) => expect(t.length).toBeGreaterThan(0));
    });
  });
});
