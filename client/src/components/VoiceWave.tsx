/**
 * VoiceWave — animated audio waveform header for the Voice Mirror.
 * Replaces the orb. Shows a fluid, multi-bar waveform that reacts to
 * micFft data when live, and breathes gently when idle.
 */
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface VoiceWaveProps {
  status: "idle" | "connecting" | "live" | "ended" | "error";
  isMuted?: boolean;
  micFft?: number[];
  audioLevel?: number;
}

const BAR_COUNT = 48;

export function VoiceWave({ status, isMuted, micFft, audioLevel = 0 }: VoiceWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const phaseRef = useRef(0);
  const smoothedRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));

  const isLive = status === "live";
  const isConnecting = status === "connecting";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      phaseRef.current += isLive && !isMuted ? 0.06 : 0.018;

      const barW = W / BAR_COUNT;
      const gap = barW * 0.35;
      const bW = barW - gap;

      for (let i = 0; i < BAR_COUNT; i++) {
        // Base sine wave — two overlapping frequencies for organic feel
        const sine1 = Math.sin(phaseRef.current + i * 0.28) * 0.5 + 0.5;
        const sine2 = Math.sin(phaseRef.current * 1.7 + i * 0.18 + 1.2) * 0.5 + 0.5;
        const baseHeight = (sine1 * 0.6 + sine2 * 0.4);

        // Frequency data from mic
        let fftVal = 0;
        if (isLive && !isMuted && micFft && micFft.length > 0) {
          const fftIdx = Math.floor((i / BAR_COUNT) * Math.min(micFft.length, BAR_COUNT));
          fftVal = micFft[fftIdx] ?? 0;
        }

        // Smooth the bar heights
        const target = isLive && !isMuted
          ? Math.max(baseHeight * 0.25 + fftVal * 0.75, 0.04)
          : isConnecting
          ? baseHeight * 0.15 + 0.04
          : baseHeight * 0.08 + 0.02;

        smoothedRef.current[i] += (target - smoothedRef.current[i]) * 0.18;
        const h = Math.max(smoothedRef.current[i] * H * 0.85, 2);

        const x = i * barW + gap / 2;
        const y = (H - h) / 2;

        // Color: teal-to-purple gradient based on position + activity
        const t = i / BAR_COUNT;
        const alpha = isLive && !isMuted
          ? 0.55 + smoothedRef.current[i] * 0.45
          : isConnecting
          ? 0.3 + Math.sin(phaseRef.current + i * 0.3) * 0.1
          : 0.18 + smoothedRef.current[i] * 0.15;

        // Teal (185) → purple (290) gradient across bars
        const hue = 185 + t * 105;
        const chroma = isLive && !isMuted ? 0.14 + smoothedRef.current[i] * 0.08 : 0.08;
        const lightness = 0.60 + smoothedRef.current[i] * 0.15;

        ctx.fillStyle = `oklch(${lightness} ${chroma} ${hue} / ${alpha})`;

        // Rounded bars
        const radius = bW / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, bW, h, radius);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isLive, isConnecting, isMuted, micFft]);

  // Resize canvas to match display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Ambient glow behind the wave */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{
          opacity: isLive && !isMuted ? [0.25, 0.45, 0.25] : 0.1,
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: isLive && !isMuted
            ? "radial-gradient(ellipse 80% 60% at 50% 50%, oklch(0.65 0.16 185 / 0.18), transparent)"
            : "radial-gradient(ellipse 80% 60% at 50% 50%, oklch(0.50 0.08 270 / 0.08), transparent)",
        }}
      />

      {/* Canvas waveform */}
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: "88px" }}
      />

      {/* Status label */}
      <motion.div
        className="mt-2 flex items-center gap-1.5"
        animate={{ opacity: 1 }}
      >
        {isLive && (
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isMuted ? "oklch(0.55 0.18 25)" : "oklch(0.65 0.16 185)" }}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
        {isConnecting && (
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-primary/60"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
        <span
          className="text-[10px] font-medium tracking-[0.18em] uppercase"
          style={{
            color: isLive && !isMuted
              ? "oklch(0.65 0.16 185)"
              : isLive && isMuted
              ? "oklch(0.55 0.18 25)"
              : isConnecting
              ? "oklch(0.60 0.10 270)"
              : "oklch(0.45 0.04 270)",
          }}
        >
          {isConnecting
            ? "Connecting…"
            : isLive && isMuted
            ? "Muted"
            : isLive
            ? "Listening"
            : status === "ended"
            ? "Session ended"
            : "Ready"}
        </span>
      </motion.div>
    </div>
  );
}

export default VoiceWave;
