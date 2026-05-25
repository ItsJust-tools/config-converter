import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStorage } from '../../src/hooks/use-storage';

describe('useStorage', () => {
  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves and loads data', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({ data: { foo: 'bar' }, savedAt: new Date().toISOString(), version: '1.0' })
    );

    const { result } = renderHook(() => useStorage('test'));

    act(() => {
      result.current.save('key', { foo: 'bar' });
    });

    const loaded = result.current.load<{ foo: string }>('key');
    expect(loaded).toEqual({ foo: 'bar' });
    expect(Storage.prototype.setItem).toHaveBeenCalled();
  });

  it('returns null for missing keys', () => {
    const { result } = renderHook(() => useStorage('test'));
    expect(result.current.load('missing')).toBeNull();
  });

  it('removes data', () => {
    const { result } = renderHook(() => useStorage('test'));

    act(() => {
      result.current.save('key', 'value');
      result.current.clear('key');
    });

    expect(Storage.prototype.removeItem).toHaveBeenCalledWith('test:key');
  });

  it('warns on corrupted data', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('not-json');
    const { result } = renderHook(() => useStorage('test'));

    const loaded = result.current.load('corrupt');
    expect(loaded).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load'),
      expect.any(SyntaxError)
    );
  });
});
