import jsYaml from 'js-yaml';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import type { ConversionFormat } from './types';

/** Result of a conversion operation. */
export interface ConversionResult {
  /** The converted output string, or empty on error. */
  output: string;
  /** Error message if conversion failed, or empty on success. */
  error: string;
}

/**
 * Options that control how a configuration conversion is performed.
 */
export interface ConversionOptions {
  /** Whether to produce compact/minified output (default: false). */
  minify?: boolean;
  /** Number of spaces per indent level (1-8, default: 2). */
  indentSize?: number;
  /** Whether to alphabetically sort object keys (default: false). */
  sortKeys?: boolean;
}

/**
 * Converts a configuration string from one format to another.
 *
 * @param input - The raw configuration text to convert.
 * @param inputFormat - The format of the input (yaml, json, toml, or auto for auto-detection).
 * @param outputFormat - The desired output format.
 * @param options - Optional conversion settings (minify, indent size, sort keys).
 * @returns A ConversionResult with either the converted output or an error message.
 *
 * @example
 * const result = convertConfig('name: John', 'yaml', 'json');
 * // => { output: '{"name": "John"}', error: '' }
 */
export function convertConfig(
  input: string,
  inputFormat: ConversionFormat,
  outputFormat: ConversionFormat,
  options: ConversionOptions = {}
): ConversionResult {
  const { minify = false, indentSize = 2, sortKeys = false } = options;

  // Attempt auto-detection if requested
  const resolvedFormat = inputFormat === 'auto' ? detectFormat(input) : inputFormat;

  if (!input.trim()) {
    return { output: '', error: 'Please enter some configuration to convert.' };
  }

  try {
    // --- Parse input ---
    let parsed: unknown;

    switch (resolvedFormat) {
      case 'yaml': {
        parsed = jsYaml.load(input);
        break;
      }
      case 'json': {
        parsed = JSON.parse(input);
        break;
      }
      case 'toml': {
        parsed = parseToml(input);
        break;
      }
      case 'auto': {
        // Already resolved above; this case should never execute
        return { output: '', error: 'Internal error: auto-detection failed to resolve format.' };
      }
    }

    if (parsed === null || parsed === undefined) {
      // YAML can parse "null" as null — return appropriate empty result
      if (outputFormat === 'json') {
        return { output: 'null', error: '' };
      }
      return { output: '', error: '' };
    }

    // Recursively sort object keys if requested
    if (sortKeys && typeof parsed === 'object' && parsed !== null) {
      parsed = sortObjectKeys(parsed as Record<string, unknown>);
    }

    // Normalise parsed data: convert non-serializable values (e.g. Date from TOML)
    // to plain JSON-compatible representations before serialization.
    const normalised = normaliseValues(parsed);

    // --- Serialize output ---
    let output = '';

    switch (outputFormat) {
      case 'yaml': {
        output = jsYaml.dump(normalised, {
          indent: indentSize,
          lineWidth: minify ? 200 : 80,
          noRefs: true,
          sortKeys: false, // already sorted if requested
        });
        output = output.trimEnd();
        if (minify) {
          // Minify YAML: collapse consecutive newlines
          output = output.replace(/\n\n+/g, '\n');
        }
        break;
      }
      case 'json': {
        if (minify) {
          output = JSON.stringify(normalised);
        } else {
          output = JSON.stringify(normalised, null, indentSize);
        }
        break;
      }
      case 'toml': {
        output = stringifyToml(normalised as Record<string, unknown>);
        output = output.trimEnd();
        break;
      }
    }

    return { output, error: '' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Try fallback for auto-detect: if the resolved format fails, no need to retry
    return { output: '', error: `Conversion error: ${message}` };
  }
}

/**
 * Recursively converts non-serializable JavaScript values to plain JSON-safe equivalents
 * before passing them to a serialiser. This prevents runtime crashes when values like
 * `Date`, `Map`, or `Set` appear in parsed TOML or YAML and then need to be serialised
 * back to another format that doesn't natively support them.
 *
 * - `Date` → ISO 8601 string
 * - `Map` → plain object literal (keys coerced to strings)
 * - `Set` → plain array (order preserved)
 * - Arrays are mapped element-by-element
 * - Plain objects are recursed into (keys unchanged)
 * - Primitives pass through unchanged
 *
 * @param value - Any value that may contain non-serialisable types.
 * @returns A deeply-normalised, JSON-safe copy of the input.
 */
function normaliseValues(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    value.forEach((v, k) => {
      obj[String(k)] = normaliseValues(v);
    });
    return obj;
  }
  if (value instanceof Set) {
    return Array.from(value).map(normaliseValues);
  }
  if (Array.isArray(value)) {
    return value.map(normaliseValues);
  }
  if (typeof value === 'object' && value !== null) {
    const obj: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      obj[key] = normaliseValues((value as Record<string, unknown>)[key]);
    }
    return obj;
  }
  return value;
}

/**
 * Attempts to auto-detect the format of a configuration string.
 * Uses heuristics: TOML has `key = value` or `[section]` patterns,
 * JSON starts with `{` or `[`, and YAML is the fallback.
 *
 * @param input - The raw configuration text to inspect.
 * @returns The detected ConversionFormat (defaults to 'yaml').
 */
export function detectFormat(input: string): ConversionFormat {
  const trimmed = input.trim();
  if (!trimmed) return 'yaml';

  // JSON detection: begins with `{` or `[` (object or array literal)
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && tryParseJson(trimmed)) {
    return 'json';
  }

  // TOML detection: contains `[section]` header or `key = value` at the start of a line
  if (/^\s*\[.*\]\s*$/m.test(trimmed) || /^\s*\w+\s*=/m.test(trimmed)) {
    // Make sure it's not a YAML key: value pair by checking it's not a YAML valid line
    // TOML uses `=`, YAML uses `:`
    return 'toml';
  }

  // Default to YAML
  return 'yaml';
}

/**
 * Tries to parse a string as JSON without throwing.
 *
 * @param input - The string to attempt JSON parsing on.
 * @returns True if the string is valid JSON, false otherwise.
 */
function tryParseJson(input: string): boolean {
  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively sorts the keys of an object alphabetically.
 * Arrays are processed element-by-element without reordering, because
 * array order carries semantic meaning in configuration formats.
 *
 * @param obj - The object whose keys should be sorted (never mutated).
 * @returns A new object with all keys sorted at every nesting level.
 */
function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  // If the object is actually an array, sort keys within each element
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null
        ? sortObjectKeys(item as Record<string, unknown>)
        : item
    ) as unknown as Record<string, unknown>;
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      sorted[key] = sortObjectKeys(value as Record<string, unknown>);
    } else {
      sorted[key] = value;
    }
  }
  return sorted;
}

/**
 * Checks whether an unknown value is a valid ConverterState.
 * Used for safe deserialization of imported/shared data.
 */
export function isConverterState(value: unknown): value is {
  inputFormat: ConversionFormat;
  outputFormat: ConversionFormat;
  input: string;
  output: string;
  error: string;
  minify: boolean;
  indentSize: number;
  sortKeys: boolean;
} {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.inputFormat === 'string' &&
    typeof v.outputFormat === 'string' &&
    typeof v.input === 'string' &&
    typeof v.output === 'string' &&
    typeof v.error === 'string' &&
    typeof v.minify === 'boolean' &&
    typeof v.indentSize === 'number' &&
    typeof v.sortKeys === 'boolean'
  );
}
