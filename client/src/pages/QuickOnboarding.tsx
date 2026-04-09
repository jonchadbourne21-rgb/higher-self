import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

type SeedIntent = "Inner Peace" | "Clarity" | "Confidence" | "Healing" | "Focus";

interface IntentTile {
  label: SeedIntent;
  emoji: string;
  description: string;
  color: string;
  bgGradient: string;
}

const INTENT_TILES: IntentTile[] = [
  {
    label: "Inner Peace",
    emoji: "🧘",
    description: "Find calm and stillness within",
    color: "from-blue-400 to-cyan-300",
    bgGradient: "hover:from-blue-500 hover:to-cyan-400",
  },
  {
    label: "Clarity",
    emoji: "🔮",
    description: "Cut through confusion and see clearly",
    color: "from-purple-400 to-pink-300",
    bgGradient: "hover:from-purple-500 hover:to-pink-400",
  },
  {
    label: "Confidence",
    emoji: "⚡",
    description: "Step into your power",
    color: "from-yellow-400 to-orange-300",
    bgGradient: "hover:from-yellow-500 hover:to-orange-400",
  },
  {
    label: "Healing",
    emoji: "🌿",
    description: "Release what no longer serves you",
    color: "from-green-400 to-emerald-300",
    bgGradient: "hover:from-green-500 hover:to-emerald-400",
  },
  {
    label: "Focus",
    emoji: "🎯",
    description: "Sharpen your intention and purpose",
    color: "from-red-400 to-rose-300",
    bgGradient: "hover:from-red-500 hover:to-rose-400",
  },
];

export function QuickOnboarding() {
  const [, navigate] = useLocation();
  const [selectedIntent, setSelectedIntent] = useState<SeedIntent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // tRPC mutation to save seed intent
  const saveSeedIntentMutation = trpc.onboarding.saveSeedIntent.useMutation({
    onSuccess: () => {
      // Navigate to chat page after successful save
      navigate("/chat", { replace: true });
    },
    onError: (error: unknown) => {
      console.error("Failed to save seed intent:", error);
      setIsLoading(false);
    },
  });

  const handleTileClick = async (intent: SeedIntent) => {
    setSelectedIntent(intent);
    setIsLoading(true);

    try {
      await saveSeedIntentMutation.mutateAsync({ seedIntent: intent });
    } catch (error: unknown) {
      console.error("Error saving seed intent:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            What brings you to your mirror today?
          </h1>
          <p className="text-lg text-gray-600">
            Choose what resonates most with you right now
          </p>
        </div>

        {/* Intent Tiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {INTENT_TILES.map((tile) => (
            <button
              key={tile.label}
              onClick={() => handleTileClick(tile.label)}
              disabled={isLoading}
              className="group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 rounded-lg"
            >
              <Card
                className={`
                  relative h-40 flex flex-col items-center justify-center p-4
                  bg-gradient-to-br ${tile.color}
                  transition-all duration-300 ease-out
                  cursor-pointer border-0 shadow-lg
                  hover:shadow-2xl hover:scale-105
                  ${selectedIntent === tile.label && isLoading ? "ring-2 ring-white scale-105" : ""}
                  ${isLoading && selectedIntent !== tile.label ? "opacity-50" : ""}
                `}
              >
                {/* Animated background glow on hover */}
                <div
                  className={`
                    absolute inset-0 bg-gradient-to-br ${tile.bgGradient}
                    opacity-0 group-hover:opacity-100 rounded-lg
                    transition-opacity duration-300
                  `}
                />

                {/* Content */}
                <div className="relative z-10 text-center">
                  <div className="text-5xl mb-2 group-hover:scale-110 transition-transform duration-300">
                    {tile.emoji}
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm md:text-base mb-1">
                    {tile.label}
                  </h3>
                  <p className="text-xs text-gray-700 opacity-90">
                    {tile.description}
                  </p>
                </div>

                {/* Loading indicator */}
                {selectedIntent === tile.label && isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </Card>
            </button>
          ))}
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-600">
          <p>
            This helps Synapset understand your intention for today's reflection.
          </p>
        </div>
      </div>
    </div>
  );
}
