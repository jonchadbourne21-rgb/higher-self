import {
  boolean,
  date,
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
  lastSessionId: varchar("lastSessionId", { length: 36 }), // UUID of last chat session
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  welcomeSpinUsed: boolean("welcomeSpinUsed").default(false).notNull(),
  // Date of last 3-day streak spin grant (to prevent duplicates per streak cycle)
  lastStreakSpinDate: date("lastStreakSpinDate"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Auth Sessions (JWT + Revocation) ──────────────────────────────────────────

export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(), // sess_xxxxx
  userId: int("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(), // 30 days
  revokedAt: timestamp("revokedAt"), // null = active, set = revoked
  userAgent: text("userAgent"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

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
  // Dynamic AI-generated reflection prompt (rotates daily, e.g. gratitude/surprise/joy)
  reflectionPrompt: text("reflectionPrompt"),
  // User's answer to the AI-generated reflection prompt
  reflectionAnswer: text("reflectionAnswer"),
  // AI-generated personalized follow-up question based on all prior answers
  followUpQuestion: text("followUpQuestion"),
  // User's answer to the AI follow-up question
  followUpAnswer: text("followUpAnswer"),
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
  // Session ID — groups messages into conversations. When user clears, a new session UUID is created.
  // NULL means legacy messages before sessions were introduced (shown in the first session).
  sessionId: varchar("sessionId", { length: 36 }),
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
    "self-awareness",
    "zen-philosophy",
    "stoicism",
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

// ─── Saved Insights (reactions from chat) ────────────────────────────────────

export const savedInsights = mysqlTable("saved_insights", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // The chat message ID this insight was saved from
  chatMessageId: int("chatMessageId"),
  // The AI response text that was saved
  content: text("content").notNull(),
  // Reaction type: heart = emotional resonance, star = actionable insight
  reactionType: mysqlEnum("reactionType", ["heart", "star"]).notNull(),
  // Optional user note added when saving
  note: text("note"),
  savedAt: timestamp("savedAt").defaultNow().notNull(),
});

export type SavedInsight = typeof savedInsights.$inferSelect;
export type InsertSavedInsight = typeof savedInsights.$inferInsert;

// ─── Chat Sessions (metadata per conversation session) ───────────────────────

export const chatSessions = mysqlTable("chat_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // The session UUID that groups chat_messages. NULL = legacy first session.
  sessionId: varchar("sessionId", { length: 36 }),
  // User-defined title for this conversation (e.g., "The breakthrough talk")
  title: varchar("title", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

// ─── Weekly Reflections (LLM-generated weekly summaries) ──────────────────────
export const weeklyReflections = mysqlTable("weekly_reflections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // ISO 8601 date string for the Monday of that week (e.g., "2026-04-13")
  weekStart: varchar("weekStart", { length: 10 }).notNull(),
  // LLM-generated summary of the week's Mirror sessions
  summary: text("summary").notNull(),
  // Number of sessions that week
  sessionCount: int("sessionCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WeeklyReflection = typeof weeklyReflections.$inferSelect;
export type InsertWeeklyReflection = typeof weeklyReflections.$inferInsert;

// ─── Milestone Achievements (streak milestones: 7, 14, 30, 100 days) ──────────

export const milestoneAchievements = mysqlTable("milestone_achievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  habitId: int("habitId").notNull(),
  // Milestone level: 7, 14, 30, 100 days
  streakDays: int("streakDays").notNull(),
  // When the milestone was achieved
  achievedAt: timestamp("achievedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MilestoneAchievement = typeof milestoneAchievements.$inferSelect;
export type InsertMilestoneAchievement = typeof milestoneAchievements.$inferInsert;


// ─── Crisis Incidents (safety audit trail for crisis keyword detection) ──────
export const crisisIncidents = mysqlTable("crisis_incidents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // The exact user message that triggered the crisis detection
  userMessage: text("userMessage").notNull(),
  // The crisis keyword(s) detected (e.g., "suicide", "self-harm")
  detectedKeywords: json("detectedKeywords").$type<string[]>().notNull(),
  // The automated kill-switch response sent to user
  killSwitchResponse: text("killSwitchResponse").notNull(),
  // Whether the user acknowledged/dismissed the crisis message
  userAcknowledged: boolean("userAcknowledged").default(false).notNull(),
  // Optional: timestamp when user acknowledged
  acknowledgedAt: timestamp("acknowledgedAt"),
  // Optional: user follow-up message after crisis (if any)
  followUpMessage: text("followUpMessage"),
  // Crisis severity: low (keywords only), medium (repeated), high (explicit threat)
  severity: mysqlEnum("severity", ["low", "medium", "high"]).default("low").notNull(),
  // Whether escalation was triggered (emergency contact notified)
  escalationTriggered: boolean("escalationTriggered").default(false).notNull(),
  // Optional: escalation details (who was notified, when)
  escalationDetails: json("escalationDetails").$type<{ contactId: number; notifiedAt: string }>(),
  // Incident timestamp
  incidentAt: timestamp("incidentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CrisisIncident = typeof crisisIncidents.$inferSelect;
export type InsertCrisisIncident = typeof crisisIncidents.$inferInsert;

// ─── Emergency Contacts (for crisis escalation) ──────────────────────────────
export const emergencyContacts = mysqlTable("emergency_contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Contact name (e.g., "Mom", "Therapist")
  name: varchar("name", { length: 100 }).notNull(),
  // Contact type: family, friend, therapist, counselor, other
  type: mysqlEnum("type", ["family", "friend", "therapist", "counselor", "other"]).notNull(),
  // Phone number for SMS/call
  phone: varchar("phone", { length: 20 }),
  // Email for email notification
  email: varchar("email", { length: 320 }),
  // Whether this contact should be notified on crisis
  notifyOnCrisis: boolean("notifyOnCrisis").default(false).notNull(),
  // Notification method: sms, email, both
  notificationMethod: mysqlEnum("notificationMethod", ["sms", "email", "both"]).default("email").notNull(),
  // Whether contact has given consent to be notified
  consentGiven: boolean("consentGiven").default(false).notNull(),
  // When consent was given
  consentGivenAt: timestamp("consentGivenAt"),
  // Whether this contact is currently active
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = typeof emergencyContacts.$inferInsert;

// ─── Crisis Notifications (log of notifications sent to emergency contacts) ──
export const crisisNotifications = mysqlTable("crisis_notifications", {
  id: int("id").autoincrement().primaryKey(),
  crisisIncidentId: int("crisisIncidentId").notNull(),
  emergencyContactId: int("emergencyContactId").notNull(),
  // Notification method used: sms, email
  method: mysqlEnum("method", ["sms", "email"]).notNull(),
  // Notification status: pending, sent, failed, delivered
  status: mysqlEnum("status", ["pending", "sent", "failed", "delivered"]).default("pending").notNull(),
  // The message sent to the emergency contact
  message: text("message").notNull(),
  // Optional error message if notification failed
  errorMessage: text("errorMessage"),
  // When the notification was sent
  sentAt: timestamp("sentAt"),
  // When the notification was delivered (if tracked)
  deliveredAt: timestamp("deliveredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CrisisNotification = typeof crisisNotifications.$inferSelect;
export type InsertCrisisNotification = typeof crisisNotifications.$inferInsert;


// ─── Pro Tier: Subscriptions ──────────────────────────────────────────────────
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  tier: mysqlEnum("tier", ["free", "pro", "pro_voice"]).default("free").notNull(),
  status: mysqlEnum("status", ["active", "canceled", "expired"]).default("active").notNull(),
  startDate: timestamp("startDate").defaultNow().notNull(),
  endDate: timestamp("endDate"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  trialStartDate: timestamp("trialStartDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─── Pro Tier: Streaks ────────────────────────────────────────────────────────
export const streaks = mysqlTable("streaks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  streakType: mysqlEnum("streakType", ["habit", "journal", "chat"]).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  lastActivityDate: timestamp("lastActivityDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Streak = typeof streaks.$inferSelect;
export type InsertStreak = typeof streaks.$inferInsert;

// ─── Pro Tier: Reward Points ──────────────────────────────────────────────────
export const rewardPointsHistory = mysqlTable("reward_points_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  points: int("points").notNull(),
  source: mysqlEnum("source", ["habit", "journal", "chat", "checkin", "spin", "redemption"]).notNull(),
  sourceId: varchar("sourceId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RewardPointsHistory = typeof rewardPointsHistory.$inferSelect;
export type InsertRewardPointsHistory = typeof rewardPointsHistory.$inferInsert;

// ─── Pro Tier: Wheel Spins ────────────────────────────────────────────────────
export const wheelSpins = mysqlTable("wheel_spins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  result: mysqlEnum("result", ["month_pro", "dare", "try_again", "week_trial", "reward_points"]).notNull(),
  prizeValue: varchar("prizeValue", { length: 255 }),
  spinnedAt: timestamp("spinnedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WheelSpin = typeof wheelSpins.$inferSelect;
export type InsertWheelSpin = typeof wheelSpins.$inferInsert;

// ─── Pro Tier: Chat Usage Daily ────────────────────────────────────────────────
export const chatUsageDaily = mysqlTable("chat_usage_daily", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  usageDate: date("usageDate").notNull(),
  chatCount: int("chatCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ChatUsageDaily = typeof chatUsageDaily.$inferSelect;
export type InsertChatUsageDaily = typeof chatUsageDaily.$inferInsert;

// ─── Pro Tier: Journal Usage Weekly ────────────────────────────────────────────
export const journalUsageWeekly = mysqlTable("journal_usage_weekly", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekStartDate: date("weekStartDate").notNull(),
  journalCount: int("journalCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type JournalUsageWeekly = typeof journalUsageWeekly.$inferSelect;
export type InsertJournalUsageWeekly = typeof journalUsageWeekly.$inferInsert;

// ─── Pro Tier: Voice Usage Monthly ─────────────────────────────────────────────
export const voiceUsageMonthly = mysqlTable("voice_usage_monthly", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  usageMonth: varchar("usageMonth", { length: 7 }).notNull(), // YYYY-MM format
  responseCount: int("responseCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VoiceUsageMonthly = typeof voiceUsageMonthly.$inferSelect;
export type InsertVoiceUsageMonthly = typeof voiceUsageMonthly.$inferInsert;

// ─── Pro Tier: Streak Rewards ─────────────────────────────────────────────────
export const streakRewards = mysqlTable("streak_rewards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  streakDays: int("streakDays").notNull(),
  rewardType: mysqlEnum("rewardType", ["two_months_pro", "one_year_pro"]).notNull(),
  rewardAppliedAt: timestamp("rewardAppliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StreakReward = typeof streakRewards.$inferSelect;
export type InsertStreakReward = typeof streakRewards.$inferInsert;

// ─── Pro Tier: Reward Grants (stackable Pro access from spins/redemptions) ────
export const rewardGrants = mysqlTable("reward_grants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Type of grant: month_pro, week_trial, two_months_pro, one_year_pro, etc.
  grantType: varchar("grantType", { length: 50 }).notNull(),
  // Human-readable label
  label: varchar("label", { length: 200 }).notNull(),
  // Duration in days
  durationDays: int("durationDays").notNull(),
  // Source: spin, redemption, streak
  source: varchar("source", { length: 50 }).notNull(),
  // Status: pending (not yet activated), active (currently in use), expired, used (was active, now done)
  status: mysqlEnum("status", ["pending", "active", "expired", "used"]).default("pending").notNull(),
  // When this grant was activated (set to Pro)
  activatedAt: timestamp("activatedAt"),
  // When this grant expires
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RewardGrant = typeof rewardGrants.$inferSelect;
export type InsertRewardGrant = typeof rewardGrants.$inferInsert;


// ─── V2V Voice Sessions ──────────────────────────────────────────────────────

export const v2vSessions = mysqlTable("v2v_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionUuid: varchar("sessionUuid", { length: 36 }).notNull(),
  title: varchar("title", { length: 200 }),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});
export type V2vSession = typeof v2vSessions.$inferSelect;
export type InsertV2vSession = typeof v2vSessions.$inferInsert;

// ─── V2V Voice Messages ──────────────────────────────────────────────────────

export const v2vMessages = mysqlTable("v2v_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  transcript: text("transcript").notNull(),
  emotion1Name: varchar("emotion1Name", { length: 64 }),
  emotion1Score: float("emotion1Score"),
  emotion2Name: varchar("emotion2Name", { length: 64 }),
  emotion2Score: float("emotion2Score"),
  emotion3Name: varchar("emotion3Name", { length: 64 }),
  emotion3Score: float("emotion3Score"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type V2vMessage = typeof v2vMessages.$inferSelect;
export type InsertV2vMessage = typeof v2vMessages.$inferInsert;


// ─── Memory Embeddings (RAG Vector Store) ────────────────────────────────────

export const memoryEmbeddings = mysqlTable("memory_embeddings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Source type: journal, chat, voice, checkin, program_response
  sourceType: mysqlEnum("sourceType", [
    "journal",
    "chat",
    "voice",
    "checkin",
    "program_response",
  ]).notNull(),
  // ID of the source record (journalEntries.id, chatMessages.id, v2vMessages.id, etc.)
  sourceId: int("sourceId"),
  // The text content that was embedded
  content: text("content").notNull(),
  // 3072-dimensional embedding vector stored as JSON array of floats
  embedding: json("embedding").$type<number[]>().notNull(),
  // Optional metadata for filtering (domain, mood, theme, etc.)
  metadata: json("metadata").$type<Record<string, string>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MemoryEmbedding = typeof memoryEmbeddings.$inferSelect;
export type InsertMemoryEmbedding = typeof memoryEmbeddings.$inferInsert;

// ─── User Personality Profiles (AI Mirror Learning) ──────────────────────────

export const userPersonalityProfiles = mysqlTable("user_personality_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Personality traits extracted from interactions (e.g., ["introspective", "analytical", "empathetic"])
  traits: json("traits").$type<string[]>().default([]),
  // Communication style observations (e.g., "uses metaphors frequently, prefers direct feedback")
  communicationStyle: text("communicationStyle"),
  // Emotional patterns observed (e.g., "tends to intellectualize emotions, avoids vulnerability")
  emotionalPatterns: text("emotionalPatterns"),
  // Recurring themes in their reflections (e.g., ["perfectionism", "fear of failure", "need for control"])
  recurringThemes: json("recurringThemes").$type<string[]>().default([]),
  // Growth edges identified (areas where they're actively working on themselves)
  growthEdges: json("growthEdges").$type<string[]>().default([]),
  // How they prefer to be challenged (e.g., "responds well to direct questions, shuts down with criticism")
  challengeStyle: text("challengeStyle"),
  // Last time the profile was updated by the AI analysis
  lastAnalyzedAt: timestamp("lastAnalyzedAt"),
  // Number of interactions analyzed to build this profile
  interactionCount: int("interactionCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserPersonalityProfile = typeof userPersonalityProfiles.$inferSelect;
export type InsertUserPersonalityProfile = typeof userPersonalityProfiles.$inferInsert;

// ─── Psychological Time Capsule ────────────────────────────────────────────────

export const psychologicalFingerprints = mysqlTable("psychological_fingerprints", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Source of the session: chat, voice, checkin, program
  sessionType: mysqlEnum("sessionType", ["chat", "voice", "checkin", "program"]).notNull(),
  // Optional reference to the specific session/message
  sessionId: varchar("sessionId", { length: 255 }),
  // The dominant emotional tone detected (e.g., "anxious longing", "quiet grief", "defiant hope")
  emotionalTone: varchar("emotionalTone", { length: 500 }).notNull(),
  // The core belief the user expressed about themselves (e.g., "I'm not enough", "I don't deserve rest")
  coreBelief: text("coreBelief").notNull(),
  // One unresolved tension they named (e.g., "wanting connection but fearing vulnerability")
  unresolvedTension: text("unresolvedTension").notNull(),
  // Raw excerpts from the user's own words (exact quotes that reveal their voice)
  rawExcerpts: json("rawExcerpts").$type<string[]>().notNull(),
  // The person they said they wanted to become (aspirational self)
  aspirationalSelf: text("aspirationalSelf"),
  extractedAt: timestamp("extractedAt").defaultNow().notNull(),
});
export type PsychologicalFingerprint = typeof psychologicalFingerprints.$inferSelect;
export type InsertPsychologicalFingerprint = typeof psychologicalFingerprints.$inferInsert;

export const timeCapsuleSettings = mysqlTable("time_capsule_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Delivery cadence in days (30, 90, 365)
  cadenceDays: int("cadenceDays").notNull().default(30),
  // Whether the feature is enabled
  isEnabled: boolean("isEnabled").notNull().default(true),
  // When the next letter should be delivered (UTC timestamp)
  nextDeliveryAt: timestamp("nextDeliveryAt"),
  // Heartbeat cron task UID for managing the scheduled job
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TimeCapsuleSetting = typeof timeCapsuleSettings.$inferSelect;
export type InsertTimeCapsuleSetting = typeof timeCapsuleSettings.$inferInsert;

export const timeCapsuleLetters = mysqlTable("time_capsule_letters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // The generated letter content (first-person, user's linguistic style)
  letterContent: text("letterContent").notNull(),
  // IDs of the fingerprints used to generate this letter
  fingerprintIds: json("fingerprintIds").$type<number[]>().notNull(),
  // Status: pending (generated but not yet delivered), delivered, read
  status: mysqlEnum("status", ["pending", "delivered", "read"]).notNull().default("pending"),
  // When the letter was generated
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  // When the letter was delivered to the user
  deliveredAt: timestamp("deliveredAt"),
  // When the user first read the letter
  readAt: timestamp("readAt"),
  // The time period this letter covers (from-to dates)
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  // --- Engagement Tracking (First-Strike PoC Step 3) ---
  // The drift score at time of generation (snapshot)
  driftScoreSnapshot: float("driftScoreSnapshot"),
  // The valence data from session fingerprints (Gemini)
  valenceSnapshot: json("valenceSnapshot").$type<{ avg: number; trend: string } | null>(),
  // Whether user started a new session within 48h of reading
  sessionStartedWithin48h: boolean("sessionStartedWithin48h"),
  // Timestamp of first session after letter delivery (for measuring re-engagement)
  firstSessionAfterDelivery: timestamp("firstSessionAfterDelivery"),
  // The accountability question appended to the letter
  accountabilityQuestion: text("accountabilityQuestion"),
});
export type TimeCapsuleLetter = typeof timeCapsuleLetters.$inferSelect;
export type InsertTimeCapsuleLetter = typeof timeCapsuleLetters.$inferInsert;

// ─── Session Fingerprints (First-Strike PoC) ─────────────────────────────────
// Extracted after each Mirrored session via Gemini 2.5 Flash.
// Invisible to the user in the UI — purely for pattern analysis.

export const sessionFingerprints = mysqlTable("session_fingerprints", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // The session ID this fingerprint was extracted from (chat sessionId or check-in id)
  sessionId: varchar("sessionId", { length: 36 }).notNull(),
  // Source type: 'chat' or 'checkin'
  sourceType: mysqlEnum("sourceType", ["chat", "checkin"]).notNull(),
  // (a) Dominant emotional tone on a valence scale: -1.0 (very negative) to +1.0 (very positive)
  emotionalValence: float("emotionalValence").notNull(),
  // (b) The user's stated self-belief in one sentence
  selfBelief: text("selfBelief").notNull(),
  // (c) The primary unresolved tension named
  unresolvedTension: text("unresolvedTension").notNull(),
  // Raw extraction metadata (model, token count, etc.)
  extractionMeta: json("extractionMeta").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SessionFingerprint = typeof sessionFingerprints.$inferSelect;
export type InsertSessionFingerprint = typeof sessionFingerprints.$inferInsert;

// ─── Linguistic Drift Tracker (First-Strike PoC — Step 2) ────────────────────
// Weekly analysis of self-descriptive vocabulary changes across sessions.
// Invisible to the user — purely for pattern analysis and future interventions.

export const linguisticDrift = mysqlTable("linguistic_drift", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // The week this analysis covers (start of week, UTC Monday 00:00)
  weekStart: timestamp("weekStart").notNull(),
  // Directional drift score: -1.0 (moving away from goals) to +1.0 (moving toward goals)
  driftScore: float("driftScore").notNull(),
  // Words/phrases that appeared in previous weeks but NOT this week
  retiredWords: json("retiredWords").$type<string[]>().notNull(),
  // Words/phrases that are NEW this week (not seen in previous analysis windows)
  newWords: json("newWords").$type<string[]>().notNull(),
  // Top self-descriptive vocabulary this week (frequency-ranked)
  currentVocabulary: json("currentVocabulary").$type<string[]>().notNull(),
  // The user's stated goals at time of analysis (snapshot for drift comparison)
  goalSnapshot: text("goalSnapshot"),
  // Number of sessions analyzed
  sessionsAnalyzed: int("sessionsAnalyzed").notNull(),
  // Analysis metadata
  analysisMeta: json("analysisMeta").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LinguisticDrift = typeof linguisticDrift.$inferSelect;
export type InsertLinguisticDrift = typeof linguisticDrift.$inferInsert;

// ─── Entropy Scores (First-Strike PoC — Entropy Detection Engine) ───────────
// Daily behavioral entropy score per user. Triggers re-engagement when >65 for 2 consecutive days.

export const entropyScores = mysqlTable("entropy_scores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Overall entropy score (0-100)
  score: float("score").notNull(),
  // Component scores (each 0-100 before weighting)
  daysSinceCheckin: int("daysSinceCheckin").notNull(),
  daysSinceCheckinScore: float("daysSinceCheckinScore").notNull(),
  journalTrendScore: float("journalTrendScore").notNull(),
  habitCompletionRate: float("habitCompletionRate").notNull(),
  habitCompletionScore: float("habitCompletionScore").notNull(),
  prosodyEnergyScore: float("prosodyEnergyScore").notNull(),
  // Whether this score triggered the threshold (>65 for 2 consecutive days)
  triggered: boolean("triggered").default(false).notNull(),
  // Number of consecutive days above threshold (including this one)
  consecutiveDaysAbove: int("consecutiveDaysAbove").default(0).notNull(),
  // Date this score was calculated for (YYYY-MM-DD as varchar for easy querying)
  scoreDate: varchar("scoreDate", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EntropyScore = typeof entropyScores.$inferSelect;
export type InsertEntropyScore = typeof entropyScores.$inferInsert;

// ─── Higher Self Voicemails (Entropy-triggered outbound calls) ───────────────

export const higherSelfVoicemails = mysqlTable("higher_self_voicemails", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // The text content of the voicemail (what the Higher Self "said")
  transcript: text("transcript").notNull(),
  // URL to the generated audio file (TTS)
  audioUrl: varchar("audioUrl", { length: 500 }),
  // The entropy score that triggered this voicemail
  entropyScore: float("entropyScore").notNull(),
  // Whether the user answered the call (true) or it went to voicemail (false)
  wasAnswered: boolean("wasAnswered").notNull().default(false),
  // When the user listened to the voicemail (null if not yet listened)
  listenedAt: timestamp("listenedAt"),
  // Status: pending_generation, ready, failed
  status: mysqlEnum("status", ["pending_generation", "ready", "failed"]).notNull().default("pending_generation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type HigherSelfVoicemail = typeof higherSelfVoicemails.$inferSelect;
export type InsertHigherSelfVoicemail = typeof higherSelfVoicemails.$inferInsert;

// ─── User Scars (VOW Learning Reflection Loop) ─────────────────────────────────
// Records lessons learned from past interactions (journal entries, voice sessions, check-ins).
// Used for scar-aware weekly digest generation with VOW tournaments.

export const userScars = mysqlTable("user_scars", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // The lesson learned (e.g., "anxiety_trigger: public_speaking", "productivity_blocker: perfectionism")
  scarText: text("scarText").notNull(),
  // Category for semantic grouping: anxiety_trigger, productivity_blocker, relationship_pattern, health_issue, etc.
  category: varchar("category", { length: 100 }).notNull(),
  // Vector embedding for semantic search (stored as JSON array of floats)
  vectorEmbedding: json("vectorEmbedding").$type<number[]>(),
  // Confidence score (0-1) indicating how strongly this scar applies
  confidence: float("confidence").notNull().default(0.5),
  // Source type: journal, voice, checkin, manual
  sourceType: varchar("sourceType", { length: 50 }).notNull(),
  // Reference to the source (journal entry ID, voicemail ID, etc.)
  sourceId: int("sourceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserScar = typeof userScars.$inferSelect;
export type InsertUserScar = typeof userScars.$inferInsert;

// ─── Weekly Digests with Scar Recall ──────────────────────────────────────────
// Stores generated weekly digests with metadata about which scars were recalled.

export const weeklyDigests = mysqlTable("weekly_digests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekStartDate: timestamp("weekStartDate").notNull(),
  // The generated digest content
  digestContent: text("digestContent").notNull(),
  // Array of scar IDs that were recalled and used in generation
  scarsRecalled: json("scarsRecalled").$type<number[]>().default([]),
  // Strategy used: empathetic, analytical, action_focused
  strategy: varchar("strategy", { length: 50 }).notNull(),
  // Personalization score (0-100) indicating how well the digest addressed user's patterns
  personalizationScore: float("personalizationScore").default(0),
  // Whether the digest met proof gates (addressed top issues, avoided repeating patterns)
  passedProofGates: boolean("passedProofGates").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeeklyDigest = typeof weeklyDigests.$inferSelect;
export type InsertWeeklyDigest = typeof weeklyDigests.$inferInsert;
