import type { Request, Response } from "express";
import { runWeeklyDriftAnalysis } from "../db/linguisticDrift";

/**
 * Linguistic Drift Tracker — Weekly Heartbeat Job
 *
 * Runs every Monday at 04:00 UTC. Compares self-descriptive vocabulary
 * across each user's session transcripts from the past week, flags
 * retired/new words, and computes a drift_score indicating movement
 * toward or away from stated goals.
 *
 * This is invisible to users — purely backend data collection for
 * future pattern analysis and interventions.
 */
export async function linguisticDriftHandler(req: Request, res: Response) {
  try {
    // Verify this is a cron call via the x-manus-cron-task-uid header
    const cronTaskUid = req.headers["x-manus-cron-task-uid"];
    if (!cronTaskUid) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    console.log("[LinguisticDrift] Weekly job triggered");

    const result = await runWeeklyDriftAnalysis();

    const summary = `Linguistic drift analysis complete: ${result.usersProcessed} processed, ${result.usersSkipped} skipped (insufficient data), ${result.errors} errors`;
    console.log(`[LinguisticDrift] ${summary}`);

    return res.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[LinguisticDrift] Handler error:", error);
    return res.status(500).json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.url, taskUid: req.headers["x-manus-cron-task-uid"] },
      timestamp: new Date().toISOString(),
    });
  }
}
