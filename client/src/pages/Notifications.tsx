import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell, BellOff, BellRing, ChevronLeft, Clock, Loader2, Send } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  const ampm = i < 12 ? "AM" : "PM";
  return { value: i, label: `${h}:00 ${ampm}` };
});

export default function Notifications() {
  const {
    isSupported,
    permission,
    isSubscribed,
    prefs,
    isSubscribing,
    error,
    subscribe,
    unsubscribe,
    updatePrefs,
    sendTest,
    isSendingTest,
  } = useNotifications();

  const [reminderHour, setReminderHour] = useState(prefs.reminderHour ?? 6);
  const [savingHour, setSavingHour] = useState(false);

  async function handleHourChange(hour: number) {
    setReminderHour(hour);
    setSavingHour(true);
    try {
      await updatePrefs({ reminderHour: hour });
      toast.success("Reminder time updated");
    } catch {
      toast.error("Failed to update reminder time");
    } finally {
      setSavingHour(false);
    }
  }

  async function handleToggle() {
    try {
      await updatePrefs({ dailyReminderEnabled: !prefs.dailyReminderEnabled });
      toast.success(prefs.dailyReminderEnabled ? "Reminders paused" : "Reminders resumed");
    } catch {
      toast.error("Failed to update preferences");
    }
  }

  async function handleTest() {
    try {
      await sendTest();
      toast.success("Test notification sent — check your device");
    } catch {
      toast.error("Couldn't send test — make sure notifications are enabled");
    }
  }

  async function handleUnsubscribe() {
    await unsubscribe();
    toast.success("Notifications turned off");
  }

  return (
    <AppShell>
      <div className="px-4 pt-6 pb-32 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/home">
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Notifications</h1>
            <p className="text-sm text-muted-foreground">Daily reminders for your goals</p>
          </div>
        </div>

        {/* Not supported */}
        {!isSupported && (
          <div className="rounded-2xl bg-muted/60 p-6 text-center">
            <BellOff className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">Not supported on this browser</p>
            <p className="text-sm text-muted-foreground">
              Push notifications require Chrome, Edge, or Firefox. Safari on iOS 16.4+ also works if
              you add the app to your Home Screen.
            </p>
          </div>
        )}

        {/* Supported but not subscribed */}
        {isSupported && !isSubscribed && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">Enable daily reminders</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Get a personalised nudge every morning at 6am — based on your goals, habits, and
                  where you're at. No spam, just your higher self checking in.
                </p>
              </div>

              {permission === "denied" ? (
                <div className="w-full rounded-xl bg-destructive/10 p-4 text-sm text-destructive text-left">
                  <p className="font-medium mb-1">Notifications are blocked</p>
                  <p>
                    Go to your browser settings → Site permissions → Notifications and allow
                    higherself.cloud.
                  </p>
                </div>
              ) : (
                <button
                  onClick={subscribe}
                  disabled={isSubscribing}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {isSubscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enabling…
                    </>
                  ) : (
                    <>
                      <BellRing className="w-4 h-4" />
                      Turn on daily reminders
                    </>
                  )}
                </button>
              )}

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
          </div>
        )}

        {/* Subscribed — settings */}
        {isSupported && isSubscribed && (
          <div className="space-y-4">
            {/* Status card */}
            <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <BellRing className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Reminders are on</p>
                <p className="text-sm text-muted-foreground">
                  You'll get a daily nudge at{" "}
                  <span className="font-medium text-foreground">
                    {HOURS[reminderHour]?.label}
                  </span>{" "}
                  your time
                </p>
              </div>
              {/* Toggle */}
              <button
                onClick={handleToggle}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  prefs.dailyReminderEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-foreground shadow transition-transform ${
                    prefs.dailyReminderEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Reminder time */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Reminder time</span>
                {savingHour && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                  <button
                    key={h}
                    onClick={() => handleHourChange(h)}
                    className={`py-2 px-1 rounded-xl text-sm font-medium transition-colors ${
                      reminderHour === h
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    {HOURS[h]?.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Times are in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
              </p>
            </div>

            {/* Test + unsubscribe */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <button
                onClick={handleTest}
                disabled={isSendingTest}
                className="w-full py-2.5 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-60"
              >
                {isSendingTest ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send a test notification
              </button>
              <button
                onClick={handleUnsubscribe}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
              >
                <BellOff className="w-4 h-4" />
                Turn off notifications
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
