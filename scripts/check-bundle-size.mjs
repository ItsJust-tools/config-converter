import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const CHUNKS_DIR = '.next/static/chunks';

const BUDGETS = [
  { pattern: /^main-.*\.js$/, maxBytes: 200 * 1024, name: 'main chunk' },
  { pattern: /^framework-.*\.js$/, maxBytes: 150 * 1024, name: 'framework chunk' },
  { pattern: /^.*\.js$/, maxBytes: 500 * 1024, name: 'any single chunk' },
];

function check() {
  const files = readdirSync(CHUNKS_DIR).filter((f) => f.endsWith('.js'));
  if (files.length === 0) {
    console.warn('No JS chunks found — skipping bundle check.');
    return 0;
  }

  let errors = 0;
  let total = 0;

  for (const file of files) {
    const path = join(CHUNKS_DIR, file);
    const size = statSync(path).size;
    total += size;
    console.log(`${file}: ${(size / 1024).toFixed(1)}KB`);

    for (const budget of BUDGETS) {
      if (budget.pattern.test(file) && size > budget.maxBytes) {
        console.error(
          `❌ Budget exceeded: ${file} (${(size / 1024).toFixed(1)}KB) > ${budget.name} limit (${(budget.maxBytes / 1024).toFixed(1)}KB)`
        );
        errors++;
      }
    }
  }

  console.log(`\nTotal client JS: ${(total / 1024).toFixed(1)}KB`);
  return errors;
}

const exitCode = check();
process.exit(exitCode > 0 ? 1 : 0);
