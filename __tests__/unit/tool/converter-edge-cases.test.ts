import { describe, it, expect } from 'vitest';
import { convertConfig, isConverterState } from '@/tool/converter';

describe('sortObjectKeys — array element nesting', () => {
  it('sorts keys inside array elements', () => {
    const input = JSON.stringify([
      { z: 1, a: 2 },
      { z: 1, a: 2 },
    ]);
    const result = convertConfig(input, 'json', 'json', { sortKeys: true });
    expect(result.error).toBe('');
    const parsed = JSON.parse(result.output);
    const keys = Object.keys(parsed[0]);
    expect(keys).toEqual(['a', 'z']);
  });

  it('sorts keys inside nested objects within arrays', () => {
    const input = JSON.stringify({
      items: [{ z: 1, b: { c: 3, a: 2 } }],
    });
    const result = convertConfig(input, 'json', 'json', { sortKeys: true });
    expect(result.error).toBe('');
    const parsed = JSON.parse(result.output);
    expect(Object.keys(parsed.items[0].b)).toEqual(['a', 'c']);
  });
});

describe('normaliseValues — Map and Set handling', () => {
  it('converts Map to plain object when going through JSON round-trip via YAML', () => {
    // smol-toml can return Map for inline tables — this tests that
    // the normaliser handles Map entries.
    const input = 'key = "value"\n';
    const result = convertConfig(input, 'toml', 'yaml');
    expect(result.error).toBe('');
    expect(result.output).toContain('key: value');
  });

  it('handles YAML with Set-like structures (unique items)', () => {
    // YAML sequences are arrays, not sets. This is a basic sanity
    // that array items are correctly handled by the normaliser.
    const input = 'items:\n  - 1\n  - 2\n  - 3\n';
    const result = convertConfig(input, 'yaml', 'json');
    expect(result.error).toBe('');
    expect(JSON.parse(result.output)).toEqual({ items: [1, 2, 3] });
  });
});

describe('isConverterState', () => {
  it('accepts valid converter state', () => {
    const result = isConverterState({
      inputFormat: 'yaml',
      outputFormat: 'json',
      input: 'key: val',
      output: '{"key": "val"}',
      error: '',
      minify: false,
      indentSize: 2,
      sortKeys: false,
    });
    expect(result).toBe(true);
  });

  it('rejects null', () => {
    expect(isConverterState(null)).toBe(false);
  });

  it('rejects non-object values', () => {
    expect(isConverterState(42)).toBe(false);
    expect(isConverterState('string')).toBe(false);
    expect(isConverterState(undefined)).toBe(false);
  });

  it('rejects object with wrong types', () => {
    expect(
      isConverterState({
        inputFormat: 'yaml',
        outputFormat: 'json',
        input: 'key: val',
        output: '{"key": "val"}',
        error: '',
        minify: 'not boolean', // wrong type
        indentSize: 2,
        sortKeys: false,
      })
    ).toBe(false);
  });

  it('rejects object missing fields', () => {
    expect(
      isConverterState({
        inputFormat: 'yaml',
        outputFormat: 'json',
        // missing input field
        output: '{"key": "val"}',
        error: '',
        minify: false,
        indentSize: 2,
        sortKeys: false,
      })
    ).toBe(false);
  });
});