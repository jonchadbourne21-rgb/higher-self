import { eq, desc, and } from "drizzle-orm";
import { getDb } from "../db";
import { sessionFingerprints, type InsertSessionFingerprint } from "../../drizzle/schema";
import { ENV } from "../_core/env";

// ─── Gemini 2.5 Flash Fingerprint Extraction ─────────────────────────────────

const EXTRACTION_PROMPT = `You are a psychological pattern extractor. Given a transcript of a personal growth session (either a chat conversation or a daily check-in), extract exactly three fields:

1. **emotional_valence**: A float from -1.0 (extremely negative/distressed) to +1.0 (extremely positive/elated). 0.0 is neutral. Be precise to one decimal place.

2. **self_belief**: The user's dominant self-belief expressed or implied in this session, stated as a single sentence in first person (e.g., "I am not good enough for the people around me" or "I can handle whatever comes my way").

3. **unresolved_tension**: The primary unresolved tension or conflict the user is carrying, named in a concise phrase (e.g., "fear of abandonment vs. desire for independence" or "perfectionism blocking creative expression").

Rules:
- Base your extraction ONLY on what the user said (not the AI responses).
- If the user barely said anything meaningful, use valence 0.0, self_belief "No clear self-belief expressed", and unresolved_tension "No clear tension identified".
- Be specific and grounded in the actual text, not generic.

Respond ONLY with valid JSON matching this exact schema:
{
  "emotional_valence": <float between -1.0 and 1.0>,
  "self_belief": "<one sentence in first person>",
  "unresolved_tension": "<concise phrase naming the tension>"
}`;

interface FingerprintResult {
  emotional_valence: number;
  self_belief: string;
  unresolved_tension: string;
}

/**
 * Call Gemini 2.5 Flash to extract a session fingerprint from conversation text.
 * Returns null if extraction fails (non-blocking).
 */
export async function extractFingerprint(
  sessionText: string
): Promise<FingerprintResult | null> {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) {
    console.warn("[Fingerprint] GEMINI_API_KEY not configured, skipping extraction");
    return null;
  }

  // Truncate very long sessions to stay within token limits (keep last ~8000 chars)
  const truncated = sessionText.length > 8000
    ? "...[earlier messages truncated]...\n" + sessionText.slice(-8000)
    : sessionText;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: EXTRACTION_PROMPT + "\n\n---\n\nSESSION TRANSCRIPT:\n" + truncated },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("[Fingerprint] Gemini API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("[Fingerprint] No text in Gemini response");
      return null;
    }

    const parsed: FingerprintResult = JSON.parse(text);

    // Validate valence range
    if (parsed.emotional_valence < -1 || parsed.emotional_valence > 1) {
      parsed.emotional_valence = Math.max(-1, Math.min(1, parsed.emotional_valence));
    }

    return parsed;
  } catch (err) {
    console.error("[Fingerprint] Extraction failed:", err);
    return null;
  }
}

/**
 * Store a fingerprint in the database.
 */
export async function storeFingerprint(
  userId: number,
  sessionId: string,
  sourceType: "chat" | "checkin",
  fingerprint: FingerprintResult,
  meta?: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(sessionFingerprints).values({
    userId,
    sessionId,
    sourceType,
    emotionalValence: fingerprint.emotional_valence,
    selfBelief: fingerprint.self_belief,
    unresolvedTension: fingerprint.unresolved_tension,
    extractionMeta: meta ?? null,
  });
}

/**
 * Background job: extract and store a fingerprint after a session.
 * Fire-and-forget — errors are logged but never thrown to the caller.
 */
export async function extractAndStoreFingerprint(
  userId: number,
  sessionId: string,
  sourceType: "chat" | "checkin",
  sessionText: string
): Promise<void> {
  try {
    const startTime = Date.now();
    const fingerprint = await extractFingerprint(sessionText);
    const duration = Date.now() - startTime;

    if (!fingerprint) return;

    await storeFingerprint(userId, sessionId, sourceType, fingerprint, {
      model: "gemini-2.5-flash",
      extractionDurationMs: duration,
      textLength: sessionText.length,
    });

    console.log(
      `[Fingerprint] Extracted for user ${userId}, session ${sessionId}: valence=${fingerprint.emotional_valence}`
    );
  } catch (err) {
    // Never throw — this is a background operation
    console.error("[Fingerprint] Background extraction error:", err);
  }
}

/**
 * Get all fingerprints for a user, ordered by most recent first.
 */
export async function getUserFingerprints(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(sessionFingerprints)
    .where(eq(sessionFingerprints.userId, userId))
    .orderBy(desc(sessionFingerprints.createdAt))
    .limit(limit);
}

/**
 * Get the most recent fingerprint for a user.
 */
export async function getLatestFingerprint(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(sessionFingerprints)
    .where(eq(sessionFingerprints.userId, userId))
    .orderBy(desc(sessionFingerprints.createdAt))
    .limit(1);

  return results[0] ?? null;
}
