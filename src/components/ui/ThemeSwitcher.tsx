import React, { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { THEMES } from '../../utils/portalHelpers';

export const ThemeSwitcher: React.FC<{ align?: 'left' | 'right' }> = ({
  align = 'right',
}) => {
  const { theme, setTheme } = usePortal();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const activeConfig = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch theme"
        className="inline-flex items-center gap-2 min-h-[38px] px-3 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors whitespace-nowrap shrink-0"
      >
        <span
          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
          style={{
            background: `linear-gradient(135deg, ${activeConfig.swatchBg} 50%, ${activeConfig.swatchAccent} 50%)`,
          }}
        />
        <span className="hidden sm:inline">{activeConfig.shortLabel}</span>
        <Palette className="w-3.5 h-3.5 text-[var(--text-muted)] sm:hidden" />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-full mt-1.5 z-50 w-48 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-1.5 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            Appearance
          </div>
          {THEMES.map((item) => {
            const selected = item.id === theme;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(item.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${item.swatchBg} 50%, ${item.swatchAccent} 50%)`,
                    }}
                  />
                  <span>{item.label}</span>
                </span>
                {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
