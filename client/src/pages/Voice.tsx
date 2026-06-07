import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Mic, MicOff, PhoneOff, AlertTriangle, History, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useVoice } from "@humeai/voice-react";
import { VoiceWave } from "@/components/VoiceWave";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Emotion {
  name: string;
  score: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotions?: Emotion[];
  timestamp: number;
}

type Status = "idle" | "connecting" | "live" | "ended" | "error";

// ── Crisis keywords ────────────────────────────────────────────────────────────
const CRISIS_KEYWORDS = [
  "kill myself", "want to die", "end my life", "suicide", "self-harm",
  "hurt myself", "not worth living", "rather be dead",
];

function hasCrisisContent(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Emotion badge color ────────────────────────────────────────────────────────
function emotionColor(name: string): string {
  const map: Record<string, string> = {
    joy: "bg-yellow-500/20 text-yellow-300",
    sadness: "bg-blue-500/20 text-blue-300",
    anger: "bg-red-500/20 text-red-300",
    fear: "bg-purple-500/20 text-purple-300",
    surprise: "bg-orange-500/20 text-orange-300",
    disgust: "bg-green-500/20 text-green-300",
    contempt: "bg-slate-500/20 text-slate-300",
    anxiety: "bg-indigo-500/20 text-indigo-300",
    excitement: "bg-amber-500/20 text-amber-300",
    calmness: "bg-teal-500/20 text-teal-300",
  };
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v;
  }
  return "bg-primary/20 text-primary";
}

// GlowingOrb replaced by VoiceVisualization component (imported above)

// ── Save to Journal button ───────────────────────────────────────────────────

function SaveToJournalButton({ sessionId }: { sessionId: number }) {
  const [saved, setSaved] = useState(false);
  const saveToJournalMut = trpc.voice.saveToJournal.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success("Session saved to your Journal!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save to journal.");
    },
  });

  if (saved) {
    return (
      <div className="flex items-center justify-center gap-2 py-2 text-sm text-emerald-400">
        <BookOpen className="w-4 h-4" />
        Saved to Journal
      </div>
    );
  }

  return (
    <button
      onClick={() => saveToJournalMut.mutate({ sessionId })}
      disabled={saveToJournalMut.isPending}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 transition-colors disabled:opacity-50"
    >
      {saveToJournalMut.isPending ? (
        <>
          <span className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <BookOpen className="w-4 h-4" />
          Save Session to Journal
        </>
      )}
    </button>
  );
}

// ── Main Voice Component ───────────────────────────────────────────────────────

// Voice configuration options
const VOICE_OPTIONS = {
  female: {
    id: "bd241668-01df-4d8b-90ea-c55448f8a6fa",
    label: "Female (Casual Podcast Host)",
  },
  male: {
    id: "65b1e86f-f43c-40f6-86e6-12bfc5ca052b",
    label: "Male",
  },
};

export default function Voice() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [mirrorTab, setMirrorTab] = useState<"chat" | "voice">("voice");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [killSwitch, setKillSwitch] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<"female" | "male">("female");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hume SDK hooks — use micFft for real-time audio visualization
  const {
    connect,
    disconnect,
    messages: humeMessages,
    error: humeError,
    micFft,
  } = useVoice();

  // Derive audio level from SDK's micFft (array of frequency magnitudes 0-1)
  const audioLevel = useMemo(() => {
    if (!micFft || micFft.length === 0) return 0;
    const bins = micFft.slice(0, Math.min(8, micFft.length));
    const sum = bins.reduce((acc, v) => acc + v * v, 0);
    return Math.min(1, Math.sqrt(sum / bins.length) * 2);
  }, [micFft]);

  const mintTokenMut = trpc.voice.mintToken.useMutation();
  const createSessionMut = trpc.voice.createSession.useMutation();
  const saveMessageMut = trpc.voice.saveMessage.useMutation();

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // No manual setInterval decay needed — audioLevel is derived from SDK's micFft above.

  // Monitor Hume SDK messages and sync to local state
  useEffect(() => {
    if (!humeMessages || humeMessages.length === 0) return;

    const lastHumeMsg = humeMessages[humeMessages.length - 1];
    const lastLocalMsg = messages[messages.length - 1];
    const msg = lastHumeMsg as any;

    // Only process messages with id, role, and content
    if (!msg.id || !msg.role || !msg.message?.content) return;

    // Avoid duplicates
    if (lastLocalMsg?.id === `hume-${msg.id}`) return;

    const newMsg: Message = {
      id: `hume-${msg.id}`,
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.message?.content || "",
      emotions: msg.models?.prosody?.scores
        ? Object.entries(msg.models.prosody.scores as Record<string, number>)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, score]) => ({ name, score }))
        : undefined,
      timestamp: Date.now(),
    };

    // Check for crisis content
    if (newMsg.role === "user" && hasCrisisContent(newMsg.content)) {
      triggerKillSwitch();
      return;
    }

    setMessages((prev) => [...prev, newMsg]);

    // Save to DB
    if (sessionId && newMsg.content) {
      saveMessageMut.mutate({
        sessionId,
        role: newMsg.role,
        content: newMsg.content,
        emotions: newMsg.emotions,
      });
    }
  }, [humeMessages, messages, sessionId, saveMessageMut]);

  // Monitor Hume SDK errors
  useEffect(() => {
    if (humeError) {
      console.error("[Hume SDK Error]", humeError);
      const errorDetails = humeError instanceof Error ? humeError.message : String(humeError);
      setErrorMsg(`Connection error: ${errorDetails}`);
      setStatus("error");
      toast.error(`Voice connection failed: ${errorDetails}`);
    }
  }, [humeError]);

  const triggerKillSwitch = useCallback(() => {
    setKillSwitch(true);
    disconnect();
    setStatus("ended");
    toast.error("Crisis detected. Session ended. Please seek professional help.");
  }, [disconnect]);

  const handleConnect = useCallback(async () => {
    if (!user) {
      toast.error("Please log in first");
      return;
    }

    setStatus("connecting");
    setErrorMsg(null);
    setMessages([]);
    setKillSwitch(false);

    try {
      // 1. Get API key and config from server
      const { apiKey, configId } = await mintTokenMut.mutateAsync();

      // 2. Create a DB session
      const { sessionId: sid } = await createSessionMut.mutateAsync();
      setSessionId(sid);

      // 3. Connect using Hume SDK with selected voice
      const selectedVoiceConfig = VOICE_OPTIONS[selectedVoice];
      console.log("[Voice] Connecting to Hume EVI with voice:", selectedVoice, selectedVoiceConfig.id);
      const connectOptions = {
        auth: { type: "apiKey" as const, value: apiKey },
        hostname: "api.hume.ai",
        configId, // Use the config ID from server
      };
      // Pass voice ID via sessionSettings (system prompt will be sent by v2vRelay)
      const sessionSettings = {
        voice: {
          id: selectedVoiceConfig.id,
        },
      };
      await (connect as any)(connectOptions, sessionSettings);

      setStatus("live");
      toast.success("Connected to your Mirror");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[Voice] Connection failed:", errorMsg);
      setErrorMsg(errorMsg);
      setStatus("error");
      toast.error(`Failed to connect: ${errorMsg}`);
    }
  }, [user, connect, mintTokenMut, createSessionMut, selectedVoice]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setStatus("ended");
    toast.success("Session ended");
  }, [disconnect]);

  const handleToggleMic = useCallback(() => {
    setIsMuted(!isMuted);
    // Hume SDK handles mic state internally
  }, [isMuted]);

  const handleVoiceChange = (voice: "female" | "male") => {
    if (status === "idle" || status === "ended" || status === "error") {
      setSelectedVoice(voice);
    } else {
      toast.error("Cannot change voice while connected. Please disconnect first.");
    }
  };

  if (!user) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Please log in to use the Mirror</p>
            <Button onClick={() => setLocation("/")}>Go Home</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-screen bg-background">
        {/* Tab Navigation */}
        <div className="flex gap-4 px-4 pt-4 border-b border-border">
          <button
            onClick={() => setMirrorTab("chat")}
            className={`pb-3 px-2 font-medium text-sm transition-colors ${
              mirrorTab === "chat"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setMirrorTab("voice")}
            className={`pb-3 px-2 font-medium text-sm transition-colors ${
              mirrorTab === "voice"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🎤 Voice
          </button>
        </div>

        {/* Chat Tab Content */}
        {mirrorTab === "chat" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-muted-foreground mb-4">Chat mode coming soon</p>
                <Button onClick={() => setMirrorTab("voice")}>Go to Voice</Button>
              </div>
            </div>
          </div>
        )}

        {/* Voice Tab Content */}
        {mirrorTab === "voice" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* ── Waveform header ── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-shrink-0 px-4 pt-4 pb-3"
            style={{
              background: "linear-gradient(to bottom, oklch(0.14 0.04 280), oklch(0.13 0.03 280 / 0))",
              borderBottom: status === "live" ? "1px solid oklch(0.65 0.16 185 / 0.15)" : "1px solid oklch(0.22 0.04 280)",
            }}
          >
            <VoiceWave
              status={status}
              isMuted={isMuted}
              micFft={micFft}
              audioLevel={audioLevel}
            />
          </motion.div>

          {/* ── Transcript ── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && status !== "live" && status !== "connecting" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center justify-center h-full text-center gap-3 py-12"
              >
                <div className="flex items-center gap-2 bg-background/50 rounded-full p-1 border border-border/50 mb-2">
                  {Object.entries(VOICE_OPTIONS).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => handleVoiceChange(key as "female" | "male")}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedVoice === key
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                      title={value.label}
                    >
                      {key === "female" ? "♀ Female" : "♂ Male"}
                    </button>
                  ))}
                </div>
                <p className="text-xs" style={{ color: "oklch(0.45 0.04 270)" }}>
                  {status === "ended" ? "Session ended. Transcript above." : "Your conversation will appear here"}
                </p>
              </motion.div>
            )}
            {messages.length === 0 && status === "connecting" && (
              <div className="flex items-center justify-center h-full py-12">
                <p className="text-xs" style={{ color: "oklch(0.50 0.06 270)" }}>Connecting to your Mirror…</p>
              </div>
            )}
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[82%] px-4 py-3 rounded-2xl space-y-2"
                    style={{
                      background: msg.role === "user"
                        ? "oklch(0.65 0.16 185 / 0.18)"
                        : "oklch(0.20 0.05 280)",
                      border: msg.role === "user"
                        ? "1px solid oklch(0.65 0.16 185 / 0.35)"
                        : "1px solid oklch(0.28 0.05 280)",
                    }}
                  >
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: msg.role === "user" ? "oklch(0.90 0.02 270)" : "oklch(0.85 0.02 270)" }}
                    >
                      {msg.content}
                    </p>
                    {msg.emotions && msg.emotions.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {msg.emotions.map((e) => (
                          <span
                            key={e.name}
                            className={`text-[10px] px-2 py-0.5 rounded-full ${emotionColor(e.name)}`}
                          >
                            {e.name} {(e.score * 100).toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* ── Alerts ── */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mb-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-destructive">Connection Error</p>
                <p className="text-[11px] text-destructive/80 mt-0.5">{errorMsg}</p>
              </div>
            </motion.div>
          )}
          {killSwitch && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mb-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30"
            >
              <p className="text-xs font-semibold text-red-400">Crisis detected. Please reach out to a mental health professional.</p>
              <p className="text-[11px] text-red-400/80 mt-1">National Suicide Prevention Lifeline: 1-800-273-8255</p>
            </motion.div>
          )}

          {/* ── Bottom controls ── */}
          <div
            className="flex-shrink-0 px-4 pb-6 pt-3 space-y-3"
            style={{ borderTop: "1px solid oklch(0.20 0.04 280)" }}
          >
            {status === "ended" && sessionId && (
              <SaveToJournalButton sessionId={sessionId} />
            )}
            {(status === "idle" || status === "error" || status === "ended" || status === "connecting") && (
              <Button
                onClick={handleConnect}
                disabled={status === "connecting"}
                className="w-full h-12 text-base font-semibold rounded-full"
              >
                {status === "connecting" ? (
                  <><span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin mr-2" />Connecting…</>
                ) : status === "ended" ? "Start New Session" : "Start Session"}
              </Button>
            )}
            {status === "live" && (
              <div className="flex gap-3">
                <Button
                  onClick={handleToggleMic}
                  variant={isMuted ? "destructive" : "outline"}
                  className="flex-1 h-12 rounded-full"
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <span className="ml-2 text-sm">{isMuted ? "Unmute" : "Mute"}</span>
                </Button>
                <Button
                  onClick={handleDisconnect}
                  variant="destructive"
                  className="flex-1 h-12 rounded-full"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span className="ml-2 text-sm">End</span>
                </Button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </AppShell>
  );
}
