'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { DeserializeResult } from '../tool';

interface UseUrlStateOptions {
  /** Tool ID for the shared URL query param. */
  toolId: string;
  /** Serialize current state to a JSON string. Called on share. */
  serialize: () => string;
  /** Deserialize a parsed JSON payload back into tool state. */
  deserialize: (data: unknown) => DeserializeResult<unknown>;
  /** Called when state is successfully loaded from the URL on mount. */
  onStateLoaded: (data: unknown) => void;
  /** Show a toast notification. */
  showToast: (message: string, type: 'success' | 'error') => void;
}

interface UseUrlStateReturn {
  /** Create a share URL, copy to clipboard (or use Web Share API), and update the address bar. */
  createShareUrl: (title?: string) => Promise<string | null>;
  /** Whether a share URL is being created. */
  isSharing: boolean;
}

/**
 * Hook that reads compressed state from the URL query parameter on mount
 * and provides `createShareUrl` to serialize and share the current state.
 *
 * Uses `lz-string` for compression and supports both the Web Share API
 * (with a system share dialog) and clipboard fallback.
 *
 * @example
 * const { createShareUrl, isSharing } = useUrlState({
 *   toolId: 'my-tool',
 *   serialize: () => JSON.stringify(state),
 *   deserialize: (data) => tool.deserialize(data),
 *   onStateLoaded: (data) => setToolData(data as MyState),
 *   showToast,
 * });
 */
export function useUrlState(options: UseUrlStateOptions): UseUrlStateReturn {
  const { toolId, serialize, deserialize, onStateLoaded, showToast } = options;
  const [isSharing, setIsSharing] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('state');
    if (!encoded) return;
    try {
      const decompressed = decompressFromEncodedURIComponent(encoded);
      if (!decompressed) throw new Error('Invalid shared URL state');
      const parsed: unknown = JSON.parse(decompressed);
      const result = deserialize(parsed);
      if (!result.success) throw new Error(result.error);
      onStateLoaded(result.data);
      showToast('Loaded state from shared URL', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load shared state';
      showToast(msg, 'error');
    }
  }, [toolId, deserialize, onStateLoaded, showToast]);

  const createShareUrl = useCallback(
    async (title?: string): Promise<string | null> => {
      setIsSharing(true);
      try {
        const serialized = serialize();
        const encoded = compressToEncodedURIComponent(serialized);
        if (!encoded) throw new Error('Failed to encode state');
        const url = new URL(window.location.href);
        url.searchParams.set('state', encoded);
        url.searchParams.set('tool', toolId);
        window.history.replaceState(null, '', url.toString());
        const shareUrl = url.toString();
        if (navigator.share && title) {
          try {
            await navigator.share({ title, url: shareUrl });
          } catch (error) {
            // AbortError means the user cancelled the share dialog — not an error
            if (error instanceof Error && error.name !== 'AbortError') throw error;
            return shareUrl;
          }
        } else {
          await navigator.clipboard.writeText(shareUrl);
        }
        showToast('Share URL copied to clipboard', 'success');
        return shareUrl;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to create share URL';
        showToast(msg, 'error');
        return null;
      } finally {
        setIsSharing(false);
      }
    },
    [toolId, serialize, showToast]
  );

  return { createShareUrl, isSharing };
}
