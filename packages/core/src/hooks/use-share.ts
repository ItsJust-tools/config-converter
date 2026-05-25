'use client';

import { useCallback, useState } from 'react';
import type { ShareData, ShareResult } from '../types';

export interface ShareFileResult extends ShareResult {
  isFile: boolean;
  blob?: Blob;
}

const SHARE_SCHEMA_URI = 'https://itsjust.tools/schema/v1';
const SEMVER_RE = /^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Client-side only share functionality - no server required.
 * Supports:
 * - Download as .itsjust.json file
 * - Web Share API (native sharing on mobile/desktop)
 * - Copy to clipboard
 */
export function useShare() {
  const [isCreating, setIsCreating] = useState(false);
  const [shareResult, setShareResult] = useState<ShareFileResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const withShareOperation = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setIsCreating(true);
    setError(null);
    try {
      return await fn();
    } finally {
      setIsCreating(false);
    }
  }, []);

  /**
   * Create a shareable .itsjust.json file blob - 100% client-side
   */
  const createShareFile = useCallback((data: ShareData): Blob => {
    const schemaVersion = data.metadata?.schemaVersion ?? '1.0.0';
    if (!SEMVER_RE.test(schemaVersion)) {
      throw new Error('Invalid schemaVersion. Expected semver string.');
    }
    const payload = {
      $schema: SHARE_SCHEMA_URI,
      toolId: data.toolId,
      version: schemaVersion,
      content: data.content,
      createdAt: new Date().toISOString(),
    };
    return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  }, []);

  /**
   * Download share as .itsjust.json file - no server involved
   */
  const downloadShareFile = useCallback(
    async (data: ShareData, filename?: string): Promise<void> => {
      return withShareOperation(async () => {
        const blob = createShareFile(data);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = (filename ?? `${data.toolId}-${Date.now()}.itsjust.json`).replace(
          /[\/\\:?*"<>|]/g,
          '_'
        );
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setShareResult({
          id: 'file',
          url: '',
          createdAt: new Date().toISOString(),
          isFile: true,
          blob,
        });
      }).catch((err) => {
        const message = err instanceof Error ? err.message : 'Download failed';
        setError(message);
        throw err;
      });
    },
    [createShareFile, withShareOperation]
  );

  /**
   * Share via Web Share API (native file sharing) - no server involved
   * Returns true if sharing succeeded, false if not supported or cancelled
   */
  const shareViaWeb = useCallback(
    async (data: ShareData, filename?: string): Promise<boolean> => {
      if (!navigator.share) {
        return false;
      }
      return withShareOperation(async () => {
        const blob = createShareFile(data);
        const file = new File([blob], filename ?? `${data.toolId}.itsjust.json`, {
          type: 'application/json',
        });
        if (navigator.canShare && !navigator.canShare({ files: [file] })) {
          return false;
        }

        await navigator.share({
          files: [file],
          title: `Shared ${data.toolId}`,
          text: `Check out this ${data.toolId} project!`,
        });

        setShareResult({
          id: 'web-share',
          url: '',
          createdAt: new Date().toISOString(),
          isFile: true,
        });
        return true;
      }).catch((err) => {
        if (!(err instanceof Error) || err.name !== 'AbortError') {
          const message = err instanceof Error ? err.message : 'Web share failed';
          setError(message);
        }
        return false;
      });
    },
    [createShareFile, withShareOperation]
  );

  /**
   * Copy share file content to clipboard - no server involved
   * Returns true if successful
   */
  const copyShareToClipboard = useCallback(
    async (data: ShareData): Promise<boolean> => {
      return withShareOperation(async () => {
        const blob = createShareFile(data);
        const text = await blob.text();
        await navigator.clipboard.writeText(text);

        setShareResult({
          id: 'clipboard',
          url: '',
          createdAt: new Date().toISOString(),
          isFile: true,
          blob,
        });
        return true;
      }).catch((err) => {
        const message = err instanceof Error ? err.message : 'Copy failed';
        setError(message);
        return false;
      });
    },
    [createShareFile, withShareOperation]
  );

  const clearShare = useCallback(() => {
    setShareResult(null);
    setError(null);
  }, []);

  return {
    createShareFile,
    downloadShareFile,
    shareViaWeb,
    copyShareToClipboard,
    isCreating,
    shareResult,
    error,
    clearShare,
  };
}
