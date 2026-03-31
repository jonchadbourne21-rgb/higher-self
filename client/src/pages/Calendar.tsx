import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar as CalIcon,
  Heart,
  Target,
  Bell,
  Sparkles,
  Trash2,
  RefreshCw,
  Edit2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";

const TYPE_CONFIG = {
  therapy:  { label: "Therapy",  icon: Heart,    color: "#f43f5e", bg: "bg-rose-100 dark:bg-rose-900/30",     text: "text-rose-600 dark:text-rose-400" },
  goal:     { label: "Goal",     icon: Target,   color: "#8b5cf6", bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600 dark:text-violet-400" },
  habit:    { label: "Habit",    icon: Sparkles, color: "#10b981", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  reminder: { label: "Reminder", icon: Bell,     color: "#f59e0b", bg: "bg-amber-100 dark:bg-amber-900/30",   text: "text-amber-600 dark:text-amber-400" },
  other:    { label: "Other",    icon: CalIcon,  color: "#6b7280", bg: "bg-gray-100 dark:bg-gray-800",         text: "text-gray-600 dark:text-gray-400" },
};

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function pad(n: number) { return String(n).padStart(2, "0"); }

const EMPTY_FORM = {
  title: "",
  type: "other" as keyof typeof TYPE_CONFIG,
  date: "",
  time: "09:00",
  endTime: "",
  notes: "",
  isAllDay: false,
  recurrence: "none" as "none" | "weekly" | "monthly",
  recurrenceEnd: "",
};

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({
  event,
  onDelete,
  onEdit,
  showDate = false,
}: {
  event: {
    id: number; title: string; type: string;
    eventDate: Date | string; notes?: string | null;
    recurrence?: string | null; isAllDay?: boolean; endDate?: Date | string | null;
  };
  onDelete: () => void;
  onEdit: () => void;
  showDate?: boolean;
}) {
  const cfg  = TYPE_CONFIG[event.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.other;
  const Icon = cfg.icon;
  const d    = new Date(event.eventDate);
  const dateStr = showDate ? `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()} · ` : "";
  const time = event.isAllDay ? "All day" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isRecurring = event.recurrence && event.recurrence !== "none";

  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Icon className={`w-4 h-4 ${cfg.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm">{event.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-foreground/50">{cfg.label} · {dateStr}{time}</span>
          {isRecurring && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
              <RefreshCw className="w-2.5 h-2.5" />
              {event.recurrence === "weekly" ? "Weekly" : "Monthly"}
            </span>
          )}
        </div>
        {event.notes && <p className="text-xs text-foreground/60 mt-1 line-clamp-2">{event.notes}</p>}
      </div>
      <div className="flex gap-1">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <Edit2 className="w-4 h-4 text-foreground/30 hover:text-blue-500" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
        >
          <Trash2 className="w-4 h-4 text-foreground/30 hover:text-rose-500" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Calendar() {
  const today = new Date();
  const [year, setYear]               = useState(today.getFullYear());
  const [month, setMonth]             = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [newEvent, setNewEvent]       = useState({ ...EMPTY_FORM });
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const { data: events = [], refetch } = trpc.calendar.list.useQuery({ year, month });
  const createEvent = trpc.calendar.create.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); setNewEvent({ ...EMPTY_FORM }); },
  });
  const updateEvent = trpc.calendar.update.useMutation({
    onSuccess: () => { refetch(); setEditingEvent(null); setNewEvent({ ...EMPTY_FORM }); setShowCreate(false); },
  });
  const deleteEvent = trpc.calendar.delete.useMutation({ onSuccess: () => refetch() });

  // Calendar grid
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = useMemo(() => {
    const arr: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month, firstDay, daysInMonth]);

  const eventsByDay = useMemo(() => {
    const map: Record<number, typeof events> = {};
    for (const e of events) {
      const d = new Date(e.eventDate).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(e);
    }
    return map;
  }, [events]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  const handleSave = () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    const [y, mo, d] = newEvent.date.split("-").map(Number);
    const [h, min]   = newEvent.time.split(":").map(Number);
    const eventDate  = new Date(y, mo - 1, d, newEvent.isAllDay ? 0 : h, newEvent.isAllDay ? 0 : min);
    let endDate: number | undefined;
    if (newEvent.endTime && !newEvent.isAllDay) {
      const [eh, em] = newEvent.endTime.split(":").map(Number);
      endDate = new Date(y, mo - 1, d, eh, em).getTime();
    }
    let recurrenceEnd: number | undefined;
    if (newEvent.recurrence !== "none" && newEvent.recurrenceEnd) {
      recurrenceEnd = new Date(newEvent.recurrenceEnd).getTime();
    }

    if (editingEvent) {
      updateEvent.mutate({
        id: editingEvent.id,
        title: newEvent.title.trim(),
        type: newEvent.type,
        eventDate: eventDate.getTime(),
        endDate,
        notes: newEvent.notes || undefined,
        isAllDay: newEvent.isAllDay,
        recurrence: newEvent.recurrence,
        recurrenceEnd,
      });
    } else {
      createEvent.mutate({
        title: newEvent.title.trim(),
        type: newEvent.type,
        eventDate: eventDate.getTime(),
        endDate,
        notes: newEvent.notes || undefined,
        isAllDay: newEvent.isAllDay,
        recurrence: newEvent.recurrence,
        recurrenceEnd,
      });
    }
  };

  const openCreateForDay = (day: number) => {
    setEditingEvent(null);
    setNewEvent(f => ({ ...f, date: `${year}-${pad(month)}-${pad(day)}` }));
    setShowCreate(true);
  };

  const openEditEvent = (event: any) => {
    const d = new Date(event.eventDate);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const endDate = event.endDate ? new Date(event.endDate) : null;
    const endTimeStr = endDate ? endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const recEnd = event.recurrenceEnd ? new Date(event.recurrenceEnd) : null;
    const recEndStr = recEnd ? `${recEnd.getFullYear()}-${pad(recEnd.getMonth() + 1)}-${pad(recEnd.getDate())}` : "";
    
    setNewEvent({
      title: event.title,
      type: event.type,
      date: dateStr,
      time: timeStr,
      endTime: endTimeStr,
      notes: event.notes || "",
      isAllDay: event.isAllDay || false,
      recurrence: event.recurrence || "none",
      recurrenceEnd: recEndStr,
    });
    setEditingEvent(event);
    setShowCreate(true);
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-32">

        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
            <p className="text-sm text-foreground/50 mt-0.5">Goals, therapy &amp; reminders</p>
          </div>
          <button
            onClick={() => { setEditingEvent(null); setNewEvent({ ...EMPTY_FORM }); setShowCreate(true); }}
            className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Month nav */}
        <div className="px-5 flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground/70" />
          </button>
          <span className="font-semibold text-foreground text-base">{MONTHS[month - 1]} {year}</span>
          <button onClick={nextMonth} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ChevronRight className="w-5 h-5 text-foreground/70" />
          </button>
        </div>

        {/* Grid */}
        <div className="px-4">
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-foreground/40 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const isToday    = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
              const isSelected = day === selectedDay;
              const dayEvents  = eventsByDay[day] ?? [];
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all ${
                    isSelected ? "bg-violet-600 text-white" :
                    isToday    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" :
                                 "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="text-sm font-medium">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {dayEvents.slice(0, 3).map((e, idx) => (
                        <div
                          key={idx}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: isSelected ? "white" : (TYPE_CONFIG[e.type as keyof typeof TYPE_CONFIG]?.color ?? "#8b5cf6") }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-5 mt-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">{MONTHS[month - 1]} {selectedDay}</h2>
                <button
                  onClick={() => openCreateForDay(selectedDay)}
                  className="text-xs text-violet-600 dark:text-violet-400 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add event
                </button>
              </div>
              {selectedEvents.length === 0 ? (
                <div className="text-center py-8 text-foreground/40 text-sm">
                  No events this day. Tap "+ Add event" to create one.
                </div>
              ) : (
                selectedEvents.map((e, idx) => (
                  <EventCard key={`${e.id}-${idx}`} event={e} onDelete={() => deleteEvent.mutate({ id: e.id })} onEdit={() => openEditEvent(e)} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Month overview */}
        {!selectedDay && (
          <div className="px-5 mt-6 space-y-3">
            <h2 className="font-semibold text-foreground">This Month</h2>
            {events.length === 0 ? (
              <div className="text-center py-12 text-foreground/40 text-sm">
                No events yet. Tap + to add your first goal or therapy session.
              </div>
            ) : (
              events.map((e, idx) => (
                <EventCard key={`${e.id}-${idx}`} event={e} onDelete={() => deleteEvent.mutate({ id: e.id })} onEdit={() => openEditEvent(e)} showDate />
              ))
            )}
          </div>
        )}
      </div>

      {/* Create/Edit event modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full bg-background rounded-t-3xl p-6 pb-10 space-y-5 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{editingEvent ? "Edit Event" : "New Event"}</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 rounded-full hover:bg-muted">
                  <X className="w-5 h-5 text-foreground/60" />
                </button>
              </div>

              {/* Type chips */}
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[]).map((t) => {
                  const cfg  = TYPE_CONFIG[t];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => setNewEvent(f => ({ ...f, type: t }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        newEvent.type === t ? "border-transparent text-white" : "border-border text-foreground/60 bg-background"
                      }`}
                      style={newEvent.type === t ? { backgroundColor: cfg.color } : {}}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  placeholder={newEvent.type === "therapy" ? "e.g. Session with Dr. Smith" : "e.g. Morning meditation goal"}
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent(f => ({ ...f, date: e.target.value }))}
                />
              </div>

              {/* All-day toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/70">All day</span>
                <button
                  onClick={() => setNewEvent(f => ({ ...f, isAllDay: !f.isAllDay }))}
                  className={`w-11 h-6 rounded-full transition-colors ${newEvent.isAllDay ? "bg-violet-600" : "bg-muted"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${newEvent.isAllDay ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {/* Time */}
              {!newEvent.isAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Start Time</label>
                    <input
                      type="time"
                      className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent(f => ({ ...f, time: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">End Time</label>
                    <input
                      type="time"
                      className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent(f => ({ ...f, endTime: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* ── Repeat ── */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Repeat
                </label>
                <div className="flex gap-2">
                  {(["none", "weekly", "monthly"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setNewEvent(f => ({ ...f, recurrence: r }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                        newEvent.recurrence === r
                          ? "bg-violet-600 text-white border-transparent"
                          : "border-border text-foreground/60 bg-background hover:bg-muted"
                      }`}
                    >
                      {r === "none" ? "Never" : r === "weekly" ? "Weekly" : "Monthly"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repeat-until (only when recurring) */}
              <AnimatePresence>
                {newEvent.recurrence !== "none" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-1.5 overflow-hidden"
                  >
                    <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Repeat until <span className="normal-case font-normal text-foreground/40">(optional — leave empty to repeat indefinitely)</span>
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      value={newEvent.recurrenceEnd}
                      onChange={(e) => setNewEvent(f => ({ ...f, recurrenceEnd: e.target.value }))}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Notes (optional)</label>
                <textarea
                  className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none min-h-[70px]"
                  placeholder="Any details..."
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={!newEvent.title.trim() || !newEvent.date || (editingEvent ? updateEvent.isPending : createEvent.isPending)}
                className="w-full py-4 rounded-2xl font-semibold text-white text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
              >
                {(editingEvent ? updateEvent.isPending : createEvent.isPending) ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {editingEvent ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingEvent ? "Update Event" : "Add to Calendar"}
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
