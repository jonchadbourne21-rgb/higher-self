/**
 * 30-Day Letter Generator (First-Strike Roadmap — Step 3)
 *
 * At the 30-day mark for any user with at least 4 session fingerprints,
 * generates a 200-word letter in the user's own voice using:
 * - All stored session fingerprints (Gemini valence data)
 * - The linguistic drift score
 * - The user's original stated intention from session one
 *
 * The letter ends with a single accountability question.
 * Delivered via in-app notification and push.
 * Engagement metrics tracked: open rate, re-engagement within 48h, session-start rate.
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import {
  sessionFingerprints,
  linguisticDrift,
  timeCapsuleLetters,
  psychologicalFingerprints,
  users,
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ThirtyDayLetterResult {
  letterContent: string;
  accountabilityQuestion: string;
  driftScoreSnapshot: number | null;
  valenceSnapshot: { avg: number; trend: string } | null;
}

export interface EligibilityCheck {
  eligible: boolean;
  reason?: string;
  userId: number;
  daysSinceFirstSession: number;
  fingerprintCount: number;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const THIRTY_DAY_LETTER_PROMPT = `You are writing a 200-word letter FROM the user's past self (30 days ago) TO their present self. This letter is a psychological mirror — not a summary, not encouragement, not therapy.

INPUTS YOU'LL RECEIVE:
- Session fingerprints: emotional valence scores, self-belief statements, and unresolved tensions from their sessions
- Linguistic drift data: words they've retired and words they've adopted
- Their original stated intention from day one
- Their psychological fingerprints with exact quotes

YOUR TASK:
Write exactly 200 words (±20) in FIRST PERSON, PAST TENSE, using the user's EXACT PHRASES from their sessions. The letter should:

1. Open with a line that references their original intention — what they said they wanted when they started
2. Acknowledge the emotional arc shown in the valence data (trending up/down/stable)
3. Name specific words they've stopped using and words they've started using (from drift data)
4. Quote their exact self-belief statements — the ones that reveal who they think they are
5. End with ONE accountability question that creates genuine psychological weight

RULES:
- First person only. Past tense. ("I remember saying...", "I used to believe...")
- Use their EXACT words — never paraphrase
- Never use therapeutic language or motivational platitudes
- The accountability question must reference their original intention
- Maximum 200 words (±20). Density creates impact.
- Output the letter ONLY — no preamble, no explanation

After the letter, on a new line starting with "QUESTION:", write ONLY the accountability question separately (this will be stored as metadata).`;

// ── Core Functions ────────────────────────────────────────────────────────────

/**
 * Check if a user is eligible for their 30-day letter.
 * Requirements: 30+ days since first session, 4+ session fingerprints.
 */
export async function checkEligibility(userId: number): Promise<EligibilityCheck> {
  const db = await getDb();
  if (!db) {
    return { eligible: false, reason: "DB unavailable", userId, daysSinceFirstSession: 0, fingerprintCount: 0 };
  }

  // Get the user's first session fingerprint (earliest createdAt)
  const firstFingerprint = await db
    .select({ createdAt: sessionFingerprints.createdAt })
    .from(sessionFingerprints)
    .where(eq(sessionFingerprints.userId, userId))
    .orderBy(sessionFingerprints.createdAt)
    .limit(1);

  if (firstFingerprint.length === 0) {
    return { eligible: false, reason: "No session fingerprints", userId, daysSinceFirstSession: 0, fingerprintCount: 0 };
  }

  const daysSinceFirst = Math.floor(
    (Date.now() - new Date(firstFingerprint[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Count total fingerprints
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessionFingerprints)
    .where(eq(sessionFingerprints.userId, userId));

  const fingerprintCount = countResult[0]?.count ?? 0;

  if (daysSinceFirst < 30) {
    return {
      eligible: false,
      reason: `Only ${daysSinceFirst} days since first session (need 30)`,
      userId,
      daysSinceFirstSession: daysSinceFirst,
      fingerprintCount,
    };
  }

  if (fingerprintCount < 4) {
    return {
      eligible: false,
      reason: `Only ${fingerprintCount} fingerprints (need 4)`,
      userId,
      daysSinceFirstSession: daysSinceFirst,
      fingerprintCount,
    };
  }

  // Check if they already received a 30-day letter
  const existingLetter = await db
    .select({ id: timeCapsuleLetters.id })
    .from(timeCapsuleLetters)
    .where(
      and(
        eq(timeCapsuleLetters.userId, userId),
        eq(timeCapsuleLetters.accountabilityQuestion, sql`accountabilityQuestion IS NOT NULL`)
      )
    )
    .limit(1);

  // Use a simpler check — look for letters with accountability questions (our 30-day letters)
  const thirtyDayLetters = await db
    .select({ id: timeCapsuleLetters.id })
    .from(timeCapsuleLetters)
    .where(eq(timeCapsuleLetters.userId, userId));

  // Filter in JS since we can't easily query for non-null accountabilityQuestion
  // We'll just check if they've had a letter generated in the last 25 days to avoid duplicates
  const recentLetters = await db
    .select({ generatedAt: timeCapsuleLetters.generatedAt })
    .from(timeCapsuleLetters)
    .where(
      and(
        eq(timeCapsuleLetters.userId, userId),
        gte(timeCapsuleLetters.generatedAt, new Date(Date.now() - 25 * 24 * 60 * 60 * 1000))
      )
    );

  if (recentLetters.length > 0) {
    return {
      eligible: false,
      reason: "Already received a letter in the last 25 days",
      userId,
      daysSinceFirstSession: daysSinceFirst,
      fingerprintCount,
    };
  }

  return {
    eligible: true,
    userId,
    daysSinceFirstSession: daysSinceFirst,
    fingerprintCount,
  };
}

/**
 * Gather all context data for generating the 30-day letter.
 */
async function gatherLetterContext(userId: number) {
  const db = await getDb();
  if (!db) return null;

  // 1. Get all session fingerprints (Gemini valence data)
  const fingerprints = await db
    .select()
    .from(sessionFingerprints)
    .where(eq(sessionFingerprints.userId, userId))
    .orderBy(sessionFingerprints.createdAt);

  // 2. Get the most recent linguistic drift analysis
  const driftData = await db
    .select()
    .from(linguisticDrift)
    .where(eq(linguisticDrift.userId, userId))
    .orderBy(desc(linguisticDrift.weekStart))
    .limit(3);

  // 3. Get psychological fingerprints (richer data with exact quotes)
  const psychFingerprints = await db
    .select()
    .from(psychologicalFingerprints)
    .where(eq(psychologicalFingerprints.userId, userId))
    .orderBy(psychologicalFingerprints.extractedAt);

  // 4. Get user's seed intent (original stated intention)
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = userRows[0];
  const seedIntent = (user as any)?.seedIntent || null;

  return {
    sessionFingerprints: fingerprints,
    driftData,
    psychFingerprints,
    seedIntent,
    userName: user?.name || "friend",
  };
}

/**
 * Compute valence snapshot from session fingerprints.
 */
export function computeValenceSnapshot(
  fingerprints: { emotionalValence: number; createdAt: Date }[]
): { avg: number; trend: string } | null {
  if (fingerprints.length === 0) return null;

  const avg = fingerprints.reduce((sum, fp) => sum + fp.emotionalValence, 0) / fingerprints.length;

  // Determine trend by comparing first half to second half
  const mid = Math.floor(fingerprints.length / 2);
  if (mid === 0) return { avg: Math.round(avg * 100) / 100, trend: "stable" };

  const firstHalfAvg = fingerprints.slice(0, mid).reduce((s, fp) => s + fp.emotionalValence, 0) / mid;
  const secondHalfAvg = fingerprints.slice(mid).reduce((s, fp) => s + fp.emotionalValence, 0) / (fingerprints.length - mid);

  const diff = secondHalfAvg - firstHalfAvg;
  let trend: string;
  if (diff > 0.15) trend = "rising";
  else if (diff < -0.15) trend = "falling";
  else trend = "stable";

  return { avg: Math.round(avg * 100) / 100, trend };
}

/**
 * Generate the 30-day letter for a user.
 */
export async function generateThirtyDayLetter(userId: number): Promise<ThirtyDayLetterResult | null> {
  const context = await gatherLetterContext(userId);
  if (!context) return null;

  const { sessionFingerprints: sfps, driftData, psychFingerprints, seedIntent } = context;

  // Build the context string for the LLM
  const parts: string[] = [];

  // Original intention
  if (seedIntent) {
    parts.push(`ORIGINAL STATED INTENTION (Day 1): "${seedIntent}"`);
  } else if (psychFingerprints.length > 0) {
    const first = psychFingerprints[0];
    parts.push(`ORIGINAL STATED INTENTION (Day 1): "${first.aspirationalSelf || first.coreBelief}"`);
  }

  // Valence data
  const valenceSnapshot = computeValenceSnapshot(sfps);
  if (valenceSnapshot) {
    parts.push(`\nEMOTIONAL VALENCE DATA:\n- Average: ${valenceSnapshot.avg} (scale: -1.0 negative to +1.0 positive)\n- Trend: ${valenceSnapshot.trend}`);
  }

  // Session fingerprints (self-beliefs and tensions)
  if (sfps.length > 0) {
    const beliefs = sfps.map((fp) => `"${fp.selfBelief}"`).filter(Boolean);
    const tensions = sfps.map((fp) => `"${fp.unresolvedTension}"`).filter(Boolean);
    parts.push(`\nSELF-BELIEF STATEMENTS (across ${sfps.length} sessions):\n${beliefs.join("\n")}`);
    parts.push(`\nUNRESOLVED TENSIONS:\n${tensions.join("\n")}`);
  }

  // Linguistic drift
  if (driftData.length > 0) {
    const allRetired = driftData.flatMap((d) => (d.retiredWords as string[]) || []);
    const allNew = driftData.flatMap((d) => (d.newWords as string[]) || []);
    const latestScore = driftData[0]?.driftScore ?? 0;

    if (allRetired.length > 0 || allNew.length > 0) {
      parts.push(`\nLINGUISTIC DRIFT:\n- Words RETIRED (no longer using): ${allRetired.slice(0, 10).join(", ") || "none detected"}\n- Words ADOPTED (newly appearing): ${allNew.slice(0, 10).join(", ") || "none detected"}\n- Drift Score: ${latestScore.toFixed(2)} (positive = moving toward goals, negative = drifting away)`);
    }
  }

  // Psychological fingerprints (exact quotes)
  if (psychFingerprints.length > 0) {
    const quotes = psychFingerprints
      .flatMap((fp) => fp.rawExcerpts || [])
      .slice(0, 8);
    if (quotes.length > 0) {
      parts.push(`\nEXACT QUOTES FROM SESSIONS:\n${quotes.map((q) => `"${q}"`).join("\n")}`);
    }
  }

  const fullContext = parts.join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: THIRTY_DAY_LETTER_PROMPT },
        {
          role: "user",
          content: `Generate the 30-day letter for this user.\n\n${fullContext}`,
        },
      ],
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") return null;

    // Parse out the accountability question
    const questionMatch = rawContent.match(/QUESTION:\s*(.+)/i);
    const accountabilityQuestion = questionMatch
      ? questionMatch[1].trim()
      : "Are you who you said you'd become?";

    // Remove the QUESTION: line from the letter content
    const letterContent = rawContent.replace(/\n?QUESTION:\s*.+/i, "").trim();

    // Get drift score snapshot
    const driftScoreSnapshot = driftData.length > 0 ? driftData[0].driftScore : null;

    return {
      letterContent,
      accountabilityQuestion,
      driftScoreSnapshot,
      valenceSnapshot,
    };
  } catch (err) {
    console.error("[30DayLetter] Generation failed:", err);
    return null;
  }
}

/**
 * Generate, save, and prepare the 30-day letter for delivery.
 */
export async function generateAndSaveThirtyDayLetter(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await generateThirtyDayLetter(userId);
  if (!result) return false;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get fingerprint IDs used
  const fps = await db
    .select({ id: sessionFingerprints.id })
    .from(sessionFingerprints)
    .where(eq(sessionFingerprints.userId, userId));

  await db.insert(timeCapsuleLetters).values({
    userId,
    letterContent: result.letterContent,
    fingerprintIds: fps.map((f) => f.id),
    status: "pending",
    periodStart: thirtyDaysAgo,
    periodEnd: now,
    driftScoreSnapshot: result.driftScoreSnapshot,
    valenceSnapshot: result.valenceSnapshot,
    accountabilityQuestion: result.accountabilityQuestion,
  });

  console.log(`[30DayLetter] Generated and saved letter for user ${userId}`);
  return true;
}

/**
 * Track engagement: record when a user starts a session after receiving a letter.
 * Called from the chat/session flow when a user starts a new session.
 */
export async function trackPostLetterEngagement(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Find delivered but not yet tracked letters for this user
  const deliveredLetters = await db
    .select()
    .from(timeCapsuleLetters)
    .where(
      and(
        eq(timeCapsuleLetters.userId, userId),
        eq(timeCapsuleLetters.sessionStartedWithin48h, false)
      )
    );

  // Also check letters where sessionStartedWithin48h is null (not yet tracked)
  const untrackedLetters = await db
    .select()
    .from(timeCapsuleLetters)
    .where(
      and(
        eq(timeCapsuleLetters.userId, userId),
        sql`${timeCapsuleLetters.deliveredAt} IS NOT NULL`,
        sql`${timeCapsuleLetters.firstSessionAfterDelivery} IS NULL`
      )
    );

  const now = new Date();

  for (const letter of untrackedLetters) {
    if (!letter.deliveredAt) continue;

    const hoursSinceDelivery = (now.getTime() - new Date(letter.deliveredAt).getTime()) / (1000 * 60 * 60);
    const within48h = hoursSinceDelivery <= 48;

    await db
      .update(timeCapsuleLetters)
      .set({
        firstSessionAfterDelivery: now,
        sessionStartedWithin48h: within48h,
      })
      .where(eq(timeCapsuleLetters.id, letter.id));

    console.log(
      `[30DayLetter] Tracked engagement for letter ${letter.id}: session started ${hoursSinceDelivery.toFixed(1)}h after delivery (within48h: ${within48h})`
    );
  }
}

/**
 * Get engagement metrics for all 30-day letters (for PoC measurement).
 */
export async function getEngagementMetrics() {
  const db = await getDb();
  if (!db) return null;

  const allLetters = await db
    .select()
    .from(timeCapsuleLetters)
    .where(sql`${timeCapsuleLetters.accountabilityQuestion} IS NOT NULL`);

  const total = allLetters.length;
  if (total === 0) return { total: 0, delivered: 0, read: 0, openRate: 0, reEngagementRate: 0, sessionStartRate: 0 };

  const delivered = allLetters.filter((l) => l.deliveredAt).length;
  const read = allLetters.filter((l) => l.readAt).length;
  const sessionStarted = allLetters.filter((l) => l.sessionStartedWithin48h === true).length;

  return {
    total,
    delivered,
    read,
    openRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
    reEngagementRate: delivered > 0 ? Math.round((sessionStarted / delivered) * 100) : 0,
    sessionStartRate: read > 0 ? Math.round((sessionStarted / read) * 100) : 0,
  };
}
