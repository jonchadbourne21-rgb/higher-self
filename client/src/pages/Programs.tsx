import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  "emotional-mastery": "Emotional Mastery",
  "building-presence": "Building Presence",
  "relationships": "Relationships",
  "mindfulness": "Mindfulness",
  "self-awareness": "Self-Awareness",
  "zen-philosophy": "Zen Philosophy",
  "stoicism": "Stoicism",
};

const CATEGORY_COLORS: Record<string, string> = {
  "emotional-mastery": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "building-presence": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "relationships": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "mindfulness": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "self-awareness": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "zen-philosophy": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "stoicism": "bg-red-500/20 text-red-300 border-red-500/30",
};

// Better icons — no brain, consistent visual weight
const PROGRAM_ICONS: Record<string, string> = {
  "emotional-mastery": "🌊",
  "building-presence": "✨",
  "relationships": "❤️",
  "mindfulness": "🧘",
  "self-awareness": "🪞",
  "zen-philosophy": "🎭",
  "stoicism": "🏛️",
};

// Per-program override (slug or name-based) for unique identity
const PROGRAM_ICON_OVERRIDES: Record<string, string> = {
  "21-Day Inner Voice Reset": "🪞",
  "7-Day Emotional Mastery": "🌊",
  "The Alan Watts Challenge": "🎭",
  "The Stoic Path": "🏛️",
};

function getProgramIcon(program: { name: string; category: string }): string {
  return (
    PROGRAM_ICON_OVERRIDES[program.name] ??
    PROGRAM_ICONS[program.category] ??
    "🌱"
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Programs() {
  const [, navigate] = useLocation();
  const { data: programs, isLoading } = trpc.programs.list.useQuery();
  const { data: enrollments } = trpc.programs.myEnrollments.useQuery();

  const enrolledIds = new Set(enrollments?.map((e) => e.programId) ?? []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-28">

        {/* In Progress */}
        {enrollments && enrollments.filter((e) => e.status !== "completed").length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-2">In Progress</h2>
            <div className="space-y-3">
              {enrollments
                .filter((e) => e.status !== "completed")
                .map((enrollment) => {
                  const prog = enrollment.program;
                  const icon = getProgramIcon({
                    name: prog?.name ?? "",
                    category: prog?.category ?? "self-awareness",
                  });
                  const pct = Math.round(
                    ((enrollment.currentDay ?? 1) - 1) /
                      (prog?.durationDays ?? 7) *
                      100
                  );
                  return (
                    <motion.button
                      key={enrollment.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => navigate(`/programs/${enrollment.programId}`)}
                      className="w-full text-left rounded-xl border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-all"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Icon — same size as All Programs cards */}
                          <span className="text-3xl shrink-0 leading-none">{icon}</span>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-sm leading-snug truncate">
                              {prog?.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Day {enrollment.currentDay} of {prog?.durationDays}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
            </div>
          </div>
        )}

        {/* All Programs */}
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">All Programs</h2>

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
              const icon = getProgramIcon(program);
              const categoryColor =
                CATEGORY_COLORS[program.category] ??
                "bg-muted/40 text-muted-foreground border-border/40";
              const categoryLabel =
                CATEGORY_LABELS[program.category] ?? program.category;

              return (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  className="rounded-xl border border-border/40 bg-card p-5 hover:border-primary/40 transition-all cursor-pointer group"
                  onClick={() => navigate(`/programs/${program.id}`)}
                >
                  {/* ── Unified card layout ── */}
                  <div className="flex items-start gap-4">
                    {/* Icon — consistent 3xl, same for every card */}
                    <span className="text-3xl shrink-0 leading-none mt-0.5">{icon}</span>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-foreground text-base leading-snug">
                          {program.name}
                        </h3>
                        {/* Status badge — same style for all */}
                        {isCompleted ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs border shrink-0 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </Badge>
                        ) : isEnrolled ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs border shrink-0">
                            In Progress
                          </Badge>
                        ) : null}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                        {program.description}
                      </p>

                      {/* Meta row — category tag + days + lessons, identical for every card */}
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${categoryColor}`}
                        >
                          {categoryLabel}
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

                    {/* Chevron — same position for every card */}
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
  );
}
