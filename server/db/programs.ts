import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  growthPrograms,
  programLessons,
  userLessonResponses,
  userProgramEnrollments,
} from "../../drizzle/schema";

// ─── Programs ────────────────────────────────────────────────────────────────

export async function listActivePrograms() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(growthPrograms)
    .where(eq(growthPrograms.status, "active"))
    .orderBy(growthPrograms.id);
}

export async function getProgramBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(growthPrograms)
    .where(eq(growthPrograms.slug, slug))
    .limit(1);
  return rows[0];
}

export async function getProgramById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(growthPrograms)
    .where(eq(growthPrograms.id, id))
    .limit(1);
  return rows[0];
}

// ─── Lessons ─────────────────────────────────────────────────────────────────

export async function getLessonsForProgram(programId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(programLessons)
    .where(eq(programLessons.programId, programId))
    .orderBy(programLessons.order);
}

export async function getLessonByDay(programId: number, day: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(programLessons)
    .where(
      and(eq(programLessons.programId, programId), eq(programLessons.day, day))
    )
    .limit(1);
  return rows[0];
}

// ─── Enrollments ─────────────────────────────────────────────────────────────

export async function getUserEnrollment(userId: number, programId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(userProgramEnrollments)
    .where(
      and(
        eq(userProgramEnrollments.userId, userId),
        eq(userProgramEnrollments.programId, programId)
      )
    )
    .limit(1);
  return rows[0];
}

export async function getUserEnrollments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userProgramEnrollments)
    .where(eq(userProgramEnrollments.userId, userId))
    .orderBy(desc(userProgramEnrollments.enrolledAt));
}

export async function enrollUserInProgram(userId: number, programId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(userProgramEnrollments).values({
    userId,
    programId,
    status: "enrolled",
    currentDay: 1,
  });
}

export async function updateEnrollmentProgress(
  userId: number,
  programId: number,
  updates: {
    status?: "enrolled" | "in_progress" | "completed" | "paused";
    currentDay?: number;
    startedAt?: Date;
    completedAt?: Date;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userProgramEnrollments)
    .set(updates)
    .where(
      and(
        eq(userProgramEnrollments.userId, userId),
        eq(userProgramEnrollments.programId, programId)
      )
    );
}

// ─── Lesson Responses ────────────────────────────────────────────────────────

export async function getLessonResponse(
  userId: number,
  programId: number,
  day: number
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(userLessonResponses)
    .where(
      and(
        eq(userLessonResponses.userId, userId),
        eq(userLessonResponses.programId, programId),
        eq(userLessonResponses.day, day)
      )
    )
    .limit(1);
  return rows[0];
}

export async function getAllLessonResponses(userId: number, programId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userLessonResponses)
    .where(
      and(
        eq(userLessonResponses.userId, userId),
        eq(userLessonResponses.programId, programId)
      )
    )
    .orderBy(userLessonResponses.day);
}

export async function saveLessonResponse(data: {
  userId: number;
  programId: number;
  lessonId: number;
  day: number;
  userReflection: string;
  aiFeedback?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(userLessonResponses).values(data);
}
