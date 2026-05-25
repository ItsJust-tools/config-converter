import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useKeyboardShortcuts,
  buildDefaultShortcutGroups,
} from '../../src/components/tool-shell/tool-shell-shortcuts';
import type { ToolConfig } from '../../src/types';

const config: ToolConfig = {
  id: 'test',
  name: 'Test',
  description: 'Test',
  version: '1.0.0',
  exportFormats: ['json'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
};

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers and unregisters keydown listener', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts({}, vi.fn()));
    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('calls onShowShortcuts on Ctrl+?', () => {
    const onShowShortcuts = vi.fn();
    renderHook(() => useKeyboardShortcuts({}, onShowShortcuts));

    const handler = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === 'keydown')?.[1] as EventListener;

    handler(new KeyboardEvent('keydown', { key: '?', ctrlKey: true }));
    expect(onShowShortcuts).toHaveBeenCalled();
  });

  it('calls onShowShortcuts on Cmd+?', () => {
    const onShowShortcuts = vi.fn();
    renderHook(() => useKeyboardShortcuts({}, onShowShortcuts));

    const handler = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === 'keydown')?.[1] as EventListener;

    handler(new KeyboardEvent('keydown', { key: '?', metaKey: true }));
    expect(onShowShortcuts).toHaveBeenCalled();
  });

  it('calls onShowShortcuts on Ctrl+Shift+/', () => {
    const onShowShortcuts = vi.fn();
    renderHook(() => useKeyboardShortcuts({}, onShowShortcuts));

    const handler = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === 'keydown')?.[1] as EventListener;

    handler(new KeyboardEvent('keydown', { key: '/', shiftKey: true, ctrlKey: true }));
    expect(onShowShortcuts).toHaveBeenCalled();
  });

  it('calls onUndo on Ctrl+Z', () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo }, vi.fn()));

    const handler = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === 'keydown')?.[1] as EventListener;

    handler(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
    expect(onUndo).toHaveBeenCalled();
  });

  it('calls onRedo on Ctrl+Shift+Z', () => {
    const onRedo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onRedo }, vi.fn()));

    const handler = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === 'keydown')?.[1] as EventListener;

    handler(new KeyboardEvent('keydown', { key: 'z', shiftKey: true, ctrlKey: true }));
    expect(onRedo).toHaveBeenCalled();
  });

  it('calls onRedo on Ctrl+Y', () => {
    const onRedo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onRedo }, vi.fn()));

    const handler = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === 'keydown')?.[1] as EventListener;

    handler(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }));
    expect(onRedo).toHaveBeenCalled();
  });

  it('calls onToggleSidebar on Ctrl+B', () => {
    const onToggleSidebar = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onToggleSidebar }, vi.fn()));

    const handler = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === 'keydown')?.[1] as EventListener;

    handler(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));
    expect(onToggleSidebar).toHaveBeenCalled();
  });

  it('prevents default on Ctrl+S', () => {
    renderHook(() => useKeyboardShortcuts({}, vi.fn()));

    const handler = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === 'keydown')?.[1] as EventListener;

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    handler(event);
    expect(preventDefault).toHaveBeenCalled();
  });

  it('ignores keys without modifier', () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo }, vi.fn()));

    const handler = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === 'keydown')?.[1] as EventListener;

    handler(new KeyboardEvent('keydown', { key: 'z' }));
    expect(onUndo).not.toHaveBeenCalled();
  });
});

describe('buildDefaultShortcutGroups', () => {
  it('returns all groups when all features enabled', () => {
    const groups = buildDefaultShortcutGroups(config);
    expect(groups).toHaveLength(3);
    expect(groups[0]?.title).toBe('General');
    expect(groups[1]?.title).toBe('Actions');
    expect(groups[2]?.title).toBe('View');
  });

  it('omits undo/redo when feature disabled', () => {
    const noUndo = { ...config, features: { ...config.features, undoRedo: false } };
    const groups = buildDefaultShortcutGroups(noUndo);
    const general = groups.find((g) => g.title === 'General');
    expect(general?.shortcuts.some((s) => s.label === 'Undo')).toBe(false);
    expect(general?.shortcuts.some((s) => s.label === 'Redo')).toBe(false);
  });

  it('omits export when feature disabled', () => {
    const noExport = { ...config, features: { ...config.features, export: false } };
    const groups = buildDefaultShortcutGroups(noExport);
    expect(groups.some((g) => g.title === 'Actions')).toBe(false);
  });

  it('omits sidebar toggle when feature disabled', () => {
    const noSidebar = { ...config, features: { ...config.features, sidebar: false } };
    const groups = buildDefaultShortcutGroups(noSidebar);
    const view = groups.find((g) => g.title === 'View');
    expect(view?.shortcuts.some((s) => s.label === 'Toggle sidebar')).toBe(false);
  });

  it('omits dark mode toggle when feature disabled', () => {
    const noDark = { ...config, features: { ...config.features, darkMode: false } };
    const groups = buildDefaultShortcutGroups(noDark);
    const view = groups.find((g) => g.title === 'View');
    expect(view?.shortcuts.some((s) => s.label === 'Toggle dark mode')).toBe(false);
  });

  it('returns only general group when minimal features', () => {
    const minimal: ToolConfig = {
      ...config,
      features: {
        export: false,
        autoSave: true,
        undoRedo: false,
        sidebar: false,
        statusBar: false,
        darkMode: false,
      },
    };
    const groups = buildDefaultShortcutGroups(minimal);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.title).toBe('General');
    expect(groups[0]?.shortcuts).toHaveLength(1); // only Save
  });
});
