/**
 * Time Capsule Router
 *
 * Handles:
 * - Settings: cadence picker, enable/disable
 * - Letters: list, read, mark as read
 * - Manual generation (for testing/demo)
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  timeCapsuleSettings,
  timeCapsuleLetters,
  psychologicalFingerprints,
} from "../../drizzle/schema";
import {
  getUserLetters,
  markLetterRead,
  generateAndSaveLetter,
} from "../timeCapsule/letterGenerator";
import { TRPCError } from "@trpc/server";

export const timeCapsuleRouter = router({
  /** Get user's time capsule settings */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const settings = await db
      .select()
      .from(timeCapsuleSettings)
      .where(eq(timeCapsuleSettings.userId, ctx.user.id))
      .limit(1);

    if (!settings.length) return null;
    return settings[0];
  }),

  /** Update or create time capsule settings */
  updateSettings: protectedProcedure
    .input(
      z.object({
        cadenceDays: z.enum(["30", "90", "365"]).transform(Number),
        isEnabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await db
        .select()
        .from(timeCapsuleSettings)
        .where(eq(timeCapsuleSettings.userId, ctx.user.id))
        .limit(1);

      const nextDeliveryAt = input.isEnabled
        ? new Date(Date.now() + input.cadenceDays * 24 * 60 * 60 * 1000)
        : null;

      if (existing.length) {
        await db
          .update(timeCapsuleSettings)
          .set({
            cadenceDays: input.cadenceDays,
            isEnabled: input.isEnabled,
            nextDeliveryAt,
          })
          .where(eq(timeCapsuleSettings.userId, ctx.user.id));
      } else {
        await db.insert(timeCapsuleSettings).values({
          userId: ctx.user.id,
          cadenceDays: input.cadenceDays,
          isEnabled: input.isEnabled,
          nextDeliveryAt,
        });
      }

      return { success: true, nextDeliveryAt };
    }),

  /** Get all letters for the user */
  getLetters: protectedProcedure.query(async ({ ctx }) => {
    return getUserLetters(ctx.user.id);
  }),

  /** Get a single letter by ID */
  getLetter: protectedProcedure
    .input(z.object({ letterId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const letters = await db
        .select()
        .from(timeCapsuleLetters)
        .where(
          and(
            eq(timeCapsuleLetters.id, input.letterId),
            eq(timeCapsuleLetters.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!letters.length)
        throw new TRPCError({ code: "NOT_FOUND", message: "Letter not found" });

      // Mark as read on first view
      const letter = letters[0];
      if (letter.status === "delivered") {
        await markLetterRead(letter.id);
      }

      return { ...letter, status: "read" as const };
    }),

  /** Get count of unread/delivered letters */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;

    const letters = await db
      .select()
      .from(timeCapsuleLetters)
      .where(
        and(
          eq(timeCapsuleLetters.userId, ctx.user.id),
          eq(timeCapsuleLetters.status, "delivered")
        )
      );
    return letters.length;
  }),

  /** Get fingerprint count (how many have been collected) */
  getFingerprintCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;

    const fps = await db
      .select()
      .from(psychologicalFingerprints)
      .where(eq(psychologicalFingerprints.userId, ctx.user.id));
    return fps.length;
  }),

  /** Manually trigger letter generation (for demo/testing or user-initiated) */
  generateNow: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    // Check if user has enough fingerprints
    const fps = await db
      .select()
      .from(psychologicalFingerprints)
      .where(eq(psychologicalFingerprints.userId, ctx.user.id))
      .orderBy(desc(psychologicalFingerprints.extractedAt));

    if (fps.length < 3) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Not enough sessions yet. Keep reflecting — your first letter will arrive once you've had at least 3 meaningful sessions.",
      });
    }

    // Use the earliest and latest fingerprint dates as the period
    const periodStart = fps[fps.length - 1].extractedAt;
    const periodEnd = fps[0].extractedAt;

    const letter = await generateAndSaveLetter(ctx.user.id, periodStart, periodEnd);
    if (!letter) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Letter generation failed. Please try again later.",
      });
    }

    return { success: true, letterId: undefined as number | undefined };
  }),
});
