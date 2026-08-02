/**
 * Weekly RAG evaluation hook.
 *
 * Mirrors the shape of the other jobs in server/jobs/: an Express handler that
 * a cron caller hits, plus a plain function for direct invocation.
 *
 * Builds a fresh dataset each run rather than reusing the committed one, so the
 * eval tracks the corpus as it grows. That means week-over-week numbers move for
 * two reasons — retrieval changed, or the data changed — so treat a single
 * week's delta as a signal to investigate rather than a verdict. Pin a dataset
 * with `datasetPath` when you need a controlled comparison.
 */

import type { Request, Response } from "express";
import { getDb } from "../../db";
import { ragEvalRuns } from "../../../drizzle/schema";
import { buildDataset } from "./build_dataset";
import { runRagEval, buildFoundryPayload } from "./foundry_evals";
import type { EvalRun } from "./types";

/** Dataset size for scheduled runs. Kept at the low end to bound judge cost. */
const SCHEDULED_DATASET_SIZE = 60;

/** Persist one run's aggregates — one row per configuration. */
export async function persistEvalRun(run: EvalRun): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[eval] No database; skipping rag_eval_runs write.");
    return 0;
  }

  const payload = buildFoundryPayload(run);
  let written = 0;

  for (const result of run.results) {
    await db.insert(ragEvalRuns).values({
      runAt: run.runAt,
      runName: run.runName,
      configName: result.config.name,
      meanPrecision: result.meanPrecision,
      meanRecall: result.meanRecall,
      meanMRR: result.meanMRR,
      meanRelevance: result.meanRelevance,
      meanGroundedness: result.meanGroundedness,
      latencyP95: Math.round(result.latencyP95),
      configJson: {
        config: result.config,
        tags: (payload as { tags: unknown }).tags,
        datasetSize: run.datasetSize,
        judgedQueryCount: run.judgedQueryCount,
        latencyP50: result.latencyP50,
        cacheHitRate: result.cacheHitRate,
      },
      queryCount: result.queryCount,
      errorCount: result.errorCount,
    });
    written++;
  }

  return written;
}

/** Build a dataset, evaluate, persist. Returns the run for logging or display. */
export async function runScheduledEval(): Promise<EvalRun> {
  const entries = await buildDataset({ limit: SCHEDULED_DATASET_SIZE });
  const run = await runRagEval({ entries });
  const written = await persistEvalRun(run);
  console.log(`[eval] ${run.runName}: wrote ${written} row(s) to rag_eval_runs`);
  return run;
}

/**
 * Cron handler. Suggested schedule: weekly, offset from the Sunday 08:00 UTC
 * insight jobs so the two do not contend for the LLM gateway.
 *
 * Endpoint: POST /api/scheduled/ragEval
 */
export async function ragEvalHandler(_req: Request, res: Response): Promise<void> {
  try {
    const run = await runScheduledEval();
    res.json({
      success: true,
      runName: run.runName,
      configs: run.results.map((r) => ({
        name: r.config.name,
        meanPrecision: r.meanPrecision,
        meanRecall: r.meanRecall,
        meanMRR: r.meanMRR,
        errorCount: r.errorCount,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[eval] Scheduled eval failed: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
}
