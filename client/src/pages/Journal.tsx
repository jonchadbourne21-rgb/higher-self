import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import AppShell from "@/components/AppShell";
import { Plus, X, ChevronRight, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const MOOD_TAGS = ["Reflective", "Grateful", "Anxious", "Hopeful", "Sad", "Peaceful", "Confused", "Inspired", "Tired", "Joyful"];

export default function Journal() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [moodTag, setMoodTag] = useState("");

  const { data: entries, refetch } = trpc.journal.list.useQuery(
    { limit: 30 },
    { enabled: isAuthenticated }
  );

  const createMutation = trpc.journal.create.useMutation({
    onSuccess: () => {
      toast.success("Entry saved. Your Higher Self is reflecting...");
      setIsCreating(false);
      setTitle("");
      setContent("");
      setMoodTag("");
      refetch();
    },
    onError: () => toast.error("Failed to save entry"),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  const handleCreate = () => {
    if (!content.trim()) return;
    createMutation.mutate({ title, content, moodTag: moodTag || undefined });
  };

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-light">Journal</h1>
            <p className="text-xs text-muted-foreground mt-1">Your inner world, witnessed</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-all"
          >
            <Plus size={18} className="text-primary" />
          </button>
        </div>

        {/* New entry modal */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col max-w-[480px] mx-auto"
            >
              <div className="px-5 pt-8 pb-4 flex items-center justify-between border-b border-border/30">
                <h2 className="text-xl font-serif">New Entry</h2>
                <button onClick={() => setIsCreating(false)} className="text-muted-foreground">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full bg-transparent border-b border-border/50 pb-2 text-xl font-serif text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's present for you right now? Write freely, without judgment..."
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm leading-relaxed resize-none min-h-[200px]"
                  autoFocus
                />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">How are you feeling?</p>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_TAGS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setMoodTag(moodTag === tag ? "" : tag)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                          moodTag === tag
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-5 pb-8 pt-4 border-t border-border/30">
                <Button
                  onClick={handleCreate}
                  disabled={!content.trim() || createMutation.isPending}
                  className="w-full rounded-2xl py-5 glow-gold"
                >
                  {createMutation.isPending ? (
                    <span className="animate-pulse">Saving & reflecting...</span>
                  ) : (
                    <><Sparkles size={16} className="mr-2" /> Save & Get Perspective</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Entries list */}
        {!entries || entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
            <span className="text-5xl">📝</span>
            <p className="text-muted-foreground text-sm">Your journal is empty.</p>
            <p className="text-xs text-muted-foreground">Write your first entry and receive your Higher Self's perspective.</p>
            <Button onClick={() => setIsCreating(true)} variant="outline" className="rounded-2xl">
              Write First Entry
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/journal/${entry.id}`}>
                  <div className="glass rounded-2xl p-4 space-y-2 cursor-pointer hover:border-primary/20 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {entry.title || "Untitled Entry"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(entry.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.aiPerspective && (
                          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">✦ Reflected</span>
                        )}
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {entry.content}
                    </p>
                    {Array.isArray(entry.themes) && entry.themes.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {(entry.themes as string[]).slice(0, 3).map((theme) => (
                          <span key={theme} className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                            {theme}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
