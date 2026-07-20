/**
 * Demo data layer — provides sample data for the demo user (id: 999999)
 * so that demo mode shows a realistic experience without needing DB records.
 */

export const DEMO_USER_ID = 999999;

export function isDemoUser(userId: number): boolean {
  return userId === DEMO_USER_ID;
}

export const demoProfile = {
  userId: DEMO_USER_ID,
  preferredName: "Alex",
  coreValues: ["Growth", "Authenticity", "Compassion", "Courage"],
  shortTermGoals: "Build a consistent meditation practice and improve sleep quality",
  longTermVision: "Become the most grounded, present version of myself — someone who leads with empathy and lives with intention",
  personalityNotes: "Introverted but deeply curious. Tends to overthink. Finds clarity through journaling.",
  beliefs: "I believe growth happens in small daily choices. I believe I'm capable of more than I give myself credit for.",
  avatarEmoji: "🪷",
  createdAt: new Date("2025-06-01"),
  updatedAt: new Date(),
};

export const demoCheckIns = [
  { id: 1, userId: DEMO_USER_ID, mood: 7, energy: 6, stress: 4, gratitude: "Morning sunlight through the window", reflection: "Feeling grounded today", reflectionPrompt: "What brought you peace today?", reflectionAnswer: "A quiet walk in the park", followUpQuestion: null, followUpAnswer: null, aiResponse: null, createdAt: new Date(Date.now() - 0 * 86400000) },
  { id: 2, userId: DEMO_USER_ID, mood: 6, energy: 5, stress: 5, gratitude: "Good conversation with a friend", reflection: "Need to slow down", reflectionPrompt: "What's one thing you noticed?", reflectionAnswer: "I was rushing through everything", followUpQuestion: null, followUpAnswer: null, aiResponse: null, createdAt: new Date(Date.now() - 1 * 86400000) },
  { id: 3, userId: DEMO_USER_ID, mood: 8, energy: 7, stress: 3, gratitude: "Finished a challenging project", reflection: "Proud of myself today", reflectionPrompt: "What gave you energy?", reflectionAnswer: "Completing something meaningful", followUpQuestion: null, followUpAnswer: null, aiResponse: null, createdAt: new Date(Date.now() - 2 * 86400000) },
  { id: 4, userId: DEMO_USER_ID, mood: 5, energy: 4, stress: 7, gratitude: "My morning coffee ritual", reflection: "Overwhelmed but managing", reflectionPrompt: "What's weighing on you?", reflectionAnswer: "Too many commitments", followUpQuestion: null, followUpAnswer: null, aiResponse: null, createdAt: new Date(Date.now() - 3 * 86400000) },
  { id: 5, userId: DEMO_USER_ID, mood: 7, energy: 8, stress: 3, gratitude: "A really good night's sleep", reflection: "Energized and focused", reflectionPrompt: "What's working well?", reflectionAnswer: "My new evening routine", followUpQuestion: null, followUpAnswer: null, aiResponse: null, createdAt: new Date(Date.now() - 4 * 86400000) },
  { id: 6, userId: DEMO_USER_ID, mood: 6, energy: 6, stress: 5, gratitude: "Kind words from a stranger", reflection: "Small moments matter", reflectionPrompt: "What surprised you?", reflectionAnswer: "How much a simple compliment lifted my mood", followUpQuestion: null, followUpAnswer: null, aiResponse: null, createdAt: new Date(Date.now() - 5 * 86400000) },
  { id: 7, userId: DEMO_USER_ID, mood: 8, energy: 7, stress: 2, gratitude: "Meditation breakthrough", reflection: "Finding stillness", reflectionPrompt: "What felt different?", reflectionAnswer: "I actually sat with discomfort instead of avoiding it", followUpQuestion: null, followUpAnswer: null, aiResponse: null, createdAt: new Date(Date.now() - 6 * 86400000) },
];

export const demoDomainScores = [
  { domain: "mindset", score: 7, userId: DEMO_USER_ID, createdAt: new Date() },
  { domain: "relationships", score: 6, userId: DEMO_USER_ID, createdAt: new Date() },
  { domain: "work", score: 7, userId: DEMO_USER_ID, createdAt: new Date() },
  { domain: "health", score: 5, userId: DEMO_USER_ID, createdAt: new Date() },
  { domain: "spirituality", score: 8, userId: DEMO_USER_ID, createdAt: new Date() },
  { domain: "finances", score: 6, userId: DEMO_USER_ID, createdAt: new Date() },
];

export const demoJournalEntries = [
  {
    id: 1,
    userId: DEMO_USER_ID,
    title: "The Art of Letting Go",
    content: "Today I realized that holding onto expectations was creating most of my stress. When I let go of how I thought things should be, everything felt lighter. The conversation with Sarah helped me see that I was trying to control outcomes that aren't mine to control.",
    themes: ["letting go", "control", "relationships"],
    mood: "reflective",
    moodTag: "reflective",
    categoryId: null,
    aiReflection: "You're recognizing a powerful pattern — the tension between wanting control and finding peace in surrender. This awareness itself is growth.",
    aiPerspective: "You're recognizing a powerful pattern — the tension between wanting control and finding peace in surrender. This awareness itself is growth.",
    createdAt: new Date(Date.now() - 1 * 86400000),
    updatedAt: new Date(Date.now() - 1 * 86400000),
  },
  {
    id: 2,
    userId: DEMO_USER_ID,
    title: "Morning Pages — Clarity",
    content: "Woke up with a clear mind for the first time in weeks. The evening routine is working. No screens after 9pm, 10 minutes of breathwork, and journaling before bed. I feel like I'm finally building the foundation I've been talking about.",
    themes: ["routine", "clarity", "discipline"],
    mood: "energized",
    moodTag: "energized",
    categoryId: null,
    aiReflection: "The compound effect of small consistent choices is showing up. You're not just building a routine — you're building trust with yourself.",
    aiPerspective: "The compound effect of small consistent choices is showing up. You're not just building a routine — you're building trust with yourself.",
    createdAt: new Date(Date.now() - 3 * 86400000),
    updatedAt: new Date(Date.now() - 3 * 86400000),
  },
  {
    id: 3,
    userId: DEMO_USER_ID,
    title: "Difficult Conversation",
    content: "Had the conversation I'd been avoiding for two weeks. It wasn't as bad as I imagined. Actually, it brought us closer. I need to remember this — the anticipation of discomfort is always worse than the discomfort itself.",
    themes: ["courage", "vulnerability", "growth"],
    mood: "proud",
    moodTag: "proud",
    categoryId: null,
    aiReflection: "You chose courage over comfort. Notice how the fear was mostly a story you were telling yourself. What other conversations might be waiting?",
    aiPerspective: "You chose courage over comfort. Notice how the fear was mostly a story you were telling yourself. What other conversations might be waiting?",
    createdAt: new Date(Date.now() - 5 * 86400000),
    updatedAt: new Date(Date.now() - 5 * 86400000),
  },
];

export const demoHabits = [
  { id: 1, userId: DEMO_USER_ID, name: "Morning Meditation", domain: "spirituality", emoji: "🧘", createdAt: new Date("2025-06-01"), isActive: true },
  { id: 2, userId: DEMO_USER_ID, name: "Journaling", domain: "mindset", emoji: "📝", createdAt: new Date("2025-06-01"), isActive: true },
  { id: 3, userId: DEMO_USER_ID, name: "Exercise", domain: "health", emoji: "💪", createdAt: new Date("2025-06-01"), isActive: true },
  { id: 4, userId: DEMO_USER_ID, name: "Read 20 pages", domain: "mindset", emoji: "📚", createdAt: new Date("2025-06-01"), isActive: true },
  { id: 5, userId: DEMO_USER_ID, name: "Gratitude practice", domain: "spirituality", emoji: "🙏", createdAt: new Date("2025-06-01"), isActive: true },
];

export const demoInsight = {
  id: 1,
  userId: DEMO_USER_ID,
  insightText: "This week showed a clear pattern: when you prioritize your morning routine, everything downstream improves. Your mood averaged 7.1 when you meditated vs 5.4 when you didn't. The conversation you had on Thursday — the one you'd been avoiding — was a turning point. You chose growth over comfort, and it opened something up. Keep leaning into that edge.",
  patterns: ["Morning routine directly impacts daily mood", "Avoiding difficult conversations increases stress", "Sleep quality correlates with next-day energy"],
  actionableSteps: ["Protect your morning routine — no phone for first 30 minutes", "Identify one conversation you're avoiding and schedule it this week", "Continue the no-screens-after-9pm experiment"],
  growthScore: 72,
  weekStart: new Date(Date.now() - 7 * 86400000),
  createdAt: new Date(Date.now() - 1 * 86400000),
};

export const demoCalendarEvents = [
  { id: 1, userId: DEMO_USER_ID, title: "Morning Meditation", description: "20-minute guided session", startTime: new Date(Date.now() + 1 * 86400000), endTime: null, allDay: false, color: "#8B5CF6", recurring: true, createdAt: new Date() },
  { id: 2, userId: DEMO_USER_ID, title: "Therapy Session", description: "Monthly check-in with Dr. Chen", startTime: new Date(Date.now() + 3 * 86400000), endTime: null, allDay: false, color: "#06B6D4", recurring: false, createdAt: new Date() },
  { id: 3, userId: DEMO_USER_ID, title: "30-Day Growth Milestone", description: "Review progress on inner peace journey", startTime: new Date(Date.now() + 14 * 86400000), endTime: null, allDay: true, color: "#F59E0B", recurring: false, createdAt: new Date() },
];

export const demoChatMessages = [
  { id: 1, userId: DEMO_USER_ID, sessionId: "demo-session-1", role: "user" as const, content: "I've been feeling stuck lately. Like I'm going through the motions but not really growing.", createdAt: new Date(Date.now() - 2 * 86400000) },
  { id: 2, userId: DEMO_USER_ID, sessionId: "demo-session-1", role: "assistant" as const, content: "I hear you. That feeling of stagnation — it's uncomfortable, but it's also information. When you say 'going through the motions,' what does that look like in your day-to-day? And more importantly — what would 'not stuck' feel like for you right now?", createdAt: new Date(Date.now() - 2 * 86400000) },
  { id: 3, userId: DEMO_USER_ID, sessionId: "demo-session-1", role: "user" as const, content: "I think 'not stuck' would mean actually following through on the things I say I want to do. Like I keep saying I want to meditate daily but I only do it maybe twice a week.", createdAt: new Date(Date.now() - 2 * 86400000) },
  { id: 4, userId: DEMO_USER_ID, sessionId: "demo-session-1", role: "assistant" as const, content: "There's something honest in that gap between intention and action. You're not failing at meditation — you're noticing the distance between who you are and who you're becoming. That noticing IS the practice. What if twice a week isn't failure? What if it's the foundation you're building on?", createdAt: new Date(Date.now() - 2 * 86400000) },
];

export const demoMilestones = [
  { id: 1, userId: DEMO_USER_ID, habitId: 1, habitName: "Morning Meditation", habitEmoji: "🧘", emoji: "🧘", domain: "spirituality" as const, habitDomain: "spirituality" as const, streakDays: 7, title: "First Week Complete", description: "Completed 7 consecutive days of check-ins", level: "bronze", achievedAt: new Date(Date.now() - 21 * 86400000), createdAt: new Date(Date.now() - 21 * 86400000) },
  { id: 2, userId: DEMO_USER_ID, habitId: 2, habitName: "Journaling", habitEmoji: "📝", emoji: "📝", domain: "mindset" as const, habitDomain: "mindset" as const, streakDays: 10, title: "Journal Explorer", description: "Wrote 10 journal entries", level: "silver", achievedAt: new Date(Date.now() - 14 * 86400000), createdAt: new Date(Date.now() - 14 * 86400000) },
  { id: 3, userId: DEMO_USER_ID, habitId: 3, habitName: "Exercise", habitEmoji: "💪", emoji: "💪", domain: "health" as const, habitDomain: "health" as const, streakDays: 7, title: "Habit Builder", description: "Maintained a 7-day streak on any habit", level: "gold", achievedAt: new Date(Date.now() - 7 * 86400000), createdAt: new Date(Date.now() - 7 * 86400000) },
];
