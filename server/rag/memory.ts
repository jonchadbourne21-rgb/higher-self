/**
 * RAG Memory Module for MIRRORED
 * 
 * Uses Gemini embedding-001 for vector generation and MySQL for storage.
 * No external vector DB dependency (Pinecone removed).
 * 
 * Architecture:
 * 1. Text → Gemini embedding-001 → 3072-dim float vector
 * 2. Vector stored in MySQL `memory_embeddings` table as JSON
 * 3. Retrieval: compute cosine similarity in-app, return top-K matches
 * 4. Personality profile: accumulated from interactions via LLM analysis
 */

import { createHash } from "crypto";
import { getDb } from "../db";
import { memoryEmbeddings, userPersonalityProfiles } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSION = 3072;
const RAG_ENABLED = !!GEMINI_API_KEY;

// ─── Embedding Generation ────────────────────────────────────────────────────

// ─── Embedding cache ─────────────────────────────────────────────────────────

/**
 * Embeddings are deterministic for a given input, so identical text never needs
 * to be embedded twice. This matters most for retrieval: every chat message,
 * every scheduled job and every letter embeds a query before it can search, and
 * those queries repeat constantly — the same journal excerpt, the same weekly
 * transcript, the same topic asked twice.
 *
 * Process-local and bounded. On a multi-instance deployment each instance keeps
 * its own cache, which is fine: the cost of a miss is the call we would have
 * made anyway. Entries expire so a corpus that shifts underneath a cached query
 * cannot serve a stale vector indefinitely.
 */
const EMBEDDING_CACHE_MAX_ENTRIES = 500;
const EMBEDDING_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedEmbedding {
  vector: number[];
  storedAt: number;
}

const embeddingCache = new Map<string, CachedEmbedding>();
let embeddingCacheHits = 0;
let embeddingCacheMisses = 0;

function embeddingCacheKey(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function readEmbeddingCache(text: string): number[] | null {
  const entry = embeddingCache.get(embeddingCacheKey(text));
  if (!entry) {
    embeddingCacheMisses++;
    return null;
  }
  if (Date.now() - entry.storedAt > EMBEDDING_CACHE_TTL_MS) {
    embeddingCache.delete(embeddingCacheKey(text));
    embeddingCacheMisses++;
    return null;
  }
  embeddingCacheHits++;
  return entry.vector;
}

function writeEmbeddingCache(text: string, vector: number[]): void {
  // Evict oldest first. Map preserves insertion order, so the first key is the
  // least recently written.
  if (embeddingCache.size >= EMBEDDING_CACHE_MAX_ENTRIES) {
    const oldest = embeddingCache.keys().next();
    if (!oldest.done) embeddingCache.delete(oldest.value);
  }
  embeddingCache.set(embeddingCacheKey(text), { vector, storedAt: Date.now() });
}

/** Cache counters, for the eval harness and for debugging. */
export function embeddingCacheStats(): {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
} {
  const total = embeddingCacheHits + embeddingCacheMisses;
  return {
    size: embeddingCache.size,
    hits: embeddingCacheHits,
    misses: embeddingCacheMisses,
    hitRate: total === 0 ? 0 : embeddingCacheHits / total,
  };
}

/** Clear the cache and reset counters. Used by tests. */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
  embeddingCacheHits = 0;
  embeddingCacheMisses = 0;
}

/**
 * Generate embedding vector using Gemini embedding-001
 * Returns a 3072-dimensional float array
 * If GEMINI_API_KEY is not configured, returns zero vector (RAG disabled gracefully)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    // Return zero vector for empty text
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }

  // If RAG is not enabled, return zero vector (graceful degradation)
  if (!RAG_ENABLED) {
    console.warn("[RAG] GEMINI_API_KEY not configured, returning zero vector");
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }

  // Truncate to ~8000 chars to stay within token limits
  const truncated = text.slice(0, 8000);

  const cached = readEmbeddingCache(truncated);
  if (cached) return cached;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text: truncated }] },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[RAG] Gemini embedding failed (${response.status}):`, errText);
      // Return zero vector instead of throwing (graceful degradation)
      return new Array(EMBEDDING_DIMENSION).fill(0);
    }

    const data = await response.json();
    const values: number[] = data.embedding?.values;

    if (!values || values.length !== EMBEDDING_DIMENSION) {
      console.warn(`[RAG] Unexpected embedding dimension: ${values?.length}, returning zero vector`);
      return new Array(EMBEDDING_DIMENSION).fill(0);
    }

    // Only successful embeddings are cached. Caching a zero vector would pin a
    // transient API failure in memory and silently break retrieval for an hour.
    writeEmbeddingCache(truncated, values);
    return values;
  } catch (err) {
    console.error("[RAG] Embedding generation error:", err);
    // Return zero vector on any error (graceful degradation)
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }
}

// ─── Cosine Similarity ───────────────────────────────────────────────────────

/**
 * Compute cosine similarity between two vectors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// ─── Memory Storage ──────────────────────────────────────────────────────────

export type SourceType = "journal" | "chat" | "voice" | "checkin" | "program_response";

/**
 * Store a memory embedding in MySQL
 * Called after journal entries, chat messages, voice transcripts are created
 */
export async function storeMemory(params: {
  userId: number;
  sourceType: SourceType;
  sourceId?: number;
  content: string;
  metadata?: Record<string, string>;
}): Promise<number | null> {
  try {
    const { userId, sourceType, sourceId, content, metadata } = params;

    // Skip very short content (less than 20 chars)
    if (content.trim().length < 20) {
      console.log(`[RAG] Skipping short content (${content.length} chars)`);
      return null;
    }

    // Generate embedding
    const embedding = await generateEmbedding(content);

    const db = await getDb();
    if (!db) {
      console.error("[RAG] Database unavailable");
      return null;
    }

    // Insert into memory_embeddings
    const [result] = await db.insert(memoryEmbeddings).values({
      userId,
      sourceType,
      sourceId: sourceId ?? null,
      content,
      embedding,
      metadata: metadata ?? null,
    }).$returningId();

    console.log(`[RAG] Stored memory #${result.id} (${sourceType}) for user ${userId}`);
    return result.id;
  } catch (error) {
    console.error("[RAG] Failed to store memory:", error);
    return null;
  }
}

// ─── Memory Retrieval ────────────────────────────────────────────────────────

export interface RetrievedMemory {
  id: number;
  sourceType: SourceType;
  sourceId: number | null;
  content: string;
  score: number;
  createdAt: Date;
  metadata: Record<string, string> | null;
}

/**
 * Retrieve the most relevant memories for a given query
 * Uses cosine similarity to rank all user memories and returns top-K
 */
export async function retrieveMemories(params: {
  userId: number;
  query: string;
  topK?: number;
  sourceTypes?: SourceType[];
  dateFrom?: Date;
  dateTo?: Date;
  domain?: string;
}): Promise<RetrievedMemory[]> {
  try {
    const { userId, query, topK = 5, sourceTypes, dateFrom, dateTo, domain } = params;

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    const db = await getDb();
    if (!db) return [];

    // Fetch all embeddings for this user (with optional source type filter)
    let conditions = [eq(memoryEmbeddings.userId, userId)];

    // Hard filter: date range at SQL level
    if (dateFrom) {
      conditions.push(sql`${memoryEmbeddings.createdAt} >= ${dateFrom}`);
    }
    if (dateTo) {
      conditions.push(sql`${memoryEmbeddings.createdAt} <= ${dateTo}`);
    }

    const allMemories = await db
      .select()
      .from(memoryEmbeddings)
      .where(and(...conditions))
      .orderBy(desc(memoryEmbeddings.createdAt))
      .limit(200); // Cap at 200 most recent memories for performance

    if (allMemories.length === 0) {
      console.log(`[RAG] No memories found for user ${userId}`);
      return [];
    }

    // Filter by source type if specified
    let filtered = allMemories;
    if (sourceTypes && sourceTypes.length > 0) {
      filtered = allMemories.filter((m) => sourceTypes.includes(m.sourceType as SourceType));
    }

    // Hard filter: life domain (stored in metadata.domain)
    if (domain) {
      filtered = filtered.filter((m) => {
        const meta = m.metadata as Record<string, string> | null;
        return meta?.domain === domain;
      });
    }

    // Compute cosine similarity for each memory
    const scored = filtered.map((memory) => ({
      id: memory.id,
      sourceType: memory.sourceType as SourceType,
      sourceId: memory.sourceId,
      content: memory.content,
      score: cosineSimilarity(queryEmbedding, memory.embedding as number[]),
      createdAt: memory.createdAt,
      metadata: memory.metadata as Record<string, string> | null,
    }));

    // Sort by score descending and take top-K
    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, topK);

    // Filter out low-relevance results (below 0.3 similarity)
    const relevant = topResults.filter((r) => r.score > 0.3);

    console.log(
      `[RAG] Retrieved ${relevant.length}/${allMemories.length} memories for user ${userId} (top score: ${relevant[0]?.score?.toFixed(3) || "N/A"})`
    );

    return relevant;
  } catch (error) {
    console.error("[RAG] Memory retrieval failed:", error);
    return [];
  }
}

/**
 * Build a formatted context string from retrieved memories for injection into system prompt
 */
export function formatMemoriesForPrompt(memories: RetrievedMemory[]): string {
  if (memories.length === 0) return "";

  const sections = memories.map((m) => {
    const dateStr = m.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const sourceLabel = {
      journal: "Journal Entry",
      chat: "Past Conversation",
      voice: "Voice Session",
      checkin: "Check-in",
      program_response: "Program Reflection",
    }[m.sourceType];

    // Truncate content to 400 chars for prompt efficiency
    const truncContent = m.content.length > 400
      ? m.content.slice(0, 400) + "..."
      : m.content;

    return `[${sourceLabel} — ${dateStr}]\n${truncContent}`;
  });

  return `\n\nRELEVANT MEMORIES FROM YOUR PAST:\n${sections.join("\n\n---\n\n")}`;
}

// ─── Personality Profile ─────────────────────────────────────────────────────

export interface PersonalityProfile {
  traits: string[];
  communicationStyle: string | null;
  emotionalPatterns: string | null;
  recurringThemes: string[];
  growthEdges: string[];
  challengeStyle: string | null;
  interactionCount: number;
}

/**
 * Get the user's personality profile
 */
export async function getPersonalityProfile(userId: number): Promise<PersonalityProfile | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const profiles = await db
      .select()
      .from(userPersonalityProfiles)
      .where(eq(userPersonalityProfiles.userId, userId))
      .limit(1);

    if (profiles.length === 0) return null;

    const p = profiles[0];
    return {
      traits: (p.traits as string[]) || [],
      communicationStyle: p.communicationStyle,
      emotionalPatterns: p.emotionalPatterns,
      recurringThemes: (p.recurringThemes as string[]) || [],
      growthEdges: (p.growthEdges as string[]) || [],
      challengeStyle: p.challengeStyle,
      interactionCount: p.interactionCount || 0,
    };
  } catch (error) {
    console.error("[RAG] Failed to get personality profile:", error);
    return null;
  }
}

/**
 * Format personality profile for injection into system prompt
 */
export function formatPersonalityForPrompt(profile: PersonalityProfile | null): string {
  if (!profile || profile.interactionCount < 3) return "";

  const parts: string[] = [];

  if (profile.traits.length > 0) {
    parts.push(`Personality traits: ${profile.traits.join(", ")}`);
  }
  if (profile.communicationStyle) {
    parts.push(`Communication style: ${profile.communicationStyle}`);
  }
  if (profile.emotionalPatterns) {
    parts.push(`Emotional patterns: ${profile.emotionalPatterns}`);
  }
  if (profile.recurringThemes.length > 0) {
    parts.push(`Recurring themes: ${profile.recurringThemes.join(", ")}`);
  }
  if (profile.growthEdges.length > 0) {
    parts.push(`Growth edges: ${profile.growthEdges.join(", ")}`);
  }
  if (profile.challengeStyle) {
    parts.push(`How to challenge them: ${profile.challengeStyle}`);
  }

  if (parts.length === 0) return "";

  return `\n\nWHAT YOU'VE LEARNED ABOUT THEM (from ${profile.interactionCount} interactions):\n${parts.join("\n")}`;
}

/**
 * Update personality profile based on recent interactions
 * Called periodically (every 5 interactions or on session end)
 */
/**
 * Minimum gap between personality analyses for one user.
 *
 * The profile is a rollup of the last 20 memories. Two adjacent sessions barely
 * move it, so recomputing after every single one burns a full LLM call to
 * produce nearly the same JSON. This is the single largest source of avoidable
 * model calls in the app.
 */
export const PERSONALITY_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Or recompute early once this many new memories have accumulated.
 *
 * Note the ceiling: `interactionCount` is written as the size of the last-20
 * window, so for any user past 20 memories both sides of the comparison sit at
 * 20 and this check stops firing. That is intentional rather than broken — the
 * count gate is what catches a brand-new user going from 3 memories to 8 in one
 * evening, and the time gate is what governs everyone thereafter.
 */
export const PERSONALITY_MIN_NEW_MEMORIES = 5;

/**
 * Decide whether a personality analysis is worth running.
 * Exported for testing — the throttle is the whole point, so it is tested
 * directly rather than inferred from call counts.
 */
export function shouldReanalysePersonality(params: {
  lastAnalyzedAt: Date | null;
  analyzedInteractionCount: number;
  currentMemoryCount: number;
  now?: Date;
}): boolean {
  const { lastAnalyzedAt, analyzedInteractionCount, currentMemoryCount } = params;
  const now = params.now ?? new Date();

  // Never analysed — always run.
  if (!lastAnalyzedAt) return true;

  const newMemories = currentMemoryCount - analyzedInteractionCount;
  if (newMemories >= PERSONALITY_MIN_NEW_MEMORIES) return true;

  return now.getTime() - lastAnalyzedAt.getTime() >= PERSONALITY_MIN_INTERVAL_MS;
}

export async function updatePersonalityProfile(
  userId: number,
  options: { force?: boolean } = {}
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // Get recent memories to analyze (last 20)
    const recentMemories = await db
      .select()
      .from(memoryEmbeddings)
      .where(eq(memoryEmbeddings.userId, userId))
      .orderBy(desc(memoryEmbeddings.createdAt))
      .limit(20);

    if (recentMemories.length < 3) {
      console.log(`[RAG] Not enough memories (${recentMemories.length}) to build personality profile`);
      return;
    }

    // Throttle before spending an LLM call.
    if (!options.force) {
      const existing = await db
        .select()
        .from(userPersonalityProfiles)
        .where(eq(userPersonalityProfiles.userId, userId))
        .limit(1);

      const profile = existing[0];
      if (
        profile &&
        !shouldReanalysePersonality({
          lastAnalyzedAt: profile.lastAnalyzedAt ?? null,
          analyzedInteractionCount: profile.interactionCount ?? 0,
          currentMemoryCount: recentMemories.length,
        })
      ) {
        console.log(`[RAG] Personality profile for user ${userId} is fresh — skipping analysis`);
        return;
      }
    }

    // Build a summary of recent interactions for analysis
    const interactionSummary = recentMemories
      .map((m) => `[${m.sourceType}] ${m.content.slice(0, 300)}`)
      .join("\n\n");

    // Use LLM to extract personality insights
    const analysisRes = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a personality analyst for a personal growth AI. Analyze the user's recent interactions and extract personality insights. Be specific and grounded in what they actually said/wrote — no generic observations.

Return a JSON object with:
- traits: array of 3-6 specific personality traits (e.g., "analytical thinker", "emotionally guarded", "perfectionist")
- communicationStyle: one sentence describing how they communicate (e.g., "Uses humor to deflect, prefers metaphors over direct statements")
- emotionalPatterns: one sentence about their emotional tendencies (e.g., "Intellectualizes feelings, avoids naming vulnerability directly")
- recurringThemes: array of 2-4 themes that keep appearing (e.g., "control", "self-worth", "fear of abandonment")
- growthEdges: array of 2-3 areas where they're actively growing (e.g., "learning to sit with discomfort", "practicing self-compassion")
- challengeStyle: one sentence about how they respond to being challenged (e.g., "Receptive to direct questions but shuts down with perceived criticism")`,
        },
        {
          role: "user",
          content: `Analyze these recent interactions from the user:\n\n${interactionSummary}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "personality_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              traits: { type: "array", items: { type: "string" } },
              communicationStyle: { type: "string" },
              emotionalPatterns: { type: "string" },
              recurringThemes: { type: "array", items: { type: "string" } },
              growthEdges: { type: "array", items: { type: "string" } },
              challengeStyle: { type: "string" },
            },
            required: ["traits", "communicationStyle", "emotionalPatterns", "recurringThemes", "growthEdges", "challengeStyle"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = analysisRes.choices[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      console.error("[RAG] Empty personality analysis response");
      return;
    }

    const analysis = JSON.parse(rawContent);

    // Upsert personality profile
    const existing = await db
      .select()
      .from(userPersonalityProfiles)
      .where(eq(userPersonalityProfiles.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userPersonalityProfiles)
        .set({
          traits: analysis.traits,
          communicationStyle: analysis.communicationStyle,
          emotionalPatterns: analysis.emotionalPatterns,
          recurringThemes: analysis.recurringThemes,
          growthEdges: analysis.growthEdges,
          challengeStyle: analysis.challengeStyle,
          lastAnalyzedAt: new Date(),
          interactionCount: recentMemories.length,
        })
        .where(eq(userPersonalityProfiles.userId, userId));
    } else {
      await db.insert(userPersonalityProfiles).values({
        userId,
        traits: analysis.traits,
        communicationStyle: analysis.communicationStyle,
        emotionalPatterns: analysis.emotionalPatterns,
        recurringThemes: analysis.recurringThemes,
        growthEdges: analysis.growthEdges,
        challengeStyle: analysis.challengeStyle,
        lastAnalyzedAt: new Date(),
        interactionCount: recentMemories.length,
      });
    }

    console.log(`[RAG] Updated personality profile for user ${userId} (${recentMemories.length} interactions analyzed)`);
  } catch (error) {
    console.error("[RAG] Personality profile update failed:", error);
  }
}

/**
 * Delete all memories for a user (for account deletion)
 */
export async function deleteAllUserMemories(userId: number): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.delete(memoryEmbeddings).where(eq(memoryEmbeddings.userId, userId));
    await db.delete(userPersonalityProfiles).where(eq(userPersonalityProfiles.userId, userId));
    console.log(`[RAG] Deleted all memories for user ${userId}`);
  } catch (error) {
    console.error("[RAG] Failed to delete user memories:", error);
  }
}

// ─── Semantic Similarity Clustering ─────────────────────────────────────────

export interface MemoryCluster {
  theme: string;
  entries: { id: number; content: string; sourceType: SourceType; createdAt: Date }[];
  avgSimilarity: number;
}

/**
 * Cluster user memories by semantic similarity to detect recurring patterns.
 * Uses a simple greedy centroid-based approach:
 * 1. Pick the first unassigned memory as a centroid
 * 2. Assign all memories with similarity > threshold to that cluster
 * 3. Repeat until all memories are assigned or max clusters reached
 * 4. Use LLM to label each cluster with a human-readable theme
 */
export async function clusterMemories(params: {
  userId: number;
  maxClusters?: number;
  similarityThreshold?: number;
  minClusterSize?: number;
  dateFrom?: Date;
}): Promise<MemoryCluster[]> {
  const {
    userId,
    maxClusters = 6,
    similarityThreshold = 0.55,
    minClusterSize = 2,
    dateFrom,
  } = params;

  try {
    const db = await getDb();
    if (!db) return [];

    // Fetch recent memories with embeddings
    let conditions = [eq(memoryEmbeddings.userId, userId)];
    if (dateFrom) {
      conditions.push(sql`${memoryEmbeddings.createdAt} >= ${dateFrom}`);
    }

    const allMemories = await db
      .select()
      .from(memoryEmbeddings)
      .where(and(...conditions))
      .orderBy(desc(memoryEmbeddings.createdAt))
      .limit(100);

    if (allMemories.length < minClusterSize) {
      return [];
    }

    // Greedy centroid clustering
    const assigned = new Set<number>();
    const clusters: {
      centroidIdx: number;
      memberIndices: number[];
    }[] = [];

    for (let i = 0; i < allMemories.length && clusters.length < maxClusters; i++) {
      if (assigned.has(i)) continue;

      const centroidEmbedding = allMemories[i].embedding as number[];
      const members = [i];
      assigned.add(i);

      for (let j = i + 1; j < allMemories.length; j++) {
        if (assigned.has(j)) continue;
        const sim = cosineSimilarity(centroidEmbedding, allMemories[j].embedding as number[]);
        if (sim >= similarityThreshold) {
          members.push(j);
          assigned.add(j);
        }
      }

      if (members.length >= minClusterSize) {
        clusters.push({ centroidIdx: i, memberIndices: members });
      }
    }

    if (clusters.length === 0) return [];

    // Label clusters with LLM
    const clusterSummaries = clusters.map((c) => {
      const snippets = c.memberIndices
        .slice(0, 4)
        .map((idx) => allMemories[idx].content.slice(0, 200))
        .join("\n---\n");
      return snippets;
    });

    const labelPrompt = `Label each of the following clusters of personal journal/chat entries with a short theme (2-5 words). Return a JSON array of strings, one label per cluster.

${clusterSummaries.map((s, i) => `Cluster ${i + 1}:\n${s}`).join("\n\n")}`;

    let labels: string[] = [];
    try {
      const labelRes = await invokeLLM({
        messages: [
          { role: "system", content: "You are a pattern analyst. Return only valid JSON." },
          { role: "user", content: labelPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "cluster_labels",
            strict: true,
            schema: {
              type: "object",
              properties: {
                labels: { type: "array", items: { type: "string" } },
              },
              required: ["labels"],
              additionalProperties: false,
            },
          },
        },
      });
      const parsed = JSON.parse(labelRes.choices[0]?.message?.content as string || "{}");
      labels = Array.isArray(parsed.labels) ? parsed.labels : [];
    } catch {
      // Fallback: use generic labels
      labels = clusters.map((_, i) => `Pattern ${i + 1}`);
    }

    // Build result
    const result: MemoryCluster[] = clusters.map((c, i) => {
      // Compute average pairwise similarity within cluster
      let totalSim = 0;
      let pairCount = 0;
      const centroidEmb = allMemories[c.centroidIdx].embedding as number[];
      for (const idx of c.memberIndices) {
        if (idx === c.centroidIdx) continue;
        totalSim += cosineSimilarity(centroidEmb, allMemories[idx].embedding as number[]);
        pairCount++;
      }

      return {
        theme: labels[i] || `Pattern ${i + 1}`,
        entries: c.memberIndices.map((idx) => ({
          id: allMemories[idx].id,
          content: allMemories[idx].content,
          sourceType: allMemories[idx].sourceType as SourceType,
          createdAt: allMemories[idx].createdAt,
        })),
        avgSimilarity: pairCount > 0 ? totalSim / pairCount : 1,
      };
    });

    console.log(`[RAG] Clustered ${allMemories.length} memories into ${result.length} themes for user ${userId}`);
    return result;
  } catch (error) {
    console.error("[RAG] Clustering failed:", error);
    return [];
  }
}

// ─── Shared learning context ─────────────────────────────────────────────────

/**
 * Retrieve the learning context for a user: relevant past memories plus their
 * accumulated personality profile, formatted for injection into a system prompt.
 *
 * Every surface that speaks as the Mirror should call this, so that what the
 * app has learned about someone shows up consistently — in chat, in voice, in a
 * weekly insight, in a program reflection, in an outbound call. Before this
 * existed, coverage was uneven: chat and voice had both, the weekly insight had
 * memories but no personality, and the digest, outbound call and letters had
 * neither.
 *
 * Never throws. A retrieval or embedding failure degrades to an empty string,
 * because a scheduled job that fails to write a weekly digest is a worse outcome
 * than one written without memory context.
 */
export async function buildLearningContext(params: {
  userId: number;
  /** Text to find relevant memories for — the user's message, or a topic summary. */
  query: string;
  topK?: number;
  sourceTypes?: SourceType[];
  /** Skip the personality profile when the caller only wants memories. */
  includePersonality?: boolean;
}): Promise<string> {
  const { userId, query, topK = 5, sourceTypes, includePersonality = true } = params;

  try {
    const [memories, personality] = await Promise.all([
      retrieveMemories({ userId, query, topK, sourceTypes }),
      includePersonality ? getPersonalityProfile(userId) : Promise.resolve(null),
    ]);

    return [formatMemoriesForPrompt(memories), formatPersonalityForPrompt(personality)]
      .filter((section) => section && section.trim().length > 0)
      .join("\n");
  } catch (error) {
    console.error("[RAG] buildLearningContext failed:", error);
    return "";
  }
}
