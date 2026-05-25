#!/usr/bin/env node
/**
 * Preflight script for itsjust template.
 * Validates that a tool is ready to ship before committing or deploying.
 *
 * Run: node scripts/preflight.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(process.cwd());
const errors = [];
const warnings = [];

function error(msg) {
  errors.push(msg);
  console.error(`  ❌ ${msg}`);
}

function warn(msg) {
  warnings.push(msg);
  console.warn(`  ⚠️  ${msg}`);
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

function section(title) {
  console.log(`\n${title}`);
}

// ─── Helpers ───
function readJSON(path) {
  try {
    return JSON.parse(readFileSync(join(ROOT, path), 'utf-8'));
  } catch {
    return null;
  }
}

function readText(path) {
  try {
    return readFileSync(join(ROOT, path), 'utf-8');
  } catch {
    return null;
  }
}

function assertExists(path, label) {
  if (!existsSync(join(ROOT, path))) {
    error(`${label} is missing: ${path}`);
    return false;
  }
  ok(`${label} exists (${path})`);
  return true;
}

// ═════════════════════════════════════════════════════════════════════════════
section('📁 Required Files');
// ═════════════════════════════════════════════════════════════════════════════

const requiredFiles = [
  ['src/tool/tool.config.ts', 'Tool config'],
  ['src/tool/tool-definition.ts', 'Tool definition'],
  ['src/tool/template-metadata.ts', 'Template metadata'],
  ['src/lib/seo.ts', 'SEO module'],
  ['src/app/page.tsx', 'App page'],
  ['src/app/layout.tsx', 'App layout'],
  ['src/app/manifest.ts', 'PWA manifest'],
  ['src/app/sitemap.ts', 'Sitemap'],
  ['src/app/robots.ts', 'robots.txt'],
  ['src/app/tool-client.tsx', 'Tool client'],
  ['public/og.svg', 'Open Graph image'],
  ['.env.example', 'Env example'],
  ['README.md', 'README'],
  ['CHANGELOG.md', 'Changelog'],
  ['LICENSE', 'License'],
];

for (const [path, label] of requiredFiles) {
  assertExists(path, label);
}

// ═════════════════════════════════════════════════════════════════════════════
section('🔧 Package Identity');
// ═════════════════════════════════════════════════════════════════════════════

const pkg = readJSON('package.json');
if (!pkg) {
  error('Cannot read package.json');
} else {
  if (pkg.name === 'template' || pkg.name === '@itsjust/template') {
    warn(`package.json name is still "${pkg.name}" — rename to your tool scope`);
  } else {
    ok(`package.json name is "${pkg.name}"`);
  }

  if (pkg.version === '0.1.0') {
    warn('package.json version is still 0.1.0');
  } else {
    ok(`package.json version is ${pkg.version}`);
  }

  const corePkg = readJSON('packages/core/package.json');
  if (corePkg) {
    if (corePkg.name === '@itsjust/core') {
      ok('Core package name is @itsjust/core (intentional brand)');
    } else {
      ok(`Core package name is ${corePkg.name}`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('📝 Tool Config');
// ═════════════════════════════════════════════════════════════════════════════

const toolConfigText = readText('src/tool/tool.config.ts');
if (toolConfigText) {
  const checks = [
    ['id', /id:\s*['"][^'"]+['"]/],
    ['name', /name:\s*['"][^'"]+['"]/],
    ['description', /description:\s*['"][^'"]+['"]/],
    ['version', /version:\s*['"][^'"]+['"]/],
    ['exportFormats', /exportFormats:\s*\[/],
    ['features', /features:\s*\{/],
    ['theme', /theme:\s*\{/],
  ];
  for (const [key, regex] of checks) {
    if (regex.test(toolConfigText)) {
      ok(`tool.config.ts has ${key}`);
    } else {
      error(`tool.config.ts missing ${key}`);
    }
  }

  if (toolConfigText.includes("id: 'template-tool'")) {
    warn("tool.config.ts id is still 'template-tool'");
  }
  if (toolConfigText.includes("name: 'My Tool'")) {
    warn("tool.config.ts name is still 'My Tool'");
  }
  if (toolConfigText.includes("description: 'A minimal tool template")) {
    warn('tool.config.ts description is still template default');
  }
} else {
  error('Cannot read src/tool/tool.config.ts');
}

// ═════════════════════════════════════════════════════════════════════════════
section('🌐 Metadata & SEO');
// ═════════════════════════════════════════════════════════════════════════════

const templateMeta = readText('src/tool/template-metadata.ts');
if (templateMeta) {
  if (/htmlLang:\s*['"]en['"]/.test(templateMeta)) {
    ok('template-metadata.ts has htmlLang');
  } else {
    error('template-metadata.ts missing htmlLang');
  }

  if (/locale:\s*['"]en_US['"]/.test(templateMeta)) {
    warn('template-metadata.ts locale is still default en_US');
  } else {
    ok('template-metadata.ts locale customized');
  }
} else {
  error('Cannot read src/tool/template-metadata.ts');
}

const seoText = readText('src/lib/seo.ts');
if (seoText) {
  if (seoText.includes('itsjust.tools')) {
    error('src/lib/seo.ts contains hardcoded itsjust.tools reference');
  } else {
    ok('seo.ts has no stale itsjust.tools reference');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('📤 Export Registration');
// ═════════════════════════════════════════════════════════════════════════════

const toolDef = readText('src/tool/tool-definition.ts');

if (toolDef) {
  const declaredFormats = [];
  const formatMatches = toolDef.matchAll(/format:\s*['"]([^'"]+)['"]/g);
  for (const m of formatMatches) {
    declaredFormats.push(m[1]);
  }

  if (declaredFormats.length === 0) {
    warn('No exporters declared in tool-definition.ts');
  } else {
    ok(`tool-definition.ts declares exporters: ${declaredFormats.join(', ')}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('🔗 Stale References');
// ═════════════════════════════════════════════════════════════════════════════

const filesToCheck = [
  'README.md',
  'GUIDE.md',
  'CLAUDE.md',
  'src/lib/seo.ts',
  'src/app/manifest.ts',
  'src/app/sitemap.ts',
  'src/app/page.tsx',
  'src/app/layout.tsx',
];

let staleFound = 0;
for (const path of filesToCheck) {
  const text = readText(path);
  if (!text) continue;
  if (text.includes('itsjust.tools') && !path.includes('template-metadata')) {
    warn(`${path} contains hardcoded itsjust.tools reference`);
    staleFound++;
  }
}
if (staleFound === 0) {
  ok('No stale itsjust.tools references in app code');
}

// ═════════════════════════════════════════════════════════════════════════════
section('📦 Dependency Sanity');
// ═════════════════════════════════════════════════════════════════════════════

if (pkg) {
  const hasHtml2canvas = !!pkg.dependencies?.['html2canvas'];
  const hasJsPdf = !!pkg.dependencies?.['jspdf'];
  const toolConfigTxt = readText('src/tool/tool.config.ts') || '';
  const needsImageExport = /['"]png['"]|['"]jpeg['"]|['"]webp['"]|['"]pdf['"]/.test(toolConfigTxt);

  if (needsImageExport && !(hasHtml2canvas && hasJsPdf)) {
    warn('Image/PDF export formats declared but html2canvas/jspdf not in dependencies');
  } else if (!needsImageExport && (hasHtml2canvas || hasJsPdf)) {
    warn('html2canvas/jspdf in dependencies but no image/PDF formats declared');
  } else {
    ok('Dependencies match declared export formats');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section('📋 Summary');
// ═════════════════════════════════════════════════════════════════════════════

console.log('');
if (errors.length === 0 && warnings.length === 0) {
  console.log('🚀 Preflight passed. Ready to ship!');
  process.exit(0);
} else if (errors.length === 0) {
  console.log(`⚠️  Preflight passed with ${warnings.length} warning(s). Review before shipping.`);
  process.exit(0);
} else {
  console.log(
    `❌ Preflight failed with ${errors.length} error(s) and ${warnings.length} warning(s).`
  );
  process.exit(1);
}
