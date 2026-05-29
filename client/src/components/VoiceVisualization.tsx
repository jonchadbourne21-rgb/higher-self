/**
 * VoiceVisualization — "The Inner Eye"
 * 
 * An organic, breathing iris/portal visualization that represents the Mirror
 * feature's core purpose: looking inward and being truly heard.
 * 
 * When idle: gently breathes like a meditation.
 * When listening: rings expand/contract with real micFft frequency data.
 * Below: a frequency bar waveform shows raw audio energy.
 * 
 * Design language: teal primary + purple accents on midnight background.
 * Uses CSS transforms and memoized framer-motion values to avoid re-render glitches.
 */

import { useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

type VoiceStatusObject = 
  | { value: 'connecting' | 'connected' | 'disconnected'; reason?: never }
  | { value: 'error'; reason: string };

// Simple string status used by Voice.tsx ("idle" | "connecting" | "live" | "ended" | "error")
type VoiceStatusString = string;

type VoiceStatus = VoiceStatusObject | VoiceStatusString;

interface VoiceVisualizationProps {
  status: VoiceStatus;
  isMuted: boolean;
  audioLevel: number;
  micFft: number[];
}

// ── Frequency Bar Waveform ──────────────────────────────────────────────────
function FrequencyBars({ micFft, isActive }: { micFft: number[]; isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const smoothedRef = useRef<number[]>(new Array(32).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const barCount = 32;
      const barWidth = (W / barCount) * 0.7;
      const gap = (W / barCount) * 0.3;

      // Smooth the FFT data for fluid animation
      const fftData = micFft.length > 0 ? micFft : new Array(barCount).fill(0);
      const step = Math.max(1, Math.floor(fftData.length / barCount));

      for (let i = 0; i < barCount; i++) {
        const rawValue = fftData[Math.min(i * step, fftData.length - 1)] || 0;
        // Exponential smoothing for fluid decay
        smoothedRef.current[i] += (rawValue - smoothedRef.current[i]) * 0.3;
        const value = smoothedRef.current[i];

        const barHeight = Math.max(2, value * H * 0.85);
        const x = i * (barWidth + gap) + gap / 2;
        const y = (H - barHeight) / 2; // Center vertically

        // Gradient from teal (low freq) to purple (high freq)
        const hue = 185 + (i / barCount) * 105; // 185 (teal) → 290 (purple)
        const lightness = 0.55 + value * 0.15;
        const chroma = 0.12 + value * 0.06;
        const alpha = isActive ? 0.6 + value * 0.4 : 0.2;

        ctx.fillStyle = `oklch(${lightness} ${chroma} ${hue} / ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [micFft, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={256}
      height={40}
      className="w-64 h-10 opacity-90"
      style={{ imageRendering: "auto" }}
    />
  );
}

// ── Normalize status from either object or string format ────────────────────
function normalizeStatus(status: VoiceStatus): { isActive: boolean; isConnecting: boolean; isDisconnected: boolean } {
  if (typeof status === "string") {
    // Voice.tsx uses: "idle" | "connecting" | "live" | "ended" | "error"
    return {
      isActive: status === "live",
      isConnecting: status === "connecting",
      isDisconnected: status === "idle" || status === "ended" || status === "error",
    };
  }
  // Mirror.tsx uses: { value: "connected" | "connecting" | "disconnected" }
  return {
    isActive: status.value === "connected",
    isConnecting: status.value === "connecting",
    isDisconnected: status.value === "disconnected",
  };
}

// ── Main Visualization: The Inner Eye ───────────────────────────────────────
export function VoiceVisualization({ status, isMuted, audioLevel, micFft }: VoiceVisualizationProps) {
  const { isActive, isConnecting, isDisconnected } = normalizeStatus(status);
  const isListening = isActive && !isMuted;

  // Derive per-ring energy from different frequency bands
  const ringEnergies = useMemo(() => {
    if (!micFft || micFft.length === 0) return [0, 0, 0, 0, 0];
    const len = micFft.length;
    const bands = [
      micFft.slice(0, Math.floor(len * 0.1)),           // Sub-bass
      micFft.slice(Math.floor(len * 0.1), Math.floor(len * 0.25)),  // Bass
      micFft.slice(Math.floor(len * 0.25), Math.floor(len * 0.5)),  // Mid
      micFft.slice(Math.floor(len * 0.5), Math.floor(len * 0.75)),  // Upper-mid
      micFft.slice(Math.floor(len * 0.75)),             // Treble
    ];
    return bands.map(band => {
      if (band.length === 0) return 0;
      const sum = band.reduce((a, v) => a + v * v, 0);
      return Math.min(1, Math.sqrt(sum / band.length) * 2.5);
    });
  }, [micFft]);

  // Memoize breathing animation for idle state
  const breatheAnimation = useMemo(() => ({
    scale: [1, 1.03, 1],
    opacity: [0.6, 0.8, 0.6],
  }), []);

  const breatheTransition = useMemo(() => ({
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut" as const,
  }), []);

  // Ring colors: teal core → purple outer (matching app palette)
  const ringColors = useMemo(() => [
    "oklch(0.65 0.16 185 / 0.9)",   // Vibrant teal (core)
    "oklch(0.58 0.14 200 / 0.7)",   // Teal-blue
    "oklch(0.52 0.12 230 / 0.5)",   // Blue-purple
    "oklch(0.48 0.12 260 / 0.35)",  // Purple
    "oklch(0.45 0.10 290 / 0.2)",   // Deep purple (outer)
  ], []);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* The Inner Eye — concentric organic rings */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        
        {/* Outer ambient glow */}
        <div
          className="absolute inset-0 rounded-full blur-xl transition-opacity duration-700"
          style={{
            background: isListening
              ? `radial-gradient(circle, oklch(0.65 0.16 185 / ${0.15 + audioLevel * 0.2}) 0%, transparent 70%)`
              : "radial-gradient(circle, oklch(0.65 0.16 185 / 0.08) 0%, transparent 70%)",
            opacity: isActive ? 1 : 0.4,
          }}
        />

        {/* Ring 5 (outermost) — deep purple, responds to treble */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: "0px",
            border: `1.5px solid ${ringColors[4]}`,
            transform: `scale(${1 + (isListening ? ringEnergies[4] * 0.12 : 0)})`,
            transition: "transform 0.15s ease-out",
          }}
          animate={!isListening ? breatheAnimation : undefined}
          transition={!isListening ? { ...breatheTransition, delay: 0.8 } : undefined}
        />

        {/* Ring 4 — purple, responds to upper-mid */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: "12px",
            border: `1.5px solid ${ringColors[3]}`,
            transform: `scale(${1 + (isListening ? ringEnergies[3] * 0.1 : 0)})`,
            transition: "transform 0.12s ease-out",
          }}
          animate={!isListening ? breatheAnimation : undefined}
          transition={!isListening ? { ...breatheTransition, delay: 0.6 } : undefined}
        />

        {/* Ring 3 — blue-purple, responds to mid */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: "24px",
            border: `2px solid ${ringColors[2]}`,
            transform: `scale(${1 + (isListening ? ringEnergies[2] * 0.08 : 0)})`,
            transition: "transform 0.1s ease-out",
          }}
          animate={!isListening ? breatheAnimation : undefined}
          transition={!isListening ? { ...breatheTransition, delay: 0.4 } : undefined}
        />

        {/* Ring 2 — teal-blue, responds to bass */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: "36px",
            border: `2px solid ${ringColors[1]}`,
            transform: `scale(${1 + (isListening ? ringEnergies[1] * 0.06 : 0)})`,
            transition: "transform 0.1s ease-out",
          }}
          animate={!isListening ? breatheAnimation : undefined}
          transition={!isListening ? { ...breatheTransition, delay: 0.2 } : undefined}
        />

        {/* Ring 1 (innermost) — vibrant teal core, responds to sub-bass */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: "48px",
            border: `2.5px solid ${ringColors[0]}`,
            transform: `scale(${1 + (isListening ? ringEnergies[0] * 0.05 : 0)})`,
            transition: "transform 0.08s ease-out",
          }}
          animate={!isListening ? breatheAnimation : undefined}
          transition={!isListening ? breatheTransition : undefined}
        />

        {/* Center — the "pupil" of the eye */}
        <motion.div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            inset: "56px",
            background: isListening
              ? `radial-gradient(circle, oklch(0.70 0.18 185 / ${0.8 + audioLevel * 0.2}), oklch(0.20 0.08 280))`
              : isActive
              ? "radial-gradient(circle, oklch(0.55 0.14 185 / 0.6), oklch(0.18 0.06 280))"
              : "radial-gradient(circle, oklch(0.30 0.06 280 / 0.6), oklch(0.15 0.04 280))",
            boxShadow: isListening
              ? `0 0 ${20 + audioLevel * 30}px oklch(0.65 0.16 185 / ${0.3 + audioLevel * 0.3}), inset 0 0 10px oklch(0.65 0.16 185 / 0.2)`
              : isActive
              ? "0 0 15px oklch(0.65 0.16 185 / 0.2), inset 0 0 8px oklch(0.65 0.16 185 / 0.1)"
              : "none",
            transition: "background 0.3s ease, box-shadow 0.2s ease",
          }}
        >
          {isConnecting && (
            <motion.div
              className="w-5 h-5 border-2 border-primary/60 border-t-primary rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          )}
          {isActive && isMuted && <MicOff className="text-muted-foreground" size={18} />}
          {isActive && !isMuted && (
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Mic className="text-primary" size={18} />
            </motion.div>
          )}
          {!isActive && !isConnecting && <Mic className="text-muted-foreground/50" size={18} />}
        </motion.div>
      </div>

      {/* Status label */}
      <motion.p
        className="text-xs font-medium tracking-widest uppercase"
        animate={{
          color: isListening ? "oklch(0.65 0.16 185)" : isActive ? "oklch(0.55 0.10 185)" : "oklch(0.50 0.04 280)",
          opacity: isActive ? 1 : 0.5,
        }}
        transition={{ duration: 0.5 }}
      >
        {isConnecting ? "Connecting..." : isListening ? "Listening" : isActive ? "Muted" : "Ready"}
      </motion.p>

      {/* Frequency bar waveform */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.4 }}
        >
          <FrequencyBars micFft={micFft} isActive={isListening} />
        </motion.div>
      )}
    </div>
  );
}

export default VoiceVisualization;
