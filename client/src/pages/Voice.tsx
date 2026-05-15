import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Phone, PhoneOff, ArrowLeft, AlertTriangle, ShieldAlert } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Safety kill switch ──────────────────────────────────────────────────────

const KILL_PHRASES = [
  "suicide",
  "kill myself",
  "killing myself",
  "end my life",
  "ending it all",
  "end it all",
  "don't want to be here anymore",
  "dont want to be here anymore",
  "i want to die",
  "hurting myself",
  "hurt myself",
  "self harm",
  "self-harm",
  "hurt someone",
  "hurting someone",
];

const KILL_MESSAGE =
  "I'm only an AI and I'm not able to give advice about this. If you're in immediate danger, please call your local emergency services. In the U.S. you can also call or text 988 (Suicide & Crisis Lifeline). I have to stop the conversation here so you can reach a real person who can help.";

function containsKillPhrase(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return KILL_PHRASES.some((p) => t.includes(p));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

type Emotion = { name: string; score: number };

type VoiceMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  emotions?: Emotion[];
};

// ─── Emotion color mapping ───────────────────────────────────────────────────

const EMOTION_COLORS: Record<string, string> = {
  Joy: "text-yellow-400",
  Excitement: "text-amber-400",
  Interest: "text-teal-400",
  Surprise: "text-purple-400",
  Concentration: "text-blue-400",
  Contemplation: "text-indigo-400",
  Determination: "text-emerald-400",
  Realization: "text-cyan-400",
  Admiration: "text-pink-400",
  Amusement: "text-orange-400",
  Sadness: "text-blue-300",
  Anxiety: "text-red-300",
  Confusion: "text-yellow-300",
  Disappointment: "text-gray-400",
  Distress: "text-red-400",
  Anger: "text-red-500",
  Fear: "text-violet-400",
  Empathic_Pain: "text-rose-400",
};

function getEmotionColor(name: string): string {
  return EMOTION_COLORS[name] ?? "text-muted-foreground";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Voice() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "ended">("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [killSwitch, setKillSwitch] = useState(false);
  const [lastEmotions, setLastEmotions] = useState<Emotion[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const nextStartRef = useRef(0);
  const playingRef = useRef(false);
  const killRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Audio playback queue (barge-in capable) ──

  const ensureAudioCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      nextStartRef.current = 0;
    }
    return audioCtxRef.current;
  };

  const stopPlayback = useCallback(() => {
    Array.from(activeSourcesRef.current).forEach((src) => {
      try {
        src.onended = null;
        src.stop(0);
      } catch {
        /* noop */
      }
    });
    activeSourcesRef.current.clear();
    nextStartRef.current = 0;
    playingRef.current = false;
  }, []);

  const enqueueAudio = useCallback(async (b64Data: string) => {
    if (killRef.current) return;
    const ctx = ensureAudioCtx();
    try {
      const buf = await ctx.decodeAudioData(base64ToArrayBuffer(b64Data));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      const startAt = Math.max(ctx.currentTime, nextStartRef.current);
      src.start(startAt);
      nextStartRef.current = startAt + buf.duration;
      activeSourcesRef.current.add(src);
      playingRef.current = true;
      src.onended = () => {
        activeSourcesRef.current.delete(src);
        if (activeSourcesRef.current.size === 0) playingRef.current = false;
      };
    } catch (err) {
      console.error("decode/play error", err);
    }
  }, []);

  // ── Recording (mic capture) ──

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (killRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const rec = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = rec;

      rec.ondataavailable = async (e) => {
        if (!e.data || e.data.size === 0) return;
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const data = await blobToBase64(e.data);
        ws.send(JSON.stringify({ type: "audio_input", data }));
      };
      rec.onerror = (e) => console.error("MediaRecorder error", e);

      // 100ms chunks — Hume's recommended browser buffer size
      rec.start(100);
      setIsRecording(true);
    } catch {
      setErrorMsg("Microphone access is required for Voice Mirror. Please allow microphone permissions.");
    }
  }, []);

  // ── Kill switch trigger ──

  const triggerKillSwitch = useCallback(() => {
    killRef.current = true;
    setKillSwitch(true);
    stopPlayback();
    stopRecording();
    try {
      wsRef.current?.send(JSON.stringify({ type: "kill_switch" }));
      wsRef.current?.close(1000, "kill_switch");
    } catch {
      /* noop */
    }
    setMessages((prev) => [...prev, { role: "system", content: KILL_MESSAGE }]);
  }, [stopPlayback, stopRecording]);

  // ── WebSocket lifecycle ──

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    setStatus("connecting");
    setErrorMsg(null);
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const userId = user?.id ?? 0;
    const url = `${proto}://${window.location.host}/ws?userId=${userId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("live");
      setErrorMsg(null);
      startRecording();
    };

    ws.onmessage = (event) => {
      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "user_message": {
          const text = msg.message?.content || "";
          if (containsKillPhrase(text)) {
            setMessages((prev) => [...prev, { role: "user", content: text }]);
            triggerKillSwitch();
            return;
          }
          const scores = msg.models?.prosody?.scores;
          const top3: Emotion[] = scores
            ? Object.entries(scores)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .slice(0, 3)
                .map(([name, score]) => ({ name, score: score as number }))
            : (msg.top_emotions || []);
          setLastEmotions(top3);
          setMessages((prev) => [...prev, { role: "user", content: text, emotions: top3 }]);
          break;
        }
        case "assistant_message": {
          if (killRef.current) return;
          const text = msg.message?.content || "";
          setMessages((prev) => [...prev, { role: "assistant", content: text }]);
          break;
        }
        case "audio_output": {
          if (killRef.current) return;
          enqueueAudio(msg.data);
          break;
        }
        case "user_interruption": {
          stopPlayback();
          break;
        }
        case "error": {
          console.error("Relay error:", msg);
          if (msg.code === "hume_not_configured") {
            setErrorMsg(
              "Voice Mirror is not configured yet. The Hume AI credentials need to be set up in Settings."
            );
          } else {
            setErrorMsg(msg.message || "Relay error");
          }
          break;
        }
        default:
          break;
      }
    };

    ws.onclose = (ev) => {
      setStatus("ended");
      stopRecording();
      stopPlayback();
      if (!killSwitch && ev.code !== 1000) {
        setErrorMsg(
          ev.reason ||
            "The connection ended unexpectedly. Please try again."
        );
      }
    };

    ws.onerror = () => {
      setErrorMsg("Could not connect to the voice server. Please try again.");
    };
  }, [user, enqueueAudio, startRecording, stopPlayback, stopRecording, triggerKillSwitch, killSwitch]);

  const disconnect = useCallback(() => {
    try {
      wsRef.current?.close(1000, "user_disconnect");
    } catch {
      /* noop */
    }
  }, []);

  useEffect(
    () => () => {
      disconnect();
      stopRecording();
      stopPlayback();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    },
    [disconnect, stopRecording, stopPlayback]
  );

  // ── Pulsing animation for the mic circle ──

  const pulseScale = status === "live" && isRecording ? [1, 1.15, 1] : [1, 1, 1];

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
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && status === "idle" && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="w-10 h-10 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium text-lg">Voice Mirror</p>
                <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                  Tap the button below to start a real-time voice conversation with your AI Mirror.
                  It listens, reflects, and reads your emotions.
                </p>
              </div>
            </div>
          )}

          {messages.length === 0 && status === "connecting" && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Mic className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm">Connecting to Voice Mirror...</p>
            </div>
          )}

          <AnimatePresence>
            {messages.map((m, i) => {
              if (m.role === "system") {
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-destructive/40 bg-destructive/10 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-5 h-5 text-destructive" />
                      <p className="font-semibold text-destructive text-sm">Safety Message</p>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{m.content}</p>
                  </motion.div>
                );
              }

              const isUser = m.role === "user";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    }`}
                  >
                    <p>{m.content}</p>
                    {isUser && m.emotions && m.emotions.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.emotions.map((e, ei) => (
                          <span
                            key={ei}
                            className={`text-[10px] font-medium ${getEmotionColor(e.name)} opacity-90`}
                          >
                            {e.name} {(e.score * 100).toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </main>

        {/* Footer */}
        <footer className="px-4 py-4 border-t border-border/40">
          {killSwitch ? (
            <div className="w-full text-center bg-destructive text-destructive-foreground text-sm font-medium py-3 rounded-xl flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Session ended for your safety.
            </div>
          ) : errorMsg ? (
            <div className="w-full bg-amber-900/20 border border-amber-500/30 text-amber-200 text-sm rounded-xl p-3">
              <p className="font-medium mb-1">Session ended</p>
              <p className="text-xs opacity-80">{errorMsg}</p>
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setStatus("idle");
                  setMessages([]);
                }}
                className="mt-2 text-xs text-primary underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              {/* Emotion display */}
              {lastEmotions.length > 0 && status === "live" && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground">Feeling:</span>
                  {lastEmotions.map((e, i) => (
                    <span key={i} className={`font-medium ${getEmotionColor(e.name)}`}>
                      {e.name} {(e.score * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
              )}

              {/* Mic status */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {status === "live" && isRecording ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Listening...
                  </>
                ) : status === "connecting" ? (
                  <>Connecting...</>
                ) : status === "ended" ? (
                  <>Session ended</>
                ) : (
                  <>Microphone idle</>
                )}
              </div>

              {/* Main action button */}
              <div className="flex items-center gap-4">
                {status !== "live" ? (
                  <motion.button
                    onClick={connect}
                    disabled={killSwitch || status === "connecting"}
                    animate={{ scale: pulseScale }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Phone className="w-7 h-7 text-primary-foreground" />
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={disconnect}
                    animate={{ scale: pulseScale }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center shadow-lg shadow-destructive/30 hover:bg-destructive/90 transition-colors"
                  >
                    <PhoneOff className="w-7 h-7 text-destructive-foreground" />
                  </motion.button>
                )}
              </div>

              {/* Mute toggle when live */}
              {status === "live" && (
                <button
                  onClick={() => {
                    if (isRecording) {
                      stopRecording();
                    } else {
                      startRecording();
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" /> Mute
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" /> Unmute
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </footer>
      </div>
    </AppShell>
  );
}
