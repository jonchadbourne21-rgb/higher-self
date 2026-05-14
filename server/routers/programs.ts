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
} from "../db/programs";
import { invokeLLM } from "../_core/llm";

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
        // Re-activate if paused
        if (existing.status === "paused") {
          await updateEnrollmentProgress(ctx.user.id, input.programId, { status: "in_progress" });
        }
        return { success: true, alreadyEnrolled: true };
      }
      await enrollUserInProgram(ctx.user.id, input.programId);
      return { success: true, alreadyEnrolled: false };
    }),

  /** Get the user's current lesson for a program */
  getCurrentLesson: protectedProcedure
    .input(z.object({ programId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const enrollment = await getUserEnrollment(ctx.user.id, input.programId);
      if (!enrollment) return null;
      const currentDay = enrollment.currentDay ?? 1;
      const lesson = await getLessonByDay(input.programId, currentDay);
      if (!lesson) return null;
      const response = await getLessonResponse(ctx.user.id, input.programId, currentDay);
      return {
        lesson,
        enrollment,
        response: response ?? null,
        isCompleted: !!response,
      };
    }),

  /** Submit a lesson reflection and get AI feedback */
  submitLessonResponse: protectedProcedure
    .input(
      z.object({
        programId: z.number().int().positive(),
        lessonId: z.number().int().positive(),
        day: z.number().int().min(1).max(30),
        reflection: z.string().min(20, "Please write at least 20 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const enrollment = await getUserEnrollment(ctx.user.id, input.programId);
      if (!enrollment) throw new TRPCError({ code: "FORBIDDEN", message: "You are not enrolled in this program" });

      // Check if already submitted
      const existing = await getLessonResponse(ctx.user.id, input.programId, input.day);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "You have already submitted this lesson" });

      const lesson = await getLessonByDay(input.programId, input.day);
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });

      // Generate AI feedback
      let aiFeedback = "";
      try {
        const res = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a deeply empathetic growth coach facilitating the "${lesson.title}" lesson. ${lesson.guidanceTemplate ?? ""}
Your role: reflect back what the person shared, name what you notice with warmth, and ask one powerful follow-up question that deepens their insight. Keep it to 3-5 sentences. Never give advice unless asked. Never minimize their experience.`,
            },
            {
              role: "user",
              content: `Lesson: ${lesson.title}\n\nMy reflection:\n${input.reflection}`,
            },
          ],
        });
        aiFeedback = (res.choices[0]?.message?.content as string) ?? "";
      } catch {
        aiFeedback = "Thank you for sharing that. Take a moment to sit with what you've written — there's wisdom in it.";
      }

      await saveLessonResponse({
        userId: ctx.user.id,
        programId: input.programId,
        lessonId: input.lessonId,
        day: input.day,
        userReflection: input.reflection,
        aiFeedback,
      });

      // Advance to next day
      const program = await getProgramById(input.programId);
      const nextDay = input.day + 1;
      const isLastDay = program ? nextDay > program.durationDays : false;

      await updateEnrollmentProgress(ctx.user.id, input.programId, {
        status: isLastDay ? "completed" : "in_progress",
        currentDay: isLastDay ? input.day : nextDay,
        startedAt: enrollment.startedAt ?? new Date(),
        ...(isLastDay ? { completedAt: new Date() } : {}),
      });

      return { success: true, aiFeedback, isCompleted: isLastDay, nextDay: isLastDay ? null : nextDay };
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

  /** Get all enrollments for the current user */
  myEnrollments: protectedProcedure.query(async ({ ctx }) => {
    const enrollments = await getUserEnrollments(ctx.user.id);
    const enriched = await Promise.all(
      enrollments.map(async (e) => {
        const program = await getProgramById(e.programId);
        return { ...e, program: program ?? null };
      })
    );
    return enriched;
  }),
});
