import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  linguisticDrift,
  chatMessages,
  dailyCheckIns,
  userProfiles,
  users,
  type InsertLinguisticDrift,
} from "../../drizzle/schema";

// ─── Linguistic Drift Tracker ─────────────────────────────────────────────────
// Compares self-descriptive vocabulary across session transcripts weekly.
// No external API needed — pure NLP on existing transcript data.

// Stop words to exclude from vocabulary analysis
const STOP_WORDS = new Set([
  "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
  "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her",
  "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs",
  "themselves", "what", "which", "who", "whom", "this", "that", "these", "those",
  "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if",
  "or", "because", "as", "until", "while", "of", "at", "by", "for", "with",
  "about", "against", "between", "through", "during", "before", "after", "above",
  "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under",
  "again", "further", "then", "once", "here", "there", "when", "where", "why",
  "how", "all", "both", "each", "few", "more", "most", "other", "some", "such",
  "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s",
  "t", "can", "will", "just", "don", "should", "now", "d", "ll", "m", "o", "re",
  "ve", "y", "ain", "aren", "couldn", "didn", "doesn", "hadn", "hasn", "haven",
  "isn", "ma", "mightn", "mustn", "needn", "shan", "shouldn", "wasn", "weren",
  "won", "wouldn", "also", "like", "really", "think", "know", "feel", "want",
  "need", "get", "got", "going", "go", "make", "made", "thing", "things",
  "would", "could", "much", "well", "even", "still", "way", "back", "yeah",
  "okay", "ok", "right", "good", "bad", "lot", "something", "anything",
  "everything", "nothing", "one", "two", "three", "time", "day", "today",
  "yesterday", "tomorrow", "week", "month", "year", "maybe", "actually",
  "kind", "sort", "bit", "little", "big", "new", "old", "first", "last",
]);

// Self-descriptive indicator phrases — words that signal identity statements
const SELF_DESCRIPTIVE_MARKERS = [
  "i am", "i'm", "i feel", "i believe", "i think i", "i always", "i never",
  "i can't", "i cannot", "i won't", "i don't", "i shouldn't", "i should",
  "i must", "i need to", "i want to", "i have to", "i used to", "i wish",
  "i'm afraid", "i'm scared", "i'm worried", "i'm happy", "i'm proud",
  "i'm not", "i'm trying", "i'm learning", "i'm becoming", "i'm capable",
  "i deserve", "i'm worthy", "i'm enough", "i'm strong", "i'm weak",
  "my problem", "my issue", "my strength", "my weakness", "my fear",
];

/**
 * Extract self-descriptive vocabulary from a body of text.
 * Returns a frequency-sorted array of meaningful words/phrases.
 */
export function extractSelfDescriptiveVocabulary(texts: string[]): Map<string, number> {
  const vocabulary = new Map<string, number>();
  const combined = texts.join("\n").toLowerCase();

  // Extract words around self-descriptive markers
  for (const marker of SELF_DESCRIPTIVE_MARKERS) {
    const regex = new RegExp(`${marker}\\s+([\\w\\s]{3,40}?)(?:[.,!?;]|$)`, "gi");
    let match;
    while ((match = regex.exec(combined)) !== null) {
      const phrase = match[1].trim();
      // Extract individual meaningful words from the phrase
      const words = phrase.split(/\s+/).filter(
        (w) => w.length > 2 && !STOP_WORDS.has(w)
      );
      for (const word of words) {
        vocabulary.set(word, (vocabulary.get(word) || 0) + 1);
      }
      // Also store 2-word phrases if meaningful
      if (words.length >= 2) {
        for (let i = 0; i < words.length - 1; i++) {
          const bigram = `${words[i]} ${words[i + 1]}`;
          vocabulary.set(bigram, (vocabulary.get(bigram) || 0) + 1);
        }
      }
    }
  }

  // Also extract standalone adjectives/descriptors used with "I"
  const adjectivePattern = /\bi(?:'m|'m| am)\s+(?:so\s+|very\s+|really\s+)?(\w{4,})/gi;
  let adjMatch;
  while ((adjMatch = adjectivePattern.exec(combined)) !== null) {
    const word = adjMatch[1].toLowerCase();
    if (!STOP_WORDS.has(word) && word.length > 3) {
      vocabulary.set(word, (vocabulary.get(word) || 0) + 1);
    }
  }

  return vocabulary;
}

/**
 * Compare two vocabulary sets and identify retired/new words.
 */
export function compareVocabulary(
  previous: Map<string, number>,
  current: Map<string, number>
): { retired: string[]; newWords: string[]; shared: string[] } {
  const retired: string[] = [];
  const newWords: string[] = [];
  const shared: string[] = [];

  // Words in previous but not in current = retired
  Array.from(previous.keys()).forEach((word) => {
    if (!current.has(word)) {
      retired.push(word);
    } else {
      shared.push(word);
    }
  });

  // Words in current but not in previous = new
  Array.from(current.keys()).forEach((word) => {
    if (!previous.has(word)) {
      newWords.push(word);
    }
  });

  return { retired, newWords, shared };
}

/**
 * Compute drift score based on vocabulary alignment with user goals.
 * Returns -1.0 (moving away from goals) to +1.0 (moving toward goals).
 */
export function computeDriftScore(
  newWords: string[],
  retiredWords: string[],
  goalText: string
): number {
  if (!goalText || (newWords.length === 0 && retiredWords.length === 0)) {
    return 0;
  }

  const goalWordsArray = goalText
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  const goalWords = new Set(goalWordsArray);

  if (goalWords.size === 0) return 0;

  const goalWordsList = Array.from(goalWords);

  // Positive signal: new words that align with goals
  let positiveSignal = 0;
  for (const word of newWords) {
    const wordParts = word.split(" ");
    for (const part of wordParts) {
      if (goalWords.has(part)) {
        positiveSignal += 1;
      }
    }
    // Also check semantic proximity (shared stems)
    for (const goalWord of goalWordsList) {
      if (part_shares_stem(word, goalWord)) {
        positiveSignal += 0.5;
      }
    }
  }

  // Negative signal: retired words that aligned with goals (losing goal-aligned language)
  let negativeSignal = 0;
  for (const word of retiredWords) {
    const wordParts = word.split(" ");
    for (const part of wordParts) {
      if (goalWords.has(part)) {
        negativeSignal += 1;
      }
    }
    for (const goalWord of goalWordsList) {
      if (part_shares_stem(word, goalWord)) {
        negativeSignal += 0.5;
      }
    }
  }

  // Also: positive if retiring negative self-talk words
  const negativeSelfTalk = new Set([
    "can't", "cant", "never", "impossible", "hopeless", "worthless", "failure",
    "stupid", "weak", "pathetic", "useless", "broken", "stuck", "trapped",
    "afraid", "scared", "anxious", "overwhelmed", "exhausted", "defeated",
  ]);

  for (const word of retiredWords) {
    if (negativeSelfTalk.has(word)) {
      positiveSignal += 0.75; // Retiring negative self-talk is progress
    }
  }

  for (const word of newWords) {
    if (negativeSelfTalk.has(word)) {
      negativeSignal += 0.75; // Adopting negative self-talk is regression
    }
  }

  // Normalize to [-1, 1]
  const totalSignal = positiveSignal + negativeSignal;
  if (totalSignal === 0) return 0;

  const rawScore = (positiveSignal - negativeSignal) / totalSignal;
  return Math.max(-1, Math.min(1, rawScore));
}

/**
 * Simple stem comparison — checks if two words share a common root (first 4+ chars).
 */
function part_shares_stem(word1: string, word2: string): boolean {
  const minLen = Math.min(word1.length, word2.length);
  if (minLen < 4) return false;
  const stemLen = Math.max(4, Math.floor(minLen * 0.7));
  return word1.slice(0, stemLen) === word2.slice(0, stemLen);
}

/**
 * Get the Monday 00:00 UTC of the current week.
 */
export function getWeekStartUTC(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

/**
 * Fetch all user messages from the past N weeks for a given user.
 */
async function getUserSessionTexts(
  userId: number,
  since: Date
): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  // Get chat messages (user role only)
  const chatMsgs = await db
    .select({ content: chatMessages.content })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.role, "user"),
        gte(chatMessages.createdAt, since)
      )
    );

  // Get check-in reflections
  const checkIns = await db
    .select({
      gratitude: dailyCheckIns.gratitude,
      reflection: dailyCheckIns.reflection,
      reflectionAnswer: dailyCheckIns.reflectionAnswer,
      followUpAnswer: dailyCheckIns.followUpAnswer,
    })
    .from(dailyCheckIns)
    .where(
      and(
        eq(dailyCheckIns.userId, userId),
        gte(dailyCheckIns.createdAt, since)
      )
    );

  const texts: string[] = [];

  for (const msg of chatMsgs) {
    if (msg.content && msg.content.length > 20) {
      texts.push(msg.content);
    }
  }

  for (const ci of checkIns) {
    if (ci.gratitude) texts.push(ci.gratitude);
    if (ci.reflection) texts.push(ci.reflection);
    if (ci.reflectionAnswer) texts.push(ci.reflectionAnswer);
    if (ci.followUpAnswer) texts.push(ci.followUpAnswer);
  }

  return texts;
}

/**
 * Get the user's stated goals (short-term + long-term) for drift comparison.
 */
async function getUserGoals(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "";

  const profiles = await db
    .select({
      shortTermGoals: userProfiles.shortTermGoals,
      longTermVision: userProfiles.longTermVision,
    })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (profiles.length === 0) return "";

  const parts: string[] = [];
  if (profiles[0].shortTermGoals) parts.push(profiles[0].shortTermGoals);
  if (profiles[0].longTermVision) parts.push(profiles[0].longTermVision);
  return parts.join(" ");
}

/**
 * Get the previous week's vocabulary for comparison.
 */
async function getPreviousWeekVocabulary(
  userId: number,
  currentWeekStart: Date
): Promise<string[] | null> {
  const db = await getDb();
  if (!db) return null;

  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);

  const results = await db
    .select({ currentVocabulary: linguisticDrift.currentVocabulary })
    .from(linguisticDrift)
    .where(
      and(
        eq(linguisticDrift.userId, userId),
        eq(linguisticDrift.weekStart, prevWeekStart)
      )
    )
    .limit(1);

  if (results.length === 0) return null;
  return results[0].currentVocabulary;
}

/**
 * Run the full drift analysis for a single user for the current week.
 * Returns the stored drift record or null if insufficient data.
 */
export async function analyzeDriftForUser(userId: number): Promise<InsertLinguisticDrift | null> {
  const weekStart = getWeekStartUTC();
  const twoWeeksAgo = new Date(weekStart);
  twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 7); // Get this past week's data

  // Fetch this week's session texts
  const currentTexts = await getUserSessionTexts(userId, twoWeeksAgo);

  // Need at least 5 substantive messages for meaningful analysis
  if (currentTexts.length < 5) {
    return null;
  }

  // Extract current vocabulary
  const currentVocab = extractSelfDescriptiveVocabulary(currentTexts);

  if (currentVocab.size < 3) {
    return null; // Not enough self-descriptive language to analyze
  }

  // Get previous week's vocabulary for comparison
  const prevVocabArray = await getPreviousWeekVocabulary(userId, weekStart);

  let retired: string[] = [];
  let newWords: string[] = [];

  if (prevVocabArray && prevVocabArray.length > 0) {
    // Build a frequency map from previous (treat all as freq=1 since we stored the list)
    const prevVocab = new Map<string, number>();
    for (const word of prevVocabArray) {
      prevVocab.set(word, 1);
    }
    const comparison = compareVocabulary(prevVocab, currentVocab);
    retired = comparison.retired;
    newWords = comparison.newWords;
  } else {
    // First week — everything is "new"
    newWords = Array.from(currentVocab.keys());
  }

  // Get user goals for drift scoring
  const goalText = await getUserGoals(userId);

  // Compute drift score
  const driftScore = computeDriftScore(newWords, retired, goalText);

  // Sort vocabulary by frequency for storage
  const sortedVocab = Array.from(currentVocab.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50) // Keep top 50
    .map(([word]) => word);

  // Store the result
  const record: InsertLinguisticDrift = {
    userId,
    weekStart,
    driftScore,
    retiredWords: retired.slice(0, 30), // Cap at 30
    newWords: newWords.slice(0, 30),
    currentVocabulary: sortedVocab,
    goalSnapshot: goalText || null,
    sessionsAnalyzed: currentTexts.length,
    analysisMeta: {
      vocabSize: currentVocab.size,
      prevVocabSize: prevVocabArray?.length ?? 0,
      retiredCount: retired.length,
      newCount: newWords.length,
    },
  };

  const db = await getDb();
  if (!db) return null;

  await db.insert(linguisticDrift).values(record);

  console.log(
    `[LinguisticDrift] User ${userId}: drift=${driftScore.toFixed(2)}, ` +
    `vocab=${currentVocab.size}, retired=${retired.length}, new=${newWords.length}`
  );

  return record;
}

/**
 * Run drift analysis for ALL active users.
 * Called by the weekly heartbeat cron job.
 */
export async function runWeeklyDriftAnalysis(): Promise<{
  usersProcessed: number;
  usersSkipped: number;
  errors: number;
}> {
  const db = await getDb();
  if (!db) return { usersProcessed: 0, usersSkipped: 0, errors: 0 };

  // Get all users who have been active in the last 2 weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const activeUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(gte(users.lastSignedIn, twoWeeksAgo));

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of activeUsers) {
    try {
      const result = await analyzeDriftForUser(user.id);
      if (result) {
        processed++;
      } else {
        skipped++;
      }
    } catch (err) {
      errors++;
      console.error(`[LinguisticDrift] Error for user ${user.id}:`, err);
    }
  }

  console.log(
    `[LinguisticDrift] Weekly analysis complete: ${processed} processed, ${skipped} skipped, ${errors} errors`
  );

  return { usersProcessed: processed, usersSkipped: skipped, errors };
}

/**
 * Get drift history for a user.
 */
export async function getUserDriftHistory(userId: number, limit = 12) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(linguisticDrift)
    .where(eq(linguisticDrift.userId, userId))
    .orderBy(desc(linguisticDrift.weekStart))
    .limit(limit);
}
