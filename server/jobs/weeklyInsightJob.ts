/**
 * Weekly Insight Job — Heartbeat Handler
 * ────────────────────────────────────────
 * Called every Sunday at 8 AM UTC by the Manus Heartbeat cron.
 * POST /api/scheduled/weeklyInsight
 *
 * For each user who had any activity this week, generates a personalized
 * AI growth reflection aggregating:
 *   - Mirror (chat) sessions
 *   - Journal entries
 *   - Habit completions
 *   - Daily check-ins
 *   - Goal progress
 *
 * Idempotent: skips users who already have an insight for this week.
 */

import { Request, Response } from "express";
import {
  getAllUsers,
  getWeekMirrorSessions,
  getWeekJournalEntries,
  getWeekHabitCompletions,
  getWeekCheckIns,
  calculateWeeklyGrowthScore,
  getSessionMessageCount,
  saveWeeklyInsight,
  getActivePushSubscription,
} from "../db";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";
import { sendPushNotification } from "../pushNotifications";
import { getDb } from "../db";
import { weeklyInsights, users, userProfiles } from "../../drizzle/schema";
import { eq, and, gte, lt } from "drizzle-orm";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekStart(): Date {
  const now = new Date();
  const weekStart = new Date(now);
  // Go back to Sunday (start of current week)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

async function insightExistsForWeek(userId: number, weekStart: Date): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const rows = await db
    .select({ id: weeklyInsights.id })
    .from(weeklyInsights)
    .where(
      and(
        eq(weeklyInsights.userId, userId),
        gte(weeklyInsights.weekStart, weekStart),
        lt(weeklyInsights.weekStart, weekEnd)
      )
    )
    .limit(1);
  return rows.length > 0;
}

async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ seedIntent: users.seedIntent, name: users.name, coreValues: userProfiles.coreValues, shortTermGoals: userProfiles.shortTermGoals })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] || null;
}

async function generateInsightForUser(userId: number, weekStart: Date): Promise<boolean> {
  try {
    // Skip if already generated this week
    const exists = await insightExistsForWeek(userId, weekStart);
    if (exists) return false;

    // Aggregate all data in parallel
    const [sessions, journals, habits, checkIns, growthScore, profile] = await Promise.all([
      getWeekMirrorSessions(userId, weekStart),
      getWeekJournalEntries(userId, weekStart),
      getWeekHabitCompletions(userId, weekStart),
      getWeekCheckIns(userId, weekStart),
      calculateWeeklyGrowthScore(userId, weekStart),
      getUserProfile(userId),
    ]);

    // Skip users with zero activity this week
    const totalActivity = sessions.length + journals.length + habits.length + checkIns.length;
    if (totalActivity === 0) return false;

    // Build session summaries with message counts
    const sessionSummaries = await Promise.all(
      sessions.map(async (s) => {
        const msgCount = await getSessionMessageCount(s.sessionId || "");
        return `- "${s.title || "Untitled session"}" (${msgCount} messages)`;
      })
    );

    // Build journal summaries
    const journalSummaries = journals.map(
      (j) => `- "${j.title || "Untitled"}" (mood: ${j.moodTag || "untagged"})${j.content ? `\n  Excerpt: ${j.content.slice(0, 150)}...` : ""}`
    );

    // Group habits by domain
    const habitsByDomain = habits.reduce(
      (acc, h) => {
        const domain = h.habitDomain || "general";
        if (!acc[domain]) acc[domain] = 0;
        acc[domain]++;
        return acc;
      },
      {} as Record<string, number>
    );
    const habitStr =
      Object.entries(habitsByDomain)
        .map(([d, c]) => `${d}: ${c} completions`)
        .join(", ") || "None";

    // Check-in averages
    const avgMood =
      checkIns.length > 0
        ? (checkIns.reduce((s, c) => s + c.mood, 0) / checkIns.length).toFixed(1)
        : "N/A";
    const avgEnergy =
      checkIns.length > 0
        ? (checkIns.reduce((s, c) => s + c.energy, 0) / checkIns.length).toFixed(1)
        : "N/A";
    const avgStress =
      checkIns.length > 0
        ? (checkIns.reduce((s, c) => s + c.stress, 0) / checkIns.length).toFixed(1)
        : "N/A";

    // Gratitude and reflection excerpts from check-ins
    const gratitudeNotes = checkIns
      .filter((c) => c.gratitude)
      .map((c) => `- "${c.gratitude}"`)
      .slice(0, 3)
      .join("\n");

    const reflectionNotes = checkIns
      .filter((c) => c.reflection)
      .map((c) => `- "${c.reflection}"`)
      .slice(0, 3)
      .join("\n");

    // Build the full transcript for the AI
    const transcript = `
WEEKLY ACTIVITY SUMMARY (${weekStart.toDateString()} — ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toDateString()}):

Mirror Sessions (${sessions.length}):
${sessionSummaries.join("\n") || "None this week"}

Journal Entries (${journals.length}):
${journalSummaries.join("\n") || "None this week"}

Habit Completions (${habits.length} total):
${habitStr}

Daily Check-ins (${checkIns.length}/7 days):
  Avg mood: ${avgMood}/10
  Avg energy: ${avgEnergy}/10
  Avg stress: ${avgStress}/10
${gratitudeNotes ? `\nGratitude notes:\n${gratitudeNotes}` : ""}
${reflectionNotes ? `\nReflection notes:\n${reflectionNotes}` : ""}

Growth Score: ${growthScore}/100
${profile?.shortTermGoals ? `\nUser's current goals: ${profile.shortTermGoals}` : ""}
${profile?.coreValues && Array.isArray(profile.coreValues) && profile.coreValues.length > 0 ? `\nCore values: ${(profile.coreValues as string[]).join(", ")}` : ""}
`;

    const systemPrompt = `You are a deeply empathetic, psychologically insightful AI mirror named Mirrored. You help people grow through radical self-awareness.

Your role: Write a warm, personal Sunday reflection for ${profile?.name || "this user"} based on their week's data. 

Guidelines:
- Be specific to THEIR actual data, not generic
- Celebrate genuine wins and consistency
- Notice emotional patterns from check-ins and journals
- Ask one powerful self-awareness question at the end
- Suggest 2-3 concrete, actionable next steps
- Tone: warm, honest, like a wise friend who sees them clearly
- Length: 250-350 words
${profile?.seedIntent ? `- Their current intention: "${profile.seedIntent}"` : ""}`;

    const userPrompt = `Here is ${profile?.name || "the user"}'s week. Write their Sunday reflection:\n${transcript}`;

    const aiRes = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const insightText =
      typeof aiRes.choices[0]?.message?.content === "string"
        ? aiRes.choices[0].message.content
        : "";

    if (!insightText) {
      console.warn(`[WeeklyInsight] LLM returned empty insight for user ${userId}`);
      return false;
    }

    // Derive patterns and action steps from the data
    const patterns = [
      sessions.length >= 3 ? "Consistent Mirror practice this week" : undefined,
      journals.length >= 2 ? "Regular journaling habit" : undefined,
      habits.length >= 5 ? "Strong habit completion" : undefined,
      checkIns.length === 7 ? "Perfect daily check-in streak — 7/7!" : undefined,
      parseFloat(avgMood) >= 7 ? "Positive mood trend this week" : undefined,
      parseFloat(avgStress) >= 7 ? "High stress detected — worth addressing" : undefined,
    ].filter(Boolean) as string[];

    const actionableSteps = [
      sessions.length === 0 ? "Start a Mirror session this week to deepen self-reflection" : undefined,
      habits.length < 3 ? "Complete at least 3 habits next week to build momentum" : undefined,
      checkIns.length < 5 ? "Aim for daily check-ins — consistency is the key" : undefined,
      journals.length === 0 ? "Write one journal entry this week to capture your thoughts" : undefined,
    ].filter(Boolean) as string[];

    // Save to database
    await saveWeeklyInsight({
      userId,
      weekStart,
      insightText,
      actionableSteps,
      patterns,
      growthScore,
    });

    console.log(`[WeeklyInsight] Generated insight for user ${userId} (score: ${growthScore})`);
    return true;
  } catch (error) {
    console.error(`[WeeklyInsight] Error for user ${userId}:`, error);
    return false;
  }
}

// ── Express Handler ───────────────────────────────────────────────────────────

export async function weeklyInsightHandler(req: Request, res: Response) {
  try {
    // Verify this is a cron call via the x-manus-cron-task-uid header
    const cronTaskUid = req.headers["x-manus-cron-task-uid"];
    if (!cronTaskUid) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    const weekStart = getWeekStart();
    console.log(`[WeeklyInsight] Job triggered for week starting ${weekStart.toDateString()}`);

    const allUsers = await getAllUsers();
    if (allUsers.length === 0) {
      return res.json({ ok: true, message: "No users found", generated: 0 });
    }

    let successCount = 0;
    let skippedCount = 0;

    let notifiedCount = 0;
    for (const user of allUsers) {
      const generated = await generateInsightForUser(user.id, weekStart);
      if (generated) {
        successCount++;
        // Send push notification to the user if they have an active subscription
        try {
          const sub = await getActivePushSubscription(user.id);
          if (sub) {
            const sent = await sendPushNotification(
              sub.endpoint,
              sub.p256dh,
              sub.auth,
              {
                title: "Your weekly reflection is ready 🌟",
                body: "Your Higher Self has prepared your personalized growth insight for this week.",
                url: "/dashboard",
                tag: "weekly-insight",
              }
            );
            if (sent) notifiedCount++;
          }
        } catch (notifErr) {
          console.error(`[WeeklyInsight] Push notification failed for user ${user.id}:`, notifErr);
        }
      } else {
        skippedCount++;
      }
    }

    const summary = `Weekly insight job complete: ${successCount} generated, ${skippedCount} skipped, ${notifiedCount} push notifications sent out of ${allUsers.length} users`;
    console.log(`[WeeklyInsight] ${summary}`);

    // Notify the owner with a summary
    await notifyOwner({
      title: "📊 Weekly Insight Job Complete",
      content: summary,
    });

    return res.json({
      ok: true,
      generated: successCount,
      skipped: skippedCount,
      notified: notifiedCount,
      total: allUsers.length,
      weekStart: weekStart.toISOString(),
    });
  } catch (error) {
    console.error("[WeeklyInsight] Handler error:", error);
    return res.status(500).json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.url, taskUid: req.headers["x-manus-cron-task-uid"] },
      timestamp: new Date().toISOString(),
    });
  }
}
