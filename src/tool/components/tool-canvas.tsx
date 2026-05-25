'use client';

import type { ConverterState } from '../types';

interface ToolCanvasProps {
  state: ConverterState;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
}

export function ToolCanvas({ state, canvasRef }: ToolCanvasProps) {
  const outputLength = state.output.length;

  return (
    <div ref={canvasRef} className="converter-canvas" role="application" aria-label="Config Converter">
      {state.error && (
        <div className="converter-error" role="alert">
          <span className="converter-error-icon">⚠️</span>
          <span>{state.error}</span>
        </div>
      )}

      {/* Input area */}
      <div className="converter-pane">
        <div className="converter-pane-header">
          <span className="converter-pane-label">Input ({state.inputFormat.toUpperCase()})</span>
          <span className="converter-pane-stats">
            {state.input.length.toLocaleString()} chars
          </span>
        </div>
        <textarea
          className="converter-textarea converter-textarea-input"
          value={state.input}
          readOnly
          placeholder="Enter configuration to convert..."
          aria-label="Input configuration"
          rows={Math.max(8, Math.min(Math.ceil(state.input.length / 60), 20))}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
      </div>

      {/* Output area */}
      <div className="converter-pane">
        <div className="converter-pane-header">
          <span className="converter-pane-label">Output ({state.outputFormat.toUpperCase()})</span>
          <div className="converter-pane-actions">
            {outputLength > 0 && (
              <span className="converter-pane-stats">
                {outputLength.toLocaleString()} chars
              </span>
            )}
          </div>
        </div>
        {state.output ? (
          <pre className="converter-output">
            <code>{state.output}</code>
          </pre>
        ) : (
          <div className="converter-empty">
            <div className="converter-empty-icon">⇄</div>
            <p className="converter-empty-text">
              {state.input.trim()
                ? 'Click Convert or press Ctrl+Enter'
                : 'Paste YAML, JSON, or TOML and click Convert'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
