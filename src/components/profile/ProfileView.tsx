import React, { useRef, useState } from 'react';
import {
  Award,
  Camera,
  Check,
  Download,
  Lock,
  LogOut,
  Trash2,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import {
  THEMES,
  getInitials,
  resizeAvatarImage,
} from '../../utils/portalHelpers';
import { PWAInstallButton } from '../ui/PWAInstallButton';

const YEAR_OPTIONS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year',
  'Postgraduate',
];

export const ProfileView: React.FC = () => {
  const {
    user,
    theme,
    badges,
    setTheme,
    updateProfile,
    exportWorkspaceJson,
    signOut,
    notify,
  } = usePortal();

  const [name, setName] = useState(user?.name ?? '');
  const [college, setCollege] = useState(user?.college ?? '');
  const [branch, setBranch] = useState(user?.branch ?? '');
  const [year, setYear] = useState(user?.year ?? '1st Year');
  const [bio, setBio] = useState(user?.bio ?? '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const earnedCount = badges.filter((b) => b.earned).length;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !college.trim() || !branch.trim()) {
      notify('Name, College, and Branch cannot be empty.', 'error');
      return;
    }
    updateProfile({
      name: name.trim(),
      college: college.trim(),
      branch: branch.trim(),
      year,
      bio: bio.trim(),
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Please select an image file.', 'error');
      return;
    }
    try {
      const dataUrl = await resizeAvatarImage(file);
      updateProfile({ avatarDataUrl: dataUrl });
    } catch {
      notify('Could not process that image. Please try another file.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Editable Student Profile */}
      <section className="xl:col-span-7 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 border-b border-[var(--border-hairline)]">
          <div className="relative w-20 h-20 shrink-0">
            {user.avatarDataUrl ? (
              <img
                src={user.avatarDataUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-2xl object-cover border border-[var(--border-hairline)]"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-ink)] text-2xl font-bold flex items-center justify-center">
                {getInitials(user.name)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">
              {user.name}
            </h2>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {user.email} · {user.branch} · {user.year}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{user.avatarDataUrl ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
              {user.avatarDataUrl && (
                <button
                  type="button"
                  onClick={() => updateProfile({ avatarDataUrl: null })}
                  className="inline-flex items-center gap-1 min-h-[36px] px-3 rounded-lg text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Use Initials</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Student Email
              </label>
              <input
                type="email"
                readOnly
                value={user.email}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-3.5 text-sm text-[var(--text-muted)] cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              College / University
            </label>
            <input
              type="text"
              required
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Branch / Course
              </label>
              <input
                type="text"
                required
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Academic Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                {YEAR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Bio &amp; Academic Interests
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a short bio, semester goals, clubs, or research interests..."
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={exportWorkspaceJson}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Data Backup</span>
              </button>
              <PWAInstallButton />
            </div>

            <button
              type="submit"
              className="min-h-[42px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)]"
            >
              Save Profile
            </button>
          </div>
        </form>
      </section>

      {/* Right: Earned Badges & Theme Preference */}
      <div className="xl:col-span-5 space-y-6">
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-[var(--border-hairline)]">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Earned Badges
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Unlocked automatically from your real study and campus milestones.
              </p>
            </div>
            <span className="font-mono tabular-nums text-xs font-semibold text-[var(--accent)]">
              {earnedCount} / {badges.length}
            </span>
          </div>

          <div className="mt-4 divide-y divide-[var(--border-hairline)]">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      badge.earned
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                    }`}
                  >
                    {badge.earned ? (
                      <Award className="w-4.5 h-4.5" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {badge.title}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {badge.description}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono tabular-nums text-[11px] font-medium shrink-0 ${
                    badge.earned
                      ? 'text-[var(--success)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {badge.earned ? 'Earned' : badge.progressText}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Theme & Account Actions */}
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Saved Theme Preference
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Your chosen theme is saved automatically to your student account.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {THEMES.map((item) => {
              const selected = item.id === theme;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id)}
                  className={`flex items-center justify-between gap-2 min-h-[44px] px-3 rounded-xl border text-xs font-medium transition-colors ${
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                      : 'border-[var(--border-hairline)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${item.swatchBg} 50%, ${item.swatchAccent} 50%)`,
                      }}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[var(--border-hairline)]">
            <button
              type="button"
              onClick={signOut}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[42px] rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] hover:border-[var(--danger)]/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of CampusDesk</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
