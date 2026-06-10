'use client';

import type { ConverterState } from '../types';
import { detectFormat } from '../converter';

/** Props for the {@link ToolCanvas} component. */
interface ToolCanvasProps {
  /** Current converter state to display. */
  state: ConverterState;
  /** Optional ref forwarded to the root element for export/screenshot purposes. */
  canvasRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Main canvas area for the Config Converter tool.
 *
 * Renders a two-column layout showing the input (preview) on the left and
 * the converted output on the right. Both panes include format labels and
 * character counts. When either pane is empty a placeholder message is shown.
 *
 * When the input format is set to `'auto'` the detected format is displayed
 * in parentheses next to the input label (e.g., "Auto (YAML)").
 *
 * @example
 * ```tsx
 * <ToolCanvas state={state} canvasRef={ref} />
 * ```
 */
export function ToolCanvas({ state, canvasRef }: ToolCanvasProps) {
  const outputLength = state.output.length;
  const hasInput = state.input.trim().length > 0;
  const detectedFormat =
    state.inputFormat === 'auto' && hasInput ? detectFormat(state.input) : null;
  const inputLabel =
    state.inputFormat === 'auto'
      ? `Auto${detectedFormat ? ` (${detectedFormat.toUpperCase()})` : ''}`
      : state.inputFormat.toUpperCase();

  return (
    <div
      ref={canvasRef}
      className="converter-canvas"
      role="application"
      aria-label="Config Converter"
    >
      {state.error && (
        <div className="converter-error" role="alert">
          <span className="converter-error-icon">⚠️</span>
          <span>{state.error}</span>
        </div>
      )}

      {/* Input area — rendered as a <pre> block for read-only display */}
      <div className="converter-pane">
        <div className="converter-pane-header">
          <span className="converter-pane-label">Input ({inputLabel})</span>
          <span className="converter-pane-stats">{state.input.length.toLocaleString()} chars</span>
        </div>
        {state.input ? (
          <pre className="converter-output">
            <code>{state.input}</code>
          </pre>
        ) : (
          <div className="converter-empty">
            <div className="converter-empty-icon">⇄</div>
            <p className="converter-empty-text">Type or paste YAML, JSON, or TOML in the sidebar</p>
            <p className="converter-empty-hint">Ctrl+Enter to convert · Ctrl+Shift+S to swap</p>
          </div>
        )}
      </div>

      {/* Output area with aria-live for screen reader announcements */}
      <div className="converter-pane" aria-live="polite" aria-atomic="true">
        <div className="converter-pane-header">
          <span className="converter-pane-label">Output ({state.outputFormat.toUpperCase()})</span>
          <div className="converter-pane-actions">
            {outputLength > 0 && (
              <span className="converter-pane-stats">{outputLength.toLocaleString()} chars</span>
            )}
          </div>
        </div>
        {state.output ? (
          <pre className="converter-output" data-testid="converter-output">
            <code>{state.output}</code>
          </pre>
        ) : (
          <div className="converter-empty" data-testid="converter-empty-output">
            <div className="converter-empty-icon">⇄</div>
            <p className="converter-empty-text">
              {hasInput && !state.error
                ? 'Click Convert or press Ctrl+Enter'
                : state.error
                  ? ''
                  : 'Paste YAML, JSON, or TOML and click Convert'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
