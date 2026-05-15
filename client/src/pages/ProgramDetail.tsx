import { useState, useEffect } from "react";
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
  Lock,
  CalendarClock,
  Moon,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  "emotional-mastery": "Emotional Mastery",
  "building-presence": "Building Presence",
  relationships: "Relationships",
  mindfulness: "Mindfulness",
  "self-awareness": "Self-Awareness",
  "zen-philosophy": "Zen Philosophy",
};

const PROGRAM_ICONS: Record<string, string> = {
  "emotional-mastery": "🌊",
  "building-presence": "✨",
  relationships: "❤️",
  mindfulness: "🧘",
  "self-awareness": "🪞",
  "zen-philosophy": "🎭",
};

/** Format an ISO timestamp as a human-readable EST time string */
function formatUnlockTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "tomorrow at 6:00 AM Eastern";
  }
}

/** Countdown hook — returns "Xh Ym" until a target date */
function useCountdown(targetIso: string | null): string {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!targetIso) return;
    const target = new Date(targetIso).getTime();

    function update() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setDisplay("Unlocking…");
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (h > 0) setDisplay(`${h}h ${m}m`);
      else if (m > 0) setDisplay(`${m}m ${s}s`);
      else setDisplay(`${s}s`);
    }

    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [targetIso]);

  return display;
}

export default function ProgramDetail() {
  const params = useParams<{ id: string }>();
  const programId = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();
  const [reflection, setReflection] = useState("");
  const [showLessonView, setShowLessonView] = useState(false);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.programs.getById.useQuery(
    { id: programId },
    { enabled: !!programId }
  );
  const { data: currentLessonData, isLoading: lessonLoading } =
    trpc.programs.getCurrentLesson.useQuery(
      { programId },
      { enabled: !!programId, refetchInterval: 60_000 } // re-check every minute
    );
  const { data: progress } = trpc.programs.getProgress.useQuery(
    { programId },
    { enabled: !!programId }
  );

  const countdown = useCountdown(currentLessonData?.unlockAt ?? null);

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
      utils.programs.getCurrentLesson.invalidate({ programId });
      utils.programs.getProgress.invalidate({ programId });
      const day = currentLessonData?.lesson.day ?? 1;
      try {
        sessionStorage.setItem(
          `program_insight_${programId}_${day}`,
          JSON.stringify({
            aiFeedback: res.aiFeedback,
            userReflection: reflection,
            nextLesson: res.nextLesson,
            unlockAt: res.unlockAt,
          })
        );
      } catch {
        // sessionStorage unavailable
      }
      navigate(`/programs/${programId}/insight/${day}`);
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

  const handleEnroll = () => enroll.mutate({ programId });

  const handleSubmit = () => {
    if (!currentLessonData?.lesson) return;
    submitLesson.mutate({
      programId,
      lessonId: currentLessonData.lesson.id,
      day: currentLessonData.lesson.day,
      reflection,
    });
  };

  // ── Active lesson view ──────────────────────────────────────────────────────
  if ((showLessonView || isEnrolled) && !isCompleted && currentLessonData?.lesson) {
    const lesson = currentLessonData.lesson;
    const alreadySubmitted = currentLessonData.isCompleted;
    const isLocked = currentLessonData.isLocked;
    const unlockAt = currentLessonData.unlockAt;

    // ── LOCKED STATE — next day not yet open ────────────────────────────────
    if (isLocked && unlockAt) {
      return (
        <AppShell>
          <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
            <button
              onClick={() => setShowLessonView(false)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {program.name}
            </button>

            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-8">
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

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: "oklch(0.18 0.04 280)", border: "1px solid oklch(0.28 0.05 280)" }}
              >
                <Moon className="w-9 h-9 text-primary" />
              </div>

              <h2 className="text-xl font-bold text-foreground mb-2">
                Great work today.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto mb-6">
                You've completed Day {lesson.day - 1}. Your next lesson unlocks at{" "}
                <strong className="text-foreground">{formatUnlockTime(unlockAt)}</strong>.
              </p>

              {/* Countdown */}
              <div
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 mb-6"
                style={{
                  background: "oklch(0.18 0.04 280)",
                  border: "1px solid oklch(0.35 0.08 280)",
                }}
              >
                <CalendarClock className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {countdown ? `Unlocks in ${countdown}` : "Calculating…"}
                </span>
              </div>

              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                One lesson per day. This pace is intentional — it gives your mind time to absorb and integrate what you've reflected on.
              </p>
            </motion.div>

            <Button
              variant="outline"
              onClick={() => navigate(`/programs/${programId}`)}
              className="w-full mt-4 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Program Overview
            </Button>
          </div>
        </AppShell>
      );
    }

    // ── SUBMITTED STATE — show reflection + AI insight ───────────────────────
    if (alreadySubmitted) {
      return (
        <AppShell>
          <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
            <button
              onClick={() => setShowLessonView(false)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {program.name}
            </button>

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

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Completed</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground leading-snug">{lesson.title}</h1>
            </motion.div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border/40 bg-card/60 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Your Reflection</span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {currentLessonData.response?.userReflection}
                </p>
              </div>

              {currentLessonData.response?.aiFeedback && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Your Mirror Reflects</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {currentLessonData.response.aiFeedback}
                  </p>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => navigate(`/programs/${programId}`)}
              className="w-full mt-6 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Program Overview
            </Button>
          </div>
        </AppShell>
      );
    }

    // ── ACTIVE LESSON — reflection input ────────────────────────────────────
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
          <button
            onClick={() => setShowLessonView(false)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {program.name}
          </button>

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

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl font-bold text-foreground leading-snug">{lesson.title}</h1>
          </motion.div>

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

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <label className="block text-sm font-medium text-foreground mb-2">Your Reflection</label>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Write freely — this is your space. There are no wrong answers..."
              rows={6}
              className="resize-none bg-card/60 border-border/40 focus:border-primary/50 text-sm"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">
                {reflection.length < 20
                  ? `${20 - reflection.length} more characters needed`
                  : `${reflection.length} characters`}
              </span>
              <Button
                onClick={handleSubmit}
                disabled={reflection.length < 20 || submitLesson.isPending}
                className="gap-2"
              >
                {submitLesson.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Getting insight…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Submit & Reflect</>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </AppShell>
    );
  }

  // ── Program overview ────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
        <button
          onClick={() => navigate("/programs")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Programs
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-start gap-4 mb-4">
            <span className="text-5xl">{PROGRAM_ICONS[program.category] ?? "🌱"}</span>
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

        {/* Completion reward callout */}
        {program.durationDays === 21 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 mb-5 flex items-center gap-3"
            style={{
              background: "linear-gradient(135deg, oklch(0.28 0.10 55 / 0.25), oklch(0.22 0.06 280 / 0.25))",
              border: "1px solid oklch(0.60 0.18 55 / 0.35)",
            }}
          >
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "oklch(0.80 0.16 55)" }}>
                Complete all 21 days
              </p>
              <p className="text-xs text-muted-foreground">
                Earn <strong className="text-foreground">25 reward points</strong> +{" "}
                <strong className="text-foreground">1 month of Pro free</strong>
              </p>
            </div>
          </motion.div>
        )}

        {/* Progress bar */}
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
            The Journey — One Day at a Time
          </h2>
          <div className="space-y-2">
            {lessons.map((lesson, idx) => {
              const isDone = completedDays.has(lesson.day);
              const isCurrent = isEnrolled && lesson.day === currentDay && !isCompleted;
              const isLocked = isEnrolled && lesson.day > currentDay;
              // Also lock the current day if the backend says it's locked (6AM gate)
              const isGateLocked = isCurrent && currentLessonData?.isLocked;

              return (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isCurrent && !isGateLocked
                      ? "border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/10"
                      : isDone
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : isLocked || isGateLocked
                      ? "border-border/20 opacity-40 cursor-not-allowed"
                      : "border-border/30 bg-card/40"
                  }`}
                  onClick={() => isCurrent && !isGateLocked && setShowLessonView(true)}
                >
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isLocked || isGateLocked ? (
                      <Lock className="w-4 h-4 text-muted-foreground/40" />
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
                      {isCurrent && !isGateLocked && (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          Today
                        </span>
                      )}
                      {isGateLocked && currentLessonData?.unlockAt && (
                        <span className="text-xs text-muted-foreground/50">
                          Unlocks {formatUnlockTime(currentLessonData.unlockAt)}
                        </span>
                      )}
                      {isLocked && !isGateLocked && (
                        <span className="text-xs text-muted-foreground/50">
                          Unlocks after Day {lesson.day - 1}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                  </div>
                  {isCurrent && !isGateLocked && (
                    <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                  )}
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
          currentLessonData?.isLocked ? (
            // Locked — show the unlock time instead of a Start button
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{
                background: "oklch(0.18 0.04 280)",
                border: "1px solid oklch(0.28 0.05 280)",
              }}
            >
              <Moon className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Come back tomorrow</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Day {currentDay} unlocks at{" "}
                  <strong className="text-foreground">
                    {currentLessonData.unlockAt
                      ? formatUnlockTime(currentLessonData.unlockAt)
                      : "6:00 AM Eastern"}
                  </strong>
                </p>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowLessonView(true)}
              className="w-full gap-2"
              size="lg"
              disabled={lessonLoading}
            >
              <Sparkles className="w-5 h-5" />
              {lessonLoading ? "Loading…" : `Continue — Day ${currentDay}`}
            </Button>
          )
        ) : (
          <Button
            onClick={handleEnroll}
            className="w-full gap-2"
            size="lg"
            disabled={enroll.isPending}
          >
            {enroll.isPending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Enrolling…</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Start This Journey</>
            )}
          </Button>
        )}
      </div>
    </AppShell>
  );
}
