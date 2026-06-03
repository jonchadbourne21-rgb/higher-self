/**
 * RAG Embeddings Utility for Mirrored
 * Handles embedding generation, Pinecone storage, and semantic search
 */

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { getDb } from "../db";
import { journalEntries } from "../../drizzle/schema";
import { inArray } from "drizzle-orm";

const INDEX_NAME =
  process.env.PINECONE_INDEX_NAME || "synapset-journal-embeddings";

let pinecone: Pinecone | null = null;
let openai: OpenAI | null = null;

function getPinecone(): Pinecone {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error("PINECONE_API_KEY is required for RAG vector storage");
  }
  pinecone ??= new Pinecone({ apiKey });
  return pinecone;
}

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for RAG embeddings");
  }
  openai ??= new OpenAI({ apiKey });
  return openai;
}

/**
 * Generate embedding vector for text using OpenAI text-embedding-3-small
 * @param text - The text to embed
 * @returns Promise<number[]> - 1536-dimensional embedding vector
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const response = await getOpenAI().embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("[RAG] Embedding generation failed:", error);
    throw new Error("Failed to generate embedding");
  }
}

/**
 * Upsert journal entry embedding to Pinecone
 * Stores vector with metadata for filtering and retrieval
 */
export async function upsertJournalEmbedding(
  journalId: number,
  userId: number,
  text: string,
  domain: string | null,
  createdAt: Date
): Promise<void> {
  try {
    // Generate embedding
    const embedding = await embedText(text);

    // Get index
    const index = getPinecone().Index(INDEX_NAME);

    // Prepare vector record with metadata
    const vectorId = `journal-${journalId}`;
    const metadata: Record<string, string> = {
      journalId: journalId.toString(),
      userId: userId.toString(),
      domain: domain || "general",
      createdAt: createdAt.toISOString(),
    };

    // Upsert to Pinecone
    await index.upsert({
      records: [
        {
          id: vectorId,
          values: embedding,
          metadata,
        },
      ],
    });

    console.log(`[RAG] Upserted embedding for journal entry ${journalId}`);
  } catch (error) {
    console.error("[RAG] Failed to upsert embedding:", error);
    throw error;
  }
}

/**
 * Search for similar journal entries using semantic similarity
 * Returns top-K entries with highest cosine similarity
 */
export async function searchSimilarEntries(
  userId: number,
  queryText: string,
  topK: number = 3
): Promise<Array<{ journalId: number; score: number; createdAt: Date }>> {
  try {
    // Generate embedding for query
    const queryEmbedding = await embedText(queryText);

    // Get index
    const index = getPinecone().Index(INDEX_NAME);

    // Search with metadata filter
    const results = await index.query({
      vector: queryEmbedding,
      topK: topK,
      filter: {
        userId: { $eq: userId.toString() },
      },
      includeMetadata: true,
    });

    // Extract journal IDs and scores
    const entries = results.matches
      .map(match => ({
        journalId: parseInt((match.metadata?.journalId as string) || "0"),
        score: match.score || 0,
        createdAt: new Date(
          (match.metadata?.createdAt as string) || new Date()
        ),
      }))
      .filter(
        (e: { journalId: number; score: number; createdAt: Date }) =>
          e.journalId > 0
      );

    console.log(
      `[RAG] Found ${entries.length} similar entries for user ${userId}`
    );
    return entries;
  } catch (error) {
    console.error("[RAG] Search failed:", error);
    return [];
  }
}

/**
 * Fetch full journal entry text from MySQL by IDs
 * Used after Pinecone search to get actual content for context injection
 */
export async function fetchJournalEntriesFromIds(
  journalIds: number[]
): Promise<
  Array<{ id: number; title: string | null; content: string; createdAt: Date }>
> {
  try {
    if (journalIds.length === 0) return [];

    const db = await getDb();
    if (!db) {
      console.error("[RAG] Database connection failed");
      return [];
    }

    const entries = await db
      .select()
      .from(journalEntries)
      .where(inArray(journalEntries.id, journalIds));

    return entries.map(e => ({
      id: e.id,
      title: e.title || "Untitled",
      content: e.content,
      createdAt: e.createdAt,
    }));
  } catch (error) {
    console.error("[RAG] Failed to fetch journal entries:", error);
    return [];
  }
}

/**
 * Complete RAG retrieval pipeline
 * Searches for similar entries and returns full text for context injection
 */
export async function retrieveContextForChat(
  userId: number,
  queryText: string,
  topK: number = 3
): Promise<
  Array<{
    id: number;
    title: string | null;
    content: string;
    createdAt: Date;
    score: number;
  }>
> {
  try {
    // Search Pinecone
    const searchResults = await searchSimilarEntries(userId, queryText, topK);

    if (searchResults.length === 0) {
      console.log(`[RAG] No similar entries found for user ${userId}`);
      return [];
    }

    // Extract IDs and fetch from MySQL
    const journalIds = searchResults.map(r => r.journalId);
    const entries = await fetchJournalEntriesFromIds(journalIds);

    // Merge with scores
    const contextEntries = entries.map(entry => {
      const score =
        searchResults.find(r => r.journalId === entry.id)?.score || 0;
      return { ...entry, score };
    });

    const avgScore =
      contextEntries.length > 0
        ? contextEntries.reduce((s, e) => s + e.score, 0) /
          contextEntries.length
        : 0;

    console.log(
      `[RAG] Retrieved ${contextEntries.length} context entries for chat (avg score: ${avgScore.toFixed(2)})`
    );

    return contextEntries;
  } catch (error) {
    console.error("[RAG] Context retrieval failed:", error);
    return [];
  }
}

/**
 * Delete embedding from Pinecone (e.g., when journal entry is deleted)
 */
export async function deleteEmbedding(journalId: number): Promise<void> {
  try {
    const index = getPinecone().Index(INDEX_NAME);
    await index.deleteMany([`journal-${journalId}`]);
    console.log(`[RAG] Deleted embedding for journal entry ${journalId}`);
  } catch (error) {
    console.error("[RAG] Failed to delete embedding:", error);
  }
}
