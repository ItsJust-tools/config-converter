# Changelog

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
