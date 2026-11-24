import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = usePortal();
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-auto pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-xs font-medium text-[var(--text-primary)] shadow-lg"
        >
          {toast.tone === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0" />
          )}
          {toast.tone === 'error' && (
            <AlertCircle className="w-4 h-4 text-[var(--danger)] shrink-0" />
          )}
          {toast.tone === 'info' && (
            <Info className="w-4 h-4 text-[var(--accent)] shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
