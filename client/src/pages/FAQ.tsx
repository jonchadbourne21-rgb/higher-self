import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ChevronDown, ArrowLeft, Phone, AlertTriangle } from "lucide-react";
import { useState } from "react";

const faqItems = [
  {
    question: "How does the AI Mirror work?",
    answer:
      "The AI Mirror learns your patterns, values, and goals through daily check-ins, journaling, and conversations. It reflects back insights about your growth, celebrates wins, and suggests areas for development — acting as a compassionate guide toward your higher self.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Yes. Your data is encrypted end-to-end and stored securely. We never sell your data or share it with third parties. You have full control over your information and can request deletion at any time.",
  },
  {
    question: "Is Mirrored a replacement for therapy?",
    answer:
      "No. Mirrored is an AI-powered self-reflection tool designed to support your personal growth journey. It is not a licensed therapist, medical doctor, or crisis counselor. If you need professional mental health support, please consult a licensed healthcare provider.",
  },
  {
    question: "What if I'm in crisis?",
    answer:
      "If you're experiencing a mental health crisis, please reach out to a professional immediately. Call 988 (Suicide & Crisis Lifeline), 1-800-273-8255, or 911. These services are free, confidential, and available 24/7. Mirrored is not equipped to handle crisis situations.",
  },
  {
    question: "Can I use Mirrored on mobile?",
    answer:
      "Yes! Mirrored is fully responsive and works seamlessly on iOS, Android, and all modern browsers. Access it through your mobile browser for the same full experience.",
  },
  {
    question: "How does the streak reward system work?",
    answer:
      "Consistency is rewarded. Maintain streaks across any activity (chat, journal, or habits) to earn reward points toward Pro access. Reach a 30-day streak to unlock 2 months of free Pro, and a 100-day streak earns you 1 full year of Pro — free.",
  },
  {
    question: "What's included in Mirrored Pro?",
    answer:
      "Pro unlocks unlimited AI chats, unlimited journal entries, advanced analytics and trends, priority support, and custom integrations. Free users get 5 AI chats per day and 4 journal entries per week.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "You can cancel your Pro subscription at any time through your Stripe billing portal. Your Pro access continues until the end of the current billing period. No questions asked.",
  },
];

export default function FAQ() {
  const [, navigate] = useLocation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
              src="/mirrored-emblem-logo.png"
              alt="Mirrored"
              className="w-5 h-7 object-contain"
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
          className="text-center mb-12"
        >
          <h2
            className="text-3xl font-light mb-2 tracking-wide"
            style={{
              color: "oklch(0.96 0.02 80)",
              fontFamily: "'Georgia', serif",
              textShadow: "0 0 20px oklch(0.55 0.18 295 / 0.3)",
            }}
          >
            About Mirrored
          </h2>
          <div
            className="h-px w-32 mx-auto mb-3"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.55 0.18 295 / 0.5), transparent)",
            }}
          />
          <p className="text-sm" style={{ color: "oklch(0.65 0.08 295)" }}>
            Everything you need to know about Mirrored
          </p>
        </motion.div>

        {/* ── Disclaimer (prominent, top) ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-2xl p-5 mb-8 space-y-4"
          style={{
            background: "oklch(0.12 0.06 295 / 0.7)",
            border: "1px solid oklch(0.45 0.14 295 / 0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} style={{ color: "oklch(0.75 0.18 60)" }} />
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "oklch(0.75 0.18 60)" }}
            >
              Important Disclaimer
            </span>
          </div>

          <div className="space-y-3 text-sm" style={{ color: "oklch(0.72 0.06 295)" }}>
            <div>
              <p className="font-semibold mb-1" style={{ color: "oklch(0.88 0.04 80)" }}>
                What Mirrored Is
              </p>
              <p className="leading-relaxed">
                Mirrored is an AI-powered self-reflection tool designed to support personal growth,
                emotional awareness, and mindfulness. It offers guided journaling, mood tracking, and
                AI-assisted insights to help you understand yourself better.
              </p>
            </div>

            <div>
              <p className="font-semibold mb-1" style={{ color: "oklch(0.88 0.04 80)" }}>
                What Mirrored Is NOT
              </p>
              <p className="leading-relaxed">
                Mirrored is <strong style={{ color: "oklch(0.88 0.04 80)" }}>not</strong> a licensed
                therapist, psychologist, medical doctor, or crisis counselor. It does not provide
                medical advice, diagnosis, or treatment. It is not a substitute for professional
                mental health care.
              </p>
            </div>
          </div>

          {/* Crisis box */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{
              background: "oklch(0.18 0.08 20 / 0.5)",
              border: "1px solid oklch(0.5 0.15 20 / 0.4)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Phone size={14} style={{ color: "oklch(0.7 0.18 20)" }} />
              <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: "oklch(0.7 0.18 20)" }}>
                In Crisis? Get Help Now
              </p>
            </div>
            <div className="space-y-1 text-sm" style={{ color: "oklch(0.75 0.1 20)" }}>
              <p>
                <a
                  href="tel:988"
                  className="font-bold underline"
                  style={{ color: "oklch(0.72 0.18 20)" }}
                >
                  988
                </a>{" "}
                — Suicide &amp; Crisis Lifeline (call or text)
              </p>
              <p>
                <a
                  href="tel:18002738255"
                  className="font-bold underline"
                  style={{ color: "oklch(0.72 0.18 20)" }}
                >
                  1-800-273-8255
                </a>{" "}
                — National Suicide Prevention Lifeline
              </p>
              <p>
                <a
                  href="tel:911"
                  className="font-bold underline"
                  style={{ color: "oklch(0.72 0.18 20)" }}
                >
                  911
                </a>{" "}
                — Emergency Services
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── FAQ accordion ─────────────────────────────────────────────────── */}
        <div className="space-y-2 mb-12">
          {faqItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-2xl overflow-hidden"
              style={{
                background:
                  openIndex === index
                    ? "oklch(0.16 0.08 295 / 0.7)"
                    : "oklch(0.12 0.05 295 / 0.5)",
                border: `1px solid ${
                  openIndex === index
                    ? "oklch(0.45 0.14 295 / 0.4)"
                    : "oklch(0.3 0.08 295 / 0.25)"
                }`,
                backdropFilter: "blur(8px)",
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left transition-opacity hover:opacity-80"
              >
                <span
                  className="font-medium text-sm leading-snug"
                  style={{ color: "oklch(0.88 0.04 80)" }}
                >
                  {item.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown
                    className="w-4 h-4"
                    style={{ color: "oklch(0.55 0.1 295)" }}
                  />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-5 pb-4 pt-0 text-sm leading-relaxed border-t"
                      style={{
                        color: "oklch(0.68 0.06 295)",
                        borderColor: "oklch(0.35 0.1 295 / 0.2)",
                      }}
                    >
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Support Email */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl p-5 mb-8 text-center space-y-2"
          style={{
            background: "oklch(0.12 0.05 295 / 0.5)",
            border: "1px solid oklch(0.3 0.08 295 / 0.3)",
            backdropFilter: "blur(8px)",
          }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "oklch(0.65 0.14 185)" }}>
            Contact Support
          </p>
          <p className="text-sm" style={{ color: "oklch(0.72 0.06 295)" }}>
            Have a question or need help? We're here.
          </p>
          <a
            href="mailto:support@mirrored.com"
            className="inline-block text-sm font-medium underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color: "oklch(0.75 0.16 185)" }}
          >
            support@mirrored.com
          </a>
        </motion.div>

        {/* Legal links */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center items-center gap-3 mb-6"
        >
          <a
            href="/privacy"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "oklch(0.50 0.08 295)" }}
          >
            Privacy Policy
          </a>
          <span className="text-[10px]" style={{ color: "oklch(0.35 0.04 295)" }}>·</span>
          <a
            href="/terms"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "oklch(0.50 0.08 295)" }}
          >
            Terms of Service
          </a>
        </motion.div>

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center pb-8"
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
