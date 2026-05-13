import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

const faqItems = [
  {
    question: "How does the AI Mirror work?",
    answer:
      "The AI Mirror learns your patterns, values, and goals through daily check-ins, journaling, and conversations. It reflects back insights about your growth, celebrates wins, and suggests areas for development—acting as a compassionate guide toward your higher self.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Yes. Your data is encrypted end-to-end and stored securely. We never sell your data or share it with third parties. You have full control over your information and can request deletion at any time.",
  },
  {
    question: "Is Mentrove a replacement for therapy?",
    answer:
      "No. Mentrove is an AI-powered self-reflection tool designed to support your personal growth. It is not a licensed therapist, medical doctor, or crisis counselor. If you need professional mental health support, please consult a licensed healthcare provider.",
  },
  {
    question: "What if I'm in crisis?",
    answer:
      "If you're experiencing a mental health crisis, please reach out to a professional immediately. Call 988 (Suicide & Crisis Lifeline), 1-800-273-8255, or 911. These services are free, confidential, and available 24/7.",
  },
  {
    question: "Can I use Mentrove on mobile?",
    answer:
      "Yes! Mentrove is fully responsive and works seamlessly on iOS, Android, and all modern browsers. Download our app or access it through your mobile browser for the same full experience.",
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
          "radial-gradient(ellipse at 20% 0%, oklch(0.46 0.14 185 / 0.07) 0%, transparent 50%), " +
          "radial-gradient(ellipse at 80% 15%, oklch(0.62 0.14 155 / 0.07) 0%, transparent 50%), " +
          "oklch(0.98 0.008 80)",
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-sm bg-aurora/80 border-b border-border">
        <div className="max-w-[480px] mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-violet-600 hover:text-violet-700 transition-colors flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-sm font-semibold text-foreground">Common Questions</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[480px] mx-auto px-6 py-12">
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-serif font-light text-foreground mb-2">Common Questions</h2>
          <p className="text-sm text-muted-foreground">Everything you need to know about Mentrove</p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-3 mb-12">
          {faqItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-border overflow-hidden"
              style={{
                background: openIndex === index ? "oklch(0.96 0.01 185)" : "transparent",
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors text-left"
              >
                <span className="font-medium text-foreground text-sm leading-snug">{item.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
                    <div className="px-5 pb-4 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Disclaimer Footer */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pt-8 border-t border-border"
        >
          <div className="rounded-2xl p-4" style={{ background: "oklch(0.95 0.04 15 / 0.5)", border: "1px solid oklch(0.85 0.06 15 / 0.4)" }}>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Important:</strong> Mentrove is an AI-powered self-reflection tool. It is not a licensed therapist, medical doctor, or crisis counselor. If you need professional mental health support, please consult a licensed healthcare provider. In crisis? Call{" "}
              <a href="tel:988" className="text-violet-600 hover:text-violet-700 transition-colors">
                988
              </a>{" "}
              or{" "}
              <a href="tel:1-800-273-8255" className="text-violet-600 hover:text-violet-700 transition-colors">
                1-800-273-8255
              </a>{" "}
              or 911.
            </p>
          </div>
        </motion.div>

        {/* Back to home link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-12 pb-8"
        >
          <button
            onClick={() => navigate("/")}
            className="text-sm text-violet-600 hover:text-violet-700 transition-colors"
          >
            ← Back to Home
          </button>
        </motion.div>
      </div>
    </div>
  );
}
