/**
 * LLM-as-judge evaluators: context relevance and answer groundedness.
 *
 * Two cost controls, both required by the eval spec:
 *   1. A hard cap on judged queries per run (JUDGE_QUERY_LIMIT).
 *   2. A content-addressed cache, so re-running an unchanged dataset against an
 *      unchanged retriever costs nothing. The cache key covers the query and
 *      every judged memory, so any change to either invalidates it.
 *
 * Privacy: only truncated content ever reaches the model, the same PREVIEW_CHARS
 * limit the production prompt path uses. No userId, hashed or otherwise, is sent.
 */

import { invokeLLM } from "../../_core/llm";
import type { RetrievedMemory } from "../memory";
import { contentHash, truncate, PREVIEW_CHARS } from "./types";

/** Maximum queries sent to the judge in a single run. */
export const JUDGE_QUERY_LIMIT = 100;

/** Maximum memories judged per query, to bound tokens on wide result sets. */
const MAX_MEMORIES_PER_JUDGEMENT = 10;

type CacheKey = string;
const relevanceCache = new Map<CacheKey, number[]>();
const groundednessCache = new Map<CacheKey, number>();

/** Clear both judge caches. Exposed for tests and for forcing a cold run. */
export function clearJudgeCaches(): void {
  relevanceCache.clear();
  groundednessCache.clear();
}

export function judgeCacheStats(): { relevance: number; groundedness: number } {
  return { relevance: relevanceCache.size, groundedness: groundednessCache.size };
}

function relevanceKey(query: string, memories: readonly RetrievedMemory[]): CacheKey {
  const parts = memories.map((m) => `${m.id}:${contentHash(m.content)}`).join("|");
  return `${contentHash(query)}::${parts}`;
}

/** Coerce an arbitrary model output into a score in [0, 1]. */
function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 1);
}

function extractContent(res: Awaited<ReturnType<typeof invokeLLM>>): string {
  const content = res.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
  }
  return "";
}

/**
 * Score how relevant each retrieved memory is to the query, 0 to 1.
 * Returns one score per memory, in the order given. On any failure returns an
 * empty array so the caller records "not judged" rather than a fabricated 0.
 */
export async function judgeContextRelevance(
  query: string,
  memories: readonly RetrievedMemory[]
): Promise<number[]> {
  if (memories.length === 0) return [];

  const judged = memories.slice(0, MAX_MEMORIES_PER_JUDGEMENT);
  const key = relevanceKey(query, judged);
  const cached = relevanceCache.get(key);
  if (cached) return cached;

  const numbered = judged
    .map((m, i) => `[${i + 1}] ${truncate(m.content, PREVIEW_CHARS)}`)
    .join("\n\n");

  try {
    const res = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You grade retrieval quality for a personal-reflection app. Given a user's " +
            "query and a numbered list of memories retrieved for it, score each memory " +
            "0.0 to 1.0 on how well it answers the query. 1.0 means directly on topic; " +
            "0.0 means unrelated. Judge topical relevance only — do not reward or " +
            "penalise emotional tone. Return one score per memory, in order.",
        },
        {
          role: "user",
          content: `Query: ${query}\n\nRetrieved memories:\n${numbered}`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "relevance_scores",
          schema: {
            type: "object",
            properties: {
              scores: {
                type: "array",
                items: { type: "number", minimum: 0, maximum: 1 },
              },
            },
            required: ["scores"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const parsed = JSON.parse(extractContent(res)) as { scores?: unknown[] };
    if (!Array.isArray(parsed.scores)) return [];

    // Pad or trim so the caller always gets one score per judged memory.
    const scores = judged.map((_, i) => clampScore(parsed.scores?.[i]));
    relevanceCache.set(key, scores);
    return scores;
  } catch (err) {
    console.warn(
      `[eval] Relevance judge failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return [];
  }
}

/**
 * Generate a Mirror-style answer from only the retrieved memories, then score
 * how well it is grounded in them.
 *
 * Deliberately two separate model calls. Asking one call to both answer and
 * grade itself produces inflated scores — the model defends what it just wrote.
 */
export async function judgeGroundedness(
  query: string,
  memoryContext: string,
  memories: readonly RetrievedMemory[]
): Promise<{ groundedness: number; answer: string } | null> {
  if (memories.length === 0) return null;

  const key = `${contentHash(query)}::${contentHash(memoryContext)}`;
  const cachedScore = groundednessCache.get(key);

  let answer: string;
  try {
    const gen = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are the user's Higher Self. Answer using ONLY the memories below. " +
            "Do not invent details, dates, or events that are not present. If the " +
            "memories do not answer the question, say so plainly. Keep it to three " +
            "sentences." +
            memoryContext,
        },
        { role: "user", content: query },
      ],
    });
    answer = extractContent(gen).trim();
  } catch (err) {
    console.warn(
      `[eval] Mock answer generation failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }

  if (answer.length === 0) return null;
  if (cachedScore !== undefined) return { groundedness: cachedScore, answer };

  try {
    const res = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You check whether an answer is grounded in its source material. Score " +
            "0.0 to 1.0: 1.0 means every claim in the answer is supported by the " +
            "sources; 0.0 means the answer asserts things the sources do not contain. " +
            "An answer that correctly states the sources are insufficient is fully " +
            "grounded and scores 1.0. List any unsupported claims.",
        },
        {
          role: "user",
          content: `Sources:\n${memoryContext}\n\nAnswer to check:\n${answer}`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "groundedness",
          schema: {
            type: "object",
            properties: {
              score: { type: "number", minimum: 0, maximum: 1 },
              unsupported_claims: { type: "array", items: { type: "string" } },
            },
            required: ["score", "unsupported_claims"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const parsed = JSON.parse(extractContent(res)) as { score?: unknown };
    const score = clampScore(parsed.score);
    groundednessCache.set(key, score);
    return { groundedness: score, answer };
  } catch (err) {
    console.warn(
      `[eval] Groundedness judge failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}
