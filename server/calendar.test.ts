/**
 * Calendar Procedures — Vitest Tests
 * ────────────────────────────────────
 * Tests for calendar.list, calendar.create, calendar.update,
 * calendar.delete, and calendar.upcoming tRPC procedures.
 *
 * These tests mock the database helpers so no real DB is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_EVENTS = [
  {
    id: 1,
    userId: 1,
    title: "Therapy session",
    type: "therapy" as const,
    eventDate: new Date("2026-06-10T14:00:00Z"),
    endDate: null,
    notes: "Weekly check-in with Dr. Smith",
    color: "#8b5cf6",
    isAllDay: false,
    recurrence: "weekly" as const,
    recurrenceEnd: new Date("2026-12-31T23:59:59Z"),
    createdAt: new Date("2026-05-01T10:00:00Z"),
    updatedAt: new Date("2026-05-01T10:00:00Z"),
  },
  {
    id: 2,
    userId: 1,
    title: "Morning meditation",
    type: "habit" as const,
    eventDate: new Date("2026-06-15T06:00:00Z"),
    endDate: null,
    notes: null,
    color: "#10b981",
    isAllDay: false,
    recurrence: "none" as const,
    recurrenceEnd: null,
    createdAt: new Date("2026-05-10T08:00:00Z"),
    updatedAt: new Date("2026-05-10T08:00:00Z"),
  },
  {
    id: 3,
    userId: 1,
    title: "Goal review",
    type: "goal" as const,
    eventDate: new Date("2026-06-20T18:00:00Z"),
    endDate: new Date("2026-06-20T19:00:00Z"),
    notes: "Review monthly goals",
    color: "#f59e0b",
    isAllDay: false,
    recurrence: "monthly" as const,
    recurrenceEnd: null,
    createdAt: new Date("2026-05-15T12:00:00Z"),
    updatedAt: new Date("2026-05-15T12:00:00Z"),
  },
];

const MOCK_UPCOMING = [
  { id: 1, title: "Therapy session", eventDate: new Date("2026-06-10T14:00:00Z"), type: "therapy" },
  { id: 2, title: "Morning meditation", eventDate: new Date("2026-06-15T06:00:00Z"), type: "habit" },
  { id: 3, title: "Goal review", eventDate: new Date("2026-06-20T18:00:00Z"), type: "goal" },
];

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    // Calendar helpers (dynamic imports in procedures)
    getCalendarEvents: vi.fn().mockResolvedValue([]),
    createCalendarEvent: vi.fn().mockResolvedValue(1),
    updateCalendarEvent: vi.fn().mockResolvedValue(undefined),
    deleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
    getUpcomingEvents: vi.fn().mockResolvedValue([]),
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

describe("calendar.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns events for the specified year and month", async () => {
    const { getCalendarEvents } = await import("./db");
    (getCalendarEvents as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_EVENTS);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.list({ year: 2026, month: 6 });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: 1, title: "Therapy session" });
    expect(result[1]).toMatchObject({ id: 2, title: "Morning meditation" });
    expect(result[2]).toMatchObject({ id: 3, title: "Goal review" });
  });

  it("calls getCalendarEvents with the correct userId, year, and month", async () => {
    const { getCalendarEvents } = await import("./db");
    (getCalendarEvents as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const caller = appRouter.createCaller(createCtx({ id: 42 }));
    await caller.calendar.list({ year: 2026, month: 3 });

    expect(getCalendarEvents).toHaveBeenCalledWith(42, 2026, 3);
  });

  it("returns an empty array when no events exist for the month", async () => {
    const { getCalendarEvents } = await import("./db");
    (getCalendarEvents as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.list({ year: 2026, month: 1 });

    expect(result).toEqual([]);
  });

  it("rejects month values below 1", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.calendar.list({ year: 2026, month: 0 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects month values above 12", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.calendar.list({ year: 2026, month: 13 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts month 1 (January)", async () => {
    const { getCalendarEvents } = await import("./db");
    (getCalendarEvents as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.list({ year: 2026, month: 1 });

    expect(result).toEqual([]);
    expect(getCalendarEvents).toHaveBeenCalledWith(1, 2026, 1);
  });

  it("accepts month 12 (December)", async () => {
    const { getCalendarEvents } = await import("./db");
    (getCalendarEvents as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.list({ year: 2026, month: 12 });

    expect(result).toEqual([]);
    expect(getCalendarEvents).toHaveBeenCalledWith(1, 2026, 12);
  });

  it("throws UNAUTHORIZED when called without authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(
      caller.calendar.list({ year: 2026, month: 6 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("calendar.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a basic event and returns success with id", async () => {
    const { createCalendarEvent } = await import("./db");
    (createCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(42);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.create({
      title: "New therapy session",
      type: "therapy",
      eventDate: Date.now(),
    });

    expect(result).toEqual({ success: true, id: 42 });
  });

  it("passes correct data to createCalendarEvent", async () => {
    const { createCalendarEvent } = await import("./db");
    (createCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    const eventDate = new Date("2026-07-01T10:00:00Z").getTime();
    const caller = appRouter.createCaller(createCtx({ id: 5 }));
    await caller.calendar.create({
      title: "Morning run",
      type: "habit",
      eventDate,
      notes: "5K jog",
      color: "#10b981",
      isAllDay: false,
      recurrence: "weekly",
    });

    expect(createCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 5,
        title: "Morning run",
        type: "habit",
        eventDate: new Date(eventDate),
        notes: "5K jog",
        color: "#10b981",
        isAllDay: false,
        recurrence: "weekly",
      })
    );
  });

  it("creates an all-day event", async () => {
    const { createCalendarEvent } = await import("./db");
    (createCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(10);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.create({
      title: "Rest day",
      type: "reminder",
      eventDate: Date.now(),
      isAllDay: true,
    });

    expect(result).toEqual({ success: true, id: 10 });
    expect(createCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({ isAllDay: true })
    );
  });

  it("creates a recurring weekly event with end date", async () => {
    const { createCalendarEvent } = await import("./db");
    (createCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(20);

    const eventDate = new Date("2026-06-01T09:00:00Z").getTime();
    const recurrenceEnd = new Date("2026-12-31T23:59:59Z").getTime();

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.create({
      title: "Weekly review",
      type: "goal",
      eventDate,
      recurrence: "weekly",
      recurrenceEnd,
    });

    expect(result).toEqual({ success: true, id: 20 });
    expect(createCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrence: "weekly",
        recurrenceEnd: new Date(recurrenceEnd),
      })
    );
  });

  it("creates a recurring monthly event", async () => {
    const { createCalendarEvent } = await import("./db");
    (createCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(30);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.create({
      title: "Monthly check-in",
      type: "therapy",
      eventDate: Date.now(),
      recurrence: "monthly",
    });

    expect(result).toEqual({ success: true, id: 30 });
    expect(createCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({ recurrence: "monthly" })
    );
  });

  it("creates an event with end date", async () => {
    const { createCalendarEvent } = await import("./db");
    (createCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(40);

    const eventDate = new Date("2026-07-01T10:00:00Z").getTime();
    const endDate = new Date("2026-07-01T11:00:00Z").getTime();

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.create({
      title: "Coaching call",
      type: "other",
      eventDate,
      endDate,
    });

    expect(result).toEqual({ success: true, id: 40 });
    expect(createCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        endDate: new Date(endDate),
      })
    );
  });

  it("uses default values for optional fields", async () => {
    const { createCalendarEvent } = await import("./db");
    (createCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(50);

    const caller = appRouter.createCaller(createCtx());
    await caller.calendar.create({
      title: "Simple event",
      eventDate: Date.now(),
    });

    expect(createCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "other",
        isAllDay: false,
        recurrence: "none",
        color: "#8b5cf6",
      })
    );
  });

  it("rejects an empty title", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.calendar.create({ title: "", eventDate: Date.now() })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a title longer than 300 characters", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.calendar.create({ title: "A".repeat(301), eventDate: Date.now() })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts a title exactly 300 characters long", async () => {
    const { createCalendarEvent } = await import("./db");
    (createCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(60);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.create({
      title: "A".repeat(300),
      eventDate: Date.now(),
    });

    expect(result).toEqual({ success: true, id: 60 });
  });

  it("accepts all valid event types", async () => {
    const { createCalendarEvent } = await import("./db");
    const validTypes = ["therapy", "goal", "habit", "reminder", "other"] as const;

    for (const type of validTypes) {
      (createCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      const caller = appRouter.createCaller(createCtx());
      const result = await caller.calendar.create({
        title: `${type} event`,
        type,
        eventDate: Date.now(),
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an invalid event type", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.calendar.create({
        title: "Bad type",
        // @ts-expect-error — intentionally passing invalid type
        type: "invalid_type",
        eventDate: Date.now(),
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an invalid recurrence value", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.calendar.create({
        title: "Bad recurrence",
        eventDate: Date.now(),
        // @ts-expect-error — intentionally passing invalid recurrence
        recurrence: "daily",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws UNAUTHORIZED when called without authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(
      caller.calendar.create({ title: "Test", eventDate: Date.now() })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("calendar.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an event and returns success", async () => {
    const { updateCalendarEvent } = await import("./db");
    (updateCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.update({
      id: 1,
      title: "Updated therapy session",
    });

    expect(result).toEqual({ success: true });
  });

  it("passes correct userId and id to updateCalendarEvent", async () => {
    const { updateCalendarEvent } = await import("./db");
    (updateCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx({ id: 7 }));
    await caller.calendar.update({ id: 99, title: "New title" });

    expect(updateCalendarEvent).toHaveBeenCalledWith(
      7,
      99,
      expect.objectContaining({ title: "New title" })
    );
  });

  it("updates event type", async () => {
    const { updateCalendarEvent } = await import("./db");
    (updateCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx());
    await caller.calendar.update({ id: 1, type: "goal" });

    expect(updateCalendarEvent).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ type: "goal" })
    );
  });

  it("updates event date", async () => {
    const { updateCalendarEvent } = await import("./db");
    (updateCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const newDate = new Date("2026-08-01T10:00:00Z").getTime();
    const caller = appRouter.createCaller(createCtx());
    await caller.calendar.update({ id: 1, eventDate: newDate });

    expect(updateCalendarEvent).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ eventDate: new Date(newDate) })
    );
  });

  it("updates notes and color", async () => {
    const { updateCalendarEvent } = await import("./db");
    (updateCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx());
    await caller.calendar.update({
      id: 1,
      notes: "Updated notes",
      color: "#ef4444",
    });

    expect(updateCalendarEvent).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ notes: "Updated notes", color: "#ef4444" })
    );
  });

  it("updates isAllDay flag", async () => {
    const { updateCalendarEvent } = await import("./db");
    (updateCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx());
    await caller.calendar.update({ id: 1, isAllDay: true });

    expect(updateCalendarEvent).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ isAllDay: true })
    );
  });

  it("updates recurrence settings", async () => {
    const { updateCalendarEvent } = await import("./db");
    (updateCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const recurrenceEnd = new Date("2027-01-01T00:00:00Z").getTime();
    const caller = appRouter.createCaller(createCtx());
    await caller.calendar.update({
      id: 1,
      recurrence: "monthly",
      recurrenceEnd,
    });

    expect(updateCalendarEvent).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({
        recurrence: "monthly",
        recurrenceEnd: new Date(recurrenceEnd),
      })
    );
  });

  it("updates multiple fields at once", async () => {
    const { updateCalendarEvent } = await import("./db");
    (updateCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const newDate = new Date("2026-09-15T14:00:00Z").getTime();
    const caller = appRouter.createCaller(createCtx());
    await caller.calendar.update({
      id: 1,
      title: "Renamed event",
      type: "reminder",
      eventDate: newDate,
      notes: "New notes",
      color: "#6366f1",
      isAllDay: true,
      recurrence: "none",
    });

    expect(updateCalendarEvent).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({
        title: "Renamed event",
        type: "reminder",
        eventDate: new Date(newDate),
        notes: "New notes",
        color: "#6366f1",
        isAllDay: true,
        recurrence: "none",
      })
    );
  });

  it("rejects an empty title", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.calendar.update({ id: 1, title: "" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a title longer than 300 characters", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.calendar.update({ id: 1, title: "A".repeat(301) })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an invalid event type", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.calendar.update({
        id: 1,
        // @ts-expect-error — intentionally passing invalid type
        type: "invalid",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws UNAUTHORIZED when called without authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(
      caller.calendar.update({ id: 1, title: "Test" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("calendar.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes an event and returns success", async () => {
    const { deleteCalendarEvent } = await import("./db");
    (deleteCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.delete({ id: 1 });

    expect(result).toEqual({ success: true });
  });

  it("calls deleteCalendarEvent with the correct userId and event id", async () => {
    const { deleteCalendarEvent } = await import("./db");
    (deleteCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createCtx({ id: 5 }));
    await caller.calendar.delete({ id: 99 });

    expect(deleteCalendarEvent).toHaveBeenCalledWith(5, 99);
  });

  it("enforces user ownership — passes userId to DB layer", async () => {
    const { deleteCalendarEvent } = await import("./db");
    (deleteCalendarEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    // User 3 tries to delete event 1
    const caller = appRouter.createCaller(createCtx({ id: 3 }));
    await caller.calendar.delete({ id: 1 });

    // Verify the correct userId (3) was forwarded
    expect(deleteCalendarEvent).toHaveBeenCalledWith(3, 1);
  });

  it("rejects a non-numeric id", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      // @ts-expect-error — intentionally passing wrong type
      caller.calendar.delete({ id: "not-a-number" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws UNAUTHORIZED when called without authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(
      caller.calendar.delete({ id: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("calendar.upcoming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns upcoming events for the authenticated user", async () => {
    const { getUpcomingEvents } = await import("./db");
    (getUpcomingEvents as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_UPCOMING);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.upcoming();

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: 1, title: "Therapy session", type: "therapy" });
    expect(result[1]).toMatchObject({ id: 2, title: "Morning meditation", type: "habit" });
    expect(result[2]).toMatchObject({ id: 3, title: "Goal review", type: "goal" });
  });

  it("calls getUpcomingEvents with the correct userId and limit of 3", async () => {
    const { getUpcomingEvents } = await import("./db");
    (getUpcomingEvents as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const caller = appRouter.createCaller(createCtx({ id: 42 }));
    await caller.calendar.upcoming();

    expect(getUpcomingEvents).toHaveBeenCalledWith(42, 3);
  });

  it("returns an empty array when no upcoming events exist", async () => {
    const { getUpcomingEvents } = await import("./db");
    (getUpcomingEvents as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.upcoming();

    expect(result).toEqual([]);
  });

  it("returns events with expected fields (id, title, eventDate, type)", async () => {
    const { getUpcomingEvents } = await import("./db");
    (getUpcomingEvents as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_UPCOMING);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.calendar.upcoming();

    result.forEach((event) => {
      expect(event).toHaveProperty("id");
      expect(event).toHaveProperty("title");
      expect(event).toHaveProperty("eventDate");
      expect(event).toHaveProperty("type");
    });
  });

  it("throws UNAUTHORIZED when called without authentication", async () => {
    const caller = appRouter.createCaller(createUnauthCtx());
    await expect(caller.calendar.upcoming()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
