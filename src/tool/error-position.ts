/**
 * Extracts a structured line/column position from parse errors thrown by
 * the YAML, JSON, and TOML parsers used by the converter.
 */

/** A 1-based line/column position of a parse error in the source text. */
export interface ParseErrorPosition {
  /** 1-based line number (1 = first line of input). */
  line: number;
  /** 1-based column number (1 = first character of the line). */
  column: number;
}

/**
 * Extracts a parse error position from a thrown error, if possible.
 *
 * @param err - The thrown error (YAMLException, TomlError, or JSON SyntaxError).
 * @param source - The original source text, used to derive JSON line/column from a character offset.
 * @returns A 1-based {@link ParseErrorPosition}, or null when no position can be determined.
 */
export function extractErrorPosition(err: unknown, source: string): ParseErrorPosition | null {
  if (!err || typeof err !== 'object') return null;

  const anyErr = err as {
    mark?: { line?: number; column?: number };
    line?: number;
    column?: number;
  };

  // js-yaml YAMLException and smol-toml TomlError expose .mark or .line/.column (0-based / 1-based)
  if (anyErr.mark && typeof anyErr.mark.line === 'number') {
    return {
      line: anyErr.mark.line + 1,
      column: (typeof anyErr.mark.column === 'number' ? anyErr.mark.column : 0) + 1,
    };
  }
  if (typeof anyErr.line === 'number') {
    return {
      line: anyErr.line + 1,
      column: (typeof anyErr.column === 'number' ? anyErr.column : 0) + 1,
    };
  }

  // JSON.parse SyntaxError: "… at position 42" — convert a raw character offset to line/column.
  if (err instanceof SyntaxError) {
    const match = /position (\d+)/.exec(err.message);
    if (match && source) {
      const offset = Math.min(Number(match[1]), Math.max(source.length - 1, 0));
      const before = source.slice(0, offset);
      const line = before.split('\n').length; // offset sits on this 1-based line
      const lastNewline = before.lastIndexOf('\n');
      const column = offset - lastNewline; // 1-based column within the line
      return { line, column };
    }
  }
  return null;
}

/**
 * Builds a human-readable position suffix such as " (line 3, column 7)".
 */
export function formatPositionSuffix(pos: ParseErrorPosition | null): string {
  return pos ? ` (line ${pos.line}, column ${pos.column})` : '';
}
