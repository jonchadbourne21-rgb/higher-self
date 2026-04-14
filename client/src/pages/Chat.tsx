import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Send, Heart, Star, BookOpen } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const STARTER_PROMPTS = [
  "What patterns do you see in my life right now?",
  "What am I avoiding that I need to face?",
  "How can I find more peace today?",
  "What belief is holding me back most?",
  "Help me understand a difficult emotion I'm feeling",
];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  id: string;
  createdAt?: Date;
  dbId?: number; // the database ID for assistant messages
};

/** Returns true if currentMsg was sent 60+ minutes after prevMsg */
function shouldShowTimestamp(prev: ChatMessage, current: ChatMessage): boolean {
  if (!prev.createdAt || !current.createdAt) return false;
  const diffMs = current.createdAt.getTime() - prev.createdAt.getTime();
  return diffMs >= 60 * 60 * 1000; // 1 hour in ms
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

export default function Chat() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasScrolledOnLoad = useRef(false);

  const { data: history } = trpc.chat.history.useQuery(undefined, {
    enabled: isAuthenticated,
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

  // Track which messages have been reacted to (msgId -> reactionType)
  const [reactions, setReactions] = useState<Record<string, "heart" | "star">>({}); 

  const handleReaction = (msg: ChatMessage, type: "heart" | "star") => {
    // Toggle off if same reaction
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

  // Auto-scroll to bottom on initial history load (instant, not animated)
  useEffect(() => {
    if (history && history.length > 0 && !hasScrolledOnLoad.current) {
      hasScrolledOnLoad.current = true;
      // Use a short timeout to allow the DOM to render before scrolling
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
  const allMessages: ChatMessage[] = [
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

  const handleSend = () => {
    if (!input.trim() || isThinking) return;
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
    sendMutation.mutate({ message: msg });
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

  return (
    <AppShell>
      <div className="flex flex-col h-screen max-h-screen">
        {/* Header */}
        <div className="px-5 pt-8 pb-4 flex items-center justify-between border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center glow-gold">
              <span className="text-lg">✦</span>
            </div>
            <div>
              <h1 className="text-base font-medium text-foreground">Your Higher Self</h1>
              <p className="text-xs text-muted-foreground">Always present, always honest</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/saved-insights")}
            title="View saved insights"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground border border-border/40 hover:border-primary/30 hover:text-primary transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Saved
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide pb-4">
          {allMessages.length === 0 && !isThinking && (
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
                  {/* Reaction buttons — only for assistant messages */}
                  {msg.role === "assistant" && (
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

        {/* Input */}
        <div className="px-4 pb-24 pt-2 border-t border-border/30">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Speak to your Higher Self..."
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
        </div>
      </div>
    </AppShell>
  );
}
