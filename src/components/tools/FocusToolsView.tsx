import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Flame,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import type { TaskPriority } from '../../types/portal';
import {
  calculateHabitStreak,
  formatShortDate,
  getTodayIsoDate,
} from '../../utils/portalHelpers';

type TimerPhase = 'focus' | 'short' | 'long';

const PHASE_DEFAULTS: Record<TimerPhase, { label: string; minutes: number }> = {
  focus: { label: 'Focus', minutes: 25 },
  short: { label: 'Short Break', minutes: 5 },
  long: { label: 'Long Break', minutes: 15 },
};

export const FocusToolsView: React.FC = () => {
  const {
    workspace,
    activeFocusSubjectId,
    setActiveFocusSubjectId,
    logStudySession,
    addTask,
    toggleTask,
    deleteTask,
    addHabit,
    toggleHabitForDate,
    deleteHabit,
  } = usePortal();

  // Pomodoro state
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [focusDuration, setFocusDuration] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionNote, setSessionNote] = useState('');

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskSubjectId, setTaskSubjectId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Habit form
  const [habitTitle, setHabitTitle] = useState('');
  const [habitTarget, setHabitTarget] = useState('5');

  const todayIso = getTodayIsoDate();

  const totalPhaseSeconds =
    (phase === 'focus' ? focusDuration : PHASE_DEFAULTS[phase].minutes) * 60;

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (phase === 'focus') {
            logStudySession({
              subjectId: activeFocusSubjectId,
              durationMinutes: focusDuration,
              mode: 'pomodoro',
              note: sessionNote,
            });
            setSessionNote('');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [
    isRunning,
    phase,
    focusDuration,
    activeFocusSubjectId,
    sessionNote,
    logStudySession,
  ]);

  const switchPhase = (next: TimerPhase) => {
    setIsRunning(false);
    setPhase(next);
    const mins = next === 'focus' ? focusDuration : PHASE_DEFAULTS[next].minutes;
    setSecondsLeft(mins * 60);
  };

  const handleCustomFocusChange = (mins: number) => {
    const safe = Math.min(90, Math.max(5, mins));
    setFocusDuration(safe);
    if (phase === 'focus' && !isRunning) {
      setSecondsLeft(safe * 60);
    }
  };

  const handleCompleteNow = () => {
    const elapsedSeconds = totalPhaseSeconds - secondsLeft;
    const loggedMinutes =
      elapsedSeconds >= 60 ? Math.round(elapsedSeconds / 60) : focusDuration;
    setIsRunning(false);
    logStudySession({
      subjectId: activeFocusSubjectId,
      durationMinutes: loggedMinutes,
      mode: 'pomodoro',
      note: sessionNote,
    });
    setSessionNote('');
    setSecondsLeft(focusDuration * 60);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    addTask({
      title: taskTitle.trim(),
      priority: taskPriority,
      subjectId: taskSubjectId || null,
      dueDate: taskDueDate,
    });
    setTaskTitle('');
    setTaskDueDate('');
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;
    addHabit(habitTitle.trim(), Math.min(7, Math.max(1, Number(habitTarget) || 5)));
    setHabitTitle('');
  };

  const filteredTasks = useMemo(() => {
    return workspace.tasks.filter((t) => {
      if (taskFilter === 'pending') return !t.completed;
      if (taskFilter === 'completed') return t.completed;
      return true;
    });
  }, [workspace.tasks, taskFilter]);

  const last7Days = useMemo(() => {
    const days: { iso: string; short: string }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(dt.getDate()).padStart(2, '0')}`;
      days.push({
        iso,
        short: dt.toLocaleDateString(undefined, { weekday: 'narrow' }),
      });
    }
    return days;
  }, []);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const progressRatio =
    totalPhaseSeconds > 0 ? 1 - secondsLeft / totalPhaseSeconds : 0;
  const ringRadius = 86;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressRatio);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left Column: Pomodoro Focus Timer */}
      <section className="xl:col-span-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-[var(--border-hairline)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Pomodoro Focus Timer
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Completed sessions log automatically to your dashboard &amp; subject.
            </p>
          </div>
        </div>

        {/* Phase Switcher */}
        <div className="mt-4 grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--bg-subtle)]">
          {(['focus', 'short', 'long'] as TimerPhase[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => switchPhase(p)}
              className={`min-h-[36px] rounded-lg text-xs font-medium transition-colors ${
                phase === p
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {PHASE_DEFAULTS[p].label}
            </button>
          ))}
        </div>

        {/* Circular SVG Progress Display */}
        <div className="my-6 flex flex-col items-center">
          <div className="relative w-52 h-52 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r={ringRadius}
                fill="none"
                stroke="var(--bg-subtle)"
                strokeWidth="8"
              />
              <circle
                cx="100"
                cy="100"
                r={ringRadius}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-[var(--font-mono)] tabular-nums text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
                {mm}:{ss}
              </span>
              <span className="mt-1 text-xs text-[var(--text-muted)]">
                {PHASE_DEFAULTS[phase].label}
              </span>
            </div>
          </div>

          {/* Primary Controls */}
          <div className="mt-5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (secondsLeft === 0) {
                  setSecondsLeft(totalPhaseSeconds);
                }
                setIsRunning((r) => !r);
              }}
              className="inline-flex items-center gap-2 min-h-[44px] px-6 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>{secondsLeft < totalPhaseSeconds && secondsLeft > 0 ? 'Resume' : 'Start Focus'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setSecondsLeft(totalPhaseSeconds);
              }}
              aria-label="Reset timer"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {phase === 'focus' && (
              <button
                type="button"
                onClick={handleCompleteNow}
                title="Complete and log session immediately"
                className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                <span>Log Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Session Configuration */}
        <div className="space-y-3 pt-4 border-t border-[var(--border-hairline)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Linked Subject
              </label>
              <select
                value={activeFocusSubjectId ?? ''}
                onChange={(e) =>
                  setActiveFocusSubjectId(e.target.value || null)
                }
                className="w-full min-h-[40px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="">General Study</option>
                {workspace.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Focus Length (min)
              </label>
              <div className="flex items-center gap-1">
                {[15, 25, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleCustomFocusChange(m)}
                    className={`flex-1 min-h-[40px] rounded-lg font-mono text-xs tabular-nums transition-colors ${
                      focusDuration === m
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)] font-semibold'
                        : 'border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Session Goal (Optional)
            </label>
            <input
              type="text"
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              placeholder="What are you working on right now?"
              className="w-full min-h-[40px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        {/* Recent Study Sessions */}
        {workspace.studySessions.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[var(--border-hairline)]">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-2">
              Recent Logged Sessions ({workspace.studySessions.length})
            </h3>
            <div className="divide-y divide-[var(--border-hairline)] max-h-40 overflow-y-auto">
              {workspace.studySessions.slice(0, 5).map((ses) => {
                const sub = workspace.subjects.find((s) => s.id === ses.subjectId);
                return (
                  <div
                    key={ses.id}
                    className="py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-[var(--text-primary)] truncate block">
                        {sub ? sub.name : 'General Study'}
                      </span>
                      {ses.note && (
                        <span className="text-[11px] text-[var(--text-muted)] truncate block">
                          {ses.note}
                        </span>
                      )}
                    </div>
                    <span className="font-mono tabular-nums text-[var(--text-secondary)] shrink-0">
                      {ses.durationMinutes} min
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Right Column: Daily To-Do & Habit Checklist */}
      <div className="xl:col-span-7 space-y-6">
        {/* Daily To-Do List */}
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--border-hairline)]">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Daily To-Do Checklist
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Add study tasks, lab prep, or assignments to track daily progress.
              </p>
            </div>
            <div className="inline-flex rounded-lg bg-[var(--bg-subtle)] p-0.5">
              {(['all', 'pending', 'completed'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTaskFilter(tab)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                    taskFilter === tab
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddTask} className="mt-4 space-y-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Add a task (e.g. Finish Calculus problem set 4)..."
                className="flex-1 min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)] shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                aria-label="Task priority"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                className="min-h-[36px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-xs text-[var(--text-primary)]"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
              <select
                aria-label="Related subject"
                value={taskSubjectId}
                onChange={(e) => setTaskSubjectId(e.target.value)}
                className="min-h-[36px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-xs text-[var(--text-primary)]"
              >
                <option value="">No subject linked</option>
                {workspace.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                aria-label="Due date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="min-h-[36px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-xs text-[var(--text-primary)]"
              />
            </div>
          </form>

          {filteredTasks.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">
              {workspace.tasks.length === 0
                ? 'Your to-do checklist is empty. Add your first task above.'
                : 'No tasks match this filter.'}
            </p>
          ) : (
            <div className="mt-4 divide-y divide-[var(--border-hairline)]">
              {filteredTasks.map((task) => {
                const sub = workspace.subjects.find(
                  (s) => s.id === task.subjectId
                );
                return (
                  <div
                    key={task.id}
                    className="py-3 flex items-start justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className="flex items-start gap-3 text-left flex-1 min-w-0"
                    >
                      <span
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          task.completed
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-contrast)]'
                            : 'border-[var(--border-strong)] bg-[var(--bg-canvas)]'
                        }`}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-medium ${
                            task.completed
                              ? 'line-through text-[var(--text-muted)]'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--text-muted)]">
                          <span
                            className={
                              task.priority === 'high' && !task.completed
                                ? 'text-[var(--danger)] font-medium'
                                : ''
                            }
                          >
                            {task.priority.charAt(0).toUpperCase() +
                              task.priority.slice(1)}{' '}
                            priority
                          </span>
                          {sub && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{sub.name}</span>
                            </>
                          )}
                          {task.dueDate && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Due {formatShortDate(task.dueDate)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      aria-label={`Delete task ${task.title}`}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Daily Habit Tracker */}
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <div className="pb-4 border-b border-[var(--border-hairline)]">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Daily Habit Checklist
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Build consistent study, reading, or fitness routines with streak tracking.
            </p>
          </div>

          <form onSubmit={handleAddHabit} className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              value={habitTitle}
              onChange={(e) => setHabitTitle(e.target.value)}
              placeholder="New habit (e.g. Revise lecture notes 20 min)"
              className="flex-1 min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
            <div className="flex gap-2">
              <select
                aria-label="Target days per week"
                value={habitTarget}
                onChange={(e) => setHabitTarget(e.target.value)}
                className="min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-xs text-[var(--text-primary)]"
              >
                {[3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    {d} days / wk
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)] whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Habit</span>
              </button>
            </div>
          </form>

          {workspace.habits.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">
              No habits tracked yet. Add a daily routine above to build your first streak.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-[var(--border-hairline)]">
              {workspace.habits.map((habit) => {
                const streak = calculateHabitStreak(habit);
                const doneToday = habit.completedDates.includes(todayIso);
                return (
                  <div
                    key={habit.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {habit.title}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-xs text-[var(--warning)]">
                          <Flame className="w-3.5 h-3.5" />
                          {streak}d
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                        Goal: {habit.targetDaysPerWeek} days / week
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      {/* 7-day interactive history strip */}
                      <div className="flex items-center gap-1">
                        {last7Days.map((day) => {
                          const checked = habit.completedDates.includes(day.iso);
                          return (
                            <button
                              key={day.iso}
                              type="button"
                              onClick={() => toggleHabitForDate(habit.id, day.iso)}
                              title={`${habit.title} on ${day.iso}`}
                              className={`w-7 h-7 rounded-lg text-[11px] font-medium transition-colors ${
                                checked
                                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
                              }`}
                            >
                              {day.short}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleHabitForDate(habit.id, todayIso)}
                          className={`min-h-[34px] px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                            doneToday
                              ? 'bg-[var(--success-soft)] text-[var(--success)]'
                              : 'border border-[var(--border-hairline)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          {doneToday ? 'Done Today' : 'Check In'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteHabit(habit.id)}
                          aria-label={`Delete habit ${habit.title}`}
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
        </section>
      </div>
    </div>
  );
};
