/**
 * Time Capsule Delivery Job
 *
 * Heartbeat cron handler that checks all users with active time capsule settings
 * whose nextDeliveryAt has passed, generates their letter, and delivers it.
 *
 * Runs daily at 09:00 UTC. For each eligible user:
 * 1. Collects fingerprints from the configured period
 * 2. Generates the letter via LLM
 * 3. Marks it as delivered
 * 4. Sends a push notification
 * 5. Advances nextDeliveryAt to the next cadence window
 */

import type { Request, Response } from "express";
import { getDb } from "../db";
import { timeCapsuleSettings, psychologicalFingerprints, timeCapsuleLetters } from "../../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";
import { generateAndSaveLetter, markLetterDelivered } from "../timeCapsule/letterGenerator";
import { sendPushNotification } from "../pushNotifications";
import { notifyOwner } from "../_core/notification";

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

export async function timeCapsuleHandler(req: Request, res: Response) {
  try {
    // Verify this is a cron call
    const cronTaskUid = req.headers["x-manus-cron-task-uid"];
    if (!cronTaskUid) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "DB unavailable" });
    }

    const now = new Date();
    console.log(`[TimeCapsule] Delivery job triggered at ${now.toISOString()}`);

    // Find all users whose nextDeliveryAt has passed and time capsule is enabled
    const eligibleSettings = await db
      .select()
      .from(timeCapsuleSettings)
      .where(
        and(
          eq(timeCapsuleSettings.isEnabled, true),
          lte(timeCapsuleSettings.nextDeliveryAt, now)
        )
      );

    if (eligibleSettings.length === 0) {
      return res.json({ ok: true, message: "No users due for delivery", delivered: 0 });
    }

    let deliveredCount = 0;
    let skippedCount = 0;
    let notifiedCount = 0;

    for (const settings of eligibleSettings) {
      try {
        // Calculate period: from (now - cadenceDays) to now
        const periodEnd = now;
        const periodStart = new Date(now.getTime() - settings.cadenceDays * 24 * 60 * 60 * 1000);

        // Generate the letter
        const letter = await generateAndSaveLetter(settings.userId, periodStart, periodEnd);

        if (!letter) {
          // Not enough fingerprints — skip but don't advance the timer
          skippedCount++;
          continue;
        }

        // Get the letter ID from the database (most recent for this user)
        const recentLetters = await db
          .select()
          .from(timeCapsuleLetters)
          .where(eq(timeCapsuleLetters.userId, settings.userId))
          .orderBy(timeCapsuleLetters.generatedAt)
          .limit(1);

        if (recentLetters.length) {
          await markLetterDelivered(recentLetters[0].id);
        }

        deliveredCount++;

        // Advance nextDeliveryAt
        const nextDelivery = new Date(now.getTime() + settings.cadenceDays * 24 * 60 * 60 * 1000);
        await db
          .update(timeCapsuleSettings)
          .set({ nextDeliveryAt: nextDelivery })
          .where(eq(timeCapsuleSettings.userId, settings.userId));

        // Send push notification
        try {
          const sub = await getActivePushSubscription(settings.userId);
          if (sub) {
            const sent = await sendPushNotification(
              sub.endpoint,
              sub.p256dh,
              sub.auth,
              {
                title: "A letter from your past self has arrived",
                body: "Someone who knew you then has something to say.",
                url: "/time-capsule",
                tag: "time-capsule-letter",
              }
            );
            if (sent) notifiedCount++;
          }
        } catch (notifErr) {
          console.error(`[TimeCapsule] Push notification failed for user ${settings.userId}:`, notifErr);
        }
      } catch (userErr) {
        console.error(`[TimeCapsule] Failed for user ${settings.userId}:`, userErr);
        skippedCount++;
      }
    }

    const summary = `Time Capsule delivery: ${deliveredCount} delivered, ${skippedCount} skipped, ${notifiedCount} notified out of ${eligibleSettings.length} eligible`;
    console.log(`[TimeCapsule] ${summary}`);

    if (deliveredCount > 0) {
      await notifyOwner({
        title: "⏳ Time Capsule Letters Delivered",
        content: summary,
      });
    }

    return res.json({
      ok: true,
      delivered: deliveredCount,
      skipped: skippedCount,
      notified: notifiedCount,
      eligible: eligibleSettings.length,
    });
  } catch (error) {
    console.error("[TimeCapsule] Handler error:", error);
    return res.status(500).json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.url, taskUid: req.headers["x-manus-cron-task-uid"] },
      timestamp: new Date().toISOString(),
    });
  }
}
