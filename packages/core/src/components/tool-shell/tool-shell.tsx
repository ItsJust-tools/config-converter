'use client';

import { lazy, Suspense, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { ToolConfig, ToolPlugin } from '../../types';
import { ShellContext, type ToolbarActions } from './tool-shell-context';
import { Toolbar } from './tool-shell-toolbar';
import { Body } from './tool-shell-body';
import { Sidebar } from './tool-shell-sidebar';
import { Canvas } from './tool-shell-canvas';
import { StatusBar } from './tool-shell-statusbar';
import { LoadingSkeleton } from './tool-shell-loading';
import { useKeyboardShortcuts, buildDefaultShortcutGroups } from './tool-shell-shortcuts';
import { ErrorBoundary } from '../error-boundary/error-boundary';
import { usePlugins } from '../../hooks/use-plugins';
import { t } from '../../i18n/strings';

export { type ToolbarActions } from './tool-shell-context';
export { LoadingSkeleton };

const KeyboardShortcutsOverlay = lazy(() => import('../keyboard-shortcuts/keyboard-shortcuts'));

/**
 * Props for the main application shell that wraps every itsjust tool.
 * Provides layout, keyboard shortcuts, theme handling, and responsive sidebar.
 */
interface ToolShellProps {
  config: ToolConfig;
  readOnly?: boolean;
  actions?: ToolbarActions;
  sidebarOpen?: boolean;
  onSidebarChange?: (open: boolean) => void;
  toolbar?: ReactNode;
  sidebar?: ReactNode;
  canvas?: ReactNode;
  statusBar?: ReactNode;
  slots?: {
    toolbar?: ReactNode;
    sidebar?: ReactNode;
    canvas?: ReactNode;
    statusBar?: ReactNode;
  };
  /** Declarative plugins for additional toolbar, sidebar, statusBar or canvas content.
   *  Pass a stable array (useMemo or define outside the component) to avoid unnecessary re-renders. */
  plugins?: ToolPlugin[];
}

/**
 * The root layout component for any itsjust tool.
 * Renders a toolbar, optional sidebar, main canvas, and status bar.
 * Handles mobile responsiveness, keyboard shortcuts, and dark mode.
 */
export function ToolShell({
  config,
  readOnly = false,
  actions = {},
  sidebarOpen: controlledSidebarOpen,
  onSidebarChange,
  toolbar,
  sidebar,
  canvas,
  statusBar,
  slots,
  plugins = [],
}: ToolShellProps) {
  const toolbarSlot = slots?.toolbar ?? toolbar;
  const sidebarSlot = slots?.sidebar ?? sidebar;
  const canvasSlot = slots?.canvas ?? canvas;
  const statusBarSlot = slots?.statusBar ?? statusBar;
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(config.features.sidebar);
  const isControlled = controlledSidebarOpen !== undefined;
  const sidebarOpen = isControlled ? controlledSidebarOpen : internalSidebarOpen;

  const toggleSidebar = useCallback(() => {
    const wasOpen = sidebarOpen;
    if (isControlled) {
      onSidebarChange?.(!sidebarOpen);
    } else {
      setInternalSidebarOpen((v) => !v);
    }
    // Focus restoration: when closing sidebar, return focus to toggle button
    if (wasOpen) {
      requestAnimationFrame(() => {
        const toggleBtn = document.querySelector('[data-sidebar-toggle]');
        if (toggleBtn instanceof HTMLElement) {
          toggleBtn.focus();
        }
      });
    }
  }, [isControlled, onSidebarChange, sidebarOpen]);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 48rem)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const shellActions = useMemo<ToolbarActions>(
    () => ({
      ...actions,
      onToggleSidebar: toggleSidebar,
      onShowShortcuts: openShortcuts,
    }),
    [actions, toggleSidebar, openShortcuts]
  );

  useKeyboardShortcuts(shellActions, openShortcuts);

  const shortcutGroups = useMemo(() => {
    const defaults = buildDefaultShortcutGroups(config);
    if (config.shortcuts?.length) return [...defaults, ...config.shortcuts];
    return defaults;
  }, [config]);

  const shellContextValue = useMemo(
    () => ({ config, readOnly, sidebarOpen, toggleSidebar, actions: shellActions, isMobile }),
    [config, readOnly, sidebarOpen, toggleSidebar, shellActions, isMobile]
  );

  const pluginMap = usePlugins(plugins, config.features);

  return (
    <ShellContext.Provider value={shellContextValue}>
      <div
        id="main-content"
        className="tool-shell"
        data-tool={config.id}
        data-readonly={readOnly ? 'true' : 'false'}
      >
        <a href="#tool-canvas" className="skip-link">
          {t('skipToContent')}
        </a>
        <Toolbar>
          {toolbarSlot}
          {pluginMap.toolbar.map((p) => (
            <span key={p.id}>
              <p.Component />
            </span>
          ))}
        </Toolbar>
        <Body>
          <ErrorBoundary>
            <Sidebar>
              {sidebarSlot}
              {pluginMap.sidebar.map((p) => (
                <div key={p.id}>
                  <p.Component />
                </div>
              ))}
            </Sidebar>
          </ErrorBoundary>
          <ErrorBoundary>
            <Canvas>
              {canvasSlot}
              {pluginMap.canvas.map((p) => (
                <div key={p.id}>
                  <p.Component />
                </div>
              ))}
            </Canvas>
          </ErrorBoundary>
        </Body>
        <StatusBar>
          {statusBarSlot}
          {pluginMap.statusBar.map((p) => (
            <span key={p.id}>
              <p.Component />
            </span>
          ))}
        </StatusBar>
        {sidebarOpen && isMobile && (
          <div
            className="sidebar-backdrop"
            role="presentation"
            aria-hidden="true"
            onClick={toggleSidebar}
          />
        )}
        {shortcutsOpen && (
          <Suspense fallback={null}>
            <KeyboardShortcutsOverlay
              groups={shortcutGroups}
              onClose={() => setShortcutsOpen(false)}
            />
          </Suspense>
        )}
      </div>
    </ShellContext.Provider>
  );
}
ToolShell.displayName = 'ToolShell';
