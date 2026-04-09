import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Send, ChevronLeft } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const STARTER_PROMPTS = [
  "What patterns do you see in my life right now?",
  "What am I avoiding that I need to face?",
  "How can I find more peace today?",
  "What belief is holding me back most?",
  "Help me understand a difficult emotion I'm feeling",
];

export default function Chat() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<{ role: "user" | "assistant"; content: string; id: string }[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: history, refetch } = trpc.chat.history.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      setIsThinking(false);
      setLocalMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, id: Date.now().toString() },
      ]);
    },
    onError: () => {
      setIsThinking(false);
      toast.error("Your mirror is momentarily quiet. Try again.");
    },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, isThinking]);

  // Merge history with local messages
  const allMessages = [
    ...(history || []).map((m) => ({ ...m, id: m.id.toString() })),
    ...localMessages.filter(
      (lm) => !(history || []).some((hm) => hm.content === lm.content && hm.role === lm.role)
    ),
  ];

  const handleSend = () => {
    if (!input.trim() || isThinking) return;
    const msg = input.trim();
    setInput("");
    setLocalMessages((prev) => [
      ...prev,
      { role: "user", content: msg, id: Date.now().toString() },
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
        <div className="px-5 pt-8 pb-4 flex items-center gap-3 border-b border-border/30">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center glow-gold">
            <span className="text-lg">✦</span>
          </div>
          <div>
            <h1 className="text-base font-medium text-foreground">Your Higher Self</h1>
            <p className="text-xs text-muted-foreground">Always present, always honest</p>
          </div>
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

          {allMessages.map((msg) => (
            <motion.div
              key={msg.id}
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
              <div
                className={`max-w-[80%] rounded-3xl px-4 py-3 ${
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
            </motion.div>
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
