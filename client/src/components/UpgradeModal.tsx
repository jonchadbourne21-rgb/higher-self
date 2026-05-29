import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Zap, Mic } from "lucide-react";
import { toast } from "sonner";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: "chat" | "journal" | "voice" | "program";
}

export function UpgradeModal({ isOpen, onClose, limitType }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "annual">("monthly");

  const createCheckoutMutation = trpc.subscription.createCheckoutSession.useMutation();

  // Voice limit should upsell to pro_voice; others upsell to pro
  const targetTier = limitType === "voice" ? "pro_voice" : "pro";

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
      message: "You've reached your 5 daily chats limit",
      title: "Upgrade to Pro",
      icon: <Zap className="h-5 w-5" style={{ color: "oklch(0.65 0.16 185)" }} />,
      features: [
        "Unlimited daily chats with your AI Mirror",
        "Unlimited journal entries",
        "Unlimited programs",
        "Growth Dashboard & analytics",
      ],
      price: { monthly: "$5.99", annual: "$59.99" },
      accentColor: "oklch(0.65 0.16 185)",
    },
    journal: {
      message: "You've reached your 4 weekly journals limit",
      title: "Upgrade to Pro",
      icon: <Zap className="h-5 w-5" style={{ color: "oklch(0.65 0.16 185)" }} />,
      features: [
        "Unlimited weekly journal entries",
        "Unlimited daily chats",
        "Unlimited programs",
        "Growth Dashboard & analytics",
      ],
      price: { monthly: "$5.99", annual: "$59.99" },
      accentColor: "oklch(0.65 0.16 185)",
    },
    voice: {
      message: "You've used your 5 free voice responses this month",
      title: "Upgrade to Pro + Voice Mirror",
      icon: <Mic className="h-5 w-5" style={{ color: "oklch(0.70 0.15 300)" }} />,
      features: [
        "Unlimited voice mirror sessions",
        "Everything in Pro included",
        "Real-time emotion tracking",
        "Save voice insights to journal",
      ],
      price: { monthly: "$8.99", annual: "$89.99" },
      accentColor: "oklch(0.70 0.15 300)",
    },
    program: {
      message: "Free users can enroll in 1 program at a time",
      title: "Upgrade to Pro",
      icon: <Zap className="h-5 w-5" style={{ color: "oklch(0.65 0.16 185)" }} />,
      features: [
        "Unlimited active programs",
        "Unlimited daily chats",
        "Unlimited journal entries",
        "Growth Dashboard & analytics",
      ],
      price: { monthly: "$5.99", annual: "$59.99" },
      accentColor: "oklch(0.65 0.16 185)",
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
                  {targetTier === "pro_voice" ? "Pro + Voice Mirror" : "Pro"} Includes
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
                  Save 17%
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
            Secure payment powered by Stripe. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
