import type { ExportFormat, ExporterLoader } from '../../types';

export { default as jsonExporter } from './json';

/** @deprecated Use declarative exporters on the Tool definition instead. */
export const exporterLoaders: Partial<Record<ExportFormat, ExporterLoader>> = {};

/** @deprecated Use declarative exporters on the Tool definition instead. */
export function registerExporterLoader(format: ExportFormat, loader: ExporterLoader): void {
  exporterLoaders[format] = loader;
}
