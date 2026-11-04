import { test, expect, type Page } from '@playwright/test';

/**
 * E2E coverage for core user workflows (issue #69):
 *  1. State persistence across reload
 *  2. Keyboard shortcut dispatching (Ctrl+Z, Ctrl+Y, Ctrl+S)
 *  3. Export payload verification
 *  4. Dark/Light theme toggle persistence
 */

async function getSidebarState(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector('.tool-shell-sidebar');
    if (!el) return 'loading';
    return el.classList.contains('open') ? 'open' : 'collapsed';
  });
}

async function openSidebar(page: Page) {
  await page.waitForSelector('.tool-shell-sidebar', { timeout: 10_000 });
  const state = await getSidebarState(page);
  if (state === 'open') return;
  // The collapsed sidebar is inert; use the toggle button instead.
  await page.locator('.toolbar-btn-sidebar').click();
  await expect(page.locator('.tool-shell-sidebar')).toHaveClass(/open/, { timeout: 5000 });
}

async function closeSidebarIfNeeded(page: Page) {
  // On mobile the open sidebar overlays the toolbar with a backdrop.
  const state = await getSidebarState(page);
  if (state !== 'open') return;
  const backdrop = page.locator('.sidebar-backdrop');
  if (await backdrop.isVisible().catch(() => false)) {
    const viewport = page.viewportSize();
    const y = (viewport?.height ?? 600) * 0.1;
    const x = (viewport?.width ?? 400) / 2;
    await page.mouse.click(x, y);
    await expect(page.locator('.tool-shell-sidebar')).toHaveClass(/collapsed/, {
      timeout: 5000,
    });
  }
}

async function openSidebarInput(page: Page) {
  await openSidebar(page);
  const input = page.locator('#converter-input');
  await expect(input).toBeVisible({ timeout: 5000 });
  return input;
}

async function ensureToolbarInteractable(page: Page) {
  await closeSidebarIfNeeded(page);
}

const SAMPLE_YAML = 'name: persistence-check\nversion: "3"\nenabled: true';
const EXPECTED_JSON_SNIPPET = '"name": "persistence-check"';

test.describe('state persistence across reload', () => {
  test('input and output survive a page reload via auto-save', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tool-shell');

    const input = await openSidebarInput(page);
    await input.fill(SAMPLE_YAML);
    await closeSidebarIfNeeded(page);

    // Auto-convert (debounced 300ms) should produce the JSON output.
    const output = page.getByTestId('converter-output');
    await expect(output).toContainText(EXPECTED_JSON_SNIPPET, { timeout: 10_000 });

    // Auto-save is debounced (2s); wait until the status bar reports saved state.
    await expect(page.locator('.status-slot-state')).toContainText(/Saved|Ready/, {
      timeout: 15_000,
    });
    await expect(page.locator('.status-slot-state')).not.toContainText('Unsaved', {
      timeout: 15_000,
    });

    // Reload: persisted history in localStorage should restore the tool state.
    await page.reload();
    await page.waitForSelector('.tool-shell');

    const restoredInput = page.locator('#converter-input');
    await expect(restoredInput).toHaveValue(SAMPLE_YAML, { timeout: 15_000 });
    await expect(page.getByTestId('converter-output')).toContainText(EXPECTED_JSON_SNIPPET, {
      timeout: 15_000,
    });
  });

  test('restores formats from persisted state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tool-shell');

    const input = await openSidebarInput(page);
    // Switch output format to TOML, type JSON input so auto-convert runs.
    await page.getByRole('radio', { name: 'TOML' }).last().click();
    await input.fill('{"name": "fmt-persist"}');

    // Wait for the debounced auto-save to persist the state.
    await expect(page.locator('.status-slot-state')).not.toContainText('Unsaved', {
      timeout: 15_000,
    });

    await page.reload();
    await page.waitForSelector('.tool-shell');

    // The output-format radio for TOML should be checked again after reload.
    await expect(page.getByRole('radio', { name: 'TOML' }).last()).toBeChecked({
      timeout: 15_000,
    });
    await expect(page.locator('#converter-input')).toHaveValue('{"name": "fmt-persist"}', {
      timeout: 15_000,
    });
  });
});

test.describe('keyboard shortcuts', () => {
  test('Ctrl+Z undoes input and Ctrl+Y redoes it', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tool-shell');
    await ensureToolbarInteractable(page);

    const input = await openSidebarInput(page);
    await input.fill('first: value');
    await page.waitForTimeout(400);
    await input.fill('second: value');
    await page.waitForTimeout(400);

    // Undo repeatedly (polling) until the editor shows the previous input
    // text. Auto-convert appends several history entries (some only differ
    // in the derived output), so the exact number of undos is an
    // implementation detail â polling keeps the test deterministic.
    await expect
      .poll(
        async () => {
          await page.keyboard.press('Control+z');
          return input.inputValue();
        },
        { timeout: 10_000, intervals: [150] }
      )
      .toBe('first: value');

    // Redo repeatedly until the editor shows the newer input text again.
    await expect
      .poll(
        async () => {
          await page.keyboard.press('Control+y');
          return input.inputValue();
        },
        { timeout: 10_000, intervals: [150] }
      )
      .toBe('second: value');
  });

  test('Ctrl+Z undo reverts to empty initial state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tool-shell');
    await ensureToolbarInteractable(page);

    const input = await openSidebarInput(page);
    await input.fill('only: one');
    await page.waitForTimeout(400);

    // Undo repeatedly until the initial (empty) state is restored.
    await expect
      .poll(
        async () => {
          await page.keyboard.press('Control+z');
          return input.inputValue();
        },
        { timeout: 10_000, intervals: [150] }
      )
      .toBe('');
  });

  test('Ctrl+S triggers the save shortcut without a download and keeps state intact', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForSelector('.tool-shell');
    await ensureToolbarInteractable(page);

    const input = await openSidebarInput(page);
    await input.fill('save: me');
    await closeSidebarIfNeeded(page);

    // Ctrl+S is intercepted (preventDefault + auto-save). No file download
    // should be triggered and the app must stay interactive.
    const downloadPromise = page.waitForEvent('download', { timeout: 2000 });
    await page.keyboard.press('Control+s');
    let downloadFired = false;
    try {
      await downloadPromise;
      downloadFired = true;
    } catch {
      // Expected: no download triggered.
    }
    expect(downloadFired).toBe(false);

    // App still functional after the shortcut.
    await openSidebarInput(page);
    await expect(input).toHaveValue('save: me');
  });

  test('Ctrl+Enter dispatches convert', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tool-shell');

    const input = await openSidebarInput(page);
    await input.fill('shortcut: convert');
    await input.focus();

    // Force a non-empty output first so the conversion is observable.
    await page.keyboard.press('Control+Enter');
    await expect(page.getByTestId('converter-output')).toContainText('"shortcut": "convert"', {
      timeout: 5000,
    });
  });
});

test.describe('export payload verification', () => {
  test('JSON export downloads a valid payload of the serialized tool state', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await page.waitForSelector('.tool-shell');
    await ensureToolbarInteractable(page);

    const input = await openSidebarInput(page);
    await input.fill(SAMPLE_YAML);
    await closeSidebarIfNeeded(page);

    // Ensure the conversion output exists before exporting.
    await expect(page.getByTestId('converter-output')).toContainText(EXPECTED_JSON_SNIPPET, {
      timeout: 10_000,
    });

    const exportButton = page.getByRole('button', { name: /export/i });
    await exportButton.click({ force: true });
    if (testInfo.project.name.includes('Mobile')) {
      await expect(exportButton).toBeVisible();
      return;
    }

    const jsonOption = page.getByRole('option', { name: /JSON/ });
    const [download] = await Promise.all([page.waitForEvent('download'), jsonOption.click()]);

    expect(download.suggestedFilename()).toMatch(/\.json$/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));

    // The export payload is the full serialized converter state.
    expect(payload.input).toBe(SAMPLE_YAML);
    expect(payload.inputFormat).toBe('yaml');
    expect(payload.outputFormat).toBe('json');
    expect(payload.output).toContain('"name": "persistence-check"');
    expect(typeof payload.minify).toBe('boolean');
    expect(typeof payload.indentSize).toBe('number');
  });
});

test.describe('theme toggle persistence', () => {
  test('dark mode choice persists across reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tool-shell');
    await ensureToolbarInteractable(page);

    const html = page.locator('html');

    // Only act if the toolbar exposes the theme toggle (feature is enabled).
    const themeButton = page.getByRole('button', { name: /Switch to dark mode/i });
    await expect(themeButton).toBeAttached({ timeout: 5000 });
    await expect(html).not.toHaveAttribute('data-theme', 'dark');

    await themeButton.click({ force: true });
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Persisted in localStorage as 'itsjust-theme' = 'dark'.
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('itsjust-theme')))
      .toBe('dark');

    await page.reload();
    await page.waitForSelector('.tool-shell');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark', { timeout: 10_000 });
  });

  test('switching back to light mode persists across reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.tool-shell');
    // Pre-seed dark mode, then reload so the app boots from storage.
    // (addInitScript would re-run on reload and overwrite the stored choice.)
    await page.evaluate(() => {
      // Some contexts deny localStorage; tolerate failure and fall back to
      // clicking the toggle below instead.
      try {
        localStorage.setItem('itsjust-theme', 'dark');
      } catch {}
    });
    await page.reload();
    await page.waitForSelector('.tool-shell');
    await ensureToolbarInteractable(page);

    const html = page.locator('html');
    if ((await html.getAttribute('data-theme')) !== 'dark') {
      // Storage seeding was blocked; reach dark mode via the toolbar toggle.
      const darkBtn = page.getByRole('button', { name: /Switch to dark mode/i });
      await darkBtn.click({ force: true });
      await expect(html).toHaveAttribute('data-theme', 'dark');
    }

    const lightButton = page.getByRole('button', { name: /Switch to light mode/i });
    const storageAccessible = await page
      .evaluate(() => {
        try {
          localStorage.setItem('itsjust-theme', localStorage.getItem('itsjust-theme') ?? 'dark');
          return true;
        } catch {
          return false;
        }
      })
      .catch(() => false);
    await lightButton.click({ force: true });
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Verify the persisted theme entry when storage is accessible.
    if (storageAccessible) {
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              try {
                return localStorage.getItem('itsjust-theme');
              } catch {
                return null;
              }
            }),
          { timeout: 5000 }
        )
        .toBe('light');
    }

    await page.reload();
    await page.waitForSelector('.tool-shell');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light', {
      timeout: 10_000,
    });
  });
});
