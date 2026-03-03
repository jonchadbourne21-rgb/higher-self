import { useAuth } from "@/_core/hooks/useAuth";
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
      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50">
        <div className="glass border-t border-border/50 px-2 pb-safe pt-2">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = location === item.path || location.startsWith(item.path + "/");
              return (
                <Link key={item.path} href={item.path}>
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="relative">
                      <item.icon
                        size={22}
                        strokeWidth={isActive ? 2 : 1.5}
                        className={cn(
                          "transition-all duration-200",
                          isActive && "drop-shadow-[0_0_8px_oklch(0.78_0.12_75/0.6)]"
                        )}
                      />
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium tracking-wide transition-all duration-200",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
