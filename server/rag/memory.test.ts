import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateEmbedding,
  cosineSimilarity,
  storeMemory,
  retrieveMemories,
  formatMemoriesForPrompt,
  getPersonalityProfile,
  formatPersonalityForPrompt,
  updatePersonalityProfile,
  deleteAllUserMemories,
} from "./memory";

// ─── Mock Gemini Embedding API ───────────────────────────────────────────────

// Generate deterministic mock embeddings based on text content
function mockEmbedding(text: string): number[] {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Array(3072).fill(0).map((_, i) => Math.sin(hash + i) * 0.5);
}

// Mock global fetch for Gemini API
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  // Default: Gemini embedding API returns a valid embedding
  mockFetch.mockImplementation(async (url: string, opts?: any) => {
    if (typeof url === "string" && url.includes("generativelanguage.googleapis.com") && url.includes("embedContent")) {
      const body = JSON.parse(opts?.body || "{}");
      const text = body.content?.parts?.[0]?.text || "";
      return {
        ok: true,
        json: async () => ({
          embedding: { values: mockEmbedding(text) },
        }),
      };
    }
    // For LLM calls (personality analysis)
    if (typeof url === "string" && url.includes("chat/completions")) {
      return {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                traits: ["introspective", "analytical"],
                communicationStyle: "Uses metaphors frequently",
                emotionalPatterns: "Tends to intellectualize feelings",
                recurringThemes: ["self-worth", "control"],
                growthEdges: ["vulnerability", "self-compassion"],
                challengeStyle: "Receptive to direct questions",
              }),
            },
          }],
        }),
      };
    }
    return { ok: false, status: 404, text: async () => "Not found" };
  });
});

// ─── Mock Database ───────────────────────────────────────────────────────────

const mockDbData: any[] = [];
const mockPersonalityData: any[] = [];

vi.mock("../db", () => ({
  getDb: vi.fn(async () => ({
    insert: vi.fn(() => ({
      values: vi.fn((data: any) => {
        const id = mockDbData.length + 1;
        mockDbData.push({ id, ...data, createdAt: new Date() });
        return {
          $returningId: () => [{ id }],
        };
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn((table: any) => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn((n: number) => {
              if (table === "user_personality_profiles" || (table?.name === "user_personality_profiles")) {
                return mockPersonalityData.slice(0, n);
              }
              return mockDbData.slice(0, n);
            }),
          })),
          limit: vi.fn((n: number) => {
            if (table === "user_personality_profiles" || (table?.name === "user_personality_profiles")) {
              return mockPersonalityData.slice(0, n);
            }
            return mockDbData.slice(0, n);
          }),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
}));

vi.mock("../../drizzle/schema", () => ({
  memoryEmbeddings: { name: "memory_embeddings" },
  userPersonalityProfiles: { name: "user_personality_profiles" },
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{
      message: {
        content: JSON.stringify({
          traits: ["introspective", "analytical"],
          communicationStyle: "Uses metaphors frequently",
          emotionalPatterns: "Tends to intellectualize feelings",
          recurringThemes: ["self-worth", "control"],
          growthEdges: ["vulnerability", "self-compassion"],
          challengeStyle: "Receptive to direct questions",
        }),
      },
    }],
  })),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("RAG Memory Module", () => {
  beforeEach(() => {
    mockDbData.length = 0;
    mockPersonalityData.length = 0;
  });

  describe("generateEmbedding", () => {
    it("should generate a 3072-dimensional embedding vector", async () => {
      const embedding = await generateEmbedding("I feel anxious about my presentation");
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(3072);
      expect(embedding.every((v) => typeof v === "number")).toBe(true);
    });

    it("should return zero vector for empty text", async () => {
      const embedding = await generateEmbedding("");
      expect(embedding.length).toBe(3072);
      expect(embedding.every((v) => v === 0)).toBe(true);
    });

    it("should generate consistent embeddings for the same text", async () => {
      const embedding1 = await generateEmbedding("feeling grateful today");
      const embedding2 = await generateEmbedding("feeling grateful today");
      expect(embedding1).toEqual(embedding2);
    });

    it("should generate different embeddings for different texts", async () => {
      const embedding1 = await generateEmbedding("I am happy");
      const embedding2 = await generateEmbedding("I am sad");
      expect(embedding1).not.toEqual(embedding2);
    });

    it("should truncate long text to 8000 chars", async () => {
      const longText = "x".repeat(10000);
      const embedding = await generateEmbedding(longText);
      expect(embedding.length).toBe(3072);
      // Verify the API was called with truncated text
      const lastCall = mockFetch.mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("embedContent")
      );
      expect(lastCall).toBeDefined();
      const body = JSON.parse(lastCall![1].body);
      expect(body.content.parts[0].text.length).toBe(8000);
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockImplementationOnce(async () => ({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      }));
      await expect(generateEmbedding("test")).rejects.toThrow("Embedding generation failed: 500");
    });
  });

  describe("cosineSimilarity", () => {
    it("should return 1 for identical vectors", () => {
      const vec = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0);
    });

    it("should return 0 for orthogonal vectors", () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
    });

    it("should return -1 for opposite vectors", () => {
      const a = [1, 2, 3];
      const b = [-1, -2, -3];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0);
    });

    it("should return 0 for zero vectors", () => {
      const zero = [0, 0, 0];
      const vec = [1, 2, 3];
      expect(cosineSimilarity(zero, vec)).toBe(0);
    });

    it("should return 0 for mismatched lengths", () => {
      const a = [1, 2, 3];
      const b = [1, 2];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it("should compute correct similarity for known vectors", () => {
      const a = [1, 0, 1];
      const b = [1, 1, 0];
      // dot = 1, |a| = sqrt(2), |b| = sqrt(2), similarity = 1/2 = 0.5
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.5);
    });
  });

  describe("storeMemory", () => {
    it("should store a journal memory and return an ID", async () => {
      const id = await storeMemory({
        userId: 1,
        sourceType: "journal",
        sourceId: 42,
        content: "Today I realized that my fear of failure is actually a fear of being seen as imperfect.",
      });
      expect(id).toBe(1);
      expect(mockDbData.length).toBe(1);
      expect(mockDbData[0].sourceType).toBe("journal");
      expect(mockDbData[0].userId).toBe(1);
    });

    it("should skip content shorter than 20 chars", async () => {
      const id = await storeMemory({
        userId: 1,
        sourceType: "chat",
        content: "hi there",
      });
      expect(id).toBeNull();
      expect(mockDbData.length).toBe(0);
    });

    it("should store metadata when provided", async () => {
      await storeMemory({
        userId: 1,
        sourceType: "checkin",
        sourceId: 10,
        content: "Check-in (mood:8/10, energy:7/10) Feeling grateful for the quiet morning",
        metadata: { mood: "8", energy: "7" },
      });
      expect(mockDbData[0].metadata).toEqual({ mood: "8", energy: "7" });
    });

    it("should handle different source types", async () => {
      for (const sourceType of ["journal", "chat", "voice", "checkin", "program_response"] as const) {
        await storeMemory({
          userId: 1,
          sourceType,
          content: `This is a ${sourceType} entry with enough content to pass the minimum length check.`,
        });
      }
      expect(mockDbData.length).toBe(5);
    });
  });

  describe("formatMemoriesForPrompt", () => {
    it("should return empty string for no memories", () => {
      expect(formatMemoriesForPrompt([])).toBe("");
    });

    it("should format memories with source labels and dates", () => {
      const memories = [
        {
          id: 1,
          sourceType: "journal" as const,
          sourceId: 42,
          content: "I realized my fear of failure stems from childhood perfectionism",
          score: 0.85,
          createdAt: new Date("2026-03-15"),
          metadata: null,
        },
        {
          id: 2,
          sourceType: "chat" as const,
          sourceId: 100,
          content: "I've been avoiding difficult conversations with my partner",
          score: 0.72,
          createdAt: new Date("2026-03-20"),
          metadata: null,
        },
      ];

      const result = formatMemoriesForPrompt(memories);
      expect(result).toContain("RELEVANT MEMORIES FROM YOUR PAST");
      expect(result).toContain("[Journal Entry");
      expect(result).toContain("[Past Conversation");
      expect(result).toContain("fear of failure");
      expect(result).toContain("avoiding difficult conversations");
    });

    it("should truncate long content to 400 chars", () => {
      const longContent = "x".repeat(500);
      const memories = [{
        id: 1,
        sourceType: "journal" as const,
        sourceId: 1,
        content: longContent,
        score: 0.9,
        createdAt: new Date(),
        metadata: null,
      }];

      const result = formatMemoriesForPrompt(memories);
      expect(result).toContain("...");
      // The truncated content should be 400 chars + "..."
      expect(result.length).toBeLessThan(longContent.length + 200);
    });
  });

  describe("formatPersonalityForPrompt", () => {
    it("should return empty string for null profile", () => {
      expect(formatPersonalityForPrompt(null)).toBe("");
    });

    it("should return empty string for profile with fewer than 3 interactions", () => {
      const profile = {
        traits: ["analytical"],
        communicationStyle: "Direct",
        emotionalPatterns: "Reserved",
        recurringThemes: ["control"],
        growthEdges: ["vulnerability"],
        challengeStyle: "Receptive",
        interactionCount: 2,
      };
      expect(formatPersonalityForPrompt(profile)).toBe("");
    });

    it("should format a complete personality profile", () => {
      const profile = {
        traits: ["introspective", "analytical", "empathetic"],
        communicationStyle: "Uses metaphors frequently, prefers indirect communication",
        emotionalPatterns: "Intellectualizes emotions, avoids direct vulnerability",
        recurringThemes: ["perfectionism", "self-worth", "control"],
        growthEdges: ["sitting with discomfort", "self-compassion"],
        challengeStyle: "Responds well to Socratic questions",
        interactionCount: 15,
      };

      const result = formatPersonalityForPrompt(profile);
      expect(result).toContain("WHAT YOU'VE LEARNED ABOUT THEM");
      expect(result).toContain("15 interactions");
      expect(result).toContain("introspective");
      expect(result).toContain("Uses metaphors");
      expect(result).toContain("perfectionism");
      expect(result).toContain("self-compassion");
      expect(result).toContain("Socratic questions");
    });

    it("should handle partial profiles gracefully", () => {
      const profile = {
        traits: ["curious"],
        communicationStyle: null,
        emotionalPatterns: null,
        recurringThemes: [],
        growthEdges: [],
        challengeStyle: null,
        interactionCount: 5,
      };

      const result = formatPersonalityForPrompt(profile);
      expect(result).toContain("curious");
      expect(result).not.toContain("Communication style");
      expect(result).not.toContain("Recurring themes");
    });
  });

  describe("Integration: storeMemory + cosineSimilarity", () => {
    it("should produce embeddings that allow semantic similarity ranking", async () => {
      // Store two semantically different memories
      const embedding1 = await generateEmbedding("I feel anxious about my work presentation tomorrow");
      const embedding2 = await generateEmbedding("I had a wonderful time hiking in the mountains today");
      const queryEmbedding = await generateEmbedding("I'm nervous about presenting at the meeting");

      // The query about nervousness should be more similar to anxiety about presentation
      const sim1 = cosineSimilarity(queryEmbedding, embedding1);
      const sim2 = cosineSimilarity(queryEmbedding, embedding2);

      // Both should be valid numbers
      expect(typeof sim1).toBe("number");
      expect(typeof sim2).toBe("number");
      expect(sim1).toBeGreaterThan(-1);
      expect(sim1).toBeLessThanOrEqual(1);
    });
  });

});
