import { TRPCError } from "@trpc/server";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

function validatePayload(input: NotificationPayload): NotificationPayload {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (!title) throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title is required." });
  if (!content) throw new TRPCError({ code: "BAD_REQUEST", message: "Notification content is required." });
  if (title.length > TITLE_MAX_LENGTH) throw new TRPCError({ code: "BAD_REQUEST", message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.` });
  if (content.length > CONTENT_MAX_LENGTH) throw new TRPCError({ code: "BAD_REQUEST", message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.` });
  return { title, content };
}

/**
 * Optional owner-operations webhook. User-facing notifications use their own
 * push paths and never depend on this side channel.
 *
 * Expected endpoint accepts JSON: { title, content, source }.
 * Set OWNER_NOTIFICATION_WEBHOOK_URL and, if needed,
 * OWNER_NOTIFICATION_WEBHOOK_BEARER.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = validatePayload(payload);
  const endpoint = process.env.OWNER_NOTIFICATION_WEBHOOK_URL?.trim();
  if (!endpoint) {
    console.info("[OwnerNotification] webhook not configured; summary not delivered");
    return false;
  }

  let url: URL;
  try {
    url = new URL(endpoint);
    if (url.protocol !== "https:") throw new Error("https required");
  } catch {
    console.warn("[OwnerNotification] invalid webhook URL; summary not delivered");
    return false;
  }

  const bearer = process.env.OWNER_NOTIFICATION_WEBHOOK_BEARER?.trim();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (bearer) headers.authorization = `Bearer ${bearer}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ title, content, source: "mirrored-backend" }),
    });
    if (!response.ok) {
      console.warn(`[OwnerNotification] webhook rejected summary (${response.status})`);
      return false;
    }
    return true;
  } catch {
    console.warn("[OwnerNotification] webhook unavailable; summary not delivered");
    return false;
  }
}
