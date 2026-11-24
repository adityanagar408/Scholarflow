/**
 * Phase 0 Security Rules Verification Suite (Dirty Dozen Adversarial Payloads)
 * Designed for @firebase/rules-unit-testing against the Firebase Firestore Emulator.
 * Every case below asserts PERMISSION_DENIED against firestore.rules.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  actorUid: string;
  emailVerified: boolean;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unverified Email Profile Create',
    actorUid: 'student_a',
    emailVerified: false,
    operation: 'create',
    path: 'users/student_a',
    payload: { uid: 'student_a', name: 'Alice', email: 'alice@college.edu' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-User PII Profile Read',
    actorUid: 'student_b',
    emailVerified: true,
    operation: 'get',
    path: 'users/student_a',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Student Directory Scraping (List)',
    actorUid: 'student_a',
    emailVerified: true,
    operation: 'list',
    path: 'studentDirectory',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Profile Update',
    actorUid: 'student_a',
    emailVerified: true,
    operation: 'update',
    path: 'users/student_a',
    payload: { name: 'Alice', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Owner Identity Spoofing on Note Create',
    actorUid: 'student_a',
    emailVerified: true,
    operation: 'create',
    path: 'users/student_a/notes/note_1',
    payload: { id: 'note_1', ownerId: 'student_b', title: 'Spoofed', content: '', tags: [], isFavorite: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Immutable createdAt Tampering on Note Update',
    actorUid: 'student_a',
    emailVerified: true,
    operation: 'update',
    path: 'users/student_a/notes/note_1',
    payload: { title: 'Edited', createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Client-Forged Timestamp on Subject Create',
    actorUid: 'student_a',
    emailVerified: true,
    operation: 'create',
    path: 'users/student_a/subjects/sub_1',
    payload: { id: 'sub_1', ownerId: 'student_a', name: 'Algorithms', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Path Variable ID Poisoning',
    actorUid: 'student_a',
    emailVerified: true,
    operation: 'create',
    path: 'users/student_a/folders/bad$id..with..chars',
    payload: { id: 'bad$id..with..chars', ownerId: 'student_a', name: 'Evil' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unbounded Tag Array Flooding (>15 tags)',
    actorUid: 'student_a',
    emailVerified: true,
    operation: 'create',
    path: 'users/student_a/notes/note_flood',
    payload: {
      id: 'note_flood',
      ownerId: 'student_a',
      title: 'Flood',
      content: '',
      tags: Array.from({ length: 20 }, (_, i) => `t${i}`),
      isFavorite: false,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Non-Member Chat Message Eavesdropping',
    actorUid: 'student_c',
    emailVerified: true,
    operation: 'get',
    path: 'channels/dm_student_a_student_b/messages/msg_1',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Chat Message Sender Spoofing',
    actorUid: 'student_a',
    emailVerified: true,
    operation: 'create',
    path: 'channels/grp_1/messages/msg_spoof',
    payload: { id: 'msg_spoof', channelId: 'grp_1', senderId: 'student_b', senderName: 'Bob', text: 'Fake' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Non-Atomic Chat Message Write (Missing Channel Timestamp Sync)',
    actorUid: 'student_a',
    emailVerified: true,
    operation: 'create',
    path: 'channels/grp_1/messages/msg_orphan',
    payload: { id: 'msg_orphan', channelId: 'grp_1', senderId: 'student_a', senderName: 'Alice', text: 'Orphan' },
    expected: 'PERMISSION_DENIED',
  },
];
