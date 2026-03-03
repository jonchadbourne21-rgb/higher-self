import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Plus, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const DOMAIN_EMOJIS: Record<string, string> = {
  mindset: "🧠", relationships: "❤️", work: "⚡", health: "🌿",
  spirituality: "✨", finances: "🌊", overall: "🌟",
};

export default function Timeline() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<string>("overall");
  const [emoji, setEmoji] = useState("🌱");

  const { data: milestones, refetch } = trpc.timeline.milestones.useQuery(undefined, { enabled: isAuthenticated });
  const { data: recentCheckIns } = trpc.checkIn.recent.useQuery({ days: 30 }, { enabled: isAuthenticated });

  const addMutation = trpc.timeline.addMilestone.useMutation({
    onSuccess: () => {
      toast.success("Milestone added ✦");
      setShowAdd(false);
      setTitle("");
      setDescription("");
      refetch();
    },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  // Build timeline events from milestones + check-ins
  const timelineEvents = [
    ...(milestones || []).map((m) => ({
      id: `m-${m.id}`,
      type: "milestone" as const,
      date: new Date(m.achievedAt),
      title: m.title,
      description: m.description,
      emoji: m.emoji || "🌱",
      domain: m.domain,
    })),
    ...(recentCheckIns || []).filter((c) => c.mood >= 8).map((c) => ({
      id: `c-${c.id}`,
      type: "checkin" as const,
      date: new Date(c.createdAt),
      title: `High mood day — ${c.mood}/10`,
      description: c.reflection || undefined,
      emoji: "✨",
      domain: "overall",
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-light">Timeline</h1>
            <p className="text-xs text-muted-foreground mt-1">Your evolution, moment by moment</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-all"
          >
            <Plus size={18} className="text-primary" />
          </button>
        </div>

        {/* Timeline */}
        {timelineEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
            <span className="text-5xl">🌱</span>
            <p className="text-muted-foreground text-sm">Your journey is just beginning.</p>
            <p className="text-xs text-muted-foreground">Add your first milestone or complete daily check-ins to see your timeline grow.</p>
            <Button onClick={() => setShowAdd(true)} variant="outline" className="rounded-2xl">
              Add First Milestone
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-6 pl-14">
              {timelineEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative"
                >
                  {/* Dot */}
                  <div className={`absolute -left-9 w-8 h-8 rounded-full flex items-center justify-center ${
                    event.type === "milestone"
                      ? "bg-primary/10 border border-primary/50"
                      : "bg-secondary/50 border border-border"
                  }`}>
                    <span className="text-sm">{event.emoji}</span>
                  </div>

                  <div className={`glass rounded-2xl p-4 space-y-2 ${
                    event.type === "milestone" ? "border border-primary/10" : ""
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${event.type === "milestone" ? "text-foreground" : "text-muted-foreground"}`}>
                        {event.title}
                      </p>
                      <p className="text-xs text-muted-foreground flex-shrink-0">
                        {format(event.date, "MMM d")}
                      </p>
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
                    )}
                    {event.domain && event.domain !== "overall" && (
                      <span className="text-xs text-muted-foreground">
                        {DOMAIN_EMOJIS[event.domain]} {event.domain}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Milestone Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-end max-w-[480px] mx-auto"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full glass rounded-t-3xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif">New Milestone</h3>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="w-14 bg-input border border-border rounded-xl px-3 py-3 text-center text-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What did you achieve?"
                    className="flex-1 bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                    autoFocus
                  />
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this milestone... (optional)"
                  rows={3}
                  className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                />

                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(DOMAIN_EMOJIS).map(([d, e]) => (
                    <button
                      key={d}
                      onClick={() => setDomain(d)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all ${
                        domain === d
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      <span className="text-base">{e}</span>
                      <span className="capitalize text-[10px]">{d}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => addMutation.mutate({ title, description, domain: domain as any, emoji })}
                disabled={!title.trim() || addMutation.isPending}
                className="w-full rounded-2xl py-5"
              >
                Add Milestone
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
