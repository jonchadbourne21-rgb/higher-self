import { useState } from "react";
import { Link } from "wouter";
import { Mic, ChevronDown, ChevronUp, BookOpen, Clock, MessageSquare, Pencil, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";

// ── Emotion badge color ────────────────────────────────────────────────────────
function emotionColor(name: string): string {
  const map: Record<string, string> = {
    joy: "bg-yellow-500/20 text-yellow-300",
    sadness: "bg-blue-500/20 text-blue-300",
    anger: "bg-red-500/20 text-red-300",
    fear: "bg-purple-500/20 text-purple-300",
    surprise: "bg-orange-500/20 text-orange-300",
    disgust: "bg-green-500/20 text-green-300",
    contempt: "bg-slate-500/20 text-slate-300",
    anxiety: "bg-indigo-500/20 text-indigo-300",
    excitement: "bg-amber-500/20 text-amber-300",
    calmness: "bg-teal-500/20 text-teal-300",
  };
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v;
  }
  return "bg-primary/20 text-primary";
}

function formatDuration(startedAt: Date, endedAt: Date | null): string {
  if (!endedAt) return "In progress";
  const diffMs = endedAt.getTime() - startedAt.getTime();
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// ── Session detail component ──────────────────────────────────────────────────

interface SessionDetailProps {
  sessionId: number;
  onSaveToJournal: (sessionId: number) => void;
  savingId: number | null;
}

function SessionDetail({ sessionId, onSaveToJournal, savingId }: SessionDetailProps) {
  const { data: messages, isLoading } = trpc.voice.getSessionMessages.useQuery({ sessionId });

  if (isLoading) {
    return (
      <div className="px-4 py-4 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="px-4 py-3 text-sm text-muted-foreground italic">
        No transcript available for this session.
      </div>
    );
  }

  const userMessages = messages.filter((m) => m.role === "user");
  const allEmotions: { name: string; score: number }[] = [];
  userMessages.forEach((m) => {
    if (m.emotion1Name && m.emotion1Score) allEmotions.push({ name: m.emotion1Name, score: m.emotion1Score });
    if (m.emotion2Name && m.emotion2Score) allEmotions.push({ name: m.emotion2Name, score: m.emotion2Score });
    if (m.emotion3Name && m.emotion3Score) allEmotions.push({ name: m.emotion3Name, score: m.emotion3Score });
  });

  // Aggregate emotion scores
  const emotionMap: Record<string, number[]> = {};
  allEmotions.forEach(({ name, score }) => {
    if (!emotionMap[name]) emotionMap[name] = [];
    emotionMap[name].push(score);
  });
  const topEmotions = Object.entries(emotionMap)
    .map(([name, scores]) => ({ name, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  return (
    <div className="border-t border-border/30">
      {/* Emotion summary */}
      {topEmotions.length > 0 && (
        <div className="px-4 py-3 border-b border-border/20">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Emotional tone</p>
          <div className="flex flex-wrap gap-1.5">
            {topEmotions.map((e) => (
              <span
                key={e.name}
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${emotionColor(e.name)}`}
              >
                {e.name} {Math.round(e.avg * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
        {messages
          .filter((m) => m.role !== "system")
          .map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary/20 text-foreground rounded-br-sm"
                    : "bg-secondary/60 text-muted-foreground rounded-bl-sm"
                }`}
              >
                <p className="text-[11px] font-medium mb-1 opacity-60">
                  {m.role === "user" ? "You" : "Mirror"}
                </p>
                <p>{m.transcript}</p>
              </div>
            </div>
          ))}
      </div>

      {/* Save to Journal */}
      <div className="px-4 pb-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-sm border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => onSaveToJournal(sessionId)}
          disabled={savingId === sessionId}
        >
          {savingId === sessionId ? (
            <>
              <span className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <BookOpen className="w-4 h-4" />
              Save to Journal
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function VoiceHistory() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const utils = trpc.useUtils();
  const { data: sessions, isLoading } = trpc.voice.getSessions.useQuery();
  const saveToJournalMut = trpc.voice.saveToJournal.useMutation({
    onSuccess: () => {
      toast.success("Session saved to your Journal!");
      setSavingId(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save to journal.");
      setSavingId(null);
    },
  });
  const renameMut = trpc.voice.renameSession.useMutation({
    onSuccess: () => {
      toast.success("Session renamed!");
      setEditingId(null);
      utils.voice.getSessions.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to rename session.");
    },
  });

  const handleSaveToJournal = (sessionId: number) => {
    setSavingId(sessionId);
    saveToJournalMut.mutate({ sessionId });
  };

  return (
    <AppShell>
      <div className="flex flex-col w-full px-4 py-4">
        {/* Content */}
        <main className="flex-1">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && (!sessions || sessions.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="w-8 h-8 text-primary/60" />
              </div>
              <div>
                <p className="text-foreground font-medium">No voice sessions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start a Voice Mirror session to see your history here.
                </p>
              </div>
              <Link href="/mirror">
                <Button className="mt-2 gap-2">
                  <Mic className="w-4 h-4" />
                  Start a Session
                </Button>
              </Link>
            </div>
          )}

          {!isLoading && sessions && sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map((session, idx) => {
                const isExpanded = expandedId === session.id;
                const startDate = new Date(session.startedAt);
                const endDate = session.endedAt ? new Date(session.endedAt) : null;

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden"
                  >
                    {/* Session header row */}
                    <div className="w-full px-4 py-4 flex items-center gap-3">
                      <button
                        className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-secondary/20 transition-colors rounded-lg -m-1 p-1"
                        onClick={() => setExpandedId(isExpanded ? null : session.id)}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Mic className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingId === session.id ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="text-sm font-medium bg-secondary/40 border border-border/60 rounded px-2 py-0.5 w-full text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                autoFocus
                                maxLength={200}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && editTitle.trim()) {
                                    renameMut.mutate({ sessionId: session.id, title: editTitle.trim() });
                                  } else if (e.key === "Escape") {
                                    setEditingId(null);
                                  }
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (editTitle.trim()) renameMut.mutate({ sessionId: session.id, title: editTitle.trim() });
                                }}
                                className="p-1 text-green-400 hover:text-green-300"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                                className="p-1 text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-foreground truncate">
                              {session.title || startDate.toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                            {endDate && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MessageSquare className="w-3 h-3" />
                                {formatDuration(startDate, endDate)}
                              </span>
                            )}
                            {!endDate && (
                              <span className="text-xs text-amber-400">In progress</span>
                            )}
                          </div>
                        </div>
                      </button>
                      {/* Rename button */}
                      {editingId !== session.id && (
                        <button
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(session.id);
                            setEditTitle(session.title || "");
                          }}
                          title="Rename session"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <div className="text-muted-foreground">
                        <button onClick={() => setExpandedId(isExpanded ? null : session.id)}>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <SessionDetail
                            sessionId={session.id}
                            onSaveToJournal={handleSaveToJournal}
                            savingId={savingId}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
