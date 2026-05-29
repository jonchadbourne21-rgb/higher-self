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

import { getDb } from "../db";
import { memoryEmbeddings, userPersonalityProfiles } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSION = 3072;

// ─── Embedding Generation ────────────────────────────────────────────────────

/**
 * Generate embedding vector using Gemini embedding-001
 * Returns a 3072-dimensional float array
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    // Return zero vector for empty text
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }

  // Truncate to ~8000 chars to stay within token limits
  const truncated = text.slice(0, 8000);

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
    throw new Error(`Embedding generation failed: ${response.status}`);
  }

  const data = await response.json();
  const values: number[] = data.embedding?.values;

  if (!values || values.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Unexpected embedding dimension: ${values?.length}`);
  }

  return values;
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
}): Promise<RetrievedMemory[]> {
  try {
    const { userId, query, topK = 5, sourceTypes } = params;

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    const db = await getDb();
    if (!db) return [];

    // Fetch all embeddings for this user (with optional source type filter)
    let conditions = [eq(memoryEmbeddings.userId, userId)];

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
export async function updatePersonalityProfile(userId: number): Promise<void> {
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
