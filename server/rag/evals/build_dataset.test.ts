import { describe, it, expect, vi } from "vitest";

vi.mock("../../db", () => ({ getDb: vi.fn().mockResolvedValue(null) }));

import {
  deriveTopic,
  groupByUser,
  buildEntry,
  serializeDataset,
  parseDataset,
  GROUND_TRUTH_THRESHOLD,
} from "./build_dataset";
import { hashUserId, truncate, PREVIEW_CHARS } from "./types";
import type { SourceType } from "../memory";

/** Unit vector pointing along `axis`, so cosine similarity is easy to reason about. */
function vec(axis: number, dims = 8): number[] {
  const v = new Array(dims).fill(0);
  v[axis] = 1;
  return v;
}

/** Blend of two axes, giving a predictable cosine against each. */
function blend(a: number, b: number, weight: number, dims = 8): number[] {
  const v = new Array(dims).fill(0);
  v[a] = weight;
  v[b] = Math.sqrt(1 - weight * weight);
  return v;
}

function row(
  id: number,
  userId: number,
  embedding: number[],
  overrides: Partial<{ sourceType: SourceType; content: string; metadata: Record<string, string> | null }> = {}
) {
  return {
    id,
    userId,
    sourceType: overrides.sourceType ?? ("journal" as SourceType),
    content: overrides.content ?? `memory ${id}`,
    embedding,
    metadata: overrides.metadata ?? null,
  };
}

describe("deriveTopic", () => {
  it("prefers the theme metadata", () => {
    expect(deriveTopic("anything at all", { theme: "Work Stress" })).toBe("work stress");
  });

  it("falls back to domain, then emotion", () => {
    expect(deriveTopic("x", { domain: "Health" })).toBe("health");
    expect(deriveTopic("x", { emotion: "Grief" })).toBe("grief");
  });

  it("derives from content when metadata is absent", () => {
    const topic = deriveTopic("I keep worrying about deadlines constantly", null);
    expect(topic).toContain("worrying");
  });

  it("preserves accented characters rather than mangling them", () => {
    // A plain [^a-zA-Z0-9] class would turn "café" into "caf".
    expect(deriveTopic("thinking about cafés lately", null)).toContain("cafés");
  });

  it("degrades to a placeholder when there is nothing usable", () => {
    expect(deriveTopic("a b c", null)).toBe("this");
  });
});

describe("groupByUser", () => {
  it("drops users with too few memories to label", () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => row(i, 1, vec(0))),
      ...Array.from({ length: 3 }, (_, i) => row(100 + i, 2, vec(0))),
    ];
    const grouped = groupByUser(rows);
    expect(grouped.has(1)).toBe(true);
    expect(grouped.has(2)).toBe(false);
  });
});

describe("buildEntry", () => {
  it("labels near-identical memories as ground truth", () => {
    const seed = row(1, 42, vec(0));
    const peers = [
      seed,
      row(2, 42, vec(0)), // cosine 1.0
      row(3, 42, blend(0, 1, 0.9)), // cosine 0.9, above threshold
      row(4, 42, vec(1)), // cosine 0, unrelated
    ];

    const entry = buildEntry(seed, peers);
    expect(entry).not.toBeNull();
    expect(entry!.expectedMemoryIds).toEqual([1, 2, 3]);
    expect(entry!.expectedMemoryIds).not.toContain(4);
  });

  it("excludes peers just below the threshold", () => {
    const seed = row(1, 42, vec(0));
    // Cosine 0.7, below the 0.75 bar.
    const peers = [seed, row(2, 42, blend(0, 1, 0.7)), row(3, 42, vec(0))];

    const entry = buildEntry(seed, peers);
    expect(entry!.expectedMemoryIds).toEqual([1, 3]);
  });

  it("returns null when the seed has no neighbours", () => {
    const seed = row(1, 42, vec(0));
    const entry = buildEntry(seed, [seed, row(2, 42, vec(1)), row(3, 42, vec(2))]);
    expect(entry).toBeNull();
  });

  it("always includes the seed itself in ground truth", () => {
    const seed = row(7, 42, vec(0));
    const entry = buildEntry(seed, [seed, row(8, 42, vec(0))]);
    expect(entry!.expectedMemoryIds).toContain(7);
  });

  it("collects source types without duplicates", () => {
    const seed = row(1, 42, vec(0), { sourceType: "journal" });
    const peers = [
      seed,
      row(2, 42, vec(0), { sourceType: "journal" }),
      row(3, 42, vec(0), { sourceType: "voice" }),
    ];
    const entry = buildEntry(seed, peers);
    expect(entry!.sourceTypes.sort()).toEqual(["journal", "voice"]);
  });

  it("uses the threshold constant the module documents", () => {
    expect(GROUND_TRUTH_THRESHOLD).toBe(0.75);
  });
});

describe("privacy contract", () => {
  it("never writes a raw userId to the dataset", () => {
    const seed = row(1, 4242, vec(0));
    const entry = buildEntry(seed, [seed, row(2, 4242, vec(0))])!;

    // In-process the raw id is present, because retrieval needs it.
    expect(entry.userId).toBe(4242);

    const serialized = serializeDataset([entry]);
    expect(serialized).not.toContain("4242");
    expect(JSON.parse(serialized).userId).toBeUndefined();
    expect(JSON.parse(serialized).userIdHash).toBe(hashUserId(4242));
  });

  it("truncates the seed preview to the export limit", () => {
    const long = "x".repeat(PREVIEW_CHARS + 500);
    const seed = row(1, 42, vec(0), { content: long });
    const entry = buildEntry(seed, [seed, row(2, 42, vec(0))])!;

    expect(entry.seedPreview!.length).toBeLessThanOrEqual(PREVIEW_CHARS + 1);
    expect(entry.seedPreview).not.toBe(long);
  });

  it("produces a stable hash for the same user", () => {
    expect(hashUserId(7)).toBe(hashUserId(7));
    expect(hashUserId(7)).not.toBe(hashUserId(8));
  });

  it("does not leak the raw id inside the hash", () => {
    expect(hashUserId(123456)).not.toContain("123456");
  });

  it("truncate leaves short strings untouched", () => {
    expect(truncate("short", 400)).toBe("short");
  });
});

describe("serialize / parse round trip", () => {
  it("round-trips every field except the raw userId", () => {
    const seed = row(1, 42, vec(0), { metadata: { domain: "work" } });
    const entry = buildEntry(seed, [seed, row(2, 42, vec(0))])!;

    const parsed = parseDataset(serializeDataset([entry]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].query).toBe(entry.query);
    expect(parsed[0].expectedMemoryIds).toEqual(entry.expectedMemoryIds);
    expect(parsed[0].domain).toBe("work");
    expect(parsed[0].userId).toBeUndefined();
  });

  it("skips blank lines", () => {
    expect(parseDataset('\n{"query":"a"}\n\n{"query":"b"}\n')).toHaveLength(2);
  });

  it("handles an empty file", () => {
    expect(parseDataset("")).toEqual([]);
  });
});
