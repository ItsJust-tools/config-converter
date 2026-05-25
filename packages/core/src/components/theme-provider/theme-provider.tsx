'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ToolTheme } from '../../types';

type Theme = 'light' | 'dark' | 'system';
type ContrastMode = 'normal' | 'more' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  contrast: ContrastMode;
  setContrast: (contrast: ContrastMode) => void;
  resolvedTheme: 'light' | 'dark';
  resolvedContrast: 'normal' | 'more';
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  contrast: 'system',
  setContrast: () => {},
  resolvedTheme: 'light',
  resolvedContrast: 'normal',
});

const STORAGE_KEY = 'itsjust-theme';
const CONTRAST_STORAGE_KEY = 'itsjust-contrast';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
}

function getSystemContrast(): 'normal' | 'more' {
  if (typeof window === 'undefined') return 'normal';
  if (window.matchMedia('(forced-colors: active)').matches) return 'more';
  return window.matchMedia('(prefers-contrast: more)').matches ? 'more' : 'normal';
}

function applyContrast(resolved: 'normal' | 'more') {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-contrast', resolved);
}

function applyToolTheme(toolTheme: ToolTheme, prev?: ToolTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (toolTheme.accent && toolTheme.accent !== prev?.accent)
    root.style.setProperty('--accent', toolTheme.accent);
  if (toolTheme.accentHover && toolTheme.accentHover !== prev?.accentHover)
    root.style.setProperty('--accent-hover', toolTheme.accentHover);
  if (toolTheme.accentSubtle && toolTheme.accentSubtle !== prev?.accentSubtle)
    root.style.setProperty('--accent-subtle', toolTheme.accentSubtle);
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch (error) {
    console.warn('[ThemeProvider] Failed to read theme from localStorage:', error);
  }
  return 'system';
}

function getInitialContrast(): ContrastMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = localStorage.getItem(CONTRAST_STORAGE_KEY);
    if (raw === 'normal' || raw === 'more' || raw === 'system') return raw;
  } catch (error) {
    console.warn('[ThemeProvider] Failed to read contrast from localStorage:', error);
  }
  return 'system';
}

export function ThemeProvider({
  children,
  toolTheme,
}: {
  children: React.ReactNode;
  toolTheme?: ToolTheme;
}) {
  const lastToolThemeRef = useRef<ToolTheme | undefined>(undefined);
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());
  const [contrast, setContrastState] = useState<ContrastMode>(() => getInitialContrast());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const initial = getInitialTheme();
    return initial === 'system' ? getSystemTheme() : initial;
  });
  const [resolvedContrast, setResolvedContrast] = useState<'normal' | 'more'>(() => {
    const initial = getInitialContrast();
    return initial === 'system' ? getSystemContrast() : initial;
  });

  const resolveTheme = useCallback((t: Theme) => (t === 'system' ? getSystemTheme() : t), []);
  const resolveContrast = useCallback(
    (c: ContrastMode) => (c === 'system' ? getSystemContrast() : c),
    []
  );

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      const resolved = resolveTheme(t);
      setResolvedTheme(resolved);
      applyTheme(resolved);
      try {
        localStorage.setItem(STORAGE_KEY, t);
      } catch (error) {
        console.warn('[ThemeProvider] Failed to save theme to localStorage:', error);
      }
    },
    [resolveTheme]
  );

  const setContrast = useCallback(
    (c: ContrastMode) => {
      setContrastState(c);
      const resolved = resolveContrast(c);
      setResolvedContrast(resolved);
      applyContrast(resolved);
      try {
        localStorage.setItem(CONTRAST_STORAGE_KEY, c);
      } catch (error) {
        console.warn('[ThemeProvider] Failed to save contrast to localStorage:', error);
      }
    },
    [resolveContrast]
  );

  // Apply theme on mount and when toolTheme changes
  useEffect(() => {
    applyTheme(resolvedTheme);
    applyContrast(resolvedContrast);
    if (toolTheme) {
      applyToolTheme(toolTheme, lastToolThemeRef.current);
      lastToolThemeRef.current = toolTheme;
    }
  }, [toolTheme, resolvedTheme, resolvedContrast]);

  // Listen for system color-scheme changes (only when theme is 'system')
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    if (contrast !== 'system') return;
    const mq1 = window.matchMedia('(prefers-contrast: more)');
    const mq2 = window.matchMedia('(forced-colors: active)');
    const handler = () => {
      const resolved = getSystemContrast();
      setResolvedContrast(resolved);
      applyContrast(resolved);
    };
    mq1.addEventListener('change', handler);
    mq2.addEventListener('change', handler);
    return () => {
      mq1.removeEventListener('change', handler);
      mq2.removeEventListener('change', handler);
    };
  }, [contrast]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, contrast, setContrast, resolvedTheme, resolvedContrast }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
ThemeProvider.displayName = 'ThemeProvider';
