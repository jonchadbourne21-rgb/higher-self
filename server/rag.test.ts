import { describe, it, expect, beforeAll, vi } from "vitest";
import { embedText } from "./rag/embeddings";

// Mock the OpenAI client to avoid external API calls
vi.mock("openai", () => {
  return {
    default: vi.fn(() => ({
      embeddings: {
        create: vi.fn(async (params) => {
          // Generate consistent mock embeddings based on input
          let hash = 0;
          const input = typeof params.input === 'string' ? params.input : '';
          
          for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
          }
          
          // Use hash to seed the random generator for consistency
          const seededEmbedding = Array(1536).fill(0).map((_, i) => {
            return Math.sin(hash + i) * 0.5 + 0.5; // Normalize to 0-1 range
          });
          
          return {
            data: [{ embedding: seededEmbedding }],
          };
        }),
      },
    })),
  };
});

describe("RAG Integration", () => {
  // Note: OpenAI client is mocked to avoid external API calls during tests
  describe("embedText", () => {
    it("should generate embeddings using OpenAI API", async () => {
      const text = "I'm feeling anxious about my upcoming presentation";
      const embedding = await embedText(text);

      // Verify embedding is a valid array of numbers
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1536); // text-embedding-3-small dimension
      expect(embedding.every((v) => typeof v === "number")).toBe(true);
    });

    it("should generate consistent embeddings for the same text", async () => {
      const text = "Feeling grateful for today";
      const embedding1 = await embedText(text);
      const embedding2 = await embedText(text);

      // Embeddings should be identical for the same input
      expect(embedding1).toEqual(embedding2);
    });

    it("should generate different embeddings for different texts", async () => {
      const embedding1 = await embedText("I'm happy");
      const embedding2 = await embedText("I'm sad");

      // Embeddings should be different
      expect(embedding1).not.toEqual(embedding2);
    });

    it("should handle empty strings gracefully", async () => {
      const embedding = await embedText("");
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1536);
    });

    it("should handle long text", async () => {
      const longText = "This is a very long journal entry. ".repeat(100);
      const embedding = await embedText(longText);

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1536);
    });
  });

  describe("Environment Variables", () => {
    it("should have PINECONE_API_KEY set", () => {
      expect(process.env.PINECONE_API_KEY).toBeDefined();
      expect(process.env.PINECONE_API_KEY?.length).toBeGreaterThan(0);
    });

    it("should have PINECONE_INDEX_NAME set", () => {
      expect(process.env.PINECONE_INDEX_NAME).toBeDefined();
      expect(process.env.PINECONE_INDEX_NAME).toBe("synapset-journal-embeddings");
    });

    it("should have OPENAI_API_KEY set", () => {
      expect(process.env.OPENAI_API_KEY).toBeDefined();
      expect(process.env.OPENAI_API_KEY?.length).toBeGreaterThan(0);
    });
  });
});
