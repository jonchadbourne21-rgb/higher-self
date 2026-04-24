import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CheckInInsight() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [isSaving, setIsSaving] = useState(false);

  // Get the insight from location state
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    // Get insight from session storage or navigate back if not found
    const storedInsight = sessionStorage.getItem("checkInInsight");
    if (storedInsight) {
      setInsight(storedInsight);
      sessionStorage.removeItem("checkInInsight");
    } else {
      navigate("/check-in");
    }
  }, [navigate]);

  const saveWeeklyInsightMutation = trpc.checkIn.saveWeeklyInsight.useMutation({
    onSuccess: () => {
      toast.success("Insight saved for the week!");
      navigate("/");
    },
    onError: () => {
      toast.error("Failed to save insight");
      setIsSaving(false);
    },
  });

  const handleSaveAndContinue = async () => {
    if (!insight) return;
    setIsSaving(true);
    saveWeeklyInsightMutation.mutate({ insight });
  };

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-20 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={() => navigate("/check-in")}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Today's Insight</h1>
            <p className="text-sm text-muted-foreground">From your check-in</p>
          </div>
        </motion.div>

        {/* Insight Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 rounded-2xl p-6 border border-teal-200 dark:border-teal-800 mb-8 min-h-[300px] flex flex-col justify-center"
        >
          {insight ? (
            <div className="space-y-4">
              <Streamdown className="text-foreground leading-relaxed">
                {insight}
              </Streamdown>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={32} className="animate-spin text-teal-600" />
            </div>
          )}
        </motion.div>

        {/* Save and Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="space-y-3"
        >
          <Button
            onClick={handleSaveAndContinue}
            disabled={!insight || isSaving}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 rounded-xl font-semibold transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "✓ Save & Continue"
            )}
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full h-12 rounded-xl font-semibold"
          >
            Skip for now
          </Button>
        </motion.div>

        {/* Info text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="text-xs text-muted-foreground text-center mt-6"
        >
          This insight will be saved to your weekly reflection digest
        </motion.p>
      </div>
    </AppShell>
  );
}
