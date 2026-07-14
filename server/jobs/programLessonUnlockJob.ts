/**
 * Program Lesson Unlock Notification Job
 *
 * Heartbeat cron handler that runs daily at 11:00 UTC (≈ 6 AM EST).
 * For each user with an active program enrollment who completed a lesson
 * the previous day, sends a push notification that their next lesson is unlocked.
 */
import type { Request, Response } from "express";
import { getDb } from "../db";
import {
  userProgramEnrollments,
  userLessonResponses,
  programLessons,
  growthPrograms,
  pushSubscriptions,
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { sendPushNotification } from "../pushNotifications";

/**
 * Get the active push subscription for a user (most recent).
 */
async function getActivePushSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .limit(1);
  return subs.length ? subs[0] : null;
}

export async function programLessonUnlockHandler(req: Request, res: Response) {
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
    console.log(`[ProgramUnlock] Job triggered at ${now.toISOString()}`);

    // Find all active enrollments (in_progress)
    const activeEnrollments = await db
      .select()
      .from(userProgramEnrollments)
      .where(eq(userProgramEnrollments.status, "in_progress"));

    if (activeEnrollments.length === 0) {
      console.log("[ProgramUnlock] No active enrollments found");
      return res.json({ processed: 0 });
    }

    let notificationsSent = 0;

    for (const enrollment of activeEnrollments) {
      try {
        // Get the most recent lesson response for this enrollment
        const [latestResponse] = await db
          .select()
          .from(userLessonResponses)
          .where(
            and(
              eq(userLessonResponses.userId, enrollment.userId),
              eq(userLessonResponses.programId, enrollment.programId)
            )
          )
          .orderBy(desc(userLessonResponses.completedAt))
          .limit(1);

        if (!latestResponse) continue;

        // Check if the latest response was completed yesterday (within the last 24h window)
        const completedAt = new Date(latestResponse.completedAt);
        const hoursSinceCompletion =
          (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);

        // Only notify if lesson was completed between 6-30 hours ago
        // (i.e., yesterday's lesson, not today's or older)
        if (hoursSinceCompletion < 6 || hoursSinceCompletion > 30) continue;

        // Get the next day's lesson info
        const nextDay = latestResponse.day + 1;
        const [nextLesson] = await db
          .select()
          .from(programLessons)
          .where(
            and(
              eq(programLessons.programId, enrollment.programId),
              eq(programLessons.day, nextDay)
            )
          )
          .limit(1);

        if (!nextLesson) continue; // No more lessons (program complete)

        // Get program name for the notification
        const [program] = await db
          .select()
          .from(growthPrograms)
          .where(eq(growthPrograms.id, enrollment.programId))
          .limit(1);

        if (!program) continue;

        // Get push subscription
        const sub = await getActivePushSubscription(enrollment.userId);
        if (!sub) continue;

        // Send the notification
        const sent = await sendPushNotification(
          sub.endpoint,
          sub.p256dh,
          sub.auth,
          {
            title: `Day ${nextDay} is unlocked 🔓`,
            body: `${program.name}: "${nextLesson.title}" is ready for you.`,
            icon: "/icon-192.png",
            badge: "/badge-72.png",
            url: `/programs/${program.slug}`,
            tag: `program-unlock-${enrollment.programId}-day-${nextDay}`,
          }
        );

        if (sent) {
          notificationsSent++;
          console.log(
            `[ProgramUnlock] Notified user ${enrollment.userId} — Day ${nextDay} of "${program.name}"`
          );
        }
      } catch (innerErr) {
        console.error(
          `[ProgramUnlock] Error for enrollment ${enrollment.id}:`,
          innerErr
        );
      }
    }

    console.log(
      `[ProgramUnlock] Done. Sent ${notificationsSent} notifications.`
    );
    return res.json({
      processed: activeEnrollments.length,
      notificationsSent,
    });
  } catch (err) {
    console.error("[ProgramUnlock] Job error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
