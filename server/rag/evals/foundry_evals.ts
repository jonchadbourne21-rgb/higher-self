/**
 * RAG evaluation runner.
 *
 * Drives the real `retrieveMemories` over a labelled dataset and reports
 * precision@K, recall@K, MRR, LLM-judged relevance, groundedness, and latency.
 *
 * ── On the Foundry integration ───────────────────────────────────────────────
 * The Azure AI Foundry evaluation SDK is not a dependency of this project and
 * AZURE_AI_PROJECT_ENDPOINT is not set in any environment I could test against.
 * Rather than write an unverifiable SDK call, this module computes every metric
 * locally and exposes a single narrow seam — `publishToFoundry` — that no-ops
 * unless both FOUNDRY_EVAL_ENABLED and AZURE_AI_PROJECT_ENDPOINT are present.
 * The payload it builds is complete and already privacy-filtered; wiring it to
 * the real SDK is one function body, marked below.
 *
 * ── On reranker/cache A/B ────────────────────────────────────────────────────
 * `retrieveMemories` currently has neither a reranker nor a cache. The runner is
 * built around a list of named `EvalConfig`s so those become extra entries in
 * EVAL_CONFIGS the day they exist, with no change to this file's structure and
 * no change to any existing function signature. Until then `cacheHitRate` is
 * reported as 0 and labelled as such rather than omitted, so the shape of the
 * output does not shift later.
 */

import { readFileSync } from "fs";
import { retrieveMemories, formatMemoriesForPrompt } from "../memory";
import {
  precisionAtK,
  recallAtK,
  reciprocalRank,
  mean,
  percentile,
} from "./metrics";
import { judgeContextRelevance, judgeGroundedness, JUDGE_QUERY_LIMIT } from "./judge";
import { parseDataset, DEFAULT_DATASET_PATH } from "./build_dataset";
import { setEvalRunId, recordEvalScores } from "../foundryTracing";
import type {
  ConfigResult,
  EvalConfig,
  EvalDatasetEntry,
  EvalRun,
  QueryResult,
} from "./types";

/** Default K for the headline precision/recall figures. */
export const DEFAULT_TOP_K = 5;

/**
 * Configurations compared in each run.
 *
 * Add `{ name: "reranker-on", topK: 5, reranker: true, cache: false }` here once
 * a reranker exists; the runner and the table renderer need no other change.
 */
export const EVAL_CONFIGS: EvalConfig[] = [
  { name: "baseline", topK: DEFAULT_TOP_K, reranker: false, cache: false },
];

export function isFoundryEnabled(): boolean {
  return (
    process.env.FOUNDRY_EVAL_ENABLED === "true" &&
    Boolean(process.env.AZURE_AI_PROJECT_ENDPOINT)
  );
}

/** Stable run name, used as the Foundry run name and the trace attribute. */
export function buildRunName(now: Date = new Date()): string {
  return `mirrored-rag-eval-${now.toISOString().replace(/[:.]/g, "-")}`;
}

/**
 * Run one query against one configuration.
 *
 * `judge` controls whether the LLM evaluators run for this query — the caller
 * enforces JUDGE_QUERY_LIMIT so cost stays bounded regardless of dataset size.
 */
async function evaluateQuery(
  entry: EvalDatasetEntry,
  config: EvalConfig,
  judge: boolean
): Promise<QueryResult> {
  const base: QueryResult = {
    query: entry.query,
    userIdHash: entry.userIdHash,
    retrievedIds: [],
    expectedIds: entry.expectedMemoryIds,
    precisionAtK: 0,
    recallAtK: 0,
    reciprocalRank: 0,
    relevance: null,
    groundedness: null,
    latencyMs: 0,
  };

  if (entry.userId === undefined) {
    return {
      ...base,
      error:
        "Dataset entry has no raw userId. Datasets read from disk are anonymised; " +
        "run buildDataset() in-process to evaluate.",
    };
  }

  const started = Date.now();
  let retrieved;
  try {
    retrieved = await retrieveMemories({
      userId: entry.userId,
      query: entry.query,
      topK: config.topK,
      domain: entry.domain ?? undefined,
    });
  } catch (err) {
    return {
      ...base,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  const latencyMs = Date.now() - started;

  const retrievedIds = retrieved.map((m) => m.id);
  const result: QueryResult = {
    ...base,
    retrievedIds,
    latencyMs,
    precisionAtK: precisionAtK(retrievedIds, entry.expectedMemoryIds, config.topK),
    recallAtK: recallAtK(retrievedIds, entry.expectedMemoryIds, config.topK),
    reciprocalRank: reciprocalRank(retrievedIds, entry.expectedMemoryIds),
  };

  if (!judge || retrieved.length === 0) return result;

  const scores = await judgeContextRelevance(entry.query, retrieved);
  if (scores.length > 0) result.relevance = mean(scores);

  const context = formatMemoriesForPrompt(retrieved);
  const grounded = await judgeGroundedness(entry.query, context, retrieved);
  if (grounded) result.groundedness = grounded.groundedness;

  return result;
}

function aggregate(config: EvalConfig, perQuery: readonly QueryResult[]): ConfigResult {
  const ok = perQuery.filter((r) => !r.error);
  const latencies = ok.map((r) => r.latencyMs);
  const relevances = ok.map((r) => r.relevance).filter((v): v is number => v !== null);
  const groundings = ok.map((r) => r.groundedness).filter((v): v is number => v !== null);

  return {
    config,
    queryCount: perQuery.length,
    meanPrecision: mean(ok.map((r) => r.precisionAtK)),
    meanRecall: mean(ok.map((r) => r.recallAtK)),
    meanMRR: mean(ok.map((r) => r.reciprocalRank)),
    meanRelevance: relevances.length > 0 ? mean(relevances) : null,
    meanGroundedness: groundings.length > 0 ? mean(groundings) : null,
    latencyP50: percentile(latencies, 0.5),
    latencyP95: percentile(latencies, 0.95),
    // No cache exists in retrieveMemories yet; reported for output stability.
    cacheHitRate: 0,
    errorCount: perQuery.length - ok.length,
    perQuery: [...perQuery],
  };
}

export interface RunOptions {
  /** Path to a JSONL dataset. Ignored when `entries` is supplied. */
  datasetPath?: string;
  /** In-process entries, which retain the raw userId needed to retrieve. */
  entries?: EvalDatasetEntry[];
  configs?: EvalConfig[];
  /** Cap on queries sent to the LLM judges. Defaults to JUDGE_QUERY_LIMIT. */
  judgeLimit?: number;
  runName?: string;
}

/**
 * Run the full evaluation across every configuration.
 *
 * Does not throw on individual query failures — those are recorded per query and
 * counted in `errorCount`, so one bad row cannot lose a whole run's results.
 */
export async function runRagEval(options: RunOptions = {}): Promise<EvalRun> {
  const {
    datasetPath = DEFAULT_DATASET_PATH,
    configs = EVAL_CONFIGS,
    judgeLimit = JUDGE_QUERY_LIMIT,
    runName = buildRunName(),
  } = options;

  const entries =
    options.entries ?? parseDataset(readFileSync(datasetPath, "utf8"));

  if (entries.length === 0) {
    throw new Error(`Eval dataset is empty: ${datasetPath}`);
  }

  // Tag every trace emitted during this run so Foundry can filter to it.
  setEvalRunId(runName);

  const judgedQueryCount = Math.min(entries.length, judgeLimit);
  const results: ConfigResult[] = [];

  try {
    for (const config of configs) {
      console.log(`[eval] Running config "${config.name}" over ${entries.length} queries…`);
      const perQuery: QueryResult[] = [];

      for (let i = 0; i < entries.length; i++) {
        const result = await evaluateQuery(entries[i], config, i < judgeLimit);
        perQuery.push(result);
        recordEvalScores(runName, config.name, {
          precisionAtK: result.precisionAtK,
          recallAtK: result.recallAtK,
          reciprocalRank: result.reciprocalRank,
          relevance: result.relevance,
          groundedness: result.groundedness,
          latencyMs: result.latencyMs,
        });
      }

      results.push(aggregate(config, perQuery));
    }
  } finally {
    setEvalRunId(null);
  }

  const run: EvalRun = {
    runName,
    runAt: new Date(),
    datasetPath: options.entries ? "(in-process)" : datasetPath,
    datasetSize: entries.length,
    judgedQueryCount,
    results,
  };

  await publishToFoundry(run);
  return run;
}

/**
 * Payload sent to Foundry. Aggregates only — no queries, no memory content, no
 * identifiers, hashed or otherwise. Exported so the privacy contract is testable.
 */
export function buildFoundryPayload(run: EvalRun): Record<string, unknown> {
  return {
    runName: run.runName,
    runAt: run.runAt.toISOString(),
    datasetSize: run.datasetSize,
    judgedQueryCount: run.judgedQueryCount,
    tags: {
      // Recorded as false rather than omitted so runs stay comparable once
      // these features land.
      rerankerEnabled: run.results.some((r) => r.config.reranker),
      qdrantEnabled: false,
      cacheEnabled: run.results.some((r) => r.config.cache),
    },
    metrics: run.results.map((r) => ({
      config: r.config.name,
      queryCount: r.queryCount,
      errorCount: r.errorCount,
      meanPrecisionAt5: r.meanPrecision,
      meanRecallAt5: r.meanRecall,
      meanMRR: r.meanMRR,
      meanRelevance: r.meanRelevance,
      meanGroundedness: r.meanGroundedness,
      latencyP50Ms: r.latencyP50,
      latencyP95Ms: r.latencyP95,
      cacheHitRate: r.cacheHitRate,
    })),
  };
}

/**
 * Publish a run to Foundry. No-ops unless FOUNDRY_EVAL_ENABLED is "true" and
 * AZURE_AI_PROJECT_ENDPOINT is set.
 *
 * TO WIRE THE REAL SDK: install the Foundry evaluation package, and replace the
 * marked block with its create-run call, passing `payload`. Everything above is
 * already aggregate-only and safe to send. Failures here are logged and
 * swallowed on purpose — a telemetry outage must not lose local results.
 */
export async function publishToFoundry(run: EvalRun): Promise<boolean> {
  if (!isFoundryEnabled()) return false;

  const payload = buildFoundryPayload(run);

  try {
    // ── SDK call goes here ───────────────────────────────────────────────────
    // Left unimplemented deliberately: the SDK is not installed and the endpoint
    // is unreachable from this environment, so any call written here would be
    // untested guesswork. Logging the payload keeps the run inspectable until
    // it is wired.
    console.log(
      `[eval] Foundry enabled; payload ready for ${process.env.AZURE_AI_PROJECT_ENDPOINT}`
    );
    console.log(JSON.stringify(payload, null, 2));
    return true;
  } catch (err) {
    console.warn(
      `[eval] Foundry publish failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return false;
  }
}

/** Render results as a fixed-width table for the CLI. */
export function renderTable(run: EvalRun): string {
  const pct = (v: number | null) => (v === null ? "  n/a" : `${(v * 100).toFixed(1)}%`);
  const num = (v: number | null) => (v === null ? "  n/a" : v.toFixed(3));

  const header = [
    "config".padEnd(14),
    "P@5".padStart(7),
    "R@5".padStart(7),
    "MRR".padStart(7),
    "relev".padStart(7),
    "ground".padStart(7),
    "p50ms".padStart(7),
    "p95ms".padStart(7),
    "errs".padStart(5),
  ].join(" ");

  const rows = run.results.map((r) =>
    [
      r.config.name.padEnd(14),
      pct(r.meanPrecision).padStart(7),
      pct(r.meanRecall).padStart(7),
      num(r.meanMRR).padStart(7),
      pct(r.meanRelevance).padStart(7),
      pct(r.meanGroundedness).padStart(7),
      String(r.latencyP50).padStart(7),
      String(r.latencyP95).padStart(7),
      String(r.errorCount).padStart(5),
    ].join(" ")
  );

  return [
    `Run: ${run.runName}`,
    `Dataset: ${run.datasetPath} (${run.datasetSize} queries, ${run.judgedQueryCount} judged)`,
    "",
    header,
    "-".repeat(header.length),
    ...rows,
  ].join("\n");
}
