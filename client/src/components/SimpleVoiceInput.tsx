import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, RotateCcw } from "lucide-react";
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
 * - Shows recording duration timer
 * - Clear button to reset transcription
 * - No external dependencies, works in modern browsers
 */
export function SimpleVoiceInput({ onTranscriptionUpdate, currentContent }: SimpleVoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      recordingStartTimeRef.current = Date.now();
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
        recordingStartTimeRef.current = null;
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
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
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
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

  // ── Recording duration timer ─────────────────────────────────────────────
  useEffect(() => {
    if (!isRecording) {
      setRecordingDuration(0);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      if (recordingStartTimeRef.current) {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
      }
    }, 100);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isRecording]);

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

  // ── Format duration as MM:SS ─────────────────────────────────────────────
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ── Handle start recording ───────────────────────────────────────────────
  const handleStartRecording = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error("Web Speech API not supported in this browser");
      return;
    }

    try {
      setFinalTranscript("");
      setInterimTranscript("");
      setRecordingDuration(0);
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

  // ── Handle clear transcription ───────────────────────────────────────────
  const handleClear = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
    onTranscriptionUpdate("");
    toast.success("Transcription cleared");
  }, [onTranscriptionUpdate]);

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

        {/* Recording duration timer */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="text-xs font-mono text-muted-foreground"
            >
              {formatDuration(recordingDuration)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear button - show when there's transcription */}
        <AnimatePresence>
          {(finalTranscript || interimTranscript) && !isRecording && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClear}
              className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Clear transcription"
            >
              <RotateCcw size={14} />
            </motion.button>
          )}
        </AnimatePresence>
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
