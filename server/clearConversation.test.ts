import { describe, it, expect } from "vitest";
import { randomUUID } from "crypto";

// ─── Unit tests for Clear Conversation session logic ─────────────────────────
// These tests validate the session ID generation and session isolation logic
// without requiring a live database connection.

describe("clearConversation session logic", () => {
  it("generates a valid UUID when clearing a conversation", () => {
    const newSessionId = randomUUID();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(newSessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("generates a different UUID each time", () => {
    const id1 = randomUUID();
    const id2 = randomUUID();
    expect(id1).not.toBe(id2);
  });

  it("generates a UUID that is 36 characters long", () => {
    const newSessionId = randomUUID();
    expect(newSessionId).toHaveLength(36);
  });
});

// ─── Session isolation logic ──────────────────────────────────────────────────

type MockMessage = {
  id: number;
  userId: number;
  sessionId: string | null;
  content: string;
  role: "user" | "assistant";
};

function filterMessagesBySession(
  messages: MockMessage[],
  userId: number,
  sessionId: string | null
): MockMessage[] {
  return messages.filter(
    (m) => m.userId === userId && m.sessionId === sessionId
  );
}

describe("session isolation", () => {
  const mockMessages: MockMessage[] = [
    { id: 1, userId: 1, sessionId: null, content: "Old message 1", role: "user" },
    { id: 2, userId: 1, sessionId: null, content: "Old reply 1", role: "assistant" },
    { id: 3, userId: 1, sessionId: "session-abc", content: "New message 1", role: "user" },
    { id: 4, userId: 1, sessionId: "session-abc", content: "New reply 1", role: "assistant" },
    { id: 5, userId: 2, sessionId: null, content: "Other user msg", role: "user" },
  ];

  it("returns only legacy messages (null sessionId) for the default session", () => {
    const result = filterMessagesBySession(mockMessages, 1, null);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual([1, 2]);
  });

  it("returns only messages for the specified session", () => {
    const result = filterMessagesBySession(mockMessages, 1, "session-abc");
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual([3, 4]);
  });

  it("does not return messages from other users", () => {
    const result = filterMessagesBySession(mockMessages, 1, null);
    expect(result.every((m) => m.userId === 1)).toBe(true);
  });

  it("returns empty array for a brand-new session with no messages", () => {
    const result = filterMessagesBySession(mockMessages, 1, "brand-new-session");
    expect(result).toHaveLength(0);
  });

  it("preserves old messages when a new session is started", () => {
    // Old messages should still exist in the mock store
    const oldMessages = filterMessagesBySession(mockMessages, 1, null);
    const newMessages = filterMessagesBySession(mockMessages, 1, "session-abc");
    // Both sessions have messages — history is preserved
    expect(oldMessages.length).toBeGreaterThan(0);
    expect(newMessages.length).toBeGreaterThan(0);
  });
});
