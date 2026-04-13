import {
  boolean,
  float,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  seedIntent: varchar("seedIntent", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── User Profile ─────────────────────────────────────────────────────────────

export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Core values selected during onboarding (JSON array of strings)
  coreValues: json("coreValues").$type<string[]>().default([]),
  // Short-term goals
  shortTermGoals: text("shortTermGoals"),
  // Long-term vision
  longTermVision: text("longTermVision"),
  // Personality notes from questionnaire
  personalityNotes: text("personalityNotes"),
  // Beliefs captured during onboarding
  beliefs: text("beliefs"),
  // Avatar / avatar emoji chosen
  avatarEmoji: varchar("avatarEmoji", { length: 8 }).default("🌟"),
  // Preferred name / how the AI should address them
  preferredName: varchar("preferredName", { length: 100 }),
  // Contact info
  phone: varchar("phone", { length: 30 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  // Therapist info
  therapistName: varchar("therapistName", { length: 200 }),
  therapistPhone: varchar("therapistPhone", { length: 30 }),
  therapistEmail: varchar("therapistEmail", { length: 320 }),
  therapistNotes: text("therapistNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ─── Life Domain Scores (baseline + ongoing) ─────────────────────────────────

export const lifeDomainScores = mysqlTable("life_domain_scores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Domain: mindset, relationships, work, health, spirituality, finances
  domain: mysqlEnum("domain", [
    "mindset",
    "relationships",
    "work",
    "health",
    "spirituality",
    "finances",
  ]).notNull(),
  score: float("score").notNull(), // 0–10
  notes: text("notes"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type LifeDomainScore = typeof lifeDomainScores.$inferSelect;
export type InsertLifeDomainScore = typeof lifeDomainScores.$inferInsert;

// ─── Habits ───────────────────────────────────────────────────────────────────

export const habits = mysqlTable("habits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  domain: mysqlEnum("domain", [
    "mindset",
    "relationships",
    "work",
    "health",
    "spirituality",
    "finances",
  ]).notNull(),
  emoji: varchar("emoji", { length: 8 }).default("✨"),
  targetFrequency: mysqlEnum("targetFrequency", [
    "daily",
    "weekly",
  ]).default("daily"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = typeof habits.$inferInsert;

// ─── Habit Completions ────────────────────────────────────────────────────────

export const habitCompletions = mysqlTable("habit_completions", {
  id: int("id").autoincrement().primaryKey(),
  habitId: int("habitId").notNull(),
  userId: int("userId").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type HabitCompletion = typeof habitCompletions.$inferSelect;

// ─── Daily Check-ins ──────────────────────────────────────────────────────────

export const dailyCheckIns = mysqlTable("daily_check_ins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Mood: 1–10
  mood: int("mood").notNull(),
  // Energy: 1–10
  energy: int("energy").notNull(),
  // Stress: 1–10
  stress: int("stress").notNull(),
  // Gratitude note
  gratitude: text("gratitude"),
  // Main reflection for the day
  reflection: text("reflection"),
  // AI response to the check-in
  aiResponse: text("aiResponse"),
  // Completed habit IDs (JSON array)
  completedHabitIds: json("completedHabitIds").$type<number[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyCheckIn = typeof dailyCheckIns.$inferSelect;
export type InsertDailyCheckIn = typeof dailyCheckIns.$inferInsert;

// ─── Journal Entries ──────────────────────────────────────────────────────────

export const journalEntries = mysqlTable("journal_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 300 }),
  content: text("content").notNull(),
  // AI Higher Self perspective on this entry
  aiPerspective: text("aiPerspective"),
  // Mood tag
  moodTag: varchar("moodTag", { length: 50 }),
  // Themes detected by AI (JSON array)
  themes: json("themes").$type<string[]>().default([]),
  // Optional user-defined category
  categoryId: int("categoryId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = typeof journalEntries.$inferInsert;

// ─── Journal Categories ─────────────────────────────────────────────────────────

export const journalCategories = mysqlTable("journal_categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#8b5cf6").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JournalCategory = typeof journalCategories.$inferSelect;
export type InsertJournalCategory = typeof journalCategories.$inferInsert;

// ─── AI Chat Messages ─────────────────────────────────────────────────────────

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  // Context snapshot used for this message (JSON)
  contextSnapshot: json("contextSnapshot").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ─── Weekly Insights ──────────────────────────────────────────────────────────

export const weeklyInsights = mysqlTable("weekly_insights", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekStart: timestamp("weekStart").notNull(),
  // AI-generated insight text
  insightText: text("insightText").notNull(),
  // Actionable steps (JSON array of strings)
  actionableSteps: json("actionableSteps").$type<string[]>().default([]),
  // Pattern observations (JSON array)
  patterns: json("patterns").$type<string[]>().default([]),
  // Overall growth score for the week 0–100
  growthScore: float("growthScore").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeeklyInsight = typeof weeklyInsights.$inferSelect;
export type InsertWeeklyInsight = typeof weeklyInsights.$inferInsert;

// ─── Growth Milestones ────────────────────────────────────────────────────────

export const growthMilestones = mysqlTable("growth_milestones", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  domain: mysqlEnum("domain", [
    "mindset",
    "relationships",
    "work",
    "health",
    "spirituality",
    "finances",
    "overall",
  ]).default("overall"),
  emoji: varchar("emoji", { length: 8 }).default("🌱"),
  achievedAt: timestamp("achievedAt").defaultNow().notNull(),
});

export type GrowthMilestone = typeof growthMilestones.$inferSelect;

// ─── Growth Programs ──────────────────────────────────────────────────────────

export const growthPrograms = mysqlTable("growth_programs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  durationDays: int("durationDays").notNull(),
  category: mysqlEnum("category", [
    "emotional-mastery",
    "building-presence",
    "relationships",
    "mindfulness",
  ]).notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GrowthProgram = typeof growthPrograms.$inferSelect;
export type InsertGrowthProgram = typeof growthPrograms.$inferInsert;

// ─── Program Lessons ──────────────────────────────────────────────────────────

export const programLessons = mysqlTable("program_lessons", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  day: int("day").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  concept: text("concept").notNull(),
  exercisePrompt: text("exercisePrompt").notNull(),
  guidanceTemplate: text("guidanceTemplate"),
  order: int("order").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProgramLesson = typeof programLessons.$inferSelect;
export type InsertProgramLesson = typeof programLessons.$inferInsert;

// ─── User Program Enrollments ─────────────────────────────────────────────────

export const userProgramEnrollments = mysqlTable("user_program_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  programId: int("programId").notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  status: mysqlEnum("status", [
    "enrolled",
    "in_progress",
    "completed",
    "paused",
  ]).default("enrolled"),
  currentDay: int("currentDay").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserProgramEnrollment = typeof userProgramEnrollments.$inferSelect;
export type InsertUserProgramEnrollment = typeof userProgramEnrollments.$inferInsert;

// ─── User Lesson Responses ────────────────────────────────────────────────────

export const userLessonResponses = mysqlTable("user_lesson_responses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  programId: int("programId").notNull(),
  lessonId: int("lessonId").notNull(),
  day: int("day").notNull(),
  userReflection: text("userReflection").notNull(),
  aiFeedback: text("aiFeedback"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserLessonResponse = typeof userLessonResponses.$inferSelect;
export type InsertUserLessonResponse = typeof userLessonResponses.$inferInsert;

// ─── Push Subscriptions ────────────────────────────────────────────────────────────────────────────────

export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Web Push subscription object fields
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),   // public key
  auth: text("auth").notNull(),        // auth secret
  // IANA timezone string e.g. "America/New_York"
  timezone: varchar("timezone", { length: 100 }).default("UTC").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ─── Notification Preferences ───────────────────────────────────────────────────────────────────────

export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Whether daily reminders are enabled
  dailyReminderEnabled: boolean("dailyReminderEnabled").default(true).notNull(),
  // Hour of day in user's local time (0–23), default 6 = 6am
  reminderHour: int("reminderHour").default(6).notNull(),
  // IANA timezone string
  timezone: varchar("timezone", { length: 100 }).default("UTC").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

// ─── Calendar Events ──────────────────────────────────────────────────────────

export const calendarEvents = mysqlTable("calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  type: mysqlEnum("type", ["therapy", "goal", "habit", "reminder", "other"]).default("other").notNull(),
  // Date stored as UTC timestamp
  eventDate: timestamp("eventDate").notNull(),
  // Optional end time
  endDate: timestamp("endDate"),
  notes: text("notes"),
  color: varchar("color", { length: 20 }).default("#8b5cf6").notNull(),
  isAllDay: boolean("isAllDay").default(false).notNull(),
  // Recurrence: none | weekly | monthly
  recurrence: mysqlEnum("recurrence", ["none", "weekly", "monthly"]).default("none").notNull(),
  // Optional end date for recurring events (null = repeat indefinitely)
  recurrenceEnd: timestamp("recurrenceEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;
