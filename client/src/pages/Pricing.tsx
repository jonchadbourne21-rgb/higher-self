import { useAuth } from "@/_core/hooks/useAuth";
import { Check, X, Sparkles, Zap, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect } from "react";

const STRIPE_CHECKOUT_MONTHLY = "https://buy.stripe.com/test_14A5kC1EB85s5SQe9fco000";
const STRIPE_CHECKOUT_YEARLY = "https://buy.stripe.com/test_7sYdR8dnj71o1CA5CJco001";

const FREE_FEATURES = [
  { name: "5 AI chats per day", included: true },
  { name: "4 journal entries per week", included: true },
  { name: "Life domains & habits", included: true },
  { name: "Daily check-ins", included: true },
  { name: "Weekly insights only", included: true },
  { name: "Reward wheel", included: true },
  { name: "Growth Dashboard", included: false },
  { name: "Monthly & yearly analytics", included: false },
  { name: "Priority support", included: false },
];

const PRO_FEATURES = [
  { name: "Unlimited AI chats", included: true },
  { name: "Unlimited journals", included: true },
  { name: "Life domains & habits", included: true },
  { name: "Daily check-ins", included: true },
  { name: "Weekly + monthly + yearly insights", included: true },
  { name: "Reward wheel", included: true },
  { name: "Growth Dashboard & full analytics", included: true },
  { name: "Bonus spins on purchase", included: true },
  { name: "Priority support", included: true },
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

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4 space-y-6">
          <div className="h-96 rounded-2xl animate-pulse" style={{ background: "oklch(0.18 0.04 280)" }} />
        </div>
    );
  }

  const handleUpgrade = (billingPeriod: "monthly" | "yearly" = "monthly") => {
    const url = billingPeriod === "yearly" ? STRIPE_CHECKOUT_YEARLY : STRIPE_CHECKOUT_MONTHLY;
    window.open(url, "_blank");
  };

  return (
    <div className="px-4 pt-4 pb-4 space-y-8">
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
          <p className="text-xs" style={{ color: "oklch(0.58 0.03 270)" }}>
            Start free, upgrade when you're ready
          </p>
        </motion.div>

        {/* Side-by-side Pricing Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Free Tier */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl p-4 space-y-3"
            style={{
              background: "oklch(0.17 0.04 280)",
              border: "1px solid oklch(0.28 0.05 280)",
            }}
          >
            <div>
              <h2 className="text-base font-semibold" style={{ color: "oklch(0.85 0.02 270)" }}>Free</h2>
              <p className="text-[10px]" style={{ color: "oklch(0.55 0.03 270)" }}>Get started</p>
            </div>

            <div>
              <span className="text-2xl font-bold" style={{ color: "oklch(0.90 0.01 270)" }}>$0</span>
              <span className="text-[10px] ml-1" style={{ color: "oklch(0.55 0.03 270)" }}>/forever</span>
            </div>

            <button
              disabled
              className="w-full rounded-xl py-2 text-xs font-medium opacity-50 cursor-not-allowed"
              style={{
                background: "oklch(0.22 0.04 280)",
                border: "1px solid oklch(0.32 0.05 280)",
                color: "oklch(0.60 0.03 270)",
              }}
            >
              Current Plan
            </button>

            <div className="space-y-2 pt-2" style={{ borderTop: "1px solid oklch(0.25 0.04 280)" }}>
              {FREE_FEATURES.map((f) => (
                <div key={f.name} className="flex items-start gap-1.5">
                  {f.included ? (
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.16 185)" }} />
                  ) : (
                    <X size={12} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.35 0.03 270)" }} />
                  )}
                  <span
                    className="text-[10px] leading-tight"
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
            className="rounded-2xl p-4 space-y-3 relative"
            style={{
              background: "linear-gradient(135deg, oklch(0.20 0.06 280), oklch(0.17 0.05 290))",
              border: "1.5px solid oklch(0.65 0.16 185 / 0.4)",
              boxShadow: "0 0 20px oklch(0.65 0.16 185 / 0.08)",
            }}
          >
            {/* Popular badge */}
            <div
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-1"
              style={{ background: "oklch(0.65 0.16 185)", color: "oklch(0.10 0.02 185)" }}
            >
              <Sparkles size={9} /> PRO
            </div>

            <div>
              <h2 className="text-base font-semibold" style={{ color: "oklch(0.93 0.01 270)" }}>Pro</h2>
              <p className="text-[10px]" style={{ color: "oklch(0.65 0.16 185)" }}>Unlimited access</p>
            </div>

            <div>
              <span className="text-2xl font-bold" style={{ color: "oklch(0.93 0.01 270)" }}>$3.99</span>
              <span className="text-[10px] ml-1" style={{ color: "oklch(0.55 0.03 270)" }}>/month</span>
            </div>

            {/* Monthly button — teal */}
            <button
              onClick={() => handleUpgrade("monthly")}
              className="w-full rounded-xl py-2 text-xs font-semibold transition-transform active:scale-95"
              style={{
                background: "oklch(0.65 0.16 185)",
                color: "oklch(0.10 0.02 185)",
              }}
            >
              Monthly + 1 Free Spin 🎡
            </button>

            {/* Yearly button — same teal */}
            <button
              onClick={() => handleUpgrade("yearly")}
              className="w-full rounded-xl py-2 text-xs font-semibold transition-transform active:scale-95"
              style={{
                background: "oklch(0.65 0.16 185)",
                color: "oklch(0.10 0.02 185)",
              }}
            >
              Yearly — $49.99 + 3 Free Spins 🎡
            </button>

            <div className="space-y-2 pt-2" style={{ borderTop: "1px solid oklch(0.30 0.06 280)" }}>
              {PRO_FEATURES.map((f) => (
                <div key={f.name} className="flex items-start gap-1.5">
                  <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.16 185)" }} />
                  <span className="text-[10px] leading-tight" style={{ color: "oklch(0.85 0.02 270)" }}>
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
              Every 3-day streak unlocks a spin on the reward wheel with chances to win free Pro access, discount codes, and reward points.
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
                q: "What payment methods?",
                a: "All major credit and debit cards through Stripe. Secure and encrypted.",
              },
              {
                q: "Do I get a free trial?",
                a: "The free tier gives you 5 chats/day and 4 journals/week. Upgrade to Pro anytime.",
              },
              {
                q: "Can I earn free Pro?",
                a: "Yes! 30-day streak = 2 months free. 100-day streak = 1 year free. Plus reward wheel spins every 3 days.",
              },
              {
                q: "Need help?",
                a: "Pro users get priority support. Use the help button in the app or contact us directly.",
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
            onClick={() => handleUpgrade("monthly")}
            className="w-full rounded-xl py-3.5 text-sm font-semibold transition-transform active:scale-95"
            style={{
              background: "oklch(0.65 0.16 185)",
              color: "oklch(0.10 0.02 185)",
            }}
          >
            Upgrade to Pro Now
          </button>
          <p className="text-[10px]" style={{ color: "oklch(0.50 0.03 270)" }}>
            No commitment · Cancel anytime
          </p>
        </motion.div>
      </div>
  );
}
