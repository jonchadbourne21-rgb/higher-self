import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

export default function Privacy() {
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, oklch(0.22 0.12 295 / 0.6) 0%, oklch(0.08 0.04 270) 50%, oklch(0.05 0.02 260) 100%)",
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md border-b"
        style={{
          background: "oklch(0.08 0.04 270 / 0.85)",
          borderColor: "oklch(0.35 0.1 295 / 0.3)",
        }}
      >
        <div className="max-w-[480px] mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1 as never)}
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: "oklch(0.65 0.1 295)" }}
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663398434536/LQwmD5t86EFFZjkEDkXbgz/mirrored-icon-transparent-XGQUfu4fN7im4fQNKmSvzr.webp"
              alt="Mirrored"
              className="w-6 h-6 rounded-full object-cover"
            />
            <span
              className="text-sm font-light tracking-[0.2em] uppercase"
              style={{ color: "oklch(0.85 0.04 80)" }}
            >
              Mirrored
            </span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[480px] mx-auto px-6 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "oklch(0.20 0.08 185 / 0.5)", border: "1px solid oklch(0.40 0.12 185 / 0.4)" }}
            >
              <Shield size={22} style={{ color: "oklch(0.65 0.16 185)" }} />
            </div>
          </div>
          <h2
            className="text-3xl font-light mb-2 tracking-wide"
            style={{
              color: "oklch(0.96 0.02 80)",
              fontFamily: "'Georgia', serif",
              textShadow: "0 0 20px oklch(0.55 0.18 295 / 0.3)",
            }}
          >
            Privacy Policy
          </h2>
          <div
            className="h-px w-32 mx-auto mb-3"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.55 0.18 295 / 0.5), transparent)",
            }}
          />
          <p className="text-sm" style={{ color: "oklch(0.65 0.08 295)" }}>
            Last updated: May 2026
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-6">
          <Section title="Your Privacy Matters">
            Mirrored is built on the principle that your inner world belongs to you. We collect only what
            is necessary to deliver a personalized self-reflection experience, and we never sell, rent, or
            share your personal data with third parties for advertising purposes.
          </Section>

          <Section title="What We Collect">
            We collect information you provide directly: account details (name, email), journal entries,
            check-in responses, chat messages with the AI Mirror, habit data, and domain scores. We also
            collect basic usage analytics (page views, session duration) to improve the product experience.
          </Section>

          <Section title="Data Storage & Encryption">
            All data is stored in encrypted databases with TLS in transit and AES-256 encryption at rest.
            Your journal entries and AI conversations are tied to your account and are never accessible to
            other users. Backups are encrypted and stored in geographically distributed data centers.
          </Section>

          <Section title="AI Processing">
            When you interact with the AI Mirror, your messages are processed by our AI service to generate
            responses. Conversations are stored to maintain context within your sessions. We do not use your
            personal conversations to train AI models. Your reflections remain yours.
          </Section>

          <Section title="Data Retention & Deletion">
            Your data is retained as long as your account is active. You may request full deletion of your
            account and all associated data at any time by contacting support@mirrored.com. Upon deletion
            request, all personal data is permanently removed within 30 days, including backups.
          </Section>

          <Section title="Third-Party Services">
            We use Stripe for payment processing (they handle card details — we never see or store your full
            card number). We use secure cloud infrastructure providers for hosting. These services are bound
            by their own privacy policies and data protection agreements.
          </Section>

          <Section title="Cookies & Analytics">
            We use essential cookies for authentication and session management. We use privacy-respecting
            analytics to understand usage patterns. We do not use tracking cookies or share data with ad
            networks.
          </Section>

          <Section title="Your Rights">
            You have the right to access, correct, export, or delete your personal data. You may withdraw
            consent for data processing at any time. To exercise these rights, contact us at
            support@mirrored.com.
          </Section>

          <Section title="Contact">
            For privacy-related questions or concerns, reach us at{" "}
            <a
              href="mailto:support@mirrored.com"
              className="underline underline-offset-2"
              style={{ color: "oklch(0.75 0.16 185)" }}
            >
              support@mirrored.com
            </a>
            .
          </Section>
        </div>

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center pt-10 pb-8"
        >
          <button
            onClick={() => navigate(-1 as never)}
            className="text-xs tracking-widest uppercase transition-opacity hover:opacity-70"
            style={{ color: "oklch(0.55 0.1 295)", letterSpacing: "0.15em" }}
          >
            ← Return
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-5 space-y-2"
      style={{
        background: "oklch(0.12 0.05 295 / 0.5)",
        border: "1px solid oklch(0.3 0.08 295 / 0.25)",
        backdropFilter: "blur(8px)",
      }}
    >
      <h3 className="text-sm font-semibold" style={{ color: "oklch(0.88 0.04 80)" }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "oklch(0.72 0.06 295)" }}>
        {children}
      </p>
    </motion.div>
  );
}
