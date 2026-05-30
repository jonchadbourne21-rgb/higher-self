/**
 * 30-Day Letter Job (First-Strike Roadmap — Step 3)
 *
 * Runs daily. Checks all users for 30-day eligibility (30+ days since first
 * session fingerprint, 4+ fingerprints). Generates and delivers the letter
 * via push notification. Tracks engagement metrics.
 */

import type { Request, Response } from "express";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import {
  checkEligibility,
  generateAndSaveThirtyDayLetter,
  getEngagementMetrics,
} from "../timeCapsule/thirtyDayLetter";
import { sendPushNotification } from "../pushNotifications";
import { notifyOwner } from "../_core/notification";
import { eq } from "drizzle-orm";

async function getActivePushSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const { pushSubscriptions } = await import("../../drizzle/schema");
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .limit(1);
  return subs.length ? subs[0] : null;
}

async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name }).from(users);
}

export async function thirtyDayLetterHandler(req: Request, res: Response) {
  try {
    // Verify this is a cron call
    const cronTaskUid = req.headers["x-manus-cron-task-uid"];
    if (!cronTaskUid) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    console.log("[30DayLetter] Daily eligibility check triggered");

    const allUsers = await getAllUsers();
    if (allUsers.length === 0) {
      return res.json({ ok: true, message: "No users found", generated: 0 });
    }

    let generatedCount = 0;
    let skippedCount = 0;
    let notifiedCount = 0;
    const errors: string[] = [];

    for (const user of allUsers) {
      try {
        // Check eligibility
        const eligibility = await checkEligibility(user.id);

        if (!eligibility.eligible) {
          skippedCount++;
          continue;
        }

        // Generate the letter
        console.log(
          `[30DayLetter] User ${user.id} eligible (${eligibility.daysSinceFirstSession} days, ${eligibility.fingerprintCount} fingerprints). Generating...`
        );

        const success = await generateAndSaveThirtyDayLetter(user.id);
        if (!success) {
          skippedCount++;
          continue;
        }

        generatedCount++;

        // Send push notification
        try {
          const sub = await getActivePushSubscription(user.id);
          if (sub) {
            const sent = await sendPushNotification(
              sub.endpoint,
              sub.p256dh,
              sub.auth,
              {
                title: "A letter from 30 days ago",
                body: "Someone who was you wrote this. You should read it.",
                url: "/time-capsule",
                tag: "thirty-day-letter",
              }
            );
            if (sent) notifiedCount++;
          }
        } catch (notifErr) {
          console.error(`[30DayLetter] Push notification failed for user ${user.id}:`, notifErr);
        }
      } catch (userErr) {
        const errMsg = `User ${user.id}: ${String(userErr)}`;
        errors.push(errMsg);
        console.error(`[30DayLetter] Error for user ${user.id}:`, userErr);
      }
    }

    // Get engagement metrics for reporting
    const metrics = await getEngagementMetrics();

    const summary = `30-Day Letter job: ${generatedCount} generated, ${skippedCount} skipped, ${notifiedCount} notified out of ${allUsers.length} users. Metrics: ${JSON.stringify(metrics)}`;
    console.log(`[30DayLetter] ${summary}`);

    if (generatedCount > 0) {
      await notifyOwner({
        title: "📬 30-Day Letters Delivered",
        content: `${generatedCount} letter(s) generated and delivered.\n\nEngagement metrics:\n- Open rate: ${metrics?.openRate ?? 0}%\n- Re-engagement within 48h: ${metrics?.reEngagementRate ?? 0}%\n- Session start rate: ${metrics?.sessionStartRate ?? 0}%`,
      });
    }

    return res.json({
      ok: true,
      generated: generatedCount,
      skipped: skippedCount,
      notified: notifiedCount,
      total: allUsers.length,
      errors: errors.length > 0 ? errors : undefined,
      engagementMetrics: metrics,
    });
  } catch (error) {
    console.error("[30DayLetter] Handler error:", error);
    return res.status(500).json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.url, taskUid: req.headers["x-manus-cron-task-uid"] },
      timestamp: new Date().toISOString(),
    });
  }
}
