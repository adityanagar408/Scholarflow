import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Copy,
  FileText,
  Hash,
  KeyRound,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import type { ChatAttachment } from '../../types/portal';
import { EVENT_CATEGORY_META, formatShortDate } from '../../utils/portalHelpers';
import { Modal } from '../ui/Modal';

export const ChatView: React.FC = () => {
  const {
    user,
    workspace,
    channels,
    startDirectChat,
    createStudyGroup,
    joinStudyGroupByCode,
    sendChatMessage,
    leaveOrDeleteChannel,
    createNote,
    updateNote,
    addEvent,
    notify,
  } = usePortal();

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [pendingAttachment, setPendingAttachment] =
    useState<ChatAttachment | null>(null);

  // Modals
  const [directModalOpen, setDirectModalOpen] = useState(false);
  const [peerHandle, setPeerHandle] = useState('');
  const [peerName, setPeerName] = useState('');
  const [directError, setDirectError] = useState('');

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [attachTab, setAttachTab] = useState<'notes' | 'events'>('notes');

  const [previewNote, setPreviewNote] = useState<{
    title: string;
    content: string;
    tags: string[];
  } | null>(null);

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );

  const handleStartDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peerHandle.trim()) return;
    setDirectError('');
    const res = await startDirectChat(peerHandle, peerName);
    if (res.error) {
      setDirectError(res.error);
      return;
    }
    if (res.channelId) setActiveChannelId(res.channelId);
    setPeerHandle('');
    setPeerName('');
    setDirectModalOpen(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    const res = await createStudyGroup(groupName, groupDesc);
    if (res.channelId) setActiveChannelId(res.channelId);
    setGroupName('');
    setGroupDesc('');
    setGroupModalOpen(false);
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    const res = await joinStudyGroupByCode(joinCode);
    if (res.error) {
      setJoinError(res.error);
      return;
    }
    if (res.channelId) setActiveChannelId(res.channelId);
    setJoinCode('');
    setJoinModalOpen(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannel) return;
    if (!messageText.trim() && !pendingAttachment) return;
    sendChatMessage(activeChannel.id, messageText, pendingAttachment);
    setMessageText('');
    setPendingAttachment(null);
  };

  const saveSharedNoteToWorkspace = (att: Extract<ChatAttachment, { kind: 'note' }>) => {
    const note = createNote(null, att.title);
    updateNote(note.id, { content: att.content, tags: att.tags });
    notify(`Saved "${att.title}" to your Notes Hub.`, 'success');
  };

  const saveSharedEventToCalendar = (att: Extract<ChatAttachment, { kind: 'event' }>) => {
    addEvent({
      title: att.title,
      category: att.category,
      color: att.color,
      date: att.date,
      time: att.time,
      location: att.location,
      notes: 'Added from CampusDesk Chat',
      subjectId: null,
    });
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)]">
          Start a 1-on-1 classmate thread or create and join Study Group channels with invite codes.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDirectModalOpen(true)}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New 1-on-1 Chat</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setJoinError('');
              setJoinModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] whitespace-nowrap"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Join Group</span>
          </button>
          <button
            type="button"
            onClick={() => setGroupModalOpen(true)}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)] whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create Study Group</span>
          </button>
        </div>
      </div>

      {/* 2-Pane Responsive Messaging Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[560px]">
        {/* Channels Sidebar */}
        <aside
          className={`lg:col-span-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col overflow-hidden ${
            activeChannel ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="px-4 py-3 border-b border-[var(--border-hairline)] flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">
              Conversations ({channels.length})
            </span>
          </div>

          {channels.length === 0 ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-11 h-11 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-muted)] flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                No conversations yet
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)] max-w-xs">
                Message a classmate by email/username or start a study group to collaborate and share notes.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setDirectModalOpen(true)}
                  className="min-h-[38px] px-3.5 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                >
                  + Direct Chat
                </button>
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(true)}
                  className="min-h-[38px] px-3.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
                >
                  + Study Group
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)] overflow-y-auto flex-1">
              {channels.map((ch) => {
                const selected = ch.id === activeChannelId;
                const lastMsg = ch.messages[ch.messages.length - 1];
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActiveChannelId(ch.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors flex items-start gap-3 ${
                      selected
                        ? 'bg-[var(--accent-soft)]'
                        : 'hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] flex items-center justify-center shrink-0 mt-0.5">
                      {ch.type === 'group' ? (
                        <Hash className="w-4 h-4" />
                      ) : (
                        <Users className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {ch.name}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                          {ch.type === 'group' ? 'Group' : '1-on-1'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">
                        {lastMsg
                          ? lastMsg.text ||
                            (lastMsg.attachment?.kind === 'note'
                              ? `Note: ${lastMsg.attachment.title}`
                              : lastMsg.attachment?.kind === 'event'
                              ? `Event: ${lastMsg.attachment.title}`
                              : '')
                          : ch.type === 'group' && ch.inviteCode
                          ? `Invite code: ${ch.inviteCode}`
                          : ch.description || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Active Conversation Thread */}
        <section
          className={`lg:col-span-8 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col overflow-hidden ${
            activeChannel ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {!activeChannel ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-7 h-7 text-[var(--text-muted)] mb-3" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Select or start a conversation
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm">
                Attach notes or upcoming exam events directly inside your study group or classmate chats.
              </p>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="px-4 py-3 border-b border-[var(--border-hairline)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveChannelId(null)}
                    aria-label="Back to channels"
                    className="lg:hidden min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-subtle)]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {activeChannel.name}
                    </h3>
                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                      {activeChannel.type === 'group' ? (
                        <>
                          <span>Study Group</span>
                          {activeChannel.inviteCode && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">
                                Code: {activeChannel.inviteCode}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="truncate">{activeChannel.description}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeChannel.type === 'group' && activeChannel.inviteCode && (
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          activeChannel.inviteCode!
                        );
                        notify('Group invite code copied!', 'success');
                      }}
                      className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-ink)] text-xs font-medium hover:opacity-90"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Copy Code</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      leaveOrDeleteChannel(activeChannel.id);
                      setActiveChannelId(null);
                    }}
                    aria-label="Remove conversation"
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[430px] bg-[var(--bg-canvas)]/45">
                {activeChannel.messages.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs text-[var(--text-muted)]">
                      No messages yet. Say hello or attach a saved note or deadline card below.
                    </p>
                  </div>
                ) : (
                  activeChannel.messages.map((msg) => {
                    const isSelf = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isSelf ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="text-[11px] text-[var(--text-muted)] mb-1 px-1">
                          {isSelf ? 'You' : msg.senderName} ·{' '}
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div
                          className={`max-w-[85%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 text-sm ${
                            isSelf
                              ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                              : 'border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                          }`}
                        >
                          {msg.text && (
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {msg.text}
                            </p>
                          )}

                          {/* Interactive Note Attachment */}
                          {msg.attachment?.kind === 'note' && (
                            <div className="mt-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-3 text-left">
                              <div className="flex items-center gap-2 text-xs font-semibold">
                                <FileText className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                                <span className="truncate">
                                  {msg.attachment.title}
                                </span>
                              </div>
                              {msg.attachment.excerpt && (
                                <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">
                                  {msg.attachment.excerpt}
                                </p>
                              )}
                              <div className="mt-2.5 flex items-center gap-3 text-xs font-medium">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewNote({
                                      title: msg.attachment!.kind === 'note' ? msg.attachment!.title : '',
                                      content: msg.attachment!.kind === 'note' ? msg.attachment!.content : '',
                                      tags: msg.attachment!.kind === 'note' ? msg.attachment!.tags : [],
                                    })
                                  }
                                  className="text-[var(--accent)] hover:underline"
                                >
                                  Preview Note
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    msg.attachment?.kind === 'note' &&
                                    saveSharedNoteToWorkspace(msg.attachment)
                                  }
                                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                                >
                                  Save Copy
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Interactive Event Attachment */}
                          {msg.attachment?.kind === 'event' && (
                            <div className="mt-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-3 text-left">
                              <div className="flex items-center gap-2 text-xs font-semibold">
                                <Calendar
                                  className="w-3.5 h-3.5 shrink-0"
                                  style={{ color: msg.attachment.color }}
                                />
                                <span className="truncate">
                                  {msg.attachment.title}
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                                {EVENT_CATEGORY_META[msg.attachment.category].label} ·{' '}
                                {formatShortDate(msg.attachment.date)}
                                {msg.attachment.time
                                  ? ` · ${msg.attachment.time}`
                                  : ''}
                                {msg.attachment.location
                                  ? ` · ${msg.attachment.location}`
                                  : ''}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  msg.attachment?.kind === 'event' &&
                                  saveSharedEventToCalendar(msg.attachment)
                                }
                                className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline"
                              >
                                + Add to My Calendar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pending Attachment Chip */}
              {pendingAttachment && (
                <div className="px-4 py-2 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)] flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {pendingAttachment.kind === 'note' ? (
                      <FileText className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    ) : (
                      <Calendar className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    )}
                    <span className="font-medium text-[var(--text-primary)] truncate">
                      Attached {pendingAttachment.kind}: {pendingAttachment.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    aria-label="Remove attachment"
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Message Composer */}
              <form
                onSubmit={handleSend}
                className="p-3 border-t border-[var(--border-hairline)] flex items-center gap-2 bg-[var(--bg-surface)]"
              >
                <button
                  type="button"
                  onClick={() => setAttachModalOpen(true)}
                  title="Attach saved note or event"
                  aria-label="Attach note or calendar event"
                  className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  type="submit"
                  className="min-h-[42px] px-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)] shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {/* Start 1-on-1 Direct Chat Modal */}
      <Modal
        open={directModalOpen}
        onClose={() => {
          setDirectError('');
          setDirectModalOpen(false);
        }}
        title="Start 1-on-1 Chat"
        description="Enter a registered classmate's CampusDesk email to message them in real time."
        maxWidth="sm"
      >
        <form onSubmit={handleStartDirect} className="space-y-4">
          {directError && (
            <div className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">
              {directError}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Classmate Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={peerHandle}
              onChange={(e) => setPeerHandle(e.target.value)}
              placeholder="classmate@college.edu"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={peerName}
              onChange={(e) => setPeerName(e.target.value)}
              placeholder="Classmate's name"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDirectModalOpen(false)}
              className="min-h-[40px] px-4 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
            >
              Start Chat
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Study Group Modal */}
      <Modal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title="Create Study Group"
        description="Generates a shareable invite code so classmates can join."
        maxWidth="sm"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Semester 3 Algorithms Squad"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder="Exam prep, lab notes, and group assignments"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setGroupModalOpen(false)}
              className="min-h-[40px] px-4 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
            >
              Create Group
            </button>
          </div>
        </form>
      </Modal>

      {/* Join Study Group by Code Modal */}
      <Modal
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        title="Join Study Group"
        description="Enter a study group invite code (e.g. GRP-XXXXXX)."
        maxWidth="sm"
      >
        <form onSubmit={handleJoinGroup} className="space-y-4">
          {joinError && (
            <div className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">
              {joinError}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Group Invite Code
            </label>
            <input
              type="text"
              required
              autoFocus
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="GRP-XXXXXX"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 font-mono text-sm uppercase text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setJoinModalOpen(false)}
              className="min-h-[40px] px-4 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
            >
              Join Group
            </button>
          </div>
        </form>
      </Modal>

      {/* Attach Note or Event Modal */}
      <Modal
        open={attachModalOpen}
        onClose={() => setAttachModalOpen(false)}
        title="Attach Note or Event"
        description="Choose a saved note or calendar event to preview inside your message."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--bg-subtle)]">
            <button
              type="button"
              onClick={() => setAttachTab('notes')}
              className={`min-h-[36px] rounded-lg text-xs font-medium ${
                attachTab === 'notes'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              Saved Notes ({workspace.notes.length})
            </button>
            <button
              type="button"
              onClick={() => setAttachTab('events')}
              className={`min-h-[36px] rounded-lg text-xs font-medium ${
                attachTab === 'events'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              Calendar Events ({workspace.events.length})
            </button>
          </div>

          {attachTab === 'notes' ? (
            workspace.notes.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                No saved notes yet. Create a note in the Notes Hub first.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {workspace.notes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setPendingAttachment({
                        kind: 'note',
                        noteId: n.id,
                        title: n.title,
                        excerpt: n.content.slice(0, 140),
                        tags: n.tags,
                        content: n.content,
                      });
                      setAttachModalOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      {n.title}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)] line-clamp-1">
                      {n.content.trim() || 'Empty note'}
                    </p>
                  </button>
                ))}
              </div>
            )
          ) : workspace.events.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--text-muted)]">
              No scheduled events yet. Add an event in the Calendar first.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {workspace.events.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    setPendingAttachment({
                      kind: 'event',
                      eventId: ev.id,
                      title: ev.title,
                      category: ev.category,
                      color: ev.color,
                      date: ev.date,
                      time: ev.time,
                      location: ev.location,
                    });
                    setAttachModalOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ev.color }}
                    />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {ev.title}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {EVENT_CATEGORY_META[ev.category].label} ·{' '}
                    {formatShortDate(ev.date)} {ev.time}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Preview Shared Note Modal */}
      <Modal
        open={!!previewNote}
        onClose={() => setPreviewNote(null)}
        title={previewNote?.title || 'Shared Note'}
      >
        {previewNote && (
          <div className="space-y-3">
            {previewNote.tags.length > 0 && (
              <div className="text-xs text-[var(--accent-ink)]">
                {previewNote.tags.map((t) => `#${t}`).join('  ')}
              </div>
            )}
            <pre className="whitespace-pre-wrap font-[var(--font-sans)] text-sm leading-relaxed text-[var(--text-secondary)]">
              {previewNote.content || 'Empty note'}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
};
