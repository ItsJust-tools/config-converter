import type { ToolConfig, ExportFormat, ExporterLoader } from './types';

export interface ToolExporterDefinition {
  format: ExportFormat;
  loader: ExporterLoader;
}

export type DeserializeResult<T> = { success: true; data: T } | { success: false; error: string };

/**
 * Contract that every itsjust tool must implement.
 * Provides the framework with everything it needs for
 * state persistence, export, import, and sharing.
 *
 * @example
 * export const myTool: Tool<MyState> = {
 *   id: 'my-tool',
 *   name: 'My Tool',
 *   version: '1.0',
 *   config: toolConfig,
 *   initialState: { title: '' },
 *   serialize: (state) => JSON.stringify(state),
 *   deserialize: (data) => /* validate and parse *\/,
 *   exporters: [{ format: 'png', loader: () => import('./exporters/png') }],
 * };
 */
export interface Tool<TState = unknown> {
  /** Unique identifier — used for storage keys and share files */
  id: string;
  /** Human-readable name */
  name: string;
  /** Schema version — bumped when share format changes */
  version: string;
  /** Full tool configuration */
  config: ToolConfig;
  /** State shown when the tool loads for the first time */
  initialState: TState;
  /** Convert state to a string for export / share */
  serialize(state: TState): string;
  /** Recover state from an imported / shared payload */
  deserialize(data: unknown): DeserializeResult<TState>;
  /** Declarative exporter registrations (replaces global registerExporterLoader side-effects) */
  exporters?: ToolExporterDefinition[];
}
