# RAG Evaluation

Measures whether `retrieveMemories` returns the right memories for a query, and
whether a Mirror answer built from those memories stays grounded in them.

---

## Read this first: what this harness does and does not measure

The eval spec this was built from described a starting point that does not exist
in this repository. Recording the gap here so nobody reads a number and assumes
it means more than it does.

**The spec assumed, and the reality:**

| Assumed | Actual |
|---|---|
| Qdrant ANN index | None. `retrieveMemories` pulls up to 200 rows and scores them in a JS loop (`../memory.ts`) |
| Reranker | None. There is no `useReranker` parameter to toggle |
| Two-layer cache | None. `cacheHitRate` is therefore always 0 |
| `foundryTracing.ts` already present | Did not exist. Created here with the eval surface only |
| Foundry evaluation SDK | Not a dependency; no reachable project endpoint |

Consequences:

- **There is no reranker on/off comparison**, because there is no reranker. The
  runner is built around a list of named configurations (`EVAL_CONFIGS` in
  `foundry_evals.ts`) precisely so that adding one is a single array entry.
- **`cacheHitRate` is reported as 0**, not omitted, so the output shape does not
  change the day a cache lands.
- **Foundry publishing is a documented seam, not an integration.** Metrics are
  computed and stored locally. See "Foundry" below.

---

## Quick start

```bash
# Metrics only, no LLM spend
pnpm eval:rag --no-judge

# Full run with judges, 80 queries
pnpm eval:rag

# Smaller run, persist aggregates to rag_eval_runs
pnpm eval:rag --limit 40 --persist
```

Requires `DATABASE_URL` and `GEMINI_API_KEY`. Retrieval runs against real
embeddings, so there is no offline mode.

### Flags

| Flag | Effect |
|---|---|
| `--limit N` | Dataset size (default 80) |
| `--judge N` | Queries sent to the LLM judge (capped at 100) |
| `--no-judge` | Skip judges entirely — no token spend |
| `--persist` | Write aggregates to `rag_eval_runs` |
| `--dataset PATH` | Load an existing JSONL (see the caveat below) |

---

## The metrics

| Metric | Meaning | Reads as |
|---|---|---|
| **P@5** | Of the 5 returned memories, how many were relevant | Higher is less noise in the prompt |
| **R@5** | Of the memories that should have been found, how many were | Higher is less forgetting |
| **MRR** | 1 / rank of the first relevant result | Higher means the best memory is at the top |
| **relev** | LLM-judged topical relevance, 0–1 | Catches "technically similar, actually useless" |
| **ground** | Is the generated answer supported by the retrieved memories | Low means the Mirror is inventing |
| **p50/p95** | Retrieval latency, milliseconds | p95 is what slow users feel |

`P@5` divides by results actually returned, not by 5, so a query with only 3
memories in the corpus is not punished for the corpus being small.
`precisionAtKStrict` implements the divide-by-K form if you want it.

---

## The dataset

`build_dataset.ts` samples recent memories, turns each into a natural question,
and derives ground truth by finding every other memory within cosine 0.75 of the
seed.

**Known bias, stated plainly:** ground truth is built with the same embedding
model the retriever uses. So these numbers measure *ranking and filtering*, not
embedding quality. A retriever that ranks perfectly under a bad embedding still
scores well.

That is what the golden set is for. The first 20 entries are marked
`"label": "golden"` and are meant to be **reviewed and corrected by hand**. Until
someone does that, they are heuristic entries wearing a golden label. Only
hand-corrected entries can catch an embedding-level failure.

### Privacy

Enforced in `types.ts` and covered by tests in `build_dataset.test.ts`:

- `userId` is salted-SHA256 hashed. Set `EVAL_HASH_SALT` to keep hashes
  comparable across runs; without it a random per-process salt is used.
- Content is truncated to 400 characters — the same limit
  `formatMemoriesForPrompt` already applies.
- The Foundry payload carries **aggregates only**: no query text, no memory
  content, not even the hashed id.

### The `--dataset` caveat

A dataset written to disk has no raw `userId`, by design. Retrieval needs one.
So loading a saved dataset lets you inspect it but **not** re-run retrieval
against it — the CLI warns and every query records an error. For a real run,
build in-process (the default). To compare runs on identical data, pin
`EVAL_HASH_SALT` and keep the seed selection stable.

`eval_dataset.sample.jsonl` is committed as a **synthetic shape reference**. Every
row is invented. It is not a baseline and its ids match nothing.

---

## Foundry

### Current state

`publishToFoundry` no-ops unless **both** are set:

```bash
FOUNDRY_EVAL_ENABLED=true
AZURE_AI_PROJECT_ENDPOINT=https://<your-project>.services.ai.azure.com/...
```

With them set, it builds and logs the complete payload but **does not call the
SDK**. That block is marked `── SDK call goes here ──` in `foundry_evals.ts`.
It was left unimplemented on purpose: the package is not installed and the
endpoint is not reachable from the build environment, so anything written there
would be untested guesswork that looks finished.

### Wiring it

1. Install the Foundry evaluation package.
2. Replace the marked block with its create-run call, passing `payload`.
3. `buildFoundryPayload` output is already aggregate-only and safe to send.

Failures there are logged and swallowed deliberately — a telemetry outage must
never lose local results.

### Viewing results once wired

In the Azure AI Foundry portal, open your project and go to **Evaluation**. Runs
appear under the name `mirrored-rag-eval-<timestamp>`, sortable by date.

Each run carries tags:

- `rerankerEnabled`
- `qdrantEnabled`
- `cacheEnabled`

All three are `false` today. They are emitted anyway so that runs from before and
after those features remain directly comparable.

### Comparing configurations

Once a second configuration exists, the comparison is:

1. Add it to `EVAL_CONFIGS` in `foundry_evals.ts`:
   ```ts
   { name: "reranker-on", topK: 5, reranker: true, cache: false }
   ```
2. Run `pnpm eval:rag`. Both configurations run over the identical dataset in one
   pass, which matters — comparing across two runs mixes retrieval changes with
   dataset changes.
3. In the portal, select both runs and **Compare**. Or locally, read the table:
   each configuration is one row.

Watch `meanMRR` most closely. A reranker that improves P@5 but not MRR is
reordering within the window rather than surfacing better memories, and only the
top results reach the prompt.

### Traces

During a run, `setEvalRunId` tags every emitted trace with `evalRunId`, and each
query emits an `rag.eval.query` span event carrying its scores. Filter by
`evalRunId` in the portal to isolate one run.

Traces currently print as single-line JSON under the marker `foundry.trace`.
There is no OpenTelemetry dependency in this project, so nothing reaches the
portal until an exporter is wired at `emitSpanEvent` in `../foundryTracing.ts`.
The attribute names already follow the convention Foundry filters on.

---

## Scheduled runs

`POST /api/scheduled/ragEval` builds a 60-query dataset, evaluates, and writes
one row per configuration to `rag_eval_runs`.

Schedule it weekly, offset from the Sunday 08:00 UTC insight jobs so the two do
not contend for the LLM gateway.

It builds a **fresh** dataset each week, so numbers move for two reasons —
retrieval changed, or the corpus changed. Treat a single week's delta as a
prompt to investigate, not a verdict.

---

## Cost

- Judges are capped at 100 queries per run (`JUDGE_QUERY_LIMIT`).
- At most 10 memories judged per query.
- Judge results are cached by content hash, so re-running an unchanged dataset
  against an unchanged retriever costs nothing.
- Each judged query is up to 3 model calls: relevance, mock answer, groundedness.
  Answer generation and grading are deliberately separate calls — one call doing
  both inflates its own score.
- `--no-judge` gives P@5, R@5, MRR, and latency for zero tokens.

---

## Files

| File | Role |
|---|---|
| `metrics.ts` | Pure metric functions. No I/O, fully unit-tested |
| `types.ts` | Shared types, hashing, truncation |
| `build_dataset.ts` | Dataset construction and ground-truth labelling |
| `judge.ts` | LLM-as-judge relevance and groundedness, with caching |
| `foundry_evals.ts` | `runRagEval`, aggregation, Foundry seam, table rendering |
| `schedule.ts` | Weekly cron handler, persistence to `rag_eval_runs` |
| `cli.ts` | `pnpm eval:rag` entry point |
| `../foundryTracing.ts` | `evalRunId` tagging and span events |

`metrics.ts`, `types.ts`, `judge.ts`, and `cli.ts` are beyond the files the spec
listed. They exist so the metric maths is testable without a database and so the
judge's cost controls are isolated from the runner.
