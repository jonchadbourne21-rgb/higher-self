/**
 * CLI for `pnpm eval:rag`.
 *
 * Builds a dataset from the live database, evaluates every configuration, and
 * prints a results table. Requires DATABASE_URL and GEMINI_API_KEY — retrieval
 * cannot run without embeddings.
 *
 * Flags:
 *   --limit N        dataset size (default 80)
 *   --judge N        queries sent to the LLM judge (default 100, the hard cap)
 *   --no-judge       skip LLM judges entirely; metrics only, no token spend
 *   --dataset PATH   evaluate an existing JSONL instead of building one
 *   --persist        write aggregates to rag_eval_runs
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { buildDataset, parseDataset } from "./build_dataset";
import { runRagEval, renderTable, isFoundryEnabled } from "./foundry_evals";
import { persistEvalRun } from "./schedule";
import { JUDGE_QUERY_LIMIT } from "./judge";
import type { EvalDatasetEntry } from "./types";

interface CliOptions {
  limit: number;
  judgeLimit: number;
  datasetPath?: string;
  persist: boolean;
}

function parseArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = {
    limit: 80,
    judgeLimit: JUDGE_QUERY_LIMIT,
    persist: false,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--limit":
        options.limit = Number(argv[++i]);
        break;
      case "--judge":
        options.judgeLimit = Math.min(Number(argv[++i]), JUDGE_QUERY_LIMIT);
        break;
      case "--no-judge":
        options.judgeLimit = 0;
        break;
      case "--dataset":
        options.datasetPath = resolve(argv[++i]);
        break;
      case "--persist":
        options.persist = true;
        break;
    }
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    console.error(
      "[eval] DATABASE_URL is not set. Retrieval runs against real memory " +
        "embeddings, so an eval cannot run without a database."
    );
    process.exit(1);
  }

  let entries: EvalDatasetEntry[];
  if (options.datasetPath) {
    entries = parseDataset(readFileSync(options.datasetPath, "utf8"));
    console.log(`[eval] Loaded ${entries.length} entries from ${options.datasetPath}`);
    console.warn(
      "[eval] Datasets read from disk are anonymised and carry no raw userId, so " +
        "retrieval cannot run against them. Build in-process instead (omit --dataset)."
    );
  } else {
    entries = await buildDataset({ limit: options.limit });
  }

  const run = await runRagEval({ entries, judgeLimit: options.judgeLimit });

  console.log(`\n${renderTable(run)}\n`);

  if (options.judgeLimit === 0) {
    console.log("[eval] LLM judges skipped (--no-judge): relevance and groundedness are n/a.");
  }
  if (!isFoundryEnabled()) {
    console.log(
      "[eval] Foundry publishing disabled. Set FOUNDRY_EVAL_ENABLED=true and " +
        "AZURE_AI_PROJECT_ENDPOINT to enable."
    );
  }

  if (options.persist) {
    const written = await persistEvalRun(run);
    console.log(`[eval] Persisted ${written} row(s) to rag_eval_runs.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[eval] Failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
