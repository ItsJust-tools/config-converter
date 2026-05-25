import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MockThemeProvider, MockToastProvider } from './mock-providers';
import type { ToolConfig } from '../types';

const testConfig: ToolConfig = {
  id: 'test-tool',
  name: 'Test Tool',
  description: 'A test tool',
  version: '0.0.0',
  exportFormats: ['json'],
  features: {
    export: true,
    autoSave: false,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
};

export function renderTool(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MockThemeProvider theme="light">
        <MockToastProvider>{children}</MockToastProvider>
      </MockThemeProvider>
    ),
    ...options,
  });
}

function isFunctionUpdater<T>(value: T | ((prev: T) => T)): value is (prev: T) => T {
  return typeof value === 'function';
}

export interface MockToolState<T> {
  data: T;
  setData: (updater: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  lastSaved: string | null;
  isDirty: boolean;
  saveNow: () => Promise<void>;
}

export function createMockToolState<T>(initial: T): MockToolState<T> {
  let data = initial;
  const history: T[] = [initial];
  let historyIndex = 0;

  return {
    get data() {
      return data;
    },
    setData: (updater: T | ((prev: T) => T)) => {
      const next = isFunctionUpdater(updater) ? updater(data) : updater;
      data = next;
      history.splice(historyIndex + 1);
      history.push(next);
      historyIndex = history.length - 1;
    },
    undo: () => {
      if (historyIndex > 0) {
        historyIndex--;
        data = history[historyIndex]!;
      }
    },
    redo: () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        data = history[historyIndex]!;
      }
    },
    get canUndo() {
      return historyIndex > 0;
    },
    get canRedo() {
      return historyIndex < history.length - 1;
    },
    clearHistory: () => {
      history.length = 0;
      history.push(data);
      historyIndex = 0;
    },
    lastSaved: null,
    isDirty: false,
    saveNow: async () => {},
  };
}

export { testConfig };
