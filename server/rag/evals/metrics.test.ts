import { describe, it, expect } from "vitest";
import {
  precisionAtK,
  precisionAtKStrict,
  recallAtK,
  reciprocalRank,
  mean,
  percentile,
} from "./metrics";

describe("precisionAtK", () => {
  it("scores a perfect top-3", () => {
    expect(precisionAtK([1, 2, 3], [1, 2, 3], 3)).toBe(1);
  });

  it("scores a half-right top-4", () => {
    expect(precisionAtK([1, 9, 2, 8], [1, 2, 3], 4)).toBe(0.5);
  });

  it("only considers the top K", () => {
    // The relevant id sits at position 4, outside K=3.
    expect(precisionAtK([9, 8, 7, 1], [1], 3)).toBe(0);
  });

  it("is 0 when nothing was retrieved", () => {
    expect(precisionAtK([], [1, 2], 5)).toBe(0);
  });

  it("divides by results returned, not K, when fewer than K come back", () => {
    // 2 returned, both relevant: a perfect result for a small corpus.
    expect(precisionAtK([1, 2], [1, 2, 3], 5)).toBe(1);
  });

  it("strict variant divides by K instead", () => {
    expect(precisionAtKStrict([1, 2], [1, 2, 3], 5)).toBeCloseTo(0.4);
  });
});

describe("recallAtK", () => {
  it("finds all of the ground truth", () => {
    expect(recallAtK([1, 2, 3], [1, 2, 3], 5)).toBe(1);
  });

  it("finds a third of the ground truth", () => {
    expect(recallAtK([1, 9, 8], [1, 2, 3], 5)).toBeCloseTo(1 / 3);
  });

  it("is bounded by K even when more relevant results exist further down", () => {
    expect(recallAtK([9, 8, 1, 2], [1, 2], 2)).toBe(0);
  });

  it("returns 0 rather than NaN for an unlabelled query", () => {
    // An empty ground truth must not inflate the aggregate.
    expect(recallAtK([1, 2, 3], [], 5)).toBe(0);
  });
});

describe("reciprocalRank", () => {
  it("is 1 when the first result is relevant", () => {
    expect(reciprocalRank([1, 9, 8], [1])).toBe(1);
  });

  it("is 1/3 when the third result is the first relevant one", () => {
    expect(reciprocalRank([9, 8, 1], [1])).toBeCloseTo(1 / 3);
  });

  it("uses the first relevant result, ignoring later ones", () => {
    expect(reciprocalRank([9, 1, 2], [1, 2])).toBe(0.5);
  });

  it("is 0 when nothing relevant was retrieved", () => {
    expect(reciprocalRank([9, 8, 7], [1])).toBe(0);
  });

  it("is 0 for an empty result list", () => {
    expect(reciprocalRank([], [1])).toBe(0);
  });
});

describe("mean", () => {
  it("averages", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it("is 0 for an empty list rather than NaN", () => {
    expect(mean([])).toBe(0);
  });
});

describe("percentile", () => {
  it("returns the max at p=1", () => {
    expect(percentile([10, 20, 30, 40], 1)).toBe(40);
  });

  it("returns the min at p=0", () => {
    expect(percentile([10, 20, 30, 40], 0)).toBe(10);
  });

  it("computes p95 over a 100-sample latency series", () => {
    const latencies = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    expect(percentile(latencies, 0.95)).toBe(95);
  });

  it("does not mutate the input", () => {
    const input = [3, 1, 2];
    percentile(input, 0.5);
    expect(input).toEqual([3, 1, 2]);
  });

  it("is 0 for an empty series", () => {
    expect(percentile([], 0.95)).toBe(0);
  });
});
