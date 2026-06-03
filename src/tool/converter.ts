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
 * @param inputFormat - The format of the input (yaml, json, or toml).
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

  if (!input.trim()) {
    return { output: '', error: 'Please enter some configuration to convert.' };
  }

  try {
    // --- Parse input ---
    let parsed: unknown;

    switch (inputFormat) {
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
    let output: string;

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
    return { output: '', error: `Conversion error: ${message}` };
  }
}

/**
 * Recursively converts non-serializable values to plain JSON-safe equivalents.
 * - Date → ISO string
 * - Map → plain object
 * - Set → array
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
 * Recursively sorts the keys of an object alphabetically.
 * Arrays are processed element-by-element without reordering.
 */
function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return sortObjectKeys(item as Record<string, unknown>);
      }
      return item;
    }) as unknown as Record<string, unknown>;
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
