'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface UseDragAndDropImportOptions {
  onImport?: (file: File) => void | Promise<unknown>;
  acceptedFormats?: string[];
  targetRef?: RefObject<HTMLElement | null>;
}

const MIME_TO_FORMAT: Record<string, string> = {
  'application/json': 'json',
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export function useDragAndDropImport({
  onImport,
  acceptedFormats,
  targetRef,
}: UseDragAndDropImportOptions = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const file = e.dataTransfer?.files?.[0];
      if (!file || !onImport) return;

      if (acceptedFormats) {
        const loweredName = file.name.toLowerCase();
        const ext = loweredName.endsWith('.itsjust.json')
          ? 'itsjust'
          : (loweredName.split('.').pop()?.toLowerCase() ?? '');
        const mime = file.type;
        const mimeFormat = MIME_TO_FORMAT[mime.toLowerCase()] ?? '';
        const isAccepted = acceptedFormats.some((fmt) => {
          const normalized = fmt.toLowerCase().replace('.json', '');
          return (
            ext === normalized ||
            mimeFormat === normalized ||
            mime.toLowerCase().includes(normalized)
          );
        });
        if (!isAccepted) return;
      }

      onImport(file);
    },
    [onImport, acceptedFormats]
  );

  useEffect(() => {
    const target = targetRef?.current ?? window;
    target.addEventListener('dragenter', handleDragEnter as EventListener);
    target.addEventListener('dragleave', handleDragLeave as EventListener);
    target.addEventListener('dragover', handleDragOver as EventListener);
    target.addEventListener('drop', handleDrop as EventListener);
    return () => {
      target.removeEventListener('dragenter', handleDragEnter as EventListener);
      target.removeEventListener('dragleave', handleDragLeave as EventListener);
      target.removeEventListener('dragover', handleDragOver as EventListener);
      target.removeEventListener('drop', handleDrop as EventListener);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop, targetRef]);

  return { isDragging };
}
