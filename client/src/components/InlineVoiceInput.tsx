import { useState, useEffect, useCallback, useRef } from "react";
import { useVoice } from "@humeai/voice-react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square } from "lucide-react";
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
 * - Real-time transcription directly in the textarea
 * - Seamless integration with existing text input
 * - Recording status indicator
 */
export function InlineVoiceInput({ onTranscriptionUpdate, currentContent }: InlineVoiceInputProps) {
  const { connect, disconnect, status, messages: voiceMessages, isMuted, mute, unmute } = useVoice();
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const recordingStartTimeRef = useRef<number | null>(null);

  // ── Extract transcription from voice messages and update parent ────────────
  useEffect(() => {
    let fullTranscription = "";
    
    for (const msg of voiceMessages as any[]) {
      if (msg.type === "user_transcript" && msg.message?.content) {
        fullTranscription += msg.message.content + " ";
      }
    }
    
    const cleaned = fullTranscription.trim();
    
    // Update parent component with transcription (this will update the textarea)
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
      toast.success("Voice entry captured");
    } catch (error) {
      console.error("Failed to stop recording:", error);
      toast.error("Failed to stop voice recording");
    }
  }, [disconnect, mute]);

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
              Speak
            </>
          )}
        </motion.button>

        {/* Recording indicator */}
        {isRecording && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-red-500"
          />
        )}
      </div>

      {/* Audio visualization and status indicator when recording */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            {/* Audio visualization */}
            <div className="flex items-center gap-1 h-5">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: isRecording ? `${12 + audioLevel * 12}px` : "3px",
                  }}
                  transition={{
                    duration: 0.1,
                    delay: i * 0.05,
                  }}
                  className="w-0.5 bg-primary/60 rounded-full"
                />
              ))}
            </div>
            <span>Listening...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
