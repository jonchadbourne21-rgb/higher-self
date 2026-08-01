/**
 * Retrieval metrics.
 *
 * Pure functions over id lists — no database, no network, no LLM. Everything
 * here is deterministic and directly unit-tested in evals/metrics.test.ts, so a
 * regression in a headline number is always a real regression rather than a
 * flaky judge call.
 */

/** Ground truth for one query: the memory ids a good retriever should return. */
export type RelevantIds = ReadonlySet<number> | readonly number[];

function toSet(ids: RelevantIds): ReadonlySet<number> {
  return ids instanceof Set ? ids : new Set(ids as readonly number[]);
}

/**
 * Precision@K — of the top K results, what fraction were relevant.
 *
 * Divides by the number of results actually returned, not by K. Dividing by K
 * would punish a retriever for a query where fewer than K memories exist at
 * all, which measures the corpus rather than the ranking. When fewer than K
 * results come back, `precisionAtK` and the spec's "intersection / K" differ;
 * `precisionAtKStrict` below implements the literal form if you need it.
 */
export function precisionAtK(retrieved: readonly number[], relevant: RelevantIds, k: number): number {
  const truth = toSet(relevant);
  const top = retrieved.slice(0, k);
  if (top.length === 0) return 0;
  const hits = top.filter((id) => truth.has(id)).length;
  return hits / top.length;
}

/** Precision@K divided by K regardless of how many results came back. */
export function precisionAtKStrict(retrieved: readonly number[], relevant: RelevantIds, k: number): number {
  if (k <= 0) return 0;
  const truth = toSet(relevant);
  const hits = retrieved.slice(0, k).filter((id) => truth.has(id)).length;
  return hits / k;
}

/**
 * Recall@K — of the memories that should have been found, what fraction were.
 *
 * Undefined when ground truth is empty; returns 0 so an unlabelled query cannot
 * silently inflate the aggregate.
 */
export function recallAtK(retrieved: readonly number[], relevant: RelevantIds, k: number): number {
  const truth = toSet(relevant);
  if (truth.size === 0) return 0;
  const hits = retrieved.slice(0, k).filter((id) => truth.has(id)).length;
  return hits / truth.size;
}

/**
 * Reciprocal rank — 1 / (position of the first relevant result), 1-indexed.
 * Zero when nothing relevant appears in the list.
 *
 * Mean over a dataset gives MRR. Rewards putting the right memory first rather
 * than merely somewhere in the window, which is what matters when the top
 * results are what land in the prompt.
 */
export function reciprocalRank(retrieved: readonly number[], relevant: RelevantIds): number {
  const truth = toSet(relevant);
  for (let i = 0; i < retrieved.length; i++) {
    if (truth.has(retrieved[i])) return 1 / (i + 1);
  }
  return 0;
}

/** Arithmetic mean; 0 for an empty list so aggregates never produce NaN. */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Nearest-rank percentile. p is a fraction in [0, 1].
 * percentile(xs, 0.95) is the value at or below which 95% of samples fall.
 */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.min(Math.max(p, 0), 1);
  const index = Math.ceil(clamped * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}
