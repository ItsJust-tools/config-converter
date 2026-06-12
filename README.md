# Config Converter

[![CI](https://github.com/ItsJust-tools/config-converter/actions/workflows/ci.yml/badge.svg)](https://github.com/ItsJust-tools/config-converter/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/badge/version-1.4.1-blue)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/itsjust-tools/config-converter/issues)

Convert between **YAML**, **JSON**, and **TOML** formats instantly. Paste your config, pick source and target format, and get clean output. All client-side, privacy-first.

**Live at:** [config-converter.itsjust.tools](https://config-converter.itsjust.tools)

## Features

- **YAML → JSON** — Parse YAML and export as JSON
- **JSON → YAML** — Parse JSON and export as YAML
- **YAML → TOML** — Parse YAML and export as TOML
- **JSON → TOML** — Parse JSON and export as TOML
- **TOML → YAML** — Parse TOML and export as YAML
- **TOML → JSON** — Parse TOML and export as JSON
- **Auto-detect format** — Let the tool figure out the input format automatically
- **Minify output** — Compact output when you need smaller configs
- **Sort keys** — Alphabetically sort object keys
- **Adjustable indentation** — Choose indent size (1–8 spaces)
- **Swap formats** — One-click swap between source and target format
- **Share state** — Share your current conversion via URL (compressed with LZ-String)
- **Dark mode** — Respects system preference with manual toggle
- **Privacy-first** — Everything runs in your browser. No data sent to any server
- **Keyboard shortcuts** — See table below

## Supported Formats

| Format | Parsing      | Serialization |
| ------ | ------------ | ------------- |
| YAML   | ✅ js-yaml   | ✅ js-yaml    |
| JSON   | ✅ native    | ✅ native     |
| TOML   | ✅ smol-toml | ✅ smol-toml  |

## Keyboard Shortcuts

| Shortcut        | Action              |
| --------------- | ------------------- |
| `Ctrl+Enter`    | Run conversion      |
| `Ctrl+Shift+S`  | Swap source/target formats |
| `Ctrl+Shift+C`  | Copy output to clipboard |
| `Ctrl+Shift+X`  | Clear everything    |

## Usage

1. **Paste or type** your configuration in the input panel
2. **Select input format** (YAML, JSON, TOML, or Auto-detect)
3. **Select output format** (what you want to convert to)
4. **Click Convert** (or press `Ctrl+Enter`)
5. **Copy the result** or swap formats and try again
6. Toggle **Minify** for compact output, **Sort keys** for alphabetical ordering
7. Adjust **indentation** (1–8 spaces) to match your project style
8. Click the **swap button** to quickly exchange source and target

### Auto-detect

When the input format is set to **Auto**, the tool uses heuristics to figure out the format:

1. **JSON** — Input begins with `{` or `[` and parses as valid JSON
2. **TOML** — Contains `[section]` headers or `key = value` assignments (TOML uses `=`, YAML uses `:`)
3. **YAML** — Fallback for anything that isn't explicit JSON or TOML

## Examples

| Input                       | Output Format | Result                               |
| --------------------------- | ------------- | ------------------------------------ |
| `name: John\nage: 30`       | JSON          | `{"name": "John", "age": 30}`     |
| `{"name": "John"}`         | YAML          | `name: John`                         |
| `name = "John"\nage = 30`  | JSON          | `{"name": "John", "age": 30}`     |
| `server:\n  port: 8080`    | TOML          | `[server]\n  port = 8080`           |

## Build & Test

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests
npm test

# Run E2E tests (requires dev server)
npm run test:e2e

# Build for production
npm run build
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19
- **State:** Custom hooks with undo/redo and URL sharing
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Parsing:** js-yaml & smol-toml
- **Testing:** Vitest (unit), Playwright (E2E)
- **Core:** @itsjust/core — shared infrastructure

## Project Structure

```
src/
├── app/              # Next.js App Router pages and layout
│   ├── globals.css   # Global styles
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Main entry point
│   └── tool-client.tsx # Client-side state management and keyboard shortcuts
├── lib/              # Shared utilities (SEO, helpers)
└── tool/             # Config converter implementation
    ├── components/   # React components (canvas, sidebar, toolbar)
    ├── exporters/    # Export implementations (PDF, PNG, JPEG, WebP)
    ├── lib/          # Format conversion logic
    ├── converter.ts  # Core YAML/JSON/TOML parsing and serialization logic
    ├── types.ts      # TypeScript type definitions
    ├── tool-definition.ts # Tool definition and state serialization
    ├── tool.config.ts    # Tool configuration and keyboard shortcut registry
    └── template-metadata.ts # SEO and template metadata
packages/
└── core/             # Shared infrastructure package (undo/redo, auto-save, export, etc.)
```

## API Reference

### `converter.ts`

| Function | Description |
|----------|-------------|
| `convertConfig(input, inputFormat, outputFormat, options?)` | Parse input string and serialize to the target format. Returns `{ output, error }`. |
| `detectFormat(input)` | Auto-detect the format (yaml/json/toml) of a configuration string using heuristics. |
| `isConverterState(value)` | Type guard for safe deserialization of imported/shared state. |
| `normaliseValues(value)` | Deeply transforms non-serializable JS values (`Date`, `BigInt`, `Map`, `Set`, `RegExp`, `Symbol`, `undefined`) into JSON-safe equivalents. Used internally before serialization; exported for advanced use cases. |

### `types.ts`

| Type/Interface | Description |
|----------------|-------------|
| `ConversionFormat` | Union type: `'yaml' \| 'json' \| 'toml' \| 'auto'` |
| `ConverterState` | Serialisable state shape with all input/output fields and formatting options. |

## License

MIT © ItsJust-tools
