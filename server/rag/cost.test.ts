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
  embeddingCacheStats,
  clearEmbeddingCache,
  generateEmbedding,
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
    // A new user going from 3 to 8 memories in one evening should not wait 6h
    // for the Mirror to learn who they are.
    expect(
      shouldReanalysePersonality({
        lastAnalyzedAt: hoursAgo(0.5),
        analyzedInteractionCount: 3,
        currentMemoryCount: 3 + PERSONALITY_MIN_NEW_MEMORIES,
        now: NOW,
      })
    ).toBe(true);
  });

  it("does not run early for a handful of new memories", () => {
    expect(
      shouldReanalysePersonality({
        lastAnalyzedAt: hoursAgo(0.5),
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
        lastAnalyzedAt: hoursAgo(1),
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
