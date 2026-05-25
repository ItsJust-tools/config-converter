# itsjust Template — AI Assistant Guide

> **Read this file in full before modifying anything.** The rules, contracts, and boundaries documented here are binding for all tools built on this template. If something in this document conflicts with what you think should be done, follow the document and report the discrepancy.

## Project Overview

Single-purpose web tool template built with Next.js App Router. Each tool does ONE thing well — no bloat, no signups.

**Live example:** [itsjust.tools](https://itsjust.tools)

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** React 19, Tailwind CSS 4, shadcn-style components
- **State:** `useToolState` hook (custom, with undo/redo)
- **Testing:** Vitest (unit), Playwright (E2E)
- **Deployment:** Docker (self-hosted)

## Monorepo Structure

```text
template/
├── src/                      # App source code
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # Tool page (Server Component)
│   │   ├── tool-client.tsx   # Client component (main logic)
│   ├── tool/                 # Tool-specific code (CUSTOMIZE THIS)
│   │   ├── tool.config.ts    # Tool metadata & features
│   │   ├── tool-definition.ts # Tool contract (state, serialize, deserialize)
│   │   ├── template-metadata.ts # Locale, URL, PWA metadata
│   │   ├── types.ts          # Tool-specific types
│   │   ├── components/       # Canvas, Toolbar, Sidebar
│   │   └── exporters/        # Lazy-loaded exporters (png, pdf, ...)
│   └── lib/                  # Utilities (seo.ts, utils.ts)
├── packages/core/            # @itsjust/core (shared)
│   ├── src/
│   │   ├── types/            # ToolConfig, ExportFormat, ShareData, etc.
│   │   ├── components/       # ToolShell, ThemeProvider, ToastProvider
│   │   ├── hooks/            # useToolState, useExport, useImport, useShare
│   │   ├── engines/          # ExportEngine, StorageManager
│   │   └── testing/          # renderTool(), createMockToolState()
│   └── __tests__/            # Core unit tests
├── __tests__/                # App-level tests
│   ├── unit/                 # Tool-specific unit tests
│   └── e2e/                  # Playwright E2E tests
└── scripts/                  # Preflight, bundle-size checks
```

## Creating a New Tool

> **Do not skip steps or skip reading the relevant sections above.** Each step below references concepts (contracts, file boundaries, design principles) that are defined earlier in this document.

1. Read the **File Boundaries** section to know what you may edit.
2. Read the **Design Principles** section to internalize the UX constraints.
3. Edit `src/tool/tool.config.ts` — set id, name, export formats
4. Replace `src/tool/tool-definition.ts` — state shape, serialize, deserialize
5. Edit `src/tool/template-metadata.ts` — locale, URL defaults
6. Replace `src/tool/components/` — canvas, toolbar, sidebar
7. Wire up `src/app/tool-client.tsx` and `src/app/page.tsx`
8. Replace `public/og.svg` — Open Graph image
9. Run `node scripts/preflight.mjs` to validate

## Canonical Import/Export/Share Contracts

This section is the **single source of truth** for all data contracts. All code and docs must match this.

### `.itsjust.json` Share Format

```json
{
  "$schema": "itsjust-tool",
  "toolId": "simple-notepad",
  "version": "1.0",
  "content": { "text": "...", "title": "My Note" },
  "createdAt": "2026-04-22T12:00:00Z",
  "metadata": { "schemaVersion": "1.0" }
}
```

| Field       | Type     | Required | Description                    |
| ----------- | -------- | -------- | ------------------------------ |
| `$schema`   | `string` | Yes      | Always `"itsjust-tool"`        |
| `toolId`    | `string` | Yes      | Matches `toolConfig.id`        |
| `version`   | `string` | Yes      | Schema version                 |
| `content`   | `object` | Yes      | Passed to `tool.deserialize()` |
| `createdAt` | `string` | Yes      | ISO 8601 timestamp             |
| `metadata`  | `object` | No       | Optional extra metadata        |

### Import/Export Verträge

**`ImportResult` (Discriminated Union):**

```ts
type ImportResult =
  | { success: true; data: unknown; isItsJustFile: boolean }
  | { success: false; error: string; isItsJustFile: boolean };
```

**`DeserializeResult<T>` (Discriminated Union):**

```ts
type DeserializeResult<T> = { success: true; data: T } | { success: false; error: string };
```

**`ExportResult`:**

```ts
type ExportResult = {
  success: boolean;
  data: Blob | string | null;
  filename: string;
  format: ExportFormat;
  error?: string;
};
```

### Export Formats

| Format | Requires canvas | Lazy-loaded | File                         |
| ------ | --------------- | ----------- | ---------------------------- |
| `json` | No              | No          | Built into `@itsjust/core`   |
| `png`  | Yes             | Yes         | `src/tool/exporters/png.ts`  |
| `jpeg` | Yes             | Yes         | `src/tool/exporters/jpeg.ts` |
| `webp` | Yes             | Yes         | `src/tool/exporters/webp.ts` |
| `pdf`  | Yes             | Yes         | `src/tool/exporters/pdf.ts`  |

Register exporters in `src/tool/tool-definition.ts`:

```ts
exporters: [
  { format: 'png', loader: () => import('./exporters/png') },
  { format: 'pdf', loader: () => import('./exporters/pdf') },
],
```

## Key Patterns

### Import/Export System (100% Client-Side)

Alles läuft im Browser — kein Server, keine API-Calls:

```tsx
const { exportTo, supportedFormats, isExporting } = useExport(canvasRef, toolConfig, serialize);
const { importFromFile } = useImport({
  acceptedFormats: ['json'],
  maxFileSize: 5 * 1024 * 1024, // optional, default: 5MB
  onImport: (result) => {
    if (result.success) {
      // result.data enthält den Inhalt
      // result.isItsJustFile zeigt .itsjust.json Dateien an
    }
  },
});

// Export
exportTo('png'); // oder jpeg, webp, pdf, json

// Import via File Input
<input
  type="file"
  accept=".itsjust.json,.json"
  onChange={(e) => importFromFile(e.target.files[0])}
/>;

// Import via Drag & Drop (selber machen)
```

**Unterstützte Formate:**

- `.itsjust.json` — Share-Format (wird automatisch erkannt)
- `.json` — JSON Export/Import
- `.png`, `.jpeg`, `.webp` — Bild-Export (`html-to-image`, lazy-loaded)
- `.pdf` — PDF-Export (`@media print` iframe, lazy-loaded)

### ToolShell

```tsx
<ToolShell
  config={toolConfig}
  actions={toolbarActions}
  toolbar={<ToolToolbar state={state} />}
  sidebar={<ToolSidebar />}
  canvas={<ToolCanvas />}
  statusBar={<span>Status</span>}
/>
```

### useToolState Hook

Provides undo/redo, auto-save, dirty state:

```tsx
const state = useToolState<NotepadState>(initialState, {
  key: 'my-tool',
  maxHistory: 50,
  autoSaveDelay: 1000,
});

state.setData((prev) => ({ ...prev, text: 'new' }));
state.undo();
state.redo();
state.saveNow();
```

### Export System

Client-side export via `useExport`:

```tsx
const { exportTo, supportedFormats, isExporting } = useExport(canvasRef, toolConfig, serialize);
exportTo('png'); // or jpeg, webp, pdf, json
```

### Share System (100% Client-Side)

Kein Server nötig — Files werden direkt im Browser erzeugt:

```tsx
const { downloadShareFile, shareViaWeb } = useShare();

// Download als .itsjust.json Datei
await downloadShareFile({
  toolId: 'my-tool',
  content: serialize(),
  metadata: { schemaVersion: '1.0' },
});

// Web Share API (System-Dialog)
await shareViaWeb({
  toolId: 'my-tool',
  content: serialize(),
  metadata: { schemaVersion: '1.0' },
});

// Share URL mit serialisiertem State
const shareUrl = `${window.location.origin}${window.location.pathname}?state=<encoded-state>`;
```

## Environment Variables

```bash
NEXT_PUBLIC_URL=https://your-tool.itsjust.tools
```

## Scripts

| Command                      | Description                 |
| ---------------------------- | --------------------------- |
| `npm run dev`                | Dev server (Turbopack)      |
| `npm run build`              | Build core + Next.js        |
| `npm test`                   | Vitest unit tests           |
| `npm run test:e2e`           | Playwright E2E              |
| `npm run test:e2e:dev`       | Playwright with UI          |
| `npm run lint`               | ESLint                      |
| `node scripts/preflight.mjs` | Validate template readiness |

## Important Conventions

- **No premature abstraction** — 3 similar lines > wrong abstraction
- **Client-side only** — no server-side processing for tool logic
- **Privacy-first** — user actions/data stay local in browser memory/storage unless explicitly requested by user
- **Zero signup** — tools work immediately, no auth required
- **Print-friendly** — CSS hides UI chrome when printing
- **Mobile-first** — toolbar icons only on mobile, full labels on desktop
- **Accessibility is mandatory** — all UI must preserve keyboard access, strong visible focus, semantic landmarks, and screen-reader support
- **Full-space canvas** — tool UI should use available viewport space; avoid fixed A4-like layout constraints

## File Boundaries

To protect the template baseline, treat files according to these boundaries. Do not silently edit read-only files to work around template limitations — report template bugs instead.

### Read-Only (Template Baseline)

These files are part of the template infrastructure. They must not be edited when customizing a tool. If they are inadequate for a tool's needs, report a template bug per the Agent Workflow Rules.

| Path                                                                                                                       | Why read-only                                                                            |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `packages/core/**/*`                                                                                                       | Shared core library (`@itsjust/core`). All hooks, components, engines, types, and tests. |
| `src/lib/**/*`                                                                                                             | Generic utilities (`seo.ts`, `utils.ts`).                                                |
| `src/app/layout.tsx`, `error.tsx`, `not-found.tsx`, `robots.ts`, `sitemap.ts`, `manifest.ts`, `json-ld.tsx`, `globals.css` | App shell, metadata, and global styles.                                                  |
| `src/app/tool-client-wrapper.tsx`                                                                                          | Generic dynamic-import wrapper.                                                          |
| `src/app/page.tsx`                                                                                                         | Generic tool page shell (imports `JsonLd` and `ToolClient`).                             |
| `src/app/apple-icon.svg`, `icon.svg`                                                                                       | App icons.                                                                               |
| `scripts/**/*`                                                                                                             | Preflight and bundle-size checks.                                                        |
| `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json`   | Build and tooling configs.                                                               |
| `packages/core/package.json`, `tsconfig.json`, `tsup.config.ts`                                                            | Core build configs.                                                                      |
| `Dockerfile`, `.github/**/*`, `.husky/**/*`                                                                                | DevOps and CI/CD.                                                                        |
| `public/apple-touch-icon.svg`, `icon-192.svg`, `icon-512.svg`                                                              | PWA icons.                                                                               |

### Editable (Tool Customization)

These files are expected to be modified or replaced when building a new tool on this template.

| Path                            | What to customize                                                                |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `src/tool/tool.config.ts`       | Tool metadata, name, description, features, theme.                               |
| `src/tool/tool-definition.ts`   | State shape, serialize/deserialize, exporter registration.                       |
| `src/tool/template-metadata.ts` | Locale, URL, PWA metadata.                                                       |
| `src/tool/types.ts`             | Tool-specific TypeScript types.                                                  |
| `src/tool/index.ts`             | Barrel exports (update when adding/replacing components).                        |
| `src/tool/components/**/*`      | Canvas, toolbar, sidebar, and any tool-specific UI.                              |
| `src/tool/exporters/**/*`       | Lazy-loaded exporters (`png.ts`, `pdf.ts`, etc.).                                |
| `src/app/tool-client.tsx`       | Main client component. Wire tool hooks, state, handlers, and render `ToolShell`. |
| `public/og.svg`                 | Open Graph image.                                                                |
| `__tests__/unit/**/*`           | Tool-specific unit tests.                                                        |
| `__tests__/e2e/**/*`            | Tool-specific E2E tests.                                                         |

### Conditionally Editable

These files may need edits for specific maintenance tasks, but are otherwise read-only.

| Path           | When to edit                                                                                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` | Version bumps and adding tool-specific dependencies only.                                                                                                                                                                   |
| `CHANGELOG.md` | When releasing a new version.                                                                                                                                                                                               |
| `README.md`    | To document the specific tool.                                                                                                                                                                                              |
| `CLAUDE.md`    | Adding new conventions or rules is allowed. The **Canonical Import/Export/Share Contracts** and **Monorepo Structure** sections are read-only contracts — do not alter canonical data formats without a major version bump. |

### Local Enforcement

For extra guardrails, add these rules to `.claude/settings.local.json`:

```json
{
  "permissions": {
    "deny": [
      "Edit(packages/core)",
      "Write(packages/core)",
      "Edit(src/lib)",
      "Write(src/lib)",
      "Edit(src/app/layout.tsx)",
      "Edit(src/app/error.tsx)",
      "Edit(src/app/not-found.tsx)",
      "Edit(src/app/robots.ts)",
      "Edit(src/app/sitemap.ts)",
      "Edit(src/app/manifest.ts)",
      "Edit(src/app/json-ld.tsx)",
      "Edit(src/app/globals.css)",
      "Edit(src/app/tool-client-wrapper.tsx)",
      "Edit(src/app/page.tsx)",
      "Edit(scripts)",
      "Write(scripts)",
      "Edit(next.config.ts)",
      "Edit(vitest.config.ts)",
      "Edit(playwright.config.ts)",
      "Edit(postcss.config.mjs)",
      "Edit(eslint.config.mjs)",
      "Edit(tsconfig.json)",
      "Edit(Dockerfile)",
      "Edit(.github)",
      "Write(.github)",
      "Edit(.husky)",
      "Write(.husky)"
    ]
  }
}
```

## Design Principles

These principles guide every UI/UX decision in the template. They are non-negotiable and apply to all tools built on this stack.

### Human-Centered Design (HCD)

- **Immediate visibility of system status** — Every action must provide clear, timely feedback. If an export takes time, show a spinner or disabled state. Never leave the user guessing whether their input registered.
- **Recognition over recall** — All available actions should be visible or inferable from the current interface state. Do not hide core functionality behind unlabeled icons, mystery meat navigation, or right-click menus without visible cues.
- **Progressive disclosure with information scent** — Secondary features belong behind clear, well-labeled toggles (e.g., "More options..." with a chevron). The interface must signal that deeper controls exist, and focus must be managed when they open.
- **Error prevention over error recovery** — Design to make errors structurally impossible. Use constrained inputs, filtered dropdowns, and sensible defaults instead of relying on validation messages after the fact.
- **Undo as a first-class citizen** — Every mutating action must be reversible via a single, consistently placed control. The undo stack state must be reflected in real time (enabled/disabled). Destructive actions must never rely solely on blocking browser alerts.
- **Affordances that survive mobile touch** — Interactive elements need visible shape, minimum 44x44px touch targets, and clear `:active` states. Do not rely on hover or right-click to reveal critical actions.

### General UI Principles

- **Minimalist design equals no bloat** — Every pixel and line of text must serve the tool's single purpose. Remove decorative elements, upsell nudges, newsletter modals, and feature creep that competes for attention.
- **Zero-friction instant value** — The user must derive core value within seconds of landing. No onboarding tours, no account creation, no permission requests, no cookie banners blocking interaction.
- **Accessible by default** — All functionality is reachable via keyboard, screen reader, and assistive input devices without a separate "accessibility mode." Use native semantic elements, visible focus rings, and meaningful `aria-label`s.
- **Performance perception via local-first** — Process data client-side and use optimistic UI updates. Avoid server round-trips, skeleton screens for instant operations, and full-page loading states for work that can happen in the browser.
- **Consistent platform conventions** — Follow established web and OS patterns for icons, shortcuts, and layout. Use standard symbols (floppy disk for save, trash for delete), standard shortcuts (`Ctrl+Z` for undo, `Ctrl+S` for export), and platform-aware key labels (`Ctrl` vs `⌘`).
- **Honest limits and clear feedback** — When client-side constraints exist (memory, file size, no persistence), communicate them transparently before the user invests effort. If the tool crashes on a 50MB file, say so upfront.
- **Respectful data minimization** — Collect the absolute minimum data necessary. The UI should reflect this restraint: no unnecessary permission prompts, no tracking widgets, no excessive telemetry. Privacy claims must be visible and verifiable.
- **Mobile-first input resilience** — Gracefully adapt to mobile constraints (virtual keyboard, no hover, limited space) without stripping desktop functionality. Ensure action buttons remain accessible when the virtual keyboard is open.

## Common Pitfalls

- Don't use `useEffect` for state updates — use `useCallback` with handlers
- Don't access `window` without `typeof window !== 'undefined'` check
- Don't commit `.env` files — use `.env.example` as template
- Don't add server dependencies to tool logic — keep it client-side
- Don't return `TState` directly from `deserialize` — always return `DeserializeResult<TState>`
- Don't forget to build `@itsjust/core` before building Next.js: `npm run build -w @itsjust/core`

## Testing

- Unit tests in `packages/core/__tests__/` and `__tests__/unit/`
- E2E tests in `__tests__/e2e/`
- Use `renderTool()` from `@itsjust/core/testing` for component tests
- For hook changes, cover success, failure, and edge-state transitions in separate test cases
- For E2E changes, avoid fixed sleeps and prefer role/selectors with explicit expectations
- Mock `console.error`/`console.warn` in tests that trigger expected errors to keep stderr clean

## Deployment

Self-hosted via Docker on Frankfurt server. Each tool has a `Dockerfile` for production builds.

```bash
# Build and run locally
docker build -t itsjust-tool-name .
docker run -p 3000:3000 itsjust-tool-name

# Or with docker-compose (production)
docker compose up -d --build
```

Environment variables are set in `.env` on the server (see `.env.example`).

## Agent Workflow Rules

- Non-negotiable philosophy guardrails:
  - One tool, one purpose. Do not broaden scope into multi-tool suites.
  - Privacy-first/client-only by default. Do not introduce server processing for user content unless explicitly requested.
  - Accessibility is mandatory. Do not trade away keyboard support, focus visibility, semantics, or readable contrast.
  - Keep UX simple. Do not add feature bloat, complex settings trees, or onboarding friction.
- Decision policy for AI agents:
  - Prefer the smallest change that solves the request.
  - Reuse existing patterns in `src/tool/` and `@itsjust/core`; avoid introducing parallel architectures.
  - If a request conflicts with philosophy, ask for confirmation before implementing the conflicting part.
  - When uncertain, choose maintainability and clarity over clever abstractions.
- Template baseline protection (hard rule):
  - Never silently "fix" or rewrite template defaults/content to hide template-level issues.
  - If a problem is caused by template baseline data/contracts, explicitly report it as a template bug.
  - State clearly that the upstream template must be updated, instead of masking the issue in downstream tool code.
- Commit and push regularly as work progresses. Do not let uncommitted changes accumulate. Update version numbers and `CHANGELOG.md` proactively when behavior, API, UX, dependencies, or version changes.
- When asked to "commit and push", do the full flow automatically (`git add`, commit, push) without extra confirmation.
- Never add Co-Authored-By trailers or set yourself as a co-author in commits.
- Audit version consistency before every commit. Check and align:
  - `package.json` version
  - `packages/core/package.json` version
  - `src/tool/tool.config.ts` version source/value
  - `CHANGELOG.md` release entries
- If version updates are part of the change, ensure all versioned files are aligned in the same commit.
