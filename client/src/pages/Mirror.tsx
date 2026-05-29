import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { MessageCircle, Mic, MicOff, PhoneOff, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useVoice } from "@humeai/voice-react";
import { Streamdown } from "streamdown";
import { Send } from "lucide-react";
import { UpgradeModal } from "@/components/UpgradeModal";
import { VoiceVisualization } from "@/components/VoiceVisualization";

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

export default function Mirror() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"chat" | "voice">("chat");
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice state
  const { connect, disconnect, messages: voiceMessages, isMuted, status, micFft } = useVoice();
  const [voiceGender, setVoiceGender] = useState<"male" | "female">("female");
  const voiceEndRef = useRef<HTMLDivElement>(null);

  // Derive audio level from SDK's micFft
  const audioLevel = useMemo(() => {
    if (!micFft || micFft.length === 0) return 0;
    const bins = micFft.slice(0, Math.min(8, micFft.length));
    const sum = bins.reduce((acc, v) => acc + v * v, 0);
    return Math.min(1, Math.sqrt(sum / bins.length) * 2);
  }, [micFft]);

  // Chat queries
  const sendChatMutation = trpc.chat.send.useMutation();

  // Voice queries
  const mintTokenMut = trpc.voice.mintToken.useMutation();
  const createSessionMut = trpc.voice.createSession.useMutation();

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-scroll voice
  useEffect(() => {
    voiceEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [voiceMessages]);

  // Send chat message
  const handleSendChat = useCallback(async () => {
    if (!userInput.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: userInput,
      id: `msg-${Date.now()}`,
      createdAt: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsLoadingChat(true);

    try {
      const response = await sendChatMutation.mutateAsync({
        message: userInput,
        sessionId: null,
        voiceMode: false,
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.response,
        id: `msg-${Date.now() + 1}`,
        createdAt: new Date(),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      if (error.message.includes("Daily chat limit reached")) {
        setShowUpgradeModal(true);
      } else {
        toast.error("Failed to send message");
      }
    } finally {
      setIsLoadingChat(false);
    }
  }, [userInput, sendChatMutation]);

  // Start voice session
  const handleStartVoice = useCallback(async () => {
    try {
      const { apiKey, configId } = await mintTokenMut.mutateAsync();
      await createSessionMut.mutateAsync();

      const connectOptions = {
        auth: { type: "apiKey" as const, value: apiKey },
        hostname: "api.hume.ai",
        configId,
      };

      await connect(connectOptions);
      toast.success("Voice session started");
    } catch (error) {
      toast.error("Failed to start voice session");
    }
  }, [connect, mintTokenMut, createSessionMut]);

  // End voice session
  const handleEndVoice = useCallback(async () => {
    try {
      await disconnect();
      toast.success("Voice session ended");
    } catch (error) {
      toast.error("Failed to end voice session");
    }
  }, [disconnect]);

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
    <AppShell>
      <div className="flex flex-col h-full">
        {/* ─── Header: Mode Switcher ─────────────────────────────────── */}
        <div className="flex items-center justify-center px-4 py-3 border-b border-border/50 bg-card/30 backdrop-blur-sm">
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
        </div>

        {/* ─── Chat Mode ─────────────────────────────────────────────── */}
        {mode === "chat" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-6">
                {chatMessages.length === 0 ? (
                  /* ─── Empty State ─── */
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    {/* Subtle mirror icon */}
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

                    {/* Starter prompts */}
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
                            <motion.div
                              className="w-2 h-2 bg-primary/60 rounded-full"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                            />
                            <motion.div
                              className="w-2 h-2 bg-primary/60 rounded-full"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                            />
                            <motion.div
                              className="w-2 h-2 bg-primary/60 rounded-full"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                            />
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
            <div className="border-t border-border/30 bg-card/20 backdrop-blur-sm px-4 py-3 pb-20">
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
          </div>
        )}

        {/* ─── Voice Mode ────────────────────────────────────────────── */}
        {mode === "voice" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {status.value === "disconnected" ? (
              /* ─── Voice: Pre-session (idle) ─── */
              <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
                {/* Visualization */}
                <div className="mb-8">
                  <VoiceVisualization status={status} isMuted={isMuted} audioLevel={audioLevel} micFft={micFft} />
                </div>

                {/* Voice selection */}
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

                {/* Start button */}
                <motion.button
                  onClick={handleStartVoice}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3.5 bg-primary text-primary-foreground rounded-full font-medium text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow duration-200"
                >
                  Begin Session
                </motion.button>

                <p className="mt-4 text-xs text-muted-foreground/60">
                  Speak freely — your Mirror is listening
                </p>
              </div>
            ) : (
              /* ─── Voice: Active session ─── */
              <div className="flex-1 flex flex-col items-center px-4 pt-6 pb-20 overflow-hidden">
                {/* Visualization — stays compact at top */}
                <div className="shrink-0 mb-4">
                  <VoiceVisualization status={status} isMuted={isMuted} audioLevel={audioLevel} micFft={micFft} />
                </div>

                {/* Transcription area — scrollable */}
                {voiceMessages.length > 0 && (
                  <div className="flex-1 w-full max-w-xl overflow-y-auto rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3">
                    <AnimatePresence mode="popLayout">
                      {voiceMessages.map((msg: any, idx: number) => {
                        let content = '';
                        let role = 'assistant';
                        let messageType = '';
                        let isPartial = false;
                        
                        if (msg.type === 'user_transcript') {
                          content = msg.message?.content || '';
                          role = 'user';
                          messageType = 'transcript';
                          isPartial = msg.message?.isFinal === false;
                        } else if (msg.type === 'assistant_message') {
                          content = msg.message?.content || '';
                          role = 'assistant';
                          messageType = 'message';
                        } else if (msg.type === 'user_message') {
                          content = msg.message?.content || '';
                          role = 'user';
                          messageType = 'message';
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
                              className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${
                                role === "user"
                                  ? `bg-primary text-primary-foreground rounded-2xl rounded-br-md ${isPartial ? "opacity-60" : ""}`
                                  : "bg-card border border-border/30 text-card-foreground rounded-2xl rounded-bl-md"
                              }`}
                            >
                              {messageType === 'transcript' && isPartial && (
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

                {/* End session button — fixed at bottom */}
                <div className="shrink-0 mt-4 flex items-center gap-3">
                  <motion.button
                    onClick={handleEndVoice}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-5 py-2.5 rounded-full text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15 hover:border-red-500/30 transition-all duration-200 flex items-center gap-2"
                  >
                    <PhoneOff size={14} />
                    End Session
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} limitType="chat" />
    </AppShell>
  );
}
