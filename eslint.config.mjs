import { defineConfig, globalIgnores } from 'eslint/config';
import nextCore from 'eslint-config-next';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  // eslint 10 removed the legacy rule-context API that the react plugin bundled with
  // eslint-config-next 16.2.9 still uses (context.getFilename), crashing most react/* rules.
  // core-web-vitals is mostly react-plugin rules, so run the core Next.js config until
  // eslint-config-next ships an eslint-10-compatible react plugin.
  ...nextCore,
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
  {
    // eslint 10 changed the rule context API; react/display-name in eslint-plugin-react 7.37 still
    // calls context.getFilename() and crashes the whole lint run. Disable it until the plugin ships support.
    rules: Object.fromEntries(
      [
        'react/display-name',
        'react/no-direct-mutation-state',
        'react/no-render-return-value',
        'react/no-find-dom-node',
        'react/no-is-mounted',
        'react/no-string-refs',
        'react/no-children-prop',
        'react/no-deprecated',
        'react/prop-types',
        'react/used-prop-types',
        'react/forbid-prop-types',
        'react/require-default-props',
        'react/sort-prop-types',
        'react/default-props-match-prop-types',
        'react/require-render-return',
      ].map((r) => [r, 'off'])
    ),
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
    '__tests__/e2e/**',
    '__tests__/unit/**',
    'playwright.config.ts',
    'coverage/**',
  ]),
]);

export default eslintConfig;
