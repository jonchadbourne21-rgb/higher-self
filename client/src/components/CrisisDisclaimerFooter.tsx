import { Phone } from "lucide-react";

export default function CrisisDisclaimerFooter() {
  return (
    <div className="w-full bg-background border-t border-border px-4 py-6 mt-8">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* What Mentrove Is */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">What Mentrove Is</p>
          <p className="text-xs text-foreground/70 leading-relaxed">
            Mentrove is an AI-powered self-reflection tool designed to help you process your thoughts, unlock intuition, and find clarity. It provides personalized insights, journaling support, and goal tracking for personal growth and self-awareness.
          </p>
        </div>

        {/* What Mentrove Is NOT */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">What Mentrove Is NOT</p>
          <p className="text-xs text-foreground/70 leading-relaxed">
            Mentrove is not a licensed therapist, medical doctor, or mental health professional. It does not provide clinical diagnosis, treatment, or medical advice. If you need professional mental health support, please consult a licensed therapist or healthcare provider.
          </p>
        </div>

        {/* Crisis Support */}
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" />
            In Crisis? Get Help Now
          </p>
          <p className="text-xs text-foreground/70 leading-relaxed">
            If you are experiencing suicidal thoughts, self-harm urges, or a mental health crisis, please reach out immediately:
          </p>
          <div className="flex gap-4 text-xs text-foreground/80 font-medium">
            <a href="tel:988" className="hover:text-violet-600 dark:hover:text-violet-400 underline">
              Call or text 988
            </a>
            <span className="text-foreground/30">•</span>
            <a href="tel:1-800-273-8255" className="hover:text-violet-600 dark:hover:text-violet-400 underline">
              1-800-273-8255
            </a>
            <span className="text-foreground/30">•</span>
            <a href="tel:911" className="hover:text-violet-600 dark:hover:text-violet-400 underline">
              911
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
