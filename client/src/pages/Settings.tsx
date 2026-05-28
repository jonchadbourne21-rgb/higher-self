import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Phone, Mail, Heart, Save, ArrowLeft, CheckCircle, PhoneCall, AtSign, LogOut, Sparkles, Award, Crown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MilestonesList } from "@/components/MilestoneCard";
import { toast } from "sonner";
import confetti from "canvas-confetti";

function MilestonesSection() {
  const { data: milestones, isLoading } = trpc.habits.milestones.useQuery();
  const { data: milestoneCount } = trpc.habits.milestoneCount.useQuery();
  const { data: streakData } = trpc.habits.currentStreak.useQuery();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-lg p-6 shadow-sm border border-border/30 bg-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Award className="w-5 h-5" />
          Milestones
        </h2>
        {milestoneCount && milestoneCount.count > 0 && (
          <span className="text-sm font-semibold text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full">
            {milestoneCount.count} Achievement{milestoneCount.count !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <MilestonesList
        milestones={milestones || []}
        isLoading={isLoading}
        currentStreak={streakData?.streak ?? 0}
      />
    </motion.div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const { data: proStatus } = trpc.rewards.proStatus.useQuery();
  const updateSettings = trpc.settings.update.useMutation();
  const utils = trpc.useUtils();

  const [saved, setSaved] = useState(false);
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showProCelebration, setShowProCelebration] = useState(false);

  // Detect Stripe success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscription") === "success") {
      setShowProCelebration(true);
      // Remove query param without reload
      window.history.replaceState({}, "", window.location.pathname);
      // Fire confetti
      const fire = () => {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#6d28d9", "#0d9488", "#f59e0b", "#10b981"] });
        confetti({ particleCount: 60, spread: 120, origin: { y: 0.5 }, angle: 60, colors: ["#8b5cf6", "#34d399"] });
        confetti({ particleCount: 60, spread: 120, origin: { y: 0.5 }, angle: 120, colors: ["#a78bfa", "#6ee7b7"] });
      };
      fire();
      setTimeout(fire, 600);
    }
  }, []);

  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Account deleted");
      navigate("/");
    },
    onError: () => {
      toast.error("Failed to delete account. Please try again.");
    },
  });

  const handleDeleteAccount = () => {
    if (deleteConfirmText.trim().toLowerCase() !== "delete") {
      toast.error('Type "delete" to confirm');
      return;
    }
    deleteAccountMutation.mutate();
  };

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
      <div className="flex items-center justify-center h-full">
          <div className="animate-pulse">Loading...</div>
        </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/home">
            <ArrowLeft className="w-5 h-5 cursor-pointer" />
          </Link>
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663398434536/LQwmD5t86EFFZjkEDkXbgz/mentrove-icon-transparent-XGQUfu4fN7im4fQNKmSvzr.webp"
            alt="Mentrove"
            className="w-8 h-8 rounded-full object-cover"
          />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg p-6 shadow-sm border border-border/30 bg-card"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={user?.name || ""}
                    disabled
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border/30 text-foreground"
                  />
                  {proStatus?.isPro && (
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "oklch(0.30 0.10 55)", color: "oklch(0.85 0.18 55)" }}
                    >
                      <Crown className="w-3 h-3" />
                      Pro
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border/30 text-foreground"
                />
              </div>
            </div>
          </motion.div>

          {/* Intention Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg p-6 shadow-sm border border-border/30 bg-card"
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
            className="rounded-lg p-6 shadow-sm border border-border/30 bg-card"
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

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-lg p-6 shadow-sm border border-red-900/40 bg-red-950/20"
          >
            <h2 className="text-xl font-semibold mb-1 text-red-400">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all data. This cannot be undone.</p>
            <Button
              onClick={() => { setDeleteConfirmText(""); setShowDeleteConfirm(true); }}
              variant="outline"
              className="w-full border-red-800/50 text-red-400 hover:bg-red-900/30 hover:text-red-300"
            >
              Delete My Account
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
                  className="p-4 rounded-lg border-2 border-border/30 hover:border-primary hover:bg-primary/10 transition-all text-center"
                >
                  <div className="text-2xl mb-2">{option.emoji}</div>
                  <div className="text-sm font-medium text-foreground">{option.label}</div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Pro Celebration Modal */}
        <Dialog open={showProCelebration} onOpenChange={setShowProCelebration}>
          <DialogContent className="text-center">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
                <Crown className="w-6 h-6 text-amber-400" />
                Welcome to Pro!
              </DialogTitle>
              <DialogDescription className="text-base">
                You’re now a Mentrove Pro member. Your journey just leveled up.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-xl p-4 text-left space-y-2" style={{ background: "oklch(0.18 0.05 280)", border: "1px solid oklch(0.30 0.06 280)" }}>
                <p className="text-sm font-semibold text-foreground">What’s unlocked:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✨ Full monthly &amp; yearly analytics</li>
                  <li>📈 Growth Dashboard — 30d &amp; 1y trends</li>
                  <li>🎯 Bonus free spins added to your Rewards</li>
                  <li>🔓 Unlimited AI Mirror conversations</li>
                </ul>
              </div>
              <Button onClick={() => setShowProCelebration(false)} className="w-full">
                Let’s Go →
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Account Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-400">Delete Account?</DialogTitle>
              <DialogDescription>
                This will permanently erase all your journal entries, check-ins, chat history, habits, and profile data. This action <strong>cannot be undone</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Type <strong className="text-foreground">delete</strong> to confirm:</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="delete"
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                autoComplete="off"
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleteAccountMutation.isPending || deleteConfirmText.trim().toLowerCase() !== "delete"}
                  className="flex-1"
                >
                  {deleteAccountMutation.isPending ? "Deleting…" : "Delete Forever"}
                </Button>
              </div>
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
  );
}
