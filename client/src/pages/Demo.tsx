import { useEffect } from "react";
import { useLocation } from "wouter";
import { enableDemoMode } from "@/lib/demo";

/**
 * Demo entry point — activates demo mode and redirects to /home.
 * When demo mode is active, the tRPC client sends x-demo-mode: true header,
 * and the server returns a hardcoded demo user without requiring OAuth.
 */
export default function Demo() {
  const [, navigate] = useLocation();

  useEffect(() => {
    enableDemoMode();
    // Small delay to ensure localStorage is set before redirect
    setTimeout(() => navigate("/home"), 50);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-pulse">
          <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-teal-400 to-violet-500" />
        </div>
        <p className="text-muted-foreground text-sm">Entering demo mode...</p>
      </div>
    </div>
  );
}
