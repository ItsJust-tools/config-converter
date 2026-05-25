import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShare } from '../../src/hooks/use-share';

describe('useShare', () => {
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

  it('creates a share file blob', () => {
    const { result } = renderHook(() => useShare());

    const blob = result.current.createShareFile({
      toolId: 'test',
      content: JSON.stringify({ text: 'hello' }),
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
  });

  it('downloads share file', async () => {
    const { result } = renderHook(() => useShare());
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await act(async () => {
      await result.current.downloadShareFile({
        toolId: 'test',
        content: JSON.stringify({ text: 'hello' }),
      });
    });

    expect(result.current.isCreating).toBe(false);
    expect(result.current.shareResult?.isFile).toBe(true);
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('returns false when web share is not supported', async () => {
    const { result } = renderHook(() => useShare());

    const success = await act(async () => {
      return result.current.shareViaWeb({
        toolId: 'test',
        content: JSON.stringify({ text: 'hello' }),
      });
    });

    expect(success).toBe(false);
  });

  it('copies to clipboard', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');
    const { result } = renderHook(() => useShare());

    const success = await act(async () => {
      return result.current.copyShareToClipboard({
        toolId: 'test',
        content: JSON.stringify({ text: 'hello' }),
      });
    });

    expect(success).toBe(true);
    expect(writeTextSpy).toHaveBeenCalled();

    writeTextSpy.mockRestore();
  });

  it('clears share result and error', async () => {
    const { result } = renderHook(() => useShare());
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await act(async () => {
      await result.current.downloadShareFile({
        toolId: 'test',
        content: JSON.stringify({ text: 'hello' }),
      });
    });

    expect(result.current.shareResult).not.toBeNull();

    act(() => {
      result.current.clearShare();
    });

    expect(result.current.shareResult).toBeNull();
    expect(result.current.error).toBeNull();

    clickSpy.mockRestore();
  });

  it('throws on invalid schemaVersion', () => {
    const { result } = renderHook(() => useShare());

    expect(() =>
      result.current.createShareFile({
        toolId: 'test',
        content: '{}',
        metadata: { schemaVersion: 'not-semver' },
      })
    ).toThrow('Invalid schemaVersion');
  });

  it('handles download error', async () => {
    const { result } = renderHook(() => useShare());
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('Click failed');
    });

    await act(async () => {
      await expect(
        result.current.downloadShareFile({ toolId: 'test', content: '{}' })
      ).rejects.toThrow('Click failed');
    });

    expect(result.current.error).toBe('Click failed');
    clickSpy.mockRestore();
  });

  it('returns false when navigator.share exists but canShare rejects', async () => {
    Object.assign(navigator, {
      share: vi.fn().mockResolvedValue(undefined),
      canShare: vi.fn().mockReturnValue(false),
    });
    const { result } = renderHook(() => useShare());

    const success = await act(async () => {
      return result.current.shareViaWeb({ toolId: 'test', content: '{}' });
    });

    expect(success).toBe(false);
  });

  it('returns false on web share abort', async () => {
    Object.assign(navigator, {
      share: vi.fn().mockRejectedValue(Object.assign(new Error('Abort'), { name: 'AbortError' })),
      canShare: vi.fn().mockReturnValue(true),
    });
    const { result } = renderHook(() => useShare());

    const success = await act(async () => {
      return result.current.shareViaWeb({ toolId: 'test', content: '{}' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns false and sets error on web share failure', async () => {
    Object.assign(navigator, {
      share: vi.fn().mockRejectedValue(new Error('Share failed')),
      canShare: vi.fn().mockReturnValue(true),
    });
    const { result } = renderHook(() => useShare());

    const success = await act(async () => {
      return result.current.shareViaWeb({ toolId: 'test', content: '{}' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Share failed');
  });

  it('returns false on clipboard failure', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard blocked')) },
    });
    const { result } = renderHook(() => useShare());

    const success = await act(async () => {
      return result.current.copyShareToClipboard({ toolId: 'test', content: '{}' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Clipboard blocked');
  });
});
