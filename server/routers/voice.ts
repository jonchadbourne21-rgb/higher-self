import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { v2vSessions, v2vMessages } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";

const HUME_TOKEN_URL = "https://api.hume.ai/oauth2-cc/token";

async function mintHumeToken(): Promise<string> {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;
  if (!apiKey || !secretKey) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Hume credentials not configured" });
  }
  const basic = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
  const res = await fetch(HUME_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Hume token error: ${err}` });
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export const voiceRouter = router({
  /** Mint a short-lived Hume access token for the browser to use directly */
  mintToken: protectedProcedure.mutation(async () => {
    const token = await mintHumeToken();
    const configId = process.env.HUME_CONFIG_ID || "";
    return { token, configId };
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
      return { ok: true };
    }),
});
