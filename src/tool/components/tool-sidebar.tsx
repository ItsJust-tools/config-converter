'use client';

import { useCallback, useRef } from 'react';
import type { ConverterState, ConversionFormat } from '../types';
import { detectFormat } from '../converter';

/** Props for the {@link ToolSidebar} component. */
interface ToolSidebarProps {
  /** Current converter state. */
  state: ConverterState;
  /** Called when the user selects a different input format. */
  onInputFormatChange: (format: ConversionFormat) => void;
  /** Called when the user selects a different output format. */
  onOutputFormatChange: (format: ConversionFormat) => void;
  /** Called when the user edits the configuration textarea. */
  onInputChange: (input: string) => void;
  /** Called when the user toggles minification. */
  onMinifyToggle: (minify: boolean) => void;
  /** Called when the user changes the indent size slider. */
  onIndentSizeChange: (size: number) => void;
  /** Called when the user toggles alphabetical key sorting. */
  onSortKeysToggle: (sortKeys: boolean) => void;
  /** Called when the user wants to load a sample configuration. */
  onLoadSample?: (sample: string) => void;
}

/**
 * Sample configurations for each input format, providing quick-start examples
 * so users can try the tool without typing anything.
 */
const SAMPLE_CONFIGS: Record<
  Exclude<ConversionFormat, 'auto'>,
  { label: string; content: string }
> = {
  yaml: {
    label: 'YAML',
    content: `# Server Configuration
server:
  host: localhost
  port: 8080
  ssl: false
  timeout: 30

# Database Settings
database:
  driver: postgresql
  host: db.example.com
  port: 5432
  name: myapp
  pool:
    min: 2
    max: 10

# Logging
logging:
  level: info
  file: /var/log/app.log`,
  },
  json: {
    label: 'JSON',
    content: `{
  "name": "Config Converter",
  "version": "1.0.0",
  "description": "Convert between YAML, JSON, and TOML",
  "dependencies": {
    "js-yaml": "^4.1.0",
    "smol-toml": "^1.3.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run"
  }
}`,
  },
  toml: {
    label: 'TOML',
    content: `[package]
name = "config-converter"
version = "1.0.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
toml = "0.8"

[profile.release]
opt-level = 3
lto = true

[workspace]
members = ["packages/*"]`,
  },
};

/**
 * Sidebar panel for the Config Converter tool.
 *
 * Provides format selection (input/output), a textarea for pasting configuration,
 * and toggles for minification, key sorting, and indent size. Includes a "Load sample"
 * feature to quickly populate the textarea with predefined examples.
 *
 * The textarea handles Tab key insertion so users can indent configuration text
 * without losing focus.
 *
 * When input format is set to "Auto", a detected-format badge is shown next to
 * the Configuration label.
 *
 * @example
 * ```tsx
 * <ToolSidebar
 *   state={state}
 *   onInputFormatChange={setInputFormat}
 *   onOutputFormatChange={setOutputFormat}
 *   onInputChange={setInput}
 *   …
 * />
 * ```
 */
export function ToolSidebar({
  state,
  onInputFormatChange,
  onOutputFormatChange,
  onInputChange,
  onMinifyToggle,
  onIndentSizeChange,
  onSortKeysToggle,
  onLoadSample,
}: ToolSidebarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const indent = '  '.repeat(Math.ceil(state.indentSize / 2));
      const newValue = state.input.substring(0, start) + indent + state.input.substring(end);
      onInputChange(newValue);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
      });
    }
  };

  const hasInput = state.input.trim().length > 0;
  const detectedFormat =
    state.inputFormat === 'auto' && hasInput ? detectFormat(state.input) : null;
  const resolvedFormat =
    state.inputFormat === 'auto' ? detectedFormat || 'yaml' : state.inputFormat;

  const handleLoadSample = useCallback(
    (format: Exclude<ConversionFormat, 'auto'>) => {
      const sample = SAMPLE_CONFIGS[format];
      if (sample) {
        onInputFormatChange(format);
        onLoadSample?.(sample.content);
      }
    },
    [onInputFormatChange, onLoadSample]
  );

  return (
    <div className="converter-sidebar">
      {/* Input Format */}
      <div className="converter-sidebar-section">
        <fieldset className="converter-sidebar-fieldset">
          <legend className="converter-sidebar-label">Input Format</legend>
          <div className="converter-format-group" role="radiogroup" aria-label="Input format">
            {FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                type="button"
                className={`converter-format-btn ${state.inputFormat === fmt.value ? 'converter-format-btn-active' : ''}`}
                onClick={() => onInputFormatChange(fmt.value)}
                role="radio"
                aria-checked={state.inputFormat === fmt.value}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Output Format */}
      <div className="converter-sidebar-section">
        <fieldset className="converter-sidebar-fieldset">
          <legend className="converter-sidebar-label">Output Format</legend>
          <div className="converter-format-group" role="radiogroup" aria-label="Output format">
            {FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                type="button"
                className={`converter-format-btn ${state.outputFormat === fmt.value ? 'converter-format-btn-active' : ''}`}
                onClick={() => onOutputFormatChange(fmt.value)}
                role="radio"
                aria-checked={state.outputFormat === fmt.value}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Input area */}
      <div className="converter-sidebar-section converter-sidebar-section-grow">
        <div className="converter-sidebar-label-row">
          <label className="converter-sidebar-label" htmlFor="converter-input">
            Configuration
            {state.inputFormat === 'auto' && detectedFormat && hasInput && (
              <span className="converter-detected-format" title="Detected format">
                (detected: {detectedFormat.toUpperCase()})
              </span>
            )}
          </label>
          <span className="converter-load-sample-group">
            <span className="converter-load-sample-label">Load sample:</span>
            {(Object.keys(SAMPLE_CONFIGS) as Array<Exclude<ConversionFormat, 'auto'>>).map(
              (fmt) => (
                <button
                  key={fmt}
                  type="button"
                  className="converter-load-sample-btn"
                  onClick={() => handleLoadSample(fmt)}
                  aria-label={`Load ${fmt.toUpperCase()} sample`}
                >
                  {fmt.toUpperCase()}
                </button>
              )
            )}
          </span>
        </div>
        <textarea
          id="converter-input"
          className="converter-sidebar-textarea"
          value={state.input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Paste YAML, JSON, or TOML here…"
          rows={12}
          spellCheck={false}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Options */}
      <div className="converter-sidebar-section">
        <label className="converter-sidebar-label">Options</label>
        <div className="converter-options">
          <label className="converter-option">
            <input
              type="checkbox"
              checked={state.minify}
              onChange={(e) => onMinifyToggle(e.target.checked)}
            />
            <span>Minify output</span>
          </label>
          <label className="converter-option">
            <input
              type="checkbox"
              checked={state.sortKeys}
              onChange={(e) => onSortKeysToggle(e.target.checked)}
            />
            <span>Sort keys</span>
          </label>
          <div className="converter-option converter-option-range">
            <label htmlFor="indent-size">Indent: {state.indentSize}</label>
            <input
              id="indent-size"
              type="range"
              min={1}
              max={8}
              value={state.indentSize}
              onChange={(e) => onIndentSizeChange(Number(e.target.value))}
              aria-label="Indent size"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const FORMATS: { label: string; value: ConversionFormat }[] = [
  { label: 'Auto', value: 'auto' },
  { label: 'YAML', value: 'yaml' },
  { label: 'JSON', value: 'json' },
  { label: 'TOML', value: 'toml' },
];
