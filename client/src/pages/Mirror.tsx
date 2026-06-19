import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { MessageCircle, Mic, MicOff, PhoneOff, Sparkles, History, Pencil, Check, X, Trash2, Plus, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useVoice } from "@humeai/voice-react";
import { Streamdown } from "streamdown";
import { UpgradeModal } from "@/components/UpgradeModal";
import { VoiceWave } from "@/components/VoiceWave";
import { IncomingCall } from "@/components/IncomingCall";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  id: string;
  createdAt?: Date;
  dbId?: number;
};

const STARTER_PROMPTS = [
  "What patterns do you see in my life right now?",
  "What am I avoiding that I need to face?",
  "How can I find more peace today?",
  "What belief is holding me back most?",
  "Help me understand a difficult emotion I'm feeling",
];

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

export default function Mirror() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"chat" | "voice">("chat");

  // Session management state
  const [sessionId, setSessionId] = useState<string | null | undefined>(undefined);
  const [viewingSessionId, setViewingSessionId] = useState<string | null | undefined>(undefined);
  const isViewingPast = viewingSessionId !== undefined;
  const [showHistory, setShowHistory] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null | undefined>(undefined);
  const [editingTitle, setEditingTitle] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Voice state
  const { connect, disconnect, messages: voiceMessages, isMuted, status, micFft } = useVoice();
  const [voiceGender, setVoiceGender] = useState<"male" | "female">("female");
  const voiceEndRef = useRef<HTMLDivElement>(null);

  // Entropy outbound call state
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [entropyVoicemailId, setEntropyVoicemailId] = useState<number | null>(null);
  const answerCallMut = trpc.voice.answerCall.useMutation();
  const declineCallMut = trpc.voice.declineCall.useMutation();

  // Derive audio level from SDK's micFft
  const audioLevel = useMemo(() => {
    if (!micFft || micFft.length === 0) return 0;
    const bins = micFft.slice(0, Math.min(8, micFft.length));
    const sum = bins.reduce((acc, v) => acc + v * v, 0);
    return Math.min(1, Math.sqrt(sum / bins.length) * 2);
  }, [micFft]);

  // tRPC utils for invalidation
  const utils = trpc.useUtils();

  // Queries
  const { data: history } = trpc.chat.history.useQuery(
    sessionId !== undefined ? { sessionId: isViewingPast ? viewingSessionId! : sessionId! } : undefined,
    { enabled: !!user && sessionId !== undefined }
  );

  const { data: pastHistory } = trpc.chat.history.useQuery(
    viewingSessionId !== undefined ? { sessionId: viewingSessionId } : undefined,
    { enabled: !!user && isViewingPast }
  );

  const { data: sessions } = trpc.chat.sessions.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: sessionTitles } = trpc.chat.getSessionTitles.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: lastSession } = trpc.chat.getLastSession.useQuery(undefined, {
    enabled: !!user && !hasInitialized,
  });

  // Mutations
  const sendChatMutation = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      setIsLoadingChat(false);
      setLocalMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          id: `msg-${Date.now() + 1}`,
          createdAt: new Date(),
          dbId: data.messageId,
        },
      ]);
    },
    onError: (error) => {
      setIsLoadingChat(false);
      if (error.message.includes("Daily chat limit reached")) {
        setShowUpgradeModal(true);
      } else {
        toast.error("Your mirror is momentarily quiet. Try again.");
      }
    },
  });

  const clearMutation = trpc.chat.clearConversation.useMutation({
    onSuccess: (data) => {
      generateTitleMutation.mutate({ sessionId: sessionId ?? null });
      setSessionId(data.newSessionId);
      setLocalMessages([]);
      utils.chat.history.invalidate();
      utils.chat.sessions.invalidate();
      toast.success("Fresh start — your history is still saved.");
    },
    onError: () => toast.error("Couldn't start fresh. Try again."),
  });

  const generateTitleMutation = trpc.chat.generateTitle.useMutation({
    onSuccess: () => {
      utils.chat.getSessionTitles.invalidate();
      utils.chat.sessions.invalidate();
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

  const deleteSessionMutation = trpc.chat.deleteSession.useMutation({
    onSuccess: () => {
      utils.chat.sessions.invalidate();
      utils.chat.getSessionTitles.invalidate();
      toast.success("Conversation deleted");
    },
    onError: () => toast.error("Couldn't delete. Try again."),
  });

  // Voice mutations
  const mintTokenMut = trpc.voice.mintToken.useMutation();
  const createSessionMut = trpc.voice.createSession.useMutation();

  // Initialize session on mount
  useEffect(() => {
    if (user && !hasInitialized && lastSession !== undefined) {
      setHasInitialized(true);
      if (lastSession) {
        const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
        const lastMsgTime = lastSession.lastMessageAt ? new Date(lastSession.lastMessageAt).getTime() : 0;
        const timeSinceLastMsg = Date.now() - lastMsgTime;

        if (lastSession.messageCount > 0 && timeSinceLastMsg >= EIGHT_HOURS_MS) {
          clearMutation.mutate();
        } else {
          setSessionId(lastSession.sessionId);
        }
      } else {
        setSessionId(null);
      }
    }
  }, [user, hasInitialized, lastSession]);

  // Merge server history with local messages
  const chatMessages = useMemo(() => {
    const displayHistory = isViewingPast ? pastHistory : history;
    if (!displayHistory) return localMessages;
    const serverMessages: ChatMessage[] = displayHistory.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      id: `server-${m.id}`,
      createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
      dbId: m.id,
    }));
    // Merge: server messages + local messages not already in server
    const serverIds = new Set(serverMessages.map((m) => m.dbId));
    const newLocal = localMessages.filter((m) => !m.dbId || !serverIds.has(m.dbId));
    return [...serverMessages, ...newLocal];
  }, [history, pastHistory, localMessages, isViewingPast]);

  // Auto-scroll chat
  useEffect(() => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [chatMessages]);

  // Auto-scroll voice
  useEffect(() => {
    voiceEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [voiceMessages]);

  // Focus title input when editing
  useEffect(() => {
    if (editingSessionId !== undefined) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [editingSessionId]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSendChat = useCallback(async () => {
    if (!userInput.trim() || isViewingPast) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: userInput,
      id: `msg-${Date.now()}`,
      createdAt: new Date(),
    };

    setLocalMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsLoadingChat(true);

    sendChatMutation.mutate({
      message: userInput,
      sessionId: sessionId ?? null,
      voiceMode: false,
    });
  }, [userInput, sendChatMutation, sessionId, isViewingPast]);

  // Check for entropy call on mount (from push notification deep link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isEntropyCall = params.get("entropyCall");
    const vmId = params.get("voicemailId");
    if (isEntropyCall === "true" && vmId) {
      setEntropyVoicemailId(Number(vmId));
      setShowIncomingCall(true);
      // Clean URL without reload
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleAnswerCall = useCallback(async () => {
    if (!entropyVoicemailId) return;
    setShowIncomingCall(false);
    try {
      const { systemPrompt } = await answerCallMut.mutateAsync({ voicemailId: entropyVoicemailId });
      // Start voice session with entropy-aware prompt via configId
      const { apiKey, configId } = await mintTokenMut.mutateAsync({ voice: voiceGender });
      await createSessionMut.mutateAsync();
      setMode("voice");
      await connect({
        auth: { type: "apiKey" as const, value: apiKey },
        hostname: "api.hume.ai",
        configId,
        // Pass the entropy-aware system prompt as initial context
        ...(systemPrompt ? { systemPrompt } : {}),
      });
      toast.success("Connected to your Higher Self");
    } catch (error) {
      toast.error("Failed to connect");
    }
  }, [entropyVoicemailId, answerCallMut, mintTokenMut, createSessionMut, connect, voiceGender]);

  const handleDeclineCall = useCallback(async () => {
    if (!entropyVoicemailId) return;
    setShowIncomingCall(false);
    try {
      await declineCallMut.mutateAsync({ voicemailId: entropyVoicemailId });
      toast("Your Higher Self will leave you a voicemail.", { icon: "\ud83d\udcec" });
    } catch (error) {
      // Silent fail
    }
  }, [entropyVoicemailId, declineCallMut]);

  const handleStartVoice = useCallback(async () => {
    try {
      const { apiKey, configId } = await mintTokenMut.mutateAsync({ voice: voiceGender });
      await createSessionMut.mutateAsync();
      await connect({
        auth: { type: "apiKey" as const, value: apiKey },
        hostname: "api.hume.ai",
        configId,
      });
      toast.success("Voice session started");
    } catch (error) {
      toast.error("Failed to start voice session");
    }
  }, [connect, mintTokenMut, createSessionMut, voiceGender]);

  const handleEndVoice = useCallback(async () => {
    try {
      await disconnect();
      toast.success("Voice session ended");
    } catch (error) {
      toast.error("Failed to end voice session");
    }
  }, [disconnect]);

  const handleSelectSession = (sid: string | null) => {
    setViewingSessionId(sid);
    setShowHistory(false);
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);
  };

  const handleBackToLive = () => {
    setViewingSessionId(undefined);
    setLocalMessages([]);
    utils.chat.history.invalidate();
  };

  const handleStartFresh = () => {
    clearMutation.mutate();
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

  const handleDeleteSession = (e: React.MouseEvent, sid: string | null) => {
    e.stopPropagation();
    deleteSessionMutation.mutate({ sessionId: sid });
  };

  const getSessionDisplayName = (sid: string | null, lastMessage: Date | null): string => {
    const key = sid ?? "__legacy__";
    return sessionTitles?.[key] || formatSessionDate(lastMessage);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Please log in to use the Mirror</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell noScroll>
      <div className="flex flex-col h-full relative">
        {/* ─── Header: Mode Switcher + History Button ─────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/30 backdrop-blur-sm shrink-0">
          {/* History button */}
          <button
            onClick={() => setShowHistory(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all relative"
            title="Session history"
          >
            <History size={18} />
            {sessions && sessions.length > 1 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary/80 text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                {sessions.length}
              </span>
            )}
          </button>

          {/* Mode switcher */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-secondary/50 border border-border/30">
            <button
              onClick={() => setMode("chat")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === "chat"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageCircle size={15} />
              Chat
            </button>
            <button
              onClick={() => setMode("voice")}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === "voice"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mic size={15} />
              Voice
            </button>
          </div>

          {/* New session button */}
          <button
            onClick={handleStartFresh}
            disabled={clearMutation.isPending}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all disabled:opacity-40"
            title="Start fresh session"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* ─── Viewing Past Banner ─── */}
        <AnimatePresence>
          {isViewingPast && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden shrink-0"
            >
              <div className="px-4 py-2.5 flex items-center justify-between bg-primary/5 border-b border-primary/10">
                <span className="text-xs text-primary/80 font-medium">
                  Viewing past conversation (read-only)
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

        {/* ─── Chat Mode ─────────────────────────────────────────────── */}
        {mode === "chat" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages area */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="max-w-2xl mx-auto px-4 py-6">
                {chatMessages.length === 0 && !isViewingPast ? (
                  /* ─── Empty State ─── */
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/15 to-purple-500/10 flex items-center justify-center border border-primary/20">
                        <Sparkles className="text-primary/70" size={28} />
                      </div>
                      <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl" />
                    </div>

                    <h2 className="text-lg font-medium text-foreground/90 mb-2">
                      What's on your mind?
                    </h2>
                    <p className="text-sm text-muted-foreground mb-8 max-w-xs">
                      Your Mirror is here to reflect, challenge, and support you.
                    </p>

                    <div className="w-full max-w-sm space-y-2">
                      {STARTER_PROMPTS.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setUserInput(prompt)}
                          className="w-full px-4 py-3 rounded-xl bg-card/80 border border-border/40 hover:border-primary/30 hover:bg-card text-left text-sm text-foreground/80 hover:text-foreground transition-all duration-200 group"
                        >
                          <span className="opacity-80 group-hover:opacity-100 transition-opacity">
                            {prompt}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ─── Message List ─── */
                  <div className="space-y-4 pb-4">
                    {chatMessages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                              : "bg-card border border-border/40 text-card-foreground rounded-2xl rounded-bl-md"
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            <Streamdown>{msg.content}</Streamdown>
                          ) : (
                            <p>{msg.content}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {/* Typing indicator */}
                    {isLoadingChat && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-card border border-border/40 px-4 py-3 rounded-2xl rounded-bl-md">
                          <div className="flex gap-1.5 items-center h-5">
                            <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} />
                            <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
                            <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* ─── Chat Input ─── */}
            {!isViewingPast && (
              <div className="border-t border-border/30 bg-card/20 backdrop-blur-sm px-4 py-3 pb-20 shrink-0">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-card border border-border/40 focus-within:border-primary/40 focus-within:shadow-sm focus-within:shadow-primary/10 transition-all duration-200">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                      placeholder="Ask your Mirror..."
                      className="flex-1 px-3 py-2 bg-transparent text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none"
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={isLoadingChat || !userInput.trim()}
                      className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 shrink-0"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Voice Mode ────────────────────────────────────────────── */}
        {mode === "voice" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {status.value === "disconnected" ? (
              <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
                <div className="mb-8">
                  <VoiceWave status="idle" isMuted={isMuted} audioLevel={audioLevel} micFft={micFft} />
                </div>

                <div className="flex items-center gap-2 mb-6">
                  <button
                    onClick={() => setVoiceGender("female")}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      voiceGender === "female"
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-muted-foreground border border-border/30 hover:border-border/60 hover:text-foreground"
                    }`}
                  >
                    Female voice
                  </button>
                  <button
                    onClick={() => setVoiceGender("male")}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      voiceGender === "male"
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-muted-foreground border border-border/30 hover:border-border/60 hover:text-foreground"
                    }`}
                  >
                    Male voice
                  </button>
                </div>

                <motion.button
                  onClick={handleStartVoice}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-3.5 bg-primary text-primary-foreground rounded-full font-medium text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow duration-200"
                >
                  Begin Session
                </motion.button>

                <p className="mt-4 text-xs text-muted-foreground/60">
                  Speak freely — your Mirror is listening
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* ─── Waveform Header (pinned top) ─── */}
                <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border/20">
                  <VoiceWave status="live" isMuted={isMuted} audioLevel={audioLevel} micFft={micFft} />
                </div>

                {/* ─── Scrollable Transcript (middle) ─── */}
                {voiceMessages.length > 0 && (
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    <AnimatePresence mode="popLayout">
                      {voiceMessages.map((msg: any, idx: number) => {
                        let content = '';
                        let role = 'assistant';
                        let isPartial = false;

                        if (msg.type === 'user_transcript') {
                          content = msg.message?.content || '';
                          role = 'user';
                          isPartial = msg.message?.isFinal === false;
                        } else if (msg.type === 'assistant_message') {
                          content = msg.message?.content || '';
                          role = 'assistant';
                        } else if (msg.type === 'user_message') {
                          content = msg.message?.content || '';
                          role = 'user';
                        } else if (msg.message?.content) {
                          content = msg.message.content;
                          role = msg.role || 'assistant';
                        }

                        if (!content) return null;

                        return (
                          <motion.div
                            key={msg.id || idx}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed ${
                                role === "user"
                                  ? `bg-primary text-primary-foreground rounded-2xl rounded-br-md ${isPartial ? "opacity-60" : ""}`
                                  : "bg-card border border-border/30 text-card-foreground rounded-2xl rounded-bl-md"
                              }`}
                            >
                              {isPartial && (
                                <div className="flex items-center gap-1 mb-1 text-[10px] opacity-60 uppercase tracking-wider">
                                  <Mic size={10} />
                                  <span>listening...</span>
                                </div>
                              )}
                              {role === "assistant" ? (
                                <Streamdown>{content}</Streamdown>
                              ) : (
                                <p>{content}</p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <div ref={voiceEndRef} />
                  </div>
                )}

                {/* ─── Empty State (when no messages) ─── */}
                {voiceMessages.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Listening...</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Speak and your words will appear here</p>
                    </div>
                  </div>
                )}

                {/* ─── Bottom Controls (pinned) ─── */}
                <div className="flex-shrink-0 px-4 py-4 border-t border-border/20">
                  <motion.button
                    onClick={handleEndVoice}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full px-5 py-2.5 rounded-full text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15 hover:border-red-500/30 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <PhoneOff size={14} />
                    End Session
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Session History Panel (slide-up overlay) ───────────────── */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-end justify-center"
              style={{ background: "oklch(0.18 0.02 270 / 0.6)" }}
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
                                  >
                                    <Check size={13} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingSessionId(undefined); setEditingTitle(""); }}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium truncate ${hasCustomTitle ? "text-foreground" : "text-muted-foreground"}`}>
                                      {displayName}
                                    </span>
                                    {isCurrentSession && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-primary/12 text-primary">
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

                            {/* Action buttons — visible on hover */}
                            {!isEditing && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={(e) => handleStartEditTitle(e, s.sessionId)}
                                  title="Name this conversation"
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all"
                                >
                                  <Pencil size={13} />
                                </button>
                                {!isCurrentSession && (
                                  <button
                                    onClick={(e) => handleDeleteSession(e, s.sessionId)}
                                    title="Delete conversation"
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
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
      </div>

      {/* Modals */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} limitType="chat" />

      {/* Incoming Call Overlay */}
      <IncomingCall
        visible={showIncomingCall}
        voicemailId={entropyVoicemailId ?? 0}
        onAnswer={handleAnswerCall}
        onDecline={handleDeclineCall}
        onDismiss={() => setShowIncomingCall(false)}
      />
    </AppShell>
  );
}
