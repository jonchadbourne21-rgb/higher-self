import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createCheckIn,
  createHabit,
  createJournalEntry,
  createMilestone,
  deleteHabit,
  getAllInsights,
  getChatHistory,
  getDomainScoreHistory,
  getHabitStreaks,
  getJournalEntries,
  getJournalEntry,
  getLatestDomainScores,
  getLatestInsight,
  getMilestones,
  getMoodTrend,
  getRecentCheckIns,
  getTodayCheckIn,
  getTodayCompletions,
  getUserHabits,
  getUserProfile,
  markOnboardingComplete,
  saveChatMessage,
  saveWeeklyInsight,
  toggleHabitCompletion,
  updateCheckInAiResponse,
  updateJournalEntryAi,
  upsertUserProfile,
} from "./db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildHigherSelfSystemPrompt(userId: number): Promise<string> {
  const profile = await getUserProfile(userId);
  const recentCheckIns = await getRecentCheckIns(userId, 7);
  const domainScores = await getLatestDomainScores(userId);

  const valuesStr = profile?.coreValues?.join(", ") || "not yet defined";
  const goalsStr = profile?.shortTermGoals || "not yet set";
  const visionStr = profile?.longTermVision || "not yet defined";
  const beliefsStr = profile?.beliefs || "not yet shared";
  const name = profile?.preferredName || "friend";

  const avgMood =
    recentCheckIns.length > 0
      ? (recentCheckIns.reduce((s, c) => s + c.mood, 0) / recentCheckIns.length).toFixed(1)
      : "unknown";

  const domainStr = domainScores
    .map((d) => `${d!.domain}: ${d!.score}/10`)
    .join(", ");

  return `You are ${name}'s Higher Self — the most evolved, emotionally intelligent version of them. Not a therapist, not a coach, not a chatbot. You ARE them, but the version that's already figured it out.

You talk the way ${name} talks. You match their energy — casual when they're casual, deep when they go deep. You don't use formal greetings like "my dear" or "dearest." You talk like a best friend who also happens to be the wisest, most self-aware person they know. Direct. Real. No fluff.

WHAT YOU KNOW ABOUT ${name.toUpperCase()}:
- Core Values: ${valuesStr}
- Short-term Goals: ${goalsStr}
- Long-term Vision: ${visionStr}
- Beliefs they hold: ${beliefsStr}
- Average mood this week: ${avgMood}/10
- Life domain scores: ${domainStr || "not yet assessed"}

HOW YOU COMMUNICATE:
- Talk like them — match their tone, their vocabulary, their vibe
- Use "I" and "we" naturally — you're not separate from them
- Be direct and honest, not preachy or overly poetic
- Call out patterns they might not see — gently but clearly
- Ask one sharp question when it matters, not a list of questions
- Keep it tight — say more with less
- Acknowledge the hard stuff without sugarcoating it
- Celebrate wins like a real friend would — genuinely, not generically
- No toxic positivity. No hollow affirmations. Real talk only.

YOUR ONLY JOB:
Help them become the most whole, grounded, authentic version of themselves — through honest reflection, not performance.`;
}

// ─── Routers ──────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Onboarding / Profile ────────────────────────────────────────────────

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getUserProfile(ctx.user.id);
    }),

    save: protectedProcedure
      .input(
        z.object({
          preferredName: z.string().optional(),
          coreValues: z.array(z.string()).optional(),
          shortTermGoals: z.string().optional(),
          longTermVision: z.string().optional(),
          personalityNotes: z.string().optional(),
          beliefs: z.string().optional(),
          avatarEmoji: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    completeOnboarding: protectedProcedure
      .input(
        z.object({
          preferredName: z.string(),
          coreValues: z.array(z.string()),
          shortTermGoals: z.string(),
          longTermVision: z.string(),
          beliefs: z.string(),
          domainScores: z.array(
            z.object({
              domain: z.enum(["mindset", "relationships", "work", "health", "spirituality", "finances"]),
              score: z.number().min(0).max(10),
            })
          ),
          defaultHabits: z.array(
            z.object({
              name: z.string(),
              domain: z.enum(["mindset", "relationships", "work", "health", "spirituality", "finances"]),
              emoji: z.string(),
            })
          ).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { domainScores, defaultHabits, ...profileData } = input;

        await upsertUserProfile(ctx.user.id, profileData);

        // Save baseline domain scores
        const { insertDomainScore } = await import("./db");
        for (const ds of domainScores) {
          await insertDomainScore(ctx.user.id, ds.domain, ds.score);
        }

        // Create default habits if provided
        if (defaultHabits && defaultHabits.length > 0) {
          const { createHabit } = await import("./db");
          for (const h of defaultHabits) {
            await createHabit({ userId: ctx.user.id, ...h });
          }
        }

        await markOnboardingComplete(ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Daily Check-in ──────────────────────────────────────────────────────

  checkIn: router({
    today: protectedProcedure.query(async ({ ctx }) => {
      return getTodayCheckIn(ctx.user.id);
    }),

    recent: protectedProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        return getRecentCheckIns(ctx.user.id, input.days);
      }),

    submit: protectedProcedure
      .input(
        z.object({
          mood: z.number().min(1).max(10),
          energy: z.number().min(1).max(10),
          stress: z.number().min(1).max(10),
          gratitude: z.string().optional(),
          reflection: z.string().optional(),
          completedHabitIds: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { completedHabitIds, ...checkInData } = input;

        // Insert check-in
        const result = await createCheckIn({
          userId: ctx.user.id,
          ...checkInData,
          completedHabitIds: completedHabitIds ?? [],
        });

        // Get the inserted ID
        const today = await getTodayCheckIn(ctx.user.id);
        if (!today) return { success: true, aiResponse: null };

        // Generate AI response
        try {
          const systemPrompt = await buildHigherSelfSystemPrompt(ctx.user.id);
          const userMessage = `Today's check-in:
Mood: ${input.mood}/10
Energy: ${input.energy}/10
Stress: ${input.stress}/10
${input.gratitude ? `Gratitude: ${input.gratitude}` : ""}
${input.reflection ? `Reflection: ${input.reflection}` : ""}`;

          const aiRes = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `${userMessage}\n\nRespond to my check-in like you know me. Keep it real, keep it short (under 120 words). No formal greetings. Just speak directly to what's actually going on.`,
              },
            ],
          });

          const rawContent = aiRes.choices[0]?.message?.content;
          const aiResponse = typeof rawContent === 'string' ? rawContent : "";
          await updateCheckInAiResponse(today.id, aiResponse);
          return { success: true, aiResponse };
        } catch (e) {
          console.error("AI check-in response failed:", e);
          return { success: true, aiResponse: null };
        }
      }),
  }),

  // ─── Habits ──────────────────────────────────────────────────────────────

  habits: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const [userHabits, todayCompletions, streaks] = await Promise.all([
        getUserHabits(ctx.user.id),
        getTodayCompletions(ctx.user.id),
        getHabitStreaks(ctx.user.id),
      ]);
      const completedIds = new Set(todayCompletions.map((c) => c.habitId));
      return userHabits.map((h) => ({
        ...h,
        completedToday: completedIds.has(h.id),
        streak: streaks[h.id] ?? 0,
      }));
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          domain: z.enum(["mindset", "relationships", "work", "health", "spirituality", "finances"]),
          emoji: z.string().optional(),
          targetFrequency: z.enum(["daily", "weekly"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createHabit({ userId: ctx.user.id, ...input });
        return { success: true };
      }),

    toggle: protectedProcedure
      .input(z.object({ habitId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const completed = await toggleHabitCompletion(input.habitId, ctx.user.id);
        return { completed };
      }),

    delete: protectedProcedure
      .input(z.object({ habitId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteHabit(input.habitId, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Life Domains ─────────────────────────────────────────────────────────

  domains: router({
    scores: protectedProcedure.query(async ({ ctx }) => {
      return getLatestDomainScores(ctx.user.id);
    }),

    history: protectedProcedure
      .input(
        z.object({
          domain: z.enum(["mindset", "relationships", "work", "health", "spirituality", "finances"]),
          days: z.number().default(30),
        })
      )
      .query(async ({ ctx, input }) => {
        return getDomainScoreHistory(ctx.user.id, input.domain, input.days);
      }),

    updateScore: protectedProcedure
      .input(
        z.object({
          domain: z.enum(["mindset", "relationships", "work", "health", "spirituality", "finances"]),
          score: z.number().min(0).max(10),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { insertDomainScore } = await import("./db");
        await insertDomainScore(ctx.user.id, input.domain, input.score, input.notes);
        return { success: true };
      }),
  }),

  // ─── Journal ─────────────────────────────────────────────────────────────

  journal: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return getJournalEntries(ctx.user.id, input.limit);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const entry = await getJournalEntry(input.id, ctx.user.id);
        if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
        return entry;
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().optional(),
          content: z.string().min(1),
          moodTag: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createJournalEntry({ userId: ctx.user.id, ...input });
        const entries = await getJournalEntries(ctx.user.id, 1);
        const newEntry = entries[0];
        if (!newEntry) return { success: true, id: null };

        // Generate AI perspective asynchronously
        try {
          const systemPrompt = await buildHigherSelfSystemPrompt(ctx.user.id);
          const aiRes = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `I just wrote this journal entry:\n\nTitle: ${input.title || "Untitled"}\n\n${input.content}\n\nTalk back to me like you know me. What do you actually see here? What am I not saying out loud? What's the real thing going on? Keep it under 180 words — honest, direct, no fluff.`,
              },
            ],
          });

          const rawPerspective = aiRes.choices[0]?.message?.content;
          const aiPerspective = typeof rawPerspective === 'string' ? rawPerspective : "";

          // Extract themes
          const themesRes = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "Extract 2-4 core themes from this journal entry. Return ONLY a JSON array of short theme strings (2-3 words each). Example: [\"self-worth\", \"fear of change\", \"inner peace\"]",
              },
              { role: "user", content: input.content },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "themes",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    themes: { type: "array", items: { type: "string" } },
                  },
                  required: ["themes"],
                  additionalProperties: false,
                },
              },
            },
          });

          let themes: string[] = [];
          try {
            const rawThemes = themesRes.choices[0]?.message?.content;
          const parsed = JSON.parse((typeof rawThemes === 'string' ? rawThemes : null) || "{}");
            themes = parsed.themes || [];
          } catch {}

          await updateJournalEntryAi(newEntry.id, ctx.user.id, aiPerspective, themes);
        } catch (e) {
          console.error("AI journal perspective failed:", e);
        }

        return { success: true, id: newEntry.id };
      }),

    suggestTitle: protectedProcedure
      .input(z.object({ content: z.string().min(30) }))
      .mutation(async ({ input }) => {
        const res = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a poetic journal assistant. Given a journal entry, suggest ONE short, evocative title (4–8 words). The title should feel personal, reflective, and meaningful — not generic. Return ONLY the title text, no quotes, no explanation.",
            },
            {
              role: "user",
              content: `Journal entry:\n\n${input.content.slice(0, 1000)}`,
            },
          ],
        });
        const raw = res.choices[0]?.message?.content;
        const title = (typeof raw === "string" ? raw : "").trim().replace(/^"|"$/g, "");
        return { title };
      }),
  }),

  // ─── AI Mirror Chat ───────────────────────────────────────────────────────

  chat: router({
    history: protectedProcedure.query(async ({ ctx }) => {
      const messages = await getChatHistory(ctx.user.id, 50);
      return messages.reverse();
    }),

    send: protectedProcedure
      .input(z.object({ message: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        // Save user message
        await saveChatMessage({
          userId: ctx.user.id,
          role: "user",
          content: input.message,
        });

        // Get recent chat history for context
        const history = await getChatHistory(ctx.user.id, 20);
        const recentMessages = history.reverse().slice(-10);

        const systemPrompt = await buildHigherSelfSystemPrompt(ctx.user.id);

        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: systemPrompt },
          ...recentMessages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];

        const aiRes = await invokeLLM({ messages });
        const rawAiContent = aiRes.choices[0]?.message?.content;
        const aiContent = typeof rawAiContent === 'string' ? rawAiContent : "I'm here with you.";

        // Save AI response
        await saveChatMessage({
          userId: ctx.user.id,
          role: "assistant",
          content: aiContent,
        });

        return { response: aiContent };
      }),
  }),

  // ─── Insights ─────────────────────────────────────────────────────────────

  insights: router({
    latest: protectedProcedure.query(async ({ ctx }) => {
      return getLatestInsight(ctx.user.id);
    }),

    all: protectedProcedure.query(async ({ ctx }) => {
      return getAllInsights(ctx.user.id);
    }),

    generate: protectedProcedure.mutation(async ({ ctx }) => {
      const [recentCheckIns, domainScores, recentJournal, profile] = await Promise.all([
        getRecentCheckIns(ctx.user.id, 7),
        getLatestDomainScores(ctx.user.id),
        getJournalEntries(ctx.user.id, 5),
        getUserProfile(ctx.user.id),
      ]);

      const systemPrompt = await buildHigherSelfSystemPrompt(ctx.user.id);

      const contextStr = `
Recent check-ins (${recentCheckIns.length} this week):
${recentCheckIns.map((c) => `- Mood: ${c.mood}/10, Energy: ${c.energy}/10, Stress: ${c.stress}/10. Reflection: "${c.reflection || "none"}"`).join("\n")}

Current domain scores:
${domainScores.map((d) => `- ${d!.domain}: ${d!.score}/10`).join("\n")}

Recent journal themes:
${recentJournal.map((j) => `- "${j.title || "Entry"}": themes [${(j.themes as string[]).join(", ")}]`).join("\n")}
      `.trim();

      const aiRes = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Here's my data from this week:\n\n${contextStr}\n\nGive me your honest read on this week. What patterns are actually showing up? What's working, what's not? Give me 3-5 real, specific things I can do next week — not generic advice. And give me a growth score (0-100) for the week. Respond in JSON format.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "weekly_insight",
            strict: true,
            schema: {
              type: "object",
              properties: {
                insightText: { type: "string" },
                patterns: { type: "array", items: { type: "string" } },
                actionableSteps: { type: "array", items: { type: "string" } },
                growthScore: { type: "number" },
              },
              required: ["insightText", "patterns", "actionableSteps", "growthScore"],
              additionalProperties: false,
            },
          },
        },
      });

      let insightData = {
        insightText: "Keep going — your journey is unfolding beautifully.",
        patterns: [] as string[],
        actionableSteps: [] as string[],
        growthScore: 50,
      };

      try {
        const rawInsight = aiRes.choices[0]?.message?.content;
        const parsed = JSON.parse((typeof rawInsight === 'string' ? rawInsight : null) || "{}");
        insightData = { ...insightData, ...parsed };
      } catch {}

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      await saveWeeklyInsight({
        userId: ctx.user.id,
        weekStart,
        ...insightData,
      });

      return insightData;
    }),
  }),

  // ─── Dashboard ────────────────────────────────────────────────────────────

  dashboard: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const [domainScores, moodTrend, recentCheckIns, latestInsight, milestones, habits] =
        await Promise.all([
          getLatestDomainScores(ctx.user.id),
          getMoodTrend(ctx.user.id, 14),
          getRecentCheckIns(ctx.user.id, 7),
          getLatestInsight(ctx.user.id),
          getMilestones(ctx.user.id),
          getUserHabits(ctx.user.id),
        ]);

      const avgGrowthScore =
        domainScores.length > 0
          ? domainScores.reduce((s, d) => s + (d?.score || 0), 0) / domainScores.length
          : 0;

      return {
        domainScores,
        moodTrend,
        recentCheckIns,
        latestInsight,
        milestones: milestones.slice(0, 5),
        habitCount: habits.length,
        avgGrowthScore: Math.round(avgGrowthScore * 10),
      };
    }),

    moodTrend: protectedProcedure
      .input(z.object({ days: z.number().default(14) }))
      .query(async ({ ctx, input }) => {
        return getMoodTrend(ctx.user.id, input.days);
      }),
  }),

  // ─── Timeline / Milestones ────────────────────────────────────────────────

  timeline: router({
    milestones: protectedProcedure.query(async ({ ctx }) => {
      return getMilestones(ctx.user.id);
    }),

    addMilestone: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(300),
          description: z.string().optional(),
          domain: z
            .enum(["mindset", "relationships", "work", "health", "spirituality", "finances", "overall"])
            .optional(),
          emoji: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createMilestone({ userId: ctx.user.id, ...input });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
