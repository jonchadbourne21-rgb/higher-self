/**
 * Hume EVI Webhook Handler
 *
 * Handles POST /api/hume/webhook — receives real-time events from Hume EVI
 * during voice sessions: chat_started, chat_ended, tool_call.
 *
 * Security: HMAC-SHA256 signature verification using HUME_WEBHOOK_SIGNING_KEY.
 * If the signing key is not set, signature verification is skipped (dev mode).
 */

import { Request, Response } from "express";
import * as crypto from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatStartedEvent {
  event_name: "chat_started";
  chat_group_id: string;
  chat_id: string;
  config_id: string;
  start_time: number;
  chat_start_type: "new_chat_group" | "resumed_chat_group";
  custom_session_id?: string | null;
  caller_number?: string | null;
}

interface ChatEndedEvent {
  event_name: "chat_ended";
  chat_group_id: string;
  chat_id: string;
  config_id: string;
  end_time: number;
  duration_seconds: number;
  end_reason: "USER_ENDED" | "USER_TIMEOUT" | "MAX_DURATION_TIMEOUT" | "INACTIVITY_TIMEOUT" | "ERROR";
  custom_session_id?: string | null;
  caller_number?: string | null;
}

interface ToolCallEvent {
  event_name: "tool_call";
  chat_group_id: string;
  chat_id: string;
  config_id: string;
  timestamp: number;
  tool_call_message: {
    name: string;
    parameters: string;
    response_required: boolean;
    tool_call_id: string;
    tool_type: "builtin" | "function";
  };
  custom_session_id?: string | null;
  caller_number?: string | null;
}

type HumeWebhookEvent = ChatStartedEvent | ChatEndedEvent | ToolCallEvent;

// ── HMAC Verification ─────────────────────────────────────────────────────────

function verifyHumeSignature(rawBody: string, headers: Request["headers"]): boolean {
  const signingKey = process.env.HUME_WEBHOOK_SIGNING_KEY;

  // If no signing key is configured, skip verification (dev/testing mode)
  if (!signingKey) {
    console.warn("[HumeWebhook] HUME_WEBHOOK_SIGNING_KEY not set — skipping signature verification");
    return true;
  }

  const timestamp = headers["x-hume-ai-webhook-timestamp"] as string;
  const signature = headers["x-hume-ai-webhook-signature"] as string;

  if (!timestamp || !signature) {
    console.warn("[HumeWebhook] Missing signature headers");
    return false;
  }

  // Validate timestamp is within 3 minutes
  const timestampInt = parseInt(timestamp, 10);
  if (isNaN(timestampInt)) {
    console.warn("[HumeWebhook] Invalid timestamp format");
    return false;
  }
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - timestampInt > 180) {
    console.warn("[HumeWebhook] Timestamp too old — possible replay attack");
    return false;
  }

  // Compute expected HMAC
  const message = `${rawBody}.${timestamp}`;
  const expectedSig = crypto.createHmac("sha256", signingKey).update(message).digest("hex");

  // Timing-safe comparison
  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

// ── Event Handlers ────────────────────────────────────────────────────────────

function handleChatStarted(event: ChatStartedEvent) {
  console.log(
    `[HumeWebhook] chat_started — chat_id=${event.chat_id} type=${event.chat_start_type} config=${event.config_id}`
  );
  // Future: correlate chat_id with our v2v_sessions table using custom_session_id
}

function handleChatEnded(event: ChatEndedEvent) {
  console.log(
    `[HumeWebhook] chat_ended — chat_id=${event.chat_id} duration=${event.duration_seconds}s reason=${event.end_reason}`
  );
  // Future: auto-mark session as ended in v2v_sessions if not already closed
}

function handleToolCall(event: ToolCallEvent) {
  console.log(
    `[HumeWebhook] tool_call — chat_id=${event.chat_id} tool=${event.tool_call_message.name} response_required=${event.tool_call_message.response_required}`
  );
  // Future: handle server-side tool invocations via Hume Control Plane API
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export function humeWebhookHandler(req: Request, res: Response): void {
  // req.body is already parsed JSON (express.json middleware runs first)
  // For signature verification we need the raw body string
  const rawBody = JSON.stringify(req.body);

  // Verify HMAC signature
  if (!verifyHumeSignature(rawBody, req.headers)) {
    console.warn("[HumeWebhook] Signature verification failed — rejecting request");
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const event = req.body as HumeWebhookEvent;

  if (!event || !event.event_name) {
    res.status(400).json({ error: "Missing event_name" });
    return;
  }

  try {
    switch (event.event_name) {
      case "chat_started":
        handleChatStarted(event);
        break;
      case "chat_ended":
        handleChatEnded(event);
        break;
      case "tool_call":
        handleToolCall(event);
        break;
      default:
        console.log(`[HumeWebhook] Unknown event: ${(event as HumeWebhookEvent).event_name}`);
    }

    res.json({ status: "ok", event: event.event_name });
  } catch (err) {
    console.error("[HumeWebhook] Error processing event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
