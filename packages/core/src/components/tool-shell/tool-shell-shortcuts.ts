import { useEffect } from 'react';
import type { ToolbarActions } from './tool-shell-context';
import type { ShortcutGroup, ToolConfig } from '../../types';

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

function modKey(): string {
  return isMac() ? 'Cmd' : 'Ctrl';
}

export function useKeyboardShortcuts(actions: ToolbarActions, onShowShortcuts: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      if (mod) {
        if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
          e.preventDefault();
          onShowShortcuts();
          return;
        }
        switch (e.key) {
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              actions.onRedo?.();
            } else {
              e.preventDefault();
              actions.onUndo?.();
            }
            break;
          case 'y':
            e.preventDefault();
            actions.onRedo?.();
            break;
          case 's':
            e.preventDefault();
            break;
          case 'b':
            e.preventDefault();
            actions.onToggleSidebar?.();
            break;
        }
        return;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions, onShowShortcuts]);
}

export function buildDefaultShortcutGroups(config: ToolConfig): ShortcutGroup[] {
  const groups: ShortcutGroup[] = [];

  const general: (typeof groups)[0]['shortcuts'] = [];
  const mod = modKey();
  if (config.features.undoRedo) {
    general.push({ keys: `${mod}+Z`, label: 'Undo' });
    general.push({ keys: `${mod}+${isMac() ? 'Shift+Z' : 'Y'}`, label: 'Redo' });
  }
  general.push({ keys: `${mod}+S`, label: 'Save', description: 'auto-saves anyway' });
  if (general.length) groups.push({ title: 'General', shortcuts: general });

  const actions: (typeof groups)[0]['shortcuts'] = [];
  if (config.features.export) actions.push({ keys: `${mod}+E`, label: 'Export' });
  if (actions.length) groups.push({ title: 'Actions', shortcuts: actions });

  const view: (typeof groups)[0]['shortcuts'] = [];
  if (config.features.sidebar) view.push({ keys: `${mod}+B`, label: 'Toggle sidebar' });
  if (config.features.darkMode) view.push({ keys: `${mod}+D`, label: 'Toggle dark mode' });
  if (view.length) groups.push({ title: 'View', shortcuts: view });

  return groups;
}
