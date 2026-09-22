import type { Exporter } from '../../types';
import { sanitizeFilename } from '../../utils/sanitize-filename';

const jsonExporter: Exporter = {
  format: 'json',
  export: async (_element, options, stateSerializer) => {
    try {
      const jsonString = stateSerializer?.() ?? '{}';
      return {
        success: true,
        data: jsonString,
        filename: sanitizeFilename(options.filename ?? `export-${Date.now()}.json`),
        format: 'json',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        filename: sanitizeFilename(options.filename ?? `export-${Date.now()}.json`),
        format: 'json',
        error: error instanceof Error ? error.message : 'JSON export failed',
      };
    }
  },
};

export default jsonExporter;
