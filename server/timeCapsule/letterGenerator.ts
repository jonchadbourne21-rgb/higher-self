/**
 * Time Capsule Letter Generator
 *
 * Generates "A Letter From Your Past Self" — written in the user's own linguistic style,
 * in first person, surfacing the exact words they used, the fears they named,
 * and the person they said they wanted to become.
 *
 * This is not a summary. It is not a report. It is a psychological confrontation.
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { timeCapsuleLetters, psychologicalFingerprints } from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import type { PsychologicalFingerprint } from "../../drizzle/schema";

export interface GeneratedLetter {
  content: string;
  fingerprintIds: number[];
  periodStart: Date;
  periodEnd: Date;
}

const LETTER_GENERATION_PROMPT = `You are about to write the most intimate thing a product has ever delivered. You are writing a letter FROM the user's past self TO their present self. This is not a summary. This is not a report. This is a psychological confrontation.

You will receive a collection of "psychological fingerprints" — extracted emotional tones, core beliefs, unresolved tensions, and exact quotes from the user's past sessions. Your job is to weave these into a first-person letter that:

1. Is written IN THE USER'S OWN VOICE — match their linguistic patterns, vocabulary, sentence structure, and emotional register. If they use short punchy sentences, you do too. If they're poetic, be poetic. If they're blunt, be blunt.

2. Uses their EXACT WORDS — the raw excerpts are sacred. Weave them in naturally, as if the past self is reminding the present self what they said.

3. Surfaces the FEARS they named — don't soften them. Name them as directly as the user did.

4. Names the PERSON THEY SAID THEY WANTED TO BECOME — the aspirational self they described, in their own language.

5. Ends with a SINGLE QUESTION: a variation of "Did you become them?" — but phrased in the user's own voice and style. This question should land like a punch to the chest.

STRUCTURE:
- Opening: A greeting that feels like the user talking to themselves (not "Dear future me" — something authentic to their voice)
- Body: 2-3 paragraphs that weave together the emotional tones, beliefs, tensions, and exact quotes from the period
- The Turn: A moment where the letter shifts from remembering to confronting
- The Question: One final question that creates genuine psychological weight

RULES:
- NEVER use therapeutic language ("I notice that...", "It's okay to feel...")
- NEVER use motivational platitudes ("You've got this!", "Keep going!")
- NEVER break the first-person voice — this IS the user writing to themselves
- NEVER add context the user didn't provide — only use what's in the fingerprints
- Keep it under 400 words — density creates impact
- The tone should match the dominant emotional register of the fingerprints
- If the fingerprints reveal pain, let the letter hurt. If they reveal hope, let it ache with longing.

This letter should make the user stop scrolling. It should make them feel seen across time.`;

/**
 * Generate a time capsule letter from a collection of fingerprints.
 */
export async function generateLetter(
  fingerprints: PsychologicalFingerprint[]
): Promise<string | null> {
  if (fingerprints.length === 0) return null;

  // Build the fingerprint context for the LLM
  const fingerprintContext = fingerprints
    .map((fp, i) => {
      const date = new Date(fp.extractedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
      return `--- Fingerprint ${i + 1} (${date}, from ${fp.sessionType} session) ---
Emotional Tone: ${fp.emotionalTone}
Core Belief: "${fp.coreBelief}"
Unresolved Tension: ${fp.unresolvedTension}
Their Exact Words: ${fp.rawExcerpts.map((q) => `"${q}"`).join(" | ")}
${fp.aspirationalSelf ? `Who They Want to Become: "${fp.aspirationalSelf}"` : ""}`;
    })
    .join("\n\n");

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: LETTER_GENERATION_PROMPT },
        {
          role: "user",
          content: `Here are the psychological fingerprints from this person's past ${fingerprints.length} sessions. Write their letter.\n\n${fingerprintContext}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") return null;
    return content.trim();
  } catch (err) {
    console.error("[TimeCapsule] Letter generation failed:", err);
    return null;
  }
}

/**
 * Generate and save a time capsule letter for a user.
 * Collects all fingerprints from the specified period and generates the letter.
 */
export async function generateAndSaveLetter(
  userId: number,
  periodStart: Date,
  periodEnd: Date
): Promise<GeneratedLetter | null> {
  const db = await getDb();
  if (!db) return null;

  // Get all fingerprints for this user in the period
  const fingerprints = await db
    .select()
    .from(psychologicalFingerprints)
    .where(
      and(
        eq(psychologicalFingerprints.userId, userId),
        gte(psychologicalFingerprints.extractedAt, periodStart),
        lte(psychologicalFingerprints.extractedAt, periodEnd)
      )
    )
    .orderBy(psychologicalFingerprints.extractedAt);

  // Need at least 3 fingerprints to generate a meaningful letter
  if (fingerprints.length < 3) {
    console.log(
      `[TimeCapsule] User ${userId} has only ${fingerprints.length} fingerprints in period — skipping letter generation`
    );
    return null;
  }

  const letterContent = await generateLetter(fingerprints);
  if (!letterContent) return null;

  const fingerprintIds = fingerprints.map((fp) => fp.id);

  await db.insert(timeCapsuleLetters).values({
    userId,
    letterContent,
    fingerprintIds,
    status: "pending",
    periodStart,
    periodEnd,
  });

  return {
    content: letterContent,
    fingerprintIds,
    periodStart,
    periodEnd,
  };
}

/**
 * Get all letters for a user, ordered by most recent first.
 */
export async function getUserLetters(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(timeCapsuleLetters)
    .where(eq(timeCapsuleLetters.userId, userId))
    .orderBy(desc(timeCapsuleLetters.generatedAt));
}

/**
 * Mark a letter as delivered (sent to user via notification/email).
 */
export async function markLetterDelivered(letterId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(timeCapsuleLetters)
    .set({ status: "delivered", deliveredAt: new Date() })
    .where(eq(timeCapsuleLetters.id, letterId));
}

/**
 * Mark a letter as read (user opened/viewed it).
 */
export async function markLetterRead(letterId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(timeCapsuleLetters)
    .set({ status: "read", readAt: new Date() })
    .where(eq(timeCapsuleLetters.id, letterId));
}

/**
 * Get the count of unread letters for a user.
 */
export async function getUnreadLetterCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const letters = await db
    .select()
    .from(timeCapsuleLetters)
    .where(
      and(
        eq(timeCapsuleLetters.userId, userId),
        eq(timeCapsuleLetters.status, "delivered")
      )
    );
  return letters.length;
}
