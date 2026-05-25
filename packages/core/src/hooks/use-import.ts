'use client';

import { useCallback, useState } from 'react';
import type { ExportFormat } from '../types';

export type ImportResult =
  | {
      success: true;
      data: unknown;
      fileName?: string;
      format?: ExportFormat;
      isItsJustFile?: boolean;
      toolId?: string;
    }
  | {
      success: false;
      error: string;
      fileName?: string;
      format?: ExportFormat;
      isItsJustFile?: boolean;
    };

export type ImportFormat = ExportFormat | 'itsjust';

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const SUPPORTED_EXTENSIONS = new Set<ExportFormat | 'itsjust'>([
  'png',
  'jpeg',
  'webp',
  'pdf',
  'json',
  'itsjust',
]);

const MIME_TYPE_MAP: Record<string, ExportFormat> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/json': 'json',
};

const MIME_BY_FORMAT: Partial<Record<ExportFormat, string[]>> = {
  png: ['image/png'],
  jpeg: ['image/jpeg', 'image/jpg'],
  webp: ['image/webp'],
  pdf: ['application/pdf'],
  json: ['application/json', 'text/json'],
};
const SHARE_SCHEMA_URI = 'https://itsjust.tools/schema/v1';
const SEMVER_RE = /^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

function getFileExtension(fileName: string): string | null {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith('.itsjust.json')) return 'itsjust';
  const idx = normalized.lastIndexOf('.');
  if (idx <= 0 || idx === fileName.length - 1) return null;
  return normalized.slice(idx + 1);
}

function getFormatFromMimeType(mime: string): ExportFormat | undefined {
  return MIME_TYPE_MAP[mime];
}

function safeJsonParse(text: string): unknown {
  return JSON.parse(text, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error('Potential prototype pollution detected');
    }
    return value;
  });
}

function sanitizeFileName(name: string): string {
  const safe = name.replace(/[/\\<>:"|?*\x00-\x1F]/g, '_').trim();
  return safe.length > 0 ? safe : 'imported-file';
}

export interface UseImportOptions {
  /** Accepted file formats (default: json) */
  acceptedFormats?: ImportFormat[];
  /** Called when a file is selected and imported (client-side only) */
  onImport?: (result: ImportResult) => void;
  /** Called when import fails */
  onImportError?: (error: string, fileName?: string) => void;
  /** Maximum file size in bytes (default: 5MB) */
  maxFileSize?: number;
}

/**
 * Hook that handles client-side file imports. Validates file size, extension,
 * and MIME type before parsing. Supports `.itsjust.json` share files natively.
 *
 * @param options - Accepted formats, optional callback, and max file size.
 *
 * @example
 * const { importFromFile, isImporting } = useImport({ acceptedFormats: ['json'], onImport: handleImport });
 * importFromFile(file);
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidSharePayload(value: unknown): value is {
  $schema: string;
  version: string;
  content: Record<string, unknown>;
  toolId?: string;
} {
  if (!isRecord(value)) return false;
  if (value.$schema !== SHARE_SCHEMA_URI) return false;
  if (typeof value.version !== 'string' || !SEMVER_RE.test(value.version)) return false;
  if (!isRecord(value.content)) return false;
  if ('toolId' in value && typeof value.toolId !== 'string') return false;
  return true;
}

export function useImport({
  acceptedFormats,
  onImport,
  onImportError,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
}: UseImportOptions = {}) {
  const [isImporting, setIsImporting] = useState(false);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);

  const parseFile = useCallback(
    async (file: File): Promise<ImportResult> => {
      const fileName = sanitizeFileName(file.name);
      if (file.size > maxFileSize) {
        return {
          success: false,
          error: `File too large (${formatBytes(file.size)}). Max allowed: ${formatBytes(maxFileSize)}.`,
          fileName,
        };
      }

      // Client-side only - no server upload
      const ext = getFileExtension(file.name);
      const mimeFormat = getFormatFromMimeType(file.type);
      const format: ExportFormat | undefined =
        ext && ext !== 'itsjust' && SUPPORTED_EXTENSIONS.has(ext as ExportFormat | 'itsjust')
          ? (ext as ExportFormat)
          : mimeFormat;

      // Cross-validate extension with MIME type when both are present
      if (ext && ext !== 'itsjust' && mimeFormat && ext !== mimeFormat) {
        return {
          success: false,
          error: `File extension and MIME type do not match: .${ext} vs ${file.type}`,
          fileName,
        };
      }

      // Check for .itsjust.json files (our share format)
      if (ext === 'itsjust') {
        try {
          const text = await file.text();
          const parsed: unknown = safeJsonParse(text);

          if (!isValidSharePayload(parsed)) {
            return {
              success: false,
              error: 'Invalid .itsjust.json file format',
              fileName,
              format: 'json',
              isItsJustFile: true,
            };
          }

          const result: ImportResult = {
            success: true,
            data: parsed.content,
            fileName,
            format: 'json',
            isItsJustFile: true,
            toolId: typeof parsed.toolId === 'string' ? parsed.toolId : undefined,
          };

          setLastImport(result);
          onImport?.(result);
          return result;
        } catch (error) {
          const result: ImportResult = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to parse .itsjust.json file',
            fileName,
            format: 'json',
            isItsJustFile: true,
          };

          setLastImport(result);
          onImport?.(result);
          return result;
        }
      }

      // Standard format handling
      if (acceptedFormats && (!format || !acceptedFormats.includes(format))) {
        const formatLabel = format ? `.${format}` : file.type ? `${file.type}` : 'unknown';
        return {
          success: false,
          error: `Unsupported format: ${formatLabel}. Accepted: ${acceptedFormats.join(', ')}`,
          fileName,
        };
      }

      if (format) {
        const allowedMimes = MIME_BY_FORMAT[format];
        if (file.type && allowedMimes && !allowedMimes.includes(file.type.toLowerCase())) {
          return {
            success: false,
            error: `Unexpected MIME type for .${format}: ${file.type}`,
            fileName,
            format,
          };
        }
      }

      try {
        // For JSON format
        if (format === 'json') {
          const text = await file.text();
          const data: unknown = safeJsonParse(text);

          const result: ImportResult = {
            success: true,
            data,
            fileName,
            format,
          };

          setLastImport(result);
          onImport?.(result);
          return result;
        }

        if (
          !format ||
          (format !== 'png' && format !== 'jpeg' && format !== 'webp' && format !== 'pdf')
        ) {
          return {
            success: false,
            error: `Unsupported binary format: ${format ?? 'unknown'}`,
            fileName,
            format,
          };
        }

        return new Promise<ImportResult>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result: ImportResult = {
              success: true,
              data: reader.result instanceof ArrayBuffer ? reader.result : new ArrayBuffer(0),
              fileName,
              format,
            };
            setLastImport(result);
            onImport?.(result);
            resolve(result);
          };
          reader.onerror = () => {
            const code = reader.error?.name ?? 'UnknownError';
            const result: ImportResult = {
              success: false,
              error: `Failed to read file: ${code}`,
              fileName,
              format,
            };
            setLastImport(result);
            onImport?.(result);
            resolve(result);
          };
          reader.readAsArrayBuffer(file);
        });
      } catch (error) {
        const result: ImportResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to parse file',
          fileName,
          format,
        };

        setLastImport(result);
        onImport?.(result);
        return result;
      }
    },
    [acceptedFormats, onImport, maxFileSize]
  );

  const importFromFile = useCallback(
    async (file: File): Promise<ImportResult> => {
      setIsImporting(true);
      try {
        const result = await parseFile(file);
        if (!result.success) {
          onImportError?.(result.error, result.fileName);
        }
        return result;
      } finally {
        setIsImporting(false);
      }
    },
    [parseFile, onImportError]
  );

  const importFromEvent = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<ImportResult> => {
      const file = event.target.files?.[0];
      if (!file) {
        return {
          success: false,
          error: 'No file selected',
        };
      }

      return importFromFile(file);
    },
    [importFromFile]
  );

  const clearImport = useCallback(() => {
    setLastImport(null);
  }, []);

  return {
    isImporting,
    lastImport,
    importFromFile,
    importFromEvent,
    clearImport,
  };
}
