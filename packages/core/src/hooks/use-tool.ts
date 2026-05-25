'use client';

import { useCallback, useMemo } from 'react';
import type { Tool } from '../tool';
import type { ExportFormat } from '../types';
import type { ToolbarActions } from '../components/tool-shell';
import { useToolState } from './use-tool-state';
import { useExport } from './use-export';
import { useImport } from './use-import';
import { useToast } from '../components/toast';
import { t } from '../i18n/strings';

export interface UseToolResult<TState> {
  /** Managed tool state (undo/redo/auto-save) */
  state: ReturnType<typeof useToolState<TState>>;
  /** Ready-to-use toolbar actions for <ToolShell> */
  toolbarActions: ToolbarActions;
  /** Import a file (pass to <ImportExport>) */
  importFromFile: (file: File) => Promise<import('./use-import').ImportResult>;
  /** Whether an import is in progress */
  isImporting: boolean;
  /** Whether an export is in progress */
  isExporting: boolean;
  /** Abort the current export operation */
  abortExport: () => void;
  /** Export handler (pass to <ImportExport>) */
  handleExport: (format: ExportFormat) => Promise<{ success: boolean; error?: string }>;
  /** Formats this tool supports */
  supportedFormats: ExportFormat[];
  /** Show a toast notification */
  toast: (message: string, type?: 'success' | 'error') => void;
}

/**
 * Unified hook that wires up state, export, import, share, undo/redo,
 * and command-palette actions for any tool that implements the {@link Tool} contract.
 *
 * @example
 * const tool = useTool(myToolDefinition, canvasRef);
 *
 * return (
 *   <ToolShell config={myToolDefinition.config} actions={tool.toolbarActions} commandActions={tool.commandActions}>
 *     …
 *   </ToolShell>
 * );
 */
export function useTool<TState>(
  tool: Tool<TState>,
  canvasRef: React.RefObject<HTMLElement | null>
): UseToolResult<TState> {
  const canonicalId = tool.config.id;
  const canonicalName = tool.config.name;
  const canonicalVersion = tool.config.version;

  if (process.env.NODE_ENV !== 'production') {
    if (
      tool.id !== canonicalId ||
      tool.name !== canonicalName ||
      tool.version !== canonicalVersion
    ) {
      console.warn(
        '[useTool] Tool top-level id/name/version differ from config; config values take precedence.'
      );
    }
  }

  const state = useToolState<TState>(tool.initialState, { key: canonicalId });
  const { exportTo, abortExport, supportedFormats, isExporting } = useExport(
    canvasRef,
    tool.config,
    () => tool.serialize(state.data),
    tool.exporters
  );
  const { importFromFile, isImporting } = useImport({
    acceptedFormats: tool.config.exportFormats,
    onImport: (result) => {
      if (result.success && result.data) {
        const deserialized = tool.deserialize(result.data);
        if (deserialized.success) {
          state.setData(deserialized.data);
        } else {
          toast(deserialized.error, 'error');
        }
      }
    },
  });
  const { toast } = useToast();

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      const result = await exportTo(format);
      if (result?.success) {
        toast(`Exported as .${format}`, 'success');
        return { success: true };
      } else {
        const error = result?.error ?? 'Export failed';
        toast(error, 'error');
        return { success: false, error };
      }
    },
    [exportTo, toast]
  );

  const { canUndo, canRedo, undo, redo, setData } = state;

  const handleReset = useCallback(() => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(t('resetConfirm'));
      if (!confirmed) return;
    }
    setData(tool.initialState);
  }, [setData, tool.initialState]);

  const toolbarActions: ToolbarActions = useMemo(
    () => ({
      onUndo: canUndo ? () => undo() : undefined,
      onRedo: canRedo ? () => redo() : undefined,
      canUndo,
      canRedo,
      onExport: handleExport,
      onReset: handleReset,
      supportedFormats,
    }),
    [canUndo, canRedo, undo, redo, handleExport, handleReset, supportedFormats]
  );

  return {
    state,
    toolbarActions,
    importFromFile,
    isImporting,
    isExporting,
    abortExport,
    handleExport,
    supportedFormats,
    toast,
  };
}
