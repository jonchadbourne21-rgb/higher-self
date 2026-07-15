/**
 * Echo Router — tRPC procedures for the Echo reveal UI
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getPendingEcho, dismissEcho, reflectOnEcho } from "../echo";
import { getDb } from "../db";
import { echoQueue, journalEntries } from "../../drizzle/schema";
import { eq, and, isNotNull, desc, sql } from "drizzle-orm";

export const echoRouter = router({
  /**
   * Get the next pending Echo for the current user.
   * Called on app open / home screen load.
   * Returns null if no Echo is queued.
   */
  getPending: protectedProcedure.query(async ({ ctx }) => {
    return getPendingEcho(ctx.user.id);
  }),

  /**
   * Get Echo history — past echoes that have been surfaced (shown to user).
   * Ordered newest-first. Includes source entry snippet and reframing line.
   */
  history: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const limit = input?.limit ?? 20;

      const echoes = await db
        .select({
          id: echoQueue.id,
          sourceEntryId: echoQueue.sourceEntryId,
          reframingLine: echoQueue.reframingLine,
          score: echoQueue.score,
          isCompound: echoQueue.isCompound,
          surfacedAt: echoQueue.surfacedAt,
          dismissedAt: echoQueue.dismissedAt,
          reflectedAt: echoQueue.reflectedAt,
          createdAt: echoQueue.createdAt,
          // Join source entry for snippet
          sourceTitle: journalEntries.title,
          sourceContent: journalEntries.content,
          sourceCreatedAt: journalEntries.createdAt,
        })
        .from(echoQueue)
        .innerJoin(journalEntries, eq(echoQueue.sourceEntryId, journalEntries.id))
        .where(
          and(
            eq(echoQueue.userId, ctx.user.id),
            isNotNull(echoQueue.surfacedAt)
          )
        )
        .orderBy(desc(echoQueue.surfacedAt))
        .limit(limit);

      return echoes.map((e) => ({
        id: e.id,
        sourceEntryId: e.sourceEntryId,
        sourceTitle: e.sourceTitle,
        sourceExcerpt: e.sourceContent.length > 120 ? e.sourceContent.slice(0, 120) + "..." : e.sourceContent,
        sourceCreatedAt: e.sourceCreatedAt,
        reframingLine: e.reframingLine,
        isCompound: e.isCompound,
        surfacedAt: e.surfacedAt,
        wasReflected: !!e.reflectedAt,
        wasDismissed: !!e.dismissedAt,
      }));
    }),

  /**
   * Get stats for the Echo page header.
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, reflected: 0, pending: 0 };

    const [result] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        reflected: sql<number>`SUM(CASE WHEN ${echoQueue.reflectedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN ${echoQueue.surfacedAt} IS NULL AND ${echoQueue.dismissedAt} IS NULL THEN 1 ELSE 0 END)`,
      })
      .from(echoQueue)
      .where(eq(echoQueue.userId, ctx.user.id));

    return {
      total: result?.total ?? 0,
      reflected: result?.reflected ?? 0,
      pending: result?.pending ?? 0,
    };
  }),

  /**
   * Dismiss an Echo (user tapped "Not now" or swiped away).
   */
  dismiss: protectedProcedure
    .input(z.object({ echoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await dismissEcho(input.echoId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Mark an Echo as reflected (user tapped "Reflect on this" → navigates to journal).
   */
  reflect: protectedProcedure
    .input(z.object({ echoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await reflectOnEcho(input.echoId, ctx.user.id);
      return { success: true };
    }),
});
