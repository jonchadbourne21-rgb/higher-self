import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight } from "lucide-react";

const LIFE_DOMAINS = [
  { id: "mindset", label: "Mindset", emoji: "🧠" },
  { id: "relationships", label: "Relationships", emoji: "💝" },
  { id: "work", label: "Work", emoji: "💼" },
  { id: "health", label: "Health", emoji: "💪" },
  { id: "spirituality", label: "Spirituality", emoji: "✨" },
  { id: "finances", label: "Finances", emoji: "💰" },
];

export default function FullOnboarding() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [shortTermGoals, setShortTermGoals] = useState("");
  const [longTermVision, setLongTermVision] = useState("");
  const [personalityNotes, setPersonalityNotes] = useState("");
  const [beliefs, setBeliefs] = useState("");
  const [preferredName, setPreferredName] = useState(user?.name || "");

  const utils = trpc.useUtils();
  const saveOnboardingMutation = trpc.onboarding.saveFullOnboarding.useMutation();

  // Redirect logic
  useEffect(() => {
    if (loading) return;

    // If not authenticated, go to home
    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    // If user already completed onboarding, skip to home
    if (user?.onboardingCompleted) {
      navigate("/home");
      return;
    }
  }, [isAuthenticated, loading, user?.onboardingCompleted, navigate]);

  const toggleDomain = (domainId: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domainId) ? prev.filter((d) => d !== domainId) : [...prev, domainId]
    );
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await saveOnboardingMutation.mutateAsync({
        coreValues: selectedDomains,
        shortTermGoals,
        longTermVision,
        personalityNotes,
        beliefs,
        preferredName,
      });

      // Invalidate auth cache to refresh user data
      await utils.auth.me.invalidate();

      toast.success("Onboarding complete! Welcome to your mirror ✦");
      navigate("/home");
    } catch (error) {
      console.error("Failed to save onboarding:", error);
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-aurora via-white to-aurora flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-violet-300 rounded-full"></div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or already onboarded
  if (!isAuthenticated || user?.onboardingCompleted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-aurora via-white to-aurora flex flex-col max-w-[480px] mx-auto px-6 py-12">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-violet-600">Step 2 of 2</span>
          <span className="text-sm text-gray-500">{Math.round(((currentStep + 1) / 4) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / 4) * 100}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Complete your profile</p>
      </div>

      {/* Step 1: Life Domains */}
      {currentStep === 0 && (
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif text-gray-900 mb-2">Which areas matter most to you?</h2>
            <p className="text-gray-600">Select the life domains you want to focus on</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {LIFE_DOMAINS.map((domain) => (
              <Card
                key={domain.id}
                onClick={() => toggleDomain(domain.id)}
                className={`p-4 cursor-pointer transition-all duration-300 ${
                  selectedDomains.includes(domain.id)
                    ? "ring-2 ring-violet-500 bg-violet-50"
                    : "hover:shadow-md"
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{domain.emoji}</div>
                  <p className="text-sm font-medium text-gray-900">{domain.label}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Goals */}
      {currentStep === 1 && (
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif text-gray-900 mb-2">What are your goals?</h2>
            <p className="text-gray-600">Share your short-term and long-term aspirations</p>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Short-term goals (next 3 months)</label>
              <Textarea
                placeholder="e.g., Build a consistent meditation habit, improve sleep quality..."
                value={shortTermGoals}
                onChange={(e) => setShortTermGoals(e.target.value)}
                className="min-h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Long-term vision (1+ years)</label>
              <Textarea
                placeholder="e.g., Become more emotionally resilient, build meaningful relationships..."
                value={longTermVision}
                onChange={(e) => setLongTermVision(e.target.value)}
                className="min-h-24"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Personality & Beliefs */}
      {currentStep === 2 && (
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif text-gray-900 mb-2">Tell us about yourself</h2>
            <p className="text-gray-600">Help us understand your personality and beliefs</p>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">How would you describe yourself?</label>
              <Textarea
                placeholder="e.g., I'm introspective, curious, and value personal growth..."
                value={personalityNotes}
                onChange={(e) => setPersonalityNotes(e.target.value)}
                className="min-h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What beliefs guide you?</label>
              <Textarea
                placeholder="e.g., I believe in continuous learning, authenticity, and kindness..."
                value={beliefs}
                onChange={(e) => setBeliefs(e.target.value)}
                className="min-h-20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Preferences */}
      {currentStep === 3 && (
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif text-gray-900 mb-2">How should we address you?</h2>
            <p className="text-gray-600">Personalize your experience</p>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred name</label>
              <Input
                placeholder="How would you like us to call you?"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
              />
            </div>

            <Card className="p-4 bg-violet-50 border-violet-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Your Mirror is ready.</span> Based on your intention and profile, we'll provide personalized guidance tailored to your journey.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-auto pt-8">
        <Button
          onClick={handlePrev}
          disabled={currentStep === 0}
          variant="outline"
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep < 3 ? (
          <Button
            onClick={handleNext}
            className="flex-1 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700"
          >
            {isSubmitting ? "Completing..." : "Complete Onboarding"}
          </Button>
        )}
      </div>
    </div>
  );
}
