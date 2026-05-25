import type { ExportFormat, ExportOptions, ExportResult, Exporter, ExporterLoader } from '../types';
import { jsonExporter, exporterLoaders } from './exporters';

const ALLOWED_DOWNLOAD_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/json',
  'text/plain',
]);

function triggerDownload(result: ExportResult): void {
  if (!result.success || !result.data) return;

  const blob =
    result.data instanceof Blob ? result.data : new Blob([result.data], { type: 'text/plain' });
  if (!ALLOWED_DOWNLOAD_TYPES.has(blob.type)) {
    console.error(`[triggerDownload] Blocked unsafe blob type: ${blob.type}`);
    return;
  }
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename.replace(/[\/\\:?*"<>|]/g, '_');
  link.style.display = 'none';
  if (!document.body) {
    console.error('[triggerDownload] Document body is not ready');
    URL.revokeObjectURL(url);
    return;
  }
  document.body.appendChild(link);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    window.open(url, '_blank');
  } else {
    link.click();
  }
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export class ExportEngine {
  private exporters: Partial<Record<ExportFormat, Exporter>> = { json: jsonExporter };
  private localLoaders: Partial<Record<ExportFormat, ExporterLoader>>;
  private cachedFormats: ExportFormat[] = [];
  private maxExporterCacheSize: number;

  constructor(
    localLoaders?: Partial<Record<ExportFormat, ExporterLoader>>,
    maxExporterCacheSize = 6
  ) {
    this.localLoaders = { ...localLoaders };
    this.maxExporterCacheSize = Math.max(1, maxExporterCacheSize);
  }

  registerExporter(exporter: Exporter): void {
    this.exporters[exporter.format] = exporter;
    if (exporter.format !== 'json') {
      this.touchCache(exporter.format);
    }
  }

  getSupportedFormats(): ExportFormat[] {
    return Object.keys(this.exporters) as ExportFormat[];
  }

  private touchCache(format: ExportFormat): void {
    if (format === 'json') return;
    this.cachedFormats = this.cachedFormats.filter((f) => f !== format);
    this.cachedFormats.push(format);
    while (this.cachedFormats.length > this.maxExporterCacheSize) {
      const evict = this.cachedFormats.shift();
      if (evict) {
        delete this.exporters[evict];
      }
    }
  }

  async loadExporter(format: ExportFormat): Promise<Exporter | undefined> {
    if (this.exporters[format]) {
      this.touchCache(format);
      return this.exporters[format];
    }

    const loader = this.localLoaders[format] ?? exporterLoaders[format];
    if (!loader) return undefined;

    const mod = await loader();
    const exporter = 'default' in mod ? mod.default : mod.exporter;
    this.exporters[format] = exporter;
    this.touchCache(format);
    return exporter;
  }

  async export(
    element: HTMLElement,
    options: ExportOptions,
    stateSerializer?: () => string
  ): Promise<ExportResult> {
    const exporter = await this.loadExporter(options.format);
    if (!exporter) {
      return {
        success: false,
        data: null,
        filename: options.filename ?? `export-${Date.now()}`,
        format: options.format,
        error: `No exporter registered for format: ${options.format}`,
      };
    }
    return exporter.export(element, options, stateSerializer);
  }

  async exportAndDownload(
    element: HTMLElement,
    options: ExportOptions,
    stateSerializer?: () => string
  ): Promise<ExportResult> {
    const result = await this.export(element, options, stateSerializer);
    if (result.success) {
      triggerDownload(result);
    }
    return result;
  }
}

export function createExportEngine(
  localLoaders?: Partial<Record<ExportFormat, ExporterLoader>>,
  maxExporterCacheSize?: number
): ExportEngine {
  return new ExportEngine(localLoaders, maxExporterCacheSize);
}
