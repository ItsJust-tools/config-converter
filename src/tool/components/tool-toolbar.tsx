'use client';

import type { ConverterState } from '../types';

/** Props for the {@link ToolToolbar} component. */
interface ToolToolbarProps {
  /** Current converter state. */
  state: ConverterState;
  /** Callback to execute the conversion. */
  onConvert: () => void;
  /** Callback to swap input and output formats. */
  onSwapFormats: () => void;
  /** Callback to copy the output to the clipboard. */
  onCopyOutput: () => void;
  /** Callback to clear all state (input, output, error). */
  onClear: () => void;
}

/**
 * Toolbar for the Config Converter tool.
 *
 * Provides action buttons: Convert, Swap, Copy Output, and Clear.
 * Buttons are disabled or hidden contextually — for example, Convert
 * is disabled when there is no input, and Copy Output only appears
 * when there is converted output to copy.
 *
 * @example
 * ```tsx
 * <ToolToolbar
 *   state={state}
 *   onConvert={handleConvert}
 *   onSwapFormats={handleSwap}
 *   onCopyOutput={handleCopy}
 *   onClear={handleClear}
 * />
 * ```
 */
export function ToolToolbar({
  state,
  onConvert,
  onSwapFormats,
  onCopyOutput,
  onClear,
}: ToolToolbarProps) {
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
