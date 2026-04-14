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
  deactivatePushSubscription,
  deleteHabit,
  deleteInsight,
  getAllInsights,
  getActivePushSubscription,
  getChatHistory,
  getChatSessions,
  getCurrentSessionId,
  getDomainScoreHistory,
  getHabitStreaks,
  getJournalEntries,
  getJournalEntry,
  getLatestDomainScores,
  getLatestInsight,
  getMilestones,
  getMoodTrend,
  getNotificationPreferences,
  getRecentCheckIns,
  getTodayCheckIn,
  getTodayCompletions,
  getUserHabits,
  getUserProfile,
  markOnboardingComplete,
  saveInsight,
  listInsights,
  saveChatMessage,
  saveSeedIntent,
  saveFullOnboarding,
  saveWeeklyInsight,
  toggleHabitCompletion,
  updateCheckInAiResponse,
  updateJournalEntryAi,
  updateSessionTitle,
  getChatSessionTitles,
  upsertNotificationPreferences,
  upsertPushSubscription,
  upsertUserProfile,
} from "./db";
import { sendPushNotification } from "./pushNotifications";
import { retrieveContextForChat, upsertJournalEmbedding } from "./rag/embeddings";
import { buildIntentSpecificPrompt } from "./intentPrompts";
// ─── Helperss ──────────────────────────────────────────────────────────────────

async function buildHigherSelfSystemPrompt(userId: number, seedIntent?: string): Promise<string> {
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

  // Use intent-specific prompts if seedIntent is provided
  return buildIntentSpecificPrompt(seedIntent, {
    name,
    valuesStr,
    goalsStr,
    visionStr,
    beliefsStr,
    avgMood,
    domainStr: domainStr || "not yet assessed",
  });
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

  onboarding: router({
    saveSeedIntent: protectedProcedure
      .input(z.object({ seedIntent: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        await saveSeedIntent(ctx.user.id, input.seedIntent);
        return { success: true };
      }),

    saveFullOnboarding: protectedProcedure
      .input(
        z.object({
          coreValues: z.array(z.string()),
          shortTermGoals: z.string(),
          longTermVision: z.string(),
          personalityNotes: z.string(),
          beliefs: z.string(),
          preferredName: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await saveFullOnboarding(ctx.user.id, input);
        return { success: true };
      }),
  }),

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
          const systemPrompt = await buildHigherSelfSystemPrompt(ctx.user.id, ctx.user.seedIntent || undefined);
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

  // ─── Journal ─────────────────────────────────────────────────────────

  journal: router({
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(50),
          search: z.string().optional(),
          categoryId: z.number().nullable().optional(),
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
          moodTag: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { limit, ...filters } = input;
        return getJournalEntries(ctx.user.id, limit, filters);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const entry = await getJournalEntry(input.id, ctx.user.id);
        if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
        return entry;
      }),

    categories: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const { getJournalCategories } = await import("./db");
        return getJournalCategories(ctx.user.id);
      }),
      create: protectedProcedure
        .input(
          z.object({
            name: z.string().min(1).max(100),
            color: z.string().default("#8b5cf6"),
          })
        )
        .mutation(async ({ ctx, input }) => {
          const { createJournalCategory } = await import("./db");
          await createJournalCategory(ctx.user.id, input.name, input.color);
          return { success: true };
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const { deleteJournalCategory } = await import("./db");
          await deleteJournalCategory(input.id, ctx.user.id);
          return { success: true };
        }),
    }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().optional(),
          content: z.string().min(1),
          moodTag: z.string().optional(),
          categoryId: z.number().nullable().optional(),
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
    history: protectedProcedure
      .input(z.object({ sessionId: z.string().nullable().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const sid = input?.sessionId !== undefined
          ? input.sessionId
          : await getCurrentSessionId(ctx.user.id);
        return getChatHistory(ctx.user.id, sid);
      }),

    sessions: protectedProcedure.query(async ({ ctx }) => {
      return getChatSessions(ctx.user.id);
    }),
    getSessionTitles: protectedProcedure.query(async ({ ctx }) => {
      return getChatSessionTitles(ctx.user.id);
    }),
    updateSessionTitle: protectedProcedure
      .input(z.object({
        sessionId: z.string().nullable(),
        title: z.string().max(200),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateSessionTitle(ctx.user.id, input.sessionId, input.title);
        return { success: true };
      }),
    clearConversation: protectedProcedure.mutation(async () => {
      const { randomUUID } = await import("crypto");
      const newSessionId = randomUUID();
      return { newSessionId };
    }),

    send: protectedProcedure
      .input(z.object({ message: z.string().min(1), sessionId: z.string().nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const sessionId = input.sessionId ?? null;
        // Save user message
        const savedMsgId = await saveChatMessage({
          userId: ctx.user.id,
          role: "user",
          content: input.message,
          sessionId,
        });
        // RAG: Retrieve similar journal entries
        console.log(`[Chat] Retrieving RAG context for user ${ctx.user.id}`);
        let ragContextSection = "";
        let ragEntriesCount = 0;
        try {
          const contextEntries = await retrieveContextForChat(
            ctx.user.id,
            input.message,
            3
          );
          if (contextEntries.length > 0) {
            ragEntriesCount = contextEntries.length;
            ragContextSection = `\n\nRELEVANT PAST ENTRIES (from your journal):\n`;
            ragContextSection += contextEntries
              .map(
                (entry) =>
                  `[${entry.createdAt.toDateString()}] "${entry.title || "Untitled"}"\n${entry.content.substring(0, 300)}${entry.content.length > 300 ? "..." : ""}\n(similarity: ${(entry.score * 100).toFixed(0)}%)`
              )
              .join("\n\n---\n\n");
            console.log(
              `[Chat] Injecting ${contextEntries.length} context entries into system prompt`
            );
          } else {
            console.log(`[Chat] No relevant context found in RAG`);
          }
        } catch (error) {
          console.error("[Chat] RAG context retrieval failed, continuing without context:", error);
        }
        // Get recent chat history for current session (for context)
        const history = await getChatHistory(ctx.user.id, sessionId, 20);
        const recentMessages = history.slice(-10);
        let systemPrompt = await buildHigherSelfSystemPrompt(ctx.user.id, ctx.user.seedIntent || undefined);
        systemPrompt += ragContextSection;
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
        // Save AI response with context snapshot
        const aiMsgId = await saveChatMessage({
          userId: ctx.user.id,
          role: "assistant",
          content: aiContent,
          sessionId,
          contextSnapshot: {
            ragContextUsed: ragEntriesCount > 0,
            ragEntriesCount,
          },
        });
        return { response: aiContent, messageId: aiMsgId };
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
  // ─── Push Notifications ────────────────────────────────────────────────────────────────────────────────

  notifications: router({
    subscribe: protectedProcedure
      .input(z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
        timezone: z.string().default("UTC"),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertPushSubscription(ctx.user.id, input.endpoint, input.p256dh, input.auth, input.timezone);
        await sendPushNotification(input.endpoint, input.p256dh, input.auth, {
          title: "You're all set 🌟",
          body: "Daily reminders are on. Your 6am check-in starts tomorrow.",
          icon: "/icon-192.png",
          url: "/home",
          tag: "welcome",
        });
        return { success: true };
      }),

    unsubscribe: protectedProcedure.mutation(async ({ ctx }) => {
      await deactivatePushSubscription(ctx.user.id);
      return { success: true };
    }),

    status: protectedProcedure.query(async ({ ctx }) => {
      const [sub, prefs] = await Promise.all([
        getActivePushSubscription(ctx.user.id),
        getNotificationPreferences(ctx.user.id),
      ]);
      return {
        isSubscribed: !!sub,
        endpoint: sub?.endpoint ?? null,
        prefs: prefs ?? { dailyReminderEnabled: true, reminderHour: 6, timezone: "UTC" },
      };
    }),

    updatePrefs: protectedProcedure
      .input(z.object({
        dailyReminderEnabled: z.boolean().optional(),
        reminderHour: z.number().min(0).max(23).optional(),
        timezone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertNotificationPreferences(ctx.user.id, input);
        return { success: true };
      }),

    sendTest: protectedProcedure.mutation(async ({ ctx }) => {
      const sub = await getActivePushSubscription(ctx.user.id);
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription" });
      const profile = await getUserProfile(ctx.user.id);
      const name = profile?.preferredName ?? "you";
      await sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, {
        title: "Test notification 🔔",
        body: `Hey ${name} — this is what your 6am reminder will look like.`,
        icon: "/icon-192.png",
        url: "/home",
        tag: "test",
      });
      return { success: true };
    }),
  }),

  // ─── Account Settings ──────────────────────────────────────────────────────

  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getUserProfile(ctx.user.id);
      return {
        phone: profile?.phone ?? "",
        contactEmail: profile?.contactEmail ?? "",
        therapistName: profile?.therapistName ?? "",
        therapistPhone: profile?.therapistPhone ?? "",
        therapistEmail: profile?.therapistEmail ?? "",
        therapistNotes: profile?.therapistNotes ?? "",
        preferredName: profile?.preferredName ?? "",
        avatarEmoji: profile?.avatarEmoji ?? "🌟",
      };
    }),

    update: protectedProcedure
      .input(z.object({
        phone: z.string().max(30).optional(),
        contactEmail: z.string().email().max(320).optional().or(z.literal("")),
        therapistName: z.string().max(200).optional(),
        therapistPhone: z.string().max(30).optional(),
        therapistEmail: z.string().email().max(320).optional().or(z.literal("")),
        therapistNotes: z.string().optional(),
        preferredName: z.string().max(100).optional(),
        avatarEmoji: z.string().max(8).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ─── Calendar ─────────────────────────────────────────────────────────────

  calendar: router({
    list: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ ctx, input }) => {
        const { getCalendarEvents } = await import("./db");
        return getCalendarEvents(ctx.user.id, input.year, input.month);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(300),
        type: z.enum(["therapy", "goal", "habit", "reminder", "other"]).default("other"),
        eventDate: z.number(), // UTC timestamp ms
        endDate: z.number().optional(),
        notes: z.string().optional(),
        color: z.string().max(20).optional(),
        isAllDay: z.boolean().default(false),
        recurrence: z.enum(["none", "weekly", "monthly"]).default("none"),
        recurrenceEnd: z.number().optional(), // UTC timestamp ms
      }))
      .mutation(async ({ ctx, input }) => {
        const { createCalendarEvent } = await import("./db");
        const id = await createCalendarEvent({
          userId: ctx.user.id,
          title: input.title,
          type: input.type,
          eventDate: new Date(input.eventDate),
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          notes: input.notes,
          color: input.color ?? "#8b5cf6",
          isAllDay: input.isAllDay,
          recurrence: input.recurrence,
          recurrenceEnd: input.recurrenceEnd ? new Date(input.recurrenceEnd) : undefined,
        });
        return { success: true, id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(300).optional(),
        type: z.enum(["therapy", "goal", "habit", "reminder", "other"]).optional(),
        eventDate: z.number().optional(),
        endDate: z.number().optional(),
        notes: z.string().optional(),
        color: z.string().max(20).optional(),
        isAllDay: z.boolean().optional(),
        recurrence: z.enum(["none", "weekly", "monthly"]).optional(),
        recurrenceEnd: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateCalendarEvent } = await import("./db");
        await updateCalendarEvent(ctx.user.id, input.id, {
          ...input,
          eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          recurrenceEnd: input.recurrenceEnd ? new Date(input.recurrenceEnd) : undefined,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteCalendarEvent } = await import("./db");
        await deleteCalendarEvent(ctx.user.id, input.id);
        return { success: true };
      }),
  }),  // ─── Saved Insights (chat reactions) ────────────────────────────────────────────────────────────────────────────────────
  savedInsights: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return listInsights(ctx.user.id);
    }),
    save: protectedProcedure
      .input(
        z.object({
          chatMessageId: z.number().optional(),
          content: z.string().min(1),
          reactionType: z.enum(["heart", "star"]),
          note: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await saveInsight(ctx.user.id, input);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteInsight(ctx.user.id, input.id);
        return { success: true };
      }),
  }),
  // ─── Timeline / Milestones ────────────────────────────────────────────────────────────────────────────────────
  timeline:router({
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
