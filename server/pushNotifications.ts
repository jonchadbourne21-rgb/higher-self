/**
 * Push Notification Service
 * ─────────────────────────
 * Handles sending Web Push notifications and running the daily 6am scheduler
 * that reminds users about their goals.
 */

import webpush from "web-push";
import {
  getAllActivePushSubscriptions,
  getNotificationPreferences,
  getUserProfile,
} from "./db";

// ── VAPID configuration ──────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:hello@higherself.cloud",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

// ── Send a single push notification ─────────────────────────────────────────

export async function sendPushNotification(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushPayload
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys not configured — skipping");
    return false;
  }
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify(payload),
      { TTL: 86400 } // 24h TTL — deliver when device comes online
    );
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) {
      // Subscription expired — caller should deactivate it
      console.log("[Push] Subscription expired:", endpoint.slice(0, 60));
    } else {
      console.error("[Push] Send error:", err);
    }
    return false;
  }
}

// ── Build a personalised daily reminder message ──────────────────────────────

function buildReminderMessage(
  preferredName: string | null | undefined,
  shortTermGoals: string | null | undefined,
  longTermVision: string | null | undefined
): PushPayload {
  const name = preferredName ?? "you";

  // Rotate through a set of motivating openers
  const openers = [
    `Morning, ${name}. Today's the day.`,
    `Hey ${name} — your goals aren't going to chase themselves.`,
    `Rise and reflect, ${name}. What are you building today?`,
    `Good morning, ${name}. Your higher self is waiting.`,
    `${name}, the version of you that wins shows up every morning.`,
  ];
  const title = openers[Math.floor(Math.random() * openers.length)];

  let body = "Open the app to check in and track your habits.";
  if (shortTermGoals) {
    const snippet =
      shortTermGoals.length > 80
        ? shortTermGoals.slice(0, 77) + "…"
        : shortTermGoals;
    body = `Focus: ${snippet}`;
  } else if (longTermVision) {
    const snippet =
      longTermVision.length > 80
        ? longTermVision.slice(0, 77) + "…"
        : longTermVision;
    body = `Vision: ${snippet}`;
  }

  return {
    title,
    body,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    url: "/home",
    tag: "daily-reminder",
  };
}

// ── Daily scheduler ──────────────────────────────────────────────────────────
// Runs every minute, checks which users have their 6am window in the current
// UTC minute, and fires their push notification.

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startDailyReminderScheduler() {
  if (schedulerInterval) return; // already running

  console.log("[Push] Daily reminder scheduler started");

  schedulerInterval = setInterval(async () => {
    const nowUtc = new Date();
    const utcHour = nowUtc.getUTCHours();
    const utcMinute = nowUtc.getUTCMinutes();

    // Only run once per hour at minute 0 to avoid duplicate sends
    if (utcMinute !== 0) return;

    try {
      const subscriptions = await getAllActivePushSubscriptions();
      if (subscriptions.length === 0) return;

      for (const sub of subscriptions) {
        try {
          // Determine what local hour it is for this subscriber's timezone
          const tz = sub.timezone || "UTC";
          const localHour = getLocalHour(utcHour, tz);

          // Get their preferred reminder hour (default 6)
          const prefs = await getNotificationPreferences(sub.userId);
          const reminderHour = prefs?.reminderHour ?? 6;
          const enabled = prefs?.dailyReminderEnabled ?? true;

          if (!enabled || localHour !== reminderHour) continue;

          // Fetch user profile for personalised message
          const profile = await getUserProfile(sub.userId);

          const payload = buildReminderMessage(
            profile?.preferredName,
            profile?.shortTermGoals,
            profile?.longTermVision
          );

          const ok = await sendPushNotification(
            sub.endpoint,
            sub.p256dh,
            sub.auth,
            payload
          );

          if (ok) {
            console.log(`[Push] Sent daily reminder to user ${sub.userId}`);
          }
        } catch (innerErr) {
          console.error(`[Push] Error for user ${sub.userId}:`, innerErr);
        }
      }
    } catch (err) {
      console.error("[Push] Scheduler error:", err);
    }
  }, 60_000); // check every minute
}

export function stopDailyReminderScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

// ── Timezone helper ──────────────────────────────────────────────────────────

/**
 * Returns the local hour (0–23) for a given UTC hour and IANA timezone string.
 * Falls back to UTC if the timezone is invalid.
 */
function getLocalHour(utcHour: number, timezone: string): number {
  try {
    // Use Intl to get the local hour without any extra dependencies
    const date = new Date();
    date.setUTCHours(utcHour, 0, 0, 0);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(date);
    const hourPart = parts.find((p) => p.type === "hour");
    const h = parseInt(hourPart?.value ?? "0", 10);
    return isNaN(h) ? utcHour : h % 24;
  } catch {
    return utcHour;
  }
}
