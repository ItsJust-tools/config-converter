import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  copyToClipboard,
  copyWithStatus,
  isClipboardAvailable,
  isLegacyCopySupported,
} from '@/tool/clipboard';

/**
 * Test helper: installs a mock `navigator.clipboard` (or removes it entirely).
 */
function setClipboardApi(value: { writeText: ReturnType<typeof vi.fn> } | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value,
  });
}

/**
 * Test helper: installs a mock `document.execCommand`.
 */
function setExecCommand(impl: ((command: string) => boolean) | undefined) {
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    writable: true,
    value: impl,
  });
}

const originalClipboard = navigator.clipboard;
const originalExecCommand = document.execCommand;

describe('clipboard utility', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    setClipboardApi(originalClipboard);
    setExecCommand(originalExecCommand);
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('isClipboardAvailable', () => {
    it('returns true when the async Clipboard API exists', () => {
      setClipboardApi({ writeText: vi.fn() });
      expect(isClipboardAvailable()).toBe(true);
    });

    it('returns false when the Clipboard API is missing (insecure origin)', () => {
      setClipboardApi(undefined);
      expect(isClipboardAvailable()).toBe(false);
    });
  });

  describe('isLegacyCopySupported', () => {
    it('returns true when document.execCommand is available', () => {
      setExecCommand(() => true);
      expect(isLegacyCopySupported()).toBe(true);
    });
  });

  describe('copyToClipboard', () => {
    it('uses the Clipboard API when it succeeds', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      setClipboardApi({ writeText });
      const execCommand = vi.fn(() => true);
      setExecCommand(execCommand);

      const result = await copyToClipboard('hello');

      expect(result).toBe(true);
      expect(writeText).toHaveBeenCalledWith('hello');
      // The legacy fallback must not run when the primary API succeeds.
      expect(execCommand).not.toHaveBeenCalled();
    });

    it('falls back to execCommand when the Clipboard API rejects (permission denied)', async () => {
      const writeText = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
      setClipboardApi({ writeText });
      const execCommand = vi.fn(() => true);
      setExecCommand(execCommand);

      const result = await copyToClipboard('hello');

      expect(result).toBe(true);
      expect(execCommand).toHaveBeenCalledWith('copy');
    });

    it('falls back to execCommand when the Clipboard API is unavailable (insecure origin)', async () => {
      setClipboardApi(undefined);
      const execCommand = vi.fn(() => true);
      setExecCommand(execCommand);

      const result = await copyToClipboard('hello');

      expect(result).toBe(true);
      expect(execCommand).toHaveBeenCalledWith('copy');
    });

    it('cleans up the temporary textarea after a successful fallback', async () => {
      setClipboardApi(undefined);
      setExecCommand(() => true);

      await copyToClipboard('hello');

      expect(document.querySelectorAll('textarea')).toHaveLength(0);
    });

    it('cleans up the temporary textarea after a failed fallback', async () => {
      setClipboardApi(undefined);
      setExecCommand(() => false);

      await copyToClipboard('hello');

      expect(document.querySelectorAll('textarea')).toHaveLength(0);
    });

    it('selects the exact text content in the fallback textarea', async () => {
      setClipboardApi(undefined);
      let selectedText = '';
      const selectSpy = vi
        .spyOn(HTMLTextAreaElement.prototype, 'select')
        .mockImplementation(function (this: HTMLTextAreaElement) {
          selectedText = this.value;
        });
      setExecCommand(() => true);

      const result = await copyToClipboard('fallback text');

      expect(result).toBe(true);
      expect(selectedText).toBe('fallback text');
      selectSpy.mockRestore();
    });

    it('returns false when both the Clipboard API and the legacy fallback fail', async () => {
      const writeText = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
      setClipboardApi({ writeText });
      setExecCommand(() => false);

      const result = await copyToClipboard('hello');

      expect(result).toBe(false);
    });

    it('returns false when the Clipboard API is missing and execCommand is not supported', async () => {
      setClipboardApi(undefined);
      setExecCommand(undefined);

      const result = await copyToClipboard('hello');

      expect(result).toBe(false);
    });

    it('returns false when the legacy fallback throws', async () => {
      setClipboardApi(undefined);
      setExecCommand(() => {
        throw new Error('boom');
      });

      const result = await copyToClipboard('hello');

      expect(result).toBe(false);
      expect(document.querySelectorAll('textarea')).toHaveLength(0);
    });
  });

  describe('copyWithStatus', () => {
    it('returns a success message on success', async () => {
      setClipboardApi({ writeText: vi.fn().mockResolvedValue(undefined) });

      const status = await copyWithStatus('#FF0000', 'HEX');

      expect(status).toBe('HEX copied to clipboard');
    });

    it('returns a failure message when all strategies fail', async () => {
      setClipboardApi(undefined);
      setExecCommand(() => false);

      const status = await copyWithStatus('#FF0000', 'HEX');

      expect(status).toBe('Failed to copy HEX - clipboard unavailable');
    });
  });
});
