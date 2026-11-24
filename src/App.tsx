import React from 'react';
import { GraduationCap } from 'lucide-react';
import { AuthScreen } from './components/auth/AuthScreen';
import { CalendarView } from './components/calendar/CalendarView';
import { ChatView } from './components/chat/ChatView';
import { CoCurricularView } from './components/cocurricular/CoCurricularView';
import { DashboardView } from './components/dashboard/DashboardView';
import { AppShell } from './components/layout/AppShell';
import { NotesHubView } from './components/notes/NotesHubView';
import { ProfileView } from './components/profile/ProfileView';
import { FocusToolsView } from './components/tools/FocusToolsView';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { OfflineIndicator } from './components/ui/OfflineIndicator';
import { ToastContainer } from './components/ui/ToastContainer';
import { PortalProvider, usePortal } from './context/PortalContext';

const PortalRouter: React.FC = () => {
  const { user, authLoading, activeSection } = usePortal();

  if (authLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-primary)] gap-3">
        <div className="w-11 h-11 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center animate-pulse">
          <GraduationCap className="w-5 h-5" />
        </div>
        <p className="text-xs font-medium text-[var(--text-muted)]">
          Connecting to CampusDesk...
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <AppShell>
      {activeSection === 'dashboard' && <DashboardView />}
      {activeSection === 'notes' && <NotesHubView />}
      {activeSection === 'chat' && <ChatView />}
      {activeSection === 'calendar' && <CalendarView />}
      {activeSection === 'cocurricular' && <CoCurricularView />}
      {activeSection === 'tools' && <FocusToolsView />}
      {activeSection === 'profile' && <ProfileView />}
    </AppShell>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <PortalProvider>
        <PortalRouter />
        <ToastContainer />
        <OfflineIndicator />
      </PortalProvider>
    </ErrorBoundary>
  );
}
