import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

const faqItems: FAQItem[] = [
  {
    question: "How does the AI Mirror work?",
    answer:
      "The AI Mirror learns your patterns, values, and goals through daily check-ins, journaling, and conversations. It reflects back insights about your growth, celebrates wins, and suggests areas for development—acting as a compassionate guide toward your higher self.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Yes. Your data is encrypted and stored securely. We never sell your information. Your conversations, journals, and personal insights are yours alone. You can delete your account and all data at any time.",
  },
  {
    question: "Is Mentrove a replacement for therapy?",
    answer: (
      <div className="space-y-2">
        <p>
          <strong>No.</strong> Mentrove is <strong>not</strong> a licensed therapist, psychologist, medical doctor, or crisis counselor. It does not provide medical advice, diagnosis, or treatment. It is not a substitute for professional mental health care.
        </p>
        <p className="text-sm text-muted-foreground">
          If you need professional mental health support, please consult a licensed therapist or healthcare provider.
        </p>
      </div>
    ),
  },
  {
    question: "What if I'm in crisis?",
    answer: (
      <div className="space-y-2">
        <p className="font-semibold text-red-700">If you're experiencing suicidal thoughts, self-harm urges, or a mental health crisis, please reach out immediately:</p>
        <div className="space-y-1 text-sm">
          <p>
            <a href="tel:988" className="font-semibold text-red-700 underline">
              988
            </a>
            {" "}
            — Suicide &amp; Crisis Lifeline (call or text)
          </p>
          <p>
            <a href="tel:18002738255" className="font-semibold text-red-700 underline">
              1-800-273-8255
            </a>
            {" "}
            — National Suicide Prevention Lifeline
          </p>
          <p>
            <a href="tel:911" className="font-semibold text-red-700 underline">
              911
            </a>
            {" "}
            — Emergency Services
          </p>
        </div>
      </div>
    ),
  },
  {
    question: "Can I use Mentrove on mobile?",
    answer:
      "Yes! Mentrove is fully optimized for mobile devices. You can access all features—chat, journaling, habit tracking, and insights—from your phone or tablet.",
  },
];

export default function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="w-full max-w-[480px] mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif font-light text-foreground mb-2">
          Common Questions
        </h2>
        <p className="text-sm text-muted-foreground">
          Everything you need to know about Mentrove
        </p>
      </div>

      {/* FAQ Items */}
      <div className="space-y-3">
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
              <span className="font-medium text-foreground text-sm leading-snug">
                {item.question}
              </span>
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
      <div className="mt-10 pt-8 border-t border-border">
        <div className="rounded-2xl p-4" style={{ background: "oklch(0.95 0.04 15 / 0.5)", border: "1px solid oklch(0.85 0.06 15 / 0.4)" }}>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Important:</strong> Mentrove is an AI-powered self-reflection tool. It is not a licensed therapist, medical doctor, or crisis counselor. If you need professional mental health support, please consult a licensed healthcare provider. In crisis? Call 988 or 911.
          </p>
        </div>
      </div>
    </div>
  );
}
