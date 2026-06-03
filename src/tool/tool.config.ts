import type { ToolConfig } from '@itsjust/core';

export const templateBaseVersion = '1.4.0';

const toolConfig = {
  id: 'config-converter',
  name: 'Config Converter',
  description:
    'Convert between YAML, JSON, and TOML formats instantly. Paste your config, pick source and target format, and get clean output. All client-side, privacy-first.',
  version: '1.4.0',
  exportFormats: ['json', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#eab308',
    accentHover: '#ca8a04',
    accentSubtle: 'rgba(234, 179, 8, 0.08)',
    brand: 'Config Converter',
    icon: '\u21C4',
  },
  shortcuts: [
    {
      title: 'Config Converter',
      shortcuts: [
        { keys: 'Ctrl+Enter', label: 'Convert', description: 'run the conversion' },
        {
          keys: 'Ctrl+Shift+S',
          label: 'Swap Formats',
          description: 'swap input and output formats',
        },
        {
          keys: 'Ctrl+Shift+C',
          label: 'Copy Output',
          description: 'copy converted result to clipboard',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
