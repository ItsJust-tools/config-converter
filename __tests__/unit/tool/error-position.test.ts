import { describe, it, expect } from 'vitest';
import { convertConfig } from '@/tool/converter';
import { extractErrorPosition, formatPositionSuffix } from '@/tool/error-position';

describe('error position extraction', () => {
  it('extracts line/column from a YAML parse error', () => {
    const result = convertConfig('a: 1\nbad: [1,2', 'yaml', 'json');
    expect(result.error).not.toBe('');
    expect(result.errorPosition).toBeDefined();
    expect(result.errorPosition!.line).toBe(2);
    expect(result.error).toContain('(line 2');
  });

  it('extracts line/column from a TOML parse error', () => {
    // Unterminated string: control characters (newline) inside string are invalid
    const result = convertConfig('a = "ok"\nb = "x\nc = 3', 'toml', 'json');
    expect(result.error).not.toBe('');
    expect(result.errorPosition).toBeDefined();
    expect(result.errorPosition!.line).toBeGreaterThan(1);
  });

  it('extracts line/column for JSON errors from a character offset', () => {
    const result = convertConfig('{\n  "a": 1,\n}', 'json', 'yaml');
    expect(result.error).not.toBe('');
    // Trailing comma reported near end of document (line 3)
    expect(result.errorPosition).toBeDefined();
    expect(result.errorPosition!.line).toBeGreaterThanOrEqual(2);
    expect(result.errorPosition!.column).toBeGreaterThanOrEqual(1);
  });

  it('formats a position suffix', () => {
    expect(formatPositionSuffix(null)).toBe('');
    expect(formatPositionSuffix({ line: 3, column: 7 })).toBe(' (line 3, column 7)');
  });

  it('extractErrorPosition returns null for unknown errors', () => {
    expect(extractErrorPosition(new Error('boom'), 'a: 1')).toBeNull();
    expect(extractErrorPosition(null, 'a: 1')).toBeNull();
  });

  it('successful conversions carry no errorPosition', () => {
    const result = convertConfig('name: John', 'yaml', 'json');
    expect(result.error).toBe('');
    expect(result.errorPosition).toBeUndefined();
  });
});
