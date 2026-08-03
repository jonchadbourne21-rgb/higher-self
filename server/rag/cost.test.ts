/**
 * Cost controls on the RAG layer: the embedding cache and the personality
 * analysis throttle.
 *
 * These exist because every retrieval embeds its query and every session end
 * used to trigger a full LLM personality analysis. Both are tested directly so
 * a regression shows up as a failing assertion rather than a surprise bill.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db", () => ({ getDb: vi.fn().mockResolvedValue(null) }));
vi.mock("../_core/llm", () => ({ invokeLLM: vi.fn() }));

import {
  shouldReanalysePersonality,
  PERSONALITY_MIN_INTERVAL_MS,
  PERSONALITY_MIN_NEW_MEMORIES,
  PERSONALITY_WINDOW,
  embeddingCacheStats,
  clearEmbeddingCache,
  generateEmbedding,
  scoreImportance,
  rankByImportance,
  formatReturnAnchor,
  type AnchorCandidate,
} from "./memory";

const NOW = new Date("2026-08-02T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);

describe("personality analysis throttle", () => {
  it("always runs for a profile that has never been analysed", () => {
    expect(
      shouldReanalysePersonality({
        lastAnalyzedAt: null,
        analyzedInteractionCount: 0,
        currentMemoryCount: 3,
        now: NOW,
      })
    ).toBe(true);
  });

  it("skips a profile analysed minutes ago", () => {
    // This is the case that mattered: a voice session ending right after another.
    expect(
      shouldReanalysePersonality({
        lastAnalyzedAt: hoursAgo(0.1),
        analyzedInteractionCount: 20,
        currentMemoryCount: 20,
        now: NOW,
      })
    ).toBe(false);
  });

  it("still fires past the old 20-memory ceiling", () => {
    // Regression: interactionCount used to store the capped window size, so both
    // sides sat at 20 forever and the count gate silently died. It now stores the
    // true total, so a heavy user crossing the threshold still triggers.
    expect(
      shouldReanalysePersonality({
        lastAnalyzedAt: hoursAgo(0.1),
        analyzedInteractionCount: 200,
        currentMemoryCount: 200 + PERSONALITY_MIN_NEW_MEMORIES,
        now: NOW,
      })
    ).toBe(true);
  });

  it("keeps skipping a heavy user who has added nothing new", () => {
    expect(
      shouldReanalysePersonality({
        lastAnalyzedAt: hoursAgo(0.1),
        analyzedInteractionCount: 200,
        currentMemoryCount: 201,
        now: NOW,
      })
    ).toBe(false);
  });

  it("runs again once the interval has elapsed", () => {
    expect(
      shouldReanalysePersonality({
        lastAnalyzedAt: new Date(NOW.getTime() - PERSONALITY_MIN_INTERVAL_MS),
        analyzedInteractionCount: 20,
        currentMemoryCount: 20,
        now: NOW,
      })
    ).toBe(true);
  });

  it("still skips just before the interval elapses", () => {
    expect(
      shouldReanalysePersonality({
        lastAnalyzedAt: new Date(NOW.getTime() - PERSONALITY_MIN_INTERVAL_MS + 1000),
        analyzedInteractionCount: 20,
        currentMemoryCount: 20,
        now: NOW,
      })
    ).toBe(false);
  });

  it("runs early when enough new memories have accumulated", () => {
    // Inside the time floor, so this isolates the count gate: a new user going
    // from 3 to 8 memories should not wait out the timer.
    expect(
      shouldReanalysePersonality({
        lastAnalyzedAt: hoursAgo(0.1),
        analyzedInteractionCount: 3,
        currentMemoryCount: 3 + PERSONALITY_MIN_NEW_MEMORIES,
        now: NOW,
      })
    ).toBe(true);
  });

  it("does not run early for a handful of new memories", () => {
    expect(
      shouldReanalysePersonality({
        lastAnalyzedAt: hoursAgo(0.1),
        analyzedInteractionCount: 3,
        currentMemoryCount: 3 + PERSONALITY_MIN_NEW_MEMORIES - 1,
        now: NOW,
      })
    ).toBe(false);
  });

  it("is not confused by a memory count that went down", () => {
    // Deleted memories must not produce a negative delta that reads as "run now".
    expect(
      shouldReanalysePersonality({
        lastAnalyzedAt: hoursAgo(0.1),
        analyzedInteractionCount: 20,
        currentMemoryCount: 4,
        now: NOW,
      })
    ).toBe(false);
  });
});

describe("embedding cache", () => {
  beforeEach(() => clearEmbeddingCache());

  it("starts empty with a zero hit rate", () => {
    expect(embeddingCacheStats()).toEqual({ size: 0, hits: 0, misses: 0, hitRate: 0 });
  });

  it("does not cache the zero vector returned when RAG is disabled", async () => {
    // GEMINI_API_KEY is absent in tests, so generateEmbedding degrades to a zero
    // vector. Caching that would pin a failure and silently break retrieval.
    const vec = await generateEmbedding("what did I say about work stress");
    expect(vec).toHaveLength(3072);
    expect(vec.every((v) => v === 0)).toBe(true);
    expect(embeddingCacheStats().size).toBe(0);
  });

  it("does not count empty input as a cache miss", async () => {
    await generateEmbedding("");
    expect(embeddingCacheStats().misses).toBe(0);
  });

  it("clears counters as well as entries", () => {
    clearEmbeddingCache();
    const stats = embeddingCacheStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.size).toBe(0);
  });
});


// ─── Return anchor ───────────────────────────────────────────────────────────

const ANCHOR_NOW = new Date("2026-08-02T12:00:00Z");
const daysAgo = (d: number) => new Date(ANCHOR_NOW.getTime() - d * 24 * 60 * 60 * 1000);

function candidate(over: Partial<AnchorCandidate> & { id: number }): AnchorCandidate {
  return {
    sourceType: "journal",
    content: `memory ${over.id}`,
    createdAt: daysAgo(1),
    intensityScore: null,
    resolutionStatus: null,
    ...over,
  };
}

describe("importance scoring", () => {
  it("prefers recent over old, all else equal", () => {
    const recent = scoreImportance(candidate({ id: 1, createdAt: daysAgo(1) }), ANCHOR_NOW);
    const old = scoreImportance(candidate({ id: 2, createdAt: daysAgo(60) }), ANCHOR_NOW);
    expect(recent).toBeGreaterThan(old);
  });

  it("prefers an unresolved tension over a resolved one", () => {
    const open = scoreImportance(candidate({ id: 1, resolutionStatus: "open" }), ANCHOR_NOW);
    const closed = scoreImportance(candidate({ id: 2, resolutionStatus: "resolved" }), ANCHOR_NOW);
    expect(open).toBeGreaterThan(closed);
  });

  it("prefers high intensity over low", () => {
    const hot = scoreImportance(candidate({ id: 1, intensityScore: 9 }), ANCHOR_NOW);
    const flat = scoreImportance(candidate({ id: 2, intensityScore: 1 }), ANCHOR_NOW);
    expect(hot).toBeGreaterThan(flat);
  });

  it("weights a written reflection above a one-tap check-in", () => {
    const journal = scoreImportance(candidate({ id: 1, sourceType: "journal" }), ANCHOR_NOW);
    const checkin = scoreImportance(candidate({ id: 2, sourceType: "checkin" }), ANCHOR_NOW);
    expect(journal).toBeGreaterThan(checkin);
  });

  it("treats missing intensity as unknown, not as zero", () => {
    // Scoring absent intensity as 0 would bury every non-journal memory, since
    // only Echo-tagged journal entries carry the field.
    const unknown = scoreImportance(candidate({ id: 1, intensityScore: null }), ANCHOR_NOW);
    const explicitZero = scoreImportance(candidate({ id: 2, intensityScore: 0 }), ANCHOR_NOW);
    expect(unknown).toBeGreaterThan(explicitZero);
  });

  it("lets an old unresolved crisis outrank a recent routine check-in", () => {
    // The point of the anchor: what someone is still carrying beats what they
    // happened to tap most recently.
    const oldTension = scoreImportance(
      candidate({
        id: 1,
        createdAt: daysAgo(20),
        sourceType: "journal",
        intensityScore: 10,
        resolutionStatus: "open",
      }),
      ANCHOR_NOW
    );
    const recentCheckin = scoreImportance(
      candidate({ id: 2, createdAt: daysAgo(0), sourceType: "checkin", intensityScore: 2 }),
      ANCHOR_NOW
    );
    expect(oldTension).toBeGreaterThan(recentCheckin);
  });

  it("clamps an out-of-range intensity rather than skewing the score", () => {
    const absurd = scoreImportance(candidate({ id: 1, intensityScore: 999 }), ANCHOR_NOW);
    const max = scoreImportance(candidate({ id: 2, intensityScore: 10 }), ANCHOR_NOW);
    expect(absurd).toBeCloseTo(max);
  });
});

describe("rankByImportance", () => {
  it("returns at most the requested limit", () => {
    const many = Array.from({ length: 40 }, (_, i) => candidate({ id: i }));
    expect(rankByImportance(many, 10, ANCHOR_NOW)).toHaveLength(10);
  });

  it("excludes memories beyond the age cutoff", () => {
    const ranked = rankByImportance(
      [candidate({ id: 1, createdAt: daysAgo(400) }), candidate({ id: 2, createdAt: daysAgo(2) })],
      10,
      ANCHOR_NOW
    );
    expect(ranked.map((r) => r.id)).toEqual([2]);
  });

  it("orders by score, highest first", () => {
    const ranked = rankByImportance(
      [
        candidate({ id: 1, sourceType: "checkin", createdAt: daysAgo(30) }),
        candidate({ id: 2, resolutionStatus: "open", intensityScore: 9 }),
        candidate({ id: 3, sourceType: "chat", createdAt: daysAgo(10) }),
      ],
      3,
      ANCHOR_NOW
    );
    expect(ranked[0].id).toBe(2);
  });

  it("handles an empty corpus", () => {
    expect(rankByImportance([], 10, ANCHOR_NOW)).toEqual([]);
  });
});

describe("formatReturnAnchor", () => {
  it("is empty for a user with no anchor", () => {
    expect(formatReturnAnchor([])).toBe("");
  });

  it("marks unresolved items so the Mirror knows what is still open", () => {
    const out = formatReturnAnchor([candidate({ id: 1, resolutionStatus: "open" })]);
    expect(out).toContain("still unresolved");
  });

  it("tells the model not to recap the anchor back at the user", () => {
    const out = formatReturnAnchor([candidate({ id: 1 })]);
    expect(out).toContain("don't recap them back");
  });

  it("truncates long content", () => {
    const out = formatReturnAnchor([candidate({ id: 1, content: "x".repeat(900) })]);
    expect(out).toContain("…");
    expect(out.length).toBeLessThan(900);
  });
});

describe("personality window", () => {
  it("is wide enough to be less recency-biased than the old 20", () => {
    expect(PERSONALITY_WINDOW).toBeGreaterThan(20);
  });
});
