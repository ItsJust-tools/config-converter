import type { StorageData } from '../types';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';

export type StorageLoadStatus = 'missing' | 'ok' | 'corrupt';

export interface StorageLoadResult<T> {
  status: StorageLoadStatus;
  data: T | null;
}

export class StorageManager {
  private prefix: string;
  private defaultVersion?: string;
  private compressionThresholdBytes: number;

  constructor(prefix = 'itsjust', defaultVersion = '1.0.0', compressionThresholdBytes = 2048) {
    this.prefix = prefix;
    this.defaultVersion = defaultVersion;
    this.compressionThresholdBytes = Math.max(0, compressionThresholdBytes);
  }

  private key(k: string): string {
    return `${this.prefix}:${k}`;
  }

  async save<T>(key: string, data: T, version?: string): Promise<void> {
    const serialized = JSON.stringify(data);
    let storedData: unknown = data;
    let encoding: StorageData<unknown>['encoding'] = 'plain';
    if (serialized.length >= this.compressionThresholdBytes) {
      const compressed = compressToUTF16(serialized);
      if (compressed.length < serialized.length) {
        storedData = compressed;
        encoding = 'lz-string';
      }
    }
    const entry: StorageData<unknown> = {
      data: storedData,
      savedAt: new Date().toISOString(),
      version: version ?? this.defaultVersion ?? '1.0.0',
      encoding,
    };
    try {
      localStorage.setItem(this.key(key), JSON.stringify(entry));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn(`[StorageManager] Quota exceeded saving "${key}"`);
      } else {
        console.warn(`[StorageManager] Failed to save "${key}":`, error);
      }
      throw error;
    }
  }

  loadEntry<T>(key: string, expectedVersion?: string): StorageLoadResult<T> {
    const raw = localStorage.getItem(this.key(key));
    if (!raw) return { status: 'missing', data: null };
    try {
      const entry: StorageData<unknown> = JSON.parse(raw);
      if (expectedVersion && entry.version !== expectedVersion) {
        console.warn(
          `[StorageManager] Version mismatch for "${key}": expected ${expectedVersion}, got ${entry.version}`
        );
      }
      if (entry.encoding === 'lz-string') {
        if (typeof entry.data !== 'string') {
          return { status: 'corrupt', data: null };
        }
        const decompressed = decompressFromUTF16(entry.data);
        if (decompressed == null) {
          return { status: 'corrupt', data: null };
        }
        return { status: 'ok', data: JSON.parse(decompressed) as T };
      }
      return { status: 'ok', data: entry.data as T };
    } catch (error) {
      console.warn(`[StorageManager] Failed to load "${key}":`, error);
      return { status: 'corrupt', data: null };
    }
  }

  load<T>(key: string, expectedVersion?: string): T | null {
    return this.loadEntry<T>(key, expectedVersion).data;
  }

  remove(key: string): void {
    localStorage.removeItem(this.key(key));
  }
}

export const storageManager = new StorageManager();
