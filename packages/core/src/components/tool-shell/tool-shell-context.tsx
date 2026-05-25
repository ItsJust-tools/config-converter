import { createContext, useContext } from 'react';
import type { ExportFormat, ToolConfig } from '../../types';

export interface ToolbarActions {
  /** Undo the latest state change. */
  onUndo?: () => void;
  /** Redo a previously undone state change. */
  onRedo?: () => void;
  /** Export the current tool content in the selected format. */
  onExport?: (format: ExportFormat) => void;
  /** Reset tool state to defaults. */
  onReset?: () => void;
  /** Toggle sidebar visibility. */
  onToggleSidebar?: () => void;
  /** Current undo availability. */
  canUndo?: boolean;
  /** Current redo availability. */
  canRedo?: boolean;
  /** Formats currently exportable by the tool. */
  supportedFormats?: ExportFormat[];
  /** Handle clicks on the toolbar brand label. */
  onBrandClick?: () => void;
  /** Current value for inline brand editing. */
  brandValue?: string;
  /** Whether inline brand editing is active. */
  isBrandEditing?: boolean;
  /** Update the inline brand value. */
  onBrandChange?: (value: string) => void;
  /** Commit inline brand editing. */
  onBrandCommit?: () => void;
  /** Cancel inline brand editing. */
  onBrandCancel?: () => void;
  /** Open the keyboard shortcuts overlay. */
  onShowShortcuts?: () => void;
}

export interface ShellContextValue {
  config: ToolConfig;
  readOnly: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  actions: ToolbarActions;
  isMobile: boolean;
}

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('ToolShell compound components must be used within ToolShell');
  return ctx;
}
