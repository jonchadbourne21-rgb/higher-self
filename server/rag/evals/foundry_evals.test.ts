import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../db", () => ({ getDb: vi.fn().mockResolvedValue(null) }));
vi.mock("../memory", () => ({
  retrieveMemories: vi.fn().mockResolvedValue([]),
  formatMemoriesForPrompt: vi.fn().mockReturnValue(""),
  cosineSimilarity: vi.fn().mockReturnValue(0),
}));
vi.mock("../../_core/llm", () => ({ invokeLLM: vi.fn() }));

import {
  buildFoundryPayload,
  buildRunName,
  isFoundryEnabled,
  renderTable,
  EVAL_CONFIGS,
} from "./foundry_evals";
import {
  setEvalRunId,
  getEvalRunId,
  isEvalMode,
  baseTraceAttributes,
  recordEvalScores,
} from "../foundryTracing";
import type { EvalRun } from "./types";

function makeRun(overrides: Partial<EvalRun> = {}): EvalRun {
  return {
    runName: "mirrored-rag-eval-2026-08-01T00-00-00-000Z",
    runAt: new Date("2026-08-01T00:00:00Z"),
    datasetPath: "(in-process)",
    datasetSize: 80,
    judgedQueryCount: 80,
    results: [
      {
        config: { name: "baseline", topK: 5, reranker: false, cache: false },
        queryCount: 80,
        meanPrecision: 0.62,
        meanRecall: 0.48,
        meanMRR: 0.71,
        meanRelevance: 0.83,
        meanGroundedness: 0.91,
        latencyP50: 120,
        latencyP95: 340,
        cacheHitRate: 0,
        errorCount: 2,
        perQuery: [
          {
            query: "What did I write about work stress?",
            userIdHash: "abc123def456",
            retrievedIds: [1, 2, 3],
            expectedIds: [1, 2],
            precisionAtK: 0.67,
            recallAtK: 1,
            reciprocalRank: 1,
            relevance: 0.9,
            groundedness: 0.95,
            latencyMs: 118,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("isFoundryEnabled", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("is false when nothing is configured", () => {
    delete process.env.FOUNDRY_EVAL_ENABLED;
    delete process.env.AZURE_AI_PROJECT_ENDPOINT;
    expect(isFoundryEnabled()).toBe(false);
  });

  it("is false when the flag is set but the endpoint is missing", () => {
    process.env.FOUNDRY_EVAL_ENABLED = "true";
    delete process.env.AZURE_AI_PROJECT_ENDPOINT;
    expect(isFoundryEnabled()).toBe(false);
  });

  it("is false when the endpoint is set but the flag is not", () => {
    delete process.env.FOUNDRY_EVAL_ENABLED;
    process.env.AZURE_AI_PROJECT_ENDPOINT = "https://example.invalid";
    expect(isFoundryEnabled()).toBe(false);
  });

  it("is true only when both are present", () => {
    process.env.FOUNDRY_EVAL_ENABLED = "true";
    process.env.AZURE_AI_PROJECT_ENDPOINT = "https://example.invalid";
    expect(isFoundryEnabled()).toBe(true);
  });
});

describe("buildFoundryPayload privacy contract", () => {
  it("carries no query text, memory content, or identifiers", () => {
    const serialized = JSON.stringify(buildFoundryPayload(makeRun()));

    expect(serialized).not.toContain("work stress");
    expect(serialized).not.toContain("abc123def456"); // not even the hashed id
    expect(serialized).not.toContain("retrievedIds");
    expect(serialized).not.toContain("perQuery");
  });

  it("carries the aggregate metrics", () => {
    const payload = buildFoundryPayload(makeRun()) as {
      metrics: Array<Record<string, unknown>>;
    };
    expect(payload.metrics[0].meanPrecisionAt5).toBe(0.62);
    expect(payload.metrics[0].meanRecallAt5).toBe(0.48);
    expect(payload.metrics[0].meanMRR).toBe(0.71);
    expect(payload.metrics[0].latencyP95Ms).toBe(340);
    expect(payload.metrics[0].errorCount).toBe(2);
  });

  it("records reranker and qdrant tags as false rather than omitting them", () => {
    // Runs must stay comparable once those features exist.
    const payload = buildFoundryPayload(makeRun()) as { tags: Record<string, boolean> };
    expect(payload.tags).toEqual({
      rerankerEnabled: false,
      qdrantEnabled: false,
      cacheEnabled: false,
    });
  });
});

describe("buildRunName", () => {
  it("is prefixed and timestamped", () => {
    const name = buildRunName(new Date("2026-08-01T12:34:56.789Z"));
    expect(name).toBe("mirrored-rag-eval-2026-08-01T12-34-56-789Z");
  });

  it("contains no characters that break a filter expression", () => {
    expect(buildRunName(new Date())).not.toMatch(/[:.]/);
  });
});

describe("EVAL_CONFIGS", () => {
  it("ships a baseline with reranker and cache off, since neither exists yet", () => {
    expect(EVAL_CONFIGS).toHaveLength(1);
    expect(EVAL_CONFIGS[0]).toMatchObject({ name: "baseline", reranker: false, cache: false });
  });
});

describe("renderTable", () => {
  it("renders metrics and the run name", () => {
    const table = renderTable(makeRun());
    expect(table).toContain("baseline");
    expect(table).toContain("62.0%");
    expect(table).toContain("mirrored-rag-eval");
  });

  it("shows n/a rather than 0 when the judge did not run", () => {
    const run = makeRun();
    run.results[0].meanRelevance = null;
    run.results[0].meanGroundedness = null;
    expect(renderTable(run)).toContain("n/a");
  });
});

describe("eval run id tagging", () => {
  beforeEach(() => setEvalRunId(null));
  afterEach(() => setEvalRunId(null));

  it("is absent from trace attributes outside eval mode", () => {
    expect(isEvalMode()).toBe(false);
    expect(baseTraceAttributes().evalRunId).toBeUndefined();
  });

  it("appears in trace attributes during a run", () => {
    setEvalRunId("mirrored-rag-eval-test");
    expect(isEvalMode()).toBe(true);
    expect(getEvalRunId()).toBe("mirrored-rag-eval-test");
    expect(baseTraceAttributes().evalRunId).toBe("mirrored-rag-eval-test");
  });

  it("clears back to null", () => {
    setEvalRunId("x");
    setEvalRunId(null);
    expect(isEvalMode()).toBe(false);
  });

  it("emits no span event outside eval mode", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    recordEvalScores("run", "baseline", {
      precisionAtK: 1,
      recallAtK: 1,
      reciprocalRank: 1,
      relevance: null,
      groundedness: null,
      latencyMs: 10,
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("emits a span event carrying the run id during eval mode", () => {
    setEvalRunId("run-42");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    recordEvalScores("run-42", "baseline", {
      precisionAtK: 0.5,
      recallAtK: 0.25,
      reciprocalRank: 1,
      relevance: 0.8,
      groundedness: null,
      latencyMs: 99,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const event = JSON.parse(spy.mock.calls[0][0] as string);
    expect(event.marker).toBe("foundry.trace");
    expect(event.evalRunId).toBe("run-42");
    expect(event.evalConfig).toBe("baseline");
    expect(event["eval.precision_at_k"]).toBe(0.5);
    expect(event["eval.latency_ms"]).toBe(99);
    spy.mockRestore();
  });
});
