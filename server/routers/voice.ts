import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { v2vSessions, v2vMessages, voiceUsageMonthly } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { isProVoiceUser } from "../db/subscriptions";
import { FREE_LIMITS } from "../_core/stripe-products";
import { storeMemory } from "../rag/memory";

/** Get current month as YYYY-MM */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Get or create voice usage record for current month */
async function getVoiceUsage(userId: number) {
  const db = await getDb();
  if (!db) return { responseCount: 0 };
  const month = getCurrentMonth();
  const existing = await db
    .select()
    .from(voiceUsageMonthly)
    .where(and(eq(voiceUsageMonthly.userId, userId), eq(voiceUsageMonthly.usageMonth, month)))
    .limit(1);
  if (existing.length) return existing[0];
  // Create new record for this month
  await db.insert(voiceUsageMonthly).values({ userId, usageMonth: month, responseCount: 0 });
  return { responseCount: 0 };
}

/** Increment voice usage for current month */
async function incrementVoiceUsage(userId: number) {
  const db = await getDb();
  if (!db) return;
  const month = getCurrentMonth();
  const existing = await db
    .select()
    .from(voiceUsageMonthly)
    .where(and(eq(voiceUsageMonthly.userId, userId), eq(voiceUsageMonthly.usageMonth, month)))
    .limit(1);
  if (existing.length) {
    await db
      .update(voiceUsageMonthly)
      .set({ responseCount: existing[0].responseCount + 1 })
      .where(eq(voiceUsageMonthly.id, existing[0].id));
  } else {
    await db.insert(voiceUsageMonthly).values({ userId, usageMonth: month, responseCount: 1 });
  }
}

export const voiceRouter = router({
  /** Return Hume API key and config ID for direct WebSocket connection */
  mintToken: protectedProcedure
    .input(z.object({ voice: z.enum(["male", "female"]).optional() }).optional())
    .mutation(async ({ input }) => {
      const apiKey = process.env.HUME_API_KEY;
      const maleConfigId = process.env.HUME_CONFIG_ID || "";
      const femaleConfigId = "b5b9a42c-ef7e-42c6-bd7d-7495a10da489";
      if (!apiKey) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Hume API key not configured" });
      }
      const selectedVoice = input?.voice ?? "male";
      const configId = selectedVoice === "female" ? femaleConfigId : maleConfigId;
      return { apiKey, configId };
    }),

  /** Create a new voice session record */
  createSession: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const [session] = await db
      .insert(v2vSessions)
      .values({ userId: ctx.user.id, sessionUuid: randomUUID() })
      .$returningId();
    return { sessionId: session.id };
  }),

  /** Get voice usage status for the current user */
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const hasProVoice = await isProVoiceUser(ctx.user.id);
    if (hasProVoice) {
      return { used: 0, limit: Infinity, unlimited: true, remaining: Infinity };
    }
    const usage = await getVoiceUsage(ctx.user.id);
    const limit = FREE_LIMITS.VOICE_RESPONSES_PER_MONTH;
    return {
      used: usage.responseCount,
      limit,
      unlimited: false,
      remaining: Math.max(0, limit - usage.responseCount),
    };
  }),

  /** Save a message from a voice session */
  saveMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        emotions: z.array(z.object({ name: z.string(), score: z.number() })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // If this is an assistant response, check voice usage limits
      if (input.role === "assistant") {
        const hasProVoice = await isProVoiceUser(ctx.user.id);
        if (!hasProVoice) {
          const usage = await getVoiceUsage(ctx.user.id);
          if (usage.responseCount >= FREE_LIMITS.VOICE_RESPONSES_PER_MONTH) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Monthly voice limit reached. Upgrade to Pro + Voice Mirror for unlimited voice sessions.",
            });
          }
        }
        // Increment usage counter for assistant responses
        await incrementVoiceUsage(ctx.user.id);
      }

      // Verify session belongs to user
      const sessions = await db
        .select()
        .from(v2vSessions)
        .where(and(eq(v2vSessions.id, input.sessionId), eq(v2vSessions.userId, ctx.user.id)))
        .limit(1);
      if (!sessions.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }
      const e = input.emotions ?? [];
      await db.insert(v2vMessages).values({
        sessionId: input.sessionId,
        role: input.role,
        transcript: input.content,
        emotion1Name: e[0]?.name ?? null,
        emotion1Score: e[0]?.score ?? null,
        emotion2Name: e[1]?.name ?? null,
        emotion2Score: e[1]?.score ?? null,
        emotion3Name: e[2]?.name ?? null,
        emotion3Score: e[2]?.score ?? null,
      });

      // RAG: Embed user voice messages for personality learning (fire-and-forget)
      if (input.role === "user" && input.content.length > 30) {
        const emotionContext = e.length > 0
          ? ` [emotions: ${e.map(em => `${em.name}(${em.score.toFixed(2)})`).join(", ")}]`
          : "";
        storeMemory({
          userId: ctx.user.id,
          sourceType: "voice",
          content: input.content + emotionContext,
          metadata: e.length > 0 ? { topEmotion: e[0].name } : undefined,
        }).catch((err) => console.error("[RAG] Voice embedding failed:", err));
      }

      return { ok: true };
    }),

  /** End a voice session */
  endSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db
        .update(v2vSessions)
        .set({ endedAt: new Date() })
        .where(and(eq(v2vSessions.id, input.sessionId), eq(v2vSessions.userId, ctx.user.id)));

      // TIME CAPSULE: Extract psychological fingerprint from the full voice session
      (async () => {
        try {
          const { extractAndSaveFingerprint } = await import("../timeCapsule/fingerprint");
          const messages = await db
            .select()
            .from(v2vMessages)
            .where(eq(v2vMessages.sessionId, input.sessionId))
            .orderBy(v2vMessages.createdAt);
          const userMsgs = messages
            .filter((m) => m.role === "user" && m.transcript)
            .map((m) => m.transcript!);
          if (userMsgs.length >= 2) {
            await extractAndSaveFingerprint(
              ctx.user.id,
              "voice",
              input.sessionId.toString(),
              userMsgs
            );
          }
        } catch (e) {
          console.error("[TimeCapsule] Voice fingerprint extraction failed:", e);
        }
      })();

      return { ok: true };
    }),

  /** Get recent voice sessions for the user */
  getSessions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const sessions = await db
      .select()
      .from(v2vSessions)
      .where(eq(v2vSessions.userId, ctx.user.id))
      .orderBy(desc(v2vSessions.startedAt))
      .limit(20);
    return sessions;
  }),

  /** Get messages for a specific voice session */
  getSessionMessages: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      // Verify session belongs to user
      const sessions = await db
        .select()
        .from(v2vSessions)
        .where(and(eq(v2vSessions.id, input.sessionId), eq(v2vSessions.userId, ctx.user.id)))
        .limit(1);
      if (!sessions.length) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      const messages = await db
        .select()
        .from(v2vMessages)
        .where(eq(v2vMessages.sessionId, input.sessionId))
        .orderBy(v2vMessages.createdAt);
      return messages;
    }),

  /** Answer an entropy-triggered outbound call */
  answerCall: protectedProcedure
    .input(z.object({ voicemailId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { markCallAnswered, buildEntropyAwarePrompt } = await import("../outboundCall");
      await markCallAnswered(input.voicemailId);
      const systemPrompt = await buildEntropyAwarePrompt(ctx.user.id);
      return { systemPrompt };
    }),

  /** Decline an entropy-triggered outbound call — triggers voicemail generation */
  declineCall: protectedProcedure
    .input(z.object({ voicemailId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { generateVoicemail } = await import("../outboundCall");
      // Fire-and-forget voicemail generation
      generateVoicemail(ctx.user.id, input.voicemailId).catch((err) =>
        console.error("[OutboundCall] Voicemail generation failed:", err)
      );
      return { ok: true, message: "Your Higher Self will leave you a voicemail." };
    }),

  /** Get user's voicemails */
  getVoicemails: protectedProcedure.query(async ({ ctx }) => {
    const { getUserVoicemails } = await import("../outboundCall");
    return getUserVoicemails(ctx.user.id);
  }),

  /** Mark a voicemail as listened */
  markVoicemailListened: protectedProcedure
    .input(z.object({ voicemailId: z.number() }))
    .mutation(async ({ input }) => {
      const { markVoicemailListened } = await import("../outboundCall");
      await markVoicemailListened(input.voicemailId);
      return { ok: true };
    }),

  /** Rename a voice session */
  renameSession: protectedProcedure
    .input(z.object({ sessionId: z.number(), title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Verify session belongs to user
      const sessions = await db
        .select()
        .from(v2vSessions)
        .where(and(eq(v2vSessions.id, input.sessionId), eq(v2vSessions.userId, ctx.user.id)))
        .limit(1);
      if (!sessions.length) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      await db
        .update(v2vSessions)
        .set({ title: input.title })
        .where(eq(v2vSessions.id, input.sessionId));
      return { ok: true };
    }),

  /** Save a voice session transcript as a journal entry */
  saveToJournal: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Verify session belongs to user
      const sessions = await db
        .select()
        .from(v2vSessions)
        .where(and(eq(v2vSessions.id, input.sessionId), eq(v2vSessions.userId, ctx.user.id)))
        .limit(1);
      if (!sessions.length) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      const session = sessions[0];

      // Get all messages for this session
      const messages = await db
        .select()
        .from(v2vMessages)
        .where(eq(v2vMessages.sessionId, input.sessionId))
        .orderBy(v2vMessages.createdAt);

      if (!messages.length) throw new TRPCError({ code: "BAD_REQUEST", message: "No messages in session" });

      // Build transcript text
      const transcript = messages
        .filter((m) => m.role !== "system")
        .map((m) => `${m.role === "user" ? "Me" : "Mirror"}: ${m.transcript}`)
        .join("\n\n");

      const sessionDate = session.startedAt.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const content = `Voice Mirror Session — ${sessionDate}\n\n${transcript}`;
      const title = `Voice Mirror — ${sessionDate}`;

      // Import journal helpers
      const { createJournalEntry } = await import("../db");
      await createJournalEntry({ userId: ctx.user.id, title, content, moodTag: "reflective" });

      // RAG: Embed the full voice transcript for future retrieval
      storeMemory({
        userId: ctx.user.id,
        sourceType: "voice",
        content: `${title}\n\n${transcript}`,
        metadata: { sessionId: input.sessionId.toString() },
      }).catch((err) => console.error("[RAG] Voice transcript embedding failed:", err));

      return { ok: true };
    }),
});
