import { useState, useEffect, useCallback, useRef } from "react";
import { useVoice } from "@humeai/voice-react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Square } from "lucide-react";
import { toast } from "sonner";

interface InlineVoiceInputProps {
  onTranscriptionUpdate: (text: string) => void;
  currentContent: string;
}

/**
 * InlineVoiceInput Component
 * 
 * Provides voice-to-text input within the journal entry modal with:
 * - Toggle button to start/stop recording
 * - Real-time transcription display
 * - Seamless integration with existing text input
 * - Recording status indicator
 */
export function InlineVoiceInput({ onTranscriptionUpdate, currentContent }: InlineVoiceInputProps) {
  const { connect, disconnect, status, messages: voiceMessages, isMuted, mute, unmute } = useVoice();
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const recordingStartTimeRef = useRef<number | null>(null);

  // ── Extract transcription from voice messages ────────────────────────────
  useEffect(() => {
    let fullTranscription = "";
    
    for (const msg of voiceMessages as any[]) {
      if (msg.type === "user_transcript" && msg.message?.content) {
        fullTranscription += msg.message.content + " ";
      }
    }
    
    const cleaned = fullTranscription.trim();
    setTranscribedText(cleaned);
    
    // Update parent component with transcription
    if (cleaned) {
      onTranscriptionUpdate(cleaned);
    }
  }, [voiceMessages, onTranscriptionUpdate]);

  // ── Simulate audio level visualization ───────────────────────────────────
  useEffect(() => {
    if (!isRecording) {
      setAudioLevel(0);
      return;
    }

    const interval = setInterval(() => {
      setAudioLevel(prev => {
        const change = (Math.random() - 0.5) * 0.3;
        return Math.max(0, Math.min(1, prev + change));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  // ── Handle start recording ───────────────────────────────────────────────
  const handleStartRecording = useCallback(async () => {
    try {
      setTranscribedText("");
      recordingStartTimeRef.current = Date.now();
      await connect({ auth: { type: "accessToken" } as any });
      unmute();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to start voice recording");
      setIsRecording(false);
    }
  }, [connect, unmute]);

  // ── Handle stop recording ────────────────────────────────────────────────
  const handleStopRecording = useCallback(async () => {
    try {
      mute();
      await disconnect();
      setIsRecording(false);
      recordingStartTimeRef.current = null;
      
      if (transcribedText) {
        toast.success("Transcription added to your entry");
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      toast.error("Failed to stop voice recording");
    }
  }, [disconnect, mute, transcribedText]);

  const recordingDuration = recordingStartTimeRef.current 
    ? Math.floor((Date.now() - recordingStartTimeRef.current) / 1000)
    : 0;

  return (
    <div className="space-y-2">
      {/* Voice input button and status */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm ${
            isRecording
              ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          }`}
        >
          {isRecording ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Square size={14} fill="currentColor" />
              </motion.div>
              Stop Recording
            </>
          ) : (
            <>
              <Mic size={14} />
              Start Voice Input
            </>
          )}
        </motion.button>

        {/* Recording duration */}
        {isRecording && (
          <span className="text-xs text-muted-foreground font-mono">
            {recordingDuration}s
          </span>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-red-500"
          />
        )}
      </div>

      {/* Real-time transcription display */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-secondary/30 border border-primary/30 rounded-lg p-3 space-y-2"
          >
            <p className="text-xs font-medium text-muted-foreground">Listening...</p>
            
            {/* Audio visualization */}
            <div className="flex items-center gap-1 h-6">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: isRecording ? `${20 + audioLevel * 20}px` : "4px",
                  }}
                  transition={{
                    duration: 0.1,
                    delay: i * 0.05,
                  }}
                  className="w-1 bg-primary/60 rounded-full"
                />
              ))}
            </div>

            {/* Transcription text */}
            {transcribedText && (
              <div className="bg-background/50 rounded p-2 min-h-[40px]">
                <p className="text-sm text-foreground leading-relaxed">
                  {transcribedText}
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="ml-1"
                  >
                    |
                  </motion.span>
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcription preview when not recording */}
      {!isRecording && transcribedText && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-secondary/20 border border-border/40 rounded-lg p-2"
        >
          <p className="text-xs text-muted-foreground mb-1">Transcribed text:</p>
          <p className="text-sm text-foreground">{transcribedText}</p>
        </motion.div>
      )}
    </div>
  );
}
