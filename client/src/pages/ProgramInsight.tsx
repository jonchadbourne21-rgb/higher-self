import { useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { AIReveal } from "@/components/AIThinking";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  CalendarClock,
  Crown,
  Star,
} from "lucide-react";
import confetti from "canvas-confetti";

function fireCompletionConfetti() {
  const count = 250;
  const defaults = { origin: { y: 0.5 } };
  function fire(ratio: number, opts: confetti.Options) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * ratio) });
  }
  fire(0.25, { spread: 26, startVelocity: 55, colors: ["#a855f7", "#7c3aed", "#c084fc"] });
  fire(0.20, { spread: 60, colors: ["#f59e0b", "#fbbf24", "#fde68a"] });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ["#a855f7", "#7c3aed", "#f59e0b"] });
  fire(0.10, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ["#fff", "#f0abfc"] });
  setTimeout(() => {
    confetti({ particleCount: 100, spread: 70, origin: { x: 0.2, y: 0.5 }, colors: ["#a855f7", "#f59e0b"] });
    confetti({ particleCount: 100, spread: 70, origin: { x: 0.8, y: 0.5 }, colors: ["#7c3aed", "#fbbf24"] });
  }, 500);
}

export default function ProgramInsight() {
  const params = useParams<{ id: string; day: string }>();
  const programId = parseInt(params.id ?? "0", 10);
  const day = parseInt(params.day ?? "1", 10);
  const [, navigate] = useLocation();
  const confettiFired = useRef(false);

  // Fetch the program info and the submitted lesson response
  const { data: programData } = trpc.programs.getById.useQuery(
    { id: programId },
    { enabled: !!programId }
  );
  const { data: progressData } = trpc.programs.getProgress.useQuery(
    { id: programId } as any,
    { enabled: false } // We'll use getCurrentLesson instead
  );
  const { data: lessonData } = trpc.programs.getCurrentLesson.useQuery(
    { programId },
    { enabled: !!programId }
  );

  const program = programData?.program;
  const isLastDay = program ? day >= program.durationDays : false;
  const nextDay = isLastDay ? null : day + 1;

  // Fire confetti on Day 21 completion
  useEffect(() => {
    if (isLastDay && !confettiFired.current) {
      confettiFired.current = true;
      setTimeout(fireCompletionConfetti, 400);
    }
  }, [isLastDay]);

  // The response for the day we just submitted — we look at lessonData which now points to next day
  // We need to fetch the specific day's response via a different approach
  // Since getCurrentLesson now points to the NEXT day, we use the insight page to show what was just submitted
  // We pass the data via navigation state or re-fetch via a dedicated query
  // For simplicity, we'll use the getAllLessonResponses via getProgress + a direct fetch
  const { data: allResponses } = trpc.programs.getProgress.useQuery(
    { programId },
    { enabled: !!programId }
  );

  // We need the actual response text — fetch it from the lesson response
  // Use a dedicated query for the specific day's response
  const { data: currentLessonForInsight } = trpc.programs.getCurrentLesson.useQuery(
    { programId },
    { enabled: !!programId }
  );

  // The insight page shows the response from the day just completed (day param)
  // Since getCurrentLesson now returns the NEXT day's lesson, we need a way to get the submitted response
  // We'll use a workaround: store the response in sessionStorage when submitting, or use a new endpoint
  // For now, we'll use the lessonData's response if it matches, otherwise show a generic success view
  
  // Check sessionStorage for the just-submitted response (set by ProgramDetail on submit)
  const storedInsight = (() => {
    try {
      const raw = sessionStorage.getItem(`program_insight_${programId}_${day}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const aiFeedback = storedInsight?.aiFeedback ?? null;
  const userReflection = storedInsight?.userReflection ?? null;
  const nextLesson = storedInsight?.nextLesson ?? null;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
        {/* Back */}
        <button
          onClick={() => navigate(`/programs/${programId}`)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {program?.name ?? "Program"}
        </button>

        {/* Day 21 Completion Celebration */}
        {isLastDay ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              You Did It.
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              21 days. 21 reflections. You showed up for yourself every single day. That's not just a program — that's a transformation.
            </p>

            {/* Rewards */}
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-xl p-4 text-center"
                style={{
                  background: "linear-gradient(135deg, oklch(0.28 0.10 55 / 0.4), oklch(0.22 0.06 280 / 0.4))",
                  border: "1px solid oklch(0.60 0.18 55 / 0.5)",
                }}
              >
                <Star className="w-6 h-6 mx-auto mb-1" style={{ color: "oklch(0.80 0.18 55)" }} />
                <p className="text-xl font-bold" style={{ color: "oklch(0.80 0.18 55)" }}>+25</p>
                <p className="text-xs text-muted-foreground">Reward Points</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="rounded-xl p-4 text-center"
                style={{
                  background: "linear-gradient(135deg, oklch(0.28 0.10 290 / 0.4), oklch(0.22 0.06 280 / 0.4))",
                  border: "1px solid oklch(0.55 0.18 290 / 0.5)",
                }}
              >
                <Crown className="w-6 h-6 mx-auto mb-1" style={{ color: "oklch(0.75 0.18 290)" }} />
                <p className="text-sm font-bold" style={{ color: "oklch(0.75 0.18 290)" }}>1 Month</p>
                <p className="text-xs text-muted-foreground">Pro Free</p>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Day {day} Complete</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Your Insight</h1>
          </motion.div>
        )}

        {/* User's reflection */}
        {userReflection && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border/40 bg-card/60 p-5 mb-5"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Reflection</p>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{userReflection}</p>
          </motion.div>
        )}

        {/* AI insight */}
        {aiFeedback && (
          <AIReveal className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Your Mirror Reflects</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{aiFeedback}</p>
          </AIReveal>
        )}

        {/* Next day preview */}
        {!isLastDay && nextLesson && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl p-4 mb-6"
            style={{
              background: "oklch(0.17 0.04 280)",
              border: "1px solid oklch(0.28 0.05 280)",
            }}
          >
            <div className="flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Tomorrow — Day {nextLesson.day}</p>
                <p className="text-sm font-semibold text-foreground truncate">{nextLesson.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Come back tomorrow to continue your journey. One day at a time.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Encouragement message */}
        {!isLastDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mb-6"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              {day <= 7
                ? "You're building momentum. Every reflection is rewiring your inner voice."
                : day <= 14
                ? "You're halfway there. The patterns you're noticing now are the ones that change everything."
                : "The final stretch. You're not the same person who started Day 1 — and that's the whole point."}
            </p>
          </motion.div>
        )}

        {/* CTA */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/programs/${programId}`)}
            className="flex-1 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Program
          </Button>
          {isLastDay ? (
            <Button
              onClick={() => navigate("/home")}
              className="flex-1 gap-2"
            >
              <Crown className="w-4 h-4" />
              Back to Home
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/home")}
              className="flex-1 gap-2"
            >
              Home
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
