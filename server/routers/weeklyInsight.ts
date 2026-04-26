import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getWeekMirrorSessions,
  getWeekJournalEntries,
  getWeekHabitCompletions,
  getWeekCheckIns,
  calculateWeeklyGrowthScore,
  getSessionMessageCount,
  getTodayCheckIn,
  getLatestWeeklyReflection,
  saveWeeklyInsight,
} from "../db";
import { invokeLLM } from "../_core/llm";
// buildHigherSelfSystemPrompt is defined in routers.ts, we'll use a simplified version here
function buildHigherSelfSystemPromptForWeekly(seedIntent?: string): string {
  return `You are a warm, emotionally intelligent AI mirror reflecting back the user's week. You learn their patterns, celebrate wins, and suggest growth areas. Be personal, non-judgmental, and actionable. ${seedIntent ? `Their current intention is: ${seedIntent}` : ""}`;
}

export const weeklyInsightRouter = router({
  generateWeeklyInsight: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const [sessions, journals, habits, checkIns] = await Promise.all([
          getWeekMirrorSessions(ctx.user.id, weekStart),
          getWeekJournalEntries(ctx.user.id, weekStart),
          getWeekHabitCompletions(ctx.user.id, weekStart),
          getWeekCheckIns(ctx.user.id, weekStart),
        ]);

        const growthScore = await calculateWeeklyGrowthScore(ctx.user.id, weekStart);

        const sessionSummaries = await Promise.all(
          sessions.map(async (s) => {
            const msgCount = await getSessionMessageCount(s.sessionId || "");
            return `- "${s.title || "Untitled"}" (${msgCount} messages)`;
          })
        );

        const journalSummaries = journals.map(
          (j) => `- "${j.title || "Untitled"}" (mood: ${j.moodTag || "untagged"})`
        );

        const habitsByDomain = habits.reduce(
          (acc, h) => {
            if (!acc[h.habitDomain]) acc[h.habitDomain] = 0;
            acc[h.habitDomain]++;
            return acc;
          },
          {} as Record<string, number>
        );

        const habitStr = Object.entries(habitsByDomain)
          .map(([d, c]) => `${d}: ${c}`)
          .join(", ") || "None";
        const avgMood = checkIns.length > 0
          ? (checkIns.reduce((s, c) => s + c.mood, 0) / checkIns.length).toFixed(1)
          : "N/A";
        const avgEnergy = checkIns.length > 0
          ? (checkIns.reduce((s, c) => s + c.energy, 0) / checkIns.length).toFixed(1)
          : "N/A";
        const avgStress = checkIns.length > 0
          ? (checkIns.reduce((s, c) => s + c.stress, 0) / checkIns.length).toFixed(1)
          : "N/A";

        const transcript = `
This week's data:

Mirror Sessions (${sessions.length}):
${sessionSummaries.join("\n") || "None"}

Journal Entries (${journals.length}):
${journalSummaries.join("\n") || "None"}

Habit Completions (${habits.length}):
By domain: ${habitStr}

Daily Check-ins (${checkIns.length}/7):
Avg mood: ${avgMood}/10
Avg energy: ${avgEnergy}/10
Avg stress: ${avgStress}/10`;

        const systemPrompt = buildHigherSelfSystemPromptForWeekly(ctx.user.seedIntent || undefined);
        const isFirstDayOfWeek = now.getDay() === 0;

        const userPrompt = isFirstDayOfWeek
          ? `Reflect on last week's data. Analyze patterns, celebrate wins, suggest next steps. Keep it warm and personal (under 300 words).${transcript}`
          : `Analyze this week's data so far. Notice patterns, celebrate progress, suggest focus areas. Keep it warm and personal (under 300 words).${transcript}`;

        const aiRes = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const insightText = typeof aiRes.choices[0]?.message?.content === "string"
          ? aiRes.choices[0].message.content
          : "";

        const patterns = [
          sessions.length > 3 ? "Consistent Mirror practice" : undefined,
          journals.length > 2 ? "Regular journaling" : undefined,
          habits.length > 5 ? "Strong habit completion" : undefined,
          checkIns.length === 7 ? "Perfect daily check-in streak" : undefined,
        ].filter(Boolean) as string[];

        const actionableSteps = [
          sessions.length === 0 ? "Schedule a Mirror session this week" : undefined,
          habits.length < 3 ? "Complete at least 3 habits this week" : undefined,
          checkIns.length < 5 ? "Aim for daily check-ins" : undefined,
        ].filter(Boolean) as string[];

        await saveWeeklyInsight({
          userId: ctx.user.id,
          weekStart,
          insightText,
          actionableSteps: actionableSteps as string[],
          patterns: patterns as string[],
          growthScore,
        });

        return {
          success: true,
          insight: {
            insightText,
            patterns,
            actionableSteps,
            growthScore,
            weekStart,
          },
        };
      } catch (e) {
        console.error("Weekly insight generation failed:", e);
        return { success: false, error: "Failed to generate insight" };
      }
    }),

  getWeeklyInsightWithDaily: protectedProcedure
    .query(async ({ ctx }) => {
      const today = await getTodayCheckIn(ctx.user.id);
      const weeklyInsight = await getLatestWeeklyReflection(ctx.user.id);

      return {
        daily: today,
        weekly: weeklyInsight,
      };
    }),
});
