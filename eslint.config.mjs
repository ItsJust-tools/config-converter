import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['src/tool/**/*.{ts,tsx}', 'src/app/tool-client.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='fetch']",
          message: 'Tool logic must stay client-local. Do not send user data via fetch.',
        },
        {
          selector: "NewExpression[callee.name='XMLHttpRequest']",
          message: 'Tool logic must stay client-local. Do not use XMLHttpRequest.',
        },
        {
          selector: "CallExpression[callee.property.name='sendBeacon']",
          message: 'Tool logic must stay client-local. Do not send telemetry/beacons.',
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'dist/**',
    'packages/*/dist/**',
    'coverage/**',
  ]),
]);

export default eslintConfig;
