import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import CrisisDisclaimerFooter from "@/components/CrisisDisclaimerFooter";

export default function Privacy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Privacy Policy</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-sm text-foreground/80">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p>
              Synapset ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered self-reflection application and website (the "Service").
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
            <div className="space-y-2">
              <p className="font-medium">Personal Information:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Name, email address, phone number (optional)</li>
                <li>Account credentials and authentication data</li>
                <li>Profile information (therapist name, contact info, preferences)</li>
                <li>Calendar events and personal goals</li>
                <li>Chat messages and journal entries</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Usage Information:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Device information (OS, browser type, IP address)</li>
                <li>Interaction data (features used, timestamps, session duration)</li>
                <li>Error logs and diagnostic information</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>To provide, maintain, and improve the Service</li>
              <li>To personalize your experience and deliver AI-powered insights</li>
              <li>To send notifications, reminders, and updates</li>
              <li>To monitor and analyze usage patterns and service performance</li>
              <li>To comply with legal obligations and enforce our Terms of Service</li>
              <li>To detect, prevent, and address fraud and security issues</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Data Security & Encryption</h2>
            <p>
              Synapset implements encryption-first security practices. All personal data, chat messages, and journal entries are encrypted in transit (TLS/SSL) and at rest. We use industry-standard security measures to protect your information from unauthorized access, alteration, disclosure, or destruction.
            </p>
            <p>
              However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Your Privacy Rights (GDPR & CCPA)</h2>
            <div className="space-y-2">
              <p className="font-medium">If you are a resident of the EU or UK, you have the right to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data ("right to be forgotten")</li>
                <li>Restrict processing of your data</li>
                <li>Receive your data in a portable format</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium">If you are a California resident (CCPA), you have the right to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Know what personal data is collected, used, and shared</li>
                <li>Delete personal data collected from you</li>
                <li>Opt-out of the sale or sharing of your personal data</li>
                <li>Non-discrimination for exercising your rights</li>
              </ul>
            </div>
            <p>
              To exercise any of these rights, please contact us at support@synapset.app with your request.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time. Upon deletion, we will remove your data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Third-Party Services</h2>
            <p>
              Synapset may use third-party service providers (e.g., cloud hosting, analytics, payment processing) to support the Service. These providers are contractually bound to protect your data and use it only for the purposes we specify. We do not sell your personal data to third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Children's Privacy</h2>
            <p>
              Synapset is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will delete such information and terminate the child's account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of the Service constitutes your acceptance of the updated Privacy Policy.
            </p>
            <p className="text-xs text-muted-foreground">Last Updated: April 2, 2026</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <div className="bg-muted p-4 rounded-lg space-y-1 text-xs">
              <p>Email: support@synapset.app</p>
              <p>Website: www.synapset.app</p>
            </div>
          </section>

          <div className="pt-4 pb-8" />
        </div>
      </div>

      <CrisisDisclaimerFooter />
    </div>
  );
}
