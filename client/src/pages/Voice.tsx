import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Mic, MicOff, PhoneOff, AlertTriangle, History, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";

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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Voice() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [killSwitch, setKillSwitch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // tRPC mutations
  const mintTokenMut = trpc.voice.mintToken.useMutation();
  const createSessionMut = trpc.voice.createSession.useMutation();
  const saveMessageMut = trpc.voice.saveMessage.useMutation();
  const endSessionMut = trpc.voice.endSession.useMutation();

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Audio helpers ────────────────────────────────────────────────────────────

  const getAudioContext = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext({ sampleRate: 16000 });
    }
    return audioCtxRef.current;
  }, []);

  const enqueueAudio = useCallback((buffer: ArrayBuffer) => {
    audioQueueRef.current.push(buffer);
    if (!isPlayingRef.current) playNext();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const playNext = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const buf = audioQueueRef.current.shift()!;
    try {
      const ctx = getAudioContext();
      const decoded = await ctx.decodeAudioData(buf.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      source.onended = () => playNext();
      source.start();
    } catch {
      playNext();
    }
  }, [getAudioContext]);

  const stopPlayback = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // ── Mic capture ─────────────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } })
      .then((stream) => {
        mediaStreamRef.current = stream;
        const ctx = getAudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          const pcm = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(pcm.length);
          for (let i = 0; i < pcm.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767)));
          }
          wsRef.current.send(
            JSON.stringify({
              type: "audio_input",
              data: btoa(Array.from(new Uint8Array(int16.buffer), (b) => String.fromCharCode(b)).join("")),
            })
          );
        };
        source.connect(processor);
        processor.connect(ctx.destination);
        setIsRecording(true);
      })
      .catch(() => {
        toast.error("Microphone access denied. Please allow mic access and try again.");
      });
  }, [getAudioContext]);

  const stopRecording = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setIsRecording(false);
  }, []);

  // ── Kill switch ──────────────────────────────────────────────────────────────

  const triggerKillSwitch = useCallback(() => {
    setKillSwitch(true);
    stopRecording();
    stopPlayback();
    if (wsRef.current) {
      wsRef.current.close(1000, "kill_switch");
      wsRef.current = null;
    }
    setStatus("ended");
    setMessages((prev) => [
      ...prev,
      {
        id: `crisis-${Date.now()}`,
        role: "assistant",
        content:
          "I'm pausing our conversation because your safety matters most. If you're in crisis, please reach out to the 988 Suicide & Crisis Lifeline by calling or texting **988**. You are not alone.",
        timestamp: Date.now(),
      },
    ]);
  }, [stopRecording, stopPlayback]);

  // ── Connect ──────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!user) return;
    setStatus("connecting");
    setErrorMsg(null);
    setMessages([]);
    setKillSwitch(false);

    try {
      // 1. Mint token server-side
      const { token, configId } = await mintTokenMut.mutateAsync();

      // 2. Create a DB session
      const { sessionId: sid } = await createSessionMut.mutateAsync();
      setSessionId(sid);

      // 3. Open WebSocket directly to Hume EVI
      const params = new URLSearchParams({ access_token: token });
      if (configId) params.set("config_id", configId);
      const wsUrl = `wss://api.hume.ai/v0/evi/chat?${params.toString()}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setStatus("live");
        startRecording();
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          enqueueAudio(event.data);
          return;
        }
        try {
          const msg = JSON.parse(event.data as string);

          if (msg.type === "audio_output" && msg.data) {
            const binary = atob(msg.data);
            const buf = new ArrayBuffer(binary.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i) & 0xff;
            enqueueAudio(buf);
          }

          if (msg.type === "user_message" && msg.message?.content) {
            const content: string = msg.message.content;
            if (hasCrisisContent(content)) {
              triggerKillSwitch();
              return;
            }
            const emotions: Emotion[] = (msg.models?.prosody?.scores
              ? Object.entries(msg.models.prosody.scores as Record<string, number>)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([name, score]) => ({ name, score }))
              : []);
            const newMsg: Message = {
              id: `u-${Date.now()}`,
              role: "user",
              content,
              emotions,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, newMsg]);
            if (sessionId) {
              saveMessageMut.mutate({ sessionId, role: "user", content, emotions });
            }
          }

          if (msg.type === "assistant_message" && msg.message?.content) {
            const content: string = msg.message.content;
            const newMsg: Message = {
              id: `a-${Date.now()}`,
              role: "assistant",
              content,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, newMsg]);
            if (sessionId) {
              saveMessageMut.mutate({ sessionId, role: "assistant", content });
            }
          }

          if (msg.type === "error") {
            setErrorMsg(msg.message || "An error occurred during the session.");
            setStatus("error");
          }
        } catch {
          // non-JSON message — ignore
        }
      };

      ws.onerror = () => {
        setErrorMsg("Could not connect to the voice server. Please try again.");
        setStatus("error");
      };

      ws.onclose = (e) => {
          if (!killSwitch && e.code !== 1000) {
          setErrorMsg("The connection ended unexpectedly. Please try again.");
          setStatus("ended");
        } else if (e.code === 1000) {
          setStatus("ended");
        }
        stopRecording();
        stopPlayback();
        if (sessionId) {
          endSessionMut.mutate({ sessionId });
        }
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start voice session.";
      setErrorMsg(message);
      setStatus("error");
    }
  }, [user, mintTokenMut, createSessionMut, sessionId, saveMessageMut, endSessionMut, startRecording, enqueueAudio, triggerKillSwitch, stopRecording, stopPlayback, killSwitch, status]);

  const disconnect = useCallback(() => {
    stopRecording();
    stopPlayback();
    if (wsRef.current) {
      wsRef.current.close(1000, "user_disconnect");
      wsRef.current = null;
    }
    if (sessionId) {
      endSessionMut.mutate({ sessionId });
    }
    setStatus("ended");
  }, [stopRecording, stopPlayback, sessionId, endSessionMut]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ───────────────────────────────────────────────────────────────────

  const pulseScale = status === "live" && isRecording ? [1, 1.18, 1] : [1, 1, 1];

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100dvh-4rem)] max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
          <button
            onClick={() => navigate("/chat")}
            className="p-2 rounded-full hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">Voice Mirror</h1>
            <p className="text-xs text-muted-foreground">
              Real-time voice conversation
              {status === "live" && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate("/voice/history")}
            className="p-2 rounded-full hover:bg-secondary/60 transition-colors"
            title="Session history"
          >
            <History className="w-5 h-5 text-muted-foreground" />
          </button>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && status === "idle" && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="w-10 h-10 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium">Voice Mirror</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Speak naturally. Your Mirror listens, reflects, and responds in real time.
                </p>
              </div>
            </div>
          )}

          {messages.length === 0 && status === "connecting" && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-16 h-16 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Connecting to your Mirror…</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-secondary-foreground rounded-bl-sm"
                  }`}
                >
                  <p>{msg.content}</p>
                  {msg.emotions && msg.emotions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {msg.emotions.map((e) => (
                        <span
                          key={e.name}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${emotionColor(e.name)}`}
                        >
                          {e.name} {Math.round(e.score * 100)}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </main>

        {/* Error / ended state */}
        {(status === "ended" || status === "error") && errorMsg && (
          <div className="mx-4 mb-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-200">{errorMsg}</p>
                <button
                  onClick={() => { setStatus("idle"); setErrorMsg(null); }}
                  className="text-xs text-amber-400 underline mt-1"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Kill switch banner */}
        {killSwitch && (
          <div className="mx-4 mb-3 p-4 rounded-xl border border-red-500/40 bg-red-500/10">
            <p className="text-sm font-semibold text-red-300">Crisis resources</p>
            <p className="text-xs text-red-200 mt-1">
              Call or text <strong>988</strong> (Suicide & Crisis Lifeline) · 24/7 · Free & confidential
            </p>
          </div>
        )}

        {/* Save to Journal (after session ends) */}
        {status === "ended" && sessionId && messages.length > 0 && (
          <div className="mx-4 mb-3">
            <SaveToJournalButton sessionId={sessionId} />
          </div>
        )}

        {/* Controls */}
        <footer className="px-4 py-4 border-t border-border/40">
          {status === "idle" || status === "error" || status === "ended" ? (
            <Button
              onClick={connect}
              disabled={false}
              className="w-full h-14 text-base font-semibold gap-2 bg-primary hover:bg-primary/90"
            >
              <Mic className="w-5 h-5" />
              {status === "ended" ? "Start New Session" : "Start Voice Session"}
            </Button>
          ) : status === "connecting" ? (
            <Button disabled className="w-full h-14 text-base">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
              Connecting…
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              {/* Mic toggle */}
              <button
                onClick={() => {
                  if (isRecording) stopRecording();
                  else startRecording();
                }}
                className={`flex-1 h-14 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${
                  isRecording
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
              >
                {/* Pulsing orb */}
                <motion.div
                  animate={{ scale: pulseScale }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                  className={`w-3 h-3 rounded-full ${isRecording ? "bg-emerald-400" : "bg-muted-foreground"}`}
                />
                {isRecording ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                <span className="text-sm">{isRecording ? "Listening" : "Muted"}</span>
              </button>

              {/* End call */}
              <button
                onClick={disconnect}
                className="w-14 h-14 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center hover:bg-red-500/30 transition-colors"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          )}
        </footer>
      </div>
    </AppShell>
  );
}
