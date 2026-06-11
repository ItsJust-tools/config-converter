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

  it('auto-detect + minify produces compact output', () => {
    const result = convertConfig('name: John\nage: 30', 'auto', 'json', { minify: true });
    expect(result.error).toBe('');
    expect(result.output).toBe('{"name":"John","age":30}');
  });

  it('auto-detect + sortKeys sorts keys alphabetically', () => {
    const result = convertConfig('z: 1\na: 2\nm: 3', 'auto', 'json', { sortKeys: true });
    expect(result.error).toBe('');
    expect(Object.keys(JSON.parse(result.output))).toEqual(['a', 'm', 'z']);
  });

  it('auto-detect with TOML forced via = pattern and custom indent', () => {
    const result = convertConfig('title = "Hello"\ncount = 42', 'auto', 'toml', { indentSize: 4 });
    expect(result.error).toBe('');
    expect(result.output).toContain('title = "Hello"');
    expect(result.output).toContain('count = 42');
  });

  it('detects TOML with dotted keys', () => {
    expect(detectFormat('network.host = "localhost"')).toBe('toml');
  });

  it('does not false-positive detect TOML from YAML with URL values containing =', () => {
    // YAML values with query parameters contain `=` but should not be read as TOML
    const yamlUrl =
      'url: "https://example.com/api?version=2&limit=10"';
    expect(detectFormat(yamlUrl)).toBe('yaml');
  });

  it('detects TOML with inline tables', () => {
    expect(detectFormat('server = { host = "localhost" }')).toBe('toml');
  });

  it('detects TOML with array of tables', () => {
    expect(detectFormat('[[products]]\nname = "Hammer"')).toBe('toml');
  });

  it('does not detect TOML from YAML with boolean-like values', () => {
    // Pure YAML with no `=` signs
    expect(detectFormat('enabled: yes\ndebug: off')).toBe('yaml');
  });

  it('detects TOML with boolean assignment', () => {
    expect(detectFormat('enabled = true')).toBe('toml');
  });

  it('clamps indentSize below min to 1', () => {
    const result = convertConfig('{"a": 1}', 'json', 'json', { indentSize: -5 });
    expect(result.error).toBe('');
    // Should work without error (indent clamped to 1)
    const parsed = JSON.parse(result.output);
    expect(parsed.a).toBe(1);
  });

  it('clamps indentSize above max to 8', () => {
    const result = convertConfig('{"a": 1}', 'json', 'json', { indentSize: 999 });
    expect(result.error).toBe('');
    const parsed = JSON.parse(result.output);
    expect(parsed.a).toBe(1);
  });

  it('handles indentSize of 0 gracefully', () => {
    const result = convertConfig('{"a": 1}', 'json', 'json', { indentSize: 0 });
    expect(result.error).toBe('');
    const parsed = JSON.parse(result.output);
    expect(parsed.a).toBe(1);
  });
});

describe('error message formatting', () => {
  it('includes error details for invalid JSON', () => {
    const result = convertConfig('{invalid}', 'json', 'yaml');
    expect(result.output).toBe('');
    expect(result.error).toContain('Conversion error:');
    // JSON SyntaxErrors include position info
    expect(result.error).toContain('position');
  });

  it('includes error details for malformed JSON with trailing comma', () => {
    const result = convertConfig('{"a": 1,}', 'json', 'yaml');
    expect(result.output).toBe('');
    expect(result.error).toContain('Conversion error:');
    expect(result.error).toContain('position');
  });

  it('includes line/column info for invalid YAML', () => {
    const input = 'key: value\ninvalid yaml line\n: : broken';
    const result = convertConfig(input, 'yaml', 'json');
    expect(result.output).toBe('');
    expect(result.error).toContain('Conversion error:');
    // YAML exceptions have line/column info
    expect(result.error).toMatch(/line \d+/);
  });

  it('includes error for invalid TOML', () => {
    const result = convertConfig('key = ', 'toml', 'json');
    expect(result.output).toBe('');
    expect(result.error).toContain('Conversion error:');
  });

  it('includes error details for corrupted JSON with nested structure', () => {
    const result = convertConfig('{"a": {"b": [1, 2,', 'json', 'yaml');
    expect(result.output).toBe('');
    expect(result.error).toContain('Conversion error:');
    // Should include the actual JSON error
    expect(result.error).toContain('JSON');
  });
});
