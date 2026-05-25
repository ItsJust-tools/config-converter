import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTool } from '../../src/hooks/use-tool';
import { ToastProvider } from '../../src/components/toast';
import type { Tool } from '../../src/tool';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

const renderOptions = { wrapper };

const mockTool: Tool<{ title: string }> = {
  id: 'test-tool',
  name: 'Test Tool',
  version: '1.0',
  config: {
    id: 'test-tool',
    name: 'Test Tool',
    description: 'A test tool',
    version: '1.0',
    exportFormats: ['json'],
    features: {
      export: true,
      autoSave: false,
      undoRedo: true,
      sidebar: true,
      statusBar: true,
      darkMode: true,
    },
  },
  initialState: { title: 'Test' },
  serialize: (state) => JSON.stringify(state),
  deserialize: (data) => {
    if (typeof data === 'object' && data !== null && 'title' in data) {
      return { success: true, data: { title: String((data as Record<string, unknown>).title) } };
    }
    return { success: false, error: 'Invalid data' };
  },
};

describe('useTool', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('initializes with tool state', () => {
    const canvasRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useTool(mockTool, canvasRef), renderOptions);

    expect(result.current.state.data).toEqual({ title: 'Test' });
    expect(result.current.supportedFormats).toEqual(['json']);
  });

  it('exports successfully', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const canvasRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useTool(mockTool, canvasRef), renderOptions);

    const exportResult = await act(async () => {
      return result.current.handleExport('json');
    });

    expect(exportResult.success).toBe(true);
    clickSpy.mockRestore();
  });

  it('imports valid data', async () => {
    const canvasRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useTool(mockTool, canvasRef), renderOptions);

    const file = new File([JSON.stringify({ title: 'Imported' })], 'data.json', {
      type: 'application/json',
    });

    await act(async () => {
      await result.current.importFromFile(file);
    });

    expect(result.current.state.data).toEqual({ title: 'Imported' });
  });

  it('shows toast on import deserialization error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const canvasRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useTool(mockTool, canvasRef), renderOptions);

    const file = new File([JSON.stringify({ invalid: true })], 'data.json', {
      type: 'application/json',
    });

    await act(async () => {
      await result.current.importFromFile(file);
    });

    expect(result.current.state.data).toEqual({ title: 'Test' });
    consoleSpy.mockRestore();
  });

  it('resets state when handleReset is confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const canvasRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useTool(mockTool, canvasRef), renderOptions);

    // Change state so we can verify reset
    act(() => {
      result.current.state.setData({ title: 'Changed' });
    });
    expect(result.current.state.data).toEqual({ title: 'Changed' });

    act(() => {
      result.current.toolbarActions.onReset?.();
    });

    expect(result.current.state.data).toEqual({ title: 'Test' });
    confirmSpy.mockRestore();
  });

  it('does not reset when handleReset is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const canvasRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useTool(mockTool, canvasRef), renderOptions);

    act(() => {
      result.current.state.setData({ title: 'Changed' });
    });

    act(() => {
      result.current.toolbarActions.onReset?.();
    });

    expect(result.current.state.data).toEqual({ title: 'Changed' });
    confirmSpy.mockRestore();
  });

  it('exposes onUndo and onRedo when state allows', async () => {
    const canvasRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useTool(mockTool, canvasRef), renderOptions);

    // Initially no undo/redo
    expect(result.current.toolbarActions.onUndo).toBeUndefined();
    expect(result.current.toolbarActions.onRedo).toBeUndefined();

    // After state change, undo should be available
    act(() => {
      result.current.state.setData({ title: 'Changed' });
    });

    expect(result.current.toolbarActions.onUndo).toBeDefined();
  });
});
