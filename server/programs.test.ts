/**
 * Tests for the 21-Day Inner Voice Reset program:
 *  1. One-per-day gate: cannot submit the same day twice
 *  2. Day-unlock gate: cannot submit a future day before completing the previous one
 *  3. Past-day gate: cannot re-submit an already-completed day
 *
 * These tests mock the database helpers so no real DB is needed.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// ── Mock all DB helpers used by the programs router ──────────────────────────
vi.mock("./db/programs", () => ({
  getProgramById: vi.fn(),
  getLessonsForProgram: vi.fn(),
  getLessonByDay: vi.fn(),
  getUserEnrollment: vi.fn(),
  getUserEnrollments: vi.fn(),
  enrollUserInProgram: vi.fn(),
  updateEnrollmentProgress: vi.fn(),
  getLessonResponse: vi.fn(),
  getAllLessonResponses: vi.fn(),
  saveLessonResponse: vi.fn(),
  computeProgramStreak: vi.fn().mockResolvedValue(1),
}));

vi.mock("./db/rewards", () => ({
  addRewardPoints: vi.fn(),
}));

vi.mock("./db/rewardGrants", () => ({
  createRewardGrant: vi.fn().mockResolvedValue({ grantId: 1, activated: true, expiresAt: new Date() }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Great reflection!" } }],
  }),
}));

import * as programsDb from "./db/programs";
import { appRouter } from "./routers";

// ── Helpers ───────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createCtx(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function makeEnrollment(currentDay: number, status = "in_progress") {
  return {
    id: 1,
    userId: 1,
    programId: 1,
    status,
    currentDay,
    startedAt: new Date(),
    completedAt: null,
    enrolledAt: new Date(),
  };
}

function makeLesson(day: number) {
  return {
    id: day,
    programId: 1,
    day,
    order: day,
    title: `Day ${day} Lesson`,
    concept: "Test concept",
    exercisePrompt: "Test exercise",
    guidanceTemplate: null,
    journalingPrompt: null,
    mirrorStarter: null,
    microHabit: null,
    createdAt: new Date(),
  };
}

function makeProgram(durationDays = 21) {
  return {
    id: 1,
    slug: "inner-voice-reset",
    name: "21-Day Inner Voice Reset",
    description: "Test program",
    category: "self-awareness",
    durationDays,
    status: "active",
    createdAt: new Date(),
  };
}

const VALID_INPUT = {
  programId: 1,
  lessonId: 1,
  day: 1,
  reflection: "This is my reflection for today, it is long enough to pass validation.",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("programs.submitLessonResponse — one-per-day gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects submission when user tries to submit a future day", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    // User is on Day 1 but tries to submit Day 3
    vi.mocked(programsDb.getUserEnrollment).mockResolvedValue(makeEnrollment(1));
    vi.mocked(programsDb.getLessonResponse).mockResolvedValue(undefined);

    await expect(
      caller.programs.submitLessonResponse({ ...VALID_INPUT, day: 3 })
    ).rejects.toThrow("not yet unlocked");
  });

  it("rejects submission when user tries to re-submit an already-completed day", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    // User is on Day 2 but tries to submit Day 1 again
    vi.mocked(programsDb.getUserEnrollment).mockResolvedValue(makeEnrollment(2));
    vi.mocked(programsDb.getLessonResponse).mockResolvedValue(undefined);

    await expect(
      caller.programs.submitLessonResponse({ ...VALID_INPUT, day: 1 })
    ).rejects.toThrow("already completed this day");
  });

  it("rejects duplicate submission for today's lesson", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const today = new Date();
    vi.mocked(programsDb.getUserEnrollment).mockResolvedValue(makeEnrollment(1));
    // Existing response was submitted today
    vi.mocked(programsDb.getLessonResponse).mockResolvedValue({
      id: 1,
      userId: 1,
      programId: 1,
      lessonId: 1,
      day: 1,
      userReflection: "Already submitted",
      aiFeedback: "Great",
      completedAt: today,
    });

    await expect(
      caller.programs.submitLessonResponse(VALID_INPUT)
    ).rejects.toThrow("already completed today");
  });

  it("allows submission for the current day when not yet submitted", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(programsDb.getUserEnrollment).mockResolvedValue(makeEnrollment(1));
    vi.mocked(programsDb.getLessonResponse).mockResolvedValue(undefined);
    vi.mocked(programsDb.getLessonByDay).mockResolvedValue(makeLesson(1));
    vi.mocked(programsDb.saveLessonResponse).mockResolvedValue(undefined);
    vi.mocked(programsDb.getProgramById).mockResolvedValue(makeProgram(21));
    vi.mocked(programsDb.updateEnrollmentProgress).mockResolvedValue(undefined);

    const result = await caller.programs.submitLessonResponse(VALID_INPUT);
    expect(result.success).toBe(true);
    expect(result.isCompleted).toBe(false);
    expect(result.nextDay).toBe(2);
  });
});

describe("programs.submitLessonResponse — Day 21 completion reward", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awards 25 points and a Pro grant on Day 21 completion", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(programsDb.getUserEnrollment).mockResolvedValue(makeEnrollment(21));
    vi.mocked(programsDb.getLessonResponse).mockResolvedValue(undefined);
    vi.mocked(programsDb.getLessonByDay).mockResolvedValue(makeLesson(21));
    vi.mocked(programsDb.saveLessonResponse).mockResolvedValue(undefined);
    vi.mocked(programsDb.getProgramById).mockResolvedValue(makeProgram(21));
    vi.mocked(programsDb.updateEnrollmentProgress).mockResolvedValue(undefined);

    const { addRewardPoints } = await import("./db/rewards");
    const { createRewardGrant } = await import("./db/rewardGrants");

    const result = await caller.programs.submitLessonResponse({
      ...VALID_INPUT,
      day: 21,
      lessonId: 21,
    });

    expect(result.isCompleted).toBe(true);
    expect(result.nextDay).toBeNull();
    expect(result.completionReward).not.toBeNull();
    expect(result.completionReward?.points).toBe(25);
    expect(vi.mocked(addRewardPoints)).toHaveBeenCalledWith(
      1,
      25,
      "checkin",
      expect.stringContaining("program_completion_1_")
    );
    expect(vi.mocked(createRewardGrant)).toHaveBeenCalledWith(1, "month_pro", "spin");
  });

  it("awards scaled completion reward for short programs (<=21 days)", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(programsDb.getUserEnrollment).mockResolvedValue(makeEnrollment(7));
    vi.mocked(programsDb.getLessonResponse).mockResolvedValue(undefined);
    vi.mocked(programsDb.getLessonByDay).mockResolvedValue(makeLesson(7));
    vi.mocked(programsDb.saveLessonResponse).mockResolvedValue(undefined);
    vi.mocked(programsDb.getProgramById).mockResolvedValue(makeProgram(7)); // 7-day program
    vi.mocked(programsDb.updateEnrollmentProgress).mockResolvedValue(undefined);

    const { addRewardPoints } = await import("./db/rewards");

    const result = await caller.programs.submitLessonResponse({
      ...VALID_INPUT,
      day: 7,
      lessonId: 7,
    });

    expect(result.isCompleted).toBe(true);
    expect(result.completionReward).toEqual({ points: 25, grantActivated: true });
    expect(vi.mocked(addRewardPoints)).toHaveBeenCalledWith(
      1, 25, "checkin", expect.stringContaining("program_completion_1_")
    );
  });
});
