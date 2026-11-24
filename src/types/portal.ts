export type ThemeId = 'light' | 'dark' | 'ocean' | 'pastel-pink';

export type NavSection =
  | 'dashboard'
  | 'notes'
  | 'chat'
  | 'calendar'
  | 'cocurricular'
  | 'tools'
  | 'profile';

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  college: string;
  branch: string;
  year: string;
  bio: string;
  avatarDataUrl: string | null;
  theme: ThemeId;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  targetScore: number;
  currentProgress: number; // 0 to 100
  currentMarks: number | null;
  maxMarks: number;
  color: string;
  studyMinutes: number;
  createdAt: string;
}

export interface StudySession {
  id: string;
  subjectId: string | null;
  durationMinutes: number;
  mode: 'pomodoro' | 'manual';
  note: string;
  completedAt: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  folderId: string | null;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  shareCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SharedNoteSnapshot {
  code: string;
  title: string;
  content: string;
  tags: string[];
  authorName: string;
  authorCollege: string;
  sharedAt: string;
}

export type EventCategory =
  | 'exam'
  | 'assignment'
  | 'fest'
  | 'club'
  | 'class'
  | 'personal';

export interface CalendarEvent {
  id: string;
  title: string;
  category: EventCategory;
  color: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  notes: string;
  subjectId: string | null;
  createdAt: string;
}

export type CoCurricularCategory =
  | 'NCC'
  | 'NSS'
  | 'Sports'
  | 'Cultural Clubs'
  | 'Hackathons'
  | 'Other';

export type ActivityType =
  | 'Drill'
  | 'Camp'
  | 'Tournament'
  | 'Workshop'
  | 'Volunteering'
  | 'Competition'
  | 'Event';

export interface CoCurricularLog {
  id: string;
  title: string;
  category: CoCurricularCategory;
  type: ActivityType;
  date: string; // YYYY-MM-DD
  hours: number;
  role: string;
  certificateTitle: string;
  notes: string;
  createdAt: string;
}

export type TaskPriority = 'high' | 'medium' | 'low';

export interface TodoTask {
  id: string;
  title: string;
  priority: TaskPriority;
  subjectId: string | null;
  dueDate: string; // YYYY-MM-DD or ''
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface DailyHabit {
  id: string;
  title: string;
  targetDaysPerWeek: number;
  completedDates: string[]; // array of YYYY-MM-DD
  createdAt: string;
}

export interface ChatAttachmentNote {
  kind: 'note';
  noteId: string;
  title: string;
  excerpt: string;
  tags: string[];
  content: string;
}

export interface ChatAttachmentEvent {
  kind: 'event';
  eventId: string;
  title: string;
  category: EventCategory;
  color: string;
  date: string;
  time: string;
  location: string;
}

export type ChatAttachment = ChatAttachmentNote | ChatAttachmentEvent;

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  text: string;
  attachment: ChatAttachment | null;
  createdAt: string;
}

export interface ChatChannel {
  id: string;
  type: 'direct' | 'group';
  name: string;
  description: string;
  inviteCode: string | null;
  participantEmails: string[];
  createdBy: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface UserWorkspace {
  subjects: Subject[];
  studySessions: StudySession[];
  folders: NoteFolder[];
  notes: NoteItem[];
  events: CalendarEvent[];
  coCurricularLogs: CoCurricularLog[];
  tasks: TodoTask[];
  habits: DailyHabit[];
  channelIds: string[];
}

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  requirement: string;
  earned: boolean;
  progressText: string;
}

export interface FocusSuggestion {
  id: string;
  priorityLabel: 'Urgent' | 'High Focus' | 'Recommended' | 'Get Started';
  title: string;
  reason: string;
  actionLabel: string;
  targetSection: NavSection;
  subjectId?: string;
}
