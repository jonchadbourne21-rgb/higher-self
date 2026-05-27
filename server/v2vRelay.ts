/**
 * Mirrored V2V WebSocket Relay
 *
 * Attaches to the existing HTTP server (from Express) and proxies
 * browser ↔ Hume EVI WebSocket traffic at the /ws path.
 *
 * Responsibilities:
 * 1. Mint short-lived Hume access tokens server-side.
 * 2. Accept client WebSocket connections at /ws.
 * 3. Open one upstream wss://api.hume.ai/v0/evi/chat session per client.
 * 4. Forward client audio_input frames upstream.
 * 5. Intercept user_message / assistant_message from Hume, extract top-3
 *    prosody emotions, persist to MySQL, then forward to client.
 * 6. Honor frontend kill_switch messages by closing both sockets.
 */

import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { getDb } from "./db";
import { v2vSessions, v2vMessages } from "../drizzle/schema";
import { randomUUID } from "crypto";
import { getUserProfile, getRecentCheckIns, getLatestDomainScores } from "./db";
import { buildIntentSpecificPrompt } from "./intentPrompts";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Env ─────────────────────────────────────────────────────────────────────

const HUME_API_KEY = process.env.HUME_API_KEY ?? "";
const HUME_SECRET_KEY = process.env.HUME_SECRET_KEY ?? "";
const HUME_CONFIG_ID = process.env.HUME_CONFIG_ID ?? "";

// ─── Hume auth ───────────────────────────────────────────────────────────────

async function fetchHumeAccessToken(): Promise<string> {
  if (!HUME_API_KEY || !HUME_SECRET_KEY) {
    throw new Error("HUME_API_KEY / HUME_SECRET_KEY not set");
  }
  const basic = Buffer.from(`${HUME_API_KEY}:${HUME_SECRET_KEY}`).toString("base64");
  const res = await fetch("https://api.hume.ai/oauth2-cc/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`Hume token request failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Emotion = { name: string; score: number };

function top3Emotions(scores: Record<string, number> | undefined): Emotion[] {
  if (!scores) return [];
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, score]) => ({ name, score }));
}

// ─── DB persistence ──────────────────────────────────────────────────────────

// ─── Build dynamic system prompt for voice sessions ──────────────────────────

async function buildVoiceSystemPrompt(userId: number): Promise<string> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    
    const profile = await getUserProfile(userId);
    const recentCheckIns = await getRecentCheckIns(userId, 7);
    const domainScores = await getLatestDomainScores(userId);
    
    // Fetch seedIntent from users table
    const userResult = await db.select({ seedIntent: users.seedIntent }).from(users).where(eq(users.id, userId)).limit(1);
    const seedIntent = userResult[0]?.seedIntent || "Inner Peace";
    
    const valuesStr = profile?.coreValues?.join(", ") || "not yet defined";
    const goalsStr = profile?.shortTermGoals || "not yet set";
    const visionStr = profile?.longTermVision || "not yet defined";
    const beliefsStr = profile?.beliefs || "not yet shared";
    const name = profile?.preferredName || "friend";
    
    const avgMood = recentCheckIns.length > 0
      ? Math.round(recentCheckIns.reduce((sum, c) => sum + c.mood, 0) / recentCheckIns.length)
      : "not yet assessed";
    
    const domainStr = domainScores
      .map((d) => `${d!.domain}: ${d!.score}/10`)
      .join(", ");
    
    return buildIntentSpecificPrompt(seedIntent, {
      name,
      valuesStr,
      goalsStr,
      visionStr,
      beliefsStr,
      avgMood: avgMood.toString(),
      domainStr: domainStr || "not yet assessed",
    });
  } catch (err) {
    console.error("[v2v-relay] Failed to build voice system prompt:", err);
    // Fallback to minimal prompt
    return `You are Mirrored, an AI mirror for personal growth. Speak with authentic compassion and uncompromising honesty. Match the user's tone and vocabulary. Ask powerful questions. Keep responses concise. No toxic positivity.`;
  }
}

async function createSession(userId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const uuid = randomUUID();
    const result = await db.insert(v2vSessions).values({
      userId,
      sessionUuid: uuid,
    });
    return Number(result[0].insertId);
  } catch (err) {
    console.error("[v2v-relay] createSession error", err);
    return null;
  }
}

async function saveMessage(
  sessionId: number | null,
  role: "user" | "assistant" | "system",
  transcript: string,
  emotions: Emotion[] = []
): Promise<void> {
  if (!sessionId) return;
  const db = await getDb();
  if (!db) return;
  const e = (i: number) => emotions[i] ?? { name: null, score: null };
  try {
    await db.insert(v2vMessages).values({
      sessionId,
      role,
      transcript,
      emotion1Name: e(0).name ?? null,
      emotion1Score: e(0).score ?? null,
      emotion2Name: e(1).name ?? null,
      emotion2Score: e(1).score ?? null,
      emotion3Name: e(2).name ?? null,
      emotion3Score: e(2).score ?? null,
    });
  } catch (err) {
    console.error("[v2v-relay] saveMessage error", err);
  }
}

// ─── Attach to existing HTTP server ──────────────────────────────────────────

export function attachV2VRelay(server: HttpServer): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (clientWs, req) => {
    console.log("[v2v-relay] client connected");

    // Extract userId from query string (?userId=123)
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const userId = parseInt(url.searchParams.get("userId") ?? "0", 10);
    const sessionId = userId ? await createSession(userId) : null;

    let upstream: WebSocket | null = null;

    try {
      const token = await fetchHumeAccessToken();
      const params = new URLSearchParams({ access_token: token });
      if (HUME_CONFIG_ID) params.set("config_id", HUME_CONFIG_ID);
      const upstreamUrl = `wss://api.hume.ai/v0/evi/chat?${params.toString()}`;
      upstream = new WebSocket(upstreamUrl);
    } catch (err: any) {
      console.error("[v2v-relay] failed to open upstream Hume socket", err);
      clientWs.send(
        JSON.stringify({
          type: "error",
          code: "hume_not_configured",
          message: err.message || "hume_auth_failed",
        })
      );
      clientWs.close(1011, "hume_auth_failed");
      return;
    }

    upstream.on("open", async () => {
      // Send dynamic system prompt via session_settings
      try {
        const systemPrompt = await buildVoiceSystemPrompt(userId);
        const sessionSettings = {
          type: "session_settings",
          session_settings: {
            prompt: {
              text: systemPrompt,
            },
          },
        };
        upstream?.send(JSON.stringify(sessionSettings));
        console.log("[v2v-relay] Sent dynamic system prompt to Hume");
      } catch (err) {
        console.error("[v2v-relay] Failed to send session_settings:", err);
      }
      clientWs.send(JSON.stringify({ type: "relay_status", status: "connected" }));
    });

    upstream.on("message", async (raw) => {
      const text = raw.toString();
      let msg: any;
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }

      if (msg.type === "user_message") {
        const transcript = msg.message?.content ?? "";
        const emotions = top3Emotions(msg.models?.prosody?.scores);
        // Persist non-interim transcripts
        if (transcript && msg.interim === false) {
          await saveMessage(sessionId, "user", transcript, emotions);
        }
        // Augment with top_emotions for convenience on the client
        msg.top_emotions = emotions;
        clientWs.send(JSON.stringify(msg));
        return;
      }

      if (msg.type === "assistant_message") {
        const transcript = msg.message?.content ?? "";
        if (transcript) {
          await saveMessage(sessionId, "assistant", transcript, []);
        }
        clientWs.send(text);
        return;
      }

      // Forward all other event types unchanged (audio_output, user_interruption, etc.)
      clientWs.send(text);
    });

    upstream.on("close", (code, reason) => {
      console.log("[v2v-relay] upstream closed", code, reason?.toString());
      try {
        clientWs.close(1000, "upstream_closed");
      } catch {
        /* noop */
      }
    });

    upstream.on("error", (err) => {
      console.error("[v2v-relay] upstream error", err);
    });

    // ── Client → Upstream ──────────────────────────────────────────────────

    clientWs.on("message", (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === "kill_switch") {
        console.warn("[v2v-relay] kill_switch from client; tearing down upstream");
        // Save kill switch event
        if (sessionId) {
          saveMessage(sessionId, "system", "[KILL_SWITCH] Session terminated for safety");
        }
        try {
          upstream?.close(1000, "kill_switch");
        } catch {
          /* noop */
        }
        try {
          clientWs.close(1000, "kill_switch");
        } catch {
          /* noop */
        }
        return;
      }

      // Forward audio_input and other client events upstream
      if (upstream && upstream.readyState === WebSocket.OPEN) {
        upstream.send(JSON.stringify(msg));
      }
    });

    clientWs.on("close", () => {
      console.log("[v2v-relay] client disconnected");
      try {
        upstream?.close();
      } catch {
        /* noop */
      }
    });

    clientWs.on("error", (err) => {
      console.error("[v2v-relay] client error", err);
    });
  });

  console.log("[v2v-relay] WebSocket relay attached at /ws");
}
