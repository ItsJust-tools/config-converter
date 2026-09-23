/**
 * Defensive storage helpers.
 *
 * Browsers throw in several situations that naive localStorage/sessionStorage
 * usage does not expect:
 *
 * - `QuotaExceededError` (DOMException) when the quota is exhausted or the
 *   value is too large to persist (e.g. large undo history).
 * - `SecurityError` when storage access is blocked entirely, which happens in
 *   private/incognito browsing modes or when cookies/storage are disabled.
 *
 * Every helper swallows these exceptions and emits a `itsjust:storage-warning`
 * DOM event so the UI layer can surface a non-intrusive warning toast, keeping
 * application state flows alive even when persistence is unavailable.
 */

const STORAGE_WARNING_EVENT = 'itsjust:storage-warning';

export type StorageWarningKind = 'quota' | 'unavailable';

export interface StorageWarningDetail {
  /** Which storage backend failed. */
  storage: 'local' | 'session';
  /** Why the operation failed. */
  kind: StorageWarningKind;
  /** Namespaced key that was being accessed, when known. */
  key?: string;
  /** `get`, `set` or `remove`. */
  operation: 'get' | 'set' | 'remove';
}

/** DOM event emitted whenever a defensive storage operation fails. */
export type StorageWarningEvent = CustomEvent<StorageWarningDetail>;

/** Event name to listen on for storage failures. */
export function getStorageWarningEventName(): string {
  return STORAGE_WARNING_EVENT;
}

/** True when the error is a storage quota exhaustion (`QuotaExceededError` family). */
export function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.name === 'QUOTA_EXCEEDED_ERR')
  );
}

/** Emit a storage warning event. Never throws — delivery failures are swallowed. */
export function emitStorageWarning(detail: StorageWarningDetail): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent<StorageWarningDetail>(STORAGE_WARNING_EVENT, { detail }));
  } catch {
    // Never let warning delivery break the caller.
  }
}

/** Storage area for `local`/`session`, or `null` when unavailable/blocked. */
function getStorageArea(
  storage: 'local' | 'session',
  operation: StorageWarningDetail['operation']
): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    // Accessing the storage getter itself can throw (SecurityError) when
    // storage is blocked, e.g. in private browsing or sandboxed frames.
    return storage === 'local' ? window.localStorage : window.sessionStorage;
  } catch (error) {
    emitStorageWarning({ storage, kind: 'unavailable', operation });
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[storage-events] ${storage} storage unavailable:`, error);
    }
    return null;
  }
}

/** Read a value from storage without ever throwing. Returns `null` on failure. */
export function safeGetItem(storage: 'local' | 'session', key: string): string | null {
  const area = getStorageArea(storage, 'get');
  if (!area) return null;
  try {
    return area.getItem(key);
  } catch (error) {
    emitStorageWarning({ storage, kind: 'unavailable', operation: 'get', key });
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[storage-events] Failed to read "${key}" from ${storage} storage:`, error);
    }
    return null;
  }
}

/**
 * Write a value to storage without ever throwing.
 * Emits a storage warning (and logs in development) on failure.
 * Returns `true` when the value was persisted, `false` otherwise.
 */
export function safeSetItem(storage: 'local' | 'session', key: string, value: string): boolean {
  const area = getStorageArea(storage, 'set');
  if (!area) return false;
  try {
    area.setItem(key, value);
    return true;
  } catch (error) {
    const quota = isQuotaError(error);
    emitStorageWarning({
      storage,
      kind: quota ? 'quota' : 'unavailable',
      operation: 'set',
      key,
    });
    if (process.env.NODE_ENV !== 'production') {
      if (quota) {
        console.warn(`[storage-events] Quota exceeded writing "${key}" to ${storage} storage`);
      } else {
        console.warn(`[storage-events] Failed to write "${key}" to ${storage} storage:`, error);
      }
    }
    return false;
  }
}

/** Remove a key from storage without ever throwing. */
export function safeRemoveItem(storage: 'local' | 'session', key: string): void {
  const area = getStorageArea(storage, 'remove');
  if (!area) return;
  try {
    area.removeItem(key);
  } catch (error) {
    emitStorageWarning({ storage, kind: 'unavailable', operation: 'remove', key });
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[storage-events] Failed to remove "${key}" from ${storage} storage:`, error);
    }
  }
}

/** Local-storage flavored shortcuts. */
export const safeLocalStorage = {
  getItem: (key: string): string | null => safeGetItem('local', key),
  setItem: (key: string, value: string): boolean => safeSetItem('local', key, value),
  removeItem: (key: string): void => safeRemoveItem('local', key),
};

/** Session-storage flavored shortcuts. */
export const safeSessionStorage = {
  getItem: (key: string): string | null => safeGetItem('session', key),
  setItem: (key: string, value: string): boolean => safeSetItem('session', key, value),
  removeItem: (key: string): void => safeRemoveItem('session', key),
};
