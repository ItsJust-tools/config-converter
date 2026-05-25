import type { ExportFormat } from './tool-config';

export interface ExportOptions {
  format: ExportFormat;
  quality?: number;
  scale?: number;
  filename?: string;
  background?: string;
  padding?: number;
  orientation?: 'portrait' | 'landscape' | 'auto';
  allowSensitiveData?: boolean;
  signal?: AbortSignal;
}

export interface ExportResult {
  success: boolean;
  data: Blob | string | null;
  filename: string;
  format: ExportFormat;
  error?: string;
}

export interface Exporter {
  format: ExportFormat;
  export: (
    element: HTMLElement,
    options: ExportOptions,
    stateSerializer?: () => string
  ) => Promise<ExportResult>;
}

export type ExporterLoader = () => Promise<{ default: Exporter } | { exporter: Exporter }>;

export const formatLabels = {
  png: 'PNG Image',
  jpeg: 'JPEG Image',
  webp: 'WebP Image',
  pdf: 'PDF Document',
  json: 'JSON Data',
} satisfies Record<ExportFormat, string>;
