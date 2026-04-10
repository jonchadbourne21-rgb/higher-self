import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, saveSeedIntent, getUserByOpenId } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("QuickOnboarding Integration", () => {
  let testUserId: number;
  const testOpenId = `test-user-${Date.now()}`;

  beforeAll(async () => {
    // Create a test user
    const db = await getDb();
    if (!db) {
      console.warn("[Test] Database not available");
      return;
    }

    // Insert test user
    await db.insert(users).values({
      openId: testOpenId,
      name: "Test User",
      email: "test@example.com",
      onboardingCompleted: true,
    });

    // Get the user ID
    const result = await db
      .select()
      .from(users)
      .where(eq(users.openId, testOpenId))
      .limit(1);

    if (result[0]) {
      testUserId = result[0].id;
    }
  });

  afterAll(async () => {
    // Clean up test user
    const db = await getDb();
    if (!db || !testUserId) return;

    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("should save seedIntent to user record", async () => {
    if (!testUserId) {
      console.warn("[Test] Skipping: test user not created");
      return;
    }

    const testIntent = "clarity";
    await saveSeedIntent(testUserId, testIntent);

    const db = await getDb();
    if (!db) return;

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(result[0]?.seedIntent).toBe(testIntent);
  });

  it("should allow updating seedIntent", async () => {
    if (!testUserId) {
      console.warn("[Test] Skipping: test user not created");
      return;
    }

    await saveSeedIntent(testUserId, "inner-peace");

    const db = await getDb();
    if (!db) return;

    let result = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(result[0]?.seedIntent).toBe("inner-peace");

    // Update to different intent
    await saveSeedIntent(testUserId, "focus");

    result = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(result[0]?.seedIntent).toBe("focus");
  });

  it("should handle all valid seedIntent values", async () => {
    if (!testUserId) {
      console.warn("[Test] Skipping: test user not created");
      return;
    }

    const validIntents = [
      "inner-peace",
      "clarity",
      "confidence",
      "healing",
      "focus",
    ];

    for (const intent of validIntents) {
      await saveSeedIntent(testUserId, intent);

      const db = await getDb();
      if (!db) continue;

      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(result[0]?.seedIntent).toBe(intent);
    }
  });
});
