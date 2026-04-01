import { AlertTriangle, Phone } from "lucide-react";

export default function CrisisDisclaimerFooter() {
  return (
    <div className="w-full bg-red-50 dark:bg-red-950/20 border-t border-red-200 dark:border-red-900/30 px-4 py-4 mt-8">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-xs text-red-900 dark:text-red-200">
            <p className="font-semibold">
              Synapset is not a licensed medical professional and does not provide clinical diagnosis or treatment.
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 flex-shrink-0" />
              If you are in crisis, please contact the National Suicide Prevention Lifeline at{" "}
              <a
                href="tel:988"
                className="font-semibold underline hover:text-red-700 dark:hover:text-red-300"
              >
                988
              </a>
              {" "}(Suicide & Crisis Lifeline) or call{" "}
              <a
                href="tel:1-800-273-8255"
                className="font-semibold underline hover:text-red-700 dark:hover:text-red-300"
              >
                1-800-273-8255
              </a>
              . In emergencies, call{" "}
              <a
                href="tel:911"
                className="font-semibold underline hover:text-red-700 dark:hover:text-red-300"
              >
                911
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
