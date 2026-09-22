import { describe, expect, it } from 'vitest';
import { MAX_EXPORT_FILENAME_LENGTH, sanitizeFilename } from '../../src/utils/sanitize-filename';

describe('sanitizeFilename', () => {
  it('leaves already-clean filenames unchanged (idempotent)', () => {
    expect(sanitizeFilename('my-config.json')).toBe('my-config.json');
    expect(sanitizeFilename('export-1234567890.png')).toBe('export-1234567890.png');
    expect(sanitizeFilename('simple')).toBe('simple');
    // Applying twice yields the same result.
    expect(sanitizeFilename(sanitizeFilename('my:bad/name?.json'))).toBe('my-bad-name-.json');
  });

  it('replaces each invalid OS character with a dash', () => {
    expect(sanitizeFilename('my:bad/name?.json')).toBe('my-bad-name-.json');
    expect(sanitizeFilename('my:image*?.png')).toBe('my-image--.png');
    expect(sanitizeFilename('back\\slash.txt')).toBe('back-slash.txt');
    expect(sanitizeFilename('pipe|file.pdf')).toBe('pipe-file.pdf');
    expect(sanitizeFilename('less<greater>.svg')).toBe('less-greater-.svg');
    // Suggested regex from the issue includes %.
    expect(sanitizeFilename('100%done.txt')).toBe('100-done.txt');
    expect(sanitizeFilename('quote"mark.json')).toBe('quote-mark.json');
  });

  it('replaces every invalid character individually without collapsing dashes', () => {
    expect(sanitizeFilename('bad: name?.json')).toBe('bad- name-.json');
    expect(sanitizeFilename('my: shared*"file.json')).toBe('my- shared--file.json');
    expect(sanitizeFilename('???')).toBe('---');
  });

  it('removes control characters', () => {
    expect(sanitizeFilename('na\u0000me.txt')).toBe('na-me.txt');
    expect(sanitizeFilename('bad\u001fname\u007f.txt')).toBe('bad-name-.txt');
    // Newlines/tabs count as control characters too.
    expect(sanitizeFilename('line\nbreak\ttab.txt')).toBe('line-break-tab.txt');
  });

  it('strips leading and trailing dots and spaces (Windows reserved)', () => {
    expect(sanitizeFilename('...hidden.png')).toBe('hidden.png');
    expect(sanitizeFilename('file. . ')).toBe('file');
    expect(sanitizeFilename('  spaced.json  ')).toBe('spaced.json');
    expect(sanitizeFilename('.hidden')).toBe('hidden');
  });

  it('falls back to a default name when nothing usable remains', () => {
    expect(sanitizeFilename('')).toBe('export');
    expect(sanitizeFilename('   ')).toBe('export');
    expect(sanitizeFilename('. . .')).toBe('export');
    expect(sanitizeFilename('???')).toBe('---');
  });

  it('enforces the maximum length while preserving the extension', () => {
    const long = `${'a'.repeat(150)}.json`;
    const sanitized = sanitizeFilename(long);
    expect(sanitized.length).toBe(MAX_EXPORT_FILENAME_LENGTH);
    expect(sanitized.endsWith('.json')).toBe(true);
    expect(sanitized).toBe(`${'a'.repeat(95)}.json`);

    const longName = `${'n'.repeat(120)}-config.json`;
    const truncated = sanitizeFilename(longName);
    expect(truncated.length).toBe(MAX_EXPORT_FILENAME_LENGTH);
    expect(truncated.endsWith('.json')).toBe(true);
  });

  it('hard-truncates when no meaningful extension exists', () => {
    const long = 'x'.repeat(150);
    expect(sanitizeFilename(long)).toHaveLength(MAX_EXPORT_FILENAME_LENGTH);

    // Degenerate "extensions" are treated as part of the name.
    const dots = `${'.'.repeat(200)}txt`;
    expect(sanitizeFilename(dots).length).toBeLessThanOrEqual(MAX_EXPORT_FILENAME_LENGTH);
  });

  it('keeps names at or under the limit untouched', () => {
    const exact = `${'a'.repeat(MAX_EXPORT_FILENAME_LENGTH - 5)}.json`;
    expect(sanitizeFilename(exact)).toBe(exact);
  });

  it('handles real-world dirty export names', () => {
    expect(sanitizeFilename('bad: "name".itsjust.json')).toBe('bad- -name-.itsjust.json');
    expect(sanitizeFilename('my: config: v2?.json')).toBe('my- config- v2-.json');
    expect(sanitizeFilename('config: <test>*|?.png')).toBe('config- -test----.png');
  });
});
