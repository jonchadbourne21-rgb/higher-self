import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, Link } from "wouter";
import AppShell from "@/components/AppShell";
import {
  Plus, X, ChevronRight, Sparkles, Wand2, Search, Filter,
  Tag, Trash2, FolderPlus, Calendar, ChevronDown, SlidersHorizontal,
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { toast } from "sonner";
import { UpgradeModal } from "@/components/UpgradeModal";
import { RewardWheel } from "@/components/RewardWheel";
import { useAuth } from "@/_core/hooks/useAuth";

const MOOD_TAGS = ["Reflective", "Grateful", "Anxious", "Hopeful", "Sad", "Peaceful", "Confused", "Inspired", "Tired", "Joyful"];
const CATEGORY_COLORS = [
  "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];
const MIN_CONTENT_FOR_SUGGESTION = 60;
const SUGGESTION_DEBOUNCE_MS = 1800;

function groupEntriesByDate(entries: any[]) {
  const groups: { label: string; entries: any[] }[] = [];
  const map = new Map<string, any[]>();

  for (const entry of entries) {
    const d = new Date(entry.createdAt);
    let label: string;
    if (isToday(d)) label = "Today";
    else if (isYesterday(d)) label = "Yesterday";
    else if (isThisWeek(d)) label = format(d, "EEEE");
    else if (isThisMonth(d)) label = format(d, "MMMM d");
    else label = format(d, "MMMM yyyy");

    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(entry);
  }

  for (const [label, entries] of Array.from(map.entries())) {
    groups.push({ label, entries });
  }
  return groups;
}

export default function Journal() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();

  // ── Write state ──────────────────────────────────────────────────────────
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [moodTag, setMoodTag] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // ── Title suggestion state ───────────────────────────────────────────────
  const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [lastSuggestedContent, setLastSuggestedContent] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<number | null | undefined>(undefined);
  const [filterMood, setFilterMood] = useState<string | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  // ── Category management state ────────────────────────────────────────────
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  
  // ── Upgrade modal state ──────────────────────────────────────────────────
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showRewardWheel, setShowRewardWheel] = useState(false);
  const [wheelPrize, setWheelPrize] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const queryInput = useMemo(() => ({
    limit: 100,
    search: debouncedSearch || undefined,
    categoryId: filterCategory,
    moodTag: filterMood,
  }), [debouncedSearch, filterCategory, filterMood]);

  const { data: entries, refetch } = trpc.journal.list.useQuery(queryInput, {
    enabled: isAuthenticated,
  });

  const { data: categories, refetch: refetchCategories } = trpc.journal.categories.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // ── Mutations ────────────────────────────────────────────────────────────
  const createMutation = trpc.journal.create.useMutation({
    onSuccess: () => {
      toast.success("Saved! Your Higher Self is reflecting...");
      setIsCreating(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      if (error.message.includes("Weekly journal limit reached")) {
        setShowUpgradeModal(true);
      } else {
        toast.error("Failed to save entry");
      }
    },
  });

  const createCategoryMutation = trpc.journal.categories.create.useMutation({
    onSuccess: () => {
      toast.success("Category created");
      setNewCatName("");
      setNewCatColor(CATEGORY_COLORS[0]);
      refetchCategories();
    },
    onError: () => toast.error("Failed to create category"),
  });

  const deleteCategoryMutation = trpc.journal.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("Category deleted");
      refetchCategories();
      refetch();
    },
    onError: () => toast.error("Failed to delete category"),
  });

  const suggestTitleMutation = trpc.journal.suggestTitle.useMutation({
    onSuccess: (data) => {
      // Support both new multi-title response and legacy single-title fallback
      const titles = data.titles ?? (data.title ? [data.title] : []);
      setSuggestedTitles(titles);
      setSuggestedTitle(titles[0] ?? null);
      setIsSuggesting(false);
      setLastSuggestedContent(content);
    },
    onError: () => setIsSuggesting(false),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading]);

  const resetForm = useCallback(() => {
    setTitle("");
    setContent("");
    setMoodTag("");
    setSelectedCategoryId(null);
    setSuggestedTitle(null);
    setSuggestedTitles([]);
    setLastSuggestedContent("");
    setIsSuggesting(false);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  }, []);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (suggestedTitle && Math.abs(newContent.length - lastSuggestedContent.length) > 40) {
      setSuggestedTitle(null);
      setSuggestedTitles([]);
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (newContent.trim().length >= MIN_CONTENT_FOR_SUGGESTION) {
      debounceTimerRef.current = setTimeout(() => {
        if (!title && newContent.trim() !== lastSuggestedContent.trim()) {
          setIsSuggesting(true);
          setSuggestedTitle(null);
          suggestTitleMutation.mutate({ content: newContent });
        }
      }, SUGGESTION_DEBOUNCE_MS);
    }
  };

  const reSuggestTitle = () => {
    if (content.trim().length >= MIN_CONTENT_FOR_SUGGESTION && !isSuggesting) {
      setIsSuggesting(true);
      setSuggestedTitle(null);
      setSuggestedTitles([]);
      suggestTitleMutation.mutate({ content });
    }
  };

  const handleCreate = () => {
    if (!content.trim()) return;
    createMutation.mutate({
      title: title || undefined,
      content,
      moodTag: moodTag || undefined,
      categoryId: selectedCategoryId,
    });
  };

  const grouped = useMemo(() => groupEntriesByDate(entries ?? []), [entries]);
  const activeFilterCount = [
    debouncedSearch,
    filterCategory !== undefined ? 1 : null,
    filterMood,
  ].filter(Boolean).length;

  return (
    <>
      <AppShell>
      <div className="px-5 pt-8 pb-24 space-y-5">

        {/* ── Category + New Entry buttons ─────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 pt-4">
            <button
              onClick={() => setShowCategoryManager(true)}
              className="w-9 h-9 rounded-xl bg-secondary/60 border border-border/40 flex items-center justify-center hover:bg-secondary transition-all"
              title="Manage categories"
            >
              <Tag size={15} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-all"
              title="New entry"
            >
              <Plus size={16} className="text-primary" />
            </button>
          </div>

        {/* ── Write New Entry CTA (always visible) ───────────────────────── */}
        <button
          onClick={() => setIsCreating(true)}
          className="w-full glass rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left hover:border-primary/30 transition-all group"
        >
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
            <Plus size={15} className="text-primary" />
          </div>
          <span className="text-sm text-muted-foreground">What's on your mind today?</span>
          <span className="ml-auto text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">Write →</span>
        </button>

        {/* ── Search + Filter bar ─────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-secondary/40 border border-border/40 rounded-xl px-3 py-2">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, emotion, theme, or AI insight..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X size={13} className="text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                showFilters || activeFilterCount > 0
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal size={15} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="glass rounded-2xl p-4 space-y-3">
                  {/* Category filter */}
                  {categories && categories.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Category</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setFilterCategory(undefined)}
                          className={`px-3 py-1 rounded-full text-xs border transition-all ${
                            filterCategory === undefined
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setFilterCategory(null)}
                          className={`px-3 py-1 rounded-full text-xs border transition-all ${
                            filterCategory === null
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Uncategorized
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setFilterCategory(filterCategory === cat.id ? undefined : cat.id)}
                            className={`px-3 py-1 rounded-full text-xs border transition-all flex items-center gap-1.5 ${
                              filterCategory === cat.id
                                ? "border-transparent text-white"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                            style={filterCategory === cat.id ? { backgroundColor: cat.color } : {}}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mood filter */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Mood</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setFilterMood(undefined)}
                        className={`px-3 py-1 rounded-full text-xs border transition-all ${
                          !filterMood
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        All
                      </button>
                      {MOOD_TAGS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setFilterMood(filterMood === tag ? undefined : tag)}
                          className={`px-3 py-1 rounded-full text-xs border transition-all ${
                            filterMood === tag
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear all */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setFilterCategory(undefined);
                        setFilterMood(undefined);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Entry list grouped by date ──────────────────────────────────── */}
        {!entries || entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
            <span className="text-5xl">📝</span>
            <p className="text-muted-foreground text-sm">
              {debouncedSearch || filterCategory !== undefined || filterMood
                ? "No entries match your filters."
                : "Your journal is empty."}
            </p>
            {!debouncedSearch && filterCategory === undefined && !filterMood && (
              <p className="text-xs text-muted-foreground">
                Tap the field above to write your first entry.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.label} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  {group.label}
                </p>
                {group.entries.map((entry, i) => {
                  const cat = categories?.find((c) => c.id === entry.categoryId);
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link href={`/journal/${entry.id}`}>
                        <div className="glass rounded-2xl p-4 space-y-2 cursor-pointer hover:border-primary/20 transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {entry.title || "Untitled Entry"}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(entry.createdAt), "h:mm a")}
                                </p>
                                {cat && (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                                    style={{ backgroundColor: cat.color }}
                                  >
                                    {cat.name}
                                  </span>
                                )}
                                {entry.moodTag && (
                                  <span className="text-xs text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">
                                    {entry.moodTag}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {entry.aiPerspective && (
                                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                  ✦
                                </span>
                              )}
                              <ChevronRight size={14} className="text-muted-foreground" />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {entry.content}
                          </p>
                          {Array.isArray(entry.themes) && entry.themes.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {(entry.themes as string[]).slice(0, 3).map((theme) => (
                                <span
                                  key={theme}
                                  className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full"
                                >
                                  {theme}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      </AppShell>

      {/* ── New Entry Full-Screen Modal (outside AppShell so it covers the nav) ── */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col max-w-[480px] mx-auto"
          >
            {/* Modal header */}
            <div className="px-5 pt-8 pb-4 flex items-center justify-between border-b border-border/30">
              <h2 className="text-xl font-serif">New Entry</h2>
              <button
                onClick={() => { setIsCreating(false); resetForm(); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">

              {/* Title field */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="flex-1 bg-transparent border-b border-border/50 pb-2 text-xl font-serif text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                  {content.trim().length >= MIN_CONTENT_FOR_SUGGESTION && (
                    <button
                      onClick={reSuggestTitle}
                      disabled={isSuggesting}
                      title="Suggest a title"
                      className="pb-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                    >
                      <Wand2 size={16} className={isSuggesting ? "animate-pulse text-primary" : ""} />
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {isSuggesting && (
                    <motion.div
                      key="suggesting"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <Wand2 size={12} className="text-primary animate-pulse" />
                      <span>Crafting a title...</span>
                    </motion.div>
                  )}
                  {suggestedTitles.length > 0 && !isSuggesting && !title && (
                    <motion.div
                      key="suggestion"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex flex-col gap-2"
                    >
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wand2 size={11} className="text-primary" /> Pick a title:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {suggestedTitles.map((t, i) => (
                          <button
                            key={i}
                            onClick={() => { setTitle(t); setSuggestedTitles([]); setSuggestedTitle(null); }}
                            className="px-3 py-1 rounded-full text-xs border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-all font-medium text-left"
                          >
                            {t}
                          </button>
                        ))}
                        <button
                          onClick={() => { setSuggestedTitles([]); setSuggestedTitle(null); }}
                          className="text-xs text-muted-foreground hover:text-foreground px-2"
                        >
                          Dismiss
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Content textarea */}
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="What's present for you right now? Write freely, without judgment..."
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm leading-relaxed resize-none min-h-[220px]"
                autoFocus
              />

              {/* Mood tags */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">How are you feeling?</p>
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

              {/* Category selector */}
              {categories && categories.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Category (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategoryId(null)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        selectedCategoryId === null
                          ? "bg-secondary border-border text-foreground"
                          : "border-border/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      None
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all flex items-center gap-1.5 ${
                          selectedCategoryId === cat.id
                            ? "border-transparent text-white"
                            : "border-border/50 text-muted-foreground hover:text-foreground"
                        }`}
                        style={selectedCategoryId === cat.id ? { backgroundColor: cat.color } : {}}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── SAVE BUTTON ─────────────────────────────────────────────── */}
            <div className="px-5 pb-6 pt-4 border-t border-border/30 space-y-2 bg-background" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
              <Button
                onClick={handleCreate}
                disabled={!content.trim() || createMutation.isPending}
                className="w-full rounded-2xl py-5 text-base font-semibold glow-gold"
                size="lg"
              >
                {createMutation.isPending ? (
                  <span className="animate-pulse">Saving & reflecting...</span>
                ) : (
                  <><Sparkles size={17} className="mr-2" /> Save Entry</>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Your Higher Self will reflect on this entry after saving.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

       {/* ── Category Manager Modal (also outside AppShell) ────────────────────────── */}
      <AnimatePresence>
        {showCategoryManager && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-end max-w-[480px] mx-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCategoryManager(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full bg-background border-t border-border/40 rounded-t-3xl px-5 pt-5 pb-10"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-serif">My Categories</h3>
                <button onClick={() => setShowCategoryManager(false)}>
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              {/* Existing categories */}
              <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
                {!categories || categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No categories yet. Create one below.
                  </p>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm text-foreground">{cat.name}</span>
                      </div>
                      <button
                        onClick={() => deleteCategoryMutation.mutate({ id: cat.id })}
                        disabled={deleteCategoryMutation.isPending}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Create new category */}
              <div className="space-y-3 border-t border-border/30 pt-4">
                <p className="text-xs text-muted-foreground font-medium">Create new category</p>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name (e.g. Work, Growth, Dreams)"
                  maxLength={100}
                  className="w-full bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {CATEGORY_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewCatColor(color)}
                        className={`w-7 h-7 rounded-full transition-all ${
                          newCatColor === color ? "ring-2 ring-offset-2 ring-foreground/40 scale-110" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (!newCatName.trim()) return;
                    createCategoryMutation.mutate({ name: newCatName.trim(), color: newCatColor });
                  }}
                  disabled={!newCatName.trim() || createCategoryMutation.isPending}
                  className="w-full rounded-xl"
                >
                  <FolderPlus size={15} className="mr-2" />
                  {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="journal"
      />
      <RewardWheel
        isOpen={showRewardWheel}
        onClose={() => setShowRewardWheel(false)}
        onSpinComplete={(prize) => {
          setWheelPrize(prize);
          toast.success(`You won: ${prize}!`);
        }}
      />
    </>
  );
}
