import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  "emotional-mastery": "Emotional Mastery",
  "building-presence": "Building Presence",
  "relationships": "Relationships",
  "mindfulness": "Mindfulness",
};

const CATEGORY_COLORS: Record<string, string> = {
  "emotional-mastery": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "building-presence": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "relationships": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "mindfulness": "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

const PROGRAM_ICONS: Record<string, string> = {
  "emotional-mastery": "🧠",
  "building-presence": "✨",
  "relationships": "❤️",
  "mindfulness": "🧘",
};

export default function Programs() {
  const [, navigate] = useLocation();
  const { data: programs, isLoading } = trpc.programs.list.useQuery();
  const { data: enrollments } = trpc.programs.myEnrollments.useQuery();

  const enrolledIds = new Set(enrollments?.map((e) => e.programId) ?? []);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-28">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Growth Programs</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Your Growth Path</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Structured journeys designed to help you understand yourself more deeply — one day at a time.
          </p>
        </div>

        {/* My Enrollments */}
        {enrollments && enrollments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">In Progress</h2>
            <div className="space-y-3">
              {enrollments
                .filter((e) => e.status !== "completed")
                .map((enrollment) => (
                  <motion.button
                    key={enrollment.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate(`/programs/${enrollment.programId}`)}
                    className="w-full text-left rounded-xl border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {PROGRAM_ICONS[enrollment.program?.category ?? "emotional-mastery"]}
                        </span>
                        <div>
                          <div className="font-semibold text-foreground text-sm">{enrollment.program?.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Day {enrollment.currentDay} of {enrollment.program?.durationDays}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${Math.round(((enrollment.currentDay ?? 1) - 1) / (enrollment.program?.durationDays ?? 7) * 100)}%`,
                            }}
                          />
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </motion.button>
                ))}
            </div>
          </div>
        )}

        {/* All Programs */}
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">All Programs</h2>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {(programs ?? []).map((program, idx) => {
              const isEnrolled = enrolledIds.has(program.id);
              const enrollment = enrollments?.find((e) => e.programId === program.id);
              const isCompleted = enrollment?.status === "completed";

              return (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  className="rounded-xl border border-border/40 bg-card p-5 hover:border-primary/40 transition-all cursor-pointer group"
                  onClick={() => navigate(`/programs/${program.id}`)}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl shrink-0 mt-0.5">
                      {PROGRAM_ICONS[program.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground text-base leading-snug">{program.name}</h3>
                        {isCompleted ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs border shrink-0">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                          </Badge>
                        ) : isEnrolled ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs border shrink-0">
                            In Progress
                          </Badge>
                        ) : null}
                      </div>

                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                        {program.description}
                      </p>

                      <div className="flex items-center gap-3 mt-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[program.category] ?? "bg-muted text-muted-foreground"}`}>
                          {CATEGORY_LABELS[program.category] ?? program.category}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {program.durationDays} days
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BookOpen className="w-3 h-3" />
                          {program.durationDays} lessons
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
