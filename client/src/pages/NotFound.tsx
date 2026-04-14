import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading, user } = useAuth();

  // Smart redirect: authenticated users should never see a 404 — send them home
  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      const hasOnboarded = (user as any)?.onboardingCompleted;
      setLocation(hasOnboarded ? "/home" : "/onboarding");
    }
  }, [isAuthenticated, loading, user, setLocation]);

  if (loading || isAuthenticated) {
    return (
      <div className="h-dvh bg-aurora flex items-center justify-center">
        <div className="text-primary text-4xl font-serif animate-pulse">✦</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aurora flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-7xl font-serif text-primary mb-4">✦</div>
        <h1 className="text-5xl font-bold text-foreground mb-2">404</h1>
        <h2 className="text-xl font-semibold text-foreground/80 mb-4">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          This path doesn't exist. Let's guide you back to where you belong.
        </p>
        <button
          onClick={() => setLocation("/")}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
