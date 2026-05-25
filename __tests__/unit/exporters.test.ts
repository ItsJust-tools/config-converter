import { describe, it, expect, vi } from 'vitest';
import {
  formatExportError,
  throwIfAborted,
} from '@/tool/exporters/utils';

describe('exporters', () => {
  describe('formatExportError', () => {
    it('formats cors errors with guidance', () => {
      const msg = formatExportError(new Error('CORS blocked image'), 'PNG');
      expect(msg).toContain('enable CORS');
    });

    it('returns the error message for generic errors', () => {
      const msg = formatExportError(new Error('Something broke'), 'PNG');
      expect(msg).toBe('Something broke');
    });

    it('returns a fallback message for non-error values', () => {
      const msg = formatExportError(null, 'PNG');
      expect(msg).toBe('PNG export failed');
    });

    it('detects "tainted" as a CORS keyword', () => {
      const msg = formatExportError(new Error('Canvas is tainted'), 'PNG');
      expect(msg).toContain('enable CORS');
    });

    it('detects "security" as a CORS keyword', () => {
      const msg = formatExportError(new Error('Security error'), 'WEBP');
      expect(msg).toContain('enable CORS');
    });
  });

  describe('throwIfAborted', () => {
    it('throws abort error when signal is aborted', () => {
      const ctrl = new AbortController();
      ctrl.abort();
      expect(() => throwIfAborted(ctrl.signal)).toThrowError(/Export aborted/);
    });

    it('does not throw when signal is undefined', () => {
      expect(() => throwIfAborted(undefined)).not.toThrow();
    });

    it('does not throw when signal is active', () => {
      const ctrl = new AbortController();
      expect(() => throwIfAborted(ctrl.signal)).not.toThrow();
    });
  });
});
