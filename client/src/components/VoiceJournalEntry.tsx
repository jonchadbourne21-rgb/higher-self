import { useState, useRef, useEffect, useCallback } from "react";
import { useVoice } from "@humeai/voice-react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceJournalEntryProps {
  onTranscriptionComplete: (text: string) => void;
  onClose: () => void;
}

/**
 * VoiceJournalEntry Component
 * 
 * Provides voice-to-text capture for journal entries with:
 * - Real-time transcription display
 * - Inline editing capability
 * - Visual recording indicators
 * - Automatic text submission
 */
export function VoiceJournalEntry({ onTranscriptionComplete, onClose }: VoiceJournalEntryProps) {
  const { connect, disconnect, status, messages: voiceMessages, isMuted, mute, unmute } = useVoice();
  
  // ── Transcription state ──────────────────────────────────────────────────
  const [transcribedText, setTranscribedText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const textEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // ── Auto-scroll to latest transcription ──────────────────────────────────
  useEffect(() => {
    if (textEndRef.current) {
      textEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcribedText]);

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
    setEditedText(cleaned);
  }, [voiceMessages]);

  // ── Simulate audio level visualization ───────────────────────────────────
  useEffect(() => {
    if ((status as any).value !== "connected") {
      setAudioLevel(0);
      return;
    }

    const interval = setInterval(() => {
      // Simulate audio level with random fluctuation
      setAudioLevel(prev => {
        const change = (Math.random() - 0.5) * 0.3;
        return Math.max(0, Math.min(1, prev + change));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [(status as any).value]);

  // ── Handle start recording ───────────────────────────────────────────────
  const handleStartRecording = useCallback(async () => {
    try {
      setTranscribedText("");
      setEditedText("");
      await connect({ auth: { type: "accessToken" } as any });
      unmute();
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to start voice recording");
    }
  }, [connect, unmute]);

  // ── Handle stop recording ────────────────────────────────────────────────
  const handleStopRecording = useCallback(async () => {
    try {
      mute();
      await disconnect();
    } catch (error) {
      console.error("Failed to stop recording:", error);
      toast.error("Failed to stop voice recording");
    }
  }, [disconnect, mute]);

  // ── Handle submit transcription ──────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const finalText = isEditing ? editedText : transcribedText;
    
    if (!finalText.trim()) {
      toast.error("Please record or type some text");
      return;
    }

    onTranscriptionComplete(finalText);
    toast.success("Transcription saved to journal entry");
  }, [transcribedText, editedText, isEditing, onTranscriptionComplete]);

  // ── Handle edit mode toggle ──────────────────────────────────────────────
  const handleEditToggle = useCallback(() => {
    if (!isEditing) {
      setEditedText(transcribedText);
    }
    setIsEditing(!isEditing);
  }, [isEditing, transcribedText]);

  const isRecording = (status as any).value === "connected";
  const hasTranscription = transcribedText.length > 0;

  return (
    <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-sm flex flex-col max-w-[480px] mx-auto">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-2">
          <Mic size={20} className="text-primary" />
          <h2 className="text-lg font-serif">Speak Your Entry</h2>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-hide flex flex-col">
        
        {/* Recording indicator */}
        <div className="flex flex-col items-center space-y-4">
          {/* Audio visualization orb */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <motion.div
              animate={{
                scale: isRecording ? 1 + audioLevel * 0.4 : 1,
                opacity: isRecording ? 0.6 + audioLevel * 0.4 : 0.3,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 rounded-full bg-primary/20"
            />
            <motion.div
              animate={{
                scale: isRecording ? 1 + audioLevel * 0.2 : 1,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-2 rounded-full bg-primary/40"
            />
            <div className="relative w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              {isRecording ? (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-6 h-6 bg-white rounded-full"
                />
              ) : (
                <Mic size={24} className="text-white" />
              )}
            </div>
          </div>

          {/* Status text */}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isRecording ? "Listening..." : "Ready to record"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isRecording ? "Speak naturally, we're capturing every word" : "Click the button below to start"}
            </p>
          </div>
        </div>

        {/* Transcription display */}
        {hasTranscription && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Transcription</p>
              <button
                onClick={handleEditToggle}
                disabled={isRecording}
                className="text-xs text-primary hover:text-primary/80 disabled:opacity-40 transition-colors"
              >
                {isEditing ? "Done editing" : "Edit"}
              </button>
            </div>

            {isEditing ? (
              <textarea
                ref={editInputRef}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm leading-relaxed resize-none min-h-[120px] p-3 rounded-lg border border-border/50 focus:border-primary transition-colors"
                placeholder="Edit your transcription here..."
                autoFocus
              />
            ) : (
              <div className="bg-secondary/50 text-foreground text-sm leading-relaxed p-3 rounded-lg border border-border/50 min-h-[120px] max-h-[200px] overflow-y-auto">
                {transcribedText}
              </div>
            )}

            {/* Character count */}
            <p className="text-xs text-muted-foreground text-right">
              {(isEditing ? editedText : transcribedText).length} characters
            </p>
          </motion.div>
        )}

        {/* Recording tips */}
        {!hasTranscription && !isRecording && (
          <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-medium text-foreground">Tips for best results:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Speak clearly and naturally</li>
              <li>• Pause between thoughts</li>
              <li>• You can edit the text afterward</li>
            </ul>
          </div>
        )}

        <div ref={textEndRef} />
      </div>

      {/* Footer with controls */}
      <div className="px-5 pb-6 pt-4 border-t border-border/30 space-y-3 bg-background" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-2">
          {/* Record/Stop button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`flex-1 py-3 px-4 rounded-full font-semibold transition-all flex items-center justify-center gap-2 ${
              isRecording
                ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isRecording ? (
              <>
                <MicOff size={18} />
                Stop Recording
              </>
            ) : (
              <>
                <Mic size={18} />
                Start Recording
              </>
            )}
          </motion.button>

          {/* Mute toggle */}
          {isRecording && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={isMuted ? unmute : mute}
              className="px-4 py-3 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </motion.button>
          )}
        </div>

        {/* Submit button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!hasTranscription || isRecording}
          className="w-full py-3 px-4 rounded-full font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Volume2 size={16} className="inline mr-2" />
          Use This Text
        </motion.button>

        <p className="text-center text-xs text-muted-foreground">
          {isRecording ? "Recording in progress..." : "Your transcription will appear above"}
        </p>
      </div>
    </div>
  );
}
