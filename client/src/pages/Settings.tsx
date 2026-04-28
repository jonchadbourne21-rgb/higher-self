import { useState } from "react";
import { motion } from "framer-motion";
import { User, Phone, Mail, Heart, Save, ArrowLeft, CheckCircle, PhoneCall, AtSign, LogOut, Sparkles, Award } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MilestonesList } from "@/components/MilestoneCard";
import { toast } from "sonner";

function MilestonesSection() {
  const { data: milestones, isLoading } = trpc.habits.milestones.useQuery();
  const { data: milestoneCount } = trpc.habits.milestoneCount.useQuery();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Award className="w-5 h-5" />
          Milestones
        </h2>
        {milestoneCount && milestoneCount.count > 0 && (
          <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            {milestoneCount.count} Achievement{milestoneCount.count !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <MilestonesList milestones={milestones || []} isLoading={isLoading} />
    </motion.div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const updateSettings = trpc.settings.update.useMutation();
  const utils = trpc.useUtils();

  const [saved, setSaved] = useState(false);
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);

  const INTENT_OPTIONS = [
    { id: "inner-peace", label: "Inner Peace", emoji: "🧘" },
    { id: "clarity", label: "Clarity", emoji: "🔮" },
    { id: "confidence", label: "Confidence", emoji: "⚡" },
    { id: "healing", label: "Healing", emoji: "🌿" },
    { id: "focus", label: "Focus", emoji: "🎯" },
  ];

  // TODO: Re-enable after seedIntent column is added to database
  // const updateIntentMutation = trpc.onboarding.saveSeedIntent.useMutation({...});
  
  // Temporary mock
  const updateIntentMutation = { mutate: () => { setShowIntentModal(false); }, isPending: false };

  const handleChangeIntent = (intentId: string) => {
    setSelectedIntent(intentId);
    // TODO: Re-enable after seedIntent column is added
    // updateIntentMutation.mutate({ seedIntent: intentId });
    setShowIntentModal(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out");
      navigate("/");
    } catch {
      toast.error("Logout failed");
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse">Loading...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/home">
            <ArrowLeft className="w-5 h-5 cursor-pointer" />
          </Link>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={user?.name || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </motion.div>

          {/* Intention Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Your Intention
            </h2>
            <Button
              onClick={() => setShowIntentModal(true)}
              variant="outline"
              className="w-full"
            >
              Change Your Intention
            </Button>
          </motion.div>

          {/* Milestones Section */}
          <MilestonesSection />

          {/* Logout Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <LogOut className="w-5 h-5" />
              Account
            </h2>
            <Button
              onClick={() => setShowLogoutConfirm(true)}
              variant="destructive"
              className="w-full"
            >
              Sign Out
            </Button>
          </motion.div>
        </div>

        {/* Intent Modal */}
        <Dialog open={showIntentModal} onOpenChange={setShowIntentModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Your Intention</DialogTitle>
              <DialogDescription>
                Select what brings you to your mirror today
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {INTENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleChangeIntent(option.id)}
                  className="p-4 rounded-lg border-2 border-gray-200 hover:border-violet-500 hover:bg-violet-50 transition-all text-center"
                >
                  <div className="text-2xl mb-2">{option.emoji}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Logout Confirmation Dialog */}
        <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign Out?</DialogTitle>
              <DialogDescription>
                Are you sure you want to sign out? You'll need to log in again to access your mirror.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="flex-1"
              >
                Sign Out
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
