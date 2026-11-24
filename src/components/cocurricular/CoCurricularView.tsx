import React, { useMemo, useState } from 'react';
import { Award, Edit3, Medal, Plus, Trash2 } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import type {
  ActivityType,
  CoCurricularCategory,
  CoCurricularLog,
} from '../../types/portal';
import { formatShortDate, getTodayIsoDate } from '../../utils/portalHelpers';
import { Modal } from '../ui/Modal';

const CATEGORIES: CoCurricularCategory[] = [
  'NCC',
  'NSS',
  'Sports',
  'Cultural Clubs',
  'Hackathons',
  'Other',
];

const ACTIVITY_TYPES: ActivityType[] = [
  'Drill',
  'Camp',
  'Tournament',
  'Workshop',
  'Volunteering',
  'Competition',
  'Event',
];

export const CoCurricularView: React.FC = () => {
  const {
    workspace,
    addCoCurricularLog,
    updateCoCurricularLog,
    deleteCoCurricularLog,
  } = usePortal();

  const [filterCategory, setFilterCategory] = useState<'All' | CoCurricularCategory>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<CoCurricularLog | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CoCurricularCategory>('NCC');
  const [type, setType] = useState<ActivityType>('Drill');
  const [date, setDate] = useState(getTodayIsoDate());
  const [hours, setHours] = useState('2');
  const [role, setRole] = useState('');
  const [certificateTitle, setCertificateTitle] = useState('');
  const [notes, setNotes] = useState('');

  const academicHours = useMemo(
    () =>
      workspace.studySessions.reduce((sum, s) => sum + s.durationMinutes, 0) /
      60,
    [workspace.studySessions]
  );

  const coCurricularHours = useMemo(
    () => workspace.coCurricularLogs.reduce((sum, c) => sum + c.hours, 0),
    [workspace.coCurricularLogs]
  );

  const totalHours = academicHours + coCurricularHours;
  const academicPct =
    totalHours > 0 ? Math.round((academicHours / totalHours) * 100) : 0;
  const coCurricularPct = totalHours > 0 ? 100 - academicPct : 0;

  const filteredLogs = useMemo(() => {
    if (filterCategory === 'All') return workspace.coCurricularLogs;
    return workspace.coCurricularLogs.filter(
      (log) => log.category === filterCategory
    );
  }, [workspace.coCurricularLogs, filterCategory]);

  const certificates = useMemo(
    () =>
      workspace.coCurricularLogs.filter(
        (log) => log.certificateTitle.trim().length > 0
      ),
    [workspace.coCurricularLogs]
  );

  const openAddModal = () => {
    setEditingLog(null);
    setTitle('');
    setCategory('NCC');
    setType('Drill');
    setDate(getTodayIsoDate());
    setHours('2');
    setRole('');
    setCertificateTitle('');
    setNotes('');
    setModalOpen(true);
  };

  const openEditModal = (entry: CoCurricularLog) => {
    setEditingLog(entry);
    setTitle(entry.title);
    setCategory(entry.category);
    setType(entry.type);
    setDate(entry.date);
    setHours(String(entry.hours));
    setRole(entry.role);
    setCertificateTitle(entry.certificateTitle);
    setNotes(entry.notes);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      category,
      type,
      date,
      hours: Math.max(0.5, Number(hours) || 1),
      role: role.trim(),
      certificateTitle: certificateTitle.trim(),
      notes: notes.trim(),
    };
    if (editingLog) {
      updateCoCurricularLog(editingLog.id, payload);
    } else {
      addCoCurricularLog(payload);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Co-Curricular &amp; Campus Activities
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Log drills, camps, tournaments, volunteering, club roles, hackathons, and earned certificates.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)] whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Log Activity</span>
        </button>
      </div>

      {/* Dynamic Balance Meter & Summary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-7 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Dynamic Balance Meter: Academics vs. Co-Curricular
            </h3>
            <span className="font-mono tabular-nums text-xs text-[var(--text-muted)]">
              {totalHours.toFixed(1)} h total
            </span>
          </div>

          <div className="h-3.5 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden flex">
            {totalHours > 0 && (
              <>
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${academicPct}%` }}
                />
                <div
                  className="h-full bg-[var(--success)] transition-all duration-300"
                  style={{ width: `${coCurricularPct}%` }}
                />
              </>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[var(--text-muted)]">Academic Study</div>
              <div className="mt-0.5 font-mono tabular-nums text-base font-semibold text-[var(--text-primary)]">
                {academicHours.toFixed(1)} h{' '}
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  ({academicPct}%)
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[var(--text-muted)]">Co-Curricular</div>
              <div className="mt-0.5 font-mono tabular-nums text-base font-semibold text-[var(--text-primary)]">
                {coCurricularHours.toFixed(1)} h{' '}
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  ({coCurricularPct}%)
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 grid grid-cols-3 gap-3 items-center">
          <div>
            <div className="text-xs text-[var(--text-muted)]">Activities</div>
            <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-[var(--text-primary)]">
              {workspace.coCurricularLogs.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Hours</div>
            <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-[var(--text-primary)]">
              {coCurricularHours.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Certificates</div>
            <div className="mt-1 font-mono tabular-nums text-2xl font-semibold text-[var(--text-primary)]">
              {certificates.length}
            </div>
          </div>
        </section>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(['All', ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCategory(cat)}
            className={`min-h-[36px] px-3.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              filterCategory === cat
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                : 'border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Logs + Certificates Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <section className="xl:col-span-8 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] pb-3.5 border-b border-[var(--border-hairline)]">
            Participation Log ({filteredLogs.length})
          </h3>

          {filteredLogs.length === 0 ? (
            <div className="py-10 text-center">
              <Award className="w-6 h-6 mx-auto text-[var(--text-muted)] mb-2" />
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                No activities logged yet
              </h4>
              <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Record your NCC parades, NSS camps, sports tournaments, cultural club events, or hackathons.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Log First Activity</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {filteredLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="py-4 first:pt-4 last:pb-0 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      {entry.title}
                    </h4>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--text-muted)] tabular-nums">
                      <span className="font-medium text-[var(--accent-ink)]">
                        {entry.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.type}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatShortDate(entry.date)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{entry.hours} h</span>
                      {entry.role && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{entry.role}</span>
                        </>
                      )}
                    </div>
                    {entry.certificateTitle && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--success)]">
                        <Medal className="w-3.5 h-3.5 shrink-0" />
                        <span>Certificate: {entry.certificateTitle}</span>
                      </div>
                    )}
                    {entry.notes && (
                      <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                        {entry.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(entry)}
                      aria-label={`Edit ${entry.title}`}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCoCurricularLog(entry.id)}
                      aria-label={`Delete ${entry.title}`}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Certificates Vault */}
        <aside className="xl:col-span-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] pb-3.5 border-b border-[var(--border-hairline)]">
            Certificates &amp; Awards ({certificates.length})
          </h3>
          {certificates.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">
              Certificates you attach to logged activities will appear here for quick portfolio reference.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {certificates.map((cert) => (
                <div key={cert.id} className="py-3.5 first:pt-4 last:pb-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {cert.certificateTitle}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {cert.category} · {cert.title} · {formatShortDate(cert.date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Add / Edit Co-Curricular Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLog ? 'Edit Activity Log' : 'Log Co-Curricular Activity'}
        description="Record participation across NCC, NSS, Sports, Cultural Clubs, and Hackathons."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Activity Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Training Camp or Inter-College Hackathon"
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Wing / Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as CoCurricularCategory)
                }
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Activity Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ActivityType)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Hours Spent
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="200"
                required
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm tabular-nums text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Role / Position (Optional)
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Cadet, Volunteer, Team Lead"
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Certificate / Award (Optional)
              </label>
              <input
                type="text"
                value={certificateTitle}
                onChange={(e) => setCertificateTitle(e.target.value)}
                placeholder="e.g. B-Certificate, 2nd Place"
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summary of your contribution or key takeaways..."
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[40px] px-4 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
            >
              {editingLog ? 'Save Changes' : 'Log Activity'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
