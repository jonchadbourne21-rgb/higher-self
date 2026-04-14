import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const INTENT_TILES = [
  { id: "inner-peace", label: "Inner Peace", emoji: "🧘", color: "from-violet-400 to-violet-600" },
  { id: "clarity", label: "Clarity", emoji: "🔮", color: "from-blue-400 to-blue-600" },
  { id: "confidence", label: "Confidence", emoji: "⚡", color: "from-amber-400 to-amber-600" },
  { id: "healing", label: "Healing", emoji: "🌿", color: "from-emerald-400 to-emerald-600" },
  { id: "focus", label: "Focus", emoji: "🎯", color: "from-rose-400 to-rose-600" },
];

export default function QuickOnboarding() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = trpc.useUtils();
  const saveSeedIntentMutation = trpc.onboarding.saveSeedIntent.useMutation();

  // Redirect logic
  useEffect(() => {
    if (loading) return;

    // If not authenticated, go to home
    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    // If user already completed onboarding, skip to home
    if (user?.onboardingCompleted) {
      navigate("/home");
      return;
    }
  }, [isAuthenticated, loading, user?.onboardingCompleted, navigate]);

  const handleSelectIntent = async (intentId: string) => {
    setSelectedIntent(intentId);
    setIsSubmitting(true);

    try {
      // Find the label for the selected intent
      const intentLabel = INTENT_TILES.find((t) => t.id === intentId)?.label || intentId;
      
      // Save the seedIntent to the database
      await saveSeedIntentMutation.mutateAsync({ seedIntent: intentLabel });
      
      // Invalidate auth cache to refresh user data
      await utils.auth.me.invalidate();
      
      toast.success("Your journey begins ✦");
      navigate("/home");
    } catch (error) {
      console.error("Failed to save intent:", error);
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
      setSelectedIntent(null);
    }
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="h-dvh bg-gradient-to-br from-aurora via-white to-aurora flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-violet-300 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or already onboarded
  if (!isAuthenticated || user?.onboardingCompleted) {
    return null;
  }

  return (
    <div className="h-dvh bg-gradient-to-br from-aurora via-white to-aurora flex flex-col max-w-[480px] mx-auto px-6 py-12 overflow-y-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-violet-600">Step 1 of 2</span>
          <span className="text-sm text-gray-500">50%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all duration-300"></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Choose your intention</p>
      </div>

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif text-gray-900 mb-2">
          What brings you to your mirror today?
        </h1>
        <p className="text-gray-600">Choose your intention to begin</p>
      </div>

      {/* Intent Tiles */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        {INTENT_TILES.map((tile) => (
          <Card
            key={tile.id}
            onClick={() => handleSelectIntent(tile.id)}
            className={`p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
              selectedIntent === tile.id ? "ring-2 ring-violet-500" : ""
            } ${isSubmitting && selectedIntent !== tile.id ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className={`bg-gradient-to-br ${tile.color} rounded-lg p-6 text-center text-white`}>
              <div className="text-5xl mb-3">{tile.emoji}</div>
              <h2 className="text-xl font-semibold">{tile.label}</h2>
            </div>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        <p>Your AI mirror will personalize your experience based on your choice</p>
      </div>
    </div>
  );
}
