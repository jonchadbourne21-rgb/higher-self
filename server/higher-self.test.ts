import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getUserProfile: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    preferredName: "Alex",
    coreValues: ["Growth", "Authenticity"],
    shortTermGoals: "Be more present",
    longTermVision: "Live with deep peace",
    beliefs: "I am capable of change",
    avatarEmoji: "🌟",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
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
  insertDomainScore: vi.fn().mockResolvedValue(undefined),
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
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "You are on a beautiful journey. Keep going." } }],
  }),
}));

// ─── Context factory ──────────────────────────────────────────────────────────

type AuthUser = NonNullable<TrpcContext["user"]>;

function createCtx(overrides: Partial<AuthUser> = {}): TrpcContext {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
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
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe("auth", () => {
  it("me returns the current user", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user?.id).toBe(1);
    expect(user?.email).toBe("test@example.com");
  });

  it("logout clears the session cookie", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: createCtx().user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

// ─── Profile tests ────────────────────────────────────────────────────────────

describe("profile", () => {
  it("get returns user profile", async () => {
    const caller = appRouter.createCaller(createCtx());
    const profile = await caller.profile.get();
    expect(profile?.preferredName).toBe("Alex");
    expect(profile?.coreValues).toContain("Growth");
  });

  it("save updates profile fields", async () => {
    const { upsertUserProfile } = await import("./db");
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.profile.save({ preferredName: "Jordan" });
    expect(result.success).toBe(true);
    expect(upsertUserProfile).toHaveBeenCalledWith(1, { preferredName: "Jordan" });
  });
});

// ─── Check-in tests ───────────────────────────────────────────────────────────

describe("checkIn", () => {
  it("today returns null when no check-in exists", async () => {
    const caller = appRouter.createCaller(createCtx());
    const today = await caller.checkIn.today();
    expect(today).toBeNull();
  });

  it("submit creates a check-in and returns AI response", async () => {
    const { createCheckIn, getTodayCheckIn } = await import("./db");
    vi.mocked(getTodayCheckIn).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      mood: 7,
      energy: 6,
      stress: 4,
      gratitude: "My health",
      reflection: "Feeling good",
      aiResponse: null,
      completedHabitIds: [],
      createdAt: new Date(),
    });

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.checkIn.submit({
      mood: 7,
      energy: 6,
      stress: 4,
      gratitude: "My health",
      reflection: "Feeling good",
    });

    expect(result.success).toBe(true);
    expect(result.aiResponse).toBe("You are on a beautiful journey. Keep going.");
  });
});

// ─── Habits tests ─────────────────────────────────────────────────────────────

describe("habits", () => {
  it("list returns habits with completion status", async () => {
    const { getUserHabits } = await import("./db");
    vi.mocked(getUserHabits).mockResolvedValueOnce([
      {
        id: 1,
        userId: 1,
        name: "Morning meditation",
        domain: "mindset",
        emoji: "🧘",
        targetFrequency: "daily",
        isActive: true,
        createdAt: new Date(),
      },
    ]);
    const caller = appRouter.createCaller(createCtx());
    const habits = await caller.habits.list();
    expect(habits).toHaveLength(1);
    expect(habits[0]?.name).toBe("Morning meditation");
    expect(habits[0]?.completedToday).toBe(false);
    expect(habits[0]?.streak).toBe(0);
  });

  it("create adds a new habit", async () => {
    const { createHabit } = await import("./db");
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.habits.create({
      name: "Evening walk",
      domain: "health",
      emoji: "🚶",
    });
    expect(result.success).toBe(true);
    expect(createHabit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Evening walk", domain: "health" })
    );
  });

  it("toggle flips habit completion", async () => {
    const { toggleHabitCompletion } = await import("./db");
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.habits.toggle({ habitId: 1 });
    expect(result.completed).toBe(true);
    expect(toggleHabitCompletion).toHaveBeenCalledWith(1, 1);
  });
});

// ─── Journal tests ────────────────────────────────────────────────────────────

describe("journal", () => {
  it("list returns journal entries", async () => {
    const { getJournalEntries } = await import("./db");
    vi.mocked(getJournalEntries).mockResolvedValueOnce([
      {
        id: 1,
        userId: 1,
        title: "A new beginning",
        content: "Today I feel hopeful",
        aiPerspective: "Your hope is a seed of transformation.",
        moodTag: "Hopeful",
        themes: ["hope", "growth"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const caller = appRouter.createCaller(createCtx());
    const entries = await caller.journal.list({ limit: 10 });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.title).toBe("A new beginning");
  });

  it("create saves a journal entry and generates AI perspective", async () => {
    const { createJournalEntry, getJournalEntries } = await import("./db");
    vi.mocked(getJournalEntries).mockResolvedValueOnce([
      {
        id: 2,
        userId: 1,
        title: "Reflection",
        content: "I am learning to be patient",
        aiPerspective: null,
        moodTag: null,
        themes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.journal.create({
      title: "Reflection",
      content: "I am learning to be patient",
    });
    expect(result.success).toBe(true);
    expect(createJournalEntry).toHaveBeenCalled();
  });
});

// ─── Chat tests ───────────────────────────────────────────────────────────────

describe("chat", () => {
  it("history returns messages in chronological order", async () => {
    const { getChatHistory } = await import("./db");
    vi.mocked(getChatHistory).mockResolvedValueOnce([
      { id: 2, userId: 1, role: "assistant", content: "Hello", contextSnapshot: null, createdAt: new Date() },
      { id: 1, userId: 1, role: "user", content: "Hi", contextSnapshot: null, createdAt: new Date() },
    ]);
    const caller = appRouter.createCaller(createCtx());
    const history = await caller.chat.history();
    expect(history).toHaveLength(2);
    // reversed = chronological
    expect(history[0]?.role).toBe("user");
    expect(history[1]?.role).toBe("assistant");
  });

  it("send saves user message and returns AI response", async () => {
    const { saveChatMessage } = await import("./db");
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.chat.send({ message: "What should I focus on today?" });
    expect(result.response).toBe("You are on a beautiful journey. Keep going.");
    expect(saveChatMessage).toHaveBeenCalledTimes(2); // user + assistant
  });
});

// ─── Domains tests ────────────────────────────────────────────────────────────

describe("domains", () => {
  it("scores returns latest domain scores", async () => {
    const { getLatestDomainScores } = await import("./db");
    vi.mocked(getLatestDomainScores).mockResolvedValueOnce([
      { id: 1, userId: 1, domain: "mindset", score: 7.5, notes: null, recordedAt: new Date() },
    ]);
    const caller = appRouter.createCaller(createCtx());
    const scores = await caller.domains.scores();
    expect(scores).toHaveLength(1);
    expect(scores[0]?.score).toBe(7.5);
  });

  it("updateScore inserts a new domain score", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.domains.updateScore({ domain: "health", score: 8 });
    expect(result.success).toBe(true);
  });
});

// ─── Insights tests ───────────────────────────────────────────────────────────

describe("insights", () => {
  it("latest returns null when no insights exist", async () => {
    const caller = appRouter.createCaller(createCtx());
    const insight = await caller.insights.latest();
    expect(insight).toBeNull();
  });

  it("generate creates a new insight with AI data", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              insightText: "You are growing steadily.",
              patterns: ["Consistent morning practice"],
              actionableSteps: ["Meditate for 10 minutes daily"],
              growthScore: 72,
            }),
          },
        },
      ],
    } as any);

    const caller = appRouter.createCaller(createCtx());
    const result = await caller.insights.generate();
    expect(result.insightText).toBe("You are growing steadily.");
    expect(result.growthScore).toBe(72);
    expect(result.actionableSteps).toContain("Meditate for 10 minutes daily");
  });
});

// ─── Timeline tests ───────────────────────────────────────────────────────────

describe("timeline", () => {
  it("milestones returns all milestones", async () => {
    const { getMilestones } = await import("./db");
    vi.mocked(getMilestones).mockResolvedValueOnce([
      {
        id: 1,
        userId: 1,
        title: "First week of meditation",
        description: "Completed 7 days in a row",
        domain: "mindset",
        emoji: "🧘",
        achievedAt: new Date(),
      },
    ]);
    const caller = appRouter.createCaller(createCtx());
    const milestones = await caller.timeline.milestones();
    expect(milestones).toHaveLength(1);
    expect(milestones[0]?.title).toBe("First week of meditation");
  });

  it("addMilestone creates a new milestone", async () => {
    const { createMilestone } = await import("./db");
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.timeline.addMilestone({
      title: "30-day journaling streak",
      domain: "mindset",
      emoji: "📝",
    });
    expect(result.success).toBe(true);
    expect(createMilestone).toHaveBeenCalledWith(
      expect.objectContaining({ title: "30-day journaling streak" })
    );
  });
});
