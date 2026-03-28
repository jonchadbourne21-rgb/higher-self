import { motion } from "framer-motion";
import {
  BookOpen,
  Compass,
  Home,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/domains", icon: Compass, label: "Domains" },
  { path: "/chat", icon: MessageCircle, label: "Mirror" },
  { path: "/journal", icon: BookOpen, label: "Journal" },
  { path: "/dashboard", icon: Sparkles, label: "Growth" },
];

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-aurora flex flex-col max-w-[480px] mx-auto relative">
      {/* Main content — extra bottom padding to clear the floating nav */}
      <main className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
        {children}
      </main>

      {/* Floating pill nav — compact, minimal, stays out of the way */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 px-4 pb-3 pt-1 pointer-events-none">
        <div
          className="pointer-events-auto flex items-center justify-around rounded-2xl px-2 py-1.5"
          style={{
            background: "oklch(1.00 0.00 0 / 0.94)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid oklch(0.88 0.02 80 / 0.7)",
            boxShadow: "0 4px 24px oklch(0.18 0.02 270 / 0.08), 0 1px 4px oklch(0.18 0.02 270 / 0.04)",
          }}
        >
          {navItems.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path + "/");
            return (
              <Link key={item.path} href={item.path}>
                <motion.div
                  whileTap={{ scale: 0.84 }}
                  className={cn(
                    "relative flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {/* Active background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "oklch(0.46 0.20 295 / 0.09)" }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    className="relative transition-all duration-200"
                  />
                  {/* Only show label for active item */}
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
      </nav>
    </div>
  );
}
