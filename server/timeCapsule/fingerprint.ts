/**
 * Psychological Fingerprint Extraction
 *
 * Silently extracts three things from each session:
 * 1. The dominant emotional tone
 * 2. The core belief the user expressed about themselves
 * 3. One unresolved tension they named
 *
 * Plus: raw excerpts (exact user quotes) and aspirational self (who they want to become).
 * This runs asynchronously after sessions — invisible to the user in the moment.
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { psychologicalFingerprints } from "../../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export interface FingerprintExtraction {
  emotionalTone: string;
  coreBelief: string;
  unresolvedTension: string;
  rawExcerpts: string[];
  aspirationalSelf: string | null;
}

const EXTRACTION_PROMPT = `You are a depth psychologist performing a silent clinical observation. You are NOT responding to the user — you are extracting a psychological fingerprint from their session for future therapeutic use.

From the conversation below, extract EXACTLY these five elements:

1. **emotionalTone**: The dominant emotional undercurrent (not the surface emotion). Use evocative, precise language. Examples: "anxious longing masked as productivity", "quiet grief that hasn't found its name", "defiant hope fighting exhaustion". NOT just "sad" or "happy".

2. **coreBelief**: The core belief the user expressed about themselves — often implicit, sometimes explicit. This is the story they tell themselves about who they are. Examples: "I'm only valuable when I'm useful to others", "I don't deserve rest until everything is perfect", "If I show weakness, I'll be abandoned".

3. **unresolvedTension**: One unresolved tension they named or revealed — the thing pulling them in two directions simultaneously. Examples: "wanting deep connection but fearing the vulnerability it requires", "craving freedom while clinging to the safety of routine", "knowing they need to leave but terrified of who they are without it".

4. **rawExcerpts**: 2-4 exact quotes from the user's messages that reveal their authentic voice — the phrases that carry emotional weight, the words that would make them stop and say "yes, that's exactly it." These will be used to write back to them in their own voice later.

5. **aspirationalSelf**: Who they said or implied they want to become. This might be explicit ("I want to be someone who...") or implicit in their frustrations (the inverse of what they're struggling with). If not discernible, return null.

CRITICAL RULES:
- Extract ONLY from the USER's messages, not the AI's responses
- Use the user's actual language and phrasing wherever possible
- If the conversation is too shallow or brief to extract meaningful fingerprints, return null for the entire response
- Do NOT invent or project — only extract what is genuinely present
- The rawExcerpts must be EXACT quotes, not paraphrases

Respond in JSON format only.`;

/**
 * Extract a psychological fingerprint from a session's messages.
 * Returns null if the conversation is too shallow for meaningful extraction.
 */
export async function extractFingerprint(
  userMessages: string[],
  sessionType: "chat" | "voice" | "checkin" | "program"
): Promise<FingerprintExtraction | null> {
  // Need at least 2 substantive user messages (>30 chars each) for meaningful extraction
  const substantiveMessages = userMessages.filter((m) => m.length > 30);
  if (substantiveMessages.length < 2) return null;

  const conversationText = userMessages
    .map((m, i) => `[User message ${i + 1}]: ${m}`)
    .join("\n\n");

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: conversationText },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fingerprint_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              isSubstantive: {
                type: "boolean",
                description: "Whether the conversation has enough depth for meaningful extraction",
              },
              emotionalTone: { type: "string", description: "The dominant emotional undercurrent" },
              coreBelief: { type: "string", description: "Core belief about themselves" },
              unresolvedTension: { type: "string", description: "One unresolved tension" },
              rawExcerpts: {
                type: "array",
                items: { type: "string" },
                description: "2-4 exact quotes from user",
              },
              aspirationalSelf: {
                type: ["string", "null"],
                description: "Who they want to become, or null",
              },
            },
            required: [
              "isSubstantive",
              "emotionalTone",
              "coreBelief",
              "unresolvedTension",
              "rawExcerpts",
              "aspirationalSelf",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content as string);
    if (!parsed.isSubstantive) return null;

    return {
      emotionalTone: parsed.emotionalTone,
      coreBelief: parsed.coreBelief,
      unresolvedTension: parsed.unresolvedTension,
      rawExcerpts: parsed.rawExcerpts,
      aspirationalSelf: parsed.aspirationalSelf,
    };
  } catch (err) {
    console.error("[TimeCapsule] Fingerprint extraction failed:", err);
    return null;
  }
}

/**
 * Save a fingerprint to the database. Fire-and-forget — never blocks the user's session.
 */
export async function saveFingerprint(
  userId: number,
  sessionType: "chat" | "voice" | "checkin" | "program",
  sessionId: string | null,
  fingerprint: FingerprintExtraction
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(psychologicalFingerprints).values({
      userId,
      sessionType,
      sessionId: sessionId ?? undefined,
      emotionalTone: fingerprint.emotionalTone,
      coreBelief: fingerprint.coreBelief,
      unresolvedTension: fingerprint.unresolvedTension,
      rawExcerpts: fingerprint.rawExcerpts,
      aspirationalSelf: fingerprint.aspirationalSelf ?? undefined,
    });
  } catch (err) {
    console.error("[TimeCapsule] Failed to save fingerprint:", err);
  }
}

/**
 * Extract and save a fingerprint in one call. Fully async, fire-and-forget.
 * Call this at the end of sessions without awaiting it in the response path.
 */
export async function extractAndSaveFingerprint(
  userId: number,
  sessionType: "chat" | "voice" | "checkin" | "program",
  sessionId: string | null,
  userMessages: string[]
): Promise<void> {
  const fingerprint = await extractFingerprint(userMessages, sessionType);
  if (!fingerprint) return;
  await saveFingerprint(userId, sessionType, sessionId, fingerprint);
}

/**
 * Get all fingerprints for a user within a date range.
 */
export async function getFingerprintsForPeriod(
  userId: number,
  since: Date,
  until?: Date
): Promise<typeof psychologicalFingerprints.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(psychologicalFingerprints.userId, userId),
    gte(psychologicalFingerprints.extractedAt, since),
  ];

  return db
    .select()
    .from(psychologicalFingerprints)
    .where(and(...conditions))
    .orderBy(desc(psychologicalFingerprints.extractedAt));
}

/**
 * Get the most recent N fingerprints for a user.
 */
export async function getRecentFingerprints(
  userId: number,
  limit: number = 10
): Promise<typeof psychologicalFingerprints.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(psychologicalFingerprints)
    .where(eq(psychologicalFingerprints.userId, userId))
    .orderBy(desc(psychologicalFingerprints.extractedAt))
    .limit(limit);
}
