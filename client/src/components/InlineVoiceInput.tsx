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
  const [fullTranscription, setFullTranscription] = useState("");
  const recordingStartTimeRef = useRef<number | null>(null);
  const previousMessagesLengthRef = useRef(0);

  // ── Extract and accumulate transcription from voice messages ──────────────
  useEffect(() => {
    if (!voiceMessages || voiceMessages.length === 0) return;

    // Only process new messages since last check
    const newMessages = voiceMessages.slice(previousMessagesLengthRef.current);
    previousMessagesLengthRef.current = voiceMessages.length;

    let accumulatedText = fullTranscription;

    for (const msg of newMessages as any[]) {
      // Extract user transcript messages
      if (msg.type === "user_transcript" && msg.message?.content) {
        const content = msg.message.content;
        const isFinal = msg.message.isFinal === true;
        
        // Only add final transcriptions to avoid duplicates
        if (isFinal) {
          // Add space between transcriptions if needed
          if (accumulatedText && !accumulatedText.endsWith(" ")) {
            accumulatedText += " ";
          }
          accumulatedText += content;
        }
      }
    }

    // Update state and notify parent
    if (accumulatedText !== fullTranscription) {
      setFullTranscription(accumulatedText);
      onTranscriptionUpdate(accumulatedText);
    }
  }, [voiceMessages, fullTranscription, onTranscriptionUpdate]);

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
      // Reset transcription for new recording
      setFullTranscription("");
      previousMessagesLengthRef.current = 0;
      
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
      
      // Show success message only if we have transcription
      if (fullTranscription.trim()) {
        toast.success("Voice entry captured");
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      toast.error("Failed to stop voice recording");
    }
  }, [disconnect, mute, fullTranscription]);

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
