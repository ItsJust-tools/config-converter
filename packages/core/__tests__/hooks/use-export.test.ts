import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExport } from '../../src/hooks/use-export';
import type { ToolConfig } from '../../src/types';

const mockConfig: ToolConfig = {
  id: 'test',
  name: 'Test',
  description: 'Test tool',
  version: '1.0',
  exportFormats: ['json'],
  features: {
    export: true,
    autoSave: false,
    undoRedo: false,
    sidebar: false,
    statusBar: false,
    darkMode: false,
  },
};

describe('useExport', () => {
  if (!URL.createObjectURL) {
    URL.createObjectURL = (() => 'blob:mock') as typeof URL.createObjectURL;
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
  }

  it('returns supported formats from config', () => {
    const canvasRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useExport(canvasRef, mockConfig));

    expect(result.current.supportedFormats).toEqual(['json']);
  });

  it('sets isExporting during export', async () => {
    const canvasRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useExport(canvasRef, mockConfig, () => '{}'));

    expect(result.current.isExporting).toBe(false);

    let exportPromise: Promise<unknown>;
    act(() => {
      exportPromise = result.current.exportTo('json');
    });

    expect(result.current.isExporting).toBe(true);

    await act(async () => {
      await exportPromise;
    });

    expect(result.current.isExporting).toBe(false);
  });

  it('prevents concurrent exports', async () => {
    const canvasRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useExport(canvasRef, mockConfig, () => '{}'));

    // Prevent jsdom navigation error by mocking link.click
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    let firstPromise: Promise<unknown>;
    let secondPromise: Promise<unknown>;

    act(() => {
      firstPromise = result.current.exportTo('json');
      secondPromise = result.current.exportTo('json');
    });

    const [first, second] = await act(async () => {
      return Promise.all([firstPromise, secondPromise]);
    });

    expect(first).not.toBeNull();
    expect(second).toBeNull();

    clickSpy.mockRestore();
  });

  it('returns error result on export failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const canvasRef = { current: document.createElement('div') };
    const { result } = renderHook(() =>
      useExport(canvasRef, { ...mockConfig, exportFormats: ['json', 'png'] }, () => '{}', [
        {
          format: 'png',
          loader: () =>
            Promise.resolve({
              default: {
                format: 'png',
                export: async () => {
                  throw new Error('PNG export failed');
                },
              },
            }),
        },
      ])
    );

    let exportResult: Awaited<ReturnType<typeof result.current.exportTo>>;
    await act(async () => {
      exportResult = await result.current.exportTo('png');
    });

    expect(exportResult!.success).toBe(false);
    expect(exportResult!.error).toBe('PNG export failed');
    errorSpy.mockRestore();
  });

  it('returns error when canvasRef is null', async () => {
    const canvasRef = { current: null };
    const { result } = renderHook(() => useExport(canvasRef, mockConfig, () => '{}'));

    let exportResult: Awaited<ReturnType<typeof result.current.exportTo>>;
    await act(async () => {
      exportResult = await result.current.exportTo('json');
    });

    expect(exportResult!.success).toBe(false);
    expect(exportResult!.error).toBe('Export target is not ready');
  });

  it('aborts ongoing export', () => {
    const canvasRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useExport(canvasRef, mockConfig, () => '{}'));

    act(() => {
      result.current.abortExport();
    });

    expect(result.current.isExporting).toBe(false);
  });
});
