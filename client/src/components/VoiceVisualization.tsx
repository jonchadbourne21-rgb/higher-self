/**
 * VoiceVisualization — "The Inner Eye"
 * 
 * An organic, breathing iris/portal visualization that represents the Mirror
 * feature's core purpose: looking inward and being truly heard.
 * 
 * Features:
 * - Concentric rings that breathe when idle and pulse with micFft frequency data
 * - Particle field that drifts outward when speaking (energy radiating from words)
 * - Frequency bar waveform for raw audio feedback
 * 
 * Design language: teal primary + purple accents on midnight background.
 * Performance: requestAnimationFrame for canvas, CSS transitions for rings, no setInterval.
 */

import { useMemo, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

type VoiceStatusObject = 
  | { value: 'connecting' | 'connected' | 'disconnected'; reason?: never }
  | { value: 'error'; reason: string };

type VoiceStatusString = string;
type VoiceStatus = VoiceStatusObject | VoiceStatusString;

interface VoiceVisualizationProps {
  status: VoiceStatus;
  isMuted: boolean;
  audioLevel: number;
  micFft: number[];
}

// ── Particle System ─────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  alpha: number;
}

function ParticleField({ audioLevel, isActive }: { audioLevel: number; isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const lastSpawnRef = useRef<number>(0);

  const spawnParticle = useCallback((centerX: number, centerY: number, energy: number) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + energy * 1.5;
    const hue = 185 + Math.random() * 105; // teal to purple
    return {
      x: centerX + (Math.random() - 0.5) * 20,
      y: centerY + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 60 + Math.random() * 40, // frames
      size: 1 + Math.random() * 2,
      hue,
      alpha: 0.4 + energy * 0.4,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const centerX = W / 2;
      const centerY = H / 2;
      const now = Date.now();

      // Spawn particles based on audio energy
      if (isActive && audioLevel > 0.03) {
        const spawnRate = Math.max(30, 120 - audioLevel * 100); // ms between spawns
        if (now - lastSpawnRef.current > spawnRate) {
          const count = Math.ceil(audioLevel * 3);
          for (let i = 0; i < count; i++) {
            particlesRef.current.push(spawnParticle(centerX, centerY, audioLevel));
          }
          lastSpawnRef.current = now;
        }
      }

      // Ambient particles when idle (very sparse)
      if (!isActive || audioLevel < 0.02) {
        if (now - lastSpawnRef.current > 400 && particlesRef.current.length < 8) {
          particlesRef.current.push(spawnParticle(centerX, centerY, 0.05));
          lastSpawnRef.current = now;
        }
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) return false;

        p.x += p.vx;
        p.y += p.vy;
        // Slight outward drift
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          p.vx += (dx / dist) * 0.02;
          p.vy += (dy / dist) * 0.02;
        }
        // Slow down over time
        p.vx *= 0.98;
        p.vy *= 0.98;

        const fadeAlpha = p.life * p.alpha;
        const lightness = 0.55 + (1 - p.life) * 0.1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `oklch(${lightness} 0.14 ${p.hue} / ${fadeAlpha})`;
        ctx.fill();

        return true;
      });

      // Cap particles to prevent memory issues
      if (particlesRef.current.length > 60) {
        particlesRef.current = particlesRef.current.slice(-60);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [audioLevel, isActive, spawnParticle]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={240}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ imageRendering: "auto" }}
    />
  );
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

      const fftData = micFft.length > 0 ? micFft : new Array(barCount).fill(0);
      const step = Math.max(1, Math.floor(fftData.length / barCount));

      for (let i = 0; i < barCount; i++) {
        const rawValue = fftData[Math.min(i * step, fftData.length - 1)] || 0;
        smoothedRef.current[i] += (rawValue - smoothedRef.current[i]) * 0.3;
        const value = smoothedRef.current[i];

        const barHeight = Math.max(2, value * H * 0.85);
        const x = i * (barWidth + gap) + gap / 2;
        const y = (H - barHeight) / 2;

        const hue = 185 + (i / barCount) * 105;
        const lightness = 0.55 + value * 0.15;
        const chroma = 0.12 + value * 0.06;
        const alpha = isActive ? 0.6 + value * 0.4 : 0.15;

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
      height={36}
      className="w-56 h-9 opacity-90"
      style={{ imageRendering: "auto" }}
    />
  );
}

// ── Normalize status ────────────────────────────────────────────────────────
function normalizeStatus(status: VoiceStatus): { isActive: boolean; isConnecting: boolean; isDisconnected: boolean } {
  if (typeof status === "string") {
    return {
      isActive: status === "live",
      isConnecting: status === "connecting",
      isDisconnected: status === "idle" || status === "ended" || status === "error",
    };
  }
  return {
    isActive: status.value === "connected",
    isConnecting: status.value === "connecting",
    isDisconnected: status.value === "disconnected",
  };
}

// ── Main Visualization: The Inner Eye ───────────────────────────────────────
export function VoiceVisualization({ status, isMuted, audioLevel, micFft }: VoiceVisualizationProps) {
  const { isActive, isConnecting } = normalizeStatus(status);
  const isListening = isActive && !isMuted;

  // Derive per-ring energy from different frequency bands
  const ringEnergies = useMemo(() => {
    if (!micFft || micFft.length === 0) return [0, 0, 0, 0, 0];
    const len = micFft.length;
    const bands = [
      micFft.slice(0, Math.floor(len * 0.1)),
      micFft.slice(Math.floor(len * 0.1), Math.floor(len * 0.25)),
      micFft.slice(Math.floor(len * 0.25), Math.floor(len * 0.5)),
      micFft.slice(Math.floor(len * 0.5), Math.floor(len * 0.75)),
      micFft.slice(Math.floor(len * 0.75)),
    ];
    return bands.map(band => {
      if (band.length === 0) return 0;
      const sum = band.reduce((a, v) => a + v * v, 0);
      return Math.min(1, Math.sqrt(sum / band.length) * 2.5);
    });
  }, [micFft]);

  const breatheAnimation = useMemo(() => ({
    scale: [1, 1.03, 1],
    opacity: [0.6, 0.8, 0.6],
  }), []);

  const breatheTransition = useMemo(() => ({
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut" as const,
  }), []);

  const ringColors = useMemo(() => [
    "oklch(0.65 0.16 185 / 0.9)",
    "oklch(0.58 0.14 200 / 0.7)",
    "oklch(0.52 0.12 230 / 0.5)",
    "oklch(0.48 0.12 260 / 0.35)",
    "oklch(0.45 0.10 290 / 0.2)",
  ], []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* The Inner Eye — concentric rings + particle field */}
      <div className="relative w-60 h-60 flex items-center justify-center">
        
        {/* Particle field layer (behind rings) */}
        <ParticleField audioLevel={audioLevel} isActive={isListening} />

        {/* Outer ambient glow */}
        <div
          className="absolute rounded-full blur-2xl transition-opacity duration-700"
          style={{
            inset: "20px",
            background: isListening
              ? `radial-gradient(circle, oklch(0.65 0.16 185 / ${0.12 + audioLevel * 0.18}) 0%, transparent 70%)`
              : "radial-gradient(circle, oklch(0.65 0.16 185 / 0.06) 0%, transparent 70%)",
            opacity: isActive ? 1 : 0.3,
          }}
        />

        {/* Ring 5 (outermost) */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: "30px",
            border: `1px solid ${ringColors[4]}`,
            transform: `scale(${1 + (isListening ? ringEnergies[4] * 0.12 : 0)})`,
            transition: "transform 0.15s ease-out",
          }}
          animate={!isListening ? breatheAnimation : undefined}
          transition={!isListening ? { ...breatheTransition, delay: 0.8 } : undefined}
        />

        {/* Ring 4 */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: "44px",
            border: `1.5px solid ${ringColors[3]}`,
            transform: `scale(${1 + (isListening ? ringEnergies[3] * 0.1 : 0)})`,
            transition: "transform 0.12s ease-out",
          }}
          animate={!isListening ? breatheAnimation : undefined}
          transition={!isListening ? { ...breatheTransition, delay: 0.6 } : undefined}
        />

        {/* Ring 3 */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: "58px",
            border: `1.5px solid ${ringColors[2]}`,
            transform: `scale(${1 + (isListening ? ringEnergies[2] * 0.08 : 0)})`,
            transition: "transform 0.1s ease-out",
          }}
          animate={!isListening ? breatheAnimation : undefined}
          transition={!isListening ? { ...breatheTransition, delay: 0.4 } : undefined}
        />

        {/* Ring 2 */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: "72px",
            border: `2px solid ${ringColors[1]}`,
            transform: `scale(${1 + (isListening ? ringEnergies[1] * 0.06 : 0)})`,
            transition: "transform 0.1s ease-out",
          }}
          animate={!isListening ? breatheAnimation : undefined}
          transition={!isListening ? { ...breatheTransition, delay: 0.2 } : undefined}
        />

        {/* Ring 1 (innermost) */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: "86px",
            border: `2px solid ${ringColors[0]}`,
            transform: `scale(${1 + (isListening ? ringEnergies[0] * 0.05 : 0)})`,
            transition: "transform 0.08s ease-out",
          }}
          animate={!isListening ? breatheAnimation : undefined}
          transition={!isListening ? breatheTransition : undefined}
        />

        {/* Center — the "pupil" */}
        <motion.div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            inset: "96px",
            background: isListening
              ? `radial-gradient(circle, oklch(0.70 0.18 185 / ${0.8 + audioLevel * 0.2}), oklch(0.20 0.08 280))`
              : isActive
              ? "radial-gradient(circle, oklch(0.55 0.14 185 / 0.6), oklch(0.18 0.06 280))"
              : "radial-gradient(circle, oklch(0.30 0.06 280 / 0.6), oklch(0.15 0.04 280))",
            boxShadow: isListening
              ? `0 0 ${16 + audioLevel * 24}px oklch(0.65 0.16 185 / ${0.25 + audioLevel * 0.25}), inset 0 0 8px oklch(0.65 0.16 185 / 0.15)`
              : isActive
              ? "0 0 12px oklch(0.65 0.16 185 / 0.15), inset 0 0 6px oklch(0.65 0.16 185 / 0.08)"
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
          {isActive && isMuted && <MicOff className="text-muted-foreground" size={16} />}
          {isActive && !isMuted && (
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Mic className="text-primary" size={16} />
            </motion.div>
          )}
          {!isActive && !isConnecting && <Mic className="text-muted-foreground/50" size={16} />}
        </motion.div>
      </div>

      {/* Status label */}
      <motion.p
        className="text-[11px] font-medium tracking-[0.2em] uppercase"
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
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.4 }}
        >
          <FrequencyBars micFft={micFft} isActive={isListening} />
        </motion.div>
      )}
    </div>
  );
}

export default VoiceVisualization;
