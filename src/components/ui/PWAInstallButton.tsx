import React, { useState } from 'react';
import { Download, Share } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Modal } from './Modal';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent-ink)] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{compact ? 'Install' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors whitespace-nowrap shrink-0"
        >
          <Share className="w-3.5 h-3.5" />
          <span>{compact ? 'Install' : 'Install on iOS'}</span>
        </button>

        <Modal
          open={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Install CampusDesk on iOS"
          description="Add CampusDesk to your home screen for full-screen offline access."
          maxWidth="sm"
        >
          <ol className="space-y-2.5 text-sm text-[var(--text-secondary)] list-decimal list-inside">
            <li>
              Tap the <strong className="text-[var(--text-primary)]">Share</strong> button in your Safari toolbar.
            </li>
            <li>
              Scroll down and choose{' '}
              <strong className="text-[var(--text-primary)]">Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong className="text-[var(--text-primary)]">Add</strong> to launch CampusDesk as an app.
            </li>
          </ol>
          <button
            type="button"
            onClick={() => setShowIOSGuide(false)}
            className="mt-5 w-full min-h-[42px] rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            Got it
          </button>
        </Modal>
      </>
    );
  }

  return null;
};
