import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Mic, MicOff, PhoneOff, AlertTriangle, History, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useVoice } from "@humeai/voice-react";

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

// ── Glowing Orb Component with Audio Visualization ────────────────────────────

function GlowingOrb({ 
  status, 
  isMuted,
  audioLevel = 0 
}: { 
  status: Status; 
  isMuted: boolean;
  audioLevel?: number;
}) {
  const isActive = status === "live";
  const isListening = isActive && !isMuted;
  const hasAudio = audioLevel > 0.05; // Only consider it audio if above threshold
  
  // Scale rings based on audio level (0-1)
  const audioScale = 1 + audioLevel * 0.3; // Max 1.3x scale
  const audioOpacity = 0.3 + audioLevel * 0.5; // 0.3 to 0.8
  
  return (
    <div className="flex justify-center mb-8">
      <div className="relative w-32 h-32">
        {/* Outer expanding rings - only animate when there's audio */}
        {isActive && isListening && hasAudio && (
          <>
            {/* Ring 1 - Outermost - responds to audio */}
            <motion.div
              className="absolute inset-0 rounded-full border border-cyan-400/30"
              animate={{
                scale: [1, audioScale * 1.4],
                opacity: [audioOpacity * 0.6, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
            {/* Ring 2 - Mid - responds to audio */}
            <motion.div
              className="absolute inset-0 rounded-full border border-cyan-400/50"
              animate={{
                scale: [1, audioScale * 1.25],
                opacity: [audioOpacity * 0.8, 0],
              }}
              transition={{
                duration: 1.0,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
            {/* Ring 3 - Inner - responds to audio */}
            <motion.div
              className="absolute inset-0 rounded-full border border-cyan-300/70"
              animate={{
                scale: [1, audioScale * 1.1],
                opacity: [audioOpacity, 0.2],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          </>
        )}
        
        {/* Main orb - Bright cyan center */}
        <motion.div
          className={`absolute inset-0 rounded-full flex items-center justify-center ${
            isListening && hasAudio
              ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-500"
              : isActive
              ? "bg-gradient-to-br from-cyan-400/90 via-cyan-500/80 to-cyan-600/70"
              : "bg-gradient-to-br from-slate-600 to-slate-700"
          }`}
          animate={{
            scale: isListening && hasAudio ? [1, 1.08 + audioLevel * 0.05] : 1,
            boxShadow: isListening && hasAudio
              ? [
                  "0 0 30px rgba(34, 211, 238, 0.6), inset 0 0 20px rgba(34, 211, 238, 0.3)",
                  "0 0 60px rgba(34, 211, 238, 1), inset 0 0 30px rgba(34, 211, 238, 0.5)",
                  "0 0 30px rgba(34, 211, 238, 0.6), inset 0 0 20px rgba(34, 211, 238, 0.3)",
                ]
              : isActive
              ? [
                  "0 0 20px rgba(34, 211, 238, 0.4), inset 0 0 15px rgba(34, 211, 238, 0.2)",
                  "0 0 40px rgba(34, 211, 238, 0.6), inset 0 0 25px rgba(34, 211, 238, 0.3)",
                  "0 0 20px rgba(34, 211, 238, 0.4), inset 0 0 15px rgba(34, 211, 238, 0.2)",
                ]
              : "0 0 0px rgba(34, 211, 238, 0)",
          }}
          transition={{
            duration: isListening && hasAudio ? 0.3 : 2.5,
            repeat: isListening && hasAudio ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          {/* Inner bright spot */}
          <div className="absolute w-8 h-8 bg-white rounded-full blur-sm opacity-40" />
          <div className="absolute w-4 h-4 bg-cyan-100 rounded-full blur-xs opacity-60" />
        </motion.div>
        
        {/* Status text */}
        <motion.div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs font-semibold whitespace-nowrap tracking-wider"
          animate={{
            opacity: isActive ? 1 : 0.4,
            color: isListening ? "#22d3ee" : isActive ? "#06b6d4" : "#64748b",
          }}
        >
          {isListening ? "LISTENING" : isActive ? "READY" : "IDLE"}
        </motion.div>
      </div>
    </div>
  );
}

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
  const [audioLevel, setAudioLevel] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioLevelRef = useRef(0);
  const audioDecayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Hume SDK hooks
  const {
    connect,
    disconnect,
    messages: humeMessages,
    error: humeError,
  } = useVoice();

  const mintTokenMut = trpc.voice.mintToken.useMutation();
  const createSessionMut = trpc.voice.createSession.useMutation();
  const saveMessageMut = trpc.voice.saveMessage.useMutation();

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Audio level decay effect - gradually reduce audio level when no new messages
  useEffect(() => {
    if (audioDecayIntervalRef.current) {
      clearInterval(audioDecayIntervalRef.current);
    }

    audioDecayIntervalRef.current = setInterval(() => {
      audioLevelRef.current = Math.max(0, audioLevelRef.current - 0.05);
      setAudioLevel(audioLevelRef.current);
    }, 50);

    return () => {
      if (audioDecayIntervalRef.current) {
        clearInterval(audioDecayIntervalRef.current);
      }
    };
  }, []);

  // Monitor Hume SDK messages and sync to local state + update audio level
  useEffect(() => {
    if (!humeMessages || humeMessages.length === 0) return;

    const lastHumeMsg = humeMessages[humeMessages.length - 1];
    const lastLocalMsg = messages[messages.length - 1];
    const msg = lastHumeMsg as any;

    // Only process messages with id, role, and content
    if (!msg.id || !msg.role || !msg.message?.content) return;

    // Avoid duplicates
    if (lastLocalMsg?.id === `hume-${msg.id}`) return;

    // Update audio level based on message role and content length
    // User messages (speaking) get higher audio levels
    if (msg.role === "user") {
      const contentLength = msg.message?.content?.length || 0;
      const level = Math.min(1, contentLength / 100); // Normalize to 0-1
      audioLevelRef.current = level;
      setAudioLevel(level);
    }

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
    setAudioLevel(0);
    audioLevelRef.current = 0;

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
    setAudioLevel(0);
    audioLevelRef.current = 0;
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
        <>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  {msg.emotions && msg.emotions.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {msg.emotions.map((e) => (
                        <span key={e.name} className={`text-xs px-2 py-1 rounded ${emotionColor(e.name)}`}>
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

        {/* Error Display */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Connection Error</p>
              <p className="text-xs text-destructive/80 mt-1">{errorMsg}</p>
            </div>
          </motion.div>
        )}

        {/* Kill Switch Alert */}
        {killSwitch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30"
          >
            <p className="text-sm font-medium text-red-500">
              Crisis detected. Please reach out to a mental health professional.
            </p>
            <p className="text-xs text-red-500/80 mt-2">
              National Suicide Prevention Lifeline: 1-800-273-8255
            </p>
          </motion.div>
        )}

        {/* Session End Options */}
        {status === "ended" && sessionId && (
          <div className="mx-4 mb-4">
            <SaveToJournalButton sessionId={sessionId} />
          </div>
        )}

        {/* Center Section: Orb, Voice Selection, and Start Button */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-40">
          {/* Glowing Orb - only show when live */}
          {status === "live" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <GlowingOrb status={status} isMuted={isMuted} audioLevel={audioLevel} />
            </motion.div>
          )}

          {/* Voice Selection - only show when idle */}
          {(status === "idle" || status === "error" || status === "ended") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 flex items-center gap-2 bg-background/50 rounded-full p-1 border border-border/50"
            >
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
            </motion.div>
          )}

          {/* Start/Control Button */}
          {status === "idle" || status === "error" || status === "ended" || status === "connecting" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-xs"
            >
              <Button
                onClick={handleConnect}
                disabled={status === "connecting"}
                className="w-full h-14 text-lg font-semibold rounded-full"
              >
                {status === "connecting" ? "Connecting..." : "Start Session"}
              </Button>
            </motion.div>
          ) : status === "live" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex gap-3 w-full max-w-xs"
            >
              <Button
                onClick={handleToggleMic}
                variant={isMuted ? "destructive" : "default"}
                className="flex-1 h-12 rounded-full"
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                className="flex-1 h-12 rounded-full"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </motion.div>
          ) : null}

          {/* Live Status Indicator */}
          {status === "live" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex items-center justify-center gap-2 text-sm text-emerald-400"
            >
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Live
            </motion.div>
          )}
        </div>
        </>
        )}
      </div>
    </AppShell>
  );
}
