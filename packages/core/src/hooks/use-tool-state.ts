'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import type { AutoSaveOptions, ToolState } from '../types';
import { defaultAutoSaveOptions } from '../types';
import { StorageManager } from '../engines/storage-manager';

const HISTORY_KEY = (key: string) => `itsjust:history:${key}`;
const NAMESPACE_KEY = 'itsjust:storage-namespace';

function initStorageNamespace(): string {
  if (typeof window === 'undefined') return 'default';
  try {
    const existing = localStorage.getItem(NAMESPACE_KEY);
    if (existing) return existing;
    const created =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `ns-${Date.now()}`;
    localStorage.setItem(NAMESPACE_KEY, created);
    return created;
  } catch {
    return 'default';
  }
}

/**
 * Hook that manages tool state with undo/redo, auto-save to localStorage,
 * and dirty-state tracking. Callers must treat state as immutable — never
 * mutate objects in-place or the dirty check will break.
 *
 * @param initial - The initial state value shown on first load.
 * @param options - Auto-save key, debounce, history limits, and schema version.
 *
 * @example
 * const state = useToolState({ text: '' }, { key: 'my-tool', debounceMs: 1000 });
 * state.setData(prev => ({ ...prev, text: 'hello' }));
 * state.undo();
 */
export function useToolState<T>(initial: T, options: Partial<AutoSaveOptions> = {}): ToolState<T> {
  const opts = useMemo(() => ({ ...defaultAutoSaveOptions, ...options }), [options]);
  const [storageNamespace] = useState(initStorageNamespace);
  const storage = useMemo(
    () =>
      opts.storageManager ??
      new StorageManager(`itsjust:${storageNamespace}:${opts.key}`, opts.version ?? '1.0.0'),
    [opts.key, opts.version, opts.storageManager, storageNamespace]
  );
  const historyStorage = useMemo(
    () => opts.historyStorage ?? (typeof window !== 'undefined' ? localStorage : undefined),
    [opts.historyStorage]
  );
  const historyPrefix = opts.historyNamespace ?? storageNamespace;
  const [data, setDataInternal] = useState<T>(initial);
  const historyRef = useRef<T[]>([initial]);
  const futureRef = useRef<T[]>([]);
  const [savedData, setSavedData] = useState<T>(initial);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstDirtyAtRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  // Reference comparison is correct here because setData always produces a new
  // object (via functional update or direct assignment). Immutability is enforced
  // by the API contract — callers must never mutate state in-place.
  const isDirty = data !== savedData;
  const maxHistory = Math.max(1, opts.maxHistoryEntries ?? 50);

  useEffect(() => {
    if (!opts.enabled) return;
    try {
      if (!historyStorage) return;
      const raw = historyStorage.getItem(HISTORY_KEY(`${historyPrefix}:${opts.key}`));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.history) && parsed.history.length > 0) {
          historyRef.current = parsed.history;
          futureRef.current = parsed.future ?? [];
          const current = historyRef.current[historyRef.current.length - 1]!;
          setDataInternal(current);
          setSavedData(current);
          setCanUndo(historyRef.current.length > 1);
          setCanRedo(futureRef.current.length > 0);
          return;
        }
      }
      // Fallback: load from storage manager if no history exists
      const stored = storage.loadEntry<T>(opts.key, opts.version);
      if (stored.status === 'ok' && stored.data !== null) {
        setDataInternal(stored.data);
        setSavedData(stored.data);
        historyRef.current = [stored.data];
      }
      if (stored.status === 'corrupt') {
        console.warn(`[useToolState] Corrupt persisted state detected for "${opts.key}"`);
      }
    } catch {
      // ignore corrupted history/storage
    } finally {
      initializedRef.current = true;
    }
  }, [opts.enabled, opts.key, opts.version, storage, historyPrefix, historyStorage]);

  // Persist history on change
  const persistHistory = useCallback(async () => {
    try {
      if (!historyStorage) return false;
      historyStorage.setItem(
        HISTORY_KEY(`${historyPrefix}:${opts.key}`),
        JSON.stringify({ history: historyRef.current, future: futureRef.current })
      );
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn(`[useToolState] Quota exceeded persisting history for "${opts.key}"`);
      } else {
        console.warn(`[useToolState] Failed to persist history for "${opts.key}"`, error);
      }
      return false;
    }
  }, [opts.key, historyPrefix, historyStorage]);

  useEffect(() => {
    if (!opts.enabled) return;
    if (!initializedRef.current) return;
    const now = Date.now();
    if (firstDirtyAtRef.current === null) {
      firstDirtyAtRef.current = now;
    }
    const elapsed = now - firstDirtyAtRef.current;
    const remainingMaxWait = Math.max(0, opts.maxWaitMs - elapsed);
    const delay = Math.min(opts.debounceMs, remainingMaxWait);

    timerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await storage.save(opts.key, data, opts.version);
        setSavedData(data);
        setLastSaved(new Date().toISOString());
        await persistHistory();
        firstDirtyAtRef.current = null;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn(`[useToolState] Quota exceeded saving state for "${opts.key}"`);
        }
      } finally {
        setIsSaving(false);
      }
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    data,
    opts.enabled,
    opts.debounceMs,
    opts.maxWaitMs,
    opts.key,
    opts.version,
    persistHistory,
    storage,
  ]);

  // Clear timer when auto-save is disabled
  useEffect(() => {
    if (!opts.enabled && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      firstDirtyAtRef.current = null;
      setIsSaving(false);
    }
  }, [opts.enabled]);

  // Warn before closing if there are unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const setData = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setDataInternal((prev) => {
        const next = typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater;
        historyRef.current = [...historyRef.current, next].slice(-maxHistory);
        futureRef.current = [];
        setCanUndo(historyRef.current.length > 1);
        setCanRedo(false);
        return next;
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (history.length <= 1) return;
    const popped = history[history.length - 1];
    if (popped === undefined) return;
    const nextHistory = history.slice(0, -1);
    const nextFuture = [...futureRef.current, popped];
    historyRef.current = nextHistory;
    futureRef.current = nextFuture;
    const prev = nextHistory[nextHistory.length - 1];
    if (prev === undefined) return;
    setDataInternal(prev);
    setCanUndo(nextHistory.length > 1);
    setCanRedo(nextFuture.length > 0);
  }, []);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (!future.length) return;
    const next = future[future.length - 1];
    if (next === undefined) return;
    const nextFuture = future.slice(0, -1);
    const nextHistory = [...historyRef.current, next];
    futureRef.current = nextFuture;
    historyRef.current = nextHistory;
    setDataInternal(next);
    setCanUndo(nextHistory.length > 1);
    setCanRedo(nextFuture.length > 0);
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [data];
    futureRef.current = [];
    setSavedData(data);
    setCanUndo(false);
    setCanRedo(false);
  }, [data]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsSaving(true);
    try {
      await storage.save(opts.key, data, opts.version);
      setSavedData(data);
      setLastSaved(new Date().toISOString());
      await persistHistory();
      firstDirtyAtRef.current = null;
    } catch {
      // storage failure is silent by design — caller can observe isDirty
    } finally {
      setIsSaving(false);
    }
  }, [opts.key, opts.version, data, persistHistory, storage]);

  return {
    data,
    setData,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    lastSaved,
    isDirty,
    isSaving,
    saveNow,
  };
}
