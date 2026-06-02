import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Mail,
  MailOpen,
  Settings2,
  Sparkles,
  ChevronLeft,
  Lock,
  Phone,
  Play,
  Pause,
  Volume2,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function TimeCapsule() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedLetterId, setSelectedLetterId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"letters" | "voicemails">("letters");
  const [playingVoicemailId, setPlayingVoicemailId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const settingsQuery = trpc.timeCapsule.getSettings.useQuery();
  const lettersQuery = trpc.timeCapsule.getLetters.useQuery();
  const fingerprintCount = trpc.timeCapsule.getFingerprintCount.useQuery();
  const unreadCount = trpc.timeCapsule.getUnreadCount.useQuery();
  const voicemailsQuery = trpc.timeCapsule.getVoicemails.useQuery();
  const markListened = trpc.timeCapsule.markVoicemailListened.useMutation({
    onSuccess: () => voicemailsQuery.refetch(),
  });

  const voicemails = voicemailsQuery.data ?? [];

  const letterQuery = trpc.timeCapsule.getLetter.useQuery(
    { letterId: selectedLetterId! },
    { enabled: !!selectedLetterId }
  );

  const updateSettings = trpc.timeCapsule.updateSettings.useMutation({
    onSuccess: () => {
      settingsQuery.refetch();
      toast.success("Time capsule settings updated");
    },
  });

  const generateNow = trpc.timeCapsule.generateNow.useMutation({
    onSuccess: () => {
      lettersQuery.refetch();
      fingerprintCount.refetch();
      toast.success("Your letter has been generated");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const settings = settingsQuery.data;
  const letters = lettersQuery.data ?? [];
  const fpCount = fingerprintCount.data ?? 0;

  // If viewing a specific letter
  if (selectedLetterId && letterQuery.data) {
    return (
      <AppShell>
        <LetterView
          letter={letterQuery.data}
          onBack={() => setSelectedLetterId(null)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Time Capsule
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Letters & voicemails from your Higher Self
              </p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Settings2 className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <SettingsPanel
                settings={settings}
                onSave={(cadence, enabled) => {
                  updateSettings.mutate({
                    cadenceDays: cadence,
                    isEnabled: enabled,
                  });
                }}
                isSaving={updateSettings.isPending}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-5 mb-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {fpCount} moments captured
              </p>
              <p className="text-xs text-muted-foreground">
                {fpCount < 3
                  ? `${3 - fpCount} more sessions until your first letter`
                  : "Your past self is watching"}
              </p>
            </div>
          </div>

          {fpCount >= 3 && (
            <button
              onClick={() => generateNow.mutate()}
              disabled={generateNow.isPending}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {generateNow.isPending
                ? "Writing your letter..."
                : "Generate a letter now"}
            </button>
          )}

          {fpCount < 3 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5" />
              <span>
                Keep reflecting through chat, voice, or check-ins to unlock
              </span>
            </div>
          )}
        </motion.div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-secondary/50 border border-border/30 mb-6">
          <button
            onClick={() => setActiveTab("letters")}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "letters"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="w-4 h-4" />
            Letters {letters.length > 0 && `(${letters.length})`}
          </button>
          <button
            onClick={() => setActiveTab("voicemails")}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "voicemails"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Phone className="w-4 h-4" />
            Voicemails {voicemails.length > 0 && `(${voicemails.length})`}
          </button>
        </div>

        {/* Voicemails Tab */}
        {activeTab === "voicemails" && (
          <div className="space-y-3">
            {voicemails.length > 0 ? (
              voicemails.map((vm: any, i: number) => (
                <motion.div
                  key={vm.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-card border rounded-xl p-4 transition-all ${
                    vm.status === "listened"
                      ? "border-border"
                      : "border-primary/30 shadow-sm shadow-primary/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (playingVoicemailId === vm.id) {
                          audioRef.current?.pause();
                          setPlayingVoicemailId(null);
                        } else if (vm.audioUrl) {
                          if (audioRef.current) audioRef.current.pause();
                          const audio = new Audio(vm.audioUrl);
                          audio.onended = () => setPlayingVoicemailId(null);
                          audio.play();
                          audioRef.current = audio;
                          setPlayingVoicemailId(vm.id);
                          if (vm.status !== "listened") {
                            markListened.mutate({ voicemailId: vm.id });
                          }
                        }
                      }}
                      disabled={!vm.audioUrl}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        playingVoicemailId === vm.id
                          ? "bg-primary text-primary-foreground"
                          : vm.audioUrl
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {playingVoicemailId === vm.id ? (
                        <Pause className="w-4 h-4" />
                      ) : vm.audioUrl ? (
                        <Play className="w-4 h-4 ml-0.5" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {vm.status !== "listened" && (
                          <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2" />
                        )}
                        Voicemail from your Higher Self
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(vm.createdAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      {vm.transcript && (
                        <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">
                          {vm.transcript.slice(0, 100)}...
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Phone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">
                  No voicemails yet.
                </p>
                <p className="text-muted-foreground/60 text-xs mt-2">
                  When your Higher Self calls and you can't answer, a voicemail will appear here.
                </p>
              </motion.div>
            )}
          </div>
        )}

        {/* Letters Tab */}
        {activeTab === "letters" && letters.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
              Your Letters
            </h2>
            {letters.map((letter, i) => (
              <motion.button
                key={letter.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                onClick={() => setSelectedLetterId(letter.id)}
                className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      letter.status === "read"
                        ? "bg-muted"
                        : "bg-primary/10"
                    }`}
                  >
                    {letter.status === "read" ? (
                      <MailOpen className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Mail className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      A Letter From Your Past Self
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatPeriod(letter.periodStart, letter.periodEnd)}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-1">
                      {letter.letterContent.slice(0, 80)}...
                    </p>
                  </div>
                  {letter.status !== "read" && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        ) : activeTab === "letters" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-12"
          >
            <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">
              No letters yet. Your past self is still gathering words.
            </p>
            <p className="text-muted-foreground/60 text-xs mt-2">
              Keep reflecting — your first letter will arrive soon.
            </p>
          </motion.div>
        ) : null}
      </div>
    </AppShell>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SettingsPanel({
  settings,
  onSave,
  isSaving,
}: {
  settings: any;
  onSave: (cadence: "30" | "90" | "365", enabled: boolean) => void;
  isSaving: boolean;
}) {
  const [cadence, setCadence] = useState<"30" | "90" | "365">(
    settings?.cadenceDays?.toString() ?? "30"
  );
  const [enabled, setEnabled] = useState(settings?.isEnabled ?? true);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">
        Delivery Settings
      </h3>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-2">
            How often should your past self write to you?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["30", "90", "365"] as const).map((days) => (
              <button
                key={days}
                onClick={() => setCadence(days)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  cadence === days
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {days === "30" ? "30 days" : days === "90" ? "90 days" : "1 year"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Enable time capsule</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              enabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                enabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <button
          onClick={() => onSave(cadence, enabled)}
          disabled={isSaving}
          className="w-full py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </div>
  );
}

function LetterView({
  letter,
  onBack,
}: {
  letter: any;
  onBack: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm">Back to letters</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6 md:p-8"
      >
        <div className="mb-6 pb-4 border-b border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            A Letter From Your Past Self
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatPeriod(letter.periodStart, letter.periodEnd)}
          </p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          {letter.letterContent.split("\n\n").map((paragraph: string, i: number) => (
            <motion.p
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className="text-foreground/90 leading-relaxed mb-4 last:mb-0"
            >
              {paragraph}
            </motion.p>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground/60 text-center italic">
            Generated{" "}
            {new Date(letter.generatedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatPeriod(start: string | Date, end: string | Date): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = s.toLocaleDateString("en-US", opts);
  const endStr = e.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${startStr} — ${endStr}`;
}
