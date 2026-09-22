import { describe, it, expect, vi } from 'vitest';
import { ExportEngine } from '../../src/engines/export-engine';
import type { Exporter, ExportOptions } from '../../src/types';

describe('ExportEngine', () => {
  it('lists built-in formats', () => {
    const engine = new ExportEngine();
    const formats = engine.getSupportedFormats();
    expect(formats).toContain('json');
  });

  it('registers a custom exporter', () => {
    const engine = new ExportEngine();
    const customExporter: Exporter = {
      format: 'json',
      export: async (_el, _opts, serializer) => ({
        success: true,
        data: serializer?.() ?? '{}',
        filename: 'custom.json',
        format: 'json',
      }),
    };

    engine.registerExporter(customExporter);
    expect(engine.getSupportedFormats()).toContain('json');
  });

  it('returns error for unsupported format', async () => {
    const engine = new ExportEngine();
    const result = await engine.export(document.createElement('div'), {
      format: 'xml',
    } as unknown as ExportOptions);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No exporter');
  });

  it('returns error for format without loader', async () => {
    const engine = new ExportEngine();
    const result = await engine.export(document.createElement('div'), {
      format: 'webp',
    } as ExportOptions);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No exporter');
  });

  it('registers and uses a lazy-loaded exporter', async () => {
    const engine = new ExportEngine();
    const customExporter: Exporter = {
      format: 'json',
      export: async () => ({
        success: true,
        data: '{"test":true}',
        filename: 'test.json',
        format: 'json',
      }),
    };

    engine.registerExporter(customExporter);
    const result = await engine.export(document.createElement('div'), {
      format: 'json',
    } as ExportOptions);
    expect(result.success).toBe(true);
  });

  it('triggers download and revokes blob URL after delay', async () => {
    vi.useFakeTimers();
    const engine = new ExportEngine();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      // Capture the sanitized download attribute at click time.
      lastDownloadName = this.download;
    });
    let lastDownloadName = '';

    await engine.exportAndDownload(
      document.createElement('div'),
      { format: 'json', filename: 'test.json' },
      () => '{"test":true}'
    );

    expect(clickSpy).toHaveBeenCalled();
    expect(lastDownloadName).toBe('test.json');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');

    clickSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.useRealTimers();
  });

  it('sanitizes unsafe filenames before download (issue #74)', async () => {
    vi.useFakeTimers();
    const engine = new ExportEngine();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();

    let lastDownloadName = '';
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      lastDownloadName = this.download;
    });

    const result = await engine.exportAndDownload(
      document.createElement('div'),
      { format: 'json', filename: 'bad: name?.json' },
      () => '{"test":true}'
    );

    expect(result.success).toBe(true);
    // Result filename is sanitized by the exporter itself.
    expect(result.filename).toBe('bad- name-.json');
    // The anchor download attribute is also sanitized.
    expect(lastDownloadName).toBe('bad- name-.json');

    clickSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.useRealTimers();
  });

  it('sanitizes filenames returned by custom exporters (defense in depth)', async () => {
    const engine = new ExportEngine();
    engine.registerExporter({
      format: 'json',
      export: async () => ({
        success: true,
        data: '{}',
        filename: 'evil:name*with?bad.chars.json',
        format: 'json',
      }),
    });

    const result = await engine.export(document.createElement('div'), {
      format: 'json',
    } as ExportOptions);
    expect(result.success).toBe(true);
    expect(result.filename).toBe('evil-name-with-bad.chars.json');
  });
});
