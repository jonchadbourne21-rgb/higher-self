/**
 * Echo Module — Memory-driven reflection surfacing
 * 
 * When a journal entry is saved, this module:
 * 1. Tags it (primary_emotion, theme_tags, tension_summary, resolution_status, intensity_score)
 * 2. Generates a tension_embedding from the tension_summary
 * 3. Queries existing tension embeddings for pattern matches
 * 4. If a match scores above threshold → generates a reframing line → queues an Echo
 * 
 * Echoes are surfaced on next app open (never mid-session).
 */

import { invokeLLM } from "../_core/llm";
import { generateEmbedding, cosineSimilarity } from "../rag/memory";
import { getDb } from "../db";
import { journalEntries, echoQueue } from "../../drizzle/schema";
import { eq, and, isNull, desc, sql, ne } from "drizzle-orm";

// ─── Constants ───────────────────────────────────────────────────────────────

const ECHO_SCORE_THRESHOLD = 0.72; // Minimum similarity to trigger an Echo
const ECHO_COOLDOWN_DAYS = 30; // Don't re-surface same source entry within 30 days
const RECENCY_DECAY_HALF_LIFE_DAYS = 21; // Older entries decay in relevance
const MAX_CANDIDATES = 10;

// ─── Tagging Pipeline ────────────────────────────────────────────────────────

export interface EchoTags {
  primaryEmotion: string;
  themeTags: string[];
  tensionSummary: string;
  resolutionStatus: "open" | "resolved" | "unclear";
  intensityScore: number;
}

/**
 * Generate Echo tags for a journal entry using LLM structured output.
 * Non-blocking — called fire-and-forget after journal save.
 */
export async function generateEchoTags(content: string, title?: string): Promise<EchoTags> {
  const entryText = `${title ? `Title: ${title}\n\n` : ""}${content}`;

  const res = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a tagging engine for a journaling app. Given a journal entry, extract structured metadata. Return JSON only.

Rules:
- primary_emotion: single word, lowercase (e.g. "fear", "shame", "relief", "anger", "longing", "pride", "confusion", "grief", "hope")
- theme_tags: 2-4 tags, lowercase, 2-3 words each (e.g. "self-worth", "fear of change", "need for control")
- tension_summary: ONE sentence, third person, present tense, describing the internal conflict (e.g. "She wants to leave but feels guilty about abandoning her responsibilities")
- resolution_status: "open" if the conflict is unresolved, "resolved" if the writer found clarity, "unclear" if ambiguous
- intensity_score: 1-10 emotional intensity (1=mild observation, 10=crisis-level distress)`,
      },
      { role: "user", content: entryText },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "echo_tags",
        strict: true,
        schema: {
          type: "object",
          properties: {
            primary_emotion: { type: "string", description: "Single lowercase emotion word" },
            theme_tags: { type: "array", items: { type: "string" }, description: "2-4 lowercase theme tags" },
            tension_summary: { type: "string", description: "One sentence, third person, present tense" },
            resolution_status: { type: "string", enum: ["open", "resolved", "unclear"] },
            intensity_score: { type: "integer", description: "1-10 emotional intensity" },
          },
          required: ["primary_emotion", "theme_tags", "tension_summary", "resolution_status", "intensity_score"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const raw = res.choices[0]?.message?.content;
    const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
    return {
      primaryEmotion: parsed.primary_emotion || "unclear",
      themeTags: Array.isArray(parsed.theme_tags) ? parsed.theme_tags.slice(0, 4) : [],
      tensionSummary: parsed.tension_summary || "",
      resolutionStatus: (["open", "resolved", "unclear"].includes(parsed.resolution_status) ? parsed.resolution_status : "unclear") as "open" | "resolved" | "unclear",
      intensityScore: Math.max(1, Math.min(10, parseInt(parsed.intensity_score) || 5)),
    };
  } catch (e) {
    console.error("[Echo] Tag parsing failed:", e);
    return {
      primaryEmotion: "unclear",
      themeTags: [],
      tensionSummary: "",
      resolutionStatus: "unclear",
      intensityScore: 5,
    };
  }
}

/**
 * Persist Echo tags on the journal entry row.
 */
export async function saveEchoTags(entryId: number, userId: number, tags: EchoTags): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(journalEntries)
    .set({
      primaryEmotion: tags.primaryEmotion,
      themeTags: tags.themeTags,
      tensionSummary: tags.tensionSummary,
      resolutionStatus: tags.resolutionStatus,
      intensityScore: tags.intensityScore,
    })
    .where(and(eq(journalEntries.id, entryId), eq(journalEntries.userId, userId)));
}

// ─── Echo Retrieval ──────────────────────────────────────────────────────────

/**
 * After tagging, check if this entry's tension matches a past entry.
 * If so, generate a reframing line and queue an Echo.
 */
export async function findAndQueueEcho(
  userId: number,
  newEntryId: number,
  newTensionSummary: string,
  newIntensity: number,
  newResolutionStatus: string
): Promise<void> {
  if (!newTensionSummary || newTensionSummary.length < 10) return;

  const db = await getDb();
  if (!db) return;

  // Generate embedding for the new tension summary
  const newEmbedding = await generateEmbedding(newTensionSummary);

  // Get past entries with tension summaries (last 90 days, exclude current entry)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const candidates = await db
    .select({
      id: journalEntries.id,
      tensionSummary: journalEntries.tensionSummary,
      content: journalEntries.content,
      title: journalEntries.title,
      intensityScore: journalEntries.intensityScore,
      resolutionStatus: journalEntries.resolutionStatus,
      createdAt: journalEntries.createdAt,
    })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        ne(journalEntries.id, newEntryId),
        sql`${journalEntries.tensionSummary} IS NOT NULL`,
        sql`${journalEntries.createdAt} >= ${ninetyDaysAgo}`
      )
    )
    .orderBy(desc(journalEntries.createdAt))
    .limit(50);

  if (candidates.length === 0) return;

  // Check recently echoed entries (cooldown)
  const cooldownDate = new Date(Date.now() - ECHO_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const recentEchoes = await db
    .select({ sourceEntryId: echoQueue.sourceEntryId })
    .from(echoQueue)
    .where(
      and(
        eq(echoQueue.userId, userId),
        sql`${echoQueue.createdAt} >= ${cooldownDate}`
      )
    );
  const recentlyEchoedIds = new Set(recentEchoes.map((e) => e.sourceEntryId));

  // Score each candidate
  const scored: Array<{ id: number; score: number; content: string; title: string | null; createdAt: Date }> = [];

  for (const candidate of candidates) {
    if (recentlyEchoedIds.has(candidate.id)) continue;
    if (!candidate.tensionSummary) continue;

    // Generate embedding for candidate's tension summary
    const candidateEmbedding = await generateEmbedding(candidate.tensionSummary);
    const similarity = cosineSimilarity(newEmbedding, candidateEmbedding);

    // Recency decay: entries from 21 days ago score 50% of today's entries
    const ageMs = Date.now() - new Date(candidate.createdAt).getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    const recencyDecay = Math.pow(0.5, ageDays / RECENCY_DECAY_HALF_LIFE_DAYS);

    // Resolution weight: open tensions are more relevant to resurface
    const resolutionWeight = candidate.resolutionStatus === "open" ? 1.2 : candidate.resolutionStatus === "unclear" ? 1.0 : 0.7;

    // Intensity match: similar intensity entries are more relevant
    const intensityDiff = Math.abs((candidate.intensityScore || 5) - newIntensity);
    const intensityMatch = 1 - intensityDiff * 0.05; // 0.5 penalty per point difference

    const finalScore = similarity * recencyDecay * resolutionWeight * intensityMatch;

    if (finalScore > ECHO_SCORE_THRESHOLD) {
      scored.push({
        id: candidate.id,
        score: finalScore,
        content: candidate.content,
        title: candidate.title,
        createdAt: candidate.createdAt,
      });
    }
  }

  if (scored.length === 0) return;

  // Take the best match
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  // Generate reframing line
  const reframingLine = await generateReframingLine(best.content, best.title, best.createdAt);
  if (!reframingLine) return;

  // Queue the Echo
  await db.insert(echoQueue).values({
    userId,
    sourceEntryId: best.id,
    triggerEntryId: newEntryId,
    score: best.score,
    reframingLine,
    isCompound: false,
    compoundEntryIds: [],
  });

  console.log(`[Echo] Queued echo for user ${userId}: entry #${best.id} (score: ${best.score.toFixed(3)})`);
}

// ─── Reframing Line Generation ───────────────────────────────────────────────

async function generateReframingLine(
  pastContent: string,
  pastTitle: string | null,
  pastCreatedAt: Date
): Promise<string | null> {
  try {
    const res = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are the reflective voice of a user's journaling app, styled as their higher self. Given a past journal entry, write ONE sentence that names the pattern directly to the user, in second person, present tense. Do not moralize or give advice. Do not use therapy-speak. No exclamation points. End with a short question if it fits naturally. Under 30 words.`,
        },
        {
          role: "user",
          content: `Past entry (${pastTitle || "Untitled"}, written ${formatTimeAgo(pastCreatedAt)}):\n\n${pastContent.slice(0, 500)}`,
        },
      ],
    });

    const line = res.choices[0]?.message?.content;
    return typeof line === "string" ? line.trim() : null;
  } catch (e) {
    console.error("[Echo] Reframing line generation failed:", e);
    return null;
  }
}

// ─── Compound Echo (30+ entries) ─────────────────────────────────────────────

/**
 * Check if user has enough entries for compound echo (pattern across 3+ entries).
 * Called periodically or when entry count crosses threshold.
 */
export async function findCompoundEcho(userId: number, newEntryId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Count total tagged entries
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        sql`${journalEntries.tensionSummary} IS NOT NULL`
      )
    );

  if ((countResult?.count || 0) < 30) return;

  // Get all tagged entries with their theme_tags
  const entries = await db
    .select({
      id: journalEntries.id,
      themeTags: journalEntries.themeTags,
      tensionSummary: journalEntries.tensionSummary,
      content: journalEntries.content,
      createdAt: journalEntries.createdAt,
    })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        sql`${journalEntries.themeTags} IS NOT NULL`,
        sql`JSON_LENGTH(${journalEntries.themeTags}) > 0`
      )
    )
    .orderBy(desc(journalEntries.createdAt))
    .limit(100);

  // Cluster by theme_tags overlap
  const tagCounts: Map<string, number[]> = new Map();
  for (const entry of entries) {
    const tags = entry.themeTags as string[] | null;
    if (!tags) continue;
    for (const tag of tags) {
      if (!tagCounts.has(tag)) tagCounts.set(tag, []);
      tagCounts.get(tag)!.push(entry.id);
    }
  }

  // Find clusters with 3+ entries
  for (const [tag, entryIds] of Array.from(tagCounts.entries())) {
    if (entryIds.length < 3) continue;

    // Check if we already have a compound echo for this cluster recently
    const recentCompound = await db
      .select({ id: echoQueue.id })
      .from(echoQueue)
      .where(
        and(
          eq(echoQueue.userId, userId),
          eq(echoQueue.isCompound, true),
          sql`${echoQueue.createdAt} >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}`
        )
      )
      .limit(1);

    if (recentCompound.length > 0) continue;

    // Take the 3 most recent entries in this cluster
    const clusterEntryIds = entryIds.slice(0, 3);
    const clusterEntries = entries.filter((e) => clusterEntryIds.includes(e.id));

    // Generate compound reframing line
    const snippets = clusterEntries.map(
      (e) => `(${formatTimeAgo(e.createdAt)}): "${e.content.slice(0, 100)}..."`
    );

    const res = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are the reflective voice of a journaling app. Given 3 journal entry snippets that share a recurring theme, write ONE sentence that names the repeating pattern. Second person, present tense. No advice, no therapy-speak. End with a question. Under 35 words. Example: "This is the fourth time you've described feeling trapped right after describing a win. Notice that?"`,
        },
        {
          role: "user",
          content: `Recurring theme: "${tag}"\n\nEntries:\n${snippets.join("\n")}`,
        },
      ],
    });

    const line = res.choices[0]?.message?.content;
    if (typeof line !== "string") continue;

    await db.insert(echoQueue).values({
      userId,
      sourceEntryId: clusterEntryIds[0],
      triggerEntryId: newEntryId,
      score: 0.9,
      reframingLine: line.trim(),
      isCompound: true,
      compoundEntryIds: clusterEntryIds,
    });

    console.log(`[Echo] Queued compound echo for user ${userId}: theme "${tag}" (${clusterEntryIds.length} entries)`);
    break; // Only one compound echo per trigger
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

// ─── Public API for Router ───────────────────────────────────────────────────

/**
 * Get the next pending Echo for a user (for app open reveal).
 * Returns null if no Echo is queued.
 */
export async function getPendingEcho(userId: number): Promise<{
  id: number;
  sourceEntryId: number;
  sourceContent: string;
  sourceTitle: string | null;
  sourceCreatedAt: Date;
  reframingLine: string;
  isCompound: boolean;
  compoundEntries?: Array<{ id: number; content: string; createdAt: Date }>;
} | null> {
  const db = await getDb();
  if (!db) return null;

  // Get oldest unsurfaced echo
  const [echo] = await db
    .select()
    .from(echoQueue)
    .where(
      and(
        eq(echoQueue.userId, userId),
        isNull(echoQueue.surfacedAt),
        isNull(echoQueue.dismissedAt)
      )
    )
    .orderBy(echoQueue.createdAt)
    .limit(1);

  if (!echo) return null;

  // Mark as surfaced
  await db
    .update(echoQueue)
    .set({ surfacedAt: new Date() })
    .where(eq(echoQueue.id, echo.id));

  // Get source entry content
  const [sourceEntry] = await db
    .select({
      id: journalEntries.id,
      content: journalEntries.content,
      title: journalEntries.title,
      createdAt: journalEntries.createdAt,
    })
    .from(journalEntries)
    .where(eq(journalEntries.id, echo.sourceEntryId));

  if (!sourceEntry) return null;

  // For compound echoes, get all entries
  let compoundEntries: Array<{ id: number; content: string; createdAt: Date }> | undefined;
  if (echo.isCompound && echo.compoundEntryIds && (echo.compoundEntryIds as number[]).length > 0) {
    const ids = echo.compoundEntryIds as number[];
    const entries = await db
      .select({
        id: journalEntries.id,
        content: journalEntries.content,
        createdAt: journalEntries.createdAt,
      })
      .from(journalEntries)
      .where(sql`${journalEntries.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
    compoundEntries = entries;
  }

  return {
    id: echo.id,
    sourceEntryId: sourceEntry.id,
    sourceContent: sourceEntry.content,
    sourceTitle: sourceEntry.title,
    sourceCreatedAt: sourceEntry.createdAt,
    reframingLine: echo.reframingLine,
    isCompound: echo.isCompound,
    compoundEntries,
  };
}

/**
 * Mark an Echo as dismissed (user tapped "Not now").
 */
export async function dismissEcho(echoId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(echoQueue)
    .set({ dismissedAt: new Date() })
    .where(and(eq(echoQueue.id, echoId), eq(echoQueue.userId, userId)));
}

/**
 * Mark an Echo as reflected (user tapped "Reflect on this").
 */
export async function reflectOnEcho(echoId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(echoQueue)
    .set({ reflectedAt: new Date() })
    .where(and(eq(echoQueue.id, echoId), eq(echoQueue.userId, userId)));
}


