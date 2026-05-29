import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";

export default function Terms() {
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
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663398434536/LQwmD5t86EFFZjkEDkXbgz/mentrove-icon-transparent-XGQUfu4fN7im4fQNKmSvzr.webp"
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
              style={{ background: "oklch(0.20 0.08 290 / 0.5)", border: "1px solid oklch(0.40 0.12 290 / 0.4)" }}
            >
              <FileText size={22} style={{ color: "oklch(0.65 0.16 290)" }} />
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
            Terms of Service
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
          <Section title="Agreement to Terms">
            By accessing or using Mirrored, you agree to be bound by these Terms of Service. If you do not
            agree to these terms, please do not use the service. We reserve the right to update these terms
            at any time, and continued use constitutes acceptance of any changes.
          </Section>

          <Section title="Service Description">
            Mirrored is an AI-powered self-reflection and personal growth platform. It provides guided
            journaling, mood tracking, habit tracking, life domain scoring, and AI-assisted conversations.
            The service is designed for personal development and emotional awareness — it is not a medical
            or therapeutic service.
          </Section>

          <Section title="Not Medical Advice">
            Mirrored is not a licensed therapist, psychologist, medical doctor, or crisis counselor. The AI
            Mirror does not provide medical advice, diagnosis, or treatment. It is not a substitute for
            professional mental health care. If you are experiencing a mental health crisis, contact
            emergency services (911) or the Suicide & Crisis Lifeline (988) immediately.
          </Section>

          <Section title="Account Responsibilities">
            You are responsible for maintaining the security of your account credentials. You must be at
            least 18 years old to use Mirrored. You agree to provide accurate information and to use the
            service in accordance with applicable laws. One account per person — sharing accounts is not
            permitted.
          </Section>

          <Section title="Acceptable Use">
            You agree not to use Mirrored to: generate harmful, illegal, or abusive content; attempt to
            extract or reverse-engineer the AI system; impersonate others; or use the service in any way
            that could damage, disable, or impair the platform. We reserve the right to suspend accounts
            that violate these guidelines.
          </Section>

          <Section title="Subscription & Billing">
            Mirrored offers both free and paid (Pro) tiers. Pro subscriptions are billed monthly ($3.99) or
            annually ($49.99) through Stripe. You may cancel at any time — access continues until the end
            of the current billing period. Refunds are handled on a case-by-case basis; contact
            support@mirrored.com.
          </Section>

          <Section title="Intellectual Property">
            The Mirrored platform, including its design, code, AI models, and branding, is owned by
            Mirrored. Content you create (journal entries, check-ins, conversations) remains yours. By
            using the service, you grant us a limited license to process your content solely for the
            purpose of delivering the service to you.
          </Section>

          <Section title="Limitation of Liability">
            Mirrored is provided "as is" without warranties of any kind. We are not liable for any
            indirect, incidental, or consequential damages arising from your use of the service. Our total
            liability is limited to the amount you paid for the service in the 12 months preceding any
            claim.
          </Section>

          <Section title="Termination">
            We may suspend or terminate your access if you violate these terms. You may delete your account
            at any time by contacting support@mirrored.com. Upon termination, your data will be deleted in
            accordance with our Privacy Policy.
          </Section>

          <Section title="Contact">
            Questions about these terms? Reach us at{" "}
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
