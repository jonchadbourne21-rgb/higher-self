import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  BookOpen,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Streamdown } from "streamdown";

const CATEGORY_LABELS: Record<string, string> = {
  "emotional-mastery": "Emotional Mastery",
  "building-presence": "Building Presence",
  relationships: "Relationships",
  mindfulness: "Mindfulness",
};

const PROGRAM_ICONS: Record<string, string> = {
  "emotional-mastery": "🧠",
  "building-presence": "✨",
  relationships: "❤️",
  mindfulness: "🧘",
};

export default function ProgramDetail() {
  const params = useParams<{ id: string }>();
  const programId = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();
  const [reflection, setReflection] = useState("");
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [showLessonView, setShowLessonView] = useState(false);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.programs.getById.useQuery(
    { id: programId },
    { enabled: !!programId }
  );
  const { data: currentLessonData, isLoading: lessonLoading } =
    trpc.programs.getCurrentLesson.useQuery(
      { programId },
      { enabled: !!programId }
    );
  const { data: progress } = trpc.programs.getProgress.useQuery(
    { programId },
    { enabled: !!programId }
  );

  const enroll = trpc.programs.enroll.useMutation({
    onSuccess: (res) => {
      if (res.alreadyEnrolled) {
        toast.info("You're already enrolled. Continuing your journey!");
      } else {
        toast.success("Enrolled! Your journey begins today 🌱");
      }
      utils.programs.getById.invalidate({ id: programId });
      utils.programs.getCurrentLesson.invalidate({ programId });
      utils.programs.myEnrollments.invalidate();
      setShowLessonView(true);
    },
    onError: () => toast.error("Could not enroll. Please try again."),
  });

  const submitLesson = trpc.programs.submitLessonResponse.useMutation({
    onSuccess: (res) => {
      setAiFeedback(res.aiFeedback);
      utils.programs.getCurrentLesson.invalidate({ programId });
      utils.programs.getProgress.invalidate({ programId });
      if (res.isCompleted) {
        toast.success("🎉 Program complete! You've mastered this journey.");
      } else {
        toast.success(`Day ${currentLessonData?.lesson.day} complete! Day ${res.nextDay} unlocked.`);
      }
    },
    onError: (err) => toast.error(err.message ?? "Could not submit. Please try again."),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Program not found.</p>
          <Button variant="ghost" onClick={() => navigate("/programs")} className="mt-4">
            Back to Programs
          </Button>
        </div>
      </AppShell>
    );
  }

  const { program, lessons, enrollment } = data;
  const isEnrolled = !!enrollment;
  const isCompleted = enrollment?.status === "completed";
  const currentDay = enrollment?.currentDay ?? 1;
  const completedDays = new Set(progress?.completedDays ?? []);

  const handleEnroll = () => {
    enroll.mutate({ programId });
  };

  const handleSubmit = () => {
    if (!currentLessonData?.lesson) return;
    submitLesson.mutate({
      programId,
      lessonId: currentLessonData.lesson.id,
      day: currentLessonData.lesson.day,
      reflection,
    });
  };

  // Show active lesson view
  if ((showLessonView || isEnrolled) && !isCompleted && currentLessonData?.lesson) {
    const lesson = currentLessonData.lesson;
    const alreadySubmitted = currentLessonData.isCompleted;

    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
          {/* Back */}
          <button
            onClick={() => setShowLessonView(false)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {program.name}
          </button>

          {/* Day badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Day {lesson.day} of {program.durationDays}
            </span>
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.round(((currentDay - 1) / program.durationDays) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{progress?.percentComplete ?? 0}%</span>
          </div>

          {/* Lesson title */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-foreground leading-snug">{lesson.title}</h1>
          </motion.div>

          {/* Concept */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-border/40 bg-card/60 p-5 mb-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Today's Concept</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{lesson.concept}</p>
          </motion.div>

          {/* Exercise */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Your Exercise</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{lesson.exercisePrompt}</p>
          </motion.div>

          {/* Reflection input or completed state */}
          {alreadySubmitted ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">Day {lesson.day} Complete</span>
              </div>
              {currentLessonData.response?.aiFeedback && (
                <div className="text-sm text-foreground/80 leading-relaxed">
                  <Streamdown>{currentLessonData.response.aiFeedback}</Streamdown>
                </div>
              )}
              {currentDay <= program.durationDays && (
                <p className="text-xs text-muted-foreground mt-3">
                  Come back tomorrow for Day {currentDay}.
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <label className="block text-sm font-medium text-foreground mb-2">
                Your Reflection
              </label>
              <Textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Write freely — this is your space. There are no wrong answers..."
                rows={6}
                className="resize-none bg-card/60 border-border/40 focus:border-primary/50 text-sm"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">{reflection.length} chars (min 20)</span>
                <Button
                  onClick={handleSubmit}
                  disabled={reflection.length < 20 || submitLesson.isPending}
                  className="gap-2"
                >
                  {submitLesson.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Getting feedback...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Submit & Get Feedback</>
                  )}
                </Button>
              </div>

              {/* AI Feedback */}
              <AnimatePresence>
                {aiFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">Your Mirror Reflects</span>
                    </div>
                    <div className="text-sm text-foreground/90 leading-relaxed">
                      <Streamdown>{aiFeedback}</Streamdown>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </AppShell>
    );
  }

  // Program overview
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
        {/* Back */}
        <button
          onClick={() => navigate("/programs")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Programs
        </button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-start gap-4 mb-4">
            <span className="text-5xl">{PROGRAM_ICONS[program.category]}</span>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground leading-snug">{program.name}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {CATEGORY_LABELS[program.category] ?? program.category}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {program.durationDays} days
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{program.description}</p>
        </motion.div>

        {/* Progress bar (if enrolled) */}
        {isEnrolled && progress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-border/40 bg-card/60 p-4 mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Your Progress</span>
              <span className="text-sm font-bold text-primary">{progress.percentComplete}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {progress.completedDays.length} of {progress.totalDays} days completed
            </p>
          </motion.div>
        )}

        {/* Lessons list */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            The Journey
          </h2>
          <div className="space-y-2">
            {lessons.map((lesson, idx) => {
              const isDone = completedDays.has(lesson.day);
              const isCurrent = isEnrolled && lesson.day === currentDay && !isCompleted;
              const isLocked = isEnrolled && lesson.day > currentDay;

              return (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isCurrent
                      ? "border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/10"
                      : isDone
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : isLocked
                      ? "border-border/20 opacity-50"
                      : "border-border/30 bg-card/40"
                  }`}
                  onClick={() => isCurrent && setShowLessonView(true)}
                >
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Day {lesson.day}</span>
                      {isCurrent && (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                  </div>
                  {isCurrent && <ChevronRight className="w-4 h-4 text-primary shrink-0" />}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        {isCompleted ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-emerald-400">Journey Complete!</p>
            <p className="text-sm text-muted-foreground mt-1">You've completed this program. Incredible work.</p>
          </div>
        ) : isEnrolled ? (
          <Button
            onClick={() => setShowLessonView(true)}
            className="w-full gap-2"
            size="lg"
            disabled={lessonLoading}
          >
            <Sparkles className="w-4 h-4" />
            Continue Day {currentDay}
          </Button>
        ) : (
          <Button
            onClick={handleEnroll}
            className="w-full gap-2"
            size="lg"
            disabled={enroll.isPending}
          >
            {enroll.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enrolling...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Start This Journey</>
            )}
          </Button>
        )}
      </div>
    </AppShell>
  );
}
