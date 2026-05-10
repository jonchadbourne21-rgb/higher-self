import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Zap } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: "chat" | "journal";
}

export function UpgradeModal({ isOpen, onClose, limitType }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "annual">("monthly");

  const createCheckoutMutation = trpc.subscription.createCheckoutSession.useMutation();

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const result = await createCheckoutMutation.mutateAsync({
        billingCycle: selectedBilling,
      });

      if (result.checkoutUrl) {
        window.open(result.checkoutUrl, "_blank");
        onClose();
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const limitMessage =
    limitType === "chat"
      ? "You've reached your 5 daily chats limit"
      : "You've reached your 4 weekly journals limit";

  const proFeature =
    limitType === "chat"
      ? "Unlimited daily chats with your AI Mirror"
      : "Unlimited weekly journal entries";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>{limitMessage}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Feature highlight */}
          <div className="rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-teal-900">Pro Tier Includes</h3>
                <ul className="mt-2 space-y-1 text-sm text-teal-800">
                  <li>✓ {proFeature}</li>
                  <li>✓ Growth insights & analytics</li>
                  <li>✓ Advanced habit tracking</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Pricing options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Choose your plan:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedBilling("monthly")}
                className={`rounded-lg border-2 p-3 text-center transition ${
                  selectedBilling === "monthly"
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="font-semibold text-teal-600">$2.99</div>
                <div className="text-xs text-gray-600">/month</div>
              </button>
              <button
                onClick={() => setSelectedBilling("annual")}
                className={`rounded-lg border-2 p-3 text-center transition relative ${
                  selectedBilling === "annual"
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="absolute -top-2 right-2 bg-teal-500 text-white text-xs px-2 py-0.5 rounded">
                  Save 17%
                </div>
                <div className="font-semibold text-teal-600">$39.99</div>
                <div className="text-xs text-gray-600">/year</div>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Maybe later
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {isLoading ? "Loading..." : "Upgrade Now"}
            </Button>
          </div>

          {/* Trust message */}
          <p className="text-xs text-center text-gray-500">
            Secure payment powered by Stripe. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
