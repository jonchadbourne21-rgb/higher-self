/**
 * Entropy Detection Engine (First-Strike PoC — Step 1)
 *
 * Calculates a behavioral Entropy Score (0-100) for each user based on:
 *   - Days since last check-in (weight: 30%)
 *   - Journal entry length trend (weight: 20%)
 *   - Habit completion rate over last 7 days (weight: 30%)
 *   - Voice session prosody energy score (weight: 20%)
 *
 * Trigger threshold: Entropy Score > 65 for 2 consecutive days
 */

import { getDb } from "../db";
import {
  entropyScores,
  dailyCheckIns,
  journalEntries,
  habits,
  habitCompletions,
  v2vSessions,
  v2vMessages,
  users,
} from "../../drizzle/schema";
import { eq, desc, gte, and, sql, count } from "drizzle-orm";

// ─── Weights ────────────────────────────────────────────────────────────────
const WEIGHT_CHECKIN = 0.30;
const WEIGHT_JOURNAL = 0.20;
const WEIGHT_HABITS = 0.30;
const WEIGHT_PROSODY = 0.20;

// ─── Threshold ──────────────────────────────────────────────────────────────
export const ENTROPY_THRESHOLD = 65;
export const CONSECUTIVE_DAYS_REQUIRED = 2;

// ─── Score Calculators ──────────────────────────────────────────────────────

/**
 * Days since last check-in → score (0-100).
 * 0 days = 0 (no entropy), 7+ days = 100 (max entropy).
 * Linear scale: score = min(days * (100/7), 100)
 */
export function calcCheckinScore(daysSinceCheckin: number): number {
  return Math.min(daysSinceCheckin * (100 / 7), 100);
}

/**
 * Journal entry length trend → score (0-100).
 * Compares average length of last 3 entries vs previous 3 entries.
 * If declining or no entries: higher entropy.
 * No entries at all = 80 (high entropy but not max since user might not journal).
 */
export function calcJournalTrendScore(
  recentAvgLength: number,
  previousAvgLength: number,
  hasAnyEntries: boolean
): number {
  if (!hasAnyEntries) return 80;
  if (previousAvgLength === 0) return 40; // Only recent entries, moderate
  const ratio = recentAvgLength / previousAvgLength;
  // ratio < 1 means declining (more entropy), ratio > 1 means growing (less entropy)
  // Map: 0.0 → 100, 0.5 → 75, 1.0 → 30, 1.5+ → 0
  if (ratio >= 1.5) return 0;
  if (ratio >= 1.0) return Math.round(30 - (ratio - 1.0) * 60);
  return Math.round(30 + (1.0 - ratio) * 70);
}

/**
 * Habit completion rate over last 7 days → score (0-100).
 * 100% completion = 0 entropy, 0% completion = 100 entropy.
 * No habits set = 50 (neutral).
 */
export function calcHabitScore(completionRate: number, hasHabits: boolean): number {
  if (!hasHabits) return 50;
  return Math.round((1 - completionRate) * 100);
}

/**
 * Voice session prosody energy → score (0-100).
 * Based on average emotion scores from recent v2v sessions.
 * Low energy emotions (sadness, tiredness) = high entropy.
 * No voice sessions = 50 (neutral — user might not use voice).
 */
export function calcProsodyScore(avgEnergyScore: number | null): number {
  if (avgEnergyScore === null) return 50;
  // avgEnergyScore ranges from 0 to 1 (Hume emotion scores)
  // Higher scores = more energetic emotions = less entropy
  // Map: 0.0 → 100, 0.5 → 50, 1.0 → 0
  return Math.round((1 - avgEnergyScore) * 100);
}

/**
 * Calculate the weighted entropy score.
 */
export function calculateEntropyScore(components: {
  checkinScore: number;
  journalScore: number;
  habitScore: number;
  prosodyScore: number;
}): number {
  const score =
    components.checkinScore * WEIGHT_CHECKIN +
    components.journalScore * WEIGHT_JOURNAL +
    components.habitScore * WEIGHT_HABITS +
    components.prosodyScore * WEIGHT_PROSODY;
  return Math.round(Math.min(Math.max(score, 0), 100));
}

// ─── Data Fetchers ──────────────────────────────────────────────────────────

/**
 * Get days since the user's last check-in.
 */
export async function getDaysSinceCheckin(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 30;
  const [lastCheckin] = await db
    .select({ createdAt: dailyCheckIns.createdAt })
    .from(dailyCheckIns)
    .where(eq(dailyCheckIns.userId, userId))
    .orderBy(desc(dailyCheckIns.createdAt))
    .limit(1);

  if (!lastCheckin) return 30; // Never checked in — max entropy signal
  const diffMs = Date.now() - lastCheckin.createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get journal entry length trend (recent 3 vs previous 3).
 */
export async function getJournalTrend(userId: number): Promise<{
  recentAvgLength: number;
  previousAvgLength: number;
  hasAnyEntries: boolean;
}> {
  const db = await getDb();
  if (!db) return { recentAvgLength: 0, previousAvgLength: 0, hasAnyEntries: false };
  const entries = await db
    .select({ content: journalEntries.content, createdAt: journalEntries.createdAt })
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.createdAt))
    .limit(6);

  if (entries.length === 0) {
    return { recentAvgLength: 0, previousAvgLength: 0, hasAnyEntries: false };
  }

  const recent = entries.slice(0, 3);
  const previous = entries.slice(3, 6);

  const recentAvg = recent.reduce((sum, e) => sum + (e.content?.length || 0), 0) / recent.length;
  const previousAvg = previous.length > 0
    ? previous.reduce((sum, e) => sum + (e.content?.length || 0), 0) / previous.length
    : 0;

  return { recentAvgLength: recentAvg, previousAvgLength: previousAvg, hasAnyEntries: true };
}

/**
 * Get habit completion rate over the last 7 days.
 */
export async function getHabitCompletionRate(userId: number): Promise<{
  rate: number;
  hasHabits: boolean;
}> {
  const db = await getDb();
  if (!db) return { rate: 0, hasHabits: false };

  // Get active daily habits for this user
  const activeHabits = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.isActive, true)));

  if (activeHabits.length === 0) {
    return { rate: 0, hasHabits: false };
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Count completions in last 7 days
  const [completionCount] = await db
    .select({ total: count() })
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.userId, userId),
        gte(habitCompletions.completedAt, sevenDaysAgo)
      )
    );

  // Max possible = activeHabits.length * 7 days
  const maxPossible = activeHabits.length * 7;
  const rate = Math.min((completionCount?.total || 0) / maxPossible, 1);

  return { rate, hasHabits: true };
}

/**
 * Get average prosody energy from recent voice sessions (last 7 days).
 * Uses the emotion scores from v2v messages — high-energy emotions
 * (joy, excitement, interest) vs low-energy (sadness, boredom, tiredness).
 */
export async function getProsodyEnergy(userId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get recent voice sessions
  const sessions = await db
    .select({ id: v2vSessions.id })
    .from(v2vSessions)
    .where(
      and(
        eq(v2vSessions.userId, userId),
        gte(v2vSessions.startedAt, sevenDaysAgo)
      )
    );

  if (sessions.length === 0) return null;

  const sessionIds = sessions.map((s) => s.id);

  // Get user messages with emotion scores from these sessions
  const messages = await db
    .select({
      emotion1Name: v2vMessages.emotion1Name,
      emotion1Score: v2vMessages.emotion1Score,
      emotion2Name: v2vMessages.emotion2Name,
      emotion2Score: v2vMessages.emotion2Score,
      emotion3Name: v2vMessages.emotion3Name,
      emotion3Score: v2vMessages.emotion3Score,
    })
    .from(v2vMessages)
    .where(
      and(
        eq(v2vMessages.role, "user"),
        sql`${v2vMessages.sessionId} IN (${sql.join(sessionIds.map(id => sql`${id}`), sql`, `)})`
      )
    );

  if (messages.length === 0) return null;

  // High-energy emotions (positive signal — less entropy)
  const highEnergyEmotions = new Set([
    "joy", "excitement", "interest", "amusement", "admiration",
    "determination", "concentration", "surprise (positive)", "love",
    "pride", "triumph", "satisfaction", "relief", "contentment",
  ]);

  // Low-energy emotions (negative signal — more entropy)
  const lowEnergyEmotions = new Set([
    "sadness", "tiredness", "boredom", "disappointment", "distress",
    "anxiety", "fear", "shame", "guilt", "contempt", "disgust",
  ]);

  let totalScore = 0;
  let scoreCount = 0;

  for (const msg of messages) {
    const emotions = [
      { name: msg.emotion1Name, score: msg.emotion1Score },
      { name: msg.emotion2Name, score: msg.emotion2Score },
      { name: msg.emotion3Name, score: msg.emotion3Score },
    ];

    for (const e of emotions) {
      if (!e.name || e.score === null) continue;
      const lower = e.name.toLowerCase();
      if (highEnergyEmotions.has(lower)) {
        totalScore += e.score;
        scoreCount++;
      } else if (lowEnergyEmotions.has(lower)) {
        totalScore += (1 - e.score); // Invert: high low-energy score = low energy
        scoreCount++;
      }
    }
  }

  if (scoreCount === 0) return null;
  return totalScore / scoreCount;
}

/**
 * Get the previous day's entropy score for consecutive-day tracking.
 */
export async function getPreviousDayScore(userId: number, currentDate: string): Promise<{
  score: number;
  consecutiveDaysAbove: number;
} | null> {
  const db = await getDb();
  if (!db) return null;

  // Get yesterday's date
  const yesterday = new Date(currentDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const [prev] = await db
    .select({
      score: entropyScores.score,
      consecutiveDaysAbove: entropyScores.consecutiveDaysAbove,
    })
    .from(entropyScores)
    .where(
      and(
        eq(entropyScores.userId, userId),
        eq(entropyScores.scoreDate, yesterdayStr)
      )
    )
    .limit(1);

  return prev || null;
}

/**
 * Calculate and store the entropy score for a user on a given date.
 */
export async function calculateAndStoreEntropy(userId: number, scoreDate: string): Promise<{
  score: number;
  triggered: boolean;
  consecutiveDaysAbove: number;
}> {
  const db = await getDb();
  if (!db) return { score: 0, triggered: false, consecutiveDaysAbove: 0 };

  // Fetch all component data
  const daysSince = await getDaysSinceCheckin(userId);
  const journalTrend = await getJournalTrend(userId);
  const habitData = await getHabitCompletionRate(userId);
  const prosodyEnergy = await getProsodyEnergy(userId);

  // Calculate component scores
  const checkinScore = calcCheckinScore(daysSince);
  const journalScore = calcJournalTrendScore(
    journalTrend.recentAvgLength,
    journalTrend.previousAvgLength,
    journalTrend.hasAnyEntries
  );
  const habitScore = calcHabitScore(habitData.rate, habitData.hasHabits);
  const prosodyScore = calcProsodyScore(prosodyEnergy);

  // Calculate final weighted score
  const score = calculateEntropyScore({
    checkinScore,
    journalScore,
    habitScore,
    prosodyScore,
  });

  // Check consecutive days above threshold
  const prevDay = await getPreviousDayScore(userId, scoreDate);
  let consecutiveDaysAbove = 0;

  if (score > ENTROPY_THRESHOLD) {
    consecutiveDaysAbove = prevDay && prevDay.score > ENTROPY_THRESHOLD
      ? prevDay.consecutiveDaysAbove + 1
      : 1;
  }

  const triggered = consecutiveDaysAbove >= CONSECUTIVE_DAYS_REQUIRED;

  // Store the score
  await db.insert(entropyScores).values({
    userId,
    score,
    daysSinceCheckin: daysSince,
    daysSinceCheckinScore: checkinScore,
    journalTrendScore: journalScore,
    habitCompletionRate: habitData.rate,
    habitCompletionScore: habitScore,
    prosodyEnergyScore: prosodyScore,
    triggered,
    consecutiveDaysAbove,
    scoreDate,
  });

  return { score, triggered, consecutiveDaysAbove };
}

/**
 * Get all active user IDs for entropy processing.
 */
export async function getAllActiveUserIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ id: users.id })
    .from(users);
  return result.map((r: { id: number }) => r.id);
}
