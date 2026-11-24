import type {
  BadgeDefinition,
  CalendarEvent,
  DailyHabit,
  EventCategory,
  FocusSuggestion,
  ThemeId,
  UserWorkspace,
} from '../types/portal';

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  shortLabel: string;
  swatchBg: string;
  swatchAccent: string;
  metaThemeColor: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'light',
    label: 'Clean Light',
    shortLabel: 'Light',
    swatchBg: '#F8FAFC',
    swatchAccent: '#2563EB',
    metaThemeColor: '#2563EB',
  },
  {
    id: 'dark',
    label: 'Midnight Dark',
    shortLabel: 'Midnight',
    swatchBg: '#0B1120',
    swatchAccent: '#3B82F6',
    metaThemeColor: '#0B1120',
  },
  {
    id: 'ocean',
    label: 'Ocean Blue',
    shortLabel: 'Ocean',
    swatchBg: '#EDF6FC',
    swatchAccent: '#0284C7',
    metaThemeColor: '#0284C7',
  },
  {
    id: 'pastel-pink',
    label: 'Pastel Pink',
    shortLabel: 'Pink',
    swatchBg: '#FDF4F7',
    swatchAccent: '#DB2777',
    metaThemeColor: '#DB2777',
  },
];

export const SUBJECT_COLORS = [
  '#2563EB',
  '#0284C7',
  '#0D9488',
  '#16A34A',
  '#D97706',
  '#DC2626',
  '#DB2777',
  '#7C3AED',
];

export const EVENT_CATEGORY_META: Record<
  EventCategory,
  { label: string; defaultColor: string }
> = {
  exam: { label: 'Exam', defaultColor: '#DC2626' },
  assignment: { label: 'Assignment', defaultColor: '#D97706' },
  fest: { label: 'Campus Fest', defaultColor: '#7C3AED' },
  club: { label: 'Club Event', defaultColor: '#0284C7' },
  class: { label: 'Class / Lab', defaultColor: '#0D9488' },
  personal: { label: 'Personal', defaultColor: '#2563EB' },
};

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatStudyHours(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0.0 h';
  return `${(totalMinutes / 60).toFixed(1)} h`;
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function getEventDateTime(event: Pick<CalendarEvent, 'date' | 'time'>): Date {
  const [y, m, d] = event.date.split('-').map(Number);
  const [hh, mm] = (event.time || '23:59').split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
}

export function formatCountdown(
  event: Pick<CalendarEvent, 'date' | 'time'>,
  nowMs: number = Date.now()
): { text: string; isPast: boolean; isUrgent: boolean; daysLeft: number } {
  const targetMs = getEventDateTime(event).getTime();
  const diffMs = targetMs - nowMs;

  if (Number.isNaN(diffMs)) {
    return { text: 'Scheduled', isPast: false, isUrgent: false, daysLeft: 99 };
  }

  if (diffMs <= 0) {
    const pastHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    if (pastHours < 24) {
      return { text: 'Passed today', isPast: true, isUrgent: false, daysLeft: -1 };
    }
    const pastDays = Math.floor(pastHours / 24);
    return {
      text: `${pastDays}d ago`,
      isPast: true,
      isUrgent: false,
      daysLeft: -pastDays,
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  if (days === 0 && hours === 0) {
    return {
      text: `${Math.max(1, mins)}m left`,
      isPast: false,
      isUrgent: true,
      daysLeft: 0,
    };
  }
  if (days === 0) {
    return {
      text: `${hours}h ${mins}m left`,
      isPast: false,
      isUrgent: true,
      daysLeft: 0,
    };
  }
  if (days <= 2) {
    return {
      text: `${days}d ${hours}h left`,
      isPast: false,
      isUrgent: true,
      daysLeft: days,
    };
  }
  return {
    text: `${days}d ${hours}h left`,
    isPast: false,
    isUrgent: false,
    daysLeft: days,
  };
}

export function calculateHabitStreak(habit: DailyHabit): number {
  if (habit.completedDates.length === 0) return 0;
  const dateSet = new Set(habit.completedDates);
  const today = new Date();
  let streak = 0;

  const formatDate = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
      dt.getDate()
    ).padStart(2, '0')}`;

  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!dateSet.has(formatDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (dateSet.has(formatDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeFocusSuggestions(
  workspace: UserWorkspace,
  nowMs: number = Date.now()
): FocusSuggestion[] {
  const suggestions: FocusSuggestion[] = [];

  // 1. Check upcoming exams & assignment deadlines within 7 days
  const upcomingDeadlines = workspace.events
    .filter((ev) => ev.category === 'exam' || ev.category === 'assignment')
    .map((ev) => ({ ev, countdown: formatCountdown(ev, nowMs) }))
    .filter((item) => !item.countdown.isPast && item.countdown.daysLeft <= 7)
    .sort((a, b) => a.countdown.daysLeft - b.countdown.daysLeft);

  if (upcomingDeadlines.length > 0) {
    const top = upcomingDeadlines[0];
    suggestions.push({
      id: `deadline_${top.ev.id}`,
      priorityLabel: top.countdown.daysLeft <= 2 ? 'Urgent' : 'High Focus',
      title: `Prepare for ${top.ev.title}`,
      reason: `${EVENT_CATEGORY_META[top.ev.category].label} due in ${top.countdown.text} (${formatShortDate(top.ev.date)}). Schedule a focused revision block now.`,
      actionLabel: 'Start Focus Session',
      targetSection: 'tools',
      subjectId: top.ev.subjectId ?? undefined,
    });
  }

  // 2. Check pending high-priority tasks or overdue tasks
  const todayIso = getTodayIsoDate();
  const pendingTasks = workspace.tasks.filter((t) => !t.completed);
  const urgentTask =
    pendingTasks.find((t) => t.dueDate && t.dueDate <= todayIso) ??
    pendingTasks.find((t) => t.priority === 'high') ??
    pendingTasks[0];

  if (urgentTask) {
    const isOverdue = urgentTask.dueDate && urgentTask.dueDate < todayIso;
    suggestions.push({
      id: `task_${urgentTask.id}`,
      priorityLabel: isOverdue || urgentTask.priority === 'high' ? 'High Focus' : 'Recommended',
      title: urgentTask.title,
      reason: isOverdue
        ? `Overdue task from ${formatShortDate(urgentTask.dueDate)}. Clearing it will improve your completion momentum.`
        : `You have ${pendingTasks.length} pending ${pendingTasks.length === 1 ? 'task' : 'tasks'}. Completing this ${urgentTask.priority}-priority item keeps your day on track.`,
      actionLabel: 'Open Checklist',
      targetSection: 'tools',
    });
  }

  // 3. Check lowest-progress or unstudied subject
  if (workspace.subjects.length > 0) {
    const sortedByGap = [...workspace.subjects].sort((a, b) => {
      const gapA = a.targetScore - a.currentProgress;
      const gapB = b.targetScore - b.currentProgress;
      if (gapB !== gapA) return gapB - gapA;
      return a.studyMinutes - b.studyMinutes;
    });
    const focusSubject = sortedByGap[0];
    if (focusSubject.currentProgress < focusSubject.targetScore || focusSubject.studyMinutes === 0) {
      suggestions.push({
        id: `subject_${focusSubject.id}`,
        priorityLabel: focusSubject.currentProgress < 40 ? 'High Focus' : 'Recommended',
        title: `Boost ${focusSubject.name}`,
        reason:
          focusSubject.studyMinutes === 0
            ? `No study sessions logged yet (${focusSubject.currentProgress}% toward ${focusSubject.targetScore}% target). Start a 25-minute Pomodoro session.`
            : `Currently at ${focusSubject.currentProgress}% against your ${focusSubject.targetScore}% target with ${formatStudyHours(focusSubject.studyMinutes)} logged.`,
        actionLabel: 'Study Subject',
        targetSection: 'tools',
        subjectId: focusSubject.id,
      });
    }
  }

  // 4. Check Academic vs Co-Curricular balance when academic hours exist but 0 co-curricular
  const academicMinutes = workspace.studySessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  if (academicMinutes >= 120 && workspace.coCurricularLogs.length === 0) {
    suggestions.push({
      id: 'balance_cocurricular',
      priorityLabel: 'Recommended',
      title: 'Log Campus & Co-Curricular Activity',
      reason: `You have logged ${formatStudyHours(academicMinutes)} of study. Add any NCC, NSS, Sports, or Club participation to track your campus balance.`,
      actionLabel: 'Log Activity',
      targetSection: 'cocurricular',
    });
  }

  return suggestions.slice(0, 3);
}

export function computeBadges(workspace: UserWorkspace): BadgeDefinition[] {
  const totalStudyMinutes = workspace.studySessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const completedTasks = workspace.tasks.filter((t) => t.completed).length;
  const certificatesCount = workspace.coCurricularLogs.filter(
    (c) => c.certificateTitle.trim().length > 0
  ).length;
  const maxStreak = workspace.habits.reduce(
    (max, h) => Math.max(max, calculateHabitStreak(h)),
    0
  );

  return [
    {
      id: 'first_subject',
      title: 'Academic Kickoff',
      description: 'Add your first subject to start tracking syllabus progress.',
      requirement: '1 Subject',
      earned: workspace.subjects.length >= 1,
      progressText: `${Math.min(workspace.subjects.length, 1)} / 1`,
    },
    {
      id: 'focus_starter',
      title: 'Deep Focus Starter',
      description: 'Complete and log your first Pomodoro or study session.',
      requirement: '1 Session',
      earned: workspace.studySessions.length >= 1,
      progressText: `${Math.min(workspace.studySessions.length, 1)} / 1`,
    },
    {
      id: 'five_hours',
      title: 'Dedicated Scholar',
      description: 'Accumulate 5 hours of logged study time across your subjects.',
      requirement: '5.0 Hours',
      earned: totalStudyMinutes >= 300,
      progressText: `${(Math.min(totalStudyMinutes, 300) / 60).toFixed(1)} / 5.0 h`,
    },
    {
      id: 'note_architect',
      title: 'Note Architect',
      description: 'Organize at least 3 notes across your custom folders.',
      requirement: '3 Notes',
      earned: workspace.notes.length >= 3,
      progressText: `${Math.min(workspace.notes.length, 3)} / 3`,
    },
    {
      id: 'task_finisher',
      title: 'Momentum Builder',
      description: 'Complete 5 items from your daily to-do checklist.',
      requirement: '5 Tasks',
      earned: completedTasks >= 5,
      progressText: `${Math.min(completedTasks, 5)} / 5`,
    },
    {
      id: 'campus_allrounder',
      title: 'Campus All-Rounder',
      description: 'Log both academic study time and a co-curricular activity.',
      requirement: 'Study + Activity',
      earned:
        workspace.studySessions.length >= 1 &&
        workspace.coCurricularLogs.length >= 1,
      progressText:
        workspace.studySessions.length >= 1 &&
        workspace.coCurricularLogs.length >= 1
          ? 'Unlocked'
          : '0 / 1 pair',
    },
    {
      id: 'cert_collector',
      title: 'Verified Achiever',
      description: 'Record a certificate or award in Co-Curricular logs.',
      requirement: '1 Certificate',
      earned: certificatesCount >= 1,
      progressText: `${Math.min(certificatesCount, 1)} / 1`,
    },
    {
      id: 'habit_streak',
      title: 'Consistent Routine',
      description: 'Reach a 3-day streak on any daily habit.',
      requirement: '3-Day Streak',
      earned: maxStreak >= 3,
      progressText: `${Math.min(maxStreak, 3)} / 3 days`,
    },
  ];
}

export function resizeAvatarImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 200;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = () => reject(new Error('Could not decode image file'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}
