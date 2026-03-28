/**
 * useNotifications — manages Web Push subscription lifecycle
 *
 * Handles:
 * - Service worker registration
 * - Push permission request
 * - Subscribe / unsubscribe via tRPC
 * - Syncing status with the server
 */

import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type NotificationPermission = "default" | "granted" | "denied";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [swReady, setSwReady] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: status, refetch: refetchStatus } = trpc.notifications.status.useQuery(undefined, {
    retry: false,
  });

  const subscribeMutation = trpc.notifications.subscribe.useMutation({
    onSuccess: () => refetchStatus(),
  });
  const unsubscribeMutation = trpc.notifications.unsubscribe.useMutation({
    onSuccess: () => refetchStatus(),
  });
  const updatePrefsMutation = trpc.notifications.updatePrefs.useMutation({
    onSuccess: () => refetchStatus(),
  });
  const sendTestMutation = trpc.notifications.sendTest.useMutation();

  // Register service worker on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[SW] Registered:", reg.scope);
        setSwReady(true);
      })
      .catch((err) => {
        console.error("[SW] Registration failed:", err);
      });

    setPermission(Notification.permission as NotificationPermission);
  }, []);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const subscribe = useCallback(async () => {
    if (!isSupported || !swReady) {
      setError("Push notifications are not supported on this device.");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setError("Push notifications are not configured yet.");
      return;
    }

    setIsSubscribing(true);
    setError(null);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm as NotificationPermission);

      if (perm !== "granted") {
        setError("Notification permission was denied. Enable it in your browser settings.");
        return;
      }

      // Get service worker registration
      const reg = await navigator.serviceWorker.ready;

      // Subscribe to push
      const pushSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = pushSub.toJSON();
      const endpoint = json.endpoint!;
      const p256dh = json.keys?.p256dh!;
      const auth = json.keys?.auth!;

      // Detect timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

      await subscribeMutation.mutateAsync({ endpoint, p256dh, auth, timezone });
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
      setError("Something went wrong enabling notifications. Please try again.");
    } finally {
      setIsSubscribing(false);
    }
  }, [isSupported, swReady, subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    try {
      // Unsubscribe from browser push manager
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const pushSub = await reg.pushManager.getSubscription();
        if (pushSub) await pushSub.unsubscribe();
      }
      await unsubscribeMutation.mutateAsync();
    } catch (err) {
      console.error("[Push] Unsubscribe error:", err);
    }
  }, [unsubscribeMutation]);

  const updatePrefs = useCallback(
    (prefs: { dailyReminderEnabled?: boolean; reminderHour?: number; timezone?: string }) => {
      return updatePrefsMutation.mutateAsync(prefs);
    },
    [updatePrefsMutation]
  );

  const sendTest = useCallback(() => {
    return sendTestMutation.mutateAsync();
  }, [sendTestMutation]);

  return {
    isSupported,
    swReady,
    permission,
    isSubscribed: status?.isSubscribed ?? false,
    prefs: status?.prefs ?? { dailyReminderEnabled: true, reminderHour: 6, timezone: "UTC" },
    isSubscribing: isSubscribing || subscribeMutation.isPending,
    error,
    subscribe,
    unsubscribe,
    updatePrefs,
    sendTest,
    isSendingTest: sendTestMutation.isPending,
  };
}
