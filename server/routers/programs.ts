import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  listActivePrograms,
  getProgramById,
  getLessonsForProgram,
  getLessonByDay,
  getUserEnrollment,
  getUserEnrollments,
  enrollUserInProgram,
  updateEnrollmentProgress,
  getLessonResponse,
  getAllLessonResponses,
  saveLessonResponse,
  computeProgramStreak,
} from "../db/programs";
import { invokeLLM } from "../_core/llm";
import { retrieveMemories, formatMemoriesForPrompt, getPersonalityProfile, formatPersonalityForPrompt } from "../rag/memory";
import { addRewardPoints } from "../db/rewards";
import { createRewardGrant } from "../db/rewardGrants";
import { isProUser } from "../db/subscriptions";
import { FREE_LIMITS } from "../_core/stripe-products";

// ── Time helpers ──────────────────────────────────────────────────────────────

const EST_OFFSET_MS = -5 * 60 * 60 * 1000; // UTC-5 (EST / no DST adjustment needed for lock logic)

/**
 * Convert a UTC Date to the equivalent Eastern Standard Time Date object.
 * We use a fixed UTC-5 offset so the gate is consistent year-round.
 */
function toEST(utcDate: Date): Date {
  return new Date(utcDate.getTime() + EST_OFFSET_MS);
}

/**
 * Return the next 6:00 AM EST timestamp (as UTC ms) after a given UTC date.
 * If it is currently before 6 AM EST today, returns today's 6 AM EST.
 * Otherwise returns tomorrow's 6 AM EST.
 */
function next6amEST(afterUtc: Date): Date {
  const estNow = toEST(afterUtc);

  // Build today's 6 AM EST as a UTC date
  const todayEST = new Date(estNow);
  todayEST.setHours(6, 0, 0, 0);
  // Convert back to UTC
  const today6amUTC = new Date(todayEST.getTime() - EST_OFFSET_MS);

  if (afterUtc < today6amUTC) {
    // We haven't reached 6 AM EST today yet — unlock is today at 6 AM EST
    return today6amUTC;
  }

  // Past 6 AM EST today — unlock is tomorrow at 6 AM EST
  const tomorrowEST = new Date(estNow);
  tomorrowEST.setDate(tomorrowEST.getDate() + 1);
  tomorrowEST.setHours(6, 0, 0, 0);
  return new Date(tomorrowEST.getTime() - EST_OFFSET_MS);
}

/**
 * Returns true if the current time (UTC) is past the unlock time for the next
 * day after a lesson was completed at `completedAt`.
 * Unlock = 6:00 AM EST on the calendar day AFTER the submission day (EST).
 */
function isNextDayUnlocked(completedAt: Date): boolean {
  const now = new Date();
  const unlockAt = next6amEST(completedAt);
  return now >= unlockAt;
}

/**
 * Returns the unlock timestamp (UTC) for the next day after a submission.
 */
function getUnlockAt(completedAt: Date): Date {
  return next6amEST(completedAt);
}

export const programsRouter = router({
  /** List all active programs */
  list: protectedProcedure.query(async () => {
    return listActivePrograms();
  }),

  /** Get a single program with its lessons */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const program = await getProgramById(input.id);
      if (!program) throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      const lessons = await getLessonsForProgram(input.id);
      const enrollment = await getUserEnrollment(ctx.user.id, input.id);
      return { program, lessons, enrollment: enrollment ?? null };
    }),

  /** Enroll the current user in a program */
  enroll: protectedProcedure
    .input(z.object({ programId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const program = await getProgramById(input.programId);
      if (!program) throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      const existing = await getUserEnrollment(ctx.user.id, input.programId);
      if (existing) {
        if (existing.status === "paused") {
          await updateEnrollmentProgress(ctx.user.id, input.programId, { status: "in_progress" });
        }
        return { success: true, alreadyEnrolled: true };
      }

      // Free users can only enroll in 1 program at a time
      const isPro = await isProUser(ctx.user.id);
      if (!isPro) {
        const enrollments = await getUserEnrollments(ctx.user.id);
        const activeEnrollments = enrollments.filter(e => e.status === "in_progress");
        if (activeEnrollments.length >= FREE_LIMITS.MAX_PROGRAM_ENROLLMENTS) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Free users can only enroll in 1 program. Upgrade to Pro for unlimited programs.",
          });
        }
      }

      await enrollUserInProgram(ctx.user.id, input.programId);
      return { success: true, alreadyEnrolled: false };
    }),

  /**
   * Get the user's current lesson for a program.
   * Returns isLocked=true + unlockAt when the next day hasn't opened yet (before 6 AM EST).
   */
  getCurrentLesson: protectedProcedure
    .input(z.object({ programId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const enrollment = await getUserEnrollment(ctx.user.id, input.programId);
      if (!enrollment) return null;

      const currentDay = enrollment.currentDay ?? 1;
      const lesson = await getLessonByDay(input.programId, currentDay);
      if (!lesson) return null;

      // Check if this day's lesson has already been submitted
      const response = await getLessonResponse(ctx.user.id, input.programId, currentDay);

      // ── 6 AM EST gate ─────────────────────────────────────────────────────
      // If there is a completed response for the current day, the NEXT day is
      // locked until 6 AM EST the following calendar day.
      // But the current lesson view should also show the "come back tomorrow" state.
      let isLocked = false;
      let unlockAt: Date | null = null;

      if (response) {
        // This day is done. Check if next day is unlocked yet.
        const unlocked = isNextDayUnlocked(response.completedAt);
        if (!unlocked) {
          // Next day not yet open — current lesson is "done for today" and locked
          isLocked = true;
          unlockAt = getUnlockAt(response.completedAt);
        }
        // If unlocked, the enrollment.currentDay should have already advanced to nextDay
        // (set during submitLessonResponse). If somehow still on this day, it's fine —
        // the user can see their completed response but cannot re-submit.
      }

      // Fetch next day's lesson title for the insight page
      const nextLessonRaw = await getLessonByDay(input.programId, currentDay + 1);

      return {
        lesson,
        enrollment,
        response: response ?? null,
        isCompleted: !!response,
        isVoiceDay: !!lesson.isVoiceDay,
        isLocked,
        unlockAt: unlockAt ? unlockAt.toISOString() : null,
        nextLesson: nextLessonRaw ? { day: nextLessonRaw.day, title: nextLessonRaw.title } : null,
      };
    }),

  /** Complete a voice day — voice session counts as the lesson reflection */
  completeVoiceDay: protectedProcedure
    .input(
      z.object({
        programId: z.number().int().positive(),
        day: z.number().int().min(1).max(90),
        voiceSessionId: z.number().int().positive().optional(),
        summary: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const enrollment = await getUserEnrollment(ctx.user.id, input.programId);
      if (!enrollment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not enrolled in this program" });
      }
      const currentDay = enrollment.currentDay ?? 1;
      if (input.day !== currentDay) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This day is not available." });
      }
      const existing = await getLessonResponse(ctx.user.id, input.programId, input.day);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "You have already completed this day." });
      }
      const lesson = await getLessonByDay(input.programId, input.day);
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
      if (!lesson.isVoiceDay) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This is not a voice day." });
      }
      // Save a response marking the voice session as the reflection
      const voiceReflection = input.summary || "[Completed via voice session with the Mirror]";
      const aiFeedback = "You showed up and spoke your truth aloud today. That takes courage. The Mirror heard you.";
      await saveLessonResponse({
        userId: ctx.user.id,
        programId: input.programId,
        lessonId: lesson.id,
        day: input.day,
        userReflection: voiceReflection,
        aiFeedback,
      });
      // Advance enrollment
      const program = await getProgramById(input.programId);
      const nextDay = input.day + 1;
      const isLastDay = program ? nextDay > program.durationDays : false;
      await updateEnrollmentProgress(ctx.user.id, input.programId, {
        status: isLastDay ? "completed" : "in_progress",
        currentDay: isLastDay ? input.day : nextDay,
        startedAt: enrollment.startedAt ?? new Date(),
        ...(isLastDay ? { completedAt: new Date() } : {}),
      });
      // Streak + rewards (same logic as submitLessonResponse)
      const streak = await computeProgramStreak(ctx.user.id, input.programId);
      let streakMilestone: { days: number; points: number } | null = null;
      if (streak === 7) {
        await addRewardPoints(ctx.user.id, 15, "checkin", `program_streak_7_${input.programId}_${Date.now()}`);
        streakMilestone = { days: 7, points: 15 };
      } else if (streak === 14) {
        await addRewardPoints(ctx.user.id, 25, "checkin", `program_streak_14_${input.programId}_${Date.now()}`);
        streakMilestone = { days: 14, points: 25 };
      }
      let completionReward: { points: number; grantActivated: boolean } | null = null;
      if (isLastDay) {
        const rewardPoints = (program?.durationDays ?? 21) <= 21 ? 25 : (program?.durationDays ?? 21) <= 35 ? 50 : 75;
        await addRewardPoints(ctx.user.id, rewardPoints, "checkin", `program_completion_${input.programId}_${Date.now()}`);
        const grant = await createRewardGrant(ctx.user.id, "month_pro", "spin");
        completionReward = { points: rewardPoints, grantActivated: grant.activated };
      }
      let nextLesson: { day: number; title: string } | null = null;
      if (!isLastDay) {
        const nl = await getLessonByDay(input.programId, nextDay);
        if (nl) nextLesson = { day: nl.day, title: nl.title };
      }
      const submittedAt = new Date();
      const unlockAt = isLastDay ? null : getUnlockAt(submittedAt);
      return {
        success: true,
        aiFeedback,
        isCompleted: isLastDay,
        nextDay: isLastDay ? null : nextDay,
        nextLesson,
        completionReward,
        streakMilestone,
        streak,
        unlockAt: unlockAt ? unlockAt.toISOString() : null,
      };
    }),

  /** Submit a lesson reflection and get AI feedback */
  submitLessonResponse: protectedProcedure
    .input(
      z.object({
        programId: z.number().int().positive(),
        lessonId: z.number().int().positive(),
        day: z.number().int().min(1).max(90),
        reflection: z.string().min(20, "Please write at least 20 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const enrollment = await getUserEnrollment(ctx.user.id, input.programId);
      if (!enrollment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not enrolled in this program" });
      }

      const currentDay = enrollment.currentDay ?? 1;

      // ── Day gate: only the current day is submittable ─────────────────────
      if (input.day > currentDay) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This day is not yet unlocked. Complete the previous day first.",
        });
      }
      if (input.day < currentDay) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You have already completed this day.",
        });
      }

      // ── Duplicate guard: check if already submitted ───────────────────────
      const existing = await getLessonResponse(ctx.user.id, input.programId, input.day);
      if (existing) {
        // Check if the 6 AM EST gate has passed — if not, block re-submission
        const unlocked = isNextDayUnlocked(existing.completedAt);
        const unlockAt = getUnlockAt(existing.completedAt);
        const unlockStr = unlockAt.toLocaleString("en-US", {
          timeZone: "America/New_York",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        if (!unlocked) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `You've already completed today's lesson. Day ${input.day + 1} unlocks at ${unlockStr} Eastern.`,
          });
        }
        // If somehow unlocked but same day entry exists, still block (shouldn't happen in normal flow)
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already submitted this lesson.",
        });
      }

      const lesson = await getLessonByDay(input.programId, input.day);
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });

      // Generate AI feedback with RAG context
      let aiFeedback = "";
      try {
        // Retrieve relevant memories to personalize feedback
        let ragContext = "";
        try {
          const [memories, personality] = await Promise.all([
            retrieveMemories({ userId: ctx.user.id, query: `${lesson.title} ${input.reflection}`, topK: 3, sourceTypes: ["journal", "checkin", "voice", "program_response"] }),
            getPersonalityProfile(ctx.user.id),
          ]);
          ragContext = formatMemoriesForPrompt(memories) + formatPersonalityForPrompt(personality);
        } catch (e) {
          console.error("[Programs] RAG context retrieval failed, continuing without:", e);
        }
        const res = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are the user's Higher Self — the most self-actualized version of them — guiding them through the "${lesson.title}" lesson. ${lesson.guidanceTemplate ?? ""}
Speak from within, as them. Reflect back what they shared, name what you notice with grounded honesty, and ask one powerful question that only their Higher Self would know to ask. Keep it to 3-5 sentences. Use "I" and "we." No sugarcoating. No minimizing.${ragContext ? `\n\nContext from their journey so far:\n${ragContext}` : ""}`,
            },
            {
              role: "user",
              content: `Lesson: ${lesson.title}\n\nMy reflection:\n${input.reflection}`,
            },
          ],
        });
        aiFeedback = (res.choices[0]?.message?.content as string) ?? "";
      } catch {
        aiFeedback =
          "Thank you for sharing that. Take a moment to sit with what you've written — there's wisdom in it.";
      }

      await saveLessonResponse({
        userId: ctx.user.id,
        programId: input.programId,
        lessonId: input.lessonId,
        day: input.day,
        userReflection: input.reflection,
        aiFeedback,
      });

      // Advance enrollment to next day
      const program = await getProgramById(input.programId);
      const nextDay = input.day + 1;
      const isLastDay = program ? nextDay > program.durationDays : false;

      await updateEnrollmentProgress(ctx.user.id, input.programId, {
        status: isLastDay ? "completed" : "in_progress",
        currentDay: isLastDay ? input.day : nextDay,
        startedAt: enrollment.startedAt ?? new Date(),
        ...(isLastDay ? { completedAt: new Date() } : {}),
      });

      // ── Streak milestone bonuses ──────────────────────────────────────────
      // Compute streak AFTER saving the response (so the new day is counted)
      const streak = await computeProgramStreak(ctx.user.id, input.programId);
      let streakMilestone: { days: number; points: number } | null = null;
      if (streak === 7) {
        await addRewardPoints(
          ctx.user.id,
          15,
          "checkin",
          `program_streak_7_${input.programId}_${Date.now()}`
        );
        streakMilestone = { days: 7, points: 15 };
      } else if (streak === 14) {
        await addRewardPoints(
          ctx.user.id,
          25,
          "checkin",
          `program_streak_14_${input.programId}_${Date.now()}`
        );
        streakMilestone = { days: 14, points: 25 };
      }

      // ── Program completion reward ─────────────────────────────────────────
      let completionReward: { points: number; grantActivated: boolean } | null = null;
      if (isLastDay) {
        // Scale reward by program length: 25 pts for short (<=21), 50 for medium (22-35), 75 for long (36+)
        const rewardPoints = (program?.durationDays ?? 21) <= 21 ? 25 : (program?.durationDays ?? 21) <= 35 ? 50 : 75;
        await addRewardPoints(
          ctx.user.id,
          rewardPoints,
          "checkin",
          `program_completion_${input.programId}_${Date.now()}`
        );
        const grant = await createRewardGrant(ctx.user.id, "month_pro", "spin");
        completionReward = { points: rewardPoints, grantActivated: grant.activated };
      }

      // Fetch next day's lesson preview for the insight page
      let nextLesson: { day: number; title: string } | null = null;
      if (!isLastDay) {
        const nl = await getLessonByDay(input.programId, nextDay);
        if (nl) nextLesson = { day: nl.day, title: nl.title };
      }

      // Compute unlock time for the next day (for display on insight page)
      const submittedAt = new Date();
      const unlockAt = isLastDay ? null : getUnlockAt(submittedAt);

      return {
        success: true,
        aiFeedback,
        isCompleted: isLastDay,
        nextDay: isLastDay ? null : nextDay,
        nextLesson,
        completionReward,
        streakMilestone,
        streak,
        unlockAt: unlockAt ? unlockAt.toISOString() : null,
      };
    }),

  /** Get full progress for a program */
  getProgress: protectedProcedure
    .input(z.object({ programId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const enrollment = await getUserEnrollment(ctx.user.id, input.programId);
      if (!enrollment) return null;
      const program = await getProgramById(input.programId);
      const responses = await getAllLessonResponses(ctx.user.id, input.programId);
      const completedDays = responses.map((r) => r.day);
      const totalDays = program?.durationDays ?? 7;
      return {
        enrollment,
        completedDays,
        totalDays,
        percentComplete: Math.round((completedDays.length / totalDays) * 100),
      };
    }),

  /** Get the reflection journal — all saved daily insights for a program */
  getReflectionJournal: protectedProcedure
    .input(z.object({ programId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const enrollment = await getUserEnrollment(ctx.user.id, input.programId);
      if (!enrollment) return [];
      const responses = await getAllLessonResponses(ctx.user.id, input.programId);
      const lessons = await getLessonsForProgram(input.programId);
      const lessonMap = new Map(lessons.map((l) => [l.day, l]));
      return responses.map((r) => ({
        day: r.day,
        lessonTitle: lessonMap.get(r.day)?.title ?? `Day ${r.day}`,
        userReflection: r.userReflection,
        aiFeedback: r.aiFeedback ?? null,
        completedAt: r.completedAt,
      }));
    }),

  /** Get all enrollments for the current user */
  myEnrollments: protectedProcedure.query(async ({ ctx }) => {
    const enrollments = await getUserEnrollments(ctx.user.id);
    const enriched = await Promise.all(
      enrollments.map(async (e) => {
        const program = await getProgramById(e.programId);
        const streak = await computeProgramStreak(ctx.user.id, e.programId);
        return { ...e, program: program ?? null, streak };
      })
    );
    return enriched;
  }),
});
