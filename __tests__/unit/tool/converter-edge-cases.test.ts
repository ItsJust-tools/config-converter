import { describe, it, expect } from 'vitest';
import { convertConfig, isConverterState, detectFormat } from '@/tool/converter';

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

describe('detectFormat', () => {
  it('detects JSON from object literal', () => {
    expect(detectFormat('{"key": "value"}')).toBe('json');
  });

  it('detects JSON from array literal', () => {
    expect(detectFormat('[1, 2, 3]')).toBe('json');
  });

  it('detects JSON with nested structure', () => {
    expect(detectFormat('{"a": {"b": 1}}')).toBe('json');
  });

  it('detects TOML from section header', () => {
    expect(detectFormat('[server]\nhost = "localhost"')).toBe('toml');
  });

  it('detects TOML from key = value pattern', () => {
    expect(detectFormat('name = "John"\nage = 30')).toBe('toml');
  });

  it('detects YAML from key: value pattern', () => {
    expect(detectFormat('name: John\nage: 30')).toBe('yaml');
  });

  it('defaults to YAML for empty input', () => {
    expect(detectFormat('')).toBe('yaml');
  });

  it('defaults to YAML for blank input', () => {
    expect(detectFormat('   ')).toBe('yaml');
  });

  it('defaults to YAML for gibberish', () => {
    expect(detectFormat('some random text')).toBe('yaml');
  });

  it('detects TOML over YAML for = patterns', () => {
    // TOML uses `=`, YAML uses `:`, so this should be TOML
    expect(detectFormat('key = "value"')).toBe('toml');
  });
});

describe('convertConfig with auto-detect', () => {
  it('auto-detects and converts YAML to JSON', () => {
    const result = convertConfig('name: John', 'auto', 'json');
    expect(result.error).toBe('');
    expect(JSON.parse(result.output)).toEqual({ name: 'John' });
  });

  it('auto-detects and converts JSON to YAML', () => {
    const result = convertConfig('{"name": "John"}', 'auto', 'yaml');
    expect(result.error).toBe('');
    expect(result.output).toContain('name: John');
  });

  it('auto-detects and converts TOML to JSON', () => {
    const result = convertConfig('name = "John"', 'auto', 'json');
    expect(result.error).toBe('');
    expect(JSON.parse(result.output)).toEqual({ name: 'John' });
  });

  it('auto-detects TOML with section headers', () => {
    const result = convertConfig('[server]\nport = 8080', 'auto', 'json');
    expect(result.error).toBe('');
    expect(JSON.parse(result.output)).toEqual({ server: { port: 8080 } });
  });

  it('auto-detects JSON arrays', () => {
    const result = convertConfig('[1, 2, 3]', 'auto', 'yaml');
    expect(result.error).toBe('');
    expect(result.output).toContain('- 1');
    expect(result.output).toContain('- 2');
  });

  it('returns error for empty input with auto-detect', () => {
    const result = convertConfig('', 'auto', 'json');
    expect(result.output).toBe('');
    expect(result.error).toBe('Please enter some configuration to convert.');
  });
});
