import type { Tool } from '@itsjust/core';
import toolConfig from './tool.config';
import type { ConverterState } from './types';
import { convertConfig } from './converter';

function isConverterState(value: unknown): value is ConverterState {
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
    yamlToJsonTabs: false,
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
export { convertConfig };
