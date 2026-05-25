export interface ToolTheme {
  accent?: string;
  accentHover?: string;
  accentSubtle?: string;
  brand?: string;
  brandUrl?: string;
  icon?: string;
}

export interface ShortcutDef {
  keys: string;
  label: string;
  description?: string;
}

export interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutDef[];
}

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  exportFormats: ExportFormat[];
  features: FeatureFlags;
  ogImage?: string;
  theme?: ToolTheme;
  shortcuts?: ShortcutGroup[];
}

export interface FeatureFlags {
  export: boolean;
  autoSave: boolean;
  undoRedo: boolean;
  sidebar: boolean;
  statusBar: boolean;
  darkMode: boolean;
}

export const defaultFeatures: FeatureFlags = {
  export: true,
  autoSave: true,
  undoRedo: true,
  sidebar: true,
  statusBar: true,
  darkMode: true,
};

export type ExportFormat = 'png' | 'pdf' | 'json' | 'jpeg' | 'webp';
