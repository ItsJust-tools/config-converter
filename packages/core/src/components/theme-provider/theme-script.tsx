'use client';

import type { ToolTheme } from '../../types';

export function ThemeScript({ toolTheme }: { toolTheme?: ToolTheme }) {
  const themeScript = `
    (function() {
      var theme;
      try {
        theme = localStorage.getItem('itsjust-theme');
      } catch(e) {}
      if (theme === 'system' || !theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', theme);

      var contrast;
      try {
        contrast = localStorage.getItem('itsjust-contrast');
      } catch(e) {}
      if (contrast === 'system' || !contrast) {
        contrast = (window.matchMedia('(forced-colors: active)').matches || window.matchMedia('(prefers-contrast: more)').matches)
          ? 'more'
          : 'normal';
      }
      document.documentElement.setAttribute('data-contrast', contrast);
    })();
  `;

  const toolThemeScript = toolTheme
    ? `
    (function() {
      var t = ${JSON.stringify(toolTheme)};
      var r = document.documentElement;
      if (t.accent) r.style.setProperty('--accent', t.accent);
      if (t.accentHover) r.style.setProperty('--accent-hover', t.accentHover);
      if (t.accentSubtle) r.style.setProperty('--accent-subtle', t.accentSubtle);
    })();
  `
    : '';

  return <script dangerouslySetInnerHTML={{ __html: themeScript + toolThemeScript }} />;
}
