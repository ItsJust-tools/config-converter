import type { Tool } from '@itsjust/core';
import toolConfig from './tool.config';
import type { ConverterState } from './types';
import { convertConfig, isConverterState } from './converter';

/**
 * Tool definition for the Config Converter.
 * Wires up state management, serialization/deserialization, and lazy-loaded exporters
 * for the YAML/JSON/TOML configuration converter.
 *
 * @remarks
 * Serialization strips transient fields (output, error) and only persists user-facing
 * configuration state. Deserialization accepts full state objects, raw JSON objects
 * (treated as input content), and raw strings.
 */
export const converterTool: Tool<ConverterState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: {
    inputFormat: 'yaml',
    outputFormat: 'json',
    input: '',
    output: '',
    error: '',
    minify: false,
    indentSize: 2,
    sortKeys: false,
  },
  serialize: (state) => JSON.stringify(state, null, 2),
  deserialize: (data) => {
    if (isConverterState(data)) {
      return { success: true, data };
    }
    // If the imported data is a plain JSON object/array (not a full ConverterState),
    // treat it as input content - set it as the converter input.
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const input = JSON.stringify(data, null, 2);
      return {
        success: true,
        data: {
          ...converterTool.initialState,
          input,
        },
      };
    }
    // Also support importing raw JSON strings or arrays
    if (typeof data === 'string') {
      return {
        success: true,
        data: {
          ...converterTool.initialState,
          input: data,
        },
      };
    }
    return {
      success: false,
      error: 'Invalid data format: expected ConverterState or JSON content',
    };
  },
  exporters: [
    {
      format: 'pdf',
      loader: () => import('./exporters/pdf'),
    },
  ],
};

// Re-export converter for convenience
/**
 * Parse configuration input and serialize it to the target format.
 * Convenience re-export of {@link convertConfig} from `./converter`.
 *
 * @param input - Raw configuration text to convert.
 * @param inputFormat - Source format ('yaml', 'json', 'toml', or 'auto' for detection).
 * @param outputFormat - Desired output format.
 * @param options - Optional settings (minify, indent size, sort keys).
 * @returns A ConversionResult with either the converted output or an error message.
 */
export { convertConfig };
