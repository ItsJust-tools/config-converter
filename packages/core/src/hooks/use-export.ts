'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExportFormat, ExportOptions, ToolConfig, ExporterLoader } from '../types';
import { createExportEngine } from '../engines/export-engine';

function getAvailableFormats(
  exporters?: Array<{ format: ExportFormat; loader: ExporterLoader }>
): ExportFormat[] {
  const builtin: ExportFormat[] = ['json'];
  const registered = exporters?.map((e) => e.format) ?? [];
  return [...builtin, ...registered];
}

/**
 * Hook that provides client-side export functionality. Lazy-loads format-specific
 * exporters (image capture, print) on first use so they don't bloat the initial bundle.
 *
 * @param canvasRef - Ref to the DOM element that should be captured for image/PDF exports.
 * @param config - Tool configuration including which export formats are enabled.
 * @param stateSerializer - Optional serializer for JSON/state exports.
 * @param exporters - Declarative exporter registrations with lazy loaders.
 *
 * @example
 * const { exportTo, isExporting, supportedFormats } = useExport(canvasRef, config, serialize);
 * exportTo('png');
 */
export function useExport(
  canvasRef: React.RefObject<HTMLElement | null>,
  config: ToolConfig,
  stateSerializer?: () => string,
  exporters?: Array<{ format: ExportFormat; loader: ExporterLoader }>
) {
  const localLoaders = useMemo(
    () => (exporters ? Object.fromEntries(exporters.map((e) => [e.format, e.loader])) : undefined),
    [exporters]
  );
  const engine = useMemo(() => createExportEngine(localLoaders), [localLoaders]);
  const [isExporting, setIsExporting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasWarnedRef = useRef(false);
  const available = useMemo(() => getAvailableFormats(exporters), [exporters]);
  const missing = useMemo(
    () => config.exportFormats.filter((f) => !available.includes(f)),
    [available, config.exportFormats]
  );
  const supportedFormats = useMemo(
    () => config.exportFormats.filter((f) => available.includes(f)),
    [available, config.exportFormats]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preload = () => {
      const warm = config.exportFormats.filter((f) => f !== 'json').slice(0, 2);
      void Promise.all(warm.map((f) => engine.loadExporter(f)));
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(preload, 250);
    return () => clearTimeout(timer);
  }, [config.exportFormats, engine]);

  useEffect(() => {
    if (missing.length === 0 || hasWarnedRef.current) return;
    hasWarnedRef.current = true;
    console.warn(
      `[useExport] Config declares exportFormats [${missing.join(', ')}] but no exporters are registered for them. ` +
        `Add the corresponding exporter to your Tool definition or remove the format from config.exportFormats.`
    );
  }, [missing]);

  const isExportingRef = useRef(false);

  const abortExport = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const exportTo = useCallback(
    async (format: ExportFormat, options?: Partial<ExportOptions>) => {
      if (isExportingRef.current) return null;
      isExportingRef.current = true;
      if (!canvasRef.current) {
        isExportingRef.current = false;
        return {
          success: false,
          data: null,
          filename: options?.filename ?? `export-${Date.now()}`,
          format,
          error: 'Export target is not ready',
        };
      }
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsExporting(true);

      try {
        const merged: ExportOptions = {
          format,
          scale: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 2,
          background: '#ffffff',
          allowSensitiveData: false,
          ...options,
          signal: controller.signal,
        };
        return await engine.exportAndDownload(canvasRef.current, merged, stateSerializer);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Export failed';
        console.error('[useExport]', message);
        return {
          success: false,
          data: null,
          filename: options?.filename ?? `export-${Date.now()}`,
          format,
          error: message,
        };
      } finally {
        isExportingRef.current = false;
        setIsExporting(false);
        abortControllerRef.current = null;
      }
    },
    [canvasRef, stateSerializer, engine]
  );

  return {
    exportTo,
    abortExport,
    isExporting,
    supportedFormats,
  };
}
