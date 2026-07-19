/**
 * Native push notifications (Capacitor Push Notifications + APNs/FCM).
 *
 * Web behavior is unchanged (the existing useNotifications hook uses the
 * browser Notification API). This hook activates only inside the native
 * shell: it requests permission, registers with APNs/FCM, and surfaces the
 * device token so it can be sent to the server.
 *
 * SERVER TODO: add a tRPC mutation (e.g. push.registerDevice) that stores
 * the token per user; server/_core/pushNotifications.ts already has the
 * send-side infrastructure.
 */

import { useEffect, useState } from "react";
import { isNative } from "@/lib/platform";

type PushPlugin = {
  requestPermissions(): Promise<{ receive: "granted" | "denied" | "prompt" }>;
  register(): Promise<void>;
  addListener(
    event: "registration",
    cb: (token: { value: string }) => void
  ): Promise<{ remove(): Promise<void> }>;
  addListener(
    event: "pushNotificationReceived",
    cb: (notification: unknown) => void
  ): Promise<{ remove(): Promise<void> }>;
};

export function usePushNotifications() {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<string>("unknown");

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;

    (async () => {
      try {
        const mod = await import("@capacitor/push-notifications");
        const Push = mod.PushNotifications as unknown as PushPlugin;

        await Push.addListener("registration", (token) => {
          if (!cancelled) setDeviceToken(token.value);
        });

        const result = await Push.requestPermissions();
        if (cancelled) return;
        setPermission(result.receive);
        if (result.receive === "granted") {
          await Push.register();
        }
      } catch {
        /* plugin unavailable — push disabled */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { deviceToken, permission, isSupported: isNative() };
}
