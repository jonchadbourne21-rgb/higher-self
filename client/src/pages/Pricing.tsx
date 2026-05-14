import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Zap, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect } from "react";
import AppShell from "@/components/AppShell";

const STRIPE_CHECKOUT_MONTHLY = "https://buy.stripe.com/test_14A5kC1EB85s5SQe9fco000";
const STRIPE_CHECKOUT_YEARLY = "https://buy.stripe.com/test_7sYdR8dnj71o1CA5CJco001";

const PRICING_TIERS = [
  {
    name: "Free",
    description: "Perfect for getting started",
    price: "$0",
    period: "forever",
    cta: "Current Plan",
    ctaVariant: "outline" as const,
    highlight: false,
    features: [
      { name: "5 AI chats per day", included: true },
      { name: "4 journal entries per week", included: true },
      { name: "Unlimited life domains & habits", included: true },
      { name: "Daily check-ins", included: true },
      { name: "Weekly insights", included: true },
      { name: "3-day streak reward wheel", included: true },
      { name: "Reward points system", included: true },
      { name: "Priority support", included: false },
      { name: "Advanced analytics", included: false },
      { name: "Custom integrations", included: false },
    ],
  },
  {
    name: "Pro",
    description: "Unlimited growth & insights",
    price: "$2.99",
    period: "per month",
    priceAnnual: "$39.99/year",
    cta: "Upgrade to Pro",
    ctaVariant: "default" as const,
    highlight: true,
    checkoutUrl: STRIPE_CHECKOUT_MONTHLY,
    checkoutUrlAnnual: STRIPE_CHECKOUT_YEARLY,
    features: [
      { name: "Unlimited AI chats", included: true },
      { name: "Unlimited journal entries", included: true },
      { name: "Unlimited life domains & habits", included: true },
      { name: "Daily check-ins", included: true },
      { name: "Weekly insights", included: true },
      { name: "3-day streak reward wheel", included: true },
      { name: "Reward points system", included: true },
      { name: "Priority support", included: true },
      { name: "Advanced analytics & trends", included: true },
      { name: "Custom integrations", included: true },
    ],
  },
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
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <AppShell>
        <div className="px-5 pt-8 pb-4 space-y-6">
          <div className="h-96 bg-gradient-to-b from-background/50 to-background/20 rounded-3xl animate-pulse" />
        </div>
      </AppShell>
    );
  }

  const handleUpgrade = (billingPeriod: "monthly" | "yearly" = "monthly") => {
    // Open Stripe checkout in new tab
    const url = billingPeriod === "yearly" ? STRIPE_CHECKOUT_YEARLY : STRIPE_CHECKOUT_MONTHLY;
    window.open(url, "_blank");
  };

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-4 space-y-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="flex justify-center mb-2">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663398434536/LQwmD5t86EFFZjkEDkXbgz/mentrove-icon-transparent-XGQUfu4fN7im4fQNKmSvzr.webp"
              alt="Mentrove"
              className="w-16 h-16 rounded-full object-cover"
              style={{ boxShadow: "0 0 24px oklch(0.46 0.14 295 / 0.3)" }}
            />
          </div>
          <h1 className="text-4xl font-serif font-light">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground text-lg">
            Choose the plan that fits your growth journey
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {PRICING_TIERS.map((tier, idx) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`rounded-3xl p-8 space-y-6 relative ${
                tier.highlight
                  ? "bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 shadow-lg"
                  : "bg-white border border-border"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                    <Sparkles size={14} /> Most Popular
                  </span>
                </div>
              )}

              {/* Tier Name */}
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-semibold">{tier.name}</h2>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-serif font-semibold">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">/{tier.period}</span>
                </div>
                {tier.priceAnnual && (
                  <p className="text-xs text-primary font-medium">{tier.priceAnnual} (save 17%)</p>
                )}
              </div>

              {/* CTA Button */}
              {tier.name === "Pro" ? (
                <div className="space-y-2">
                  <Button
                    onClick={() => handleUpgrade("monthly")}
                    variant={tier.ctaVariant}
                    className="w-full rounded-2xl py-5 text-base font-medium"
                  >
                    {tier.cta} - Monthly
                  </Button>
                  <Button
                    onClick={() => handleUpgrade("yearly")}
                    variant="outline"
                    className="w-full rounded-2xl py-5 text-base font-medium"
                  >
                    {tier.cta} - Yearly (Save 17%)
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => handleUpgrade()}
                  variant={tier.ctaVariant}
                  className="w-full rounded-2xl py-5 text-base font-medium"
                  disabled={tier.name === "Free"}
                >
                  {tier.cta}
                </Button>
              )}

              {/* Features */}
              <div className="space-y-3 pt-6 border-t border-border/50">
                {tier.features.map((feature, i) => (
                  <motion.div
                    key={feature.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 + i * 0.02 }}
                    className="flex items-center gap-3"
                  >
                    {feature.included ? (
                      <Check size={18} className="text-primary flex-shrink-0" />
                    ) : (
                      <X size={18} className="text-muted-foreground/30 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        feature.included ? "text-foreground" : "text-muted-foreground/50"
                      }`}
                    >
                      {feature.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Milestone Rewards Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-serif font-semibold flex items-center justify-center gap-2">
              <Zap size={24} className="text-primary" /> Earn Free Pro Access
            </h2>
            <p className="text-muted-foreground">
              Build consistency streaks and unlock free Pro access
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {MILESTONES.map((milestone, idx) => (
              <motion.div
                key={milestone.days}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="rounded-2xl p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 space-y-3"
              >
                <div className="text-4xl">{milestone.icon}</div>
                <div>
                  <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  <p className="text-lg font-semibold text-foreground">{milestone.reward}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-2xl p-6 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200/50 space-y-3">
            <div className="flex items-center gap-2">
              <Heart size={20} className="text-primary" />
              <p className="font-semibold">Consistency is Rewarded</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Every 3-day streak unlocks a spin on the reward wheel with chances to win free Pro access, discount codes, and reward points. The more consistent you are, the more you earn!
            </p>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          <h2 className="text-2xl font-serif font-semibold text-center">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes! You can cancel your Pro subscription at any time from your account settings. Your access will continue until the end of your billing period.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit and debit cards through Stripe. Your payment information is secure and encrypted.",
              },
              {
                q: "Do I get a free trial?",
                a: "We offer a free tier with 5 chats per day and 4 journals per week. Upgrade to Pro anytime to unlock unlimited access.",
              },
              {
                q: "Can I earn free Pro through streaks?",
                a: "Absolutely! Reach a 30-day streak to earn 2 months free Pro, or a 100-day streak to earn 1 year free Pro. Plus, every 3-day streak gives you a chance to spin the reward wheel!",
              },
              {
                q: "What if I need help?",
                a: "Pro users get priority support. Contact us anytime at support@synapset.com or use the help button in the app.",
              },
            ].map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + idx * 0.05 }}
                className="rounded-2xl p-4 bg-white border border-border space-y-2"
              >
                <p className="font-semibold text-foreground">{faq.q}</p>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-2xl mx-auto text-center space-y-4 py-8"
        >
          <h3 className="text-2xl font-serif font-semibold">Ready to unlock your potential?</h3>
          <p className="text-muted-foreground">
            Start with free, upgrade anytime. No credit card required to get started.
          </p>
          <Button
            onClick={() => handleUpgrade("monthly")}
            size="lg"
            className="rounded-2xl px-8 py-6 text-base font-medium"
          >
            Upgrade to Pro Now
          </Button>
        </motion.div>
      </div>
    </AppShell>
  );
}
