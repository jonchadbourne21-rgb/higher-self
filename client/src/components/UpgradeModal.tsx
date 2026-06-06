import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Zap, Mic, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: "chat" | "journal" | "voice" | "program" | "trial_expired";
}

export function UpgradeModal({ isOpen, onClose, limitType }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "annual">("monthly");

  const createCheckoutMutation = trpc.subscription.createCheckoutSession.useMutation();

  // Voice and trial_expired upsell to Premium Pro (pro_voice); others to Pro
  const targetTier = (limitType === "voice" || limitType === "trial_expired") ? "pro_voice" : "pro";

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const result = await createCheckoutMutation.mutateAsync({
        billingCycle: selectedBilling,
        tier: targetTier,
      });

      if (result.checkoutUrl) {
        toast.info("Redirecting to checkout...");
        window.open(result.checkoutUrl, "_blank");
        onClose();
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to create checkout session");
    } finally {
      setIsLoading(false);
    }
  };

  const config = {
    chat: {
      message: "Your free trial has ended — upgrade to keep chatting with your Mirror",
      title: "Upgrade to Pro",
      icon: <Zap className="h-5 w-5" style={{ color: "oklch(0.65 0.16 185)" }} />,
      features: [
        "Unlimited daily chats with your AI Mirror",
        "Unlimited journal entries",
        "Unlimited growth programs",
        "Full Dashboard & analytics",
      ],
      price: { monthly: "$9.99", annual: "$104.99" },
      savings: "Save 12%",
      accentColor: "oklch(0.65 0.16 185)",
    },
    journal: {
      message: "Your free trial has ended — upgrade to keep journaling",
      title: "Upgrade to Pro",
      icon: <Zap className="h-5 w-5" style={{ color: "oklch(0.65 0.16 185)" }} />,
      features: [
        "Unlimited journal entries",
        "Unlimited daily chats",
        "Unlimited growth programs",
        "Full Dashboard & analytics",
      ],
      price: { monthly: "$9.99", annual: "$104.99" },
      savings: "Save 12%",
      accentColor: "oklch(0.65 0.16 185)",
    },
    voice: {
      message: "Voice Mirror is a Premium Pro feature",
      title: "Upgrade to Premium Pro",
      icon: <Mic className="h-5 w-5" style={{ color: "oklch(0.70 0.15 300)" }} />,
      features: [
        "Unlimited Voice Mirror sessions",
        "Real-time emotion tracking",
        "Everything in Pro included",
        "Save voice insights to journal",
      ],
      price: { monthly: "$13.99", annual: "$149.99" },
      savings: "Save 11%",
      accentColor: "oklch(0.70 0.15 300)",
    },
    program: {
      message: "Your free trial has ended — upgrade to access growth programs",
      title: "Upgrade to Pro",
      icon: <Zap className="h-5 w-5" style={{ color: "oklch(0.65 0.16 185)" }} />,
      features: [
        "Unlimited active programs",
        "Unlimited daily chats",
        "Unlimited journal entries",
        "Full Dashboard & analytics",
      ],
      price: { monthly: "$9.99", annual: "$104.99" },
      savings: "Save 12%",
      accentColor: "oklch(0.65 0.16 185)",
    },
    trial_expired: {
      message: "Your 10-day free trial has ended. Keep your growth journey going.",
      title: "Your Trial Has Ended",
      icon: <Sparkles className="h-5 w-5" style={{ color: "oklch(0.70 0.15 300)" }} />,
      features: [
        "Unlimited Voice Mirror sessions",
        "Unlimited chats, journals & programs",
        "Real-time emotion tracking",
        "Full growth analytics & insights",
      ],
      price: { monthly: "$13.99", annual: "$149.99" },
      savings: "Save 11%",
      accentColor: "oklch(0.70 0.15 300)",
    },
  };

  const c = config[limitType];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" style={{ background: "oklch(0.15 0.04 280)", border: "1px solid oklch(0.28 0.05 280)" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: "oklch(0.93 0.01 270)" }}>
            <AlertCircle className="h-5 w-5 text-amber-500" />
            {c.title}
          </DialogTitle>
          <DialogDescription style={{ color: "oklch(0.60 0.03 270)" }}>{c.message}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Feature highlight */}
          <div className="rounded-xl p-4" style={{ background: "oklch(0.20 0.05 280)", border: `1px solid ${c.accentColor}40` }}>
            <div className="flex items-start gap-3">
              {c.icon}
              <div>
                <h3 className="font-semibold text-sm" style={{ color: c.accentColor }}>
                  {targetTier === "pro_voice" ? "Premium Pro" : "Pro"} Includes
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {c.features.map((f) => (
                    <li key={f} className="text-xs flex items-center gap-1.5" style={{ color: "oklch(0.80 0.02 270)" }}>
                      <span style={{ color: c.accentColor }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Pricing options */}
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "oklch(0.70 0.03 270)" }}>Choose your plan:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedBilling("monthly")}
                className="rounded-xl p-3 text-center transition"
                style={{
                  border: selectedBilling === "monthly" ? `2px solid ${c.accentColor}` : "2px solid oklch(0.28 0.05 280)",
                  background: selectedBilling === "monthly" ? `${c.accentColor}15` : "oklch(0.17 0.04 280)",
                }}
              >
                <div className="font-bold text-sm" style={{ color: c.accentColor }}>{c.price.monthly}</div>
                <div className="text-[10px]" style={{ color: "oklch(0.55 0.03 270)" }}>/month</div>
              </button>
              <button
                onClick={() => setSelectedBilling("annual")}
                className="rounded-xl p-3 text-center transition relative"
                style={{
                  border: selectedBilling === "annual" ? `2px solid ${c.accentColor}` : "2px solid oklch(0.28 0.05 280)",
                  background: selectedBilling === "annual" ? `${c.accentColor}15` : "oklch(0.17 0.04 280)",
                }}
              >
                <div
                  className="absolute -top-2 right-2 text-[9px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: c.accentColor, color: "oklch(0.10 0.02 280)" }}
                >
                  {(c as { savings?: string }).savings ?? "Save 12%"}
                </div>
                <div className="font-bold text-sm" style={{ color: c.accentColor }}>{c.price.annual}</div>
                <div className="text-[10px]" style={{ color: "oklch(0.55 0.03 270)" }}>/year</div>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              style={{ borderColor: "oklch(0.30 0.05 280)", color: "oklch(0.70 0.03 270)" }}
            >
              Maybe later
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="flex-1"
              style={{ background: c.accentColor, color: "oklch(0.10 0.02 280)" }}
            >
              {isLoading ? "Loading..." : "Upgrade Now"}
            </Button>
          </div>

          {/* Trust message */}
          <p className="text-[10px] text-center" style={{ color: "oklch(0.45 0.03 270)" }}>
            Secure payment via Stripe · Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
