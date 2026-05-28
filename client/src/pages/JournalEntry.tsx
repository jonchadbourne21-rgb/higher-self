import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import AppShell from "@/components/AppShell";
import { ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { Streamdown } from "streamdown";

export default function JournalEntry() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || "0");

  const { data: entry, isLoading } = trpc.journal.get.useQuery(
    { id },
    { enabled: isAuthenticated && !!id }
  );

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/journal")} className="text-muted-foreground">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-serif flex-1 truncate">{entry?.title || "Journal Entry"}</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : entry ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                {format(new Date(entry.createdAt), "EEEE, MMMM d, yyyy")}
              </p>
              {entry.moodTag && (
                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                  {entry.moodTag}
                </span>
              )}
            </div>

            {/* Journal content */}
            <div className="glass rounded-3xl p-5">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{entry.content}</p>
            </div>

            {/* Themes */}
            {Array.isArray(entry.themes) && entry.themes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Themes</p>
                <div className="flex flex-wrap gap-2">
                  {(entry.themes as string[]).map((theme) => (
                    <span key={theme} className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Perspective */}
            {entry.aiPerspective ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <span className="text-xs">✦</span>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">Your Higher Self Reflects</p>
                </div>
                <div className="glass rounded-3xl p-5 border border-primary/10">
                  <div className="streamdown-content">
                    <Streamdown>{entry.aiPerspective}</Streamdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass rounded-3xl p-5 border border-dashed border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <span className="text-xs animate-pulse">✦</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Your Higher Self is reflecting on this entry...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Entry not found.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
