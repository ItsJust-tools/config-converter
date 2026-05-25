import type { ExportFormat, ExportOptions, ExportResult, Exporter } from '@itsjust/core';
import { toBlob } from 'html-to-image';

export function formatExportError(error: unknown, format: string): string {
  const base = error instanceof Error ? error.message : `${format} export failed`;
  const isCors = /cors|cross-origin|tainted|security/i.test(base);
  if (isCors) {
    return `${base}. Try removing external images or enable CORS on your assets.`;
  }
  return base;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Export aborted', 'AbortError');
  }
}

interface SavedStyle {
  el: HTMLElement;
  prop: string;
  value: string;
}

function saveStyle(saved: SavedStyle[], el: HTMLElement, prop: string) {
  saved.push({ el, prop, value: el.style.getPropertyValue(prop) });
}

function restoreStyles(saved: SavedStyle[]) {
  for (const { el, prop, value } of saved.reverse()) {
    el.style.setProperty(prop, value);
  }
}

export async function renderToImage(
  element: HTMLElement,
  options: ExportOptions
): Promise<HTMLCanvasElement> {
  throwIfAborted(options.signal);
  if (!options.allowSensitiveData) {
    const sensitive = element.querySelector('input[type="password"], [data-sensitive="true"]');
    if (sensitive) {
      throw new Error('Export blocked: sensitive elements detected');
    }
  }

  throwIfAborted(options.signal);

  const saved: SavedStyle[] = [];

  // Remember original DOM position so we can move the element back
  const parent = element.parentNode;
  const nextSibling = element.nextSibling;
  const originalWidth = element.offsetWidth;

  // Create an off-screen container with unlimited space
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-9999px';
  container.style.width = `${originalWidth}px`;
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-1';

  // Move the original element into the off-screen container
  container.appendChild(element);
  document.body.appendChild(container);

  // Expand the element so nothing clips
  saveStyle(saved, element, 'overflow');
  saveStyle(saved, element, 'height');
  saveStyle(saved, element, 'min-height');
  element.style.overflow = 'visible';
  element.style.height = 'auto';
  element.style.minHeight = '0';

  // Inline computed background so theme survives SVG serialization
  const computedBg = window.getComputedStyle(element).backgroundColor;
  if (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent') {
    saveStyle(saved, element, 'background-color');
    element.style.backgroundColor = computedBg;
  }

  // Expand textarea to its full scroll height
  const textarea = element.querySelector('textarea');
  if (textarea) {
    const ta = textarea as HTMLTextAreaElement;
    saveStyle(saved, ta, 'flex');
    saveStyle(saved, ta, 'height');
    saveStyle(saved, ta, 'min-height');
    saveStyle(saved, ta, 'max-height');
    saveStyle(saved, ta, 'overflow');
    ta.style.flex = 'none';
    ta.style.height = `${ta.scrollHeight}px`;
    ta.style.minHeight = '0';
    ta.style.maxHeight = 'none';
    ta.style.overflow = 'visible';
  }

  try {
    const blob = await toBlob(element, {
      pixelRatio: options.scale ?? 2,
      cacheBust: true,
      skipFonts: true,
    });

    if (!blob) {
      throw new Error('Failed to create image blob');
    }

    const canvas = document.createElement('canvas');
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(img.src);

    return canvas;
  } finally {
    restoreStyles(saved);
    // Move element back to its original position in the DOM
    if (parent) {
      if (nextSibling) {
        parent.insertBefore(element, nextSibling);
      } else {
        parent.appendChild(element);
      }
    }
    container.remove();
  }
}

export function createCanvasExporter(
  format: ExportFormat,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
  defaultExt: 'png' | 'jpg' | 'webp',
  defaultQuality?: number
): Exporter {
  return {
    format,
    export: async (element, options): Promise<ExportResult> => {
      try {
        const canvas = await renderToImage(element, options);
        const quality = options.quality ?? defaultQuality;
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
            mimeType,
            quality
          );
        });
        return {
          success: true,
          data: blob,
          filename: options.filename ?? `export-${Date.now()}.${defaultExt}`,
          format,
        };
      } catch (error) {
        return {
          success: false,
          data: null,
          filename: options.filename ?? `export-${Date.now()}.${defaultExt}`,
          format,
          error: formatExportError(error, format.toUpperCase()),
        };
      }
    },
  };
}
