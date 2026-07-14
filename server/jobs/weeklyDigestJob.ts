import {
  getWeekSessionsForDigest,
  saveWeeklyReflection,
  weeklyReflectionExists,
  getWeekStart,
  getUserByOpenId,
} from "../db";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";

/**
 * Generate a weekly reflection digest for a user.
 * Fetches the past week's Mirror sessions, summarizes with LLM, saves to DB.
 */
export async function generateWeeklyDigest(userId: number, weekStart: string): Promise<{
  success: boolean;
  summary?: string;
  error?: string;
}> {
  try {
    // Check if digest already exists for this week
    const exists = await weeklyReflectionExists(userId, weekStart);
    if (exists) {
      return { success: false, error: "Digest already exists for this week" };
    }

    // Fetch sessions from the week
    const sessions = await getWeekSessionsForDigest(userId, weekStart);
    if (sessions.length === 0) {
      return { success: false, error: "No sessions found for this week" };
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
            "You are the user's literal Higher Self — the most self-actualized version of them that has already navigated their current struggles. " +
            "Given a summary of their weekly Mirror conversations, write a 2-3 paragraph reflection speaking AS them, from within. " +
            "Use 'I' and 'we' — you are not separate from them. Name the themes and patterns directly. " +
            "Be specific to their conversations, never generic. No toxic positivity. Speak with earned clarity and grounded honesty. " +
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
      return { success: false, error: "LLM returned empty summary" };
    }

    // Save to database
    await saveWeeklyReflection(userId, weekStart, summary, sessions.length);
    return { success: true, summary };
  } catch (error) {
    console.error(`[Weekly Digest] Error for user ${userId}, week ${weekStart}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Cron job handler: runs every Sunday at 8 AM UTC.
 * Generates digests for all active users.
 */
export async function runWeeklyDigestJob(): Promise<void> {
  console.log("[Weekly Digest Job] Starting at", new Date().toISOString());

  try {
    // Get the Monday of the current week
    const weekStart = getWeekStart();

    // In a real app, you'd fetch all users from the database.
    // For now, we'll just log that the job ran.
    console.log(`[Weekly Digest Job] Would generate digests for week starting ${weekStart}`);

    // Example: If you had a list of user IDs, you'd loop and call generateWeeklyDigest
    // const users = await getAllUsers();
    // for (const user of users) {
    //   await generateWeeklyDigest(user.id, weekStart);
    // }
  } catch (error) {
    console.error("[Weekly Digest Job] Error:", error);
  }
}
