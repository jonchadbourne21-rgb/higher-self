import { useAuth } from "@/_core/hooks/useAuth";
import type { User } from "../../../drizzle/schema";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Send, Heart, Star, RefreshCw, X, History, ChevronRight } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasScrolledOnLoad = useRef(false);

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
    enabled: isAuthenticated && showHistory,
  });

  // Get user's seedIntent for the intention badge
  const seedIntent = (user as User | null)?.seedIntent;
  const intentInfo = seedIntent ? INTENT_CONFIG[seedIntent] : null;

  const clearMutation = trpc.chat.clearConversation.useMutation({
    onSuccess: (data) => {
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
    },
    onError: () => {
      setIsThinking(false);
      toast.error("Your mirror is momentarily quiet. Try again.");
    },
  });

  const saveInsightMutation = trpc.savedInsights.save.useMutation({
    onSuccess: (_, vars) => {
      const emoji = vars.reactionType === "heart" ? "💜" : "⭐";
      toast.success(`${emoji} Saved to your insights`);
    },
    onError: () => toast.error("Couldn't save insight. Try again."),
  });

  const [reactions, setReactions] = useState<Record<string, "heart" | "star">>({});

  const handleReaction = (msg: ChatMessage, type: "heart" | "star") => {
    if (reactions[msg.id] === type) {
      setReactions((prev) => { const n = { ...prev }; delete n[msg.id]; return n; });
      return;
    }
    setReactions((prev) => ({ ...prev, [msg.id]: type }));
    saveInsightMutation.mutate({
      chatMessageId: msg.dbId,
      content: msg.content,
      reactionType: type,
    });
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

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
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages, isThinking]);

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
    sendMutation.mutate({ message: msg, sessionId });
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

  return (
    <AppShell noScroll>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-5 pt-8 pb-3 flex items-center justify-between border-b border-border/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center glow-gold flex-shrink-0">
              <span className="text-lg">✦</span>
            </div>
            <div>
              <h1 className="text-base font-medium text-foreground">Your Mirror</h1>
              {intentInfo ? (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5"
                  style={{
                    background: `${intentInfo.color}22`,
                    color: intentInfo.color,
                    border: `1px solid ${intentInfo.color}44`,
                  }}
                >
                  ✦ {intentInfo.label} Mode
                </span>
              ) : (
                <p className="text-xs text-muted-foreground">Always present, always honest</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Past conversations button */}
            <button
              onClick={() => setShowHistory(true)}
              title="Past conversations"
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground border border-border/40 hover:border-primary/30 hover:text-primary transition-all"
            >
              <History className="w-3.5 h-3.5" />
            </button>
            {/* New conversation button */}
            <button
              onClick={() => setShowClearConfirm(true)}
              title="Start a fresh conversation"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground border border-border/40 hover:border-primary/30 hover:text-primary transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        </div>

        {/* Past session banner */}
        <AnimatePresence>
          {isViewingPast && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex-shrink-0"
            >
              <div className="px-4 py-2 flex items-center justify-between"
                style={{ background: "oklch(0.46 0.20 295 / 0.08)", borderBottom: "1px solid oklch(0.46 0.20 295 / 0.15)" }}>
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
                    onClick={() => clearMutation.mutate()}
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
              onClick={() => setShowHistory(false)}
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
                    <p className="text-xs text-muted-foreground mt-0.5">Tap a session to read it</p>
                  </div>
                  <button
                    onClick={() => setShowHistory(false)}
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
                      {sessions.map((s, i) => {
                        const isCurrentSession = s.sessionId === sessionId;
                        return (
                          <button
                            key={s.sessionId ?? "legacy"}
                            onClick={() => handleSelectSession(s.sessionId)}
                            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-muted/40 transition-all text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {formatSessionDate(s.lastMessage)}
                                </span>
                                {isCurrentSession && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                    style={{ background: "oklch(0.46 0.20 295 / 0.12)", color: "oklch(0.46 0.20 295)" }}>
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {s.messageCount} message{s.messageCount !== 1 ? "s" : ""}
                                {s.firstMessage && s.lastMessage && s.firstMessage.toDateString() !== s.lastMessage.toDateString()
                                  ? ` · ${formatSessionDate(s.firstMessage)} – ${formatSessionDate(s.lastMessage)}`
                                  : s.firstMessage
                                  ? ` · ${s.firstMessage.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`
                                  : ""}
                              </p>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0 ml-2" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide pb-4">
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
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} group`}
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
                        ? "bg-primary text-primary-foreground rounded-br-lg"
                        : "glass rounded-bl-lg"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="streamdown-content text-sm leading-relaxed">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                  {/* Reaction buttons — only for assistant messages in live view */}
                  {msg.role === "assistant" && !isViewingPast && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-1 pl-1"
                      >
                        <button
                          onClick={() => handleReaction(msg, "heart")}
                          title="Save as emotional insight"
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                            reactions[msg.id] === "heart"
                              ? "bg-pink-500/20 text-pink-400 border border-pink-400/40"
                              : "text-muted-foreground/50 hover:text-pink-400 hover:bg-pink-500/10"
                          }`}
                        >
                          <Heart className="w-3 h-3" fill={reactions[msg.id] === "heart" ? "currentColor" : "none"} />
                          {reactions[msg.id] === "heart" && <span>Saved</span>}
                        </button>
                        <button
                          onClick={() => handleReaction(msg, "star")}
                          title="Save as actionable insight"
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                            reactions[msg.id] === "star"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-400/40"
                              : "text-muted-foreground/50 hover:text-amber-400 hover:bg-amber-500/10"
                          }`}
                        >
                          <Star className="w-3 h-3" fill={reactions[msg.id] === "star" ? "currentColor" : "none"} />
                          {reactions[msg.id] === "star" && <span>Saved</span>}
                        </button>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            </div>
          ))}

          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
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
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

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
          ) : (
            <div className="flex gap-2 items-end">
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
    </AppShell>
  );
}
