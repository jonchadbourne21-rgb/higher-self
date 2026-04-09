import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe.skip("Onboarding Router - saveSeedIntent", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testUserId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Create a test user
    const result = await db
      .insert(users)
      .values({
        openId: `test-onboarding-${Date.now()}`,
        name: "Test User",
        email: "test@example.com",
        loginMethod: "oauth",
        role: "user",
        onboardingCompleted: false,
      });

    // Get the inserted user ID
    const inserted = await db
      .select()
      .from(users)
      .where(eq(users.openId, `test-onboarding-${Date.now()}`))
      .limit(1);

    testUserId = inserted[0]?.id || 0;
  });

  afterAll(async () => {
    if (db && testUserId) {
      // Clean up test user
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("should save seed intent to user record", async () => {
    if (!db || !testUserId) throw new Error("Setup failed");

    const seedIntent = "Inner Peace";

    // Simulate the saveSeedIntent mutation
    await db.update(users).set({ seedIntent }).where(eq(users.id, testUserId));

    // Verify the seed intent was saved
    const updated = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(updated[0]?.seedIntent).toBe(seedIntent);
  });

  it("should accept valid seed intents", async () => {
    if (!db || !testUserId) throw new Error("Setup failed");

    const validIntents = ["Inner Peace", "Clarity", "Confidence", "Healing", "Focus"];

    for (const intent of validIntents) {
      await db.update(users).set({ seedIntent: intent }).where(eq(users.id, testUserId));

      const updated = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(updated[0]?.seedIntent).toBe(intent);
    }
  });

  it("should update seed intent if already set", async () => {
    if (!db || !testUserId) throw new Error("Setup failed");

    // Set initial intent
    await db.update(users).set({ seedIntent: "Inner Peace" }).where(eq(users.id, testUserId));

    // Update to different intent
    await db.update(users).set({ seedIntent: "Clarity" }).where(eq(users.id, testUserId));

    const updated = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(updated[0]?.seedIntent).toBe("Clarity");
  });
});
