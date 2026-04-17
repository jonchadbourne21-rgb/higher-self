/**
 * Weekly Digest Scheduler
 * ──────────────────────
 * Runs every Sunday at 8 AM UTC to generate weekly reflection digests
 * for all users who had Mirror sessions that week.
 */

import {
  getWeekStart,
  weeklyReflectionExists,
  getWeekSessionsForDigest,
  saveWeeklyReflection,
  getAllUsers,
} from "../db";
import { invokeLLM } from "../_core/llm";

// ── Scheduler state ───────────────────────────────────────────────────────────

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Generate a weekly digest for a single user.
 * Returns true if digest was generated, false if skipped.
 */
async function generateDigestForUser(userId: number, weekStart: string): Promise<boolean> {
  try {
    // Check if digest already exists
    const exists = await weeklyReflectionExists(userId, weekStart);
    if (exists) {
      return false; // Already generated
    }

    // Fetch sessions from the week
    const sessions = await getWeekSessionsForDigest(userId, weekStart);
    if (sessions.length === 0) {
      return false; // No sessions this week
    }

    // Build a transcript of the week's conversations
    const sessionSummaries = sessions
      .map((s) => {
        const title = s.title ? `"${s.title}"` : `Session (${s.messageCount} messages)`;
        const preview = s.content.slice(0, 300);
        return `${title}:\n${preview}...`;
      })
      .join("\n\n");

    const transcript = `This week's Mirror sessions:\n\n${sessionSummaries}`;

    // Call LLM to generate a digest
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a thoughtful reflection guide. Given a summary of someone's weekly Mirror conversations, " +
            "write a warm, insightful 2-3 paragraph reflection on the themes, patterns, and growth they explored. " +
            "Be specific to their conversations, avoid generic advice, and celebrate their self-awareness. " +
            "Keep it under 300 words.",
        },
        {
          role: "user",
          content: transcript,
        },
      ],
    });

    const rawContent = response?.choices?.[0]?.message?.content;
    const summary = typeof rawContent === "string" ? rawContent.trim() : "";
    if (!summary) {
      console.warn(`[Weekly Digest] LLM returned empty summary for user ${userId}`);
      return false;
    }

    // Save to database
    await saveWeeklyReflection(userId, weekStart, summary, sessions.length);
    console.log(`[Weekly Digest] Generated digest for user ${userId}, week ${weekStart}`);
    return true;
  } catch (error) {
    console.error(`[Weekly Digest] Error for user ${userId}, week ${weekStart}:`, error);
    return false;
  }
}

/**
 * Main scheduler function: runs every Sunday at 8 AM UTC.
 */
export function startWeeklyDigestScheduler() {
  if (schedulerInterval) return; // already running
  console.log("[Weekly Digest] Scheduler started");

  schedulerInterval = setInterval(async () => {
    const nowUtc = new Date();
    const utcDay = nowUtc.getUTCDay(); // 0 = Sunday
    const utcHour = nowUtc.getUTCHours();
    const utcMinute = nowUtc.getUTCMinutes();

    // Only run on Sunday at 8 AM UTC, and only once per hour at minute 0
    if (utcDay !== 0 || utcHour !== 8 || utcMinute !== 0) {
      return;
    }

    console.log("[Weekly Digest] Running weekly digest job");

    try {
      const weekStart = getWeekStart();
      const users = await getAllUsers();

      if (users.length === 0) {
        console.log("[Weekly Digest] No users found");
        return;
      }

      let successCount = 0;
      for (const user of users) {
        const generated = await generateDigestForUser(user.id, weekStart);
        if (generated) successCount++;
      }

      console.log(
        `[Weekly Digest] Job complete: ${successCount}/${users.length} users generated digests`
      );
    } catch (error) {
      console.error("[Weekly Digest] Scheduler error:", error);
    }
  }, 60_000); // check every minute
}

/**
 * Stop the scheduler.
 */
export function stopWeeklyDigestScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Weekly Digest] Scheduler stopped");
  }
}
