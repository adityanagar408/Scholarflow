import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  auth,
  FIREBASE_PROJECT_ID,
  generateSafeId,
  googleProvider,
} from '../lib/firebase';
import {
  createCoCurricularDoc,
  createEmptyWorkspace,
  createEventDoc,
  createFolderDoc,
  createHabitDoc,
  createNoteDoc,
  createStudentProfileAndDirectory,
  createStudyGroupDoc,
  createSubjectDoc,
  createTaskDoc,
  deleteCoCurricularDoc,
  deleteEventDoc,
  deleteFolderTreeDocs,
  deleteHabitDoc,
  deleteNoteDoc,
  deleteSubjectDoc,
  deleteTaskDoc,
  fetchSharedNoteByCode,
  getStudentProfile,
  joinStudyGroupByCodeDoc,
  leaveChannelDoc,
  logStudySessionDoc,
  publishSharedNote,
  renameFolderDoc,
  sendChatMessageDoc,
  startDirectChatDoc,
  subscribeChannelDetail,
  subscribeUserMemberships,
  subscribeWorkspace,
  toggleTaskDoc,
  updateCoCurricularDoc,
  updateEventDoc,
  updateHabitDatesDoc,
  updateNoteDoc,
  updateStudentProfileDoc,
  updateSubjectDoc,
  type ChannelMembershipDoc,
} from '../services/firestoreService';
import type {
  ActivityType,
  BadgeDefinition,
  CalendarEvent,
  ChatAttachment,
  ChatChannel,
  ChatMessage,
  CoCurricularCategory,
  CoCurricularLog,
  DailyHabit,
  EventCategory,
  FocusSuggestion,
  NavSection,
  NoteFolder,
  NoteItem,
  StudentUser,
  StudySession,
  Subject,
  TaskPriority,
  ThemeId,
  TodoTask,
  UserWorkspace,
} from '../types/portal';
import {
  computeBadges,
  computeFocusSuggestions,
  getTodayIsoDate,
  THEMES,
} from '../utils/portalHelpers';

export interface ToastItem {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}

interface PendingSignupProfile {
  name: string;
  college: string;
  branch: string;
  year: string;
  theme: ThemeId;
}

const THEME_STORAGE_KEY = 'campusdesk_theme_pref';
const PENDING_PROFILE_KEY = 'campusdesk_pending_signup_profile';

function loadSavedTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'ocean' || raw === 'pastel-pink') {
      return raw;
    }
  } catch {
    // Ignore storage restriction
  }
  return 'light';
}

function saveThemePref(themeId: ThemeId) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // Ignore storage restriction
  }
}

function savePendingProfile(profile: PendingSignupProfile) {
  try {
    sessionStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore
  }
}

function loadPendingProfile(): PendingSignupProfile | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingSignupProfile;
  } catch {
    return null;
  }
}

function clearPendingProfile() {
  try {
    sessionStorage.removeItem(PENDING_PROFILE_KEY);
  } catch {
    // Ignore
  }
}

function applyThemeToDocument(themeId: ThemeId) {
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);
  if (themeId === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  const config = THEMES.find((t) => t.id === themeId);
  if (meta && config) {
    meta.setAttribute('content', config.metaThemeColor);
  }
}

function mapFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  switch (code) {
    case 'auth/operation-not-allowed':
      return `Email/Password sign-in is not yet enabled in your Firebase project. Enable it in Firebase Console (Project: ${FIREBASE_PROJECT_ID} → Authentication → Sign-in method → Email/Password) or continue with Google Sign-In below.`;
    case 'auth/email-already-in-use':
      return 'An account with this student email already exists. Try logging in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid student email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Double-check your credentials and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before finishing.';
    case 'auth/popup-blocked':
      return 'Pop-up was blocked by your browser. Allow pop-ups for this site and try again.';
    default:
      return error instanceof Error
        ? error.message
        : 'Authentication failed. Please try again.';
  }
}

interface PortalContextValue {
  user: StudentUser | null;
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
  pendingVerificationEmail: string | null;
  needsProfileSetup: boolean;
  theme: ThemeId;
  activeSection: NavSection;
  workspace: UserWorkspace;
  channels: ChatChannel[];
  activeFocusSubjectId: string | null;
  badges: BadgeDefinition[];
  focusSuggestions: FocusSuggestion[];
  toasts: ToastItem[];

  setActiveSection: (section: NavSection) => void;
  setActiveFocusSubjectId: (subjectId: string | null) => void;
  setTheme: (theme: ThemeId) => void;
  notify: (message: string, tone?: ToastItem['tone']) => void;
  dismissToast: (id: string) => void;

  // Auth & Profile
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    college: string;
    branch: string;
    year: string;
  }) => Promise<{ error?: string; needsVerification?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  completeOnboardingProfile: (input: {
    name: string;
    college: string;
    branch: string;
    year: string;
  }) => Promise<{ error?: string }>;
  resendVerificationEmail: () => Promise<{ error?: string }>;
  checkEmailVerification: () => Promise<{ verified: boolean; error?: string }>;
  signOut: () => void;
  updateProfile: (
    updates: Partial<
      Pick<StudentUser, 'name' | 'college' | 'branch' | 'year' | 'bio' | 'avatarDataUrl'>
    >
  ) => void;

  // Subjects & Study Sessions
  addSubject: (input: {
    name: string;
    code: string;
    credits: number;
    targetScore: number;
    currentProgress: number;
    currentMarks: number | null;
    maxMarks: number;
    color: string;
  }) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  logStudySession: (input: {
    subjectId: string | null;
    durationMinutes: number;
    mode: 'pomodoro' | 'manual';
    note?: string;
  }) => void;

  // Folders & Notes
  createFolder: (name: string, parentId: string | null) => NoteFolder;
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
  createNote: (folderId: string | null, initialTitle?: string) => NoteItem;
  updateNote: (noteId: string, updates: Partial<NoteItem>) => void;
  deleteNote: (noteId: string) => void;
  generateNoteShareCode: (noteId: string) => Promise<string | null>;
  importSharedNote: (code: string) => Promise<{ note?: NoteItem; error?: string }>;

  // Chat & Study Groups
  startDirectChat: (
    contactEmailOrHandle: string,
    displayName?: string
  ) => Promise<{ channelId?: string; error?: string }>;
  createStudyGroup: (
    name: string,
    description: string
  ) => Promise<{ channelId?: string; error?: string }>;
  joinStudyGroupByCode: (
    code: string
  ) => Promise<{ channelId?: string; error?: string }>;
  sendChatMessage: (
    channelId: string,
    text: string,
    attachment?: ChatAttachment | null
  ) => void;
  leaveOrDeleteChannel: (channelId: string) => void;

  // Calendar Events
  addEvent: (input: {
    title: string;
    category: EventCategory;
    color: string;
    date: string;
    time: string;
    location: string;
    notes: string;
    subjectId: string | null;
  }) => CalendarEvent;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  // Co-Curricular Activities
  addCoCurricularLog: (input: {
    title: string;
    category: CoCurricularCategory;
    type: ActivityType;
    date: string;
    hours: number;
    role: string;
    certificateTitle: string;
    notes: string;
  }) => void;
  updateCoCurricularLog: (id: string, updates: Partial<CoCurricularLog>) => void;
  deleteCoCurricularLog: (id: string) => void;

  // Tasks & Habits
  addTask: (input: {
    title: string;
    priority: TaskPriority;
    subjectId: string | null;
    dueDate: string;
  }) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addHabit: (title: string, targetDaysPerWeek: number) => void;
  toggleHabitForDate: (habitId: string, isoDate?: string) => void;
  deleteHabit: (habitId: string) => void;

  // Utilities
  exportWorkspaceJson: () => void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<StudentUser | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(
    null
  );
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [theme, setThemeState] = useState<ThemeId>(() => loadSavedTheme());
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [activeFocusSubjectId, setActiveFocusSubjectId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<UserWorkspace>(() => createEmptyWorkspace());
  const [memberships, setMemberships] = useState<ChannelMembershipDoc[]>([]);
  const [channelMetaMap, setChannelMetaMap] = useState<
    Record<string, Omit<ChatChannel, 'messages'>>
  >({});
  const [channelMsgsMap, setChannelMsgsMap] = useState<Record<string, ChatMessage[]>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Debounce queue for live note editing
  const noteTimersRef = useRef<Map<string, number>>(new Map());
  const notePendingRef = useRef<Map<string, Partial<NoteItem>>>(new Map());

  if (fatalError) {
    throw fatalError;
  }

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const notify = useCallback(
    (message: string, tone: ToastItem['tone'] = 'info') => {
      const id = generateSafeId('toast');
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const hydrateVerifiedUser = useCallback(
    async (fbUser: FirebaseUser) => {
      try {
        const existingProfile = await getStudentProfile(fbUser.uid);
        if (existingProfile) {
          setUser(existingProfile);
          setThemeState(existingProfile.theme);
          saveThemePref(existingProfile.theme);
          setNeedsProfileSetup(false);
          setPendingVerificationEmail(null);
          return;
        }

        // Check if this user just verified from Email/Password signup
        const pending = loadPendingProfile();
        if (pending && fbUser.email) {
          const created = await createStudentProfileAndDirectory({
            uid: fbUser.uid,
            name: pending.name || fbUser.displayName || 'Student',
            email: fbUser.email,
            college: pending.college,
            branch: pending.branch,
            year: pending.year,
            theme: pending.theme || loadSavedTheme(),
            avatarDataUrl: fbUser.photoURL || null,
          });
          clearPendingProfile();
          setUser(created);
          setThemeState(created.theme);
          setNeedsProfileSetup(false);
          setPendingVerificationEmail(null);
          return;
        }

        // Otherwise prompt 1-step Student Profile completion (e.g., first-time Google Sign-In)
        setUser(null);
        setNeedsProfileSetup(true);
        setPendingVerificationEmail(null);
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    []
  );

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setPendingVerificationEmail(null);
        setNeedsProfileSetup(false);
        setWorkspace(createEmptyWorkspace());
        setMemberships([]);
        setChannelMetaMap({});
        setChannelMsgsMap({});
        setAuthLoading(false);
        return;
      }

      if (!fbUser.emailVerified) {
        setUser(null);
        setNeedsProfileSetup(false);
        setPendingVerificationEmail(fbUser.email || 'your email');
        setAuthLoading(false);
        return;
      }

      await hydrateVerifiedUser(fbUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, [hydrateVerifiedUser]);

  // Real-time Firestore subscriptions (ONLY after auth ready + verified + profile hydrated)
  useEffect(() => {
    if (authLoading || !firebaseUser?.emailVerified || !user) {
      return;
    }

    const unsubWorkspace = subscribeWorkspace(user.id, {
      onSubjects: (subjects) => setWorkspace((p) => ({ ...p, subjects })),
      onSessions: (studySessions) => setWorkspace((p) => ({ ...p, studySessions })),
      onFolders: (folders) => setWorkspace((p) => ({ ...p, folders })),
      onNotes: (remoteNotes) =>
        setWorkspace((p) => ({
          ...p,
          notes: remoteNotes.map((rn) => {
            const pending = notePendingRef.current.get(rn.id);
            return pending ? { ...rn, ...pending } : rn;
          }),
        })),
      onEvents: (events) => setWorkspace((p) => ({ ...p, events })),
      onCoCurricular: (coCurricularLogs) =>
        setWorkspace((p) => ({ ...p, coCurricularLogs })),
      onTasks: (tasks) => setWorkspace((p) => ({ ...p, tasks })),
      onHabits: (habits) => setWorkspace((p) => ({ ...p, habits })),
      onError: (err) => setFatalError(err),
    });

    const unsubMemberships = subscribeUserMemberships(
      user.id,
      (list) => {
        setMemberships(list);
        setWorkspace((p) => ({
          ...p,
          channelIds: list.map((m) => m.channelId),
        }));
      },
      (err) => setFatalError(err)
    );

    return () => {
      unsubWorkspace();
      unsubMemberships();
      noteTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      noteTimersRef.current.clear();
      notePendingRef.current.clear();
    };
  }, [authLoading, firebaseUser, user]);

  // Real-time per-channel detail + message subscriptions
  useEffect(() => {
    if (authLoading || !firebaseUser?.emailVerified || !user || memberships.length === 0) {
      setChannelMetaMap({});
      setChannelMsgsMap({});
      return;
    }

    const activeIds = new Set(memberships.map((m) => m.channelId));
    setChannelMetaMap((prev) => {
      const next: Record<string, Omit<ChatChannel, 'messages'>> = {};
      for (const id of Object.keys(prev)) {
        if (activeIds.has(id)) next[id] = prev[id];
      }
      return next;
    });

    const unsubs = memberships.map((m) =>
      subscribeChannelDetail(
        m,
        (meta) => {
          setChannelMetaMap((prev) => {
            if (!meta) {
              const copy = { ...prev };
              delete copy[m.channelId];
              return copy;
            }
            return { ...prev, [m.channelId]: meta };
          });
        },
        (msgs) => {
          setChannelMsgsMap((prev) => ({ ...prev, [m.channelId]: msgs }));
        },
        (err) => setFatalError(err)
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authLoading, firebaseUser, user, memberships]);

  const channels: ChatChannel[] = useMemo(() => {
    return memberships
      .map((m) => {
        const meta = channelMetaMap[m.channelId];
        const msgs = channelMsgsMap[m.channelId] || [];
        if (!meta) {
          return {
            id: m.channelId,
            type: m.channelType,
            name: m.channelName,
            description: m.channelType === 'group' ? 'Study Group' : 'Direct classmate chat',
            inviteCode: null,
            participantEmails: [],
            createdBy: m.role === 'owner' ? m.uid : '',
            messages: msgs,
            createdAt: m.joinedAt,
            updatedAt: m.joinedAt,
          } satisfies ChatChannel;
        }
        return {
          ...meta,
          messages: msgs,
        } satisfies ChatChannel;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [memberships, channelMetaMap, channelMsgsMap]);

  // Handle ?importNote=NOTE-XXXXXX query parameter when signed in
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('importNote');
    if (!code) return;

    params.delete('importNote');
    const cleanUrl = `${window.location.pathname}${
      params.toString() ? `?${params.toString()}` : ''
    }`;
    window.history.replaceState({}, '', cleanUrl);

    void (async () => {
      try {
        const snapshot = await fetchSharedNoteByCode(code);
        if (!snapshot) return;
        const now = new Date().toISOString();
        const imported: NoteItem = {
          id: generateSafeId('note'),
          folderId: null,
          title: `${snapshot.title} (Shared)`,
          content: snapshot.content,
          tags: snapshot.tags,
          isFavorite: false,
          shareCode: null,
          createdAt: now,
          updatedAt: now,
        };
        await createNoteDoc(user.id, imported);
        setActiveSection('notes');
        notify(`Imported shared note "${snapshot.title}"`, 'success');
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  }, [user, notify]);

  const setTheme = useCallback(
    (nextTheme: ThemeId) => {
      setThemeState(nextTheme);
      saveThemePref(nextTheme);
      if (user) {
        setUser((prev) => (prev ? { ...prev, theme: nextTheme } : prev));
        void updateStudentProfileDoc(user.id, user.email, { theme: nextTheme }).catch(
          (err) => setFatalError(err instanceof Error ? err : new Error(String(err)))
        );
      }
    },
    [user]
  );

  // ============================================================================
  // Authentication Actions
  // ============================================================================

  const signUp: PortalContextValue['signUp'] = useCallback(
    async (input) => {
      try {
        savePendingProfile({
          name: input.name.trim(),
          college: input.college.trim(),
          branch: input.branch.trim(),
          year: input.year,
          theme,
        });
        const cred = await createUserWithEmailAndPassword(
          auth,
          input.email.trim(),
          input.password
        );
        await firebaseUpdateProfile(cred.user, {
          displayName: input.name.trim(),
        });
        await sendEmailVerification(cred.user);
        setPendingVerificationEmail(cred.user.email || input.email.trim());
        notify('Verification email sent! Check your inbox to activate your account.', 'info');
        return { needsVerification: true };
      } catch (error) {
        clearPendingProfile();
        return { error: mapFirebaseAuthError(error) };
      }
    },
    [theme, notify]
  );

  const signIn: PortalContextValue['signIn'] = useCallback(
    async (email, password) => {
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!cred.user.emailVerified) {
          setPendingVerificationEmail(cred.user.email || email.trim());
          return {};
        }
        setActiveSection('dashboard');
        notify('Signed in to CampusDesk.', 'success');
        return {};
      } catch (error) {
        return { error: mapFirebaseAuthError(error) };
      }
    },
    [notify]
  );

  const signInWithGoogle: PortalContextValue['signInWithGoogle'] = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setActiveSection('dashboard');
      return {};
    } catch (error) {
      return { error: mapFirebaseAuthError(error) };
    }
  }, []);

  const completeOnboardingProfile: PortalContextValue['completeOnboardingProfile'] =
    useCallback(
      async (input) => {
        const current = auth.currentUser;
        if (!current || !current.email) {
          return { error: 'Please sign in first.' };
        }
        try {
          const created = await createStudentProfileAndDirectory({
            uid: current.uid,
            name: input.name,
            email: current.email,
            college: input.college,
            branch: input.branch,
            year: input.year,
            theme,
            avatarDataUrl: current.photoURL || null,
          });
          setUser(created);
          setNeedsProfileSetup(false);
          setActiveSection('dashboard');
          notify(`Welcome to CampusDesk, ${created.name.split(' ')[0]}!`, 'success');
          return {};
        } catch (err) {
          setFatalError(err instanceof Error ? err : new Error(String(err)));
          return { error: 'Could not save your student profile.' };
        }
      },
      [theme, notify]
    );

  const resendVerificationEmail = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return { error: 'No active session found.' };
    try {
      await sendEmailVerification(current);
      notify('Verification email resent.', 'success');
      return {};
    } catch (error) {
      return { error: mapFirebaseAuthError(error) };
    }
  }, [notify]);

  const checkEmailVerification = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return { verified: false, error: 'No active session found.' };
    try {
      await current.reload();
      await current.getIdToken(true);
      if (current.emailVerified) {
        setFirebaseUser(current);
        await hydrateVerifiedUser(current);
        notify('Email verified! Welcome to CampusDesk.', 'success');
        return { verified: true };
      }
      return {
        verified: false,
        error: 'Email is not verified yet. Click the verification link in your inbox, then try again.',
      };
    } catch (error) {
      return { verified: false, error: mapFirebaseAuthError(error) };
    }
  }, [hydrateVerifiedUser, notify]);

  const signOut = useCallback(() => {
    void firebaseSignOut(auth).then(() => {
      setUser(null);
      setNeedsProfileSetup(false);
      setPendingVerificationEmail(null);
      setWorkspace(createEmptyWorkspace());
      setMemberships([]);
      setChannelMetaMap({});
      setChannelMsgsMap({});
      setActiveSection('dashboard');
      notify('You have been signed out.', 'info');
    });
  }, [notify]);

  const updateProfile: PortalContextValue['updateProfile'] = useCallback(
    (updates) => {
      if (!user) return;
      setUser((prev) => (prev ? { ...prev, ...updates } : prev));
      void updateStudentProfileDoc(user.id, user.email, updates)
        .then(() => notify('Profile updated.', 'success'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  // ============================================================================
  // Subjects & Study Sessions
  // ============================================================================

  const addSubject: PortalContextValue['addSubject'] = useCallback(
    (input) => {
      if (!user) return;
      const subject: Subject = {
        id: generateSafeId('sub'),
        ...input,
        studyMinutes: 0,
        createdAt: new Date().toISOString(),
      };
      void createSubjectDoc(user.id, subject)
        .then(() => notify(`Added subject "${subject.name}".`, 'success'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  const updateSubject: PortalContextValue['updateSubject'] = useCallback(
    (id, updates) => {
      if (!user) return;
      void updateSubjectDoc(user.id, id, updates).catch((err) =>
        setFatalError(err instanceof Error ? err : new Error(String(err)))
      );
    },
    [user]
  );

  const deleteSubject: PortalContextValue['deleteSubject'] = useCallback(
    (id) => {
      if (!user) return;
      void deleteSubjectDoc(user.id, id)
        .then(() => notify('Subject removed.', 'info'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  const logStudySession: PortalContextValue['logStudySession'] = useCallback(
    ({ subjectId, durationMinutes, mode, note = '' }) => {
      if (!user || durationMinutes <= 0) return;
      const session: StudySession = {
        id: generateSafeId('ses'),
        subjectId,
        durationMinutes,
        mode,
        note: note.trim(),
        completedAt: new Date().toISOString(),
      };
      const targetSubject = subjectId
        ? workspace.subjects.find((s) => s.id === subjectId)
        : undefined;
      const nextMinutes = targetSubject
        ? targetSubject.studyMinutes + durationMinutes
        : undefined;
      void logStudySessionDoc(user.id, session, nextMinutes)
        .then(() => notify(`Logged ${durationMinutes} min study session.`, 'success'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, workspace.subjects, notify]
  );

  // ============================================================================
  // Folders, Notes & Cloud Sharing
  // ============================================================================

  const createFolder: PortalContextValue['createFolder'] = useCallback(
    (name, parentId) => {
      const folder: NoteFolder = {
        id: generateSafeId('fld'),
        name: name.trim() || 'Untitled Folder',
        parentId,
        createdAt: new Date().toISOString(),
      };
      if (user) {
        void createFolderDoc(user.id, folder)
          .then(() => notify(`Created folder "${folder.name}".`, 'success'))
          .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
      }
      return folder;
    },
    [user, notify]
  );

  const renameFolder: PortalContextValue['renameFolder'] = useCallback(
    (folderId, name) => {
      const trimmed = name.trim();
      if (!user || !trimmed) return;
      void renameFolderDoc(user.id, folderId, trimmed)
        .then(() => notify('Folder renamed.', 'success'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  const deleteFolder: PortalContextValue['deleteFolder'] = useCallback(
    (folderId) => {
      if (!user) return;
      const toRemove = new Set<string>([folderId]);
      let added = true;
      while (added) {
        added = false;
        for (const f of workspace.folders) {
          if (f.parentId && toRemove.has(f.parentId) && !toRemove.has(f.id)) {
            toRemove.add(f.id);
            added = true;
          }
        }
      }
      const noteIdsToUnfile = workspace.notes
        .filter((n) => n.folderId && toRemove.has(n.folderId))
        .map((n) => n.id);

      void deleteFolderTreeDocs(user.id, Array.from(toRemove), noteIdsToUnfile)
        .then(() => notify('Folder deleted. Notes moved to Unfiled.', 'info'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, workspace.folders, workspace.notes, notify]
  );

  const createNote: PortalContextValue['createNote'] = useCallback(
    (folderId, initialTitle = '') => {
      const now = new Date().toISOString();
      const note: NoteItem = {
        id: generateSafeId('note'),
        folderId,
        title: initialTitle.trim() || 'Untitled Note',
        content: '',
        tags: [],
        isFavorite: false,
        shareCode: null,
        createdAt: now,
        updatedAt: now,
      };
      if (user) {
        setWorkspace((prev) => ({ ...prev, notes: [note, ...prev.notes] }));
        void createNoteDoc(user.id, note).catch((err) =>
          setFatalError(err instanceof Error ? err : new Error(String(err)))
        );
      }
      return note;
    },
    [user]
  );

  const updateNote: PortalContextValue['updateNote'] = useCallback(
    (noteId, updates) => {
      if (!user) return;
      const now = new Date().toISOString();
      setWorkspace((prev) => ({
        ...prev,
        notes: prev.notes.map((n) =>
          n.id === noteId ? { ...n, ...updates, updatedAt: now } : n
        ),
      }));

      const prevQueued = notePendingRef.current.get(noteId) || {};
      const merged = { ...prevQueued, ...updates };
      notePendingRef.current.set(noteId, merged);

      const existingTimer = noteTimersRef.current.get(noteId);
      if (existingTimer) window.clearTimeout(existingTimer);

      const isTextEditOnly =
        ('content' in updates || 'title' in updates) &&
        !('isFavorite' in updates) &&
        !('folderId' in updates) &&
        !('tags' in updates) &&
        !('shareCode' in updates);

      const flush = () => {
        noteTimersRef.current.delete(noteId);
        const payload = notePendingRef.current.get(noteId);
        notePendingRef.current.delete(noteId);
        if (!payload) return;
        void updateNoteDoc(user.id, noteId, payload).catch((err) =>
          setFatalError(err instanceof Error ? err : new Error(String(err)))
        );
      };

      if (isTextEditOnly) {
        const timerId = window.setTimeout(flush, 450);
        noteTimersRef.current.set(noteId, timerId);
      } else {
        flush();
      }
    },
    [user]
  );

  const deleteNote: PortalContextValue['deleteNote'] = useCallback(
    (noteId) => {
      if (!user) return;
      const timerId = noteTimersRef.current.get(noteId);
      if (timerId) window.clearTimeout(timerId);
      noteTimersRef.current.delete(noteId);
      notePendingRef.current.delete(noteId);
      void deleteNoteDoc(user.id, noteId)
        .then(() => notify('Note deleted.', 'info'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  const generateNoteShareCode: PortalContextValue['generateNoteShareCode'] = useCallback(
    async (noteId) => {
      if (!user) return null;
      const target = workspace.notes.find((n) => n.id === noteId);
      if (!target) return null;
      try {
        return await publishSharedNote(user, target);
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    },
    [user, workspace.notes]
  );

  const importSharedNote: PortalContextValue['importSharedNote'] = useCallback(
    async (code) => {
      if (!user) return { error: 'Please sign in first.' };
      try {
        const snapshot = await fetchSharedNoteByCode(code);
        if (!snapshot) {
          return {
            error: 'No shared note found for that code. Check the code and try again.',
          };
        }
        const now = new Date().toISOString();
        const note: NoteItem = {
          id: generateSafeId('note'),
          folderId: null,
          title: snapshot.title,
          content: snapshot.content,
          tags: [...snapshot.tags],
          isFavorite: false,
          shareCode: null,
          createdAt: now,
          updatedAt: now,
        };
        await createNoteDoc(user.id, note);
        notify(`Imported "${note.title}" from ${snapshot.authorName}.`, 'success');
        return { note };
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
        return { error: 'Failed to import note.' };
      }
    },
    [user, notify]
  );

  // ============================================================================
  // Real-Time Chat & Study Groups
  // ============================================================================

  const startDirectChat: PortalContextValue['startDirectChat'] = useCallback(
    async (contactEmailOrHandle, displayName) => {
      if (!user) return { error: 'Please sign in first.' };
      try {
        const res = await startDirectChatDoc(user, contactEmailOrHandle, displayName);
        if (res.error) return { error: res.error };
        if (res.peerName) notify(`Connected with ${res.peerName}.`, 'success');
        return { channelId: res.channelId };
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
        return { error: 'Could not start chat.' };
      }
    },
    [user, notify]
  );

  const createStudyGroup: PortalContextValue['createStudyGroup'] = useCallback(
    async (name, description) => {
      if (!user) return { error: 'Please sign in first.' };
      try {
        const res = await createStudyGroupDoc(user, name, description);
        notify(`Created study group "${res.name}" (${res.inviteCode}).`, 'success');
        return { channelId: res.channelId };
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
        return { error: 'Could not create study group.' };
      }
    },
    [user, notify]
  );

  const joinStudyGroupByCode: PortalContextValue['joinStudyGroupByCode'] = useCallback(
    async (code) => {
      if (!user) return { error: 'Please sign in first.' };
      try {
        const res = await joinStudyGroupByCodeDoc(user, code);
        if (res.error) return { error: res.error };
        notify(`Joined study group "${res.channelName}".`, 'success');
        return { channelId: res.channelId };
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
        return { error: 'Could not join study group.' };
      }
    },
    [user, notify]
  );

  const sendChatMessage: PortalContextValue['sendChatMessage'] = useCallback(
    (channelId, text, attachment = null) => {
      if (!user) return;
      if (!text.trim() && !attachment) return;
      void sendChatMessageDoc(user, channelId, text, attachment).catch((err) =>
        setFatalError(err instanceof Error ? err : new Error(String(err)))
      );
    },
    [user]
  );

  const leaveOrDeleteChannel: PortalContextValue['leaveOrDeleteChannel'] = useCallback(
    (channelId) => {
      if (!user) return;
      void leaveChannelDoc(user.id, channelId)
        .then(() => notify('Left conversation.', 'info'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  // ============================================================================
  // Calendar Events, Co-Curricular, Tasks & Habits
  // ============================================================================

  const addEvent: PortalContextValue['addEvent'] = useCallback(
    (input) => {
      const event: CalendarEvent = {
        id: generateSafeId('evt'),
        ...input,
        createdAt: new Date().toISOString(),
      };
      if (user) {
        void createEventDoc(user.id, event)
          .then(() => notify(`Scheduled "${event.title}".`, 'success'))
          .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
      }
      return event;
    },
    [user, notify]
  );

  const updateEvent: PortalContextValue['updateEvent'] = useCallback(
    (id, updates) => {
      if (!user) return;
      void updateEventDoc(user.id, id, updates)
        .then(() => notify('Event updated.', 'success'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  const deleteEvent: PortalContextValue['deleteEvent'] = useCallback(
    (id) => {
      if (!user) return;
      void deleteEventDoc(user.id, id)
        .then(() => notify('Event deleted.', 'info'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  const addCoCurricularLog: PortalContextValue['addCoCurricularLog'] = useCallback(
    (input) => {
      if (!user) return;
      const entry: CoCurricularLog = {
        id: generateSafeId('cc'),
        ...input,
        createdAt: new Date().toISOString(),
      };
      void createCoCurricularDoc(user.id, entry)
        .then(() => notify(`Logged "${entry.title}".`, 'success'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  const updateCoCurricularLog: PortalContextValue['updateCoCurricularLog'] = useCallback(
    (id, updates) => {
      if (!user) return;
      void updateCoCurricularDoc(user.id, id, updates)
        .then(() => notify('Activity updated.', 'success'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  const deleteCoCurricularLog: PortalContextValue['deleteCoCurricularLog'] = useCallback(
    (id) => {
      if (!user) return;
      void deleteCoCurricularDoc(user.id, id)
        .then(() => notify('Activity removed.', 'info'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  const addTask: PortalContextValue['addTask'] = useCallback(
    (input) => {
      if (!user) return;
      const task: TodoTask = {
        id: generateSafeId('tsk'),
        ...input,
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      void createTaskDoc(user.id, task)
        .then(() => notify('Task added.', 'success'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  const toggleTask: PortalContextValue['toggleTask'] = useCallback(
    (id) => {
      if (!user) return;
      const target = workspace.tasks.find((t) => t.id === id);
      if (!target) return;
      void toggleTaskDoc(user.id, id, !target.completed).catch((err) =>
        setFatalError(err instanceof Error ? err : new Error(String(err)))
      );
    },
    [user, workspace.tasks]
  );

  const deleteTask: PortalContextValue['deleteTask'] = useCallback(
    (id) => {
      if (!user) return;
      void deleteTaskDoc(user.id, id).catch((err) =>
        setFatalError(err instanceof Error ? err : new Error(String(err)))
      );
    },
    [user]
  );

  const addHabit: PortalContextValue['addHabit'] = useCallback(
    (title, targetDaysPerWeek) => {
      if (!user) return;
      const habit: DailyHabit = {
        id: generateSafeId('hab'),
        title: title.trim(),
        targetDaysPerWeek,
        completedDates: [],
        createdAt: new Date().toISOString(),
      };
      void createHabitDoc(user.id, habit)
        .then(() => notify(`Habit "${habit.title}" created.`, 'success'))
        .catch((err) => setFatalError(err instanceof Error ? err : new Error(String(err))));
    },
    [user, notify]
  );

  const toggleHabitForDate: PortalContextValue['toggleHabitForDate'] = useCallback(
    (habitId, isoDate = getTodayIsoDate()) => {
      if (!user) return;
      const habit = workspace.habits.find((h) => h.id === habitId);
      if (!habit) return;
      const exists = habit.completedDates.includes(isoDate);
      const nextDates = exists
        ? habit.completedDates.filter((d) => d !== isoDate)
        : [...habit.completedDates, isoDate];
      void updateHabitDatesDoc(user.id, habitId, nextDates).catch((err) =>
        setFatalError(err instanceof Error ? err : new Error(String(err)))
      );
    },
    [user, workspace.habits]
  );

  const deleteHabit: PortalContextValue['deleteHabit'] = useCallback(
    (habitId) => {
      if (!user) return;
      void deleteHabitDoc(user.id, habitId).catch((err) =>
        setFatalError(err instanceof Error ? err : new Error(String(err)))
      );
    },
    [user]
  );

  const exportWorkspaceJson = useCallback(() => {
    if (!user) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        name: user.name,
        email: user.email,
        college: user.college,
        branch: user.branch,
        year: user.year,
        bio: user.bio,
      },
      workspace,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campusdesk-backup-${getTodayIsoDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported workspace backup JSON.', 'success');
  }, [user, workspace, notify]);

  const badges = useMemo(() => computeBadges(workspace), [workspace]);
  const focusSuggestions = useMemo(() => computeFocusSuggestions(workspace), [workspace]);

  const value: PortalContextValue = {
    user,
    firebaseUser,
    authLoading,
    pendingVerificationEmail,
    needsProfileSetup,
    theme,
    activeSection,
    workspace,
    channels,
    activeFocusSubjectId,
    badges,
    focusSuggestions,
    toasts,
    setActiveSection,
    setActiveFocusSubjectId,
    setTheme,
    notify,
    dismissToast,
    signUp,
    signIn,
    signInWithGoogle,
    completeOnboardingProfile,
    resendVerificationEmail,
    checkEmailVerification,
    signOut,
    updateProfile,
    addSubject,
    updateSubject,
    deleteSubject,
    logStudySession,
    createFolder,
    renameFolder,
    deleteFolder,
    createNote,
    updateNote,
    deleteNote,
    generateNoteShareCode,
    importSharedNote,
    startDirectChat,
    createStudyGroup,
    joinStudyGroupByCode,
    sendChatMessage,
    leaveOrDeleteChannel,
    addEvent,
    updateEvent,
    deleteEvent,
    addCoCurricularLog,
    updateCoCurricularLog,
    deleteCoCurricularLog,
    addTask,
    toggleTask,
    deleteTask,
    addHabit,
    toggleHabitForDate,
    deleteHabit,
    exportWorkspaceJson,
  };

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
};

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error('usePortal must be used inside PortalProvider');
  }
  return ctx;
}
