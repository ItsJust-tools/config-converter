import type { Exporter } from '@itsjust/core';
import { formatExportError, throwIfAborted } from './utils';

function collectStyles(): string {
  const chunks: string[] = [];
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    if (!sheet) continue;
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];
        if (rule) chunks.push(rule.cssText);
      }
    } catch {
      // Cross-origin stylesheets are skipped
    }
  }
  return chunks.join('\n');
}

function createPrintClone(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;

  const textarea = clone.querySelector('textarea');
  if (textarea instanceof HTMLTextAreaElement && textarea.parentNode) {
    const replacement = document.createElement('div');
    replacement.className = 'notepad-textarea-replacement';
    replacement.textContent = textarea.value;

    const computed = window.getComputedStyle(textarea);
    replacement.style.font = computed.font;
    replacement.style.lineHeight = computed.lineHeight;
    replacement.style.letterSpacing = computed.letterSpacing;
    replacement.style.color = computed.color;
    replacement.style.background = 'transparent';
    replacement.style.padding = computed.padding;
    replacement.style.whiteSpace = 'pre-wrap';
    replacement.style.overflowWrap = 'anywhere';
    replacement.style.wordBreak = 'break-word';
    replacement.style.width = '100%';
    replacement.style.maxWidth = '100%';
    replacement.style.border = 'none';
    replacement.style.outline = 'none';
    replacement.style.margin = '0';
    replacement.style.boxSizing = 'border-box';
    replacement.style.minHeight = '0';
    replacement.style.flex = 'none';
    replacement.style.height = 'auto';

    textarea.parentNode.replaceChild(replacement, textarea);
  }

  return clone.outerHTML;
}

const pdfExporter: Exporter = {
  format: 'pdf',
  export: async (element, options) => {
    try {
      throwIfAborted(options.signal);

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.margin = '0';
      iframe.style.padding = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) {
        iframe.remove();
        throw new Error('Failed to create print iframe');
      }

      const theme = document.documentElement.getAttribute('data-theme') ?? '';
      const contrast = document.documentElement.getAttribute('data-contrast') ?? '';

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html data-theme="${theme}" data-contrast="${contrast}">
        <head>
          <style>${collectStyles()}</style>
        </head>
        <body>
          <div id="print-root">${createPrintClone(element)}</div>
        </body>
        </html>
      `);
      doc.close();

      throwIfAborted(options.signal);

      await new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
        // Fallback in case load event doesn't fire
        setTimeout(resolve, 100);
      });

      // Small delay to ensure styles are applied
      await new Promise((resolve) => setTimeout(resolve, 50));

      throwIfAborted(options.signal);
      iframe.contentWindow?.print();

      // Cleanup after print dialog is dismissed
      setTimeout(() => iframe.remove(), 1000);

      return {
        success: true,
        data: null,
        filename: options.filename ?? `export-${Date.now()}.pdf`,
        format: 'pdf',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        filename: options.filename ?? `export-${Date.now()}.pdf`,
        format: 'pdf',
        error: formatExportError(error, 'PDF'),
      };
    }
  },
};

export default pdfExporter;
