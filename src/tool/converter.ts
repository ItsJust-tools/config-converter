import jsYaml from 'js-yaml';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import type { ConversionFormat } from './types';

export interface ConversionResult {
  output: string;
  error: string;
}

export function convertConfig(
  input: string,
  inputFormat: ConversionFormat,
  outputFormat: ConversionFormat,
  options: { minify?: boolean; indentSize?: number; sortKeys?: boolean; yamlToJsonTabs?: boolean } = {}
): ConversionResult {
  const { minify = false, indentSize = 2, sortKeys = false, yamlToJsonTabs = false } = options;

  if (!input.trim()) {
    return { output: '', error: 'Please enter some configuration to convert.' };
  }

  try {
    // 1. Parse input
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
      // YAML can parse "null" as null — return empty
      if (outputFormat === 'json') {
        return { output: 'null', error: '' };
      }
      return { output: '', error: '' };
    }

    // Handle sort keys recursively
    if (sortKeys && typeof parsed === 'object' && parsed !== null) {
      parsed = sortObjectKeys(parsed as Record<string, unknown>);
    }

    // 2. Serialize output
    let output: string;

    switch (outputFormat) {
      case 'yaml': {
        output = jsYaml.dump(parsed, {
          indent: indentSize,
          lineWidth: minify ? 200 : 80,
          noRefs: true,
          sortKeys: false, // already sorted if requested
        });
        output = output.trimEnd();
        if (minify) {
          // Minify YAML: remove extra newlines, compact lists
          output = output.replace(/\n\n+/g, '\n');
        }
        break;
      }
      case 'json': {
        if (minify) {
          output = JSON.stringify(parsed);
        } else {
          output = JSON.stringify(parsed, null, indentSize);
        }
        break;
      }
      case 'toml': {
        output = stringifyToml(parsed as Record<string, unknown>);
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
