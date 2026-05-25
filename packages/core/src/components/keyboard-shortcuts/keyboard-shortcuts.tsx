'use client';

import { useEffect, useRef } from 'react';
import type { ShortcutGroup } from '../../types';
import { t } from '../../i18n/strings';

interface KeyboardShortcutsOverlayProps {
  groups: ShortcutGroup[];
  onClose: () => void;
}

export function KeyboardShortcutsOverlay({ groups, onClose }: KeyboardShortcutsOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && ref.current) {
        const focusable = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      if (e.target === el) onClose();
    };
    el.addEventListener('mousedown', handler);
    return () => el.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = ref.current?.querySelector<HTMLElement>('.shortcuts-close');
    first?.focus();
    return () => {
      if (prev && document.body.contains(prev)) {
        prev.focus();
      }
    };
  }, []);

  return (
    <div
      className="shortcuts-overlay"
      ref={ref}
      aria-modal="true"
      role="dialog"
      aria-label={t('keyboardShortcuts')}
    >
      <div className="shortcuts-card">
        <div className="shortcuts-header">
          <h2 className="shortcuts-title">{t('keyboardShortcuts')}</h2>
          <span className="shortcuts-hint">{t('pressToToggle')}</span>
          <button
            className="shortcuts-close"
            onClick={onClose}
            aria-label={t('closeShortcuts')}
            type="button"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>
        {groups.map((group, gi) => (
          <div key={gi} className="shortcuts-group">
            <div className="shortcuts-group-title">{group.title}</div>
            <div className="shortcuts-list">
              {group.shortcuts.map((s, si) => (
                <div key={si} className="shortcut-row">
                  <span className="shortcut-label">
                    {s.label}
                    {s.description && (
                      <span className="shortcut-description"> &mdash; {s.description}</span>
                    )}
                  </span>
                  <span className="shortcut-keys">
                    <kbd className="shortcut-key">{s.keys}</kbd>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
KeyboardShortcutsOverlay.displayName = 'KeyboardShortcutsOverlay';
export default KeyboardShortcutsOverlay;
