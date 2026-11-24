import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  db,
  generateSafeCode,
  generateSafeId,
  handleFirestoreError,
  OperationType,
  sanitizeRawStr,
  sanitizeStr,
  sanitizeTags,
  sha256Hex,
  timestampToIso,
} from '../lib/firebase';
import type {
  ActivityType,
  CalendarEvent,
  ChatAttachment,
  ChatChannel,
  ChatMessage,
  CoCurricularCategory,
  CoCurricularLog,
  DailyHabit,
  EventCategory,
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
import { getTodayIsoDate } from '../utils/portalHelpers';

export interface ChannelMembershipDoc {
  channelId: string;
  uid: string;
  displayName: string;
  role: 'owner' | 'member';
  channelType: 'direct' | 'group';
  channelName: string;
  joinedAt: string;
}

export function createEmptyWorkspace(): UserWorkspace {
  return {
    subjects: [],
    studySessions: [],
    folders: [],
    notes: [],
    events: [],
    coCurricularLogs: [],
    tasks: [],
    habits: [],
    channelIds: [],
  };
}

// ============================================================================
// Student Profile & Non-PII Directory
// ============================================================================

export async function getStudentProfile(uid: string): Promise<StudentUser | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      id: uid,
      name: String(d.name || 'Student'),
      email: String(d.email || ''),
      college: String(d.college || ''),
      branch: String(d.branch || ''),
      year: String(d.year || '1st Year'),
      bio: String(d.bio || ''),
      avatarDataUrl: typeof d.avatarDataUrl === 'string' ? d.avatarDataUrl : null,
      theme: (d.theme as ThemeId) || 'light',
      createdAt: timestampToIso(d.createdAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createStudentProfileAndDirectory(input: {
  uid: string;
  name: string;
  email: string;
  college: string;
  branch: string;
  year: string;
  theme: ThemeId;
  avatarDataUrl?: string | null;
}): Promise<StudentUser> {
  const path = `users/${input.uid}`;
  const cleanName = sanitizeStr(input.name, 120) || 'Student';
  const cleanEmail = sanitizeStr(input.email.toLowerCase(), 200);
  const cleanCollege = sanitizeStr(input.college, 160) || 'University';
  const cleanBranch = sanitizeStr(input.branch, 120) || 'General Studies';
  const cleanYear = sanitizeStr(input.year, 40) || '1st Year';
  const cleanAvatar =
    input.avatarDataUrl && input.avatarDataUrl.length <= 250000
      ? input.avatarDataUrl
      : null;

  try {
    const emailHash = await sha256Hex(cleanEmail);
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', input.uid), {
      uid: input.uid,
      name: cleanName,
      email: cleanEmail,
      college: cleanCollege,
      branch: cleanBranch,
      year: cleanYear,
      bio: '',
      avatarDataUrl: cleanAvatar,
      theme: input.theme,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'studentDirectory', emailHash), {
      uid: input.uid,
      displayName: cleanName,
      college: cleanCollege,
      branch: cleanBranch,
      year: cleanYear,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return {
      id: input.uid,
      name: cleanName,
      email: cleanEmail,
      college: cleanCollege,
      branch: cleanBranch,
      year: cleanYear,
      bio: '',
      avatarDataUrl: cleanAvatar,
      theme: input.theme,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateStudentProfileDoc(
  uid: string,
  email: string,
  updates: Partial<
    Pick<StudentUser, 'name' | 'college' | 'branch' | 'year' | 'bio' | 'avatarDataUrl' | 'theme'>
  >
): Promise<void> {
  const path = `users/${uid}`;
  try {
    if ('theme' in updates && updates.theme) {
      await updateDoc(doc(db, 'users', uid), {
        theme: updates.theme,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    if ('avatarDataUrl' in updates) {
      const avatar =
        updates.avatarDataUrl && updates.avatarDataUrl.length <= 250000
          ? updates.avatarDataUrl
          : null;
      await updateDoc(doc(db, 'users', uid), {
        avatarDataUrl: avatar,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const profilePayload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    const dirPayload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    let updateDir = false;

    if (typeof updates.name === 'string') {
      const v = sanitizeStr(updates.name, 120) || 'Student';
      profilePayload.name = v;
      dirPayload.displayName = v;
      updateDir = true;
    }
    if (typeof updates.college === 'string') {
      const v = sanitizeStr(updates.college, 160) || 'University';
      profilePayload.college = v;
      dirPayload.college = v;
      updateDir = true;
    }
    if (typeof updates.branch === 'string') {
      const v = sanitizeStr(updates.branch, 120) || 'General';
      profilePayload.branch = v;
      dirPayload.branch = v;
      updateDir = true;
    }
    if (typeof updates.year === 'string') {
      const v = sanitizeStr(updates.year, 40) || '1st Year';
      profilePayload.year = v;
      dirPayload.year = v;
      updateDir = true;
    }
    if (typeof updates.bio === 'string') {
      profilePayload.bio = sanitizeStr(updates.bio, 600);
    }

    await updateDoc(doc(db, 'users', uid), profilePayload);

    if (updateDir && email) {
      const emailHash = await sha256Hex(email);
      const dirRef = doc(db, 'studentDirectory', emailHash);
      const dirSnap = await getDoc(dirRef);
      if (dirSnap.exists()) {
        await updateDoc(dirRef, dirPayload);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// Real-Time Workspace Subscriptions
// ============================================================================

export function subscribeWorkspace(
  uid: string,
  callbacks: {
    onSubjects: (items: Subject[]) => void;
    onSessions: (items: StudySession[]) => void;
    onFolders: (items: NoteFolder[]) => void;
    onNotes: (items: NoteItem[]) => void;
    onEvents: (items: CalendarEvent[]) => void;
    onCoCurricular: (items: CoCurricularLog[]) => void;
    onTasks: (items: TodoTask[]) => void;
    onHabits: (items: DailyHabit[]) => void;
    onError: (err: Error) => void;
  }
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  const handleErr = (op: OperationType, path: string) => (error: unknown) => {
    try {
      handleFirestoreError(error, op, path);
    } catch (wrapped) {
      callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
    }
  };

  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', uid, 'subjects'), where('ownerId', '==', uid)),
      (snap) => {
        const list: Subject[] = snap.docs
          .map((d) => {
            const x = d.data();
            return {
              id: d.id,
              name: String(x.name || ''),
              code: String(x.code || ''),
              credits: Number(x.credits ?? 3),
              targetScore: Number(x.targetScore ?? 85),
              currentProgress: Number(x.currentProgress ?? 0),
              currentMarks: typeof x.currentMarks === 'number' ? x.currentMarks : null,
              maxMarks: Number(x.maxMarks ?? 100),
              color: String(x.color || '#2563EB'),
              studyMinutes: Number(x.studyMinutes ?? 0),
              createdAt: timestampToIso(x.createdAt),
            };
          })
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        callbacks.onSubjects(list);
      },
      handleErr(OperationType.LIST, `users/${uid}/subjects`)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', uid, 'studySessions'), where('ownerId', '==', uid)),
      (snap) => {
        const list: StudySession[] = snap.docs
          .map((d) => {
            const x = d.data();
            const mode: StudySession['mode'] = x.mode === 'manual' ? 'manual' : 'pomodoro';
            return {
              id: d.id,
              subjectId: typeof x.subjectId === 'string' ? x.subjectId : null,
              durationMinutes: Number(x.durationMinutes ?? 0),
              mode,
              note: String(x.note || ''),
              completedAt: String(x.completedAt || timestampToIso(x.createdAt)),
            };
          })
          .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
        callbacks.onSessions(list);
      },
      handleErr(OperationType.LIST, `users/${uid}/studySessions`)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', uid, 'folders'), where('ownerId', '==', uid)),
      (snap) => {
        const list: NoteFolder[] = snap.docs
          .map((d) => {
            const x = d.data();
            return {
              id: d.id,
              name: String(x.name || 'Untitled Folder'),
              parentId: typeof x.parentId === 'string' ? x.parentId : null,
              createdAt: timestampToIso(x.createdAt),
            };
          })
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        callbacks.onFolders(list);
      },
      handleErr(OperationType.LIST, `users/${uid}/folders`)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', uid, 'notes'), where('ownerId', '==', uid)),
      (snap) => {
        const list: NoteItem[] = snap.docs
          .map((d) => {
            const x = d.data();
            return {
              id: d.id,
              folderId: typeof x.folderId === 'string' ? x.folderId : null,
              title: String(x.title || ''),
              content: String(x.content || ''),
              tags: Array.isArray(x.tags) ? x.tags.map(String) : [],
              isFavorite: Boolean(x.isFavorite),
              shareCode: typeof x.shareCode === 'string' ? x.shareCode : null,
              createdAt: timestampToIso(x.createdAt),
              updatedAt: timestampToIso(x.updatedAt),
            };
          })
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        callbacks.onNotes(list);
      },
      handleErr(OperationType.LIST, `users/${uid}/notes`)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', uid, 'events'), where('ownerId', '==', uid)),
      (snap) => {
        const list: CalendarEvent[] = snap.docs
          .map((d) => {
            const x = d.data();
            return {
              id: d.id,
              title: String(x.title || ''),
              category: (x.category as EventCategory) || 'personal',
              color: String(x.color || '#2563EB'),
              date: String(x.date || getTodayIsoDate()),
              time: String(x.time || ''),
              location: String(x.location || ''),
              notes: String(x.notes || ''),
              subjectId: typeof x.subjectId === 'string' ? x.subjectId : null,
              createdAt: timestampToIso(x.createdAt),
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
        callbacks.onEvents(list);
      },
      handleErr(OperationType.LIST, `users/${uid}/events`)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', uid, 'coCurricularLogs'), where('ownerId', '==', uid)),
      (snap) => {
        const list: CoCurricularLog[] = snap.docs
          .map((d) => {
            const x = d.data();
            return {
              id: d.id,
              title: String(x.title || ''),
              category: (x.category as CoCurricularCategory) || 'Other',
              type: (x.type as ActivityType) || 'Event',
              date: String(x.date || getTodayIsoDate()),
              hours: Number(x.hours ?? 0),
              role: String(x.role || ''),
              certificateTitle: String(x.certificateTitle || ''),
              notes: String(x.notes || ''),
              createdAt: timestampToIso(x.createdAt),
            };
          })
          .sort((a, b) => b.date.localeCompare(a.date));
        callbacks.onCoCurricular(list);
      },
      handleErr(OperationType.LIST, `users/${uid}/coCurricularLogs`)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', uid, 'tasks'), where('ownerId', '==', uid)),
      (snap) => {
        const list: TodoTask[] = snap.docs
          .map((d) => {
            const x = d.data();
            return {
              id: d.id,
              title: String(x.title || ''),
              priority: (x.priority as TaskPriority) || 'medium',
              subjectId: typeof x.subjectId === 'string' ? x.subjectId : null,
              dueDate: String(x.dueDate || ''),
              completed: Boolean(x.completed),
              completedAt: typeof x.completedAt === 'string' ? x.completedAt : null,
              createdAt: timestampToIso(x.createdAt),
            };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        callbacks.onTasks(list);
      },
      handleErr(OperationType.LIST, `users/${uid}/tasks`)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'users', uid, 'habits'), where('ownerId', '==', uid)),
      (snap) => {
        const list: DailyHabit[] = snap.docs
          .map((d) => {
            const x = d.data();
            return {
              id: d.id,
              title: String(x.title || ''),
              targetDaysPerWeek: Number(x.targetDaysPerWeek ?? 5),
              completedDates: Array.isArray(x.completedDates)
                ? x.completedDates.map(String)
                : [],
              createdAt: timestampToIso(x.createdAt),
            };
          })
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        callbacks.onHabits(list);
      },
      handleErr(OperationType.LIST, `users/${uid}/habits`)
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

// ============================================================================
// Workspace CRUD Operations
// ============================================================================

export async function createSubjectDoc(uid: string, subject: Subject): Promise<void> {
  const path = `users/${uid}/subjects/${subject.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'subjects', subject.id), {
      id: subject.id,
      ownerId: uid,
      name: sanitizeStr(subject.name, 140) || 'Subject',
      code: sanitizeStr(subject.code, 40),
      credits: Math.min(30, Math.max(0, Number(subject.credits) || 0)),
      targetScore: Math.min(100, Math.max(0, Number(subject.targetScore) || 0)),
      currentProgress: Math.min(100, Math.max(0, Number(subject.currentProgress) || 0)),
      currentMarks:
        subject.currentMarks === null
          ? null
          : Math.min(10000, Math.max(0, Number(subject.currentMarks))),
      maxMarks: Math.min(10000, Math.max(1, Number(subject.maxMarks) || 100)),
      color: sanitizeStr(subject.color, 32) || '#2563EB',
      studyMinutes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSubjectDoc(
  uid: string,
  subjectId: string,
  updates: Partial<Subject>
): Promise<void> {
  const path = `users/${uid}/subjects/${subjectId}`;
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (typeof updates.name === 'string') payload.name = sanitizeStr(updates.name, 140) || 'Subject';
  if (typeof updates.code === 'string') payload.code = sanitizeStr(updates.code, 40);
  if (typeof updates.credits === 'number')
    payload.credits = Math.min(30, Math.max(0, updates.credits));
  if (typeof updates.targetScore === 'number')
    payload.targetScore = Math.min(100, Math.max(0, updates.targetScore));
  if (typeof updates.currentProgress === 'number')
    payload.currentProgress = Math.min(100, Math.max(0, updates.currentProgress));
  if ('currentMarks' in updates)
    payload.currentMarks =
      updates.currentMarks === null || updates.currentMarks === undefined
        ? null
        : Math.min(10000, Math.max(0, Number(updates.currentMarks)));
  if (typeof updates.maxMarks === 'number')
    payload.maxMarks = Math.min(10000, Math.max(1, updates.maxMarks));
  if (typeof updates.color === 'string') payload.color = sanitizeStr(updates.color, 32) || '#2563EB';
  if (typeof updates.studyMinutes === 'number')
    payload.studyMinutes = Math.min(1000000, Math.max(0, updates.studyMinutes));

  try {
    await updateDoc(doc(db, 'users', uid, 'subjects', subjectId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSubjectDoc(uid: string, subjectId: string): Promise<void> {
  const path = `users/${uid}/subjects/${subjectId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'subjects', subjectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function logStudySessionDoc(
  uid: string,
  session: StudySession,
  nextSubjectMinutes?: number
): Promise<void> {
  const path = `users/${uid}/studySessions/${session.id}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, 'studySessions', session.id), {
      id: session.id,
      ownerId: uid,
      subjectId: session.subjectId,
      durationMinutes: Math.min(1440, Math.max(1, Math.round(session.durationMinutes))),
      mode: session.mode,
      note: sanitizeStr(session.note, 400),
      completedAt: session.completedAt,
      createdAt: serverTimestamp(),
    });
    if (session.subjectId && typeof nextSubjectMinutes === 'number') {
      batch.update(doc(db, 'users', uid, 'subjects', session.subjectId), {
        studyMinutes: Math.min(1000000, Math.max(0, nextSubjectMinutes)),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createFolderDoc(uid: string, folder: NoteFolder): Promise<void> {
  const path = `users/${uid}/folders/${folder.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'folders', folder.id), {
      id: folder.id,
      ownerId: uid,
      name: sanitizeStr(folder.name, 120) || 'Untitled Folder',
      parentId: folder.parentId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function renameFolderDoc(
  uid: string,
  folderId: string,
  name: string
): Promise<void> {
  const path = `users/${uid}/folders/${folderId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'folders', folderId), {
      name: sanitizeStr(name, 120) || 'Untitled Folder',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFolderTreeDocs(
  uid: string,
  folderIdsToDelete: string[],
  noteIdsToUnfile: string[]
): Promise<void> {
  const path = `users/${uid}/folders`;
  try {
    const batch = writeBatch(db);
    for (const fid of folderIdsToDelete) {
      batch.delete(doc(db, 'users', uid, 'folders', fid));
    }
    for (const nid of noteIdsToUnfile) {
      batch.update(doc(db, 'users', uid, 'notes', nid), {
        folderId: null,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createNoteDoc(uid: string, note: NoteItem): Promise<void> {
  const path = `users/${uid}/notes/${note.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'notes', note.id), {
      id: note.id,
      ownerId: uid,
      folderId: note.folderId,
      title: sanitizeRawStr(note.title, 200),
      content: sanitizeRawStr(note.content, 100000),
      tags: sanitizeTags(note.tags),
      isFavorite: Boolean(note.isFavorite),
      shareCode: note.shareCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateNoteDoc(
  uid: string,
  noteId: string,
  updates: Partial<NoteItem>
): Promise<void> {
  const path = `users/${uid}/notes/${noteId}`;
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if ('title' in updates && typeof updates.title === 'string') {
    payload.title = sanitizeRawStr(updates.title, 200);
  }
  if ('content' in updates && typeof updates.content === 'string') {
    payload.content = sanitizeRawStr(updates.content, 100000);
  }
  if ('tags' in updates && Array.isArray(updates.tags)) {
    payload.tags = sanitizeTags(updates.tags);
  }
  if ('folderId' in updates) {
    payload.folderId = updates.folderId ?? null;
  }
  if ('isFavorite' in updates && typeof updates.isFavorite === 'boolean') {
    payload.isFavorite = updates.isFavorite;
  }
  if ('shareCode' in updates) {
    payload.shareCode = updates.shareCode ?? null;
  }

  try {
    await updateDoc(doc(db, 'users', uid, 'notes', noteId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteNoteDoc(uid: string, noteId: string): Promise<void> {
  const path = `users/${uid}/notes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'notes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function publishSharedNote(
  user: StudentUser,
  note: NoteItem
): Promise<string> {
  const code = note.shareCode || generateSafeCode('NOTE');
  const path = `sharedNotes/${code}`;
  try {
    const ref = doc(db, 'sharedNotes', code);
    const existingSnap = await getDoc(ref);
    const title = sanitizeStr(note.title, 200) || 'Untitled Note';
    const content = sanitizeRawStr(note.content, 100000);
    const tags = sanitizeTags(note.tags);
    const authorName = sanitizeStr(user.name, 120) || 'Student';
    const authorCollege = sanitizeStr(user.college, 160);

    if (existingSnap.exists() && existingSnap.data().ownerId === user.id) {
      await updateDoc(ref, {
        title,
        content,
        tags,
        authorName,
        authorCollege,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        code,
        ownerId: user.id,
        title,
        content,
        tags,
        authorName,
        authorCollege,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (!note.shareCode) {
      await updateDoc(doc(db, 'users', user.id, 'notes', note.id), {
        shareCode: code,
        updatedAt: serverTimestamp(),
      });
    }
    return code;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchSharedNoteByCode(code: string): Promise<{
  title: string;
  content: string;
  tags: string[];
  authorName: string;
} | null> {
  const normalized = code.trim().toUpperCase();
  if (!/^NOTE-[A-Z0-9]{6}$/.test(normalized)) return null;
  const path = `sharedNotes/${normalized}`;
  try {
    const snap = await getDoc(doc(db, 'sharedNotes', normalized));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      title: String(d.title || 'Shared Note'),
      content: String(d.content || ''),
      tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
      authorName: String(d.authorName || 'Classmate'),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createEventDoc(uid: string, event: CalendarEvent): Promise<void> {
  const path = `users/${uid}/events/${event.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'events', event.id), {
      id: event.id,
      ownerId: uid,
      title: sanitizeStr(event.title, 180) || 'Event',
      category: event.category,
      color: sanitizeStr(event.color, 32) || '#2563EB',
      date: /^\d{4}-\d{2}-\d{2}$/.test(event.date) ? event.date : getTodayIsoDate(),
      time: sanitizeStr(event.time, 16),
      location: sanitizeStr(event.location, 160),
      notes: sanitizeStr(event.notes, 1000),
      subjectId: event.subjectId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateEventDoc(
  uid: string,
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<void> {
  const path = `users/${uid}/events/${eventId}`;
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (typeof updates.title === 'string') payload.title = sanitizeStr(updates.title, 180) || 'Event';
  if (updates.category) payload.category = updates.category;
  if (typeof updates.color === 'string') payload.color = sanitizeStr(updates.color, 32) || '#2563EB';
  if (typeof updates.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(updates.date))
    payload.date = updates.date;
  if (typeof updates.time === 'string') payload.time = sanitizeStr(updates.time, 16);
  if (typeof updates.location === 'string') payload.location = sanitizeStr(updates.location, 160);
  if (typeof updates.notes === 'string') payload.notes = sanitizeStr(updates.notes, 1000);
  if ('subjectId' in updates) payload.subjectId = updates.subjectId ?? null;

  try {
    await updateDoc(doc(db, 'users', uid, 'events', eventId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEventDoc(uid: string, eventId: string): Promise<void> {
  const path = `users/${uid}/events/${eventId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createCoCurricularDoc(
  uid: string,
  entry: CoCurricularLog
): Promise<void> {
  const path = `users/${uid}/coCurricularLogs/${entry.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'coCurricularLogs', entry.id), {
      id: entry.id,
      ownerId: uid,
      title: sanitizeStr(entry.title, 180) || 'Activity',
      category: entry.category,
      type: entry.type,
      date: /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? entry.date : getTodayIsoDate(),
      hours: Math.min(500, Math.max(0, Number(entry.hours) || 0)),
      role: sanitizeStr(entry.role, 120),
      certificateTitle: sanitizeStr(entry.certificateTitle, 180),
      notes: sanitizeStr(entry.notes, 1000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCoCurricularDoc(
  uid: string,
  logId: string,
  updates: Partial<CoCurricularLog>
): Promise<void> {
  const path = `users/${uid}/coCurricularLogs/${logId}`;
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (typeof updates.title === 'string')
    payload.title = sanitizeStr(updates.title, 180) || 'Activity';
  if (updates.category) payload.category = updates.category;
  if (updates.type) payload.type = updates.type;
  if (typeof updates.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(updates.date))
    payload.date = updates.date;
  if (typeof updates.hours === 'number')
    payload.hours = Math.min(500, Math.max(0, updates.hours));
  if (typeof updates.role === 'string') payload.role = sanitizeStr(updates.role, 120);
  if (typeof updates.certificateTitle === 'string')
    payload.certificateTitle = sanitizeStr(updates.certificateTitle, 180);
  if (typeof updates.notes === 'string') payload.notes = sanitizeStr(updates.notes, 1000);

  try {
    await updateDoc(doc(db, 'users', uid, 'coCurricularLogs', logId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCoCurricularDoc(uid: string, logId: string): Promise<void> {
  const path = `users/${uid}/coCurricularLogs/${logId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'coCurricularLogs', logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createTaskDoc(uid: string, task: TodoTask): Promise<void> {
  const path = `users/${uid}/tasks/${task.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'tasks', task.id), {
      id: task.id,
      ownerId: uid,
      title: sanitizeStr(task.title, 240) || 'Task',
      priority: task.priority,
      subjectId: task.subjectId,
      dueDate: sanitizeStr(task.dueDate, 16),
      completed: false,
      completedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleTaskDoc(
  uid: string,
  taskId: string,
  nextCompleted: boolean
): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'tasks', taskId), {
      completed: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTaskDoc(uid: string, taskId: string): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createHabitDoc(uid: string, habit: DailyHabit): Promise<void> {
  const path = `users/${uid}/habits/${habit.id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'habits', habit.id), {
      id: habit.id,
      ownerId: uid,
      title: sanitizeStr(habit.title, 160) || 'Daily Habit',
      targetDaysPerWeek: Math.min(7, Math.max(1, Math.round(habit.targetDaysPerWeek))),
      completedDates: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateHabitDatesDoc(
  uid: string,
  habitId: string,
  completedDates: string[]
): Promise<void> {
  const path = `users/${uid}/habits/${habitId}`;
  const safeDates = completedDates
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .slice(-400);
  try {
    await updateDoc(doc(db, 'users', uid, 'habits', habitId), {
      completedDates: safeDates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteHabitDoc(uid: string, habitId: string): Promise<void> {
  const path = `users/${uid}/habits/${habitId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'habits', habitId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// Real-Time Student Chat & Study Groups
// ============================================================================

export function subscribeUserMemberships(
  uid: string,
  onUpdate: (memberships: ChannelMembershipDoc[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'channelMemberships';
  return onSnapshot(
    query(collection(db, 'channelMemberships'), where('uid', '==', uid)),
    (snap) => {
      const list: ChannelMembershipDoc[] = snap.docs.map((d) => {
        const x = d.data();
        return {
          channelId: String(x.channelId || ''),
          uid: String(x.uid || ''),
          displayName: String(x.displayName || 'Student'),
          role: x.role === 'owner' ? 'owner' : 'member',
          channelType: x.channelType === 'direct' ? 'direct' : 'group',
          channelName: String(x.channelName || 'Conversation'),
          joinedAt: timestampToIso(x.joinedAt),
        };
      });
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeChannelDetail(
  membership: ChannelMembershipDoc,
  onChannelMeta: (meta: Omit<ChatChannel, 'messages'> | null) => void,
  onMessages: (messages: ChatMessage[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const channelId = membership.channelId;
  const unsubMeta = onSnapshot(
    doc(db, 'channels', channelId),
    (snap) => {
      if (!snap.exists()) {
        onChannelMeta(null);
        return;
      }
      const x = snap.data();
      const type = x.type === 'direct' ? 'direct' : 'group';
      onChannelMeta({
        id: channelId,
        type,
        name: type === 'direct' ? membership.channelName : String(x.name || 'Study Group'),
        description: String(x.description || ''),
        inviteCode: typeof x.inviteCode === 'string' ? x.inviteCode : null,
        participantEmails: [],
        createdBy: String(x.createdBy || ''),
        createdAt: timestampToIso(x.createdAt),
        updatedAt: timestampToIso(x.updatedAt),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, `channels/${channelId}`);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const unsubMsgs = onSnapshot(
    query(collection(db, 'channels', channelId, 'messages'), orderBy('createdAt', 'asc')),
    (snap) => {
      const msgs: ChatMessage[] = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          senderId: String(x.senderId || ''),
          senderName: String(x.senderName || 'Student'),
          senderEmail: '',
          text: String(x.text || ''),
          attachment: (x.attachment as ChatAttachment) ?? null,
          createdAt: timestampToIso(x.createdAt),
        };
      });
      onMessages(msgs);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, `channels/${channelId}/messages`);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  return () => {
    unsubMeta();
    unsubMsgs();
  };
}

export async function startDirectChatDoc(
  currentUser: StudentUser,
  peerEmail: string,
  customLabel?: string
): Promise<{ channelId?: string; peerName?: string; error?: string }> {
  const normalizedEmail = peerEmail.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { error: 'Please enter a valid student email address.' };
  }
  if (normalizedEmail === currentUser.email.toLowerCase()) {
    return { error: 'Enter a classmate’s email address rather than your own.' };
  }

  const emailHash = await sha256Hex(normalizedEmail);
  const dirPath = `studentDirectory/${emailHash}`;
  let peerSnap;
  try {
    peerSnap = await getDoc(doc(db, 'studentDirectory', emailHash));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, dirPath);
  }

  if (!peerSnap.exists()) {
    return {
      error:
        'No verified CampusDesk account found for that email yet. Ask your classmate to sign up first!',
    };
  }

  const peer = peerSnap.data();
  const peerUid = String(peer.uid);
  const peerName = sanitizeStr(customLabel || String(peer.displayName || 'Classmate'), 120);
  const myName = sanitizeStr(currentUser.name, 120) || 'Student';
  const sortedUids = [currentUser.id, peerUid].sort();
  const channelId = `dm_${sortedUids[0]}_${sortedUids[1]}`;

  // Check if my membership already exists
  const myMemRef = doc(db, 'channelMemberships', `${channelId}__${currentUser.id}`);
  try {
    const existingMem = await getDoc(myMemRef);
    if (existingMem.exists()) {
      return { channelId, peerName };
    }
  } catch {
    // Proceed to create
  }

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'channels', channelId), {
      id: channelId,
      type: 'direct',
      name: `${myName} & ${peerName}`.slice(0, 120),
      description: 'Direct classmate chat',
      inviteCode: null,
      createdBy: currentUser.id,
      lastMessageText: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'channelMemberships', `${channelId}__${currentUser.id}`), {
      channelId,
      uid: currentUser.id,
      displayName: myName,
      role: 'owner',
      channelType: 'direct',
      channelName: peerName,
      joinedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'channelMemberships', `${channelId}__${peerUid}`), {
      channelId,
      uid: peerUid,
      displayName: peerName,
      role: 'member',
      channelType: 'direct',
      channelName: myName,
      joinedAt: serverTimestamp(),
    });
    await batch.commit();
    return { channelId, peerName };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `channels/${channelId}`);
  }
}

export async function createStudyGroupDoc(
  currentUser: StudentUser,
  name: string,
  description: string
): Promise<{ channelId: string; inviteCode: string; name: string }> {
  const channelId = generateSafeId('grp');
  const inviteCode = generateSafeCode('GRP');
  const cleanName = sanitizeStr(name, 120) || 'Study Group';
  const cleanDesc = sanitizeStr(description, 300);
  const myName = sanitizeStr(currentUser.name, 120) || 'Student';

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'channels', channelId), {
      id: channelId,
      type: 'group',
      name: cleanName,
      description: cleanDesc,
      inviteCode,
      createdBy: currentUser.id,
      lastMessageText: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'groupInvites', inviteCode), {
      code: inviteCode,
      channelId,
      channelName: cleanName,
      createdBy: currentUser.id,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'channelMemberships', `${channelId}__${currentUser.id}`), {
      channelId,
      uid: currentUser.id,
      displayName: myName,
      role: 'owner',
      channelType: 'group',
      channelName: cleanName,
      joinedAt: serverTimestamp(),
    });
    await batch.commit();
    return { channelId, inviteCode, name: cleanName };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `channels/${channelId}`);
  }
}

export async function joinStudyGroupByCodeDoc(
  currentUser: StudentUser,
  code: string
): Promise<{ channelId?: string; channelName?: string; error?: string }> {
  const normalized = code.trim().toUpperCase();
  if (!/^GRP-[A-Z0-9]{6}$/.test(normalized)) {
    return { error: 'Invite codes follow the format GRP-XXXXXX.' };
  }

  let inviteSnap;
  try {
    inviteSnap = await getDoc(doc(db, 'groupInvites', normalized));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `groupInvites/${normalized}`);
  }

  if (!inviteSnap.exists()) {
    return {
      error: 'No study group found with that invite code. Check the code and try again.',
    };
  }

  const invite = inviteSnap.data();
  const channelId = String(invite.channelId);
  const channelName = sanitizeStr(String(invite.channelName || 'Study Group'), 120);
  const membershipId = `${channelId}__${currentUser.id}`;

  try {
    const existingMem = await getDoc(doc(db, 'channelMemberships', membershipId));
    if (existingMem.exists()) {
      return { channelId, channelName };
    }
    await setDoc(doc(db, 'channelMemberships', membershipId), {
      channelId,
      uid: currentUser.id,
      displayName: sanitizeStr(currentUser.name, 120) || 'Student',
      role: 'member',
      channelType: 'group',
      channelName,
      joinedAt: serverTimestamp(),
    });
    return { channelId, channelName };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `channelMemberships/${membershipId}`);
  }
}

function sanitizeAttachment(att: ChatAttachment | null): ChatAttachment | null {
  if (!att) return null;
  if (att.kind === 'note') {
    return {
      kind: 'note',
      noteId: att.noteId.replace(/[^a-zA-Z0-9_-]/g, '') || 'note',
      title: sanitizeStr(att.title, 200) || 'Untitled Note',
      excerpt: sanitizeRawStr(att.excerpt, 300),
      tags: sanitizeTags(att.tags),
      content: sanitizeRawStr(att.content, 100000),
    };
  }
  return {
    kind: 'event',
    eventId: att.eventId.replace(/[^a-zA-Z0-9_-]/g, '') || 'evt',
    title: sanitizeStr(att.title, 180) || 'Event',
    category: att.category,
    color: sanitizeStr(att.color, 32) || '#2563EB',
    date: /^\d{4}-\d{2}-\d{2}$/.test(att.date) ? att.date : getTodayIsoDate(),
    time: sanitizeStr(att.time, 16),
    location: sanitizeStr(att.location, 160),
  };
}

export async function sendChatMessageDoc(
  currentUser: StudentUser,
  channelId: string,
  text: string,
  attachment: ChatAttachment | null = null
): Promise<void> {
  const cleanText = sanitizeStr(text, 4000);
  const cleanAttachment = sanitizeAttachment(attachment);
  if (!cleanText && !cleanAttachment) return;

  const messageId = generateSafeId('msg');
  const preview =
    cleanText ||
    (cleanAttachment?.kind === 'note'
      ? `Note: ${cleanAttachment.title}`
      : cleanAttachment?.kind === 'event'
      ? `Event: ${cleanAttachment.title}`
      : '');

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'channels', channelId, 'messages', messageId), {
      id: messageId,
      channelId,
      senderId: currentUser.id,
      senderName: sanitizeStr(currentUser.name, 120) || 'Student',
      text: cleanText,
      attachment: cleanAttachment,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'channels', channelId), {
      lastMessageText: preview.slice(0, 300),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `channels/${channelId}/messages/${messageId}`);
  }
}

export async function leaveChannelDoc(
  uid: string,
  channelId: string
): Promise<void> {
  const membershipId = `${channelId}__${uid}`;
  try {
    await deleteDoc(doc(db, 'channelMemberships', membershipId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `channelMemberships/${membershipId}`);
  }
}
