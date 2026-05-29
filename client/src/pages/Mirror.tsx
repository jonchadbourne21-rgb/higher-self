import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { MessageCircle, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useVoice } from "@humeai/voice-react";
import { Streamdown } from "streamdown";
import { Send } from "lucide-react";
import { UpgradeModal } from "@/components/UpgradeModal";

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

function GlowingOrb({ 
  status, 
  isMuted,
  audioLevel = 0 
}: { 
  status: { value: 'connecting' | 'connected' | 'disconnected'; reason?: never } | { value: 'error'; reason: string }; 
  isMuted: boolean;
  audioLevel?: number;
}) {
  const isActive = status.value === "connected";
  const isListening = isActive && !isMuted;
  const hasAudio = audioLevel > 0.02;
  
  // Memoize animation values to prevent framer-motion from restarting animations
  // when parent re-renders with the same logical state
  const ringAnimation = useMemo(() => ({
    scale: [1, 1.4],
    opacity: [0.5, 0],
  }), []);
  
  const ringTransitions = useMemo(() => ([
    { duration: 2.0, repeat: Infinity, ease: "easeOut" as const },
    { duration: 2.5, repeat: Infinity, ease: "easeOut" as const, delay: 0.3 },
    { duration: 3.0, repeat: Infinity, ease: "easeOut" as const, delay: 0.6 },
  ]), []);

  return (
    <div className="flex justify-center mb-8">
      <div className="relative w-32 h-32">
        {/* Pulsing rings — only shown when connected and not muted.
            Use fixed animation values so framer-motion doesn't restart on every render. */}
        {isActive && isListening && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border border-cyan-400/30"
              animate={ringAnimation}
              transition={ringTransitions[0]}
            />
            <motion.div
              className="absolute inset-2 rounded-full border border-cyan-400/20"
              animate={ringAnimation}
              transition={ringTransitions[1]}
            />
            <motion.div
              className="absolute inset-4 rounded-full border border-cyan-400/10"
              animate={ringAnimation}
              transition={ringTransitions[2]}
            />
          </>
        )}

        {/* Main orb — scale reacts to audio level via CSS transform for zero-rerender updates */}
        <motion.div
          className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-2xl"
          style={{
            transform: `scale(${hasAudio && isListening ? 1 + audioLevel * 0.08 : 1})`,
          }}
          animate={{
            boxShadow: isListening
              ? "0 0 40px rgba(34, 211, 238, 0.8), 0 0 80px rgba(34, 211, 238, 0.4)"
              : "0 0 20px rgba(34, 211, 238, 0.5), 0 0 40px rgba(34, 211, 238, 0.2)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="w-full h-full rounded-full flex items-center justify-center">
            {status.value === "connecting" && <div className="animate-spin text-white text-2xl">◐</div>}
            {status.value === "connected" && isMuted && <MicOff className="text-white" size={32} />}
            {status.value === "connected" && !isMuted && <Mic className="text-white" size={32} />}
            {status.value === "disconnected" && <Mic className="text-white/50" size={32} />}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

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

  // Voice state — use SDK's built-in fft for real audio visualization
  const { connect, disconnect, messages: voiceMessages, isMuted, status, micFft } = useVoice();
  const [voiceGender, setVoiceGender] = useState<"male" | "female">("female");
  const voiceEndRef = useRef<HTMLDivElement>(null);

  // Derive audio level from SDK's micFft (array of frequency magnitudes 0-1)
  // Using useMemo to avoid recalculating on unrelated renders
  const audioLevel = useMemo(() => {
    if (!micFft || micFft.length === 0) return 0;
    // RMS of first 8 frequency bins gives a smooth energy reading
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

  // No manual setInterval decay or message-based audio level needed —
  // audioLevel is now derived directly from the SDK's real-time micFft data above.

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
      // Get API key and config from server
      const { apiKey, configId } = await mintTokenMut.mutateAsync();

      // Create a DB session
      await createSessionMut.mutateAsync();

      // Connect using Hume SDK
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
      <div className="flex flex-col h-full bg-background">
        {/* Mode tabs */}
        <div className="flex gap-4 px-4 py-4 border-b border-border">
          <button
            onClick={() => setMode("chat")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              mode === "chat"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle size={18} />
            Chat
          </button>
          <button
            onClick={() => setMode("voice")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              mode === "voice"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mic size={18} />
            Voice
          </button>
        </div>

        {/* Chat mode */}
        {mode === "chat" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MessageCircle className="text-primary" size={32} />
                  </div>
                  <p className="text-muted-foreground mb-6">Start a conversation with your Mirror</p>
                  <div className="space-y-2 w-full max-w-xs">
                    {STARTER_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setUserInput(prompt);
                        }}
                        className="w-full p-3 rounded-lg bg-secondary hover:bg-secondary/80 text-left text-sm transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <Streamdown>{msg.content}</Streamdown>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoadingChat && (
                    <div className="flex justify-start">
                      <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Chat input */}
            <div className="border-t border-border p-4 space-y-3 pb-20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder="Ask your Mirror..."
                  className="flex-1 px-4 py-2 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleSendChat}
                  disabled={isLoadingChat}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Voice mode */}
        {mode === "voice" && (
          <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-4 pb-20">
            {status.value === "disconnected" ? (
              <>
                <GlowingOrb status={status} isMuted={isMuted} audioLevel={audioLevel} />
                
                <div className="flex gap-4 mb-8">
                  <button
                    onClick={() => setVoiceGender("female")}
                    className={`px-6 py-3 rounded-full font-medium transition-colors ${
                      voiceGender === "female"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    ♀ Female
                  </button>
                  <button
                    onClick={() => setVoiceGender("male")}
                    className={`px-6 py-3 rounded-full font-medium transition-colors ${
                      voiceGender === "male"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    ♂ Male
                  </button>
                </div>

                <button
                  onClick={handleStartVoice}
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover:bg-primary/90 transition-colors"
                >
                  Start Session
                </button>
              </>
            ) : (
              <>
                <GlowingOrb status={status} isMuted={isMuted} audioLevel={audioLevel} />

                {/* Transcription display */}
                {voiceMessages.length > 0 && (
                  <div className="mt-8 w-full max-w-2xl max-h-80 overflow-y-auto space-y-3 px-2 rounded-lg border border-border/50 bg-background/50 p-4">
                    <AnimatePresence mode="popLayout">
                      {voiceMessages.map((msg: any, idx: number) => {
                        let content = '';
                        let role = 'assistant';
                        let messageType = '';
                        let isPartial = false;
                        
                        // Handle different message types from Hume SDK
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
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={`flex ${
                              role === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-sm px-4 py-3 rounded-lg transition-all ${
                                role === "user"
                                  ? `bg-primary text-primary-foreground ${
                                      isPartial ? "opacity-70" : ""
                                    }`
                                  : "bg-secondary text-secondary-foreground"
                              }`}
                            >
                              {/* Message type indicator */}
                              {messageType === 'transcript' && (
                                <div className="flex items-center gap-1 mb-1 text-xs opacity-75">
                                  <Mic size={12} />
                                  <span>{isPartial ? "Listening..." : "Transcribed"}</span>
                                </div>
                              )}
                              
                              {/* Message content */}
                              {role === "assistant" ? (
                                <Streamdown>{content}</Streamdown>
                              ) : (
                                <p className="text-sm leading-relaxed">{content}</p>
                              )}
                              
                              {/* Partial indicator */}
                              {isPartial && (
                                <motion.div
                                  className="mt-1 text-xs opacity-60"
                                  animate={{ opacity: [0.6, 1, 0.6] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                  ●
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <div ref={voiceEndRef} />
                  </div>
                )}

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={handleEndVoice}
                    className="px-6 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2"
                  >
                    <PhoneOff size={18} />
                    End Session
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} limitType="chat" />
    </AppShell>
  );
}
