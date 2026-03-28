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

      {/* Bottom navigation — white card with warm shadow */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50">
        <div
          className="px-2 pb-safe pt-2"
          style={{
            background: "oklch(1.00 0.00 0 / 0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid oklch(0.88 0.02 80 / 0.8)",
            boxShadow: "0 -4px 24px oklch(0.18 0.02 270 / 0.06)",
          }}
        >
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const isActive = location === item.path || location.startsWith(item.path + "/");
              return (
                <Link key={item.path} href={item.path}>
                  <motion.div
                    whileTap={{ scale: 0.88 }}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="relative">
                      {/* Active pill background */}
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 -m-1.5 rounded-xl"
                          style={{ background: "oklch(0.46 0.20 295 / 0.10)" }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <item.icon
                        size={22}
                        strokeWidth={isActive ? 2.2 : 1.5}
                        className="relative transition-all duration-200"
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium tracking-wide transition-all duration-200",
                        isActive ? "text-primary font-semibold" : "text-muted-foreground"
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
