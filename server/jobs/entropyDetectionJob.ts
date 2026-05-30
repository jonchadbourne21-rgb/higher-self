/**
 * Entropy Detection Engine — Daily Scheduled Job
 *
 * Runs every 24 hours via heartbeat cron.
 * For each active user, calculates their behavioral entropy score
 * and flags those who exceed the threshold for 2 consecutive days.
 *
 * Endpoint: POST /api/scheduled/entropyDetection
 */

import type { Request, Response } from "express";
import {
  calculateAndStoreEntropy,
  getAllActiveUserIds,
  ENTROPY_THRESHOLD,
  CONSECUTIVE_DAYS_REQUIRED,
} from "../db/entropyDetection";

export async function entropyDetectionHandler(req: Request, res: Response) {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    console.log(`[EntropyDetection] Starting daily entropy calculation for ${today}`);

    const userIds = await getAllActiveUserIds();
    console.log(`[EntropyDetection] Processing ${userIds.length} users`);

    let processed = 0;
    let triggered = 0;
    const errors: Array<{ userId: number; error: string }> = [];

    for (const userId of userIds) {
      try {
        const result = await calculateAndStoreEntropy(userId, today);
        processed++;

        if (result.triggered) {
          triggered++;
          console.log(
            `[EntropyDetection] TRIGGERED: User ${userId} — score ${result.score}, ` +
            `${result.consecutiveDaysAbove} consecutive days above ${ENTROPY_THRESHOLD}`
          );
          // Future: trigger re-engagement intervention here
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push({ userId, error: errMsg });
        console.error(`[EntropyDetection] Error processing user ${userId}: ${errMsg}`);
      }
    }

    console.log(
      `[EntropyDetection] Complete: ${processed}/${userIds.length} processed, ` +
      `${triggered} triggered, ${errors.length} errors`
    );

    res.json({
      success: true,
      date: today,
      totalUsers: userIds.length,
      processed,
      triggered,
      errors: errors.length,
      threshold: ENTROPY_THRESHOLD,
      consecutiveDaysRequired: CONSECUTIVE_DAYS_REQUIRED,
    });
  } catch (err) {
    console.error("[EntropyDetection] Fatal error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
