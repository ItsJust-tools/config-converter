'use client';

import { useCallback, useMemo } from 'react';
import { StorageManager } from '../engines/storage-manager';

export function useStorage(prefix = 'itsjust') {
  const manager = useMemo(() => new StorageManager(prefix), [prefix]);

  const save = useCallback(<T>(key: string, data: T) => manager.save(key, data), [manager]);

  const load = useCallback(<T>(key: string) => manager.load<T>(key), [manager]);

  const clear = useCallback((key: string) => manager.remove(key), [manager]);

  return { save, load, clear };
}
