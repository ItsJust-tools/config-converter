/**
 * Sanitizes a filename so it is safe to use across operating systems.
 *
 * The generated export filenames (PNG, JSON, PDF, SVG, TXT, ...) can be
 * influenced by user-provided configuration names, so they must never
 * contain characters that are invalid on common filesystems
 * (Windows in particular), nor control characters, reserved leading
 * dots, or excessive lengths.
 *
 * See issue #74.
 */

/** Maximum number of characters allowed in a sanitized export filename. */
export const MAX_EXPORT_FILENAME_LENGTH = 100;

/** Characters that are invalid on one or more major operating systems. */
const INVALID_FILENAME_CHARS = /[/\\?%*:|"<>\u0000-\u001f\u007f]/g;

/** Fallback base name used when sanitizing leaves nothing usable. */
const FALLBACK_FILENAME = 'export';

/**
 * Maximum length we allow for a file extension (including the dot).
 * Anything longer than this is treated as part of the base name instead
 * of an extension, so degenerate names like `....` or `a.b.c.d.e.f.g`
 * behave predictably.
 */
const MAX_EXTENSION_LENGTH = 10;

/**
 * Sanitize a filename for safe use on all major operating systems.
 *
 * - Control characters (U+0000–U+001F, U+007F) are removed.
 * - Invalid characters (`/ \ ? % * : | " < >`) are replaced with `-`.
 * - Leading and trailing dots/spaces are stripped (Windows reserved).
 * - Empty results fall back to `'export'`.
 * - Names longer than {@link MAX_EXPORT_FILENAME_LENGTH} characters are
 *   truncated, preserving the file extension when possible.
 * - Already-clean filenames are returned unchanged (idempotent).
 *
 * @param filename - The raw, potentially unsafe filename.
 * @returns A sanitized version of the filename, safe for all OSes.
 */
export function sanitizeFilename(filename: string): string {
  let sanitized = filename.replace(INVALID_FILENAME_CHARS, '-');

  // Windows does not allow leading/trailing dots or spaces.
  sanitized = sanitized.replace(/^[\s.]+/, '').replace(/[\s.]+$/, '');

  // Guard against the name becoming empty after sanitization.
  if (sanitized.length === 0) {
    return FALLBACK_FILENAME;
  }

  // Enforce the maximum length while preserving the extension.
  if (sanitized.length > MAX_EXPORT_FILENAME_LENGTH) {
    sanitized = truncatePreservingExtension(sanitized, MAX_EXPORT_FILENAME_LENGTH);
  }

  return sanitized;
}

/**
 * Truncate a filename to `maxLength` characters, keeping the extension.
 * If no meaningful extension can be detected, the name is hard-truncated.
 */
function truncatePreservingExtension(filename: string, maxLength: number): string {
  const dotIndex = filename.lastIndexOf('.');

  if (dotIndex <= 0) {
    // No extension (or a bare leading dot which was already stripped).
    return filename.slice(0, maxLength);
  }

  const extension = filename.slice(dotIndex);
  if (extension.length > MAX_EXTENSION_LENGTH) {
    return filename.slice(0, maxLength);
  }

  const base = filename.slice(0, dotIndex);
  const availableBaseLength = maxLength - extension.length;
  if (base.length <= availableBaseLength) {
    return filename.slice(0, maxLength);
  }

  return base.slice(0, availableBaseLength) + extension;
}
