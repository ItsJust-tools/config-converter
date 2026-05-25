/**
 * @itsjust/core — Shared primitives for itsjust tools.
 *
 * Everything exported here is part of the public API and should remain stable.
 */

// Tool contract
export type { Tool, ToolExporterDefinition } from './tool';

// Types
export type {
  ToolConfig,
  ToolTheme,
  FeatureFlags,
  ExportFormat,
  ExportOptions,
  ExportResult,
  Exporter,
  ExporterLoader,
  ShareData,
  ShareResult,
  StorageData,
  AutoSaveOptions,
  ToolState,
  ShortcutDef,
  ShortcutGroup,
} from './types';
export { defaultFeatures, defaultAutoSaveOptions, formatLabels } from './types';

// Engines
/** Engine that loads exporters and triggers client-side downloads. */
export { ExportEngine, createExportEngine } from './engines/export-engine';
/** Manager for namespaced, versioned localStorage persistence. */
export { StorageManager, storageManager } from './engines/storage-manager';

// Hooks
/**
 * useToolState — Undo/redo, auto-save, and dirty-state tracking.
 *
 * @example
 * const state = useToolState(initial, { key: 'my-tool' });
 * state.setData(prev => ({ ...prev, text: 'new' }));
 */
export { useToolState } from './hooks/use-tool-state';
/**
 * useTool — Combines state, export, import, and share into one result.
 * Useful for simple tools that don't need fine-grained control.
 */
export { useTool } from './hooks/use-tool';
export type { UseToolResult } from './hooks/use-tool';
/**
 * useExport — Client-side export hook.
 *
 * @example
 * const { exportTo, supportedFormats, isExporting } = useExport(canvasRef, config, serialize);
 * exportTo('png');
 */
export { useExport } from './hooks/use-export';
/**
 * useShare — Generate and download/share .itsjust.json files.
 */
export { useShare } from './hooks/use-share';
/**
 * useImport — Parse and validate uploaded files.
 */
export { useImport } from './hooks/use-import';
export type { ImportResult, UseImportOptions } from './hooks/use-import';
/** useStorage — Low-level typed localStorage access with versioning. */
export { useStorage } from './hooks/use-storage';
/** useDragAndDropImport — Drag-and-drop file import with visual feedback. */
export { useDragAndDropImport } from './hooks/use-drag-and-drop-import';
/** useRelativeTime — Auto-updating relative time string (e.g. "2m ago"). */
export { useRelativeTime } from './hooks/use-relative-time';
/**
 * useUrlState — Read compressed state from URL on mount and create share URLs.
 *
 * @example
 * const { createShareUrl, isSharing } = useUrlState({
 *   toolId: 'my-tool',
 *   serialize: () => JSON.stringify(state),
 *   deserialize: (data) => tool.deserialize(data),
 *   onStateLoaded: (data) => setToolData(data as MyState),
 *   showToast,
 * });
 */
export { useUrlState } from './hooks/use-url-state';
/** useKeyboardShortcuts — Register global keyboard shortcuts for a tool. */
export { useKeyboardShortcuts } from './components/tool-shell/tool-shell-shortcuts';
/** usePlugins — Organize declarative tool plugins by slot. */
export { usePlugins } from './hooks/use-plugins';

// Components
/** ToolShell — Root layout component for every itsjust tool. */
export { ToolShell, type ToolbarActions } from './components/tool-shell';
/** ThemeProvider — Light/dark/system theme with CSS custom properties. */
export { ThemeProvider, useTheme, ThemeScript } from './components/theme-provider';
/** ToastProvider — Lightweight toast notification system. */
export { ToastProvider, useToast } from './components/toast';
/** KeyboardShortcutsOverlay — Modal showing available keyboard shortcuts. */
export { KeyboardShortcutsOverlay } from './components/keyboard-shortcuts';
/** ImportExport — Toolbar buttons with dropdown for import/export. */
export { ImportExport } from './components/import-export/import-export';
export type { ImportExportProps } from './components/import-export/import-export';
/** ErrorBoundary — Catch React render errors and show a fallback UI. */
export { ErrorBoundary } from './components/error-boundary/error-boundary';

// i18n
/** Minimal i18n string map and helper. */
export { t } from './i18n/strings';
