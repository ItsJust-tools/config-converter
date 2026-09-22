/**
 * Shared clipboard utility for the Config Converter tool.
 *
 * Provides a consistent way to copy text to the clipboard across all components,
 * with proper error handling for various failure modes:
 * - Clipboard API unavailable (insecure context, e.g. HTTP)
 * - Permission denied (NotAllowedError)
 * - Unauthenticated iframe restrictions
 * - Other unexpected errors
 *
 * When the async Clipboard API rejects or is unavailable (insecure origins,
 * denied permissions, sandboxed iframes), we fall back to the legacy
 * `document.execCommand("copy")` approach using an off-screen textarea.
 *
 * All functions return a boolean indicating success or failure.
 */

/**
 * Check if the async Clipboard API is available in the current context.
 * Returns false in insecure contexts (HTTP) or when the API is not supported.
 *
 * Note: a `false` result does not necessarily mean copying is impossible —
 * {@link copyToClipboard} will still attempt the legacy `execCommand` fallback.
 */
export function isClipboardAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
}

/**
 * Check if the legacy `document.execCommand("copy")` fallback can be attempted.
 */
export function isLegacyCopySupported(): boolean {
  return typeof document !== 'undefined' && typeof document.execCommand === 'function';
}

/**
 * Copy text using the legacy `document.execCommand("copy")` API via a
 * temporary off-screen textarea.
 *
 * This works in insecure contexts (HTTP) and in some iframe/embedding
 * scenarios where the async Clipboard API is unavailable or rejected.
 *
 * @param text - The text to copy
 * @returns true if the copy command reported success, false otherwise
 */
function copyViaExecCommand(text: string): boolean {
  if (!isLegacyCopySupported() || typeof document === 'undefined' || !document.body) {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;

  // Keep the textarea off-screen and invisible so it never causes a layout
  // shift or a visible flash, while still remaining focusable/selectable.
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  textarea.style.width = '1px';
  textarea.style.height = '1px';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.boxShadow = 'none';
  textarea.style.opacity = '0';
  // Avoid mobile soft-keyboards / scroll-on-focus side effects.
  textarea.setAttribute('aria-hidden', 'true');

  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch (err) {
    console.debug(
      `Legacy clipboard fallback failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return false;
  } finally {
    textarea.blur();
    document.body.removeChild(textarea);
  }
}

/**
 * Copy text to the clipboard with proper error handling.
 *
 * Strategy:
 * 1. Prefer the async Clipboard API (`navigator.clipboard.writeText`) when available.
 * 2. If it rejects (permission denied, insecure origin, iframe restrictions)
 *    or is unavailable, fall back to `document.execCommand("copy")` in an
 *    off-screen textarea.
 *
 * @param text - The text to copy
 * @returns A promise that resolves to true if the copy succeeded, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (isClipboardAvailable()) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      if (err instanceof DOMException) {
        console.debug(`Clipboard API error (${err.name}): ${err.message} — trying legacy fallback`);
      } else {
        console.debug(
          `Clipboard API error: ${err instanceof Error ? err.message : String(err)} — trying legacy fallback`
        );
      }
      // Fall through to the legacy fallback below.
    }
  }

  return copyViaExecCommand(text);
}

/**
 * Copy text to the clipboard and return a human-readable status message.
 *
 * @param text - The text to copy
 * @param label - A human-readable label for the content being copied (e.g. "HEX", "RGB")
 * @returns A promise that resolves to a status message string
 */
export async function copyWithStatus(text: string, label: string): Promise<string> {
  const ok = await copyToClipboard(text);
  if (ok) {
    return `${label} copied to clipboard`;
  }
  return `Failed to copy ${label} - clipboard unavailable`;
}
