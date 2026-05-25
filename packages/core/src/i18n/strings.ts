/**
 * Minimal i18n string map. Expand into a proper i18n library (e.g. next-intl)
 * when multi-language support is required.
 */
/**
 * Type-safe helper for parameterized strings.
 */
export type StringValue = string | ((...args: string[]) => string);

export const strings = {
  en: {
    import: 'Import',
    export: 'Export',
    share: 'Share',
    undo: 'Undo',
    redo: 'Redo',
    reset: 'Reset',
    resetConfirm: 'Reset all data? This clears the current state, but you can undo it right away.',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Saved',
    unsaved: 'Unsaved',
    ready: 'Ready',
    closeSidebar: 'Close sidebar',
    toggleSidebar: 'Toggle sidebar',
    showOptions: 'Show options',
    hideOptions: 'Hide options',
    keyboardShortcuts: 'Keyboard shortcuts',
    closeShortcuts: 'Close shortcuts',
    pressToToggle: 'Press Ctrl/Cmd + ? to toggle',
    exportFailed: 'Export failed',
    exportSuccess: (format: string) => `Exported as .${format}`,
    importFailed: 'Import failed',
    dropFileToImport: 'Drop file to import',
    options: 'Options',
    switchToDarkMode: 'Switch to dark mode',
    switchToLightMode: 'Switch to light mode',
    enableHighContrast: 'Enable high contrast',
    disableHighContrast: 'Disable high contrast',
    dismissNotification: 'Dismiss notification',
    skipToContent: 'Skip to content',
    toolToolbar: 'Tool toolbar',
    importExport: 'Import and Export',
    rename: 'Rename',
  },
} as const;

export type Locale = keyof typeof strings;
export type StringKey = keyof (typeof strings)['en'];

/**
 * Retrieve a localized string. Falls back to English.
 * For parameterized strings, pass arguments after the key.
 */
export function t(key: StringKey, locale: Locale = 'en', ...args: string[]): string {
  const value = strings[locale][key];
  if (typeof value === 'function') {
    return (value as (...a: string[]) => string)(...args);
  }
  return value;
}
