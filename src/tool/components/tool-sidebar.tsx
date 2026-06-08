'use client';

import type { ConverterState, ConversionFormat } from '../types';

interface ToolSidebarProps {
  state: ConverterState;
  onInputFormatChange: (format: ConversionFormat) => void;
  onOutputFormatChange: (format: ConversionFormat) => void;
  onInputChange: (input: string) => void;
  onMinifyToggle: (minify: boolean) => void;
  onIndentSizeChange: (size: number) => void;
  onSortKeysToggle: (sortKeys: boolean) => void;
}

const FORMATS: { label: string; value: ConversionFormat }[] = [
  { label: 'Auto', value: 'auto' },
  { label: 'YAML', value: 'yaml' },
  { label: 'JSON', value: 'json' },
  { label: 'TOML', value: 'toml' },
];

export function ToolSidebar({
  state,
  onInputFormatChange,
  onOutputFormatChange,
  onInputChange,
  onMinifyToggle,
  onIndentSizeChange,
  onSortKeysToggle,
}: ToolSidebarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const indent = '  '.repeat(Math.ceil(state.indentSize / 2));
      const newValue =
        state.input.substring(0, start) + indent + state.input.substring(end);
      onInputChange(newValue);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
      });
    }
  };

  return (
    <div className="converter-sidebar">
      {/* Input Format */}
      <div className="converter-sidebar-section">
        <label className="converter-sidebar-label" htmlFor="input-format">
          Input Format
        </label>
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
      </div>

      {/* Output Format */}
      <div className="converter-sidebar-section">
        <label className="converter-sidebar-label" htmlFor="output-format">
          Output Format
        </label>
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
      </div>

      {/* Input area */}
      <div className="converter-sidebar-section converter-sidebar-section-grow">
        <label className="converter-sidebar-label" htmlFor="converter-input">
          Configuration
        </label>
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
