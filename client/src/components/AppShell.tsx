import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  CalendarDays,
  Home,
  Info,
  MessageCircle,
  Settings,
  X,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { useRef, useCallback, useState } from "react";

const navItems = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/chat", icon: MessageCircle, label: "Mirror" },
  { path: "/journal", icon: BookOpen, label: "Journal" },
  { path: "/calendar", icon: CalendarDays, label: "Habits" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

/** Fire a short haptic pulse if the device supports it (Android Chrome) */
function haptic(ms = 8) {
  try {
    if ("vibrate" in navigator) navigator.vibrate(ms);
  } catch {
    // silently ignore — iOS / unsupported browsers throw nothing
  }
}

interface AppShellProps {
  children: React.ReactNode;
  /** When true, the main area does not scroll — the child manages its own scroll */
  noScroll?: boolean;
}

export default function AppShell({ children, noScroll }: AppShellProps) {
  const [location, navigate] = useLocation();
  const [navVisible, setNavVisible] = useState(true);

  // ── Auto-hide nav on scroll ──────────────────────────────────────────────
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const currentY = (e.target as HTMLElement).scrollTop;
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const delta = currentY - lastScrollY.current;
      if (Math.abs(delta) > 4) {
        setNavVisible(delta < 0 || currentY < 60);
        lastScrollY.current = currentY;
      }
      ticking.current = false;
    });
  }, []);

  // ── Swipe between tabs ───────────────────────────────────────────────────
  const currentIndex = navItems.findIndex(
    (item) => location === item.path || location.startsWith(item.path + "/")
  );

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swipeLocked = useRef(false); // prevent multiple triggers per gesture

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeLocked.current = false;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      if (swipeLocked.current) return;

      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;

      // Only trigger if horizontal swipe is dominant (ratio > 1.5) and long enough
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      swipeLocked.current = true;

      if (dx < 0 && currentIndex < navItems.length - 1) {
        // Swipe left → next tab
        haptic(6);
        navigate(navItems[currentIndex + 1].path);
        setNavVisible(true);
      } else if (dx > 0 && currentIndex > 0) {
        // Swipe right → previous tab
        haptic(6);
        navigate(navItems[currentIndex - 1].path);
        setNavVisible(true);
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [currentIndex, navigate]
  );

  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <div
      className="h-dvh bg-aurora flex flex-col max-w-[480px] mx-auto relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main content — inner scroll only */}
      <main
        className={noScroll ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto pb-24 scrollbar-hide"}
        onScroll={noScroll ? undefined : handleScroll}
      >
        {children}
      </main>

      {/* Crisis info button — fixed bottom-right above nav */}
      <button
        onClick={() => setDisclaimerOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-opacity opacity-40 hover:opacity-80"
        style={{ background: "oklch(0.46 0.14 185 / 0.15)", border: "1px solid oklch(0.46 0.14 185 / 0.3)" }}
        aria-label="Safety information"
      >
        <Info size={14} className="text-primary" />
      </button>

      {/* Crisis disclaimer modal */}
      <AnimatePresence>
        {disclaimerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center"
            style={{ background: "oklch(0.18 0.02 270 / 0.5)" }}
            onClick={() => setDisclaimerOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="w-full max-w-[480px] bg-background rounded-t-2xl p-6 pb-10 overflow-y-auto max-h-[80dvh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">About Mentrove</h2>
                <button onClick={() => setDisclaimerOpen(false)} className="p-1 rounded-full hover:bg-muted">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="font-semibold text-foreground mb-1">What Mentrove Is</p>
                  <p>Mentrove is an AI-powered self-reflection tool designed to support personal growth, emotional awareness, and mindfulness. It offers guided journaling, mood tracking, and AI-assisted insights to help you understand yourself better.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">What Mentrove Is NOT</p>
                  <p>Mentrove is <strong>not</strong> a licensed therapist, psychologist, medical doctor, or crisis counselor. It does not provide medical advice, diagnosis, or treatment. It is not a substitute for professional mental health care.</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "oklch(0.95 0.04 15 / 0.5)", border: "1px solid oklch(0.85 0.06 15 / 0.4)" }}>
                  <p className="font-semibold text-red-700 mb-2">🆘 In Crisis? Get Help Now</p>
                  <div className="space-y-1">
                    <p><a href="tel:988" className="font-semibold text-red-700 underline">988</a> — Suicide &amp; Crisis Lifeline (call or text)</p>
                    <p><a href="tel:18002738255" className="font-semibold text-red-700 underline">1-800-273-8255</a> — National Suicide Prevention Lifeline</p>
                    <p><a href="tel:911" className="font-semibold text-red-700 underline">911</a> — Emergency Services</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating pill nav — auto-hides on scroll down */}
      <motion.nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 px-4 pb-3 pt-1 pointer-events-none"
        animate={{ y: navVisible ? 0 : 90, opacity: navVisible ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36, mass: 0.8 }}
      >
        <div
          className="pointer-events-auto flex items-center justify-around rounded-2xl px-2 py-1.5"
          style={{
            background: "oklch(0.98 0.014 185 / 0.96)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid oklch(0.86 0.03 185 / 0.7)",
            boxShadow:
              "0 4px 24px oklch(0.18 0.02 270 / 0.08), 0 1px 4px oklch(0.18 0.02 270 / 0.04)",
          }}
        >
          {navItems.map((item) => {
            const isActive =
              location === item.path || location.startsWith(item.path + "/");
            return (
              <Link key={item.path} href={item.path}>
                <motion.div
                  whileTap={{ scale: 0.84 }}
                  onClick={() => {
                    haptic(8);
                    setNavVisible(true);
                  }}
                  className={cn(
                    "relative flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "oklch(0.46 0.14 185 / 0.09)" }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    className="relative transition-all duration-200"
                  />
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative text-[9px] font-semibold tracking-wide mt-0.5 text-primary"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.nav>
    </div>
  );
}
