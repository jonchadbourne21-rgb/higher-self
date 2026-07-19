import { useAuth } from "@/_core/hooks/useAuth";
import { Check, X, Sparkles, Zap, Heart, Mic } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { isNative } from "@/lib/platform";
import { getCurrentOfferings, purchasePackage, restorePurchases } from "@/lib/purchases";

const FREE_FEATURES = [
  { name: "3 AI chats per day", included: true },
  { name: "2 journal entries per week", included: true },
  { name: "Life domains & habits", included: true },
  { name: "Daily check-ins", included: true },
  { name: "Streak rewards", included: true },
  { name: "Unlimited programs", included: false },
  { name: "Growth Dashboard", included: false },
  { name: "Voice Mirror", included: false },
];

const PRO_FEATURES = [
  { name: "Unlimited AI chats", included: true },
  { name: "Unlimited journals", included: true },
  { name: "Unlimited programs", included: true },
  { name: "Life domains & habits", included: true },
  { name: "Weekly + monthly + yearly insights", included: true },
  { name: "Growth Dashboard & analytics", included: true },
  { name: "Bonus reward points on purchase", included: true },
  { name: "Priority support", included: true },
  { name: "Voice Mirror sessions", included: false },
];

const PRO_VOICE_FEATURES = [
  { name: "Everything in Pro", included: true },
  { name: "Unlimited voice mirror sessions", included: true },
  { name: "Real-time emotion tracking", included: true },
  { name: "Voice session history", included: true },
  { name: "Save voice insights to journal", included: true },
  { name: "Priority voice processing", included: true },
];

const MILESTONES = [
  {
    days: 30,
    reward: "2 Months Free Pro",
    icon: "🎯",
    description: "Reach a 30-day consistency streak",
  },
  {
    days: 100,
    reward: "1 Year Free Pro",
    icon: "🏆",
    description: "Reach a 100-day consistency streak",
  },
];

export default function Pricing() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);

  const createCheckoutMutation = trpc.subscription.createCheckoutSession.useMutation();
  const subscriptionStatus = trpc.subscription.getStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <AppShell>
        <div className="px-4 pt-6 pb-4 space-y-6">
          <div className="h-96 rounded-2xl animate-pulse" style={{ background: "oklch(0.18 0.04 280)" }} />
        </div>
      </AppShell>
    );
  }

  const currentTier = subscriptionStatus.data?.tier || "free";

  const handleUpgrade = async (tier: "pro" | "pro_voice", billingCycle: "monthly" | "annual" = "monthly") => {
    setIsLoadingCheckout(true);
    try {
      if (isNative()) {
        // Native: use RevenueCat In-App Purchase
        const offerings = await getCurrentOfferings();
        if (!offerings || !offerings.availablePackages?.length) {
          toast.error("No subscription packages available. Please try again later.");
          return;
        }
        // Match the package by identifier convention: pro_monthly, pro_annual, pro_voice_monthly, pro_voice_annual
        const targetId = `${tier}_${billingCycle}`;
        const pkg = offerings.availablePackages.find(
          (p: any) => p.identifier?.includes(targetId) || p.identifier?.includes(tier)
        ) || offerings.availablePackages[0];
        await purchasePackage(pkg);
        toast.success("Purchase successful! Pro features are now active.");
        subscriptionStatus.refetch();
      } else {
        // Web: use Stripe Checkout
        const result = await createCheckoutMutation.mutateAsync({ billingCycle, tier });
        if (result.checkoutUrl) {
          toast.info("Redirecting to checkout...");
          window.open(result.checkoutUrl, "_blank");
        }
      }
    } catch (error: any) {
      if (error?.message?.includes("cancelled") || error?.code === "USER_CANCELLED") {
        // User cancelled the purchase — not an error
        return;
      }
      toast.error("Failed to process purchase. Please try again.");
      console.error("Checkout error:", error);
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!isNative()) return;
    try {
      await restorePurchases();
      toast.success("Purchases restored successfully.");
      subscriptionStatus.refetch();
    } catch {
      toast.error("Could not restore purchases. Please try again.");
    }
  };

  return (
    <AppShell>
      <div className="px-4 pt-4 pb-4 space-y-8 max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1
            className="text-2xl font-light tracking-wide"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "oklch(0.93 0.01 270)" }}
          >
            Choose Your Plan
          </h1>
          {/* Trial badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mx-auto"
            style={{ background: "oklch(0.65 0.16 185 / 0.15)", border: "1px solid oklch(0.65 0.16 185 / 0.4)", color: "oklch(0.65 0.16 185)" }}
          >
            <Sparkles size={11} /> 10-Day Free Trial — Full Access Included
          </div>
          <p className="text-xs" style={{ color: "oklch(0.58 0.03 270)" }}>
            Try everything free for 10 days, then choose the plan that fits
          </p>
        </motion.div>

        {/* Three Tier Cards */}
        <div className="space-y-4">
          {/* Free Tier */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: "oklch(0.17 0.04 280)",
              border: currentTier === "free" ? "1.5px solid oklch(0.65 0.16 185 / 0.5)" : "1px solid oklch(0.28 0.05 280)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "oklch(0.85 0.02 270)" }}>Free</h2>
                <p className="text-[11px]" style={{ color: "oklch(0.55 0.03 270)" }}>Get started on your journey</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold" style={{ color: "oklch(0.90 0.01 270)" }}>$0</span>
                <span className="text-[11px] ml-1" style={{ color: "oklch(0.55 0.03 270)" }}>/forever</span>
              </div>
            </div>

            {currentTier === "free" && (
              <div
                className="rounded-xl py-2 text-center text-xs font-medium"
                style={{ background: "oklch(0.22 0.04 280)", border: "1px solid oklch(0.32 0.05 280)", color: "oklch(0.65 0.16 185)" }}
              >
                Current Plan
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {FREE_FEATURES.map((f) => (
                <div key={f.name} className="flex items-start gap-1.5">
                  {f.included ? (
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.16 185)" }} />
                  ) : (
                    <X size={12} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.35 0.03 270)" }} />
                  )}
                  <span
                    className="text-[11px] leading-tight"
                    style={{ color: f.included ? "oklch(0.78 0.02 270)" : "oklch(0.40 0.03 270)" }}
                  >
                    {f.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pro Tier */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-5 space-y-4 relative"
            style={{
              background: "linear-gradient(135deg, oklch(0.20 0.06 280), oklch(0.17 0.05 290))",
              border: currentTier === "pro" ? "1.5px solid oklch(0.65 0.16 185)" : "1.5px solid oklch(0.65 0.16 185 / 0.4)",
              boxShadow: "0 0 20px oklch(0.65 0.16 185 / 0.08)",
            }}
          >
            {/* Popular badge */}
            <div
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1"
              style={{ background: "oklch(0.65 0.16 185)", color: "oklch(0.10 0.02 185)" }}
            >
              <Sparkles size={10} /> POPULAR
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "oklch(0.93 0.01 270)" }}>Pro</h2>
                <p className="text-[11px]" style={{ color: "oklch(0.65 0.16 185)" }}>Unlimited growth</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold" style={{ color: "oklch(0.93 0.01 270)" }}>$9.99</span>
                <span className="text-[11px] ml-1" style={{ color: "oklch(0.55 0.03 270)" }}>/month</span>
              </div>
            </div>

            {currentTier === "pro" ? (
              <div
                className="rounded-xl py-2.5 text-center text-xs font-medium"
                style={{ background: "oklch(0.65 0.16 185 / 0.15)", border: "1px solid oklch(0.65 0.16 185 / 0.4)", color: "oklch(0.65 0.16 185)" }}
              >
                Current Plan
              </div>
            ) : currentTier === "pro_voice" ? (
              <div
                className="rounded-xl py-2.5 text-center text-xs font-medium"
                style={{ background: "oklch(0.22 0.04 280)", color: "oklch(0.55 0.03 270)" }}
              >
                Included in your plan
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpgrade("pro", "monthly")}
                  disabled={isLoadingCheckout}
                  className="rounded-xl py-2.5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-50"
                  style={{ background: "oklch(0.65 0.16 185)", color: "oklch(0.10 0.02 185)" }}
                >
                  Monthly — $9.99
                </button>
                <button
                  onClick={() => handleUpgrade("pro", "annual")}
                  disabled={isLoadingCheckout}
                  className="relative rounded-xl py-2.5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-50"
                  style={{ background: "oklch(0.65 0.16 185)", color: "oklch(0.10 0.02 185)" }}
                >
                  <span className="absolute -top-2 -right-1 text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "oklch(0.72 0.18 35)", color: "white" }}>Save 12%</span>
                  Annual — $104.99
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2" style={{ borderTop: "1px solid oklch(0.30 0.06 280)" }}>
              {PRO_FEATURES.map((f) => (
                <div key={f.name} className="flex items-start gap-1.5">
                  {f.included ? (
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.16 185)" }} />
                  ) : (
                    <X size={12} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.35 0.03 270)" }} />
                  )}
                  <span
                    className="text-[11px] leading-tight"
                    style={{ color: f.included ? "oklch(0.85 0.02 270)" : "oklch(0.40 0.03 270)" }}
                  >
                    {f.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pro + Voice Mirror Tier */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl p-5 space-y-4 relative"
            style={{
              background: "linear-gradient(135deg, oklch(0.19 0.07 290), oklch(0.16 0.06 300))",
              border: currentTier === "pro_voice" ? "1.5px solid oklch(0.70 0.15 300)" : "1.5px solid oklch(0.70 0.15 300 / 0.4)",
              boxShadow: "0 0 24px oklch(0.70 0.15 300 / 0.1)",
            }}
          >
            {/* Voice badge */}
            <div
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1"
              style={{ background: "oklch(0.70 0.15 300)", color: "oklch(0.10 0.02 300)" }}
            >
              <Mic size={10} /> VOICE
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "oklch(0.93 0.01 270)" }}>Premium Pro</h2>
                <p className="text-[11px]" style={{ color: "oklch(0.70 0.15 300)" }}>Voice Mirror included</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold" style={{ color: "oklch(0.93 0.01 270)" }}>$13.99</span>
                <span className="text-[11px] ml-1" style={{ color: "oklch(0.55 0.03 270)" }}>/month</span>
              </div>
            </div>

            {currentTier === "pro_voice" ? (
              <div
                className="rounded-xl py-2.5 text-center text-xs font-medium"
                style={{ background: "oklch(0.70 0.15 300 / 0.15)", border: "1px solid oklch(0.70 0.15 300 / 0.4)", color: "oklch(0.70 0.15 300)" }}
              >
                Current Plan
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpgrade("pro_voice", "monthly")}
                  disabled={isLoadingCheckout}
                  className="rounded-xl py-2.5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-50"
                  style={{ background: "oklch(0.70 0.15 300)", color: "oklch(0.10 0.02 300)" }}
                >
                  Monthly — $13.99
                </button>
                <button
                  onClick={() => handleUpgrade("pro_voice", "annual")}
                  disabled={isLoadingCheckout}
                  className="relative rounded-xl py-2.5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-50"
                  style={{ background: "oklch(0.70 0.15 300)", color: "oklch(0.10 0.02 300)" }}
                >
                  <span className="absolute -top-2 -right-1 text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "oklch(0.72 0.18 35)", color: "white" }}>Save 11%</span>
                  Annual — $149.99
                </button>
              </div>
            )}

            <div className="space-y-1.5 pt-2" style={{ borderTop: "1px solid oklch(0.30 0.07 290)" }}>
              {PRO_VOICE_FEATURES.map((f) => (
                <div key={f.name} className="flex items-start gap-1.5">
                  <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.70 0.15 300)" }} />
                  <span className="text-[11px] leading-tight" style={{ color: "oklch(0.85 0.02 270)" }}>
                    {f.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Milestone Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="text-center space-y-1">
            <h2
              className="text-lg font-light flex items-center justify-center gap-2"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "oklch(0.90 0.01 270)" }}
            >
              <Zap size={18} style={{ color: "oklch(0.65 0.16 185)" }} /> Earn Free Pro
            </h2>
            <p className="text-[11px]" style={{ color: "oklch(0.55 0.03 270)" }}>
              Build streaks, unlock rewards
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {MILESTONES.map((m, idx) => (
              <motion.div
                key={m.days}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + idx * 0.05 }}
                className="rounded-xl p-3 space-y-1.5"
                style={{
                  background: "oklch(0.17 0.04 280)",
                  border: "1px solid oklch(0.28 0.05 280)",
                }}
              >
                <div className="text-2xl">{m.icon}</div>
                <p className="text-[10px]" style={{ color: "oklch(0.60 0.03 270)" }}>{m.description}</p>
                <p className="text-xs font-semibold" style={{ color: "oklch(0.65 0.16 185)" }}>{m.reward}</p>
              </motion.div>
            ))}
          </div>

          {/* Consistency reward card */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{
              background: "oklch(0.17 0.04 280)",
              border: "1px solid oklch(0.65 0.16 185 / 0.25)",
            }}
          >
            <div className="flex items-center gap-2">
              <Heart size={14} style={{ color: "oklch(0.65 0.16 185)" }} />
              <p className="text-xs font-semibold" style={{ color: "oklch(0.88 0.02 270)" }}>Consistency is Rewarded</p>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: "oklch(0.60 0.03 270)" }}>
              Build streaks across chat, journal, and habits to earn reward points toward free Pro access. Hit 30 days for 2 months free, or 100 days for a full year.
            </p>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2
            className="text-lg font-light text-center"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "oklch(0.90 0.01 270)" }}
          >
            Questions
          </h2>

          <div className="space-y-2.5">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes! Cancel from account settings anytime. Access continues until end of billing period.",
              },
              {
                q: "What's the difference between Pro and Premium Pro?",
                a: "Pro ($9.99/mo) gives unlimited chats, journals, and programs. Premium Pro ($13.99/mo) adds unlimited Voice Mirror sessions — talk to your AI reflection with real-time emotion tracking.",
              },
              {
                q: "Do I get a free trial?",
                a: "Yes! Every new account starts with a 10-day free trial with full access to all features including Voice Mirror. After 10 days, choose a plan to continue.",
              },
              {
                q: "Can I earn free Pro?",
                a: "Yes! 30-day streak = 2 months free. 100-day streak = 1 year free. Plus reward points earned daily through consistent engagement.",
              },
              {
                q: "Can I upgrade from Pro to Premium Pro later?",
                a: "Absolutely. You can upgrade at any time and only pay the difference for the remainder of your billing cycle.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl p-3.5 space-y-1.5"
                style={{
                  background: "oklch(0.17 0.04 280)",
                  border: "1px solid oklch(0.25 0.04 280)",
                }}
              >
                <p className="text-xs font-semibold" style={{ color: "oklch(0.65 0.16 185)" }}>{faq.q}</p>
                <p className="text-[11px] leading-relaxed" style={{ color: "oklch(0.65 0.03 270)" }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center space-y-3 pb-4"
        >
          <p className="text-sm" style={{ color: "oklch(0.70 0.03 270)" }}>
            Ready to unlock your potential?
          </p>
          <button
            onClick={() => handleUpgrade("pro", "monthly")}
            disabled={isLoadingCheckout || currentTier !== "free"}
            className="w-full rounded-xl py-3.5 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50"
            style={{
              background: "oklch(0.65 0.16 185)",
              color: "oklch(0.10 0.02 185)",
            }}
          >
            {currentTier === "free" ? "Start with Pro — $9.99/month" : "You're already on a paid plan ✓"}
          </button>
          {isNative() ? (
            <>
              <button
                onClick={handleRestorePurchases}
                className="text-[11px] underline opacity-70 hover:opacity-100 transition-opacity"
                style={{ color: "oklch(0.65 0.16 185)" }}
              >
                Restore Purchases
              </button>
              <p className="text-[10px]" style={{ color: "oklch(0.50 0.03 270)" }}>
                No commitment · Cancel anytime from your device settings
              </p>
            </>
          ) : (
            <p className="text-[10px]" style={{ color: "oklch(0.50 0.03 270)" }}>
              No commitment · Cancel anytime · Test card: 4242 4242 4242 4242
            </p>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
