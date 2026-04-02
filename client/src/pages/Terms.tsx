import { ChevronLeft } from "lucide-react";
import CrisisDisclaimerFooter from "@/components/CrisisDisclaimerFooter";

export default function Terms() {
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
          <h1 className="text-xl font-bold">Terms of Service</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-sm text-foreground/80">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Agreement to Terms</h2>
            <p>
              By accessing and using Synapset ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Medical Disclaimer</h2>
            <p className="font-semibold text-red-600 dark:text-red-400">
              IMPORTANT: Synapset is an AI-powered self-reflection tool designed for personal growth and coaching. It is NOT a replacement for professional medical advice, diagnosis, or treatment by a licensed therapist or healthcare provider.
            </p>
            <p>
              If you are experiencing a mental health crisis, suicidal ideation, or self-harm urges, please immediately contact:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>National Suicide Prevention Lifeline: 988 or 1-800-273-8255</li>
              <li>Crisis Text Line: Text HOME to 741741</li>
              <li>Emergency Services: 911</li>
            </ul>
            <p>
              Synapset cannot and should not be used as a substitute for professional mental health treatment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Use the Service only for lawful purposes</li>
              <li>Not engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Service</li>
              <li>Not harass, abuse, or harm others through the Service</li>
              <li>Not attempt to gain unauthorized access to the Service or its systems</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Intellectual Property Rights</h2>
            <p>
              The Service and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio) are owned by Synapset, its licensors, or other providers of such material and are protected by United States and international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. User-Generated Content</h2>
            <p>
              You retain all rights to any content you submit, post, or display on or through the Service ("User Content"). By submitting User Content, you grant Synapset a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute such content for the purpose of providing and improving the Service.
            </p>
            <p>
              You are solely responsible for the accuracy and legality of your User Content. Synapset does not endorse or assume responsibility for any User Content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
            <p className="font-semibold">
              TO THE FULLEST EXTENT PERMITTED BY LAW, SYNAPSET SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR IN CONNECTION WITH THE SERVICE, EVEN IF SYNAPSET HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. SYNAPSET MAKES NO WARRANTIES, EXPRESSED OR IMPLIED, REGARDING THE SERVICE, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Synapset and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including attorney's fees) arising out of or related to your use of the Service or violation of these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Termination</h2>
            <p>
              Synapset reserves the right to terminate or suspend your account and access to the Service at any time, for any reason, with or without notice. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Governing Law</h2>
            <p>
              These Terms of Service and your use of the Service are governed by and construed in accordance with the laws of the United States, and you irrevocably submit to the exclusive jurisdiction of the courts located in that location.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Changes to Terms</h2>
            <p>
              Synapset reserves the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to the Service. Your continued use of the Service following the posting of revised Terms means that you accept and agree to the changes.
            </p>
            <p className="text-xs text-muted-foreground">Last Updated: April 2, 2026</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">12. Contact Us</h2>
            <p>
              If you have questions about these Terms of Service, please contact us at:
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
