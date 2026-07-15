import { COOKIE_NAME } from "@shared/const";
import { sql, and, eq, gte, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { detectCrisisKeywords, SAFETY_KILL_SWITCH_RESPONSE, logSafetyBreach } from "./_core/safety";
import { systemRouter } from "./_core/systemRouter";
import { weeklyInsightRouter } from "./routers/weeklyInsight";
import { subscriptionRouter } from "./routers/subscription";
import { rewardsRouter } from "./routers/rewards";
import { programsRouter } from "./routers/programs";
import { voiceRouter } from "./routers/voice";
import { timeCapsuleRouter } from "./routers/timeCapsule";
import { echoRouter } from "./routers/echo";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { deleteUserAccount, getDb } from "./db";
import {
  calendarEvents,
  chatMessages,
  habitCompletions,
  journalEntries,
  psychologicalFingerprints,
  userLessonResponses,
  wheelSpins,
} from "../drizzle/schema";
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
  getCurrentStreak,
  getUserMilestones,
  getUserMilestonesByLevel,
  getUserMilestoneCount,
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
  getSessionMessagesForTitle,
  sessionHasTitle,
  getLatestWeeklyReflection,
  getWeekStart,
  upsertNotificationPreferences,
  upsertPushSubscription,
  upsertUserProfile,
  getLastSessionId,
  updateLastSessionId,
  getCheckInStreak,
  getLastStreakSpinDate,
  setLastStreakSpinDate,
} from "./db";
import { sendPushNotification } from "./pushNotifications";
import { storeMemory, retrieveMemories, formatMemoriesForPrompt, getPersonalityProfile, formatPersonalityForPrompt, updatePersonalityProfile } from "./rag/memory";
import { buildIntentSpecificPrompt } from "./intentPrompts";
import { extractAndSaveFingerprint } from "./timeCapsule/fingerprint";
import { extractAndStoreFingerprint } from "./db/sessionFingerprints";

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

  // Debug: Log compiled prompt context
  console.log("[DEBUG] Compiled Prompt Context:", {
    userId,
    seedIntent,
    name,
    valuesStr,
    goalsStr,
    visionStr,
    beliefsStr,
    avgMood,
    domainStr,
  });

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
    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      await deleteUserAccount(ctx.user.id);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Onboarding / Profile ────────────────────────────────────────────────

  onboarding: router({
    savePreferredName: protectedProcedure
      .input(z.object({ preferredName: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        await upsertUserProfile(ctx.user.id, { preferredName: input.preferredName });
        return { success: true };
      }),

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

    // Returns last 7 days of Aura scores for the sparkline on Home
    auraHistory: protectedProcedure.query(async ({ ctx }) => {
      const recent = await getRecentCheckIns(ctx.user.id, 7);
      // Map each check-in to { date, aura } — aura = mood*0.4 + energy*0.3 + (11-stress)*0.3
      return recent
        .slice(0, 7)
        .reverse()
        .map((c) => ({
          date: c.createdAt,
          aura: Math.round(c.mood * 0.4 + c.energy * 0.3 + (11 - c.stress) * 0.3),
        }));
    }),

    // Returns a fresh AI-generated reflection prompt for today
    // Uses RAG memories + personality profile + theme exclusion for deep personalization
    getDailyPrompt: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getUserProfile(ctx.user.id);
      const name = profile?.preferredName || "friend";
      const recentCheckIns = await getRecentCheckIns(ctx.user.id, 7);

      // ─── Theme exclusion: skip themes used in last 3 check-ins ───
      const themes = [
        "gratitude — something you're genuinely thankful for today",
        "surprise — something unexpected that happened or that you noticed",
        "joy — a small moment that made you feel good, even briefly",
        "growth — something you learned or a way you showed up differently",
        "connection — a moment with someone (or yourself) that felt real",
        "release — something you're ready to let go of or stop carrying",
        "courage — a moment you did something despite fear or discomfort",
        "beauty — something you noticed that was beautiful, simple, or alive",
        "energy — what's been draining you vs. what's been filling you up",
        "intention — what you want to bring more of into your life right now",
      ];
      const recentThemes = recentCheckIns
        .slice(0, 3)
        .map((c) => (c as any).reflectionTheme)
        .filter(Boolean) as string[];
      const available = themes.filter((t) => !recentThemes.some((rt) => t.startsWith(rt)));
      const pool = available.length > 0 ? available : themes;
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const theme = pool[dayOfYear % pool.length];
      const themeKey = theme.split(" — ")[0]; // e.g. "gratitude"

      // ─── RAG: pull relevant memories for personalization ───
      const [memories, personality] = await Promise.all([
        retrieveMemories({
          userId: ctx.user.id,
          query: `${themeKey} reflection personal growth`,
          topK: 3,
          sourceTypes: ["journal", "checkin", "voice"],
        }),
        getPersonalityProfile(ctx.user.id),
      ]);
      const memoryContext = formatMemoriesForPrompt(memories);
      const personalityContext = formatPersonalityForPrompt(personality);

      // ─── Recent answers for continuity ───
      const recentAnswers = recentCheckIns
        .slice(0, 3)
        .map((c) => c.reflectionAnswer || c.gratitude)
        .filter(Boolean)
        .join(" | ");

      try {
        const res = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You write short, personal, emotionally intelligent reflection prompts for a growth app. The user's name is ${name}. Today's theme is: ${theme}.${recentAnswers ? `\n\nRecent reflections (avoid repeating these angles): "${recentAnswers}"` : ""}${memoryContext}${personalityContext}\n\nWrite a single question — conversational, specific to THEIR life, never generic. Reference something concrete from their history if available. Under 20 words. No emojis. No quotation marks. Just the question.`,
            },
            { role: "user", content: "Write today's reflection prompt." },
          ],
        });
        const rawContent = res.choices[0]?.message?.content;
        const prompt = typeof rawContent === "string" ? rawContent.trim().replace(/^"|"$/g, "") : `What's one thing you're grateful for today?`;
        return { prompt, theme: themeKey };
      } catch {
        return { prompt: `What's one thing you're grateful for today?`, theme: themeKey };
      }
    }),

    // Generates a personalized follow-up question based on mood, stress, energy + reflection answer
    // Enhanced with RAG memories + personality profile for deep personalization
    generateFollowUp: protectedProcedure
      .input(z.object({
        mood: z.number().min(1).max(10),
        energy: z.number().min(1).max(10),
        stress: z.number().min(1).max(10),
        reflectionPrompt: z.string(),
        reflectionAnswer: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await getUserProfile(ctx.user.id);
        const name = profile?.preferredName || "friend";

        // ─── RAG: semantic search using their reflection answer as query ───
        const [memories, personality] = await Promise.all([
          retrieveMemories({
            userId: ctx.user.id,
            query: input.reflectionAnswer,
            topK: 3,
            sourceTypes: ["journal", "checkin", "voice", "program_response"],
          }),
          getPersonalityProfile(ctx.user.id),
        ]);
        const memoryContext = formatMemoriesForPrompt(memories);
        const personalityContext = formatPersonalityForPrompt(personality);

        try {
          const res = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a deeply perceptive growth coach. The user's name is ${name}. Based on their check-in data AND their history, craft ONE powerful follow-up question that goes deeper into what's really going on for them. The question should feel like it comes from someone who truly sees them — not a therapist, not a life coach script. A real human who notices things and remembers.${memoryContext}${personalityContext}\n\nUnder 25 words. No emojis. Just the question. If their memories reveal a pattern or contradiction with today's answer, ask about THAT.`,
              },
              {
                role: "user",
                content: `Mood: ${input.mood}/10, Energy: ${input.energy}/10, Stress: ${input.stress}/10\nReflection prompt: "${input.reflectionPrompt}"\nTheir answer: "${input.reflectionAnswer}"\n\nWhat's the one question that would unlock something real for them right now?`,
              },
            ],
          });
          const rawContent = res.choices[0]?.message?.content;
          const question = typeof rawContent === "string" ? rawContent.trim().replace(/^"|"$/g, "") : "What's really underneath all of this for you?";
          return { question };
        } catch {
          return { question: "What's really underneath all of this for you?" };
        }
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
          reflectionTheme: z.string().optional(),
          reflectionPrompt: z.string().optional(),
          reflectionAnswer: z.string().optional(),
          followUpQuestion: z.string().optional(),
          followUpAnswer: z.string().optional(),
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

        // Award 1 reward point for daily check-in
        let streakSpinEarned = false;
        try {
          const { addRewardPoints } = await import("./db/rewards");
          await addRewardPoints(ctx.user.id, 1, "checkin", `checkin_${today.id}`);
        } catch (e) {
          console.error("Failed to award check-in point:", e);
        }

        // 3-day streak auto-spin: grant a free spin if user has checked in 3+ consecutive days
        // and hasn't already received a streak spin in this streak cycle
        try {
          const streak = await getCheckInStreak(ctx.user.id);
          if (streak >= 3 && streak % 3 === 0) {
            // Check if we already granted a spin for this streak milestone
            const todayStr = new Date().toISOString().slice(0, 10);
            const lastSpinDate = await getLastStreakSpinDate(ctx.user.id);
            if (lastSpinDate !== todayStr) {
              // Grant a free spin by adding a streak_spin entry to wheel_spins
              // We record it as a pending spin the user can use from Rewards page
              const { addRewardPoints } = await import("./db/rewards");
              await addRewardPoints(ctx.user.id, 1, "checkin", `streak_spin_${streak}_${today.id}`);
              await setLastStreakSpinDate(ctx.user.id, todayStr);
              streakSpinEarned = true;
              console.log(`[Streak] User ${ctx.user.id} earned a free spin at ${streak}-day streak`);
            }
          }
        } catch (e) {
          console.error("Failed to check streak spin:", e);
        }

        // Generate AI response with RAG context
        try {
          let systemPrompt = await buildHigherSelfSystemPrompt(ctx.user.id, ctx.user.seedIntent || undefined);
          // Inject RAG memories + personality for deeper personalization
          try {
            const ragQuery = [input.reflectionAnswer, input.followUpAnswer, input.gratitude, input.reflection].filter(Boolean).join(" ");
            const [memories, personality] = await Promise.all([
              retrieveMemories({ userId: ctx.user.id, query: ragQuery || "daily check-in reflection", topK: 3, sourceTypes: ["journal", "checkin", "voice"] }),
              getPersonalityProfile(ctx.user.id),
            ]);
            systemPrompt += formatMemoriesForPrompt(memories) + formatPersonalityForPrompt(personality);
          } catch (e) {
            console.error("[CheckIn] RAG context retrieval failed, continuing without:", e);
          }
          const userMessage = [
            `Today's check-in:`,
            `Mood: ${input.mood}/10`,
            `Energy: ${input.energy}/10`,
            `Stress: ${input.stress}/10`,
            input.reflectionPrompt ? `Reflection prompt: "${input.reflectionPrompt}"` : "",
            input.reflectionAnswer ? `Their answer: "${input.reflectionAnswer}"` : "",
            input.followUpQuestion ? `Follow-up question: "${input.followUpQuestion}"` : "",
            input.followUpAnswer ? `Follow-up answer: "${input.followUpAnswer}"` : "",
            input.gratitude ? `Gratitude: ${input.gratitude}` : "",
            input.reflection ? `Reflection: ${input.reflection}` : "",
          ].filter(Boolean).join("\n");

          // Route to Claude Sonnet for user-facing reflection
          const aiRes = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `${userMessage}\n\nRespond to my check-in like you know me. Keep it real, keep it short (under 120 words). No formal greetings. Just speak directly to what's actually going on. Reference what they actually said — not generic affirmations.`,
              },
            ],
          });

          const rawContent = aiRes.choices[0]?.message?.content;
          const aiResponse = typeof rawContent === 'string' ? rawContent : "";
          await updateCheckInAiResponse(today.id, aiResponse);

          // RAG: Embed check-in data (reflections, gratitude, follow-ups) for personality learning
          const embedParts = [
            input.reflectionAnswer ? `Reflection: ${input.reflectionAnswer}` : "",
            input.followUpAnswer ? `Follow-up: ${input.followUpAnswer}` : "",
            input.gratitude ? `Gratitude: ${input.gratitude}` : "",
            input.reflection ? `Thought: ${input.reflection}` : "",
          ].filter(Boolean);
          if (embedParts.join("").length > 30) {
            storeMemory({
              userId: ctx.user.id,
              sourceType: "checkin",
              sourceId: today.id,
              content: `Check-in (mood:${input.mood}/10, energy:${input.energy}/10, stress:${input.stress}/10)\n${embedParts.join("\n")}`,
              metadata: { mood: String(input.mood), energy: String(input.energy) },
            }).catch((e) => console.error("[RAG] Check-in embedding failed:", e));
          }

          // TIME CAPSULE: Extract fingerprint from check-in reflections
          const checkinUserMessages = embedParts.filter((p) => p.length > 20);
          if (checkinUserMessages.length >= 2) {
            extractAndSaveFingerprint(
              ctx.user.id,
              "checkin",
              today.id.toString(),
              checkinUserMessages
            ).catch((e) => console.error("[TimeCapsule] Check-in fingerprint failed:", e));

            // SESSION FINGERPRINT (Gemini 2.5 Flash — numeric valence PoC)
            const checkinText = checkinUserMessages.map((m, i) => `[${i + 1}]: ${m}`).join("\n");
            extractAndStoreFingerprint(
              ctx.user.id,
              today.id.toString(),
              "checkin",
              checkinText
            ).catch((e) => console.error("[Fingerprint] Check-in extraction failed:", e));
          }

          return { success: true, aiResponse, streakSpinEarned };
        } catch (e) {
          console.error("AI check-in response failed:", e);
          return { success: true, aiResponse: null, streakSpinEarned };
        }
      }),

    saveWeeklyInsight: protectedProcedure
      .input(z.object({ insight: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await saveWeeklyInsight({
          userId: ctx.user.id,
          insightText: input.insight,
          weekStart: new Date(),
        });
        return { success: true };
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

    currentStreak: protectedProcedure.query(async ({ ctx }) => {
      const streak = await getCurrentStreak(ctx.user.id);
      return { streak };
    }),

    milestones: protectedProcedure.query(async ({ ctx }) => {
      const milestones = await getUserMilestones(ctx.user.id);
      return milestones;
    }),

    milestonesByLevel: protectedProcedure.query(async ({ ctx }) => {
      const milestones = await getUserMilestonesByLevel(ctx.user.id);
      return milestones;
    }),

    milestoneCount: protectedProcedure.query(async ({ ctx }) => {
      const count = await getUserMilestoneCount(ctx.user.id);
      return { count };
    }),
  }),

  // ─── Positive Habits / Domains ─────────────────────────────────────────────

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
        // TIER-GATING: Check weekly journal limit for free users
        const { isProUser } = await import("./db/subscriptions");
        const { hasReachedWeeklyJournalLimit, incrementJournalUsage } = await import("./db/usage");
        const isPro = await isProUser(ctx.user.id);
        
        if (!isPro) {
          const limitReached = await hasReachedWeeklyJournalLimit(ctx.user.id);
          if (limitReached) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Weekly journal limit reached. Upgrade to Pro for unlimited journals.",
              cause: "JOURNAL_LIMIT_REACHED",
            });
          }
          await incrementJournalUsage(ctx.user.id);
        }
        
        await createJournalEntry({ userId: ctx.user.id, ...input });
        const entries = await getJournalEntries(ctx.user.id, 1);
        const newEntry = entries[0];
        if (!newEntry) return { success: true, id: null };

        // RAG: Embed journal entry for future retrieval (fire-and-forget)
        const embedContent = `${input.title || "Untitled"}: ${input.content}`;
        // Resolve category name for domain metadata (if category is set)
        let domainMeta: string | undefined;
        if (input.categoryId) {
          const { getJournalCategories } = await import("./db");
          const cats = await getJournalCategories(ctx.user.id);
          const cat = cats.find((c: any) => c.id === input.categoryId);
          if (cat) domainMeta = cat.name.toLowerCase();
        }
        storeMemory({
          userId: ctx.user.id,
          sourceType: "journal",
          sourceId: newEntry.id,
          content: embedContent,
          metadata: { moodTag: input.moodTag || "neutral", ...(domainMeta ? { domain: domainMeta } : {}) },
        }).catch((e) => console.error("[RAG] Journal embedding failed:", e));

        // Generate AI perspective with RAG context
        try {
          let systemPrompt = await buildHigherSelfSystemPrompt(ctx.user.id, ctx.user.seedIntent || undefined);
          // Inject RAG memories + personality so the AI references past entries
          try {
            const [memories, personality] = await Promise.all([
              retrieveMemories({ userId: ctx.user.id, query: `${input.title || ""} ${input.content.slice(0, 200)}`, topK: 3, sourceTypes: ["journal", "checkin", "voice"] }),
              getPersonalityProfile(ctx.user.id),
            ]);
            systemPrompt += formatMemoriesForPrompt(memories) + formatPersonalityForPrompt(personality);
          } catch (e) {
            console.error("[Journal] RAG context retrieval failed, continuing without:", e);
          }
          // Route to Claude Sonnet for user-facing reflection
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

        // Echo pipeline: tag entry and check for pattern matches (fire-and-forget)
        (async () => {
          try {
            const { generateEchoTags, saveEchoTags, findAndQueueEcho, findCompoundEcho } = await import("./echo");
            const tags = await generateEchoTags(input.content, input.title || undefined);
            await saveEchoTags(newEntry.id, ctx.user.id, tags);
            await findAndQueueEcho(ctx.user.id, newEntry.id, tags.tensionSummary, tags.intensityScore, tags.resolutionStatus);
            await findCompoundEcho(ctx.user.id, newEntry.id);
          } catch (e) {
            console.error("[Echo] Pipeline failed:", e);
          }
        })();

        return { success: true, id: newEntry.id };
      }),

    suggestRelated: protectedProcedure
      .input(z.object({
        content: z.string().min(30),
        limit: z.number().default(3),
        domain: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Use RAG to find semantically related past journal entries (with optional hard filters)
        const related = await retrieveMemories({
          userId: ctx.user.id,
          query: input.content.slice(0, 2000),
          topK: input.limit,
          sourceTypes: ["journal"],
          domain: input.domain,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
        });

        // Map to a frontend-friendly shape
        return related.map((m) => ({
          id: m.sourceId,
          content: m.content.slice(0, 200),
          score: Math.round(m.score * 100),
          date: m.createdAt.toISOString(),
        }));
      }),

    suggestTitle: protectedProcedure
      .input(z.object({ content: z.string().min(30) }))
      .mutation(async ({ input }) => {
        // Route to Claude Sonnet for user-facing features
        const res = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a deeply perceptive journal title writer. Read the journal entry and generate 3 title options, max 5 words each.

Option 1: Extract a phrase the user actually wrote — something raw or specific they said. Use their own words as the title.
Option 2: Create a metaphor for the feeling or experience. Use imagery, nature, or a striking metaphor that captures the emotional undercurrent. Avoid clichés like sunrise, journey, becoming.
Option 3: Name the deeper need or shift the Mirror sees. What is the user really reaching for? What's the core change or realization? Name it directly.

Rules:
- Max 5 words per title
- No generic phrases like "My Journey", "Reflections", "Today's Thoughts", "A New Beginning"
- Draw from the specific language, emotions, and details in the entry
- Each title should feel like it could be the title of a chapter in their memoir
- No quotes, no numbering, no explanation in the output`,
            },
            {
              role: "user",
              content: `Journal entry:\n\n${input.content.slice(0, 1200)}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "title_suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  titles: {
                    type: "array",
                    items: { type: "string" },
                    description: "Exactly 3 title suggestions, one per creative angle",
                  },
                },
                required: ["titles"],
                additionalProperties: false,
              },
            },
          },
        });
        const raw = res.choices[0]?.message?.content;
        let titles: string[] = [];
        try {
          const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
          titles = (parsed.titles || []).map((t: string) => t.trim().replace(/^"|"$/g, "")).filter(Boolean);
        } catch {
          // Fallback: treat raw as a single title
          const fallback = (typeof raw === "string" ? raw : "").trim().replace(/^"|"$/g, "");
          if (fallback) titles = [fallback];
        }
        // Always return at least one title
        if (titles.length === 0) titles = ["Untitled"];
        return { titles, title: titles[0] };
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
    generateTitle: protectedProcedure
      .input(z.object({ sessionId: z.string().nullable() }))
      .mutation(async ({ ctx, input }) => {
        // Skip if session already has a manually-set title
        const alreadyTitled = await sessionHasTitle(ctx.user.id, input.sessionId);
        if (alreadyTitled) return { title: null, skipped: true };

        const messages = await getSessionMessagesForTitle(ctx.user.id, input.sessionId);
        if (messages.length < 2) return { title: null, skipped: true };

        // Build a compact transcript (max 1500 chars to keep prompt small)
        const transcript = messages
          .map((m) => `${m.role === "user" ? "User" : "Mirror"}: ${m.content.slice(0, 200)}`)
          .join("\n")
          .slice(0, 1500);

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a concise labeler for personal growth conversations. " +
                "Given a conversation transcript, return ONLY a short title (3-7 words, no quotes, no punctuation at end). " +
                "The title should capture the emotional core or main theme. " +
                "Examples: Facing the fear of failure, Finding clarity in chaos, Letting go of perfectionism",
            },
            {
              role: "user",
              content: `Label this conversation with a short title:\n\n${transcript}`,
            },
          ],
        });

        const rawContent = response?.choices?.[0]?.message?.content;
        const raw = typeof rawContent === "string" ? rawContent.trim() : "";
        // Strip surrounding quotes if LLM added them
        const title = raw.replace(/^["']|["']$/g, "").trim().slice(0, 120);
        if (!title) return { title: null, skipped: true };

        await updateSessionTitle(ctx.user.id, input.sessionId, title);
        return { title, skipped: false };
      }),

    getLastSession: protectedProcedure.query(async ({ ctx }) => {
      const lastSessionId = await getLastSessionId(ctx.user.id);
      if (!lastSessionId) return null;
      const messages = await getChatHistory(ctx.user.id, lastSessionId);
      const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
      return { sessionId: lastSessionId, messageCount: messages.length, lastMessageAt: lastMsg?.createdAt ?? null };
    }),
    clearConversation: protectedProcedure.mutation(async ({ ctx }) => {
      const { randomUUID } = await import("crypto");
      const newSessionId = randomUUID();
      // Update user's lastSessionId to the new session
      await updateLastSessionId(ctx.user.id, newSessionId);
      return { newSessionId };
    }),

    deleteSession: protectedProcedure
      .input(z.object({ sessionId: z.string().nullable() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteChatSession } = await import("./db");
        await deleteChatSession(ctx.user.id, input.sessionId);
        return { success: true };
      }),

    send: protectedProcedure
      .input(z.object({ message: z.string().min(1), sessionId: z.string().nullable().optional(), voiceMode: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const sessionId = input.sessionId ?? null;
        
        // TIER-GATING: Check daily chat limit for free users
        const { isProUser } = await import("./db/subscriptions");
        const { hasReachedDailyChatLimit, incrementChatUsage } = await import("./db/usage");
        const isPro = await isProUser(ctx.user.id);
        
        if (!isPro) {
          const limitReached = await hasReachedDailyChatLimit(ctx.user.id);
          if (limitReached) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Daily chat limit reached. Upgrade to Pro for unlimited chats.",
              cause: "CHAT_LIMIT_REACHED",
            });
          }
          // Increment usage for this chat
          await incrementChatUsage(ctx.user.id);
        }
        
        // SAFETY CHECK: Detect crisis keywords (TRAIGA-2026 COMPLIANCE)
        if (detectCrisisKeywords(input.message)) {
          await logSafetyBreach(ctx.user.id.toString(), input.message, "Crisis keyword detected");
          // Save user message for audit
          await saveChatMessage({
            userId: ctx.user.id,
            role: "user",
            content: input.message,
            sessionId,
          });
          // Save kill-switch response
          await saveChatMessage({
            userId: ctx.user.id,
            role: "assistant",
            content: SAFETY_KILL_SWITCH_RESPONSE,
            sessionId,
          });
          return { response: SAFETY_KILL_SWITCH_RESPONSE };
        }
        
        // Save user message
        const savedMsgId = await saveChatMessage({
          userId: ctx.user.id,
          role: "user",
          content: input.message,
          sessionId,
        });
        // RAG: Retrieve relevant memories + personality profile
        console.log(`[Chat] Retrieving RAG context for user ${ctx.user.id}`);
        let ragContextSection = "";
        let ragEntriesCount = 0;
        try {
          const [memories, personalityProfile] = await Promise.all([
            retrieveMemories({ userId: ctx.user.id, query: input.message, topK: 5 }),
            getPersonalityProfile(ctx.user.id),
          ]);
          ragEntriesCount = memories.length;
          ragContextSection = formatMemoriesForPrompt(memories);
          ragContextSection += formatPersonalityForPrompt(personalityProfile);
          if (memories.length > 0) {
            console.log(`[Chat] Injecting ${memories.length} memories + personality into system prompt`);
          } else {
            console.log(`[Chat] No relevant memories found in RAG`);
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
        // Route to OpenAI for user-facing conversation (Mirror chat)
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
        // If voice mode, generate TTS audio
        let audioDataUrl: string | null = null;
        if (input.voiceMode) {
          try {
            const { textToSpeechBase64 } = await import("./voice");
            // Strip markdown for cleaner speech
            const cleanText = aiContent.replace(/[#*_`~\[\]()>]/g, "").replace(/\n+/g, " ").trim();
            audioDataUrl = await textToSpeechBase64(cleanText);
          } catch (err) {
            console.error("[Voice] TTS generation failed:", err);
          }
        }
        // RAG: Embed user message for future retrieval (fire-and-forget)
        // Only embed messages longer than 50 chars (meaningful content)
        if (input.message.length > 50) {
          storeMemory({
            userId: ctx.user.id,
            sourceType: "chat",
            sourceId: savedMsgId ?? undefined,
            content: input.message,
          }).catch((e) => console.error("[RAG] Chat embedding failed:", e));
        }

        // RAG: Trigger personality profile update every 5 chat messages
        // (non-blocking, runs in background)
        if (savedMsgId && savedMsgId % 5 === 0) {
          updatePersonalityProfile(ctx.user.id).catch((e) =>
            console.error("[RAG] Personality update failed:", e)
          );
        }

        // TIME CAPSULE: Extract psychological fingerprint every 5th message
        // Collects recent user messages from this session and extracts emotional tone,
        // core beliefs, and unresolved tensions — invisible to the user
        if (savedMsgId && savedMsgId % 5 === 0) {
          (async () => {
            try {
              const recentMsgs = await getChatHistory(ctx.user.id, sessionId);
              const userMsgs = recentMsgs
                .filter((m) => m.role === "user")
                .slice(-10)
                .map((m) => m.content);
              await extractAndSaveFingerprint(
                ctx.user.id,
                "chat",
                sessionId,
                userMsgs
              );

              // SESSION FINGERPRINT (Gemini 2.5 Flash — numeric valence PoC)
              const chatText = userMsgs.map((m, i) => `[${i + 1}]: ${m}`).join("\n");
              await extractAndStoreFingerprint(
                ctx.user.id,
                sessionId ?? "unknown",
                "chat",
                chatText
              );
            } catch (e) {
              console.error("[TimeCapsule] Chat fingerprint extraction failed:", e);
            }
          })();
        }

        return { response: aiContent, messageId: aiMsgId, audioDataUrl };
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

      let systemPrompt = await buildHigherSelfSystemPrompt(ctx.user.id, ctx.user.seedIntent || undefined);
      // Inject RAG memories for cross-week pattern recognition
      try {
        const [memories, personality] = await Promise.all([
          retrieveMemories({ userId: ctx.user.id, query: "weekly patterns growth themes emotional trends", topK: 5, sourceTypes: ["journal", "checkin", "voice"] }),
          getPersonalityProfile(ctx.user.id),
        ]);
        systemPrompt += formatMemoriesForPrompt(memories) + formatPersonalityForPrompt(personality);
      } catch (e) {
        console.error("[Insights] RAG context retrieval failed, continuing without:", e);
      }

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
    /** Semantic clustering: detect recurring themes across user's memories */
    patterns: protectedProcedure.query(async ({ ctx }) => {
      const { clusterMemories } = await import("./rag/memory");
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const clusters = await clusterMemories({
        userId: ctx.user.id,
        maxClusters: 6,
        similarityThreshold: 0.55,
        minClusterSize: 2,
        dateFrom: fourWeeksAgo,
      });
      return clusters.map(c => ({
        theme: c.theme,
        entryCount: c.entries.length,
        avgSimilarity: Math.round(c.avgSimilarity * 100) / 100,
        recentEntries: c.entries.slice(0, 3).map(e => ({
          content: e.content.slice(0, 200),
          sourceType: e.sourceType,
          createdAt: e.createdAt,
        })),
      }));
    }),
  }),

  // ─── Dashboard ────────────────────────────────────────────────────────────

  dashboard: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const { isProUser } = await import("./db/subscriptions");
      const [domainScores, moodTrend, recentCheckIns, latestInsight, milestones, habits, isPro] =
        await Promise.all([
          getLatestDomainScores(ctx.user.id),
          getMoodTrend(ctx.user.id, 14),
          getRecentCheckIns(ctx.user.id, 7),
          getLatestInsight(ctx.user.id),
          getMilestones(ctx.user.id),
          getUserHabits(ctx.user.id),
          isProUser(ctx.user.id),
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
        isPro,
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

    upcoming: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUpcomingEvents } = await import("./db");
        return getUpcomingEvents(ctx.user.id, 3);
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

  // ─── Home Screen ──────────────────────────────────────────────────────────

  home: router({
    tileEngagement: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return {};
      const uid = ctx.user.id;

      // Count activity per feature over the last 30 days
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [chatCount, journalCount, habitCount, programCount, rewardsCount, calendarCount] =
        await Promise.all([
          // Mirror / Chat — count chat messages sent by user
          db
            .select({ count: sql<number>`count(*)` })
            .from(chatMessages)
            .where(
              and(
                eq(chatMessages.userId, uid),
                eq(chatMessages.role, "user"),
                gte(chatMessages.createdAt, since)
              )
            )
            .then((r) => Number(r[0]?.count ?? 0)),
          // Journal — count journal entries
          db
            .select({ count: sql<number>`count(*)` })
            .from(journalEntries)
            .where(and(eq(journalEntries.userId, uid), gte(journalEntries.createdAt, since)))
            .then((r) => Number(r[0]?.count ?? 0)),
          // Positive Habits — count habit completions
          db
            .select({ count: sql<number>`count(*)` })
            .from(habitCompletions)
            .where(and(eq(habitCompletions.userId, uid), gte(habitCompletions.completedAt, since)))
            .then((r) => Number(r[0]?.count ?? 0)),
          // Programs — count lesson responses
          db
            .select({ count: sql<number>`count(*)` })
            .from(userLessonResponses)
            .where(and(eq(userLessonResponses.userId, uid), gte(userLessonResponses.completedAt, since)))
            .then((r) => Number(r[0]?.count ?? 0)),
          // Rewards — count wheel spins
          db
            .select({ count: sql<number>`count(*)` })
            .from(wheelSpins)
            .where(and(eq(wheelSpins.userId, uid), gte(wheelSpins.createdAt, since)))
            .then((r) => Number(r[0]?.count ?? 0)),
          // Calendar — count calendar events created
          db
            .select({ count: sql<number>`count(*)` })
            .from(calendarEvents)
            .where(and(eq(calendarEvents.userId, uid), gte(calendarEvents.createdAt, since)))
            .then((r) => Number(r[0]?.count ?? 0)),
        ]);

      return {
        mirror: chatCount,
        journal: journalCount,
        habits: habitCount,
        programs: programCount,
        rewards: rewardsCount,
        calendar: calendarCount,
      };
    }),

    dailyQuote: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const uid = ctx.user.id;

      // Get quotes from the last 1-7 days (from psychological fingerprints rawExcerpts)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      const fingerprints = await db
        .select({
          rawExcerpts: psychologicalFingerprints.rawExcerpts,
          extractedAt: psychologicalFingerprints.extractedAt,
          coreBelief: psychologicalFingerprints.coreBelief,
          aspirationalSelf: psychologicalFingerprints.aspirationalSelf,
        })
        .from(psychologicalFingerprints)
        .where(
          and(
            eq(psychologicalFingerprints.userId, uid),
            gte(psychologicalFingerprints.extractedAt, sevenDaysAgo)
          )
        )
        .orderBy(desc(psychologicalFingerprints.extractedAt));

      if (fingerprints.length === 0) return null;

      // Collect all candidate quotes: aspirational self, raw excerpts that are profound
      const candidates: { text: string; date: Date }[] = [];

      for (const fp of fingerprints) {
        const date = fp.extractedAt;

        // Aspirational self statements are often the most inspiring
        if (fp.aspirationalSelf && fp.aspirationalSelf.length > 15 && fp.aspirationalSelf.length < 200) {
          candidates.push({ text: fp.aspirationalSelf, date });
        }

        // Raw excerpts that are quote-worthy (not too short, not too long)
        if (fp.rawExcerpts && Array.isArray(fp.rawExcerpts)) {
          for (const excerpt of fp.rawExcerpts) {
            if (excerpt.length >= 20 && excerpt.length <= 180) {
              candidates.push({ text: excerpt, date });
            }
          }
        }
      }

      if (candidates.length === 0) return null;

      // Use a deterministic daily selection based on date seed
      const today = new Date();
      const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const index = daySeed % candidates.length;
      const selected = candidates[index];

      return {
        quote: selected.text,
        date: selected.date,
      };
    }),

    getLatestDigest: protectedProcedure.query(async ({ ctx }) => {
      const digest = await getLatestWeeklyReflection(ctx.user.id);
      if (!digest) return null;
      // Check if digest is from the current week
      const weekStart = getWeekStart();
      const isCurrentWeek = digest.weekStart === weekStart;
      return {
        ...digest,
        isCurrentWeek,
      };
    }),
  }),
  weeklyInsight: weeklyInsightRouter,
  subscription: subscriptionRouter,
  rewards: rewardsRouter,
  programs: programsRouter,
  voice: voiceRouter,
  timeCapsule: timeCapsuleRouter,
  echo: echoRouter,
});
export type AppRouter = typeof appRouter;
