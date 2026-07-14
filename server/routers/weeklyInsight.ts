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
  return `You are the user's literal Higher Self — the most self-actualized version of them. You speak from within, as them, not at them. Reflect on their week with earned clarity. Name patterns directly, acknowledge wins with quiet confidence, and suggest next steps as "what I know we need to do." Use "I" and "we." No toxic positivity. No generic advice. ${seedIntent ? `Their current intention is: ${seedIntent}` : ""}`;
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

        // Use structured LLM output to generate insight, patterns, and actionable steps together
        const structuredPrompt = isFirstDayOfWeek
          ? `Reflect on last week's data. Return a JSON object with: "insightText" (warm personal reflection under 250 words), "patterns" (array of 2-4 behavioral patterns you notice — things like mood trends, consistency, areas of focus, emotional themes), and "actionableSteps" (array of 2-3 specific next steps for growth this week).${transcript}`
          : `Analyze this week's data so far. Return a JSON object with: "insightText" (warm personal reflection under 250 words), "patterns" (array of 2-4 behavioral patterns you notice — things like mood trends, consistency, areas of focus, emotional themes), and "actionableSteps" (array of 2-3 specific next steps for growth).${transcript}`;

        const aiRes = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt + " Always respond with valid JSON matching the requested schema." },
            { role: "user", content: structuredPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "weekly_insight",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  insightText: { type: "string", description: "Warm, personal weekly reflection" },
                  patterns: { type: "array", items: { type: "string" }, description: "2-4 behavioral patterns detected" },
                  actionableSteps: { type: "array", items: { type: "string" }, description: "2-3 specific growth steps" },
                },
                required: ["insightText", "patterns", "actionableSteps"],
                additionalProperties: false,
              },
            },
          },
        });

        let insightText = "";
        let patterns: string[] = [];
        let actionableSteps: string[] = [];

        try {
          const rawContent = aiRes.choices[0]?.message?.content;
          const contentStr = typeof rawContent === "string" ? rawContent : "{}";
          const parsed = JSON.parse(contentStr);
          insightText = parsed.insightText || "";
          patterns = Array.isArray(parsed.patterns) ? parsed.patterns : [];
          actionableSteps = Array.isArray(parsed.actionableSteps) ? parsed.actionableSteps : [];
        } catch {
          // Fallback: treat entire response as insightText
          insightText = typeof aiRes.choices[0]?.message?.content === "string"
            ? aiRes.choices[0].message.content
            : "";
          // Generate basic patterns from data
          patterns = [
            sessions.length > 0 ? `${sessions.length} Mirror session${sessions.length > 1 ? "s" : ""} this week` : undefined,
            journals.length > 0 ? `${journals.length} journal entr${journals.length > 1 ? "ies" : "y"} written` : undefined,
            checkIns.length > 0 ? `${checkIns.length}/7 daily check-ins completed` : undefined,
            habits.length > 0 ? `${habits.length} habit${habits.length > 1 ? "s" : ""} completed` : undefined,
          ].filter(Boolean) as string[];
          actionableSteps = [
            sessions.length === 0 ? "Try a Mirror session to explore your thoughts" : undefined,
            habits.length < 3 ? "Focus on completing at least 3 habits this week" : undefined,
            checkIns.length < 5 ? "Aim for daily check-ins to track your patterns" : undefined,
            journals.length === 0 ? "Write a journal entry to capture your reflections" : undefined,
          ].filter(Boolean) as string[];
          // Ensure at least one step
          if (actionableSteps.length === 0) actionableSteps = ["Keep up your current momentum!"];
        }

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
