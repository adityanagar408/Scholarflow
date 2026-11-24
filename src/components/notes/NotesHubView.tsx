import React, { useMemo, useRef, useState } from 'react';
import {
  Bold,
  CheckSquare,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Eye,
  FileText,
  Folder,
  FolderPlus,
  Heading1,
  Heading2,
  Import,
  Italic,
  List,
  Plus,
  Quote,
  Search,
  Send,
  Share2,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import type { NoteFolder, NoteItem } from '../../types/portal';
import { Modal } from '../ui/Modal';

type FolderFilter = 'all' | 'favorites' | 'unfiled' | string;

/** Safe React Markdown-lite Renderer (no dangerouslySetInnerHTML) */
const NotePreview: React.FC<{ content: string }> = ({ content }) => {
  if (!content.trim()) {
    return (
      <p className="text-sm text-[var(--text-muted)] italic">
        Nothing written yet. Switch to Edit mode to start taking notes.
      </p>
    );
  }

  const renderInline = (text: string) => {
    const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return tokens.map((token, idx) => {
      if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
        return (
          <strong key={idx} className="font-semibold text-[var(--text-primary)]">
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
        return (
          <em key={idx} className="italic">
            {token.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={idx}>{token}</React.Fragment>;
    });
  };

  const lines = content.split('\n');
  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return (
            <h2
              key={i}
              className="text-xl font-bold text-[var(--text-primary)] pt-2"
            >
              {renderInline(line.slice(2))}
            </h2>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3
              key={i}
              className="text-base font-semibold text-[var(--text-primary)] pt-1.5"
            >
              {renderInline(line.slice(3))}
            </h3>
          );
        }
        if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="font-mono text-xs text-[var(--success)] mt-0.5">
                [✓]
              </span>
              <span className="line-through text-[var(--text-muted)]">
                {renderInline(line.slice(6))}
              </span>
            </div>
          );
        }
        if (line.startsWith('- [ ] ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="font-mono text-xs text-[var(--text-muted)] mt-0.5">
                [ ]
              </span>
              <span>{renderInline(line.slice(6))}</span>
            </div>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-[var(--accent)]">•</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        if (line.startsWith('> ')) {
          return (
            <blockquote
              key={i}
              className="rounded-lg bg-[var(--bg-subtle)] px-3.5 py-2 text-sm italic text-[var(--text-secondary)]"
            >
              {renderInline(line.slice(2))}
            </blockquote>
          );
        }
        if (line.trim() === '---') {
          return <hr key={i} className="border-[var(--border-hairline)] my-3" />;
        }
        if (!line.trim()) {
          return <div key={i} className="h-2" />;
        }
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
};

export const NotesHubView: React.FC = () => {
  const {
    workspace,
    channels,
    createFolder,
    renameFolder,
    deleteFolder,
    createNote,
    updateNote,
    deleteNote,
    generateNoteShareCode,
    importSharedNote,
    sendChatMessage,
    setActiveSection,
    notify,
  } = usePortal();

  const [selectedFilter, setSelectedFilter] = useState<FolderFilter>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
  const [tagDraft, setTagDraft] = useState('');

  // Folder Modal
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'rename'>('create');
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderParentId, setFolderParentId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<NoteFolder | null>(null);

  // Share Modal & Import Modal
  const [shareModalNote, setShareModalNote] = useState<NoteItem | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState('');
  const [importError, setImportError] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeNote = useMemo(
    () => workspace.notes.find((n) => n.id === selectedNoteId) ?? null,
    [workspace.notes, selectedNoteId]
  );

  // Get descendant folder IDs for filtering parent folders cleanly
  const getFolderBranchIds = (rootId: string): Set<string> => {
    const ids = new Set<string>([rootId]);
    let added = true;
    while (added) {
      added = false;
      for (const f of workspace.folders) {
        if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
          ids.add(f.id);
          added = true;
        }
      }
    }
    return ids;
  };

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return workspace.notes
      .filter((note) => {
        if (selectedFilter === 'favorites' && !note.isFavorite) return false;
        if (selectedFilter === 'unfiled' && note.folderId !== null) return false;
        if (
          selectedFilter !== 'all' &&
          selectedFilter !== 'favorites' &&
          selectedFilter !== 'unfiled'
        ) {
          const branch = getFolderBranchIds(selectedFilter);
          if (!note.folderId || !branch.has(note.folderId)) return false;
        }
        if (!q) return true;
        return (
          note.title.toLowerCase().includes(q) ||
          note.content.toLowerCase().includes(q) ||
          note.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [workspace.notes, workspace.folders, selectedFilter, searchQuery]);

  const handleNewNote = () => {
    const targetFolderId =
      selectedFilter !== 'all' &&
      selectedFilter !== 'favorites' &&
      selectedFilter !== 'unfiled'
        ? selectedFilter
        : null;
    const created = createNote(targetFolderId);
    setSelectedNoteId(created.id);
    setEditorMode('edit');
  };

  const openCreateFolderModal = (parentId: string | null = null) => {
    setFolderModalMode('create');
    setFolderParentId(parentId);
    setEditingFolderId(null);
    setFolderNameInput('');
    setFolderModalOpen(true);
  };

  const openRenameFolderModal = (folder: NoteFolder) => {
    setFolderModalMode('rename');
    setEditingFolderId(folder.id);
    setFolderParentId(folder.parentId);
    setFolderNameInput(folder.name);
    setFolderModalOpen(true);
  };

  const handleSaveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;
    if (folderModalMode === 'create') {
      const created = createFolder(folderNameInput, folderParentId);
      setSelectedFilter(created.id);
    } else if (editingFolderId) {
      renameFolder(editingFolderId, folderNameInput);
    }
    setFolderModalOpen(false);
  };

  const insertFormatting = (prefix: string, suffix = '') => {
    if (!activeNote || !textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = activeNote.content.slice(start, end);
    const replacement = `${prefix}${selectedText}${suffix}`;
    const updated =
      activeNote.content.slice(0, start) +
      replacement +
      activeNote.content.slice(end);
    updateNote(activeNote.id, { content: updated });
    window.requestAnimationFrame(() => {
      el.focus();
      const cursor = start + prefix.length + selectedText.length + suffix.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNote) return;
    const clean = tagDraft.trim().replace(/^#/, '').toLowerCase();
    if (!clean) return;
    if (!activeNote.tags.includes(clean)) {
      updateNote(activeNote.id, { tags: [...activeNote.tags, clean] });
    }
    setTagDraft('');
  };

  const handleCopyNote = async () => {
    if (!activeNote) return;
    const payload = `# ${activeNote.title}\n\n${activeNote.content}`;
    try {
      await navigator.clipboard.writeText(payload);
      notify('Note copied to clipboard.', 'success');
    } catch {
      notify('Unable to copy automatically — please select and copy.', 'error');
    }
  };

  const handleExportNote = () => {
    if (!activeNote) return;
    const markdown = `# ${activeNote.title}\n${
      activeNote.tags.length > 0
        ? `Tags: ${activeNote.tags.map((t) => `#${t}`).join(' ')}\n`
        : ''
    }\n${activeNote.content}`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName =
      activeNote.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'note';
    a.download = `${safeName}.md`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported note as Markdown.', 'success');
  };

  const openShareModal = async (note: NoteItem) => {
    setShareModalNote(note);
    setGeneratedCode(note.shareCode);
    const code = await generateNoteShareCode(note.id);
    if (code) {
      setGeneratedCode(code);
    }
  };

  const handleSendNoteToChannel = (channelId: string) => {
    if (!shareModalNote) return;
    sendChatMessage(channelId, `Shared a note: ${shareModalNote.title}`, {
      kind: 'note',
      noteId: shareModalNote.id,
      title: shareModalNote.title,
      excerpt: shareModalNote.content.slice(0, 140),
      tags: shareModalNote.tags,
      content: shareModalNote.content,
    });
    setShareModalNote(null);
    notify('Note sent to chat!', 'success');
    setActiveSection('chat');
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    const res = await importSharedNote(importCodeInput);
    if (res.error) {
      setImportError(res.error);
      return;
    }
    if (res.note) {
      setSelectedNoteId(res.note.id);
      setSelectedFilter('all');
    }
    setImportCodeInput('');
    setImportModalOpen(false);
  };

  const renderFolderTree = (parentId: string | null, depth = 0) => {
    const children = workspace.folders.filter((f) => f.parentId === parentId);
    return children.map((folder) => {
      const active = selectedFilter === folder.id;
      const count = workspace.notes.filter((n) => n.folderId === folder.id).length;
      return (
        <div key={folder.id}>
          <div
            className={`group flex items-center justify-between gap-1 rounded-lg pr-1 transition-colors ${
              active
                ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
          >
            <button
              type="button"
              onClick={() => setSelectedFilter(folder.id)}
              className="flex-1 flex items-center gap-2 min-h-[36px] text-left text-xs font-medium min-w-0"
            >
              {depth > 0 && (
                <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
              )}
              <Folder className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{folder.name}</span>
              <span className="ml-auto font-mono text-[11px] tabular-nums opacity-70 pr-1">
                {count}
              </span>
            </button>
            <div className="flex items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => openCreateFolderModal(folder.id)}
                title="Add subfolder"
                aria-label={`Add subfolder inside ${folder.name}`}
                className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => openRenameFolderModal(folder)}
                title="Rename folder"
                aria-label={`Rename ${folder.name}`}
                className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setDeletingFolder(folder)}
                title="Delete folder"
                aria-label={`Delete ${folder.name}`}
                className="p-1 rounded hover:bg-[var(--danger-soft)] text-[var(--text-muted)] hover:text-[var(--danger)]"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          {renderFolderTree(folder.id, depth + 1)}
        </div>
      );
    });
  };

  const shareLink = generatedCode
    ? `${window.location.origin}${window.location.pathname}?importNote=${generatedCode}`
    : '';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title, content, or tag..."
            className="w-full min-h-[42px] pl-10 pr-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setImportError('');
              setImportModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors whitespace-nowrap"
          >
            <Import className="w-3.5 h-3.5" />
            <span>Import Code</span>
          </button>
          <button
            type="button"
            onClick={() => openCreateFolderModal(null)}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
          <button
            type="button"
            onClick={handleNewNote}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* 3-Column Responsive Notes Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[560px]">
        {/* Left Folder Tree */}
        <aside className="lg:col-span-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 flex flex-col">
          <div className="flex items-center justify-between px-2 pb-2.5 border-b border-[var(--border-hairline)]">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Folders
            </span>
            <button
              type="button"
              onClick={() => openCreateFolderModal(null)}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              + New Folder
            </button>
          </div>

          <div className="mt-2.5 space-y-1">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`w-full flex items-center justify-between min-h-[36px] px-2.5 rounded-lg text-xs font-medium transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                All Notes
              </span>
              <span className="font-mono text-[11px] tabular-nums">
                {workspace.notes.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('favorites')}
              className={`w-full flex items-center justify-between min-h-[36px] px-2.5 rounded-lg text-xs font-medium transition-colors ${
                selectedFilter === 'favorites'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5" />
                Pinned Favorites
              </span>
              <span className="font-mono text-[11px] tabular-nums">
                {workspace.notes.filter((n) => n.isFavorite).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('unfiled')}
              className={`w-full flex items-center justify-between min-h-[36px] px-2.5 rounded-lg text-xs font-medium transition-colors ${
                selectedFilter === 'unfiled'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Folder className="w-3.5 h-3.5" />
                Unfiled
              </span>
              <span className="font-mono text-[11px] tabular-nums">
                {workspace.notes.filter((n) => n.folderId === null).length}
              </span>
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-hairline)] flex-1">
            {workspace.folders.length === 0 ? (
              <div className="px-2 py-4 text-center">
                <p className="text-xs text-[var(--text-muted)]">
                  No custom folders yet. Create folders and subfolders by subject or semester.
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">{renderFolderTree(null, 0)}</div>
            )}
          </div>
        </aside>

        {/* Middle Notes List */}
        <section className="lg:col-span-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-hairline)] flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">
              Notes ({filteredNotes.length})
            </span>
            <button
              type="button"
              onClick={handleNewNote}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              + Create
            </button>
          </div>

          {filteredNotes.length === 0 ? (
            <div className="p-6 text-center flex-1 flex flex-col items-center justify-center">
              <FileText className="w-6 h-6 text-[var(--text-muted)] mb-2" />
              <p className="text-xs font-medium text-[var(--text-primary)]">
                {searchQuery ? 'No matching notes' : 'No notes in this view'}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {searchQuery
                  ? 'Try another search term or tag.'
                  : 'Create your first note to start organizing lecture highlights.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={handleNewNote}
                  className="mt-3 inline-flex items-center gap-1 min-h-[36px] px-3.5 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Note</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)] overflow-y-auto max-h-[320px] lg:max-h-[600px]">
              {filteredNotes.map((note) => {
                const selected = note.id === selectedNoteId;
                const folderName = workspace.folders.find(
                  (f) => f.id === note.folderId
                )?.name;
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${
                      selected
                        ? 'bg-[var(--accent-soft)]'
                        : 'hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {note.title || 'Untitled Note'}
                      </h4>
                      {note.isFavorite && (
                        <Star className="w-3.5 h-3.5 fill-[var(--warning)] text-[var(--warning)] shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">
                      {note.content.trim() || 'Empty note...'}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] truncate">
                      <span>{folderName || 'Unfiled'}</span>
                      {note.tags.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">
                            {note.tags.map((t) => `#${t}`).join(' ')}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Clean Note Editor */}
        <section className="lg:col-span-6 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col overflow-hidden">
          {!activeNote ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] text-[var(--text-muted)] flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Select or create a note
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm">
                Write structured lecture notes with headings, bullet points, checklists, tags, and share them with classmates in one click.
              </p>
              <button
                type="button"
                onClick={handleNewNote}
                className="mt-4 inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)]"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Note</span>
              </button>
            </div>
          ) : (
            <>
              {/* Editor Top Actions */}
              <div className="px-4 py-3 border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Move note to folder"
                    value={activeNote.folderId ?? ''}
                    onChange={(e) =>
                      updateNote(activeNote.id, {
                        folderId: e.target.value || null,
                      })
                    }
                    className="min-h-[34px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    <option value="">Unfiled</option>
                    {workspace.folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex rounded-lg bg-[var(--bg-subtle)] p-0.5">
                    <button
                      type="button"
                      onClick={() => setEditorMode('edit')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        editorMode === 'edit'
                          ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('preview')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                        editorMode === 'preview'
                          ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateNote(activeNote.id, {
                        isFavorite: !activeNote.isFavorite,
                      })
                    }
                    title={
                      activeNote.isFavorite
                        ? 'Unpin from favorites'
                        : 'Pin to favorites'
                    }
                    aria-label="Toggle favorite"
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-subtle)]"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        activeNote.isFavorite
                          ? 'fill-[var(--warning)] text-[var(--warning)]'
                          : 'text-[var(--text-muted)]'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => openShareModal(activeNote)}
                    title="Share note"
                    className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-ink)] text-xs font-medium hover:opacity-90"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyNote}
                    title="Copy note"
                    aria-label="Copy note to clipboard"
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleExportNote}
                    title="Export Markdown"
                    aria-label="Export note as Markdown"
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteNote(activeNote.id);
                      setSelectedNoteId(null);
                    }}
                    title="Delete note"
                    aria-label="Delete note"
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title & Tags */}
              <div className="px-5 pt-4 pb-3 border-b border-[var(--border-hairline)] space-y-2.5">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) =>
                    updateNote(activeNote.id, { title: e.target.value })
                  }
                  placeholder="Note title..."
                  className="w-full text-xl font-bold font-[var(--font-display)] bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                />

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                  {activeNote.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-[var(--accent-ink)] font-medium"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() =>
                          updateNote(activeNote.id, {
                            tags: activeNote.tags.filter((t) => t !== tag),
                          })
                        }
                        aria-label={`Remove tag ${tag}`}
                        className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  <form onSubmit={handleAddTag} className="inline-flex items-center">
                    <input
                      type="text"
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      placeholder="+ add tag (Enter)"
                      className="w-32 bg-transparent text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                    />
                  </form>
                </div>
              </div>

              {/* Formatting Bar (Edit Mode) */}
              {editorMode === 'edit' && (
                <div className="px-4 py-2 border-b border-[var(--border-hairline)] flex flex-wrap items-center gap-1 bg-[var(--bg-canvas)]/60">
                  <button
                    type="button"
                    onClick={() => insertFormatting('# ')}
                    title="Heading 1"
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <Heading1 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('## ')}
                    title="Heading 2"
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('- ')}
                    title="Bullet list"
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('- [ ] ')}
                    title="Checklist item"
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    title="Bold"
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    title="Italic"
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('> ')}
                    title="Quote"
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Editor Canvas / Preview */}
              <div className="flex-1 p-5 overflow-y-auto">
                {editorMode === 'edit' ? (
                  <textarea
                    ref={textareaRef}
                    value={activeNote.content}
                    onChange={(e) =>
                      updateNote(activeNote.id, { content: e.target.value })
                    }
                    placeholder="Start writing your notes... Use # for headings, - for bullets, or - [ ] for checklists."
                    className="w-full min-h-[340px] h-full resize-none bg-transparent text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                  />
                ) : (
                  <NotePreview content={activeNote.content} />
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Create / Rename Folder Modal */}
      <Modal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        title={
          folderModalMode === 'create'
            ? folderParentId
              ? 'Create Subfolder'
              : 'Create Folder'
            : 'Rename Folder'
        }
        maxWidth="sm"
      >
        <form onSubmit={handleSaveFolder} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Folder Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={folderNameInput}
              onChange={(e) => setFolderNameInput(e.target.value)}
              placeholder="e.g. Semester 4 · Operating Systems"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setFolderModalOpen(false)}
              className="min-h-[40px] px-4 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
            >
              {folderModalMode === 'create' ? 'Create Folder' : 'Save Name'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Folder Confirmation */}
      <Modal
        open={!!deletingFolder}
        onClose={() => setDeletingFolder(null)}
        title="Delete Folder"
        maxWidth="sm"
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Delete folder{' '}
          <strong className="text-[var(--text-primary)]">
            {deletingFolder?.name}
          </strong>{' '}
          and any nested subfolders? Notes inside will safely move to{' '}
          <strong className="text-[var(--text-primary)]">Unfiled</strong>.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeletingFolder(null)}
            className="min-h-[40px] px-4 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (deletingFolder) {
                deleteFolder(deletingFolder.id);
                if (selectedFilter === deletingFolder.id) {
                  setSelectedFilter('all');
                }
              }
              setDeletingFolder(null);
            }}
            className="min-h-[40px] px-4 rounded-xl bg-[var(--danger)] text-white text-xs font-semibold"
          >
            Delete Folder
          </button>
        </div>
      </Modal>

      {/* Share Note Modal */}
      <Modal
        open={!!shareModalNote}
        onClose={() => setShareModalNote(null)}
        title="Share Note"
        description="Copy a shareable code/link or send directly into a classmate chat or study group."
      >
        <div className="space-y-5">
          {generatedCode && (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Shareable Note Code
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-h-[42px] flex items-center px-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] font-mono text-sm font-semibold tracking-wider text-[var(--text-primary)]">
                    {generatedCode}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(generatedCode);
                      notify('Share code copied!', 'success');
                    }}
                    className="min-h-[42px] px-3.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)]"
                  >
                    Copy Code
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Direct Import Link
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 min-h-[40px] px-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-xs text-[var(--text-muted)] truncate"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(shareLink);
                      notify('Share link copied!', 'success');
                    }}
                    className="min-h-[40px] px-3.5 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border-hairline)]">
            <div className="text-xs font-semibold text-[var(--text-primary)] mb-2">
              Send directly to Chat or Study Group
            </div>
            {channels.length === 0 ? (
              <div className="rounded-xl bg-[var(--bg-subtle)] p-4 text-xs text-[var(--text-muted)] flex items-center justify-between gap-3">
                <span>You haven't started any chats or study groups yet.</span>
                <button
                  type="button"
                  onClick={() => {
                    setShareModalNote(null);
                    setActiveSection('chat');
                  }}
                  className="font-semibold text-[var(--accent)] whitespace-nowrap hover:underline"
                >
                  Open Chat
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
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
                        {ch.type === 'group' ? 'Study Group' : 'Direct Message'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendNoteToChannel(ch.id)}
                      className="inline-flex items-center gap-1.5 min-h-[34px] px-3 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-ink)] text-xs font-medium hover:opacity-90 shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Import Note by Code Modal */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Shared Note"
        description="Paste a CampusDesk note code (e.g. NOTE-XXXXXX) shared by a classmate."
        maxWidth="sm"
      >
        <form onSubmit={handleImportSubmit} className="space-y-4">
          {importError && (
            <div className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">
              {importError}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Share Code
            </label>
            <input
              type="text"
              required
              autoFocus
              value={importCodeInput}
              onChange={(e) => setImportCodeInput(e.target.value.toUpperCase())}
              placeholder="NOTE-XXXXXX"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 font-mono text-sm uppercase text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setImportModalOpen(false)}
              className="min-h-[40px] px-4 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
            >
              Import Note
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
