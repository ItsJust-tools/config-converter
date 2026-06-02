# Config Converter

[![CI](https://github.com/ItsJust-tools/config-converter/actions/workflows/ci.yml/badge.svg)](https://github.com/ItsJust-tools/config-converter/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/badge/version-1.4.0-blue)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/itsjust-tools/config-converter/issues)

Convert between **YAML**, **JSON**, and **TOML** formats instantly. All client-side, privacy-first.

## Features

- **YAML → JSON** — Parse YAML and export as JSON
- **JSON → YAML** — Parse JSON and export as YAML
- **YAML → TOML** — Parse YAML and export as TOML
- **JSON → TOML** — Parse JSON and export as TOML
- **TOML → YAML** — Parse TOML and export as YAML
- **TOML → JSON** — Parse TOML and export as JSON
- **Minify output** — Compact output when you need smaller configs
- **Sort keys** — Alphabetically sort object keys
- **Adjustable indentation** — Choose indent size (1–8 spaces)
- **Swap formats** — One-click swap between source and target format
- **Share state** — Share your current conversion via URL
- **Dark mode** — Respects system preference with manual toggle
- **Keyboard shortcuts** — Ctrl+Enter to convert, Ctrl+Shift+C to copy output

## Supported Formats

| Format | Parsing      | Serialization |
| ------ | ------------ | ------------- |
| YAML   | ✅ js-yaml   | ✅ js-yaml    |
| JSON   | ✅ native    | ✅ native     |
| TOML   | ✅ smol-toml | ✅ smol-toml  |

## Development

```bash
npm install
npm run dev
```

## Tech Stack

- **Next.js** — App Router
- **React 19** — Server & Client Components
- **@itsjust/core** — Shared UI components
- **js-yaml** — YAML parsing/serialization
- **smol-toml** — TOML parsing/serialization
- **TypeScript** — Full type coverage
- **Tailwind CSS v4** — Utility-first styling
- **Vitest** — Unit testing
- **Playwright** — E2E testing
