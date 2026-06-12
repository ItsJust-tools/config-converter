/**
 * Shared clipboard utility for the Config Converter tool.
 *
 * Provides a consistent way to copy text to the clipboard across all components,
 * with proper error handling for various failure modes:
 * - Clipboard API unavailable (insecure context, e.g. HTTP)
 * - Permission denied (NotAllowedError)
 * - Other unexpected errors
 *
 * All functions return a boolean indicating success or failure.
 */

/**
 * Check if the Clipboard API is available in the current context.
 * Returns false in insecure contexts (HTTP) or when the API is not supported.
 */
export function isClipboardAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
}

/**
 * Copy text to the clipboard with proper error handling.
 *
 * @param text - The text to copy
 * @returns A promise that resolves to true if the copy succeeded, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!isClipboardAvailable()) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    if (err instanceof DOMException) {
      console.debug(`Clipboard error (${err.name}): ${err.message}`);
    }
    return false;
  }
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