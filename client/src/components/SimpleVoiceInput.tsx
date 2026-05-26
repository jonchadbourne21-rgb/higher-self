import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";

interface SimpleVoiceInputProps {
  onTranscriptionUpdate: (text: string) => void;
  currentContent: string;
}

/**
 * SimpleVoiceInput Component
 * 
 * Uses Web Speech API for simple, straightforward voice-to-text:
 * - Click "Speak" to start recording
 * - Real-time transcription appears in textarea
 * - Keeps listening continuously until user clicks "Stop Recording"
 * - No external dependencies, works in modern browsers
 */
export function SimpleVoiceInput({ onTranscriptionUpdate, currentContent }: SimpleVoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  // ── Initialize Web Speech API ────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
      shouldRestartRef.current = true;
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          // Add final transcript with space if needed
          setFinalTranscript(prev => {
            const newFinal = prev && !prev.endsWith(" ") ? prev + " " + transcript : (prev ? prev + transcript : transcript);
            return newFinal;
          });
        } else {
          interim += transcript;
        }
      }
      
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "no-speech") {
        toast.error(`Voice error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // If user hasn't explicitly stopped, restart listening
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch (error) {
          console.error("Failed to restart recognition:", error);
        }
      } else {
        // User explicitly stopped
        setIsRecording(false);
        const combined = finalTranscript + (interimTranscript ? " " + interimTranscript : "");
        if (combined.trim()) {
          onTranscriptionUpdate(combined.trim());
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [finalTranscript, interimTranscript, onTranscriptionUpdate]);

  // ── Update parent whenever transcription changes ──────────────────────────
  useEffect(() => {
    if (isRecording) {
      const combined = finalTranscript + (interimTranscript ? " " + interimTranscript : "");
      if (combined.trim()) {
        onTranscriptionUpdate(combined.trim());
      }
    }
  }, [finalTranscript, interimTranscript, isRecording, onTranscriptionUpdate]);

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
  const handleStartRecording = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error("Web Speech API not supported in this browser");
      return;
    }

    try {
      setFinalTranscript("");
      setInterimTranscript("");
      shouldRestartRef.current = true;
      recognitionRef.current.start();
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to start voice recording");
    }
  }, []);

  // ── Handle stop recording ────────────────────────────────────────────────
  const handleStopRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      shouldRestartRef.current = false;
      recognitionRef.current.stop();
    } catch (error) {
      console.error("Failed to stop recording:", error);
      toast.error("Failed to stop voice recording");
    }
  }, []);

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
