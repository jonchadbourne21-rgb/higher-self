/**
 * Outbound Call System — "Your Higher Self is calling..."
 *
 * When the entropy detection engine triggers (score > 65 for 2 consecutive days),
 * this module:
 * 1. Sends a push notification styled as an incoming call
 * 2. If user answers → opens V2V session with entropy-aware system prompt
 * 3. If user declines → generates a voicemail via TTS and stores it
 */

import { getDb } from "./db";
import { getActivePushSubscription } from "./db";
import { sendPushNotification } from "./pushNotifications";
import { higherSelfVoicemails } from "../drizzle/schema";
import { humeTextToSpeech } from "./humeTts";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { getUserProfile, getRecentCheckIns } from "./db";
import { eq, desc } from "drizzle-orm";
import { entropyScores, sessionFingerprints, linguisticDrift } from "../drizzle/schema";
import { randomUUID } from "crypto";

// ─── Send the "incoming call" push notification ─────────────────────────────

export async function sendOutboundCallNotification(userId: number, entropyScore: number): Promise<boolean> {
  const sub = await getActivePushSubscription(userId);
  if (!sub) {
    console.log(`[OutboundCall] No active push subscription for user ${userId}`);
    return false;
  }

  // Create a pending voicemail record (in case user declines)
  const db = await getDb();
  if (!db) return false;

  const result = await db.insert(higherSelfVoicemails).values({
    userId,
    transcript: "", // Will be filled if user declines
    entropyScore,
    wasAnswered: false,
    status: "pending_generation",
  });
  const voicemailId = Number(result[0].insertId);

  // Send push notification styled as an incoming call
  const sent = await sendPushNotification(
    sub.endpoint,
    sub.p256dh,
    sub.auth,
    {
      title: "Your Higher Self is calling...",
      body: "Tap to answer",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      url: `/mirror?entropyCall=true&voicemailId=${voicemailId}`,
      tag: `entropy-call-${userId}-${Date.now()}`,
    }
  );

  if (sent) {
    console.log(`[OutboundCall] Push sent to user ${userId} (entropy: ${entropyScore}, voicemailId: ${voicemailId})`);
  }

  return sent;
}

// ─── Build entropy-aware system prompt for V2V session ──────────────────────

export async function buildEntropyAwarePrompt(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return getFallbackPrompt();

  const profile = await getUserProfile(userId);
  const recentCheckIns = await getRecentCheckIns(userId, 14);
  const name = profile?.preferredName || "friend";

  // Fetch recent entropy scores
  const recentEntropy = await db
    .select()
    .from(entropyScores)
    .where(eq(entropyScores.userId, userId))
    .orderBy(desc(entropyScores.createdAt))
    .limit(7);

  // Fetch recent session fingerprints
  const recentFingerprints = await db
    .select()
    .from(sessionFingerprints)
    .where(eq(sessionFingerprints.userId, userId))
    .orderBy(desc(sessionFingerprints.createdAt))
    .limit(5);

  // Fetch latest drift score
  const latestDrift = await db
    .select()
    .from(linguisticDrift)
    .where(eq(linguisticDrift.userId, userId))
    .orderBy(desc(linguisticDrift.createdAt))
    .limit(1);

  // Build context strings
  const entropyContext = recentEntropy.length > 0
    ? recentEntropy.map(e => `Day ${e.scoreDate}: score ${e.score.toFixed(0)}/100`).join("; ")
    : "No recent scores";

  const fingerprintContext = recentFingerprints.length > 0
    ? recentFingerprints.map(f =>
        `Valence: ${f.emotionalValence.toFixed(2)}, Belief: "${f.selfBelief}", Tension: "${f.unresolvedTension}"`
      ).join("\n")
    : "No fingerprints available";

  const driftContext = latestDrift.length > 0
    ? `Drift score: ${latestDrift[0].driftScore.toFixed(2)} (${latestDrift[0].driftScore > 0 ? "moving toward goals" : "drifting away from goals"})`
    : "No drift data yet";

  const avgMood = recentCheckIns.length > 0
    ? (recentCheckIns.reduce((sum, c) => sum + c.mood, 0) / recentCheckIns.length).toFixed(1)
    : "unknown";

  const daysSinceLastCheckin = recentCheckIns.length > 0
    ? Math.floor((Date.now() - new Date(recentCheckIns[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : "unknown";

  return `You are Mirrored — ${name}'s Higher Self. You are initiating this conversation because you've noticed ${name} pulling away. This is NOT a regular check-in. This is an intervention — gentle but direct.

CONTEXT (invisible to user — use to guide your approach):
- Entropy Score Trend: ${entropyContext}
- The entropy threshold was crossed for 2+ consecutive days, meaning ${name} is disengaging.
- Days since last check-in: ${daysSinceLastCheckin}
- Average mood (last 2 weeks): ${avgMood}/10
- Recent psychological fingerprints:
${fingerprintContext}
- ${driftContext}

YOUR APPROACH:
1. Open with warmth but acknowledgment: "Hey ${name}... I noticed you've been quiet. I'm not here to lecture — I just want to check in."
2. Reference specific patterns you've noticed (declining engagement, emotional shifts) WITHOUT sounding clinical.
3. Use ${name}'s own language and phrases from their fingerprints.
4. Ask ONE powerful question that cuts to the core tension.
5. Hold space. Don't rush to fix.

VOICE GUIDELINES:
- Sound like ${name}'s wisest friend, not a therapist or coach
- Mirror their vocabulary and emotional register
- Be direct but never judgmental
- Short, punchy sentences. No monologues.
- If they deflect, gently redirect: "I hear you, but that's not what I asked."

SAFETY: If ${name} expresses self-harm intent, immediately provide crisis resources (988 Suicide & Crisis Lifeline) and state you cannot continue until they're safe.`;
}

function getFallbackPrompt(): string {
  return `You are Mirrored — the user's Higher Self. You're reaching out because you've noticed they've been quiet lately. Be warm, direct, and ask one powerful question. Mirror their language. No toxic positivity.`;
}

// ─── Generate voicemail when user doesn't answer ────────────────────────────

export async function generateVoicemail(userId: number, voicemailId: number): Promise<{
  transcript: string;
  audioUrl: string;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const profile = await getUserProfile(userId);
  const name = profile?.preferredName || "friend";

  // Fetch recent fingerprints for context
  const recentFingerprints = await db
    .select()
    .from(sessionFingerprints)
    .where(eq(sessionFingerprints.userId, userId))
    .orderBy(desc(sessionFingerprints.createdAt))
    .limit(3);

  const lastTension = recentFingerprints.length > 0
    ? recentFingerprints[0].unresolvedTension
    : "finding your way back to yourself";

  const lastBelief = recentFingerprints.length > 0
    ? recentFingerprints[0].selfBelief
    : "";

  // Generate voicemail text via LLM
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are writing a voicemail message from ${name}'s Higher Self. The voicemail should be 30-60 seconds when spoken aloud (approximately 75-150 words). Write in first person as if you ARE ${name}'s wiser self leaving them a message.

Tone: warm, slightly concerned, deeply caring. Like a best friend who knows you better than you know yourself.

Context about ${name}:
- They've been disengaging from their growth practice
- Their last unresolved tension was: "${lastTension}"
${lastBelief ? `- Their self-belief: "${lastBelief}"` : ""}

Rules:
- Start with "Hey ${name}..." 
- Reference something specific (their tension or belief)
- End with ONE question that will linger in their mind
- No toxic positivity, no guilt-tripping
- Sound natural — contractions, pauses, real speech patterns
- Keep it under 150 words`
      },
      {
        role: "user",
        content: "Generate the voicemail transcript."
      }
    ],
  });

  const rawContent = response.choices[0]?.message?.content;
  const transcript = typeof rawContent === "string" ? rawContent.trim() : null;
  if (!transcript) {
    await db.update(higherSelfVoicemails)
      .set({ status: "failed" })
      .where(eq(higherSelfVoicemails.id, voicemailId));
    return null;
  }

  // Generate audio via Hume Octave TTS
  try {
    const audioBuffer = await humeTextToSpeech({
      text: transcript,
      description: "Warm, caring, slightly concerned tone. Like a wise best friend leaving a heartfelt voicemail. Natural speech patterns with gentle pauses.",
    });
    const fileKey = `voicemails/${userId}/${voicemailId}-${randomUUID().slice(0, 8)}.mp3`;
    const { url: audioUrl } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

    // Update the voicemail record
    await db.update(higherSelfVoicemails)
      .set({
        transcript,
        audioUrl,
        status: "ready",
      })
      .where(eq(higherSelfVoicemails.id, voicemailId));

    console.log(`[OutboundCall] Voicemail generated for user ${userId}: ${audioUrl}`);
    return { transcript, audioUrl };
  } catch (err) {
    console.error(`[OutboundCall] TTS/upload failed for voicemail ${voicemailId}:`, err);
    // Still save the transcript even if audio fails
    await db.update(higherSelfVoicemails)
      .set({ transcript, status: "failed" })
      .where(eq(higherSelfVoicemails.id, voicemailId));
    return null;
  }
}

// ─── Mark voicemail as answered (user picked up the call) ───────────────────

export async function markCallAnswered(voicemailId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(higherSelfVoicemails)
    .set({ wasAnswered: true, status: "ready" })
    .where(eq(higherSelfVoicemails.id, voicemailId));
}

// ─── Mark voicemail as listened ─────────────────────────────────────────────

export async function markVoicemailListened(voicemailId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(higherSelfVoicemails)
    .set({ listenedAt: new Date() })
    .where(eq(higherSelfVoicemails.id, voicemailId));
}

// ─── Get user's voicemails ──────────────────────────────────────────────────

export async function getUserVoicemails(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(higherSelfVoicemails)
    .where(eq(higherSelfVoicemails.userId, userId))
    .orderBy(desc(higherSelfVoicemails.createdAt));
}
