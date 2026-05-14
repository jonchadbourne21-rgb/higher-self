import { Link } from "wouter";

interface MentroveHeaderProps {
  subtitle?: string;
  showMenu?: boolean;
  rightAction?: React.ReactNode;
}

/**
 * MENTROVE wordmark header — appears at the top of every page.
 * Matches the App Store screenshot aesthetic: serif wordmark with mandala "O",
 * optional subtitle (e.g., "AI MIRROR"), and optional right action button.
 */
export default function MentroveHeader({
  subtitle = "AI MIRROR",
  showMenu = false,
  rightAction,
}: MentroveHeaderProps) {
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
          <h1 className="mentrove-wordmark text-lg tracking-[0.18em] m-0 leading-tight">
            MENTR
            <span className="inline-block relative">
              {/* Mandala "O" — small inline icon */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                className="inline-block align-middle -mt-0.5"
                fill="none"
              >
                <circle cx="12" cy="12" r="10" stroke="oklch(0.65 0.16 185)" strokeWidth="1.2" />
                <circle cx="12" cy="12" r="6" stroke="oklch(0.55 0.14 290)" strokeWidth="0.8" />
                <circle cx="12" cy="12" r="2.5" fill="oklch(0.65 0.16 185)" opacity="0.8" />
                {/* Cross lines for sacred geometry feel */}
                <line x1="12" y1="2" x2="12" y2="22" stroke="oklch(0.55 0.14 290)" strokeWidth="0.4" opacity="0.5" />
                <line x1="2" y1="12" x2="22" y2="12" stroke="oklch(0.55 0.14 290)" strokeWidth="0.4" opacity="0.5" />
                <line x1="5" y1="5" x2="19" y2="19" stroke="oklch(0.55 0.14 290)" strokeWidth="0.3" opacity="0.3" />
                <line x1="19" y1="5" x2="5" y2="19" stroke="oklch(0.55 0.14 290)" strokeWidth="0.3" opacity="0.3" />
              </svg>
            </span>
            VE
          </h1>
          {subtitle && (
            <span className="mentrove-subtitle mt-0.5">{subtitle}</span>
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
