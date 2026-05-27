import { motion } from "framer-motion";
import {
  BookOpen,
  Calendar,
  Flame,
  Home,
  MessageCircle,
  Sparkles,
  Settings,
  User,
  GraduationCap,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { useRef, useCallback, useState } from "react";
import MirroredHeader from "./MirroredHeader";

const navItems = [
  { path: "/home", icon: Home, label: "Dashboard" },
  { path: "/domains", icon: Flame, label: "Habits" },
  { path: "/mirror", icon: Sparkles, label: "Mirror" },
  { path: "/journal", icon: BookOpen, label: "Journal" },
  { path: "/programs", icon: GraduationCap, label: "Programs" },
];

/** Fire a short haptic pulse if the device supports it (Android Chrome) */
function haptic(ms = 8) {
  try {
    if ("vibrate" in navigator) navigator.vibrate(ms);
  } catch {
    // silently ignore — iOS / unsupported browsers throw nothing
  }
}

/** Get subtitle for the header based on current page */
function getSubtitle(path: string): string {
  if (path.startsWith("/mirror")) return "MIRROR";
  if (path.startsWith("/domains")) return "HABIT TRACKER";
  if (path.startsWith("/journal")) return "JOURNAL";
  if (path.startsWith("/dashboard")) return "DASHBOARD";
  if (path.startsWith("/calendar")) return "CALENDAR";
  if (path.startsWith("/settings")) return "PROFILE";
  if (path.startsWith("/rewards")) return "REWARDS";
  if (path.startsWith("/programs")) return "GROWTH PROGRAMS";
  return "AI SELF-REFLECTION";
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
  const swipeLocked = useRef(false);

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

      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      swipeLocked.current = true;

      if (dx < 0 && currentIndex < navItems.length - 1) {
        haptic(6);
        navigate(navItems[currentIndex + 1].path);
        setNavVisible(true);
      } else if (dx > 0 && currentIndex > 0) {
        haptic(6);
        navigate(navItems[currentIndex - 1].path);
        setNavVisible(true);
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [currentIndex, navigate]
  );


  return (
    <div
      className="h-dvh bg-aurora flex flex-col max-w-[480px] mx-auto relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mirrored Wordmark Header */}
      <MirroredHeader subtitle={getSubtitle(location)} />

      {/* Main content — inner scroll only */}
      <main
        className={noScroll ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto scrollbar-hide"}
        onScroll={noScroll ? undefined : handleScroll}
      >
        {children}
      </main>


      {/* Floating pill nav — dark glass, auto-hides on scroll down */}
      <motion.nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 px-4 pb-3 pt-1 pointer-events-none"
        animate={{ y: navVisible ? 0 : 90, opacity: navVisible ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36, mass: 0.8 }}
      >
        <div
          className="pointer-events-auto flex items-center justify-around rounded-2xl px-2 py-1.5"
          style={{
            background: "oklch(0.14 0.04 280 / 0.95)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid oklch(0.28 0.05 280 / 0.7)",
            boxShadow:
              "0 4px 24px oklch(0.05 0.02 280 / 0.4), 0 1px 4px oklch(0.05 0.02 280 / 0.2)",
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
                      style={{ background: "oklch(0.65 0.16 185 / 0.12)" }}
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
