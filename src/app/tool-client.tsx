'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToolShell, useTool, ImportExport } from '@itsjust/core';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import {
  toolConfig,
  templateBaseVersion,
  converterTool,
  convertConfig,
  ToolCanvas,
  ToolToolbar,
  ToolSidebar,
} from '@/tool';
import type { ConversionFormat } from '@/tool';

export default function ToolClient() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const tool = useTool(converterTool, canvasRef);
  const setToolData = tool.state.setData;
  const showToast = tool.toast;
  const [isSharing, setIsSharing] = useState(false);
  const hasLoadedSharedState = useRef(false);
  const isInitialMount = useRef(true);
  const autoConvertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth > 768 && toolConfig.features.sidebar
  );

  const title = toolConfig.name;

  useEffect(() => {
    document.title = title;
  }, [title]);

  // Load shared state from URL
  useEffect(() => {
    if (hasLoadedSharedState.current) return;
    hasLoadedSharedState.current = true;
    const params = new URLSearchParams(window.location.search);
    const encodedState = params.get('state');
    if (!encodedState) return;
    try {
      const serialized = decompressFromEncodedURIComponent(encodedState);
      if (!serialized) throw new Error('Invalid shared URL');
      const parsed: unknown = JSON.parse(serialized);
      const deserialized = converterTool.deserialize(parsed);
      if (!deserialized.success) throw new Error(deserialized.error);
      setToolData(deserialized.data);
      showToast('Loaded state from shared URL', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load shared URL';
      showToast(message, 'error');
    }
  }, [setToolData, showToast]);

  const handleInputFormatChange = useCallback(
    (format: ConversionFormat) => {
      setToolData((prev) => ({ ...prev, inputFormat: format, output: '', error: '' }));
    },
    [setToolData]
  );

  const handleOutputFormatChange = useCallback(
    (format: ConversionFormat) => {
      setToolData((prev) => ({ ...prev, outputFormat: format, output: '', error: '' }));
    },
    [setToolData]
  );

  const handleInputChange = useCallback(
    (input: string) => {
      setToolData((prev) => ({ ...prev, input, output: '', error: '' }));
    },
    [setToolData]
  );

  const handleConvert = useCallback(() => {
    const { output, error } = convertConfig(
      tool.state.data.input,
      tool.state.data.inputFormat,
      tool.state.data.outputFormat,
      {
        minify: tool.state.data.minify,
        indentSize: tool.state.data.indentSize,
        sortKeys: tool.state.data.sortKeys,
      }
    );
    if (error) {
      showToast(error, 'error');
      setToolData((prev) => ({ ...prev, output: '', error }));
    } else {
      setToolData((prev) => ({ ...prev, output, error: '' }));
    }
  }, [tool.state.data, showToast, setToolData]);

  const handleSwapFormats = useCallback(() => {
    setToolData((prev) => ({
      ...prev,
      inputFormat: prev.outputFormat,
      outputFormat: prev.inputFormat,
      input: prev.output || prev.input,
      output: '',
      error: '',
    }));
  }, [setToolData]);

  const handleCopyOutput = useCallback(async () => {
    if (tool.state.data.output) {
      await navigator.clipboard.writeText(tool.state.data.output);
      showToast('Output copied to clipboard', 'success');
    }
  }, [tool.state.data.output, showToast]);

  const handleClear = useCallback(() => {
    setToolData(converterTool.initialState);
    showToast('Cleared', 'success');
  }, [setToolData, showToast]);

  const handleMinifyToggle = useCallback(
    (minify: boolean) => {
      setToolData((prev) => ({ ...prev, minify }));
    },
    [setToolData]
  );

  const handleIndentSizeChange = useCallback(
    (size: number) => {
      setToolData((prev) => ({ ...prev, indentSize: size }));
    },
    [setToolData]
  );

  const handleSortKeysToggle = useCallback(
    (sortKeys: boolean) => {
      setToolData((prev) => ({ ...prev, sortKeys }));
    },
    [setToolData]
  );

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const serialized = converterTool.serialize(tool.state.data);
      const encodedState = compressToEncodedURIComponent(serialized);
      if (!encodedState) throw new Error('Failed to encode state for URL');
      const url = new URL(window.location.href);
      url.searchParams.set('state', encodedState);
      url.searchParams.set('tool', toolConfig.id);
      window.history.replaceState(null, '', url.toString());

      const shareUrl = url.toString();
      if (navigator.share) {
        try {
          await navigator.share({ title, url: shareUrl });
          showToast('Shared URL ready', 'success');
          return;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
        }
      }
      await navigator.clipboard.writeText(shareUrl);
      showToast('Share URL copied to clipboard', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create share URL';
      showToast(message, 'error');
    } finally {
      setIsSharing(false);
    }
  }, [showToast, tool.state.data, title]);

  // Handle tool-specific keyboard shortcuts (Ctrl+Enter, Ctrl+Shift+S, Ctrl+Shift+C)
  // as defined in tool.config.ts
  useEffect(() => {
    function handleKeyboardShortcuts(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === 'Enter') {
        // Ctrl+Enter: Convert
        e.preventDefault();
        handleConvert();
        return;
      }

      if (e.shiftKey) {
        switch (e.key) {
          case 'S':
          case 's':
            // Ctrl+Shift+S: Swap formats
            e.preventDefault();
            handleSwapFormats();
            break;
          case 'C':
          case 'c':
            // Ctrl+Shift+C: Copy output
            e.preventDefault();
            handleCopyOutput();
            break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleConvert, handleSwapFormats, handleCopyOutput]);

  // Auto-convert when input or options change (debounced 300ms).
  // This avoids requiring the user to click "Convert" after every change.
  // Only re-run when any conversion-relevant field changes.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (autoConvertTimerRef.current) {
      clearTimeout(autoConvertTimerRef.current);
    }

    if (tool.state.data.input.trim()) {
      autoConvertTimerRef.current = setTimeout(() => {
        const { output, error } = convertConfig(
          tool.state.data.input,
          tool.state.data.inputFormat,
          tool.state.data.outputFormat,
          {
            minify: tool.state.data.minify,
            indentSize: tool.state.data.indentSize,
            sortKeys: tool.state.data.sortKeys,
          }
        );
        if (error) {
          showToast(error, 'error');
          setToolData((prev) => ({ ...prev, output: '', error }));
        } else {
          setToolData((prev) => ({ ...prev, output, error: '' }));
        }
      }, 300);
    }

    return () => {
      if (autoConvertTimerRef.current) {
        clearTimeout(autoConvertTimerRef.current);
      }
    };
  }, [
    tool.state.data.input,
    tool.state.data.inputFormat,
    tool.state.data.outputFormat,
    tool.state.data.minify,
    tool.state.data.indentSize,
    tool.state.data.sortKeys,
    setToolData,
    showToast,
  ]);

  const toolbarActions = useMemo(() => tool.toolbarActions, [tool.toolbarActions]);

  const toolbarContent = (
    <>
      <ToolToolbar
        state={tool.state.data}
        onConvert={handleConvert}
        onSwapFormats={handleSwapFormats}
        onCopyOutput={handleCopyOutput}
        onClear={handleClear}
      />
      <ImportExport
        formats={tool.supportedFormats}
        onExport={tool.handleExport}
        onImport={tool.importFromFile}
        isImporting={tool.isImporting}
        onShare={handleShare}
        isSharing={isSharing}
      />
    </>
  );

  const sidebarContent = (
    <ToolSidebar
      state={tool.state.data}
      onInputFormatChange={handleInputFormatChange}
      onOutputFormatChange={handleOutputFormatChange}
      onInputChange={handleInputChange}
      onMinifyToggle={handleMinifyToggle}
      onIndentSizeChange={handleIndentSizeChange}
      onSortKeysToggle={handleSortKeysToggle}
    />
  );

  const canvasContent = <ToolCanvas canvasRef={canvasRef} state={tool.state.data} />;

  const statusBarContent = (
    <>
      <span
        className={`status-slot status-slot-state ${tool.state.isDirty ? 'status-unsaved' : 'status-saved'}`}
      >
        {tool.state.isDirty ? (
          <>
            <span className="status-saving-dot" />
            Unsaved
          </>
        ) : tool.state.lastSaved ? (
          <>Saved {tool.state.lastSaved}</>
        ) : (
          'Ready'
        )}
      </span>
      {tool.state.data.output && (
        <span className="status-slot status-slot-length">
          {tool.state.data.output.length.toLocaleString()} chars
        </span>
      )}
      <span className="status-slot status-slot-tool-version">Tool v{toolConfig.version}</span>
      <span className="status-slot status-slot-template-version">
        Template v{templateBaseVersion}
      </span>
    </>
  );

  return (
    <ToolShell
      config={toolConfig}
      actions={toolbarActions}
      sidebarOpen={sidebarOpen}
      onSidebarChange={setSidebarOpen}
      toolbar={toolbarContent}
      sidebar={sidebarContent}
      canvas={canvasContent}
      statusBar={statusBarContent}
    />
  );
}
