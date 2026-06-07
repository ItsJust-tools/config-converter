/** Represents the input and output configuration formats supported by the converter. `'auto'` uses format detection heuristics. */
export type ConversionFormat = 'yaml' | 'json' | 'toml' | 'auto';

/**
 * Full state of the Config Converter tool, serialisable for import/export and URL sharing.
 *
 * @property inputFormat - Source format (or 'auto' for detection).
 * @property outputFormat - Desired output format.
 * @property input - Raw source text to convert.
 * @property output - Last successful conversion result (empty string when no conversion has been performed).
 * @property error - Error message from the last failed conversion (empty on success).
 * @property minify - When true, produces compact output (no extra whitespace).
 * @property indentSize - Number of spaces per indent level (1–8).
 * @property sortKeys - When true, object keys are sorted alphabetically.
 */
export interface ConverterState {
  inputFormat: ConversionFormat;
  outputFormat: ConversionFormat;
  input: string;
  output: string;
  error: string;
  minify: boolean;
  indentSize: number;
  sortKeys: boolean;
}
