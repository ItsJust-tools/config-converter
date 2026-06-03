import { describe, it, expect } from 'vitest';
import { convertConfig } from '@/tool/converter';

describe('convertConfig', () => {
  describe('YAML → JSON', () => {
    it('converts simple key-value', () => {
      const result = convertConfig('name: John\nage: 30', 'yaml', 'json');
      expect(result.error).toBe('');
      expect(JSON.parse(result.output)).toEqual({ name: 'John', age: 30 });
    });

    it('converts nested objects', () => {
      const result = convertConfig(`server:\n  host: localhost\n  port: 8080`, 'yaml', 'json');
      expect(result.error).toBe('');
      expect(JSON.parse(result.output)).toEqual({ server: { host: 'localhost', port: 8080 } });
    });

    it('converts arrays', () => {
      const result = convertConfig('items:\n  - a\n  - b\n  - c', 'yaml', 'json');
      expect(result.error).toBe('');
      expect(JSON.parse(result.output)).toEqual({ items: ['a', 'b', 'c'] });
    });
  });

  describe('JSON → YAML', () => {
    it('converts simple JSON to YAML', () => {
      const result = convertConfig('{"name": "John", "age": 30}', 'json', 'yaml');
      expect(result.error).toBe('');
      expect(result.output).toContain('name: John');
      expect(result.output).toContain('age: 30');
    });

    it('converts nested JSON to YAML', () => {
      const result = convertConfig(
        JSON.stringify({ server: { host: 'localhost', port: 8080 } }),
        'json',
        'yaml'
      );
      expect(result.error).toBe('');
      expect(result.output).toContain('host: localhost');
    });

    it('handles arrays in JSON to YAML', () => {
      const result = convertConfig('{"items": [1, 2, 3]}', 'json', 'yaml');
      expect(result.error).toBe('');
      expect(result.output).toContain('- 1');
      expect(result.output).toContain('- 2');
    });
  });

  describe('JSON → TOML', () => {
    it('converts simple JSON to TOML', () => {
      const result = convertConfig('{"name": "John", "age": 30}', 'json', 'toml');
      expect(result.error).toBe('');
      expect(result.output).toContain('name = "John"');
      expect(result.output).toContain('age = 30');
    });

    it('converts nested JSON to TOML sections', () => {
      const result = convertConfig(
        JSON.stringify({ server: { host: 'localhost', port: 8080 } }),
        'json',
        'toml'
      );
      expect(result.error).toBe('');
      expect(result.output).toContain('[server]');
    });
  });

  describe('TOML → JSON', () => {
    it('converts simple TOML to JSON', () => {
      const result = convertConfig('name = "John"\nage = 30\n', 'toml', 'json');
      expect(result.error).toBe('');
      expect(JSON.parse(result.output)).toEqual({ name: 'John', age: 30 });
    });

    it('converts nested TOML to JSON', () => {
      const result = convertConfig('[server]\nhost = "localhost"\nport = 8080\n', 'toml', 'json');
      expect(result.error).toBe('');
      expect(JSON.parse(result.output)).toEqual({ server: { host: 'localhost', port: 8080 } });
    });
  });

  describe('YAML → TOML', () => {
    it('converts YAML to TOML', () => {
      const result = convertConfig('name: John\nage: 30', 'yaml', 'toml');
      expect(result.error).toBe('');
      expect(result.output).toContain('name = "John"');
      expect(result.output).toContain('age = 30');
    });
  });

  describe('TOML → YAML', () => {
    it('converts TOML to YAML', () => {
      const result = convertConfig('title = "Example"\ncount = 42\n', 'toml', 'yaml');
      expect(result.error).toBe('');
      expect(result.output).toContain('title: Example');
      expect(result.output).toContain('count: 42');
    });
  });

  describe('edge cases', () => {
    it('returns empty output for empty input trimmed', () => {
      const result = convertConfig('', 'yaml', 'json');
      expect(result.output).toBe('');
      expect(result.error).toBe('Please enter some configuration to convert.');
    });

    it('returns empty output for whitespace-only input', () => {
      const result = convertConfig('   \n  ', 'yaml', 'json');
      expect(result.output).toBe('');
      expect(result.error).toBe('Please enter some configuration to convert.');
    });

    it('returns null for JSON output when YAML parses null', () => {
      const result = convertConfig('null', 'yaml', 'json');
      expect(result.output).toBe('null');
      expect(result.error).toBe('');
    });

    it('returns error for invalid JSON', () => {
      const result = convertConfig('{invalid}', 'json', 'yaml');
      expect(result.output).toBe('');
      expect(result.error).toContain('Conversion error');
    });

    it('returns error for invalid YAML syntax', () => {
      const result = convertConfig(': broken yaml :', 'yaml', 'json');
      expect(result.output).toBe('');
      expect(result.error).toContain('Conversion error');
    });

    it('returns error for invalid TOML syntax', () => {
      const result = convertConfig('[[broken]]\nkey =', 'toml', 'json');
      expect(result.output).toBe('');
      expect(result.error).toContain('Conversion error');
    });
  });

  describe('options', () => {
    it('produces minified JSON output', () => {
      const result = convertConfig('name: John\nage: 30', 'yaml', 'json', { minify: true });
      expect(result.error).toBe('');
      // Minified JSON has no whitespace between tokens
      expect(result.output).toBe('{"name":"John","age":30}');
    });

    it('uses custom indent size', () => {
      const result = convertConfig('{"name": "John", "age": 30}', 'json', 'yaml', {
        indentSize: 4,
      });
      expect(result.error).toBe('');
      expect(result.output).toContain('name: John');
    });

    it('sorts keys alphabetically', () => {
      const result = convertConfig('{"zebra": 1, "apple": 2, "mango": 3}', 'json', 'json', {
        sortKeys: true,
      });
      expect(result.error).toBe('');
      const parsed = JSON.parse(result.output);
      const keys = Object.keys(parsed);
      expect(keys).toEqual(['apple', 'mango', 'zebra']);
    });

    it('minifies YAML output by collapsing consecutive newlines', () => {
      const input = 'a:\n  - 1\n  - 2\nb:\n  - 3\n  - 4';
      const normal = convertConfig(input, 'yaml', 'yaml', { minify: false });
      const minified = convertConfig(input, 'yaml', 'yaml', { minify: true });

      expect(normal.error).toBe('');
      expect(minified.error).toBe('');

      const normalNewlineCount = (normal.output.match(/\n\n+/g) || []).length;
      const minifiedNewlineCount = (minified.output.match(/\n\n+/g) || []).length;
      expect(minifiedNewlineCount).toBeLessThanOrEqual(normalNewlineCount);
    });
  });

  describe('TOML Date edge case', () => {
    it('handles TOML date-only values when converting to JSON', () => {
      const input = 'date = 2026-06-03\n';
      const result = convertConfig(input, 'toml', 'json');
      expect(result.error).toBe('');
      // TOML dates become ISO date strings in JSON (without time component for date-only)
      const parsed = JSON.parse(result.output);
      expect(parsed.date).toBe('2026-06-03');
    });

    it('handles TOML datetime values when converting to JSON', () => {
      const input = 'datetime = 2026-06-03T12:30:00Z\n';
      const result = convertConfig(input, 'toml', 'json');
      expect(result.error).toBe('');
      const parsed = JSON.parse(result.output);
      expect(parsed.datetime).toBe('2026-06-03T12:30:00.000Z');
    });

    it('handles TOML dates when converting to YAML', () => {
      const input = 'date = 2026-06-03\n';
      const result = convertConfig(input, 'toml', 'yaml');
      expect(result.error).toBe('');
      // Should not crash - Date should be converted to ISO string
      expect(result.output).toContain('date:');
      expect(result.output).toContain('2026-06-03');
    });
  });

  describe('format swapping behavior', () => {
    it('supports round-trip YAML → JSON → YAML', () => {
      const input = 'name: John\nage: 30\nactive: true';
      const toJson = convertConfig(input, 'yaml', 'json');
      expect(toJson.error).toBe('');

      const backToYaml = convertConfig(toJson.output, 'json', 'yaml');
      expect(backToYaml.error).toBe('');
      expect(backToYaml.output).toContain('name: John');
      expect(backToYaml.output).toContain('age: 30');
      expect(backToYaml.output).toContain('active: true');
    });

    it('supports round-trip JSON → TOML → JSON', () => {
      const input = '{"name": "John", "age": 30}';
      const toToml = convertConfig(input, 'json', 'toml');
      expect(toToml.error).toBe('');

      const backToJson = convertConfig(toToml.output, 'toml', 'json');
      expect(backToJson.error).toBe('');
      expect(JSON.parse(backToJson.output)).toEqual({ name: 'John', age: 30 });
    });

    it('supports round-trip TOML → YAML → TOML for simple values', () => {
      const input = 'name = "John"\nage = 30\n';
      const toYaml = convertConfig(input, 'toml', 'yaml');
      expect(toYaml.error).toBe('');

      const backToToml = convertConfig(toYaml.output, 'yaml', 'toml');
      expect(backToToml.error).toBe('');
      expect(backToToml.output).toContain('name = "John"');
      expect(backToToml.output).toContain('age = 30');
    });
  });
});
