export interface StorageData<T> {
  data: T;
  savedAt: string;
  version: string;
  encoding?: 'plain' | 'lz-string';
}

export interface AutoSaveOptions {
  enabled: boolean;
  debounceMs: number;
  maxWaitMs: number;
  key: string;
  maxHistoryEntries?: number;
  version?: string;
  storageManager?: {
    loadEntry: <T>(
      key: string,
      expectedVersion?: string
    ) => { status: 'missing' | 'ok' | 'corrupt'; data: T | null };
    save: <T>(key: string, data: T, version?: string) => Promise<void>;
  };
  historyStorage?: Pick<Storage, 'getItem' | 'setItem'>;
  historyNamespace?: string;
}

export const defaultAutoSaveOptions: AutoSaveOptions = {
  enabled: true,
  debounceMs: 2000,
  maxWaitMs: 10000,
  key: 'itsjust-tool',
  maxHistoryEntries: 50,
};
