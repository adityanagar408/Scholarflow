import React, { useState } from 'react';
import {
  Award,
  Calendar,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Timer,
  User,
  X,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import type { NavSection } from '../../types/portal';
import { getInitials } from '../../utils/portalHelpers';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';

interface NavItemConfig {
  id: NavSection;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  mobileBar?: boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    icon: LayoutDashboard,
    mobileBar: true,
  },
  {
    id: 'notes',
    label: 'Notes Hub',
    shortLabel: 'Notes',
    icon: FolderOpen,
    mobileBar: true,
  },
  {
    id: 'chat',
    label: 'Chat & Groups',
    shortLabel: 'Chat',
    icon: MessageSquare,
    mobileBar: true,
  },
  {
    id: 'calendar',
    label: 'Deadlines & Events',
    shortLabel: 'Calendar',
    icon: Calendar,
    mobileBar: true,
  },
  {
    id: 'cocurricular',
    label: 'Co-Curricular',
    shortLabel: 'Campus',
    icon: Award,
  },
  {
    id: 'tools',
    label: 'Focus & Tasks',
    shortLabel: 'Focus',
    icon: Timer,
    mobileBar: true,
  },
  {
    id: 'profile',
    label: 'Student Profile',
    shortLabel: 'Profile',
    icon: User,
  },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, activeSection, setActiveSection, signOut } = usePortal();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!user) return null;

  const currentNav =
    NAV_ITEMS.find((item) => item.id === activeSection) ?? NAV_ITEMS[0];
  const mobileBarItems = NAV_ITEMS.filter((item) => item.mobileBar);

  const handleNavigate = (section: NavSection) => {
    setActiveSection(section);
    setDrawerOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-14 px-5 flex items-center justify-between border-b border-[var(--border-hairline)] shrink-0">
        <button
          type="button"
          onClick={() => handleNavigate('dashboard')}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center">
            <GraduationCap className="w-4.5 h-4.5" />
          </div>
          <span className="font-[var(--font-display)] text-base font-bold tracking-tight text-[var(--text-primary)]">
            CampusDesk
          </span>
        </button>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
          className="lg:hidden min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 min-h-[42px] px-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Student Profile Summary */}
      <div className="p-3 border-t border-[var(--border-hairline)] shrink-0 space-y-2">
        <button
          type="button"
          onClick={() => handleNavigate('profile')}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-[var(--bg-subtle)] transition-colors text-left"
        >
          {user.avatarDataUrl ? (
            <img
              src={user.avatarDataUrl}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-[var(--border-hairline)] shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] text-xs font-semibold flex items-center justify-center shrink-0">
              {getInitials(user.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {user.name}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] truncate">
              {user.branch} · {user.year}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 min-h-[38px] px-3 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] z-30">
        {renderSidebarContent()}
      </aside>

      {/* Mobile & Tablet Slide-over Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] h-full bg-[var(--bg-surface)] border-r border-[var(--border-hairline)] shadow-xl z-10">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Sticky Top Navbar (Compact 52-56px height to respect 15% mobile sticky cap) */}
        <header className="sticky top-0 z-30 h-[52px] md:h-14 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex items-center gap-2 text-sm">
              <h1 className="font-[var(--font-display)] text-sm sm:text-base font-semibold tracking-tight text-[var(--text-primary)] truncate">
                {currentNav.label}
              </h1>
              <span
                aria-hidden="true"
                className="hidden sm:inline text-[var(--text-muted)]"
              >
                ·
              </span>
              <span className="hidden sm:inline text-xs text-[var(--text-muted)] truncate">
                {user.college}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton compact />
            <ThemeSwitcher />
            <button
              type="button"
              onClick={() => handleNavigate('profile')}
              aria-label="Open student profile"
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border border-[var(--border-hairline)] hover:opacity-90 transition-opacity shrink-0"
            >
              {user.avatarDataUrl ? (
                <img
                  src={user.avatarDataUrl}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="w-full h-full bg-[var(--accent-soft)] text-[var(--accent-ink)] text-xs font-semibold flex items-center justify-center">
                  {getInitials(user.name)}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Content Viewport */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (56px height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur-md grid grid-cols-5 items-center px-1"
      >
        {mobileBarItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors ${
                active
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
