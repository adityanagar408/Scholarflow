import React from 'react';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../../lib/firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isQuotaError: boolean;
  isFreeReadQuotaError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isQuotaError: false,
      isFreeReadQuotaError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'An unexpected error occurred.';
    let parsedMessage = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        parsedMessage = `${parsed.error} (${parsed.operationType || 'operation'} on ${parsed.path || 'database'})`;
      }
    } catch {
      // Plain error message
    }
    const isQuotaError = raw.includes('Quota exceeded');
    const isFreeReadQuotaError = raw.includes(
      "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
    );
    return {
      hasError: true,
      errorMessage: parsedMessage,
      isQuotaError,
      isFreeReadQuotaError,
    };
  }

  componentDidCatch(error: Error) {
    console.error('CampusDesk ErrorBoundary caught:', error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const upgradeUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;

    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-primary)] p-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-subtle)] space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {this.state.isQuotaError
                  ? 'Daily Firestore Quota Reached'
                  : 'Something went wrong'}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                {this.state.isQuotaError
                  ? 'Your Firestore free-tier daily quota has been reached and resets tomorrow.'
                  : 'CampusDesk encountered a database or runtime error.'}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--bg-subtle)] p-3 text-xs font-mono text-[var(--text-secondary)] break-words">
            {this.state.errorMessage}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {this.state.isFreeReadQuotaError && (
              <a
                href={upgradeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-xl border border-[var(--border-hairline)] text-xs font-medium text-[var(--accent)] hover:bg-[var(--bg-subtle)]"
              >
                <span>Open Firestore Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:bg-[var(--accent-hover)]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Portal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
