export type ConversionFormat = 'yaml' | 'json' | 'toml' | 'auto';

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
