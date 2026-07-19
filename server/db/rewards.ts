import { rewardPointsHistory } from "../../drizzle/schema";
import { getDb } from "../db";

type RewardSource = "habit" | "journal" | "chat" | "checkin" | "spin" | "redemption";

/**
 * Add reward points to a user
 */
export async function addRewardPoints(
  userId: number,
  points: number,
  source: RewardSource,
  sourceId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db.insert(rewardPointsHistory).values({
    userId,
    points,
    source,
    sourceId,
  });
}
