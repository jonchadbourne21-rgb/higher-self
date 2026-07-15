
import type { User } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Send, RefreshCw, X, History, ChevronRight, Pencil, Check, MessageCircle, Mic, MicOff, Volume2, ChevronDown, Phone } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { UpgradeModal } from "@/components/UpgradeModal";
import { RewardWheel } from "@/components/RewardWheel";
import { useAuth } from "@/_core/hooks/useAuth";
import { isDemoMode } from "@/lib/demo";

// ─── Intent display config ────────────────────────────────────────────────────

const INTENT_CONFIG: Record<string, { label: string; color: string }> = {
  innerPeace: { label: "Inner Peace", color: "oklch(0.65 0.14 200)" },
  clarity:    { label: "Clarity",     color: "oklch(0.65 0.18 260)" },
  confidence: { label: "Confidence",  color: "oklch(0.65 0.20 30)"  },
  healing:    { label: "Healing",     color: "oklch(0.65 0.16 160)" },
  focus:      { label: "Focus",       color: "oklch(0.65 0.22 295)" },
};

// ─── Starter prompts ──────────────────────────────────────────────────────────

const STARTER_PROMPTS = [
  "What patterns do you see in my life right now?",
  "What am I avoiding that I need to face?",
  "How can I find more peace today?",
  "What belief is holding me back most?",
  "Help me understand a difficult emotion I'm feeling",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  id: string;
  createdAt?: Date;
  dbId?: number;
};

// ─── Timestamp helpers ────────────────────────────────────────────────────────

/** Returns true if currentMsg was sent 60+ minutes after prevMsg */
function shouldShowTimestamp(prev: ChatMessage, current: ChatMessage): boolean {
  if (!prev.createdAt || !current.createdAt) return false;
  const diffMs = current.createdAt.getTime() - prev.createdAt.getTime();
  return diffMs >= 60 * 60 * 1000;
}

/** Formats a Date for display in the timestamp pill */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.getTime() - 86_400_000).toDateString() === date.toDateString();
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (isToday) return time;
  if (isYesterday) return `Yesterday · ${time}`;
  return (
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ` · ${time}`
  );
}

/** Formats a session date for the history list */
function formatSessionDate(date: Date | null): string {
  if (!date) return "Unknown date";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.getTime() - 86_400_000).toDateString() === date.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Chat() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // sessionId: null = legacy/first session, string = new session after clear
  const [sessionId, setSessionId] = useState<string | null | undefined>(undefined);
  // viewingSessionId: when browsing past sessions (read-only view)
  const [viewingSessionId, setViewingSessionId] = useState<string | null | undefined>(undefined);
  const isViewingPast = viewingSessionId !== undefined;

  // Session title editing state
  const [editingSessionId, setEditingSessionId] = useState<string | null | undefined>(undefined);
  const [editingTitle, setEditingTitle] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // Tab state: "chat" | "history"
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  // History search state
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  // Auto-resume handled via useEffect (no modal)
  const [hasShownResumeModal, setHasShownResumeModal] = useState(false);
  const [showRewardWheel, setShowRewardWheel] = useState(false);
  const [wheelPrize, setWheelPrize] = useState<string | null>(null);
  // Voice mode state
  const [voiceMode, setVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasScrolledOnLoad = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Reliable scroll-to-bottom helper that uses both approaches
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  };

  // Track whether user has scrolled up — show scroll-to-bottom button
  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  };

  const utils = trpc.useUtils();

  // Fetch current session history
  const { data: history } = trpc.chat.history.useQuery(
    sessionId !== undefined ? { sessionId } : undefined,
    { enabled: isAuthenticated && sessionId !== undefined && !isViewingPast }
  );

  // Fetch past session history (read-only view)
  const { data: pastHistory } = trpc.chat.history.useQuery(
    viewingSessionId !== undefined ? { sessionId: viewingSessionId } : undefined,
    { enabled: isAuthenticated && isViewingPast }
  );

  // Fetch all sessions for history panel
  const { data: sessions } = trpc.chat.sessions.useQuery(undefined, {
    enabled: isAuthenticated && (showHistory || activeTab === "history"),
  });

  // Fetch session titles map
  const { data: sessionTitles } = trpc.chat.getSessionTitles.useQuery(undefined, {
    enabled: isAuthenticated && (showHistory || activeTab === "history"),
  });


  // Fetch last session for resume modal
  const { data: lastSession } = trpc.chat.getLastSession.useQuery(undefined, {
    enabled: isAuthenticated && !hasShownResumeModal,
  });
  // Get user's seedIntent for the intention badge
  const seedIntent = (user as User | null)?.seedIntent;;
  const intentInfo = seedIntent ? INTENT_CONFIG[seedIntent] : null;

  const generateTitleMutation = trpc.chat.generateTitle.useMutation({
    onSuccess: (data) => {
      if (data.title) {
        utils.chat.getSessionTitles.invalidate();
        utils.chat.sessions.invalidate();
      }
    },
    // Silent failure — title generation is best-effort
  });

  const clearMutation = trpc.chat.clearConversation.useMutation({
    onSuccess: (data) => {
      // Auto-generate a title for the session we're leaving (best-effort, silent)
      const leavingSessionId = sessionId !== undefined ? sessionId : null;
      generateTitleMutation.mutate({ sessionId: leavingSessionId ?? null });

      setSessionId(data.newSessionId);
      setLocalMessages([]);
      hasScrolledOnLoad.current = false;
      utils.chat.history.invalidate();
      utils.chat.sessions.invalidate();
      setShowClearConfirm(false);
      toast.success("Fresh start — your history is still saved.");
    },
    onError: () => toast.error("Couldn't clear conversation. Try again."),
  });

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      setIsThinking(false);
      setLocalMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          id: Date.now().toString(),
          createdAt: new Date(),
          dbId: data.messageId,
        },
      ]);
      // Play audio if voice mode returned audio
      if (data.audioDataUrl) {
        playAudioResponse(data.audioDataUrl);
      }
    },
    onError: (error) => {
      setIsThinking(false);
      if (error.message.includes("Daily chat limit reached")) {
        setShowUpgradeModal(true);
      } else {
        toast.error("Your mirror is momentarily quiet. Try again.");
      }
    },
  });



  const updateTitleMutation = trpc.chat.updateSessionTitle.useMutation({
    onSuccess: () => {
      utils.chat.getSessionTitles.invalidate();
      setEditingSessionId(undefined);
      setEditingTitle("");
      toast.success("Conversation named ✦");
    },
    onError: () => toast.error("Couldn't save title. Try again."),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  // Resume existing session on load. Only auto-start fresh if 8+ hours since last message.
  // This does NOT trigger on page navigation — only on initial mount when Chat loads.
  useEffect(() => {
    if (isAuthenticated && !hasShownResumeModal && lastSession) {
      setHasShownResumeModal(true);
      const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
      const lastMsgTime = lastSession.lastMessageAt ? new Date(lastSession.lastMessageAt).getTime() : 0;
      const timeSinceLastMsg = Date.now() - lastMsgTime;
      
      if (lastSession.messageCount > 0 && timeSinceLastMsg >= EIGHT_HOURS_MS) {
        // 8+ hours since last message — save old session to history, start fresh
        if (isDemoMode()) {
          // In demo mode, don't fire mutation; just use the existing session
          setSessionId(lastSession.sessionId);
        } else {
          clearMutation.mutate();
        }
      } else if (lastSession.messageCount > 0) {
        // Active session within 8 hours — resume where they left off
        setSessionId(lastSession.sessionId);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }, 100);
      } else {
        // Empty session or first time — just use current session
        setSessionId(lastSession.sessionId);
      }
    }
  }, [isAuthenticated, hasShownResumeModal, lastSession]);

  // On first load, determine the current session from history
  useEffect(() => {
    if (sessionId === undefined && isAuthenticated) {
      setSessionId(null);
    }
  }, [isAuthenticated, sessionId]);

  // Auto-scroll to bottom on initial history load (instant)
  useEffect(() => {
    if (history && history.length > 0 && !hasScrolledOnLoad.current) {
      hasScrolledOnLoad.current = true;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 80);
    }
  }, [history]);

  // Smooth-scroll to bottom whenever new messages or thinking state changes
  useEffect(() => {
    if (hasScrolledOnLoad.current) {
      scrollToBottom("smooth");
      // Double-tap for long AI responses that render progressively
      const timer = setTimeout(() => scrollToBottom("smooth"), 300);
      return () => clearTimeout(timer);
    }
  }, [localMessages, isThinking]);

  // Focus title input when editing starts
  useEffect(() => {
    if (editingSessionId !== undefined) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [editingSessionId]);

  // Merge history with local messages (deduplicate)
  const allMessages: ChatMessage[] = useMemo(() => {
    if (isViewingPast) {
      return (pastHistory || []).map((m) => ({
        ...m,
        id: m.id.toString(),
        createdAt: new Date(m.createdAt),
        dbId: m.id,
      }));
    }
    return [
      ...(history || []).map((m) => ({
        ...m,
        id: m.id.toString(),
        createdAt: new Date(m.createdAt),
        dbId: m.id,
      })),
      ...localMessages.filter(
        (lm) =>
          !(history || []).some(
            (hm) => hm.content === lm.content && hm.role === lm.role
          )
      ),
    ];
  }, [history, localMessages, isViewingPast, pastHistory]);

  // ─── Voice mode helpers ──────────────────────────────────────────────────
  const playAudioResponse = useCallback((audioDataUrl: string) => {
    setIsPlayingAudio(true);
    const audio = new Audio(audioDataUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
    audio.play().catch(() => setIsPlayingAudio(false));
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        
        // Convert to base64 and send for transcription
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          // Use Web Speech API for transcription (browser-native)
          transcribeWithWebSpeech(audioBlob);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone access denied. Please allow mic access.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const transcribeWithWebSpeech = useCallback((audioBlob: Blob) => {
    // Use SpeechRecognition API for real-time transcription
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }
    // Fallback: create a simple text prompt for the user
    toast.info("Processing your voice...");
    // For now, use a simpler approach: record and use the blob URL
    // The real transcription happens via the Web Speech API live
  }, []);

  // Live speech recognition for voice mode
  const startLiveRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported. Try Chrome or Safari.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        // Auto-send the transcribed text
        setLocalMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: transcript,
            id: Date.now().toString(),
            createdAt: new Date(),
          },
        ]);
        setIsThinking(true);
        sendMutation.mutate({ message: transcript, sessionId, voiceMode: true });
      }
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied.");
      } else {
        toast.error("Could not understand speech. Try again.");
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setIsRecording(true);
  }, [sessionId]);

  const handleSend = () => {
    if (!input.trim() || isThinking || isViewingPast) return;
    const msg = input.trim();
    setInput("");
    setLocalMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: msg,
        id: Date.now().toString(),
        createdAt: new Date(),
      },
    ]);
    setIsThinking(true);
    sendMutation.mutate({ message: msg, sessionId, voiceMode });
    // Immediately scroll to show user's message + thinking indicator
    setTimeout(() => scrollToBottom("smooth"), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarterPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleSelectSession = (sid: string | null) => {
    setViewingSessionId(sid);
    setShowHistory(false);
    hasScrolledOnLoad.current = false;
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);
  };

  const handleBackToLive = () => {
    setViewingSessionId(undefined);
    hasScrolledOnLoad.current = false;
  };

  const handleStartEditTitle = (e: React.MouseEvent, sid: string | null) => {
    e.stopPropagation();
    const key = sid ?? "__legacy__";
    const currentTitle = sessionTitles?.[key] ?? "";
    setEditingSessionId(sid);
    setEditingTitle(currentTitle);
  };

  const handleSaveTitle = (e: React.MouseEvent | React.KeyboardEvent, sid: string | null) => {
    e.stopPropagation();
    updateTitleMutation.mutate({ sessionId: sid, title: editingTitle });
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent, sid: string | null) => {
    if (e.key === "Enter") handleSaveTitle(e, sid);
    if (e.key === "Escape") {
      e.stopPropagation();
      setEditingSessionId(undefined);
      setEditingTitle("");
    }
  };

  /** Returns the display name for a session: custom title > date fallback */
  const getSessionDisplayName = (sid: string | null, lastMessage: Date | null): string => {
    const key = sid ?? "__legacy__";
    return sessionTitles?.[key] || formatSessionDate(lastMessage);
  };

  // Filter sessions by search query (title or message count)
  const filteredSessions = useMemo(() => {
    if (!sessions || !historySearchQuery.trim()) return sessions;
    const query = historySearchQuery.toLowerCase();
    return sessions.filter((s) => {
      const displayName = getSessionDisplayName(s.sessionId, s.lastMessage).toLowerCase();
      const messageCountStr = s.messageCount.toString();
      return displayName.includes(query) || messageCountStr.includes(query);
    });
  }, [sessions, historySearchQuery, sessionTitles]);

  return (
    <AppShell noScroll>
      <div className="flex flex-col h-full">
        {/* Tab navigation */}
        <div className="flex flex-col border-b border-border/30 flex-shrink-0">
          <div className="px-4 flex items-center gap-1 border-border/20">
            {[
              { id: "chat", label: "Chat", icon: MessageCircle },
              { id: "history", label: "History", icon: History },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "chat" | "history")}
                  className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium rounded-t-lg border-b-2 transition-all ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {isViewingPast && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex-shrink-0"
            >
              <div className="px-4 py-2 flex items-center justify-between"
                style={{ background: "oklch(0.46 0.14 185 / 0.08)", borderBottom: "1px solid oklch(0.46 0.14 185 / 0.15)" }}>
                <span className="text-xs text-primary/80 font-medium">
                  📖 Viewing past conversation (read-only)
                </span>
                <button
                  onClick={handleBackToLive}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Back to live ✦
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear Conversation Confirmation Dialog */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-6"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass rounded-3xl p-6 w-full max-w-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Start fresh?</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Your previous conversation will be preserved — this just opens a clean slate for a new session.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="text-muted-foreground hover:text-foreground ml-3 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2.5 rounded-2xl border border-border/40 text-sm text-muted-foreground hover:text-foreground transition-all"
                  >
                    Keep going
                  </button>
                  <button
                    onClick={() => {
                      if (isDemoMode()) { toast.info("Demo mode is read-only"); return; }
                      clearMutation.mutate();
                    }}
                    disabled={clearMutation.isPending}
                    className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-60 glow-gold"
                  >
                    {clearMutation.isPending ? "Starting..." : "Start fresh ✦"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Past Conversations Panel (slide-up) */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-end justify-center"
              style={{ background: "oklch(0.18 0.02 270 / 0.5)" }}
              onClick={() => { setShowHistory(false); setEditingSessionId(undefined); }}
            >
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="w-full max-w-[480px] bg-background rounded-t-3xl overflow-hidden"
                style={{ maxHeight: "75dvh" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Panel header */}
                <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border/20">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Past Conversations</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Tap to read · Pencil to name</p>
                  </div>
                  <button
                    onClick={() => { setShowHistory(false); setEditingSessionId(undefined); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-all"
                  >
                    <X size={16} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Session list */}
                <div className="overflow-y-auto" style={{ maxHeight: "calc(75dvh - 80px)" }}>
                  {!sessions ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading...</div>
                  ) : sessions.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">No conversations yet.</div>
                  ) : (
                    <div className="py-2">
                      {sessions.map((s) => {
                        const isCurrentSession = s.sessionId === sessionId;
                        const isEditing = editingSessionId !== undefined && editingSessionId === s.sessionId;
                        const displayName = getSessionDisplayName(s.sessionId, s.lastMessage);
                        const hasCustomTitle = !!(sessionTitles?.[s.sessionId ?? "__legacy__"]);

                        return (
                          <div
                            key={s.sessionId ?? "legacy"}
                            className="px-5 py-3.5 flex items-center gap-2 hover:bg-muted/40 transition-all group"
                          >
                            {/* Main tap area */}
                            <button
                              onClick={() => !isEditing && handleSelectSession(s.sessionId)}
                              className="flex-1 min-w-0 text-left"
                            >
                              {isEditing ? (
                                /* Inline title editor */
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    ref={titleInputRef}
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onKeyDown={(e) => handleTitleKeyDown(e, s.sessionId)}
                                    placeholder="Name this conversation..."
                                    maxLength={200}
                                    className="flex-1 min-w-0 bg-input border border-primary/40 rounded-xl px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  <button
                                    onClick={(e) => handleSaveTitle(e, s.sessionId)}
                                    disabled={updateTitleMutation.isPending}
                                    className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/20 transition-all flex-shrink-0 disabled:opacity-50"
                                    title="Save title"
                                  >
                                    <Check size={13} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingSessionId(undefined); setEditingTitle(""); }}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
                                    title="Cancel"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                /* Normal display */
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium truncate ${hasCustomTitle ? "text-foreground" : "text-muted-foreground"}`}>
                                      {displayName}
                                    </span>
                                    {isCurrentSession && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                        style={{ background: "oklch(0.46 0.14 185 / 0.12)", color: "oklch(0.46 0.14 185)" }}>
                                        Current
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {s.messageCount} message{s.messageCount !== 1 ? "s" : ""}
                                    {hasCustomTitle && s.lastMessage
                                      ? ` · ${formatSessionDate(s.lastMessage)}`
                                      : s.firstMessage && s.lastMessage && s.firstMessage.toDateString() !== s.lastMessage.toDateString()
                                      ? ` · ${formatSessionDate(s.firstMessage)} – ${formatSessionDate(s.lastMessage)}`
                                      : s.firstMessage
                                      ? ` · ${s.firstMessage.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`
                                      : ""}
                                  </p>
                                </div>
                              )}
                            </button>

                            {/* Pencil icon — visible on hover, hidden when editing */}
                            {!isEditing && (
                              <button
                                onClick={(e) => handleStartEditTitle(e, s.sessionId)}
                                title="Name this conversation"
                                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                              >
                                <Pencil size={13} />
                              </button>
                            )}

                            {/* Chevron — hidden when editing */}
                            {!isEditing && (
                              <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content area — switches based on activeTab */}
        {activeTab === "chat" && (
        <div className="relative flex-1 overflow-hidden">
        <div ref={chatContainerRef} onScroll={handleChatScroll} className="h-full overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide pb-4 relative">
          {/* Subtle mandala watermark */}
          <div className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-[0.04] z-0">
            <svg width="320" height="320" viewBox="0 0 320 320" fill="none">
              <circle cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="160" cy="160" r="110" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="160" cy="160" r="80" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="160" cy="160" r="50" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="160" cy="160" r="20" stroke="currentColor" strokeWidth="0.5" />
              {/* Petals */}
              {[0,30,60,90,120,150,180,210,240,270,300,330].map((angle) => (
                <line key={angle} x1="160" y1="160" x2={160 + 140 * Math.cos(angle * Math.PI / 180)} y2={160 + 140 * Math.sin(angle * Math.PI / 180)} stroke="currentColor" strokeWidth="0.3" />
              ))}
            </svg>
          </div>
          {allMessages.length === 0 && !isThinking && !isViewingPast && (
            <div className="space-y-6 pt-4">
              <div className="glass rounded-3xl p-6 space-y-3 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto glow-gold">
                  <span className="text-3xl">✦</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  I am here — your most evolved self. Ask me anything. I see you clearly, without judgment, and I know exactly what you need to grow.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-widest px-1">Start with...</p>
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleStarterPrompt(prompt)}
                    className="w-full text-left glass rounded-2xl p-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allMessages.length === 0 && isViewingPast && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 pt-12">
              <span className="text-3xl opacity-40">📭</span>
              <p className="text-sm text-muted-foreground">This session has no messages.</p>
            </div>
          )}

          {allMessages.map((msg, index) => (
            <div key={msg.id}>
              {/* Timestamp pill — shown when 1+ hour gap from previous message */}
              {index > 0 && shouldShowTimestamp(allMessages[index - 1], msg) && (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] text-muted-foreground/60 bg-muted/30 px-3 py-1 rounded-full tracking-wide">
                    {formatTimestamp(msg.createdAt!)}
                  </span>
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <span className="text-xs">✦</span>
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div
                    className={`rounded-3xl px-4 py-3 ${
                      msg.role === "user"
                        ? "rounded-br-lg text-white"
                        : "glass rounded-bl-lg"
                    }`}
                    style={msg.role === "user" ? { background: 'linear-gradient(135deg, oklch(0.55 0.12 185), oklch(0.45 0.10 195))' } : undefined}
                  >
                    {msg.role === "assistant" ? (
                      <div className="streamdown-content text-sm leading-relaxed">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                  {/* Per-message timestamp */}
                  {msg.createdAt && (
                    <p className={`text-[10px] text-muted-foreground/50 px-1 ${
                      msg.role === "user" ? "text-right" : "text-left"
                    }`}>
                      {msg.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          ))}

          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-1"
            >
              <p className="text-[11px] text-muted-foreground/60 ml-9 italic tracking-wide">
                Mirror is reflecting…
              </p>
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mr-2 mt-1">
                  <span className="text-xs">✦</span>
                </div>
                <div className="glass rounded-3xl rounded-bl-lg px-4 py-3">
                  <div className="flex gap-1 items-center h-5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll-to-bottom floating button */}
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => { scrollToBottom("smooth"); }}
            className="absolute bottom-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
            style={{
              background: "oklch(0.22 0.04 200)",
              border: "1px solid oklch(0.35 0.06 185 / 0.5)",
              color: "oklch(0.65 0.16 185)",
            }}
            title="Jump to latest"
          >
            <ChevronDown size={16} />
          </motion.button>
        )}
        </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
        <div className="flex-1 flex flex-col overflow-hidden pb-24">
          {/* Search bar */}
          <div className="px-4 py-3 border-b border-border/20 flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full bg-input border border-border/40 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {historySearchQuery && (
                <button
                  onClick={() => setHistorySearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
            {!sessions ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No conversations yet.</div>
            ) : (filteredSessions ?? []).length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No conversations match "{historySearchQuery}".</div>
            ) : (
              <div className="space-y-2">
                {(filteredSessions ?? []).map((s) => {
                const isCurrentSession = s.sessionId === sessionId;
                const isEditing = editingSessionId !== undefined && editingSessionId === s.sessionId;
                const displayName = getSessionDisplayName(s.sessionId, s.lastMessage);
                const hasCustomTitle = !!(sessionTitles?.[s.sessionId ?? "__legacy__"]);

                return (
                  <div
                    key={s.sessionId ?? "legacy"}
                    className="px-4 py-3 flex items-center gap-2 hover:bg-muted/40 transition-all group rounded-xl border border-border/20"
                  >
                    {/* Main tap area */}
                    <button
                      onClick={() => !isEditing && handleSelectSession(s.sessionId)}
                      className="flex-1 min-w-0 text-left"
                    >
                      {isEditing ? (
                        /* Inline title editor */
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={titleInputRef}
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => handleTitleKeyDown(e, s.sessionId)}
                            placeholder="Name this conversation..."
                            maxLength={200}
                            className="flex-1 min-w-0 bg-input border border-primary/40 rounded-xl px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            onClick={(e) => handleSaveTitle(e, s.sessionId)}
                            disabled={updateTitleMutation.isPending}
                            className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/20 transition-all flex-shrink-0 disabled:opacity-50"
                            title="Save title"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSessionId(undefined); setEditingTitle(""); }}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
                            title="Cancel"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className={`text-sm font-medium ${hasCustomTitle ? "text-foreground" : "text-muted-foreground"}`}>
                            {displayName}
                          </p>
                          <p className="text-xs text-muted-foreground/60">
                            {s.messageCount} messages
                          </p>
                        </>
                      )}
                    </button>

                    {/* Edit button — appears on hover */}
                    {!isEditing && (
                      <button
                        onClick={(e) => handleStartEditTitle(e, s.sessionId)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                        title="Rename conversation"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                  </div>
                );
               })}
              </div>
            )}
          </div>
        </div>
        )}


        {/* Input — stays pinned at bottom; pb-24 clears the floating nav */}
        <div className="px-4 pb-24 pt-2 border-t border-border/30 flex-shrink-0">
          {isViewingPast ? (
            <div className="flex items-center justify-center gap-3 py-3">
              <span className="text-xs text-muted-foreground">Read-only view</span>
              <button
                onClick={handleBackToLive}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all glow-gold"
              >
                Return to live chat ✦
              </button>
            </div>
          ) : voiceMode ? (
            /* Voice mode input */
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex items-center gap-3 w-full">
                {/* Toggle back to text */}
                <button
                  onClick={() => setVoiceMode(false)}
                  className="w-10 h-10 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all flex-shrink-0"
                  title="Switch to text"
                >
                  <MessageCircle size={16} />
                </button>
                
                {/* Main mic button */}
                <button
                  onClick={isRecording ? stopRecording : startLiveRecording}
                  disabled={isThinking || isPlayingAudio}
                  className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-medium transition-all active:scale-95 ${
                    isRecording
                      ? "bg-red-500/20 border-2 border-red-500 text-red-400 animate-pulse"
                      : "bg-primary/10 border-2 border-primary text-primary hover:bg-primary/20"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isRecording ? (
                    <><MicOff size={20} /> <span className="text-sm">Tap to stop</span></>
                  ) : isPlayingAudio ? (
                    <><Volume2 size={20} /> <span className="text-sm">AI speaking...</span></>
                  ) : (
                    <><Mic size={20} /> <span className="text-sm">Tap to speak</span></>
                  )}
                </button>
              </div>
              {isPlayingAudio && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[0,1,2,3,4].map(i => (
                      <motion.div key={i} className="w-1 bg-primary rounded-full" animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                    ))}
                  </div>
                  <button onClick={() => { audioRef.current?.pause(); setIsPlayingAudio(false); }} className="text-xs text-muted-foreground hover:text-foreground">
                    Stop
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Text mode input */
            <div className="flex gap-2 items-end">
              {/* Voice mode toggle */}
              <button
                onClick={() => setVoiceMode(true)}
                className="w-12 h-12 rounded-2xl border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all flex-shrink-0"
                title="Switch to voice mode"
              >
                <Mic size={18} />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Speak to your Mirror..."
                rows={1}
                className="flex-1 bg-input border border-border rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none max-h-32 scrollbar-hide"
                style={{ minHeight: "48px" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all active:scale-95 glow-gold flex-shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="chat"
      />
      <RewardWheel
        isOpen={showRewardWheel}
        onClose={() => setShowRewardWheel(false)}
        onSpinComplete={(prize) => {
          setWheelPrize(prize);
          // Handle prize reward here
          toast.success(`You won: ${prize}!`);
        }}
      />
    </AppShell>
  );
}
