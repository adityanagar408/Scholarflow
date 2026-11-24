import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  List,
  MapPin,
  Plus,
  Send,
  Share2,
  Trash2,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import type { CalendarEvent, EventCategory } from '../../types/portal';
import {
  EVENT_CATEGORY_META,
  SUBJECT_COLORS,
  formatCountdown,
  formatShortDate,
  getEventDateTime,
  getTodayIsoDate,
} from '../../utils/portalHelpers';
import { Modal } from '../ui/Modal';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CATEGORY_LIST: EventCategory[] = [
  'exam',
  'assignment',
  'fest',
  'club',
  'class',
  'personal',
];

export const CalendarView: React.FC = () => {
  const {
    workspace,
    channels,
    addEvent,
    updateEvent,
    deleteEvent,
    sendChatMessage,
    setActiveSection,
    notify,
  } = usePortal();

  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [cursorDate, setCursorDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDayIso, setSelectedDayIso] = useState<string>(getTodayIsoDate());
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Event modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('exam');
  const [color, setColor] = useState(EVENT_CATEGORY_META.exam.defaultColor);
  const [date, setDate] = useState(getTodayIsoDate());
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [subjectId, setSubjectId] = useState('');

  // Share Event to Chat Modal
  const [shareEvent, setShareEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const todayIso = getTodayIsoDate();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of workspace.events) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [workspace.events]);

  const sortedAgenda = useMemo(() => {
    return [...workspace.events].sort(
      (a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime()
    );
  }, [workspace.events]);

  const selectedDayEvents = useMemo(
    () =>
      (eventsByDate.get(selectedDayIso) ?? []).sort((a, b) =>
        (a.time || '').localeCompare(b.time || '')
      ),
    [eventsByDate, selectedDayIso]
  );

  // Build 42-day calendar grid for cursorDate's month
  const monthDays = useMemo(() => {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { iso: string; day: number; inMonth: boolean }[] = [];

    // Leading days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dt = new Date(year, month - 1, d);
      cells.push({
        iso: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(d).padStart(2, '0')}`,
        day: d,
        inMonth: false,
      });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        iso: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(
          2,
          '0'
        )}`,
        day: d,
        inMonth: true,
      });
    }
    // Trailing days to complete weeks
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(year, month + 1, d);
      cells.push({
        iso: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(d).padStart(2, '0')}`,
        day: d,
        inMonth: false,
      });
    }
    return cells;
  }, [cursorDate]);

  const openCreateModal = (prefillDate?: string) => {
    setEditingEvent(null);
    setTitle('');
    setCategory('exam');
    setColor(EVENT_CATEGORY_META.exam.defaultColor);
    setDate(prefillDate || selectedDayIso || todayIso);
    setTime('09:00');
    setLocation('');
    setNotes('');
    setSubjectId('');
    setModalOpen(true);
  };

  const openEditModal = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setCategory(ev.category);
    setColor(ev.color);
    setDate(ev.date);
    setTime(ev.time);
    setLocation(ev.location);
    setNotes(ev.notes);
    setSubjectId(ev.subjectId ?? '');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    const payload = {
      title: title.trim(),
      category,
      color,
      date,
      time,
      location: location.trim(),
      notes: notes.trim(),
      subjectId: subjectId || null,
    };
    if (editingEvent) {
      updateEvent(editingEvent.id, payload);
    } else {
      addEvent(payload);
    }
    setSelectedDayIso(date);
    setModalOpen(false);
  };

  const handleShareEventToChannel = (channelId: string) => {
    if (!shareEvent) return;
    sendChatMessage(channelId, `Shared event: ${shareEvent.title}`, {
      kind: 'event',
      eventId: shareEvent.id,
      title: shareEvent.title,
      category: shareEvent.category,
      color: shareEvent.color,
      date: shareEvent.date,
      time: shareEvent.time,
      location: shareEvent.location,
    });
    setShareEvent(null);
    notify('Event shared to chat!', 'success');
    setActiveSection('chat');
  };

  const monthLabel = cursorDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-[var(--bg-subtle)] p-1">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`inline-flex items-center gap-1.5 min-h-[34px] px-3 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`inline-flex items-center gap-1.5 min-h-[34px] px-3 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda ({workspace.events.length})</span>
            </button>
          </div>

          {viewMode === 'month' && (
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() =>
                  setCursorDate(
                    new Date(
                      cursorDate.getFullYear(),
                      cursorDate.getMonth() - 1,
                      1
                    )
                  )
                }
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCursorDate(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDayIso(todayIso);
                }}
                className="min-h-[36px] px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium hover:bg-[var(--bg-subtle)]"
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  setCursorDate(
                    new Date(
                      cursorDate.getFullYear(),
                      cursorDate.getMonth() + 1,
                      1
                    )
                  )
                }
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => openCreateModal()}
          className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)] whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Event / Deadline</span>
        </button>
      </div>

      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Monthly Grid */}
          <section className="xl:col-span-8 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border-hairline)] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {monthLabel}
              </h2>
              <span className="text-xs text-[var(--text-muted)] tabular-nums">
                {workspace.events.length} scheduled
              </span>
            </div>

            <div className="grid grid-cols-7 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]/50">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-[11px] font-semibold text-[var(--text-muted)]"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthDays.map((cell) => {
                const dayEvents = eventsByDate.get(cell.iso) ?? [];
                const isToday = cell.iso === todayIso;
                const isSelected = cell.iso === selectedDayIso;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelectedDayIso(cell.iso)}
                    className={`min-h-[76px] sm:min-h-[96px] p-1.5 sm:p-2 border-b border-r border-[var(--border-hairline)] text-left flex flex-col transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-soft)]/70'
                        : 'hover:bg-[var(--bg-subtle)]/60'
                    } ${!cell.inMonth ? 'opacity-45' : ''}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono tabular-nums ${
                        isToday
                          ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-semibold'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {cell.day}
                    </span>

                    <div className="mt-1 space-y-1 w-full overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center gap-1 text-[11px] truncate text-[var(--text-primary)]"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: ev.color }}
                          />
                          <span className="truncate hidden sm:inline">
                            {ev.title}
                          </span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] font-mono text-[var(--text-muted)]">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Selected Day Panel */}
          <aside className="xl:col-span-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[var(--border-hairline)]">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatShortDate(selectedDayIso)}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {selectedDayEvents.length}{' '}
                  {selectedDayEvents.length === 1 ? 'item' : 'items'} scheduled
                </p>
              </div>
              <button
                type="button"
                onClick={() => openCreateModal(selectedDayIso)}
                className="inline-flex items-center gap-1 min-h-[34px] px-3 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-ink)] text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs text-[var(--text-muted)]">
                  No exams, deadlines, or campus events on this date.
                </p>
                <button
                  type="button"
                  onClick={() => openCreateModal(selectedDayIso)}
                  className="mt-3 text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  + Schedule for {formatShortDate(selectedDayIso)}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-hairline)]">
                {selectedDayEvents.map((ev) => {
                  const countdown = formatCountdown(ev, nowMs);
                  return (
                    <div key={ev.id} className="py-3.5 first:pt-4 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: ev.color }}
                            />
                            <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                              {ev.title}
                            </h4>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
                            <span>{EVENT_CATEGORY_META[ev.category].label}</span>
                            {ev.time && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">
                                  {ev.time}
                                </span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span
                              className={`font-mono tabular-nums font-medium ${
                                countdown.isUrgent
                                  ? 'text-[var(--danger)]'
                                  : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              {countdown.text}
                            </span>
                          </div>
                          {ev.location && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </div>
                          )}
                          {ev.notes && (
                            <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                              {ev.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setShareEvent(ev)}
                            aria-label="Share event to chat"
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(ev)}
                            aria-label="Edit event"
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEvent(ev.id)}
                            aria-label="Delete event"
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      ) : (
        /* Agenda List View */
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6">
          {sortedAgenda.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="w-6 h-6 mx-auto text-[var(--text-muted)] mb-2" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Your agenda is blank
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Add exams, assignment deadlines, campus fests, or club events to track live countdown timers.
              </p>
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="mt-4 inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Event</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {sortedAgenda.map((ev) => {
                const countdown = formatCountdown(ev, nowMs);
                return (
                  <div
                    key={ev.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ev.color }}
                        />
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                          {ev.title}
                        </h4>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[var(--text-muted)]">
                        <span>{EVENT_CATEGORY_META[ev.category].label}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatShortDate(ev.date)}</span>
                        {ev.time && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {ev.time}
                            </span>
                          </>
                        )}
                        {ev.location && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{ev.location}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span
                        className={`font-mono tabular-nums text-xs font-semibold ${
                          countdown.isPast
                            ? 'text-[var(--text-muted)]'
                            : countdown.isUrgent
                            ? 'text-[var(--danger)]'
                            : 'text-[var(--accent)]'
                        }`}
                      >
                        {countdown.text}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShareEvent(ev)}
                          aria-label="Share event"
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(ev)}
                          aria-label="Edit event"
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEvent(ev.id)}
                          aria-label="Delete event"
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Add / Edit Event Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEvent ? 'Edit Event' : 'Add Event or Deadline'}
        description="Color-code exams, assignments, fests, and club events with live countdowns."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Event Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Exam · Operating Systems"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const next = e.target.value as EventCategory;
                  setCategory(next);
                  setColor(EVENT_CATEGORY_META[next].defaultColor);
                }}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                {CATEGORY_LIST.map((cat) => (
                  <option key={cat} value={cat}>
                    {EVENT_CATEGORY_META[cat].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Related Subject (Optional)
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="">None</option>
                {workspace.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Location / Submission Link (Optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Lecture Hall B2 or LMS Portal"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Chapters covered, required materials, or checklist..."
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              Color Code
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  aria-label={`Color ${hex}`}
                  className={`w-7 h-7 rounded-full ${
                    color === hex
                      ? 'ring-2 ring-offset-2 ring-[var(--accent)]'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[40px] px-4 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
            >
              {editingEvent ? 'Save Event' : 'Add to Calendar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Share Event to Chat Modal */}
      <Modal
        open={!!shareEvent}
        onClose={() => setShareEvent(null)}
        title="Share Event to Chat"
        description="Post this event card into a classmate chat or study group."
        maxWidth="sm"
      >
        {channels.length === 0 ? (
          <div className="py-4 text-center space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              No active chats or study groups yet. Create one first in Chat &amp; Groups.
            </p>
            <button
              type="button"
              onClick={() => {
                setShareEvent(null);
                setActiveSection('chat');
              }}
              className="min-h-[38px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
            >
              Open Chat &amp; Groups
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[var(--border-hairline)]"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {ch.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {ch.type === 'group' ? 'Study Group' : 'Direct Chat'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleShareEventToChannel(ch.id)}
                  className="inline-flex items-center gap-1.5 min-h-[34px] px-3 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-ink)] text-xs font-medium"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
