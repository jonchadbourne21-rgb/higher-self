/**
 * Echo Router — tRPC procedures for the Echo reveal UI
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getPendingEcho, dismissEcho, reflectOnEcho } from "../echo";

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
