/**
 * Shared types and privacy helpers for the RAG eval harness.
 *
 * Privacy rule, applied everywhere in this folder: nothing that leaves the
 * process may contain a raw user identifier or more than PREVIEW_CHARS of user
 * content. userIds are hashed, content is truncated. This matches the rule the
 * rest of the codebase already follows for prompt context.
 */

import { createHash } from "crypto";
import type { SourceType } from "../memory";

/** Maximum characters of user content that may appear in any exported artifact. */
export const PREVIEW_CHARS = 400;

/**
 * Stable pseudonym for a user id.
 *
 * Salted with EVAL_HASH_SALT so the mapping cannot be reversed by anyone who
 * only has the dataset — the id space is small enough that an unsalted hash
 * would fall to a rainbow table in seconds. Without the env var a random salt is
 * generated per process, which keeps the output non-reversible but makes hashes
 * incomparable across runs; set the env var if you need that.
 */
const HASH_SALT =
  process.env.EVAL_HASH_SALT ?? createHash("sha256").update(String(Math.random())).digest("hex");

export function hashUserId(userId: number): string {
  return createHash("sha256").update(`${HASH_SALT}:${userId}`).digest("hex").slice(0, 16);
}

/** Truncate user content to the export limit. */
export function truncate(text: string, limit: number = PREVIEW_CHARS): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…`;
}

/** Content fingerprint, for cache keys and for referring to text without carrying it. */
export function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** One labelled query in the eval dataset. */
export interface EvalDatasetEntry {
  /** The question posed to the retriever. */
  query: string;
  /** Salted hash of the real userId. The raw id never appears in the dataset. */
  userIdHash: string;
  /**
   * Real userId, present only when the dataset is used in-process. Stripped
   * before the file is written and never sent to an external service.
   */
  userId?: number;
  /** Memory ids a good retriever should surface for this query. */
  expectedMemoryIds: number[];
  /** Life domain filter, when the query is domain-scoped. */
  domain: string | null;
  /** Source types represented in the ground truth. */
  sourceTypes: SourceType[];
  /** How the ground truth was established. */
  label: "heuristic" | "golden";
  /** Truncated preview of the seed memory, for eyeballing the dataset. */
  seedPreview?: string;
}

/** Metrics for a single query in a single configuration. */
export interface QueryResult {
  query: string;
  userIdHash: string;
  retrievedIds: number[];
  expectedIds: number[];
  precisionAtK: number;
  recallAtK: number;
  reciprocalRank: number;
  /** Mean LLM-judge relevance across retrieved memories; null when not judged. */
  relevance: number | null;
  /** Groundedness of the mock Mirror answer; null when not judged. */
  groundedness: number | null;
  latencyMs: number;
  error?: string;
}

/** A named retrieval configuration under test. */
export interface EvalConfig {
  name: string;
  topK: number;
  /**
   * Forward-compatible switches. The current retrieveMemories has neither a
   * reranker nor a cache, so these stay false and are recorded in the run tags
   * for when they exist.
   */
  reranker: boolean;
  cache: boolean;
}

/** Aggregate results for one configuration over the whole dataset. */
export interface ConfigResult {
  config: EvalConfig;
  queryCount: number;
  meanPrecision: number;
  meanRecall: number;
  meanMRR: number;
  meanRelevance: number | null;
  meanGroundedness: number | null;
  latencyP50: number;
  latencyP95: number;
  /** Fraction of queries served from cache. Always 0 until a cache exists. */
  cacheHitRate: number;
  errorCount: number;
  perQuery: QueryResult[];
}

/** A complete eval run across every configuration. */
export interface EvalRun {
  runName: string;
  runAt: Date;
  datasetPath: string;
  datasetSize: number;
  judgedQueryCount: number;
  results: ConfigResult[];
}
