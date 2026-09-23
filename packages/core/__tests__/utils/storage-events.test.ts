import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  safeLocalStorage,
  safeSessionStorage,
  getStorageWarningEventName,
  isQuotaError,
  emitStorageWarning,
} from '../../src/utils/storage-events';
import type { StorageWarningDetail } from '../../src/utils/storage-events';

function quotaError(): DOMException {
  return new DOMException('Quota exceeded', 'QuotaExceededError');
}

function securityError(): DOMException {
  return new DOMException('Storage blocked', 'SecurityError');
}

describe('storage-events', () => {
  let warnings: CustomEvent<StorageWarningDetail>[] = [];
  const storageSpies: ReturnType<typeof vi.spyOn>[] = [];

  function handler(event: Event) {
    warnings.push(event as CustomEvent<StorageWarningDetail>);
  }

  function track<T extends object, K extends keyof T>(obj: T, key: K) {
    const spy = vi.spyOn(obj, key);
    storageSpies.push(spy as unknown as ReturnType<typeof vi.spyOn>);
    return spy;
  }

  /** Replace `window.localStorage`/`window.sessionStorage` with a throwing getter. */
  function blockStorage(which: 'local' | 'session') {
    const windowObj = window as unknown as Record<string, unknown>;
    const prop = which === 'local' ? 'localStorage' : 'sessionStorage';
    const original = Object.getOwnPropertyDescriptor(windowObj, prop);
    Object.defineProperty(windowObj, prop, {
      get() {
        throw securityError();
      },
      configurable: true,
    });
    return () => {
      if (original) Object.defineProperty(windowObj, prop, original);
      else delete (windowObj as Record<string, unknown>)[prop];
    };
  }

  beforeEach(() => {
    warnings = [];
    localStorage.clear();
    sessionStorage.clear();
    window.addEventListener(getStorageWarningEventName(), handler);
  });

  afterEach(() => {
    window.removeEventListener(getStorageWarningEventName(), handler);
    storageSpies.forEach((spy) => spy.mockRestore());
    storageSpies.length = 0;
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('safeSetItem', () => {
    it('persists values to local and session storage', () => {
      expect(safeSetItem('local', 'k', 'v')).toBe(true);
      expect(safeSetItem('session', 'k', 'v')).toBe(true);
      expect(localStorage.getItem('k')).toBe('v');
      expect(sessionStorage.getItem('k')).toBe('v');
    });

    it('swallows QuotaExceededError and emits a quota warning', () => {
      track(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError();
      });

      expect(safeSetItem('local', 'overflow', 'x')).toBe(false);
      expect(localStorage.getItem('overflow')).toBeNull();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.detail).toEqual({
        storage: 'local',
        kind: 'quota',
        operation: 'set',
        key: 'overflow',
      });
    });

    it('swallows SecurityError (private browsing) and emits an unavailable warning', () => {
      const unblock = blockStorage('local');
      try {
        expect(safeSetItem('local', 'k', 'v')).toBe(false);

        expect(warnings).toHaveLength(1);
        expect(warnings[0]!.detail.kind).toBe('unavailable');
        expect(warnings[0]!.detail.storage).toBe('local');
      } finally {
        unblock();
      }
    });

    it('swallows errors thrown by storage method access (Firefox privacy mode)', () => {
      // In Firefox's old private mode, touching setItem itself throws.
      const original = Storage.prototype.setItem;
      Object.defineProperty(Storage.prototype, 'setItem', {
        get() {
          throw securityError();
        },
        configurable: true,
      });

      try {
        expect(safeSetItem('local', 'k', 'v')).toBe(false);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]!.detail.kind).toBe('unavailable');
      } finally {
        Object.defineProperty(Storage.prototype, 'setItem', {
          value: original,
          writable: true,
          configurable: true,
        });
      }
    });

    it('does not emit warnings for the local backend when only session fails', () => {
      const spy = track(Storage.prototype, 'setItem');
      spy.mockImplementation(function (this: Storage) {
        if (this === sessionStorage) throw quotaError();
        return undefined;
      });

      expect(safeSetItem('session', 'shared-key', 'v')).toBe(false);
      expect(safeSetItem('local', 'shared-key', 'v')).toBe(true);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.detail.storage).toBe('session');
    });
  });

  describe('safeGetItem', () => {
    it('reads values from storage', () => {
      localStorage.setItem('k', 'v');
      expect(safeGetItem('local', 'k')).toBe('v');
      expect(safeGetItem('local', 'missing')).toBeNull();
    });

    it('swallows SecurityError and emits an unavailable warning', () => {
      const unblock = blockStorage('local');
      try {
        expect(safeGetItem('local', 'k')).toBeNull();
        expect(warnings).toHaveLength(1);
        expect(warnings[0]!.detail.kind).toBe('unavailable');
        expect(warnings[0]!.detail.operation).toBe('get');
      } finally {
        unblock();
      }
    });
  });

  describe('safeRemoveItem', () => {
    it('removes values from storage', () => {
      localStorage.setItem('k', 'v');
      safeRemoveItem('local', 'k');
      expect(localStorage.getItem('k')).toBeNull();
    });

    it('swallows SecurityError and emits an unavailable warning', () => {
      const unblock = blockStorage('local');
      try {
        expect(() => safeRemoveItem('local', 'k')).not.toThrow();
        expect(warnings).toHaveLength(1);
        expect(warnings[0]!.detail.kind).toBe('unavailable');
        expect(warnings[0]!.detail.operation).toBe('remove');
      } finally {
        unblock();
      }
    });
  });

  describe('shortcut objects', () => {
    it('exposes local/session flavors', () => {
      expect(safeLocalStorage.setItem('a', '1')).toBe(true);
      expect(safeLocalStorage.getItem('a')).toBe('1');
      safeLocalStorage.removeItem('a');
      expect(safeLocalStorage.getItem('a')).toBeNull();

      expect(safeSessionStorage.setItem('b', '2')).toBe(true);
      expect(safeSessionStorage.getItem('b')).toBe('2');
      safeSessionStorage.removeItem('b');
      expect(safeSessionStorage.getItem('b')).toBeNull();
    });
  });

  describe('isQuotaError', () => {
    it('recognizes the QuotaExceededError family', () => {
      expect(isQuotaError(quotaError())).toBe(true);
      expect(isQuotaError(new DOMException('x', 'NS_ERROR_DOM_QUOTA_REACHED'))).toBe(true);
      expect(isQuotaError(new DOMException('x', 'QUOTA_EXCEEDED_ERR'))).toBe(true);
      expect(isQuotaError(new DOMException('x', 'SecurityError'))).toBe(false);
      expect(isQuotaError(new Error('plain'))).toBe(false);
      expect(isQuotaError('quota')).toBe(false);
      expect(isQuotaError(null)).toBe(false);
    });
  });

  describe('emitStorageWarning', () => {
    it('delivers structured detail to listeners', () => {
      emitStorageWarning({ storage: 'local', kind: 'quota', operation: 'set', key: 'k' });
      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.detail.key).toBe('k');
    });

    it('never throws when event construction fails', () => {
      const original = window.CustomEvent;
      // @ts-expect-error simulate environments without CustomEvent
      window.CustomEvent = undefined;
      try {
        expect(() =>
          emitStorageWarning({ storage: 'local', kind: 'quota', operation: 'set' })
        ).not.toThrow();
      } finally {
        window.CustomEvent = original;
      }
    });
  });
});
