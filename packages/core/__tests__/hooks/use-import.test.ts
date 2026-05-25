import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImport } from '../../src/hooks/use-import';

function createFile(name: string, content: string, type = 'application/json'): File {
  return new File([content], name, { type });
}

describe('useImport', () => {
  it('imports a valid .itsjust.json file', async () => {
    const onImport = vi.fn();
    const { result } = renderHook(() => useImport({ acceptedFormats: ['json'], onImport }));

    const file = createFile(
      'test.itsjust.json',
      JSON.stringify({
        $schema: 'https://itsjust.tools/schema/v1',
        version: '1.0.0',
        toolId: 'simple-notepad',
        content: { text: 'hello world' },
      })
    );

    let importResult: Awaited<ReturnType<typeof result.current.importFromFile>> | undefined;
    await act(async () => {
      importResult = await result.current.importFromFile(file);
    });
    if (!importResult) throw new Error('Expected importResult');

    expect(importResult!.success).toBe(true);
    expect(importResult!.isItsJustFile).toBe(true);
    if (importResult?.success) {
      expect((importResult.data as { text: string }).text).toBe('hello world');
    }
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported formats', async () => {
    const { result } = renderHook(() => useImport({ acceptedFormats: ['json'] }));

    const file = createFile('test.png', 'binary', 'image/png');

    let importResult: Awaited<ReturnType<typeof result.current.importFromFile>> | undefined;
    await act(async () => {
      importResult = await result.current.importFromFile(file);
    });
    if (!importResult) throw new Error('Expected importResult');

    expect(importResult!.success).toBe(false);
    if (!importResult?.success) {
      expect(importResult.error).toContain('Unsupported format');
    }
  });

  it('rejects invalid .itsjust.json format', async () => {
    const { result } = renderHook(() => useImport({ acceptedFormats: ['json'] }));

    const file = createFile('bad.itsjust.json', JSON.stringify({ notASchema: 'nope' }));

    let importResult: Awaited<ReturnType<typeof result.current.importFromFile>> | undefined;
    await act(async () => {
      importResult = await result.current.importFromFile(file);
    });
    if (!importResult) throw new Error('Expected importResult');

    expect(importResult!.success).toBe(false);
    if (!importResult?.success) {
      expect(importResult.error).toContain('Invalid .itsjust.json');
    }
  });

  it('imports a plain JSON file', async () => {
    const { result } = renderHook(() => useImport({ acceptedFormats: ['json'] }));

    const file = createFile('data.json', JSON.stringify({ foo: 'bar' }));

    let importResult: Awaited<ReturnType<typeof result.current.importFromFile>> | undefined;
    await act(async () => {
      importResult = await result.current.importFromFile(file);
    });
    if (!importResult) throw new Error('Expected importResult');

    expect(importResult!.success).toBe(true);
    if (importResult?.success) {
      expect(importResult.data).toEqual({ foo: 'bar' });
    }
  });

  it('rejects files exceeding maxFileSize', async () => {
    const { result } = renderHook(() => useImport({ acceptedFormats: ['json'], maxFileSize: 10 }));

    const file = createFile('huge.json', JSON.stringify({ data: 'x'.repeat(100) }));

    let importResult: Awaited<ReturnType<typeof result.current.importFromFile>> | undefined;
    await act(async () => {
      importResult = await result.current.importFromFile(file);
    });
    if (!importResult) throw new Error('Expected importResult');

    expect(importResult!.success).toBe(false);
    if (!importResult?.success) {
      expect(importResult.error).toContain('File too large');
      expect(importResult.error).toContain('Max allowed: 10B');
    }
  });

  it('rejects when extension and MIME type mismatch', async () => {
    const { result } = renderHook(() => useImport({ acceptedFormats: ['json'] }));

    const file = createFile('data.png', JSON.stringify({ foo: 'bar' }), 'application/json');

    let importResult: Awaited<ReturnType<typeof result.current.importFromFile>> | undefined;
    await act(async () => {
      importResult = await result.current.importFromFile(file);
    });
    if (!importResult) throw new Error('Expected importResult');

    expect(importResult!.success).toBe(false);
    if (!importResult?.success) {
      expect(importResult.error).toContain('do not match');
    }
  });

  it('rejects .itsjust.json with invalid toolId', async () => {
    const { result } = renderHook(() => useImport({ acceptedFormats: ['json'] }));

    const file = createFile(
      'test.itsjust.json',
      JSON.stringify({
        $schema: 'https://itsjust.tools/schema/v1',
        version: '1.0.0',
        toolId: 123,
        content: { text: 'hello' },
      })
    );

    let importResult: Awaited<ReturnType<typeof result.current.importFromFile>> | undefined;
    await act(async () => {
      importResult = await result.current.importFromFile(file);
    });
    if (!importResult) throw new Error('Expected importResult');

    expect(importResult!.success).toBe(false);
    if (!importResult?.success) {
      expect(importResult.error).toContain('Invalid .itsjust.json');
    }
  });

  it('handles .itsjust.json parse error', async () => {
    const { result } = renderHook(() => useImport({ acceptedFormats: ['json'] }));

    const file = new File(['not json'], 'test.itsjust.json', { type: 'application/json' });

    let importResult: Awaited<ReturnType<typeof result.current.importFromFile>> | undefined;
    await act(async () => {
      importResult = await result.current.importFromFile(file);
    });
    if (!importResult) throw new Error('Expected importResult');

    expect(importResult!.success).toBe(false);
    if (!importResult?.success) {
      expect(importResult.error).toBeTruthy();
    }
  });

  it('handles unsupported binary format', async () => {
    const { result } = renderHook(() => useImport({ acceptedFormats: ['png'] }));

    const file = createFile('data.bin', 'binary', 'application/octet-stream');

    let importResult: Awaited<ReturnType<typeof result.current.importFromFile>> | undefined;
    await act(async () => {
      importResult = await result.current.importFromFile(file);
    });
    if (!importResult) throw new Error('Expected importResult');

    expect(importResult!.success).toBe(false);
    if (!importResult?.success) {
      expect(importResult.error).toContain('Unsupported');
    }
  });

  it('returns error when importFromEvent has no file', async () => {
    const { result } = renderHook(() => useImport({ acceptedFormats: ['json'] }));

    let importResult: Awaited<ReturnType<typeof result.current.importFromEvent>> | undefined;
    await act(async () => {
      importResult = await result.current.importFromEvent({
        target: { files: null },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    if (!importResult) throw new Error('Expected importResult');

    expect(importResult!.success).toBe(false);
    if (!importResult?.success) {
      expect(importResult.error).toBe('No file selected');
    }
  });

  it('clears last import', async () => {
    const onImport = vi.fn();
    const { result } = renderHook(() => useImport({ acceptedFormats: ['json'], onImport }));

    const file = createFile('data.json', JSON.stringify({ foo: 'bar' }));

    await act(async () => {
      await result.current.importFromFile(file);
    });

    expect(result.current.lastImport).not.toBeNull();

    act(() => {
      result.current.clearImport();
    });

    expect(result.current.lastImport).toBeNull();
  });
});
