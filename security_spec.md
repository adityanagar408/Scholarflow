# CampusDesk Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Verified Identity**: Every Firestore read and write requires `request.auth != null && request.auth.token.email_verified == true`.
2. **PII Isolation**: `/users/{userId}` holds private email/profile fields and is strictly owner-only (`get/create/update/delete` for `userId == request.auth.uid`, `list: false`). Non-PII classmate resolution uses `/studentDirectory/{sha256Hex(email)}` (`get` only, `list: false`, zero raw email stored).
3. **Private Workspace Ownership**: Every subcollection under `/users/{userId}/*` enforces `userId == request.auth.uid`, `ownerId == request.auth.uid`, immutable `ownerId`/`createdAt`, and `resource.data.ownerId == request.auth.uid` on `list`.
4. **Master Gate for Real-Time Chat**: Access to `/channels/{channelId}` and `/channels/{channelId}/messages/{messageId}` strictly requires an active membership document at `/channelMemberships/{channelId}__{request.auth.uid}`. Leaving a channel deletes the membership document and synchronously revokes message access.
5. **Atomicity Guarantee**: Creating a chat message requires `getAfter(/databases/$(database)/documents/channels/$(channelId)).data.updatedAt == request.time` so channel metadata and message writes happen in an atomic batch.
6. **Temporal Integrity**: All `createdAt` (on create) and `updatedAt` (on create/update) fields must equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unverified Email Write**: Creating `/users/{uid}` when `request.auth.token.email_verified == false`.
2. **PII Snooping (Cross-User Read)**: User B calling `get` on `/users/{userA}`.
3. **Directory Scraping**: Any user calling `list` on `/studentDirectory` or `/sharedNotes` or `/groupInvites`.
4. **Shadow Field Injection**: Updating `/users/{uid}` with an unlisted ghost field `{ name: "Alice", isAdmin: true, updatedAt: serverTimestamp() }`.
5. **Identity Spoofing on Note Create**: User A writing `/users/{userA}/notes/{id}` with `ownerId: userB`.
6. **Immutable Field Tampering**: Updating a note's `createdAt` or `ownerId`.
7. **Timestamp Forgery**: Creating a subject with client-supplied `createdAt: new Date(2020, 0, 1)` instead of `serverTimestamp()`.
8. **ID Poisoning**: Creating a document with a 200-character or special-character document ID (`../../evil`).
9. **Array / Tag Flooding**: Creating a note with 25 tags (exceeding `MAX_TAGS = 15`) or non-string tag elements.
10. **Unauthorized Chat Eavesdropping**: User C (non-member) reading `/channels/{dmAB}/messages/{msgId}`.
11. **Chat Sender Spoofing**: Member A writing a message in `/channels/{grp}` with `senderId: userB`.
12. **Orphaned Non-Atomic Chat Message**: Writing a message to `/channels/{grp}/messages/{msgId}` without atomically updating `/channels/{grp}.updatedAt` in the same batch.
