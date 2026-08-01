/**
 * Foundry tracing hooks for the RAG pipeline.
 *
 * ── Status ───────────────────────────────────────────────────────────────────
 * The eval spec described this file as already existing with full tracing in
 * place. It did not exist. This is a new file providing only the surface the
 * eval harness needs — an eval run id that traces can be filtered by, and score
 * emission as span events.
 *
 * There is no OpenTelemetry dependency in this project, so spans are emitted as
 * structured single-line JSON on stdout under the "foundry.trace" marker. That
 * is a real, greppable, shippable telemetry channel — log collectors can forward
 * it — but it is not OTLP, and the Foundry portal will not show these until an
 * exporter is wired. `emitSpanEvent` is the single seam where that happens.
 *
 * Privacy: this module never accepts raw content. Callers pass metric values and
 * identifiers only. Nothing here needs truncation because nothing here carries
 * user text.
 */

/**
 * Current eval run id, or null in normal operation.
 *
 * Module-level rather than passed through call sites because the whole point is
 * to tag traces emitted deep inside retrieval without changing any existing
 * function signature — a hard constraint of the eval spec.
 *
 * This is process-wide state and therefore assumes one eval run at a time.
 * Concurrent runs in a single process would interleave their tags; the CLI and
 * the weekly scheduler both run one at a time, so that is safe today. If eval
 * runs ever become concurrent, this needs AsyncLocalStorage.
 */
let currentEvalRunId: string | null = null;

/** Tag subsequent traces with an eval run id. Pass null to clear. */
export function setEvalRunId(runId: string | null): void {
  currentEvalRunId = runId;
}

/** The active eval run id, or null when not running under eval. */
export function getEvalRunId(): string | null {
  return currentEvalRunId;
}

/** True when the process is currently executing an eval run. */
export function isEvalMode(): boolean {
  return currentEvalRunId !== null;
}

/** Attributes attached to every trace, including evalRunId when in eval mode. */
export function baseTraceAttributes(): Record<string, string> {
  const attrs: Record<string, string> = {
    service: "mirrored-rag",
  };
  if (currentEvalRunId) attrs.evalRunId = currentEvalRunId;
  return attrs;
}

/**
 * Emit one span event.
 *
 * TO WIRE OTLP: replace the console.log with an OpenTelemetry span event and
 * point the exporter at the Foundry project endpoint. Attribute names below
 * already follow the convention Foundry filters on.
 */
export function emitSpanEvent(name: string, attributes: Record<string, unknown>): void {
  const event = {
    marker: "foundry.trace",
    name,
    timestamp: new Date().toISOString(),
    ...baseTraceAttributes(),
    ...attributes,
  };
  console.log(JSON.stringify(event));
}

export interface EvalScoreEvent {
  precisionAtK: number;
  recallAtK: number;
  reciprocalRank: number;
  relevance: number | null;
  groundedness: number | null;
  latencyMs: number;
}

/**
 * Record one query's eval scores as a span event.
 *
 * No-ops outside eval mode so production retrieval emits nothing extra.
 */
export function recordEvalScores(
  runId: string,
  configName: string,
  scores: EvalScoreEvent
): void {
  if (!isEvalMode()) return;
  emitSpanEvent("rag.eval.query", {
    evalRunId: runId,
    evalConfig: configName,
    "eval.precision_at_k": scores.precisionAtK,
    "eval.recall_at_k": scores.recallAtK,
    "eval.reciprocal_rank": scores.reciprocalRank,
    "eval.relevance": scores.relevance,
    "eval.groundedness": scores.groundedness,
    "eval.latency_ms": scores.latencyMs,
  });
}
