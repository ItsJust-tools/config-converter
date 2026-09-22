# Changelog

## v1.4.2 (2026-09-22)

- Fixed export filename sanitization (issue #74): generated filenames for PNG, JPEG, WebP, JSON, PDF, and share downloads are now sanitized against invalid OS characters (`/ \ : * ? " < > |` and `%`), control characters, reserved leading/trailing dots, and are limited to 100 characters while preserving the extension
- Added `sanitizeFilename` utility (exported from `@itsjust/core` with `MAX_EXPORT_FILENAME_LENGTH`); applied at every export/download choke point (export engine, JSON/PDF/canvas exporters, share download and Web Share) including defense-in-depth sanitization of custom exporters' results

## v1.4.1 (2026-06-03)

- Updated outdated dependencies: js-yaml@4.2.0, next@16.2.7, react@19.2.7, react-dom@19.2.7, @types/react@19.2.16, @vitejs/plugin-react@6.0.2, @vitest/coverage-v8@4.1.8, vitest@4.1.8, eslint-config-next@16.2.7, lint-staged@17.0.7, lucide-react@1.17.0
- Improved canvas UI: replaced read-only textarea with consistent `<pre>` block for input display
- Added comprehensive JSDoc to `normaliseValues` and `sortObjectKeys` functions
- Added unit tests for `isConverterState`, Map/Set normalization, and nested sort-object-keys
- Removed unused `.converter-textarea-input` CSS class

## v1.4.0 (2026-06-03)

- Added comprehensive unit tests for `convertConfig` (all format combinations, options, edge cases)
- Fixed TOML Date/Map/Set serialization crash when converting to YAML
- Added `normaliseValues` utility to convert non-serializable values to JSON-safe equivalents
- Connected keyboard shortcuts (Ctrl+Enter, Ctrl+Shift+S, Ctrl+Shift+C) to actual handlers
- Aligned tool config version with package version

## v1.0.0 (2026-05-25)

- Initial release
- YAML, JSON, and TOML parsing/serialization
- Sidebar with input format, output format, and options
- Split-pane canvas: input on left, output on right
- Minify output option
- Sort keys alphabetically
- Adjustable indent size
- Swap formats in one click
- Share state via URL
- Dark mode support
- Keyboard shortcuts
