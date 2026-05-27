import { Link } from "wouter";

interface MirroredHeaderProps {
  subtitle?: string;
  showMenu?: boolean;
  rightAction?: React.ReactNode;
}

/**
 * Ornate mandala "O" SVG — matches the twitter banner style:
 * thick outer ring, inner ring, and a 4-pointed star sparkle in the center.
 */
function MandalaO({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="inline-block align-middle -mt-0.5"
      fill="none"
      aria-hidden="true"
    >
      {/* Outer glow */}
      <circle cx="12" cy="12" r="11" stroke="oklch(0.70 0.12 290)" strokeWidth="0.3" opacity="0.4" />
      {/* Thick outer ring */}
      <circle cx="12" cy="12" r="10" stroke="oklch(0.85 0.04 270)" strokeWidth="1.8" />
      {/* Inner ring */}
      <circle cx="12" cy="12" r="6.5" stroke="oklch(0.70 0.10 290)" strokeWidth="0.8" />
      {/* 4-pointed star sparkle in center */}
      <path
        d="M12 7 L12.8 11.2 L17 12 L12.8 12.8 L12 17 L11.2 12.8 L7 12 L11.2 11.2 Z"
        fill="oklch(0.90 0.05 270)"
        opacity="0.9"
      />
      {/* Tiny center dot */}
      <circle cx="12" cy="12" r="1.2" fill="oklch(0.95 0.02 270)" />
    </svg>
  );
}

/**
 * MENTROVE wordmark header — appears at the top of every page.
 * Matches the App Store screenshot aesthetic: serif wordmark with ornate mandala "O",
 * optional subtitle, and optional right action button.
 */
export default function MirroredHeader({
  subtitle = "AI MIRROR",
  showMenu = false,
  rightAction,
}: MirroredHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-2">
      {/* Left action — menu or spacer */}
      <div className="w-10">
        {showMenu && (
          <button className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="text-foreground">
              <path d="M0 1h16M0 6h16M0 11h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Center — MENTROVE wordmark */}
      <Link href="/home">
        <div className="flex flex-col items-center">
          <h1 className="mirrored-wordmark text-lg tracking-[0.18em] m-0 leading-tight">
            MENTR<MandalaO size={19} />VE
          </h1>
          {subtitle && (
            <span className="mirrored-subtitle mt-0.5 whitespace-nowrap">{subtitle}</span>
          )}
        </div>
      </Link>

      {/* Right action — custom button or spacer */}
      <div className="w-10 flex justify-end">
        {rightAction}
      </div>
    </header>
  );
}
