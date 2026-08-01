/**
 * Build an evaluation dataset from real memory embeddings.
 *
 * Strategy: sample seed memories, turn each into a natural query, then derive
 * ground truth by finding every memory whose embedding is within
 * GROUND_TRUTH_THRESHOLD cosine of the seed. That threshold is the same 0.75
 * used elsewhere as a "these are about the same thing" bar.
 *
 * This is a heuristic, and it has a known bias worth stating: ground truth is
 * built with the same embedding model the retriever uses, so it measures
 * ranking and filtering rather than embedding quality. A retriever that ranks
 * perfectly under a bad embedding still scores well. That is why the golden set
 * exists — those 20 entries are meant to be hand-corrected, and only they can
 * catch an embedding-level failure.
 *
 * Privacy: no raw userId and no untruncated content is ever written to disk.
 *
 * Usage:
 *   tsx server/rag/evals/build_dataset.ts [--limit 80] [--out path.jsonl]
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { desc, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { memoryEmbeddings } from "../../../drizzle/schema";
import { cosineSimilarity, type SourceType } from "../memory";
import {
  hashUserId,
  truncate,
  type EvalDatasetEntry,
} from "./types";

/** Cosine at or above which two memories are treated as covering the same topic. */
export const GROUND_TRUTH_THRESHOLD = 0.75;

/** Skip users with fewer than this many memories — too sparse to label usefully. */
const MIN_MEMORIES_PER_USER = 8;

/** Ceiling on rows pulled into memory. Embeddings are 3072 floats each. */
const MAX_ROWS = 5000;

export const DEFAULT_DATASET_PATH = resolve(
  process.cwd(),
  "server/rag/evals/eval_dataset.jsonl"
);

/**
 * Query templates. Each takes a topic hint drawn from the seed memory's
 * metadata so the generated question reads like something a user would type.
 */
const QUERY_TEMPLATES: Record<SourceType, (topic: string) => string> = {
  journal: (t) => `What did I write about ${t}?`,
  chat: (t) => `What have we talked about regarding ${t}?`,
  voice: (t) => `What did I say about ${t}?`,
  checkin: (t) => `How have I been feeling about ${t}?`,
  program_response: (t) => `What did I reflect on about ${t}?`,
};

/**
 * Derive a short topic phrase for a memory.
 *
 * Prefers explicit metadata (domain, theme, emotion) because those are already
 * short, non-identifying labels. Falls back to the longest plausible noun-ish
 * phrase from the opening of the content, which is crude but keeps the query
 * grounded in what the memory is actually about.
 */
export function deriveTopic(
  content: string,
  metadata: Record<string, string> | null
): string {
  const fromMeta = metadata?.theme ?? metadata?.domain ?? metadata?.emotion;
  if (fromMeta && fromMeta.trim().length > 0) return fromMeta.trim().toLowerCase();

  // Constructed rather than a literal: this project compiles to ES5, where the
  // /u flag is rejected on a regex literal. Node supports it fine at runtime,
  // and it matters here — a plain [^a-zA-Z0-9] class would mangle accented and
  // non-Latin text into fragments.
  const punctuation = new RegExp("[^\\p{L}\\p{N}\\s]", "gu");

  const words = content
    .slice(0, 200)
    .replace(punctuation, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 3);

  return words.length > 0 ? words.join(" ").toLowerCase() : "this";
}

interface MemoryRow {
  id: number;
  userId: number;
  sourceType: SourceType;
  content: string;
  embedding: number[];
  metadata: Record<string, string> | null;
}

/**
 * Group rows by user, keeping only users with enough memories to label.
 * Exported for testing.
 */
export function groupByUser(rows: readonly MemoryRow[]): Map<number, MemoryRow[]> {
  const byUser = new Map<number, MemoryRow[]>();
  for (const row of rows) {
    const list = byUser.get(row.userId);
    if (list) list.push(row);
    else byUser.set(row.userId, [row]);
  }
  const sparse: number[] = [];
  byUser.forEach((list, userId) => {
    if (list.length < MIN_MEMORIES_PER_USER) sparse.push(userId);
  });
  sparse.forEach((userId) => byUser.delete(userId));
  return byUser;
}

/**
 * Build one dataset entry from a seed memory and its user's other memories.
 * Returns null when the seed has no neighbours above threshold — a query whose
 * only correct answer is the seed itself measures very little.
 *
 * Exported for testing.
 */
export function buildEntry(
  seed: MemoryRow,
  peers: readonly MemoryRow[]
): EvalDatasetEntry | null {
  const expected: number[] = [];
  const sourceTypes: SourceType[] = [];
  const addSourceType = (t: SourceType) => {
    if (sourceTypes.indexOf(t) === -1) sourceTypes.push(t);
  };

  peers.forEach((peer) => {
    if (peer.id === seed.id) return;
    const score = cosineSimilarity(seed.embedding, peer.embedding);
    if (score >= GROUND_TRUTH_THRESHOLD) {
      expected.push(peer.id);
      addSourceType(peer.sourceType);
    }
  });

  if (expected.length === 0) return null;

  // The seed is trivially relevant to a query derived from it.
  expected.push(seed.id);
  addSourceType(seed.sourceType);

  const topic = deriveTopic(seed.content, seed.metadata);
  const template = QUERY_TEMPLATES[seed.sourceType] ?? QUERY_TEMPLATES.journal;

  return {
    query: template(topic),
    userIdHash: hashUserId(seed.userId),
    userId: seed.userId,
    expectedMemoryIds: expected.sort((a, b) => a - b),
    domain: seed.metadata?.domain ?? null,
    sourceTypes,
    label: "heuristic",
    seedPreview: truncate(seed.content),
  };
}

/** Serialize entries to JSONL, stripping the raw userId. */
export function serializeDataset(entries: readonly EvalDatasetEntry[]): string {
  return entries
    .map(({ userId: _omit, ...safe }) => JSON.stringify(safe))
    .join("\n");
}

export interface BuildOptions {
  limit?: number;
  outPath?: string;
  /** Number of leading entries to mark as the hand-labelled golden set. */
  goldenSize?: number;
}

/**
 * Build the dataset and write it to disk.
 * Returns the entries, with raw userIds intact for in-process use.
 */
export async function buildDataset(options: BuildOptions = {}): Promise<EvalDatasetEntry[]> {
  const { limit = 80, outPath = DEFAULT_DATASET_PATH, goldenSize = 20 } = options;

  const db = await getDb();
  if (!db) {
    throw new Error(
      "No database connection. Set DATABASE_URL before building an eval dataset."
    );
  }

  const rows = (await db
    .select()
    .from(memoryEmbeddings)
    .orderBy(desc(memoryEmbeddings.createdAt))
    .limit(MAX_ROWS)) as unknown as MemoryRow[];

  if (rows.length === 0) {
    throw new Error("memory_embeddings is empty — nothing to build a dataset from.");
  }

  const byUser = groupByUser(rows);
  if (byUser.size === 0) {
    throw new Error(
      `No user has at least ${MIN_MEMORIES_PER_USER} memories; cannot label ground truth.`
    );
  }

  // Round-robin across users so one heavy user cannot dominate the dataset.
  const entries: EvalDatasetEntry[] = [];
  const userLists: MemoryRow[][] = [];
  byUser.forEach((list) => userLists.push(list));
  let cursor = 0;

  while (entries.length < limit) {
    let progressed = false;
    for (let u = 0; u < userLists.length; u++) {
      if (entries.length >= limit) break;
      const list = userLists[u];
      const seed = list[cursor];
      if (!seed) continue;
      progressed = true;
      const entry = buildEntry(seed, list);
      if (entry) entries.push(entry);
    }
    if (!progressed) break;
    cursor++;
  }

  if (entries.length === 0) {
    throw new Error(
      `No seed memory had a neighbour above cosine ${GROUND_TRUTH_THRESHOLD}. ` +
        "Either the corpus is too diverse or the threshold is too high."
    );
  }

  // Mark the leading slice as the golden set. These are the entries a human
  // should review and correct by hand; the label is what makes them auditable.
  for (let i = 0; i < Math.min(goldenSize, entries.length); i++) {
    entries[i].label = "golden";
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${serializeDataset(entries)}\n`, "utf8");

  const golden = entries.filter((e) => e.label === "golden").length;
  console.log(
    `[eval] Wrote ${entries.length} entries (${golden} golden) from ${byUser.size} users to ${outPath}`
  );
  console.log(
    "[eval] Golden entries are heuristic until reviewed — correct expectedMemoryIds by hand."
  );

  return entries;
}

/** Read a dataset back from disk. Entries have no raw userId. */
export function parseDataset(contents: string): EvalDatasetEntry[] {
  return contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as EvalDatasetEntry);
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs(argv: readonly string[]): BuildOptions {
  const options: BuildOptions = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") options.limit = Number(argv[++i]);
    else if (argv[i] === "--out") options.outPath = resolve(argv[++i]);
    else if (argv[i] === "--golden") options.goldenSize = Number(argv[++i]);
  }
  return options;
}

const isDirectRun =
  process.argv[1] !== undefined && process.argv[1].includes("build_dataset");

if (isDirectRun) {
  buildDataset(parseArgs(process.argv.slice(2)))
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`[eval] Dataset build failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    });
}
