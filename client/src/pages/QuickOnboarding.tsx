import { useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function QuickOnboarding() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // If not authenticated, go to home
    if (!loading && !isAuthenticated) {
      navigate("/");
      return;
    }
    
    // If authenticated, skip QuickOnboarding and go to home
    // TODO: Re-enable after seedIntent column is added to database
    if (!loading && isAuthenticated) {
      navigate("/home");
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-aurora via-white to-aurora flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-violet-300 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Redirect happens in useEffect
  return null;
}
