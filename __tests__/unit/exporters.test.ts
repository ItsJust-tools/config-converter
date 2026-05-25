import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatExportError,
  throwIfAborted,
  renderToImage,
  createCanvasExporter,
} from '@/tool/exporters/utils';
import pdfExporter from '@/tool/exporters/pdf';
import type { ExportOptions } from '@itsjust/core';

const toBlobMock = vi.fn();

vi.mock('html-to-image', () => ({
  toBlob: (...args: unknown[]) => toBlobMock(...args),
  toPng: vi.fn(),
}));

function mockImageClass(width: number, height: number) {
  return class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = width;
    naturalHeight = height;
    private _src = '';
    get src() {
      return this._src;
    }
    set src(value: string) {
      this._src = value;
      queueMicrotask(() => this.onload?.());
    }
  };
}

function createFakeCanvasContext() {
  return {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('exporters', () => {
  const makeOptions = (overrides: Partial<ExportOptions> = {}): ExportOptions => ({
    format: 'png',
    ...overrides,
  });

  let getContextSpy: ReturnType<typeof vi.spyOn>;
  let canvasToBlobSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    toBlobMock.mockReset();
    document.body.innerHTML = '';
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createFakeCanvasContext());
    canvasToBlobSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((cb) => cb(new Blob(['fake'], { type: 'image/png' })));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    getContextSpy?.mockRestore();
    canvasToBlobSpy?.mockRestore();
    vi.restoreAllMocks();
  });

  describe('formatExportError', () => {
    it('formats cors errors with guidance', () => {
      const msg = formatExportError(new Error('CORS blocked image'), 'PNG');
      expect(msg).toContain('enable CORS');
    });

    it('returns the error message for generic errors', () => {
      const msg = formatExportError(new Error('Something broke'), 'PNG');
      expect(msg).toBe('Something broke');
    });

    it('returns a fallback message for non-error values', () => {
      const msg = formatExportError(null, 'PNG');
      expect(msg).toBe('PNG export failed');
    });

    it('detects "tainted" as a CORS keyword', () => {
      const msg = formatExportError(new Error('Canvas is tainted'), 'PNG');
      expect(msg).toContain('enable CORS');
    });

    it('detects "security" as a CORS keyword', () => {
      const msg = formatExportError(new Error('Security error'), 'WEBP');
      expect(msg).toContain('enable CORS');
    });
  });

  describe('throwIfAborted', () => {
    it('throws abort error when signal is aborted', () => {
      const ctrl = new AbortController();
      ctrl.abort();
      expect(() => throwIfAborted(ctrl.signal)).toThrowError(/Export aborted/);
    });

    it('does not throw when signal is undefined', () => {
      expect(() => throwIfAborted(undefined)).not.toThrow();
    });

    it('does not throw when signal is active', () => {
      const ctrl = new AbortController();
      expect(() => throwIfAborted(ctrl.signal)).not.toThrow();
    });
  });

  describe('renderToImage', () => {
    it('renders image via html-to-image with correct options', async () => {
      const wrapper = document.createElement('div');
      const el = document.createElement('div');
      el.className = 'notepad-canvas';
      Object.defineProperty(el, 'offsetWidth', { value: 300, writable: true });
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(200, 100));

      const result = await renderToImage(el, makeOptions({ allowSensitiveData: true, scale: 3 }));

      expect(result).toBeInstanceOf(HTMLCanvasElement);
      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
      expect(toBlobMock).toHaveBeenCalledTimes(1);
      const firstCall = toBlobMock.mock.calls[0];
      expect(firstCall).toBeDefined();
      if (!firstCall) throw new Error('missing toBlob call');
      expect(firstCall[1]).toMatchObject({
        pixelRatio: 3,
        cacheBust: true,
        skipFonts: true,
      });
      expect(firstCall[0]).toBe(el);
      expect(el.parentNode).toBe(wrapper);

      vi.stubGlobal('Image', originalImage);
    });

    it('expands textarea to capture full scrolled content', async () => {
      const container = document.createElement('div');
      container.className = 'notepad-canvas';
      Object.defineProperty(container, 'offsetWidth', { value: 300, writable: true });

      const textarea = document.createElement('textarea');
      textarea.value = 'Line 1\nLine 2\nLine 3';
      Object.defineProperty(textarea, 'scrollHeight', { value: 600, writable: true });
      container.appendChild(textarea);
      document.body.appendChild(container);

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(200, 100));

      await renderToImage(container, makeOptions({ allowSensitiveData: true }));

      expect(textarea.style.height).toBe('');
      expect(textarea.style.flex).toBe('');
      expect(textarea.style.overflow).toBe('');

      const firstCall = toBlobMock.mock.calls[0];
      expect(firstCall).toBeDefined();
      if (!firstCall) throw new Error('missing toBlob call');
      expect(firstCall[0]).toBe(container);
      expect(container.parentNode).toBe(document.body);

      vi.stubGlobal('Image', originalImage);
      container.remove();
    });

    it('inlines computed background color on the element', async () => {
      const wrapper = document.createElement('div');
      const el = document.createElement('div');
      el.className = 'notepad-canvas';
      Object.defineProperty(el, 'offsetWidth', { value: 300, writable: true });
      // Simulate a dark-theme background
      el.style.backgroundColor = 'rgb(28, 34, 51)';
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(200, 100));

      await renderToImage(el, makeOptions({ allowSensitiveData: true }));

      // Background was restored after export
      expect(el.style.backgroundColor).toBe('rgb(28, 34, 51)');

      vi.stubGlobal('Image', originalImage);
    });

    it('blocks sensitive exports by default', async () => {
      const el = document.createElement('div');
      const input = document.createElement('input');
      input.type = 'password';
      el.appendChild(input);

      await expect(renderToImage(el, makeOptions())).rejects.toThrowError(
        /sensitive elements detected/
      );
    });

    it('allows sensitive exports when explicitly permitted', async () => {
      const el = document.createElement('div');
      const input = document.createElement('input');
      input.type = 'password';
      el.appendChild(input);

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(200, 100));

      await expect(
        renderToImage(el, makeOptions({ allowSensitiveData: true }))
      ).resolves.toBeInstanceOf(HTMLCanvasElement);

      vi.stubGlobal('Image', originalImage);
    });

    it('throws when blob creation returns null', async () => {
      const el = document.createElement('div');
      el.className = 'notepad-canvas';
      Object.defineProperty(el, 'offsetWidth', { value: 300, writable: true });
      document.body.appendChild(el);

      toBlobMock.mockResolvedValue(null);

      await expect(renderToImage(el, makeOptions({ allowSensitiveData: true }))).rejects.toThrow(
        /Failed to create image blob/
      );
    });

    it('throws when image loading fails', async () => {
      const el = document.createElement('div');
      el.className = 'notepad-canvas';
      Object.defineProperty(el, 'offsetWidth', { value: 300, writable: true });
      document.body.appendChild(el);

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal(
        'Image',
        class FailingImage {
          onload: (() => void) | null = null;
          onerror: (() => void) | null = null;
          naturalWidth = 0;
          naturalHeight = 0;
          private _src = '';
          get src() {
            return this._src;
          }
          set src(value: string) {
            this._src = value;
            queueMicrotask(() => this.onerror?.());
          }
        }
      );

      await expect(renderToImage(el, makeOptions({ allowSensitiveData: true }))).rejects.toThrow(
        /Failed to load image/
      );

      vi.stubGlobal('Image', originalImage);
    });

    it('restores DOM position even when export fails', async () => {
      const wrapper = document.createElement('div');
      const el = document.createElement('div');
      el.className = 'notepad-canvas';
      Object.defineProperty(el, 'offsetWidth', { value: 300, writable: true });
      wrapper.appendChild(el);
      document.body.appendChild(wrapper);

      toBlobMock.mockRejectedValue(new Error('Export failed'));

      await expect(renderToImage(el, makeOptions({ allowSensitiveData: true }))).rejects.toThrow(
        /Export failed/
      );

      // Element should be back in its original position
      expect(el.parentNode).toBe(wrapper);
    });

    it('restores original styles even when export fails', async () => {
      const el = document.createElement('div');
      el.className = 'notepad-canvas';
      el.style.overflow = 'auto';
      el.style.height = '500px';
      Object.defineProperty(el, 'offsetWidth', { value: 300, writable: true });
      document.body.appendChild(el);

      toBlobMock.mockRejectedValue(new Error('Export failed'));

      await expect(renderToImage(el, makeOptions({ allowSensitiveData: true }))).rejects.toThrow();

      expect(el.style.overflow).toBe('auto');
      expect(el.style.height).toBe('500px');
    });

    it('respects abort signal before sensitive check', async () => {
      const ctrl = new AbortController();
      ctrl.abort();

      const el = document.createElement('div');
      await expect(renderToImage(el, makeOptions({ signal: ctrl.signal }))).rejects.toThrowError(
        /Export aborted/
      );
    });

    it('does not check abort after toBlob resolves', async () => {
      const el = document.createElement('div');
      el.className = 'notepad-canvas';
      Object.defineProperty(el, 'offsetWidth', { value: 300, writable: true });
      document.body.appendChild(el);

      const ctrl = new AbortController();
      toBlobMock.mockImplementation(() => {
        ctrl.abort();
        return Promise.resolve(new Blob(['fake-image'], { type: 'image/png' }));
      });

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(200, 100));

      // Abort during toBlob is too late — function completes successfully
      await expect(
        renderToImage(el, makeOptions({ allowSensitiveData: true, signal: ctrl.signal }))
      ).resolves.toBeInstanceOf(HTMLCanvasElement);

      vi.stubGlobal('Image', originalImage);
    });

    it('uses default pixel ratio of 2 when scale is not provided', async () => {
      const el = document.createElement('div');
      el.className = 'notepad-canvas';
      Object.defineProperty(el, 'offsetWidth', { value: 300, writable: true });
      document.body.appendChild(el);

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(200, 100));

      await renderToImage(el, makeOptions({ allowSensitiveData: true }));

      const firstCall = toBlobMock.mock.calls[0];
      expect(firstCall).toBeDefined();
      if (!firstCall) throw new Error('missing toBlob call');
      expect(firstCall[1]).toMatchObject({ pixelRatio: 2 });

      vi.stubGlobal('Image', originalImage);
    });

    it('exports empty textarea without error', async () => {
      const container = document.createElement('div');
      container.className = 'notepad-canvas';
      Object.defineProperty(container, 'offsetWidth', { value: 300, writable: true });

      const textarea = document.createElement('textarea');
      textarea.value = '';
      Object.defineProperty(textarea, 'scrollHeight', { value: 0, writable: true });
      container.appendChild(textarea);
      document.body.appendChild(container);

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(200, 100));

      await expect(
        renderToImage(container, makeOptions({ allowSensitiveData: true }))
      ).resolves.toBeInstanceOf(HTMLCanvasElement);

      vi.stubGlobal('Image', originalImage);
      container.remove();
    });

    it('handles textarea with special characters', async () => {
      const container = document.createElement('div');
      container.className = 'notepad-canvas';
      Object.defineProperty(container, 'offsetWidth', { value: 300, writable: true });

      const textarea = document.createElement('textarea');
      textarea.value = 'Emoji 🎉\nHTML <script>&\n"quotes"';
      Object.defineProperty(textarea, 'scrollHeight', { value: 100, writable: true });
      container.appendChild(textarea);
      document.body.appendChild(container);

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(200, 100));

      await expect(
        renderToImage(container, makeOptions({ allowSensitiveData: true }))
      ).resolves.toBeInstanceOf(HTMLCanvasElement);

      // Verify value was preserved through export
      expect(textarea.value).toBe('Emoji 🎉\nHTML <script>&\n"quotes"');

      vi.stubGlobal('Image', originalImage);
      container.remove();
    });

    it('handles element without textarea', async () => {
      const el = document.createElement('div');
      el.className = 'plain-div';
      el.textContent = 'Just some text';
      Object.defineProperty(el, 'offsetWidth', { value: 300, writable: true });
      document.body.appendChild(el);

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(200, 100));

      await expect(
        renderToImage(el, makeOptions({ allowSensitiveData: true }))
      ).resolves.toBeInstanceOf(HTMLCanvasElement);

      vi.stubGlobal('Image', originalImage);
      el.remove();
    });
  });

  describe('createCanvasExporter', () => {
    it('creates image exporter success and failure results', async () => {
      const el = document.createElement('div');
      el.className = 'notepad-canvas';

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(100, 50));

      const exporter = createCanvasExporter('png', 'image/png', 'png');
      const ok = await exporter.export(
        el,
        makeOptions({ format: 'png', filename: 'a.png', allowSensitiveData: true })
      );
      expect(ok.success).toBe(true);
      expect(ok.filename).toBe('a.png');

      // Force failure by making toBlob return null
      toBlobMock.mockResolvedValue(null);

      const failed = await exporter.export(
        el,
        makeOptions({ format: 'png', filename: 'b.png', allowSensitiveData: true })
      );
      expect(failed.success).toBe(false);
      expect(failed.error).toContain('Failed to create image blob');

      vi.stubGlobal('Image', originalImage);
    });

    it('passes format-specific mime type and quality to canvas toBlob', async () => {
      const el = document.createElement('div');
      el.className = 'notepad-canvas';

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(10, 10));

      const toBlobSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'toBlob')
        .mockImplementation((cb) => cb(new Blob(['ok'])));

      const jpegExporter = createCanvasExporter('jpeg', 'image/jpeg', 'jpg', 0.92);
      const webpExporter = createCanvasExporter('webp', 'image/webp', 'webp', 0.9);

      await jpegExporter.export(el, makeOptions({ format: 'jpeg', allowSensitiveData: true }));
      await webpExporter.export(el, makeOptions({ format: 'webp', allowSensitiveData: true }));

      expect(toBlobSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 'image/jpeg', 0.92);
      expect(toBlobSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 'image/webp', 0.9);
      toBlobSpy.mockRestore();
      vi.stubGlobal('Image', originalImage);
    });

    it('uses default filename with timestamp when none provided', async () => {
      const el = document.createElement('div');
      el.className = 'notepad-canvas';

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(10, 10));

      const exporter = createCanvasExporter('png', 'image/png', 'png');
      const result = await exporter.export(el, makeOptions({ allowSensitiveData: true }));

      expect(result.filename).toMatch(/^export-\d+\.png$/);

      vi.stubGlobal('Image', originalImage);
    });

    it('produces correct ExportResult shape on success', async () => {
      const el = document.createElement('div');
      el.className = 'notepad-canvas';

      toBlobMock.mockResolvedValue(new Blob(['fake-image'], { type: 'image/png' }));

      const originalImage = globalThis.Image;
      vi.stubGlobal('Image', mockImageClass(10, 10));

      const exporter = createCanvasExporter('png', 'image/png', 'png');
      const result = await exporter.export(
        el,
        makeOptions({ format: 'png', filename: 'test.png', allowSensitiveData: true })
      );

      expect(result).toMatchObject({
        success: true,
        filename: 'test.png',
        format: 'png',
      });
      expect(result.data).toBeInstanceOf(Blob);
      expect(result.error).toBeUndefined();

      vi.stubGlobal('Image', originalImage);
    });

    it('produces correct ExportResult shape on failure', async () => {
      const el = document.createElement('div');
      el.className = 'notepad-canvas';

      toBlobMock.mockResolvedValue(null);

      const exporter = createCanvasExporter('png', 'image/png', 'png');
      const result = await exporter.export(
        el,
        makeOptions({ format: 'png', filename: 'fail.png', allowSensitiveData: true })
      );

      expect(result).toMatchObject({
        success: false,
        filename: 'fail.png',
        format: 'png',
      });
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('pdfExporter', () => {
    it('exports pdf successfully via iframe print', async () => {
      const el = document.createElement('div');
      el.textContent = 'pdf text';

      const printMock = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedDoc: any = null;

      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        if (node instanceof HTMLIFrameElement || (node as HTMLElement).tagName === 'IFRAME') {
          const iframe = node as HTMLIFrameElement;
          const mockDoc = {
            open: vi.fn(),
            write: vi.fn(),
            close: vi.fn(),
          };
          capturedDoc = mockDoc;
          Object.defineProperty(iframe, 'contentDocument', {
            get: () => mockDoc,
            configurable: true,
          });
          Object.defineProperty(iframe, 'contentWindow', {
            get: () => ({ print: printMock }),
            configurable: true,
          });
        }
        return node;
      });

      const result = await pdfExporter.export(
        el,
        makeOptions({ format: 'pdf', filename: 'x.pdf', allowSensitiveData: true })
      );

      expect(result.success).toBe(true);
      expect(result.filename).toBe('x.pdf');
      expect(printMock).toHaveBeenCalledTimes(1);
      expect(capturedDoc?.write).toHaveBeenCalledTimes(1);

      appendChildSpy.mockRestore();
    });

    it('returns error when pdf iframe fails to create', async () => {
      const el = document.createElement('div');

      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        if (node instanceof HTMLIFrameElement || (node as HTMLElement).tagName === 'IFRAME') {
          const iframe = node as HTMLIFrameElement;
          Object.defineProperty(iframe, 'contentDocument', {
            get: () => null,
            configurable: true,
          });
        }
        return node;
      });

      const result = await pdfExporter.export(
        el,
        makeOptions({ format: 'pdf', filename: 'fail.pdf', allowSensitiveData: true })
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create print iframe');

      appendChildSpy.mockRestore();
    });

    it('includes tool content in pdf iframe HTML', async () => {
      const el = document.createElement('div');
      el.innerHTML = '<h1>Test Title</h1><p>Test paragraph</p>';

      let capturedHtml = '';
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        if (node instanceof HTMLIFrameElement || (node as HTMLElement).tagName === 'IFRAME') {
          const iframe = node as HTMLIFrameElement;
          const mockDoc = {
            open: vi.fn(),
            write: vi.fn((html: string) => {
              capturedHtml = html;
            }),
            close: vi.fn(),
          };
          Object.defineProperty(iframe, 'contentDocument', {
            get: () => mockDoc,
            configurable: true,
          });
          Object.defineProperty(iframe, 'contentWindow', {
            get: () => ({ print: vi.fn() }),
            configurable: true,
          });
        }
        return node;
      });

      await pdfExporter.export(
        el,
        makeOptions({ format: 'pdf', filename: 'content.pdf', allowSensitiveData: true })
      );

      expect(capturedHtml).toContain('Test Title');
      expect(capturedHtml).toContain('Test paragraph');

      appendChildSpy.mockRestore();
    });
  });
});
