import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Edit3,
  Plus,
  Sparkles,
  Target,
  Timer,
  Trash2,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import type { Subject } from '../../types/portal';
import {
  EVENT_CATEGORY_META,
  SUBJECT_COLORS,
  formatCountdown,
  formatShortDate,
  formatStudyHours,
} from '../../utils/portalHelpers';
import { Modal } from '../ui/Modal';

export const DashboardView: React.FC = () => {
  const {
    user,
    workspace,
    focusSuggestions,
    setActiveSection,
    setActiveFocusSubjectId,
    addSubject,
    updateSubject,
    deleteSubject,
    logStudySession,
  } = usePortal();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [logStudyModalOpen, setLogStudyModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  // Subject form fields
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subCredits, setSubCredits] = useState('4');
  const [subTarget, setSubTarget] = useState('85');
  const [subProgress, setSubProgress] = useState('0');
  const [subMarks, setSubMarks] = useState('');
  const [subMaxMarks, setSubMaxMarks] = useState('100');
  const [subColor, setSubColor] = useState(SUBJECT_COLORS[0]);

  // Manual study log form
  const [logSubjectId, setLogSubjectId] = useState<string>('');
  const [logMinutes, setLogMinutes] = useState('45');
  const [logNote, setLogNote] = useState('');

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const totalStudyMinutes = useMemo(
    () =>
      workspace.studySessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    [workspace.studySessions]
  );

  const totalCoCurricularHours = useMemo(
    () => workspace.coCurricularLogs.reduce((sum, c) => sum + c.hours, 0),
    [workspace.coCurricularLogs]
  );

  const completedTasksCount = useMemo(
    () => workspace.tasks.filter((t) => t.completed).length,
    [workspace.tasks]
  );

  const upcomingEvents = useMemo(() => {
    return workspace.events
      .map((ev) => ({ ev, countdown: formatCountdown(ev, nowMs) }))
      .filter((item) => !item.countdown.isPast)
      .sort((a, b) => a.countdown.daysLeft - b.countdown.daysLeft)
      .slice(0, 4);
  }, [workspace.events, nowMs]);

  const academicHours = totalStudyMinutes / 60;
  const combinedHours = academicHours + totalCoCurricularHours;
  const academicShare =
    combinedHours > 0 ? Math.round((academicHours / combinedHours) * 100) : 0;
  const coCurricularShare = combinedHours > 0 ? 100 - academicShare : 0;

  const openAddSubject = () => {
    setEditingSubject(null);
    setSubName('');
    setSubCode('');
    setSubCredits('4');
    setSubTarget('85');
    setSubProgress('0');
    setSubMarks('');
    setSubMaxMarks('100');
    setSubColor(SUBJECT_COLORS[workspace.subjects.length % SUBJECT_COLORS.length]);
    setSubjectModalOpen(true);
  };

  const openEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setSubName(subject.name);
    setSubCode(subject.code);
    setSubCredits(String(subject.credits));
    setSubTarget(String(subject.targetScore));
    setSubProgress(String(subject.currentProgress));
    setSubMarks(subject.currentMarks !== null ? String(subject.currentMarks) : '');
    setSubMaxMarks(String(subject.maxMarks));
    setSubColor(subject.color);
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;
    const parsedMarks =
      subMarks.trim() === '' ? null : Math.max(0, Number(subMarks) || 0);
    const parsedMax = Math.max(1, Number(subMaxMarks) || 100);
    const computedProgress =
      parsedMarks !== null
        ? Math.min(100, Math.round((parsedMarks / parsedMax) * 100))
        : Math.min(100, Math.max(0, Number(subProgress) || 0));

    const payload = {
      name: subName.trim(),
      code: subCode.trim().toUpperCase(),
      credits: Math.max(1, Number(subCredits) || 1),
      targetScore: Math.min(100, Math.max(1, Number(subTarget) || 85)),
      currentProgress: computedProgress,
      currentMarks: parsedMarks,
      maxMarks: parsedMax,
      color: subColor,
    };

    if (editingSubject) {
      updateSubject(editingSubject.id, payload);
    } else {
      addSubject(payload);
    }
    setSubjectModalOpen(false);
  };

  const handleManualStudyLog = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Math.max(1, Math.round(Number(logMinutes) || 0));
    if (mins <= 0) return;
    logStudySession({
      subjectId: logSubjectId || null,
      durationMinutes: mins,
      mode: 'manual',
      note: logNote,
    });
    setLogNote('');
    setLogStudyModalOpen(false);
  };

  const launchFocusForSubject = (subjectId?: string) => {
    setActiveFocusSubjectId(subjectId ?? null);
    setActiveSection('tools');
  };

  const firstName = user?.name.split(' ')[0] || 'Student';

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Welcome, {firstName}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {user?.branch} · {user?.year} · {user?.college}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLogStudyModalOpen(true)}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Log Study Time</span>
          </button>
          <button
            type="button"
            onClick={() => launchFocusForSubject()}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors whitespace-nowrap"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Pomodoro</span>
          </button>
          <button
            type="button"
            onClick={openAddSubject}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* Live Dynamic 4-Column KPI Strip (starts at 0) */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Study Hours Logged
          </div>
          <div className="mt-2 font-[var(--font-mono)] tabular-nums text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">
            {formatStudyHours(totalStudyMinutes)}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
            {workspace.studySessions.length}{' '}
            {workspace.studySessions.length === 1 ? 'session' : 'sessions'}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Tasks Completed
          </div>
          <div className="mt-2 font-[var(--font-mono)] tabular-nums text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">
            {completedTasksCount}
            <span className="text-base font-normal text-[var(--text-muted)]">
              {' '}
              / {workspace.tasks.length}
            </span>
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
            {workspace.tasks.length === 0
              ? 'No tasks added yet'
              : `${Math.round(
                  (completedTasksCount / workspace.tasks.length) * 100
                )}% completion rate`}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Active Subjects
          </div>
          <div className="mt-2 font-[var(--font-mono)] tabular-nums text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">
            {workspace.subjects.length}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
            {workspace.subjects.length === 0
              ? 'Add courses to track'
              : `Avg ${Math.round(
                  workspace.subjects.reduce(
                    (sum, s) => sum + s.currentProgress,
                    0
                  ) / workspace.subjects.length
                )}% progress`}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5">
          <div className="text-xs font-medium text-[var(--text-muted)]">
            Co-Curricular Logs
          </div>
          <div className="mt-2 font-[var(--font-mono)] tabular-nums text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">
            {workspace.coCurricularLogs.length}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
            {totalCoCurricularHours.toFixed(1)} h campus activity
          </div>
        </div>
      </section>

      {/* Main Responsive Multi-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Subject-Wise Progress Tracker */}
        <section className="xl:col-span-7 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Subject Progress Tracker
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Track syllabus completion, marks, and study time per course.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddSubject}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-ink)] text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Subject</span>
            </button>
          </div>

          {workspace.subjects.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-11 h-11 mx-auto rounded-xl bg-[var(--bg-subtle)] text-[var(--text-muted)] flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                No subjects added yet
              </h4>
              <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Add your current semester subjects to monitor marks, syllabus progress, and focused study hours.
              </p>
              <button
                type="button"
                onClick={openAddSubject}
                className="mt-4 inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Subject</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {workspace.subjects.map((subject) => (
                <div key={subject.id} className="py-4 first:pt-4 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: subject.color }}
                        />
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {subject.name}
                        </h4>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)] tabular-nums">
                        {subject.code && <span>{subject.code}</span>}
                        {subject.code && <span aria-hidden="true">·</span>}
                        <span>{subject.credits} credits</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatStudyHours(subject.studyMinutes)} studied</span>
                        {subject.currentMarks !== null && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              Marks: {subject.currentMarks}/{subject.maxMarks}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => launchFocusForSubject(subject.id)}
                        title="Start Pomodoro for this subject"
                        className="min-h-[34px] px-2.5 rounded-lg text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
                      >
                        Focus
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditSubject(subject)}
                        aria-label={`Edit ${subject.name}`}
                        className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(subject)}
                        aria-label={`Delete ${subject.name}`}
                        className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive progress bar + quick slider */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-2 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-200"
                          style={{
                            width: `${subject.currentProgress}%`,
                            backgroundColor: subject.color,
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={subject.currentProgress}
                        aria-label={`Update progress for ${subject.name}`}
                        onChange={(e) =>
                          updateSubject(subject.id, {
                            currentProgress: Number(e.target.value),
                          })
                        }
                        className="w-full mt-1.5 accent-[var(--accent)] h-1.5 cursor-pointer"
                      />
                    </div>
                    <div className="w-20 text-right font-[var(--font-mono)] tabular-nums text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {subject.currentProgress}%
                      </span>
                      <span className="block text-[11px] text-[var(--text-muted)]">
                        Goal {subject.targetScore}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Smart Focus Advisor */}
        <section className="xl:col-span-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--border-hairline)]">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Smart Focus Advisor
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Live priority suggestions derived from your subjects, tasks, and deadlines.
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0" />
          </div>

          {focusSuggestions.length === 0 ? (
            <div className="py-8">
              <p className="text-sm text-[var(--text-secondary)]">
                Your advisor activates automatically once you add your semester data. Start with any of these:
              </p>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={openAddSubject}
                  className="w-full flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] text-left transition-colors"
                >
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    + Add your semester subjects
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('calendar')}
                  className="w-full flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] text-left transition-colors"
                >
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    + Schedule an upcoming exam or deadline
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('tools')}
                  className="w-full flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] text-left transition-colors"
                >
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    + Create your daily to-do checklist
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {focusSuggestions.map((item) => (
                <div key={item.id} className="py-4 first:pt-4 last:pb-0">
                  <div className="text-[11px] font-semibold text-[var(--accent)]">
                    {item.priorityLabel}
                  </div>
                  <h4 className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                    {item.reason}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.subjectId) {
                        setActiveFocusSubjectId(item.subjectId);
                      }
                      setActiveSection(item.targetSection);
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Deadlines */}
        <section className="xl:col-span-6 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--border-hairline)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Upcoming Deadlines &amp; Events
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection('calendar')}
              className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
            >
              Open Calendar
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="w-5 h-5 mx-auto text-[var(--text-muted)] mb-2" />
              <p className="text-xs text-[var(--text-muted)]">
                No upcoming exams, assignments, or events scheduled.
              </p>
              <button
                type="button"
                onClick={() => setActiveSection('calendar')}
                className="mt-3 inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {upcomingEvents.map(({ ev, countdown }) => (
                <div
                  key={ev.id}
                  className="py-3.5 first:pt-4 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: ev.color }}
                      />
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {ev.title}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {EVENT_CATEGORY_META[ev.category].label} ·{' '}
                      {formatShortDate(ev.date)}
                      {ev.time ? ` · ${ev.time}` : ''}
                    </div>
                  </div>
                  <div
                    className={`font-[var(--font-mono)] tabular-nums text-xs font-semibold shrink-0 ${
                      countdown.isUrgent
                        ? 'text-[var(--danger)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {countdown.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Academic vs Co-Curricular Balance */}
        <section className="xl:col-span-6 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--border-hairline)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Academics vs. Co-Curricular Balance
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection('cocurricular')}
              className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
            >
              Open Tracker
            </button>
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-[var(--text-primary)] tabular-nums">
                Academics · {academicHours.toFixed(1)} h ({academicShare}%)
              </span>
              <span className="font-medium text-[var(--text-primary)] tabular-nums">
                Co-Curricular · {totalCoCurricularHours.toFixed(1)} h ({coCurricularShare}%)
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden flex">
              {combinedHours > 0 ? (
                <>
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${academicShare}%` }}
                  />
                  <div
                    className="h-full bg-[var(--success)] transition-all duration-300"
                    style={{ width: `${coCurricularShare}%` }}
                  />
                </>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed">
              {combinedHours === 0
                ? 'Log your first Pomodoro study session or co-curricular activity (NCC, NSS, Sports, Clubs) to view your campus balance meter.'
                : academicShare >= 50 && academicShare <= 80
                ? 'Balanced campus rhythm — steady academic progress paired with active co-curricular involvement.'
                : academicShare > 80
                ? 'Heavily academic right now — remember to log any NCC, NSS, sports, or club hours you complete.'
                : 'Strong co-curricular momentum — consider scheduling a focused Pomodoro block for your core subjects.'}
            </p>
          </div>
        </section>
      </div>

      {/* Add / Edit Subject Modal */}
      <Modal
        open={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Add Subject'}
        description="Track syllabus completion, marks, and study time."
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Subject Name
              </label>
              <input
                type="text"
                required
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="e.g. Data Structures & Algorithms"
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Course Code
              </label>
              <input
                type="text"
                value={subCode}
                onChange={(e) => setSubCode(e.target.value)}
                placeholder="e.g. CS201"
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Credits
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={subCredits}
                onChange={(e) => setSubCredits(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm tabular-nums text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Target (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={subTarget}
                onChange={(e) => setSubTarget(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm tabular-nums text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Marks (Opt)
              </label>
              <input
                type="number"
                min={0}
                value={subMarks}
                onChange={(e) => setSubMarks(e.target.value)}
                placeholder="—"
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm tabular-nums text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Max Marks
              </label>
              <input
                type="number"
                min={1}
                value={subMaxMarks}
                onChange={(e) => setSubMaxMarks(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm tabular-nums text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>

          {subMarks.trim() === '' && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-medium text-[var(--text-secondary)]">
                  Current Syllabus Progress
                </label>
                <span className="font-[var(--font-mono)] tabular-nums text-[var(--text-primary)]">
                  {subProgress}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={subProgress}
                onChange={(e) => setSubProgress(e.target.value)}
                className="w-full accent-[var(--accent)]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              Color Marker
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setSubColor(hex)}
                  aria-label={`Select color ${hex}`}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    subColor === hex
                      ? 'ring-2 ring-offset-2 ring-[var(--accent)] scale-105'
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
              onClick={() => setSubjectModalOpen(false)}
              className="min-h-[40px] px-4 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)]"
            >
              {editingSubject ? 'Save Changes' : 'Add Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Manual Study Time Modal */}
      <Modal
        open={logStudyModalOpen}
        onClose={() => setLogStudyModalOpen(false)}
        title="Log Study Session"
        description="Manually add completed study hours to your dashboard."
        maxWidth="sm"
      >
        <form onSubmit={handleManualStudyLog} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Subject (Optional)
            </label>
            <select
              value={logSubjectId}
              onChange={(e) => setLogSubjectId(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
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
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={5}
              max={600}
              required
              value={logMinutes}
              onChange={(e) => setLogMinutes(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm tabular-nums text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Session Note (Optional)
            </label>
            <input
              type="text"
              value={logNote}
              onChange={(e) => setLogNote(e.target.value)}
              placeholder="Topic covered or chapter revised"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setLogStudyModalOpen(false)}
              className="min-h-[40px] px-4 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)]"
            >
              Save Session
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Subject Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Subject"
        description="This removes the subject from your progress tracker."
        maxWidth="sm"
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Are you sure you want to remove{' '}
          <strong className="text-[var(--text-primary)]">
            {deleteTarget?.name}
          </strong>
          ? Your logged study hours will remain on your dashboard.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="min-h-[40px] px-4 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (deleteTarget) deleteSubject(deleteTarget.id);
              setDeleteTarget(null);
            }}
            className="min-h-[40px] px-4 rounded-xl bg-[var(--danger)] text-white text-xs font-semibold hover:opacity-90"
          >
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
};
