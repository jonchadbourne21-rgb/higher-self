import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

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

  const utils = trpc.useUtils();
  // TODO: Re-enable after seedIntent column is added to database
  // const saveMutation = trpc.onboarding.saveSeedIntent.useMutation({
  //   onSuccess: async () => {
  //     toast.success("Your journey begins ✦");
  //     await utils.auth.me.invalidate();
  //     navigate("/home");
  //   },
  //   onError: () => toast.error("Something went wrong. Please try again."),
  // });
  
  // Temporary: Skip to home directly
  const saveMutation = { mutate: () => navigate("/home"), isPending: false };

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
    // If user already has seedIntent, skip to home
    if (!loading && isAuthenticated && (user as any)?.seedIntent) {
      navigate("/home");
    }
  }, [isAuthenticated, loading, user, navigate]);

  const handleSelectIntent = (intentId: string) => {
    setSelectedIntent(intentId);
    // TODO: Re-enable after seedIntent column is added
    // saveMutation.mutate({ seedIntent: intentId });
    navigate("/home"); // Temporary: Skip to home
  };

  if (loading || !isAuthenticated) {
    // Temporary: Skip QuickOnboarding, redirect to home
    useEffect(() => {
      if (!loading && isAuthenticated) navigate("/home");
    }, [isAuthenticated, loading]);
    return null;
  }

  if (false) { // Disabled temporarily
    return null; // Temporary: Disabled
  /*
  return (
    <div className="min-h-screen bg-gradient-to-br from-aurora via-white to-aurora flex items-center justify-center p-4">       <div className="animate-pulse">
          <div className="h-12 w-12 bg-violet-300 rounded-full"></div>
      </div>
    </div>
  );
  */
}
  
  // Temporary: Return null to skip QuickOnboarding
  return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-aurora via-white to-aurora flex flex-col max-w-[480px] mx-auto px-6 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl font-serif text-slate-900 mb-3">
          What brings you to your mirror today?
        </h1>
        <p className="text-slate-600 text-sm">
          Choose one intention to guide our conversation
        </p>
      </motion.div>

      {/* Intent Tiles */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        {INTENT_TILES.map((tile, idx) => (
          <motion.button
            key={tile.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectIntent(tile.id)}
            disabled={saveMutation.isPending}
            className={`relative overflow-hidden rounded-2xl p-6 text-left transition-all ${
              selectedIntent === tile.id ? "ring-2 ring-offset-2 ring-violet-500" : ""
            } ${saveMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {/* Gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${tile.color} opacity-90`}></div>

            {/* Content */}
            <div className="relative z-10 flex items-center gap-4">
              <div className="text-4xl">{tile.emoji}</div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg">{tile.label}</h3>
                <p className="text-white/80 text-sm mt-1">
                  {tile.id === "inner-peace" && "Find calm and stillness"}
                  {tile.id === "clarity" && "Gain insight and perspective"}
                  {tile.id === "confidence" && "Build strength and courage"}
                  {tile.id === "healing" && "Process and grow"}
                  {tile.id === "focus" && "Sharpen your direction"}
                </p>
              </div>
            </div>

            {/* Loading indicator */}
            {selectedIntent === tile.id && saveMutation.isPending && (
              <motion.div
                className="absolute inset-0 bg-white/20"
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Footer message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="text-center text-slate-500 text-xs mt-auto"
      >
        You can change this anytime in your settings
      </motion.p>
    </div>
  );
}
