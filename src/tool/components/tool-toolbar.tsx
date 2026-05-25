'use client';

import type { ConverterState, ConversionFormat } from '../types';

interface ToolToolbarProps {
  state: ConverterState;
  onConvert: () => void;
  onSwapFormats: () => void;
  onCopyOutput: () => void;
  onClear: () => void;
}

const FORMATS: { label: string; value: ConversionFormat }[] = [
  { label: 'YAML', value: 'yaml' },
  { label: 'JSON', value: 'json' },
  { label: 'TOML', value: 'toml' },
];

export function ToolToolbar({ state, onConvert, onSwapFormats, onCopyOutput, onClear }: ToolToolbarProps) {
  return (
    <div className="converter-toolbar">
      <div className="converter-toolbar-row">
        <button
          type="button"
          className="converter-btn converter-btn-primary"
          onClick={onConvert}
          aria-label="Convert"
          disabled={!state.input.trim()}
        >
          Convert
        </button>
        <button
          type="button"
          className="converter-btn converter-btn-secondary"
          onClick={onSwapFormats}
          aria-label="Swap input and output formats"
          title="Swap formats"
        >
          ⇄ Swap
        </button>
        {state.output && (
          <button
            type="button"
            className="converter-btn converter-btn-secondary"
            onClick={onCopyOutput}
            aria-label="Copy output to clipboard"
          >
            Copy Output
          </button>
        )}
        <button
          type="button"
          className="converter-btn converter-btn-outline"
          onClick={onClear}
          aria-label="Clear all"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
