import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToolState } from '../../src/hooks/use-tool-state';

function getStoredBySuffix(suffix: string): string | null {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.endsWith(suffix)) {
      return localStorage.getItem(key);
    }
  }
  return null;
}

describe('useToolState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with given state', () => {
    const { result } = renderHook(() => useToolState({ text: 'hello' }));
    expect(result.current.data).toEqual({ text: 'hello' });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it('supports undo/redo', () => {
    const { result } = renderHook(() => useToolState(0));
    act(() => result.current.setData(1));
    act(() => vi.advanceTimersByTime(500));
    act(() => result.current.setData(2));
    act(() => vi.advanceTimersByTime(500));

    expect(result.current.data).toBe(2);
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.data).toBe(1);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.data).toBe(2);
    expect(result.current.canRedo).toBe(false);
  });

  it('tracks dirty state and auto-saves', async () => {
    const { result } = renderHook(() =>
      useToolState('initial', { key: 'test-dirty', enabled: true, debounceMs: 500 })
    );

    expect(result.current.isDirty).toBe(false);
    act(() => result.current.setData('changed'));
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastSaved).not.toBeNull();

    const saved = getStoredBySuffix(':test-dirty');
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved!).data).toBe('changed');
  });

  it('limits history to max entries', () => {
    const { result } = renderHook(() => useToolState(0, { maxHistoryEntries: 5 }));

    for (let i = 1; i <= 20; i++) {
      act(() => result.current.setData(i));
    }

    for (let i = 0; i < 20; i++) {
      act(() => result.current.undo());
    }

    expect(result.current.data).toBe(16);
    expect(result.current.canUndo).toBe(false);
  });

  it('clearHistory resets state', () => {
    const { result } = renderHook(() => useToolState(0));
    act(() => result.current.setData(1));
    act(() => vi.advanceTimersByTime(500));
    act(() => result.current.setData(2));
    act(() => vi.advanceTimersByTime(500));
    act(() => result.current.clearHistory());

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('clearHistory prevents undo afterwards', () => {
    const { result } = renderHook(() => useToolState(0));
    act(() => result.current.setData(1));
    act(() => result.current.setData(2));
    act(() => result.current.clearHistory());
    act(() => result.current.undo());
    expect(result.current.data).toBe(2);
    expect(result.current.canUndo).toBe(false);
  });

  it('saveNow persists immediately', async () => {
    const { result } = renderHook(() =>
      useToolState('initial', { key: 'test-save-now', enabled: true })
    );

    act(() => result.current.setData('manual'));
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.saveNow();
    });
    expect(result.current.isDirty).toBe(false);

    const saved = getStoredBySuffix(':test-save-now');
    expect(JSON.parse(saved!).data).toBe('manual');
  });

  it('saveNow clears pending auto-save timer and resets saving state', async () => {
    const { result } = renderHook(() =>
      useToolState('initial', { key: 'test-save-now-timer', enabled: true, debounceMs: 1000 })
    );

    act(() => result.current.setData('changed'));
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.isSaving).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });
    const saved = getStoredBySuffix(':test-save-now-timer');
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved!).data).toBe('changed');
  });

  it('gracefully handles localStorage quota exceeded', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string) => {
      if (String(key).startsWith('itsjust:history:')) {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      }
    });

    const { result } = renderHook(() =>
      useToolState('initial', { key: 'test-quota', enabled: true, debounceMs: 500 })
    );

    act(() => result.current.setData('change'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(result.current.data).toBe('change');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Quota exceeded'));
    warnSpy.mockRestore();
  });
});
