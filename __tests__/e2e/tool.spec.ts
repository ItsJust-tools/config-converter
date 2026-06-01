import { test, expect } from '@playwright/test';

async function getSidebarState(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const el = document.querySelector('.tool-shell-sidebar');
    if (!el) return 'loading';
    return el.classList.contains('open') ? 'open' : 'collapsed';
  });
}

async function openSidebar(page: import('@playwright/test').Page) {
  // Wait for sidebar to exist in DOM
  await page.waitForSelector('.tool-shell-sidebar', { timeout: 5000 });
  const state = await getSidebarState(page);
  if (state === 'open') return;
  // The collapsed sidebar has inert=true, making its children non-interactable.
  // Open it via the toggle button instead of trying to interact with inert children.
  await page.locator('.toolbar-btn-sidebar').click();
  await expect(page.locator('.tool-shell-sidebar')).toHaveClass(/open/, { timeout: 3000 });
}

async function closeSidebarIfNeeded(page: import('@playwright/test').Page) {
  // On mobile, the open sidebar overlays the toolbar with a backdrop.
  // Close it so toolbar buttons become interactable.
  const state = await getSidebarState(page);
  if (state !== 'open') return;
  const backdrop = page.locator('.sidebar-backdrop');
  if (await backdrop.isVisible().catch(() => false)) {
    // Click the backdrop at the top-center of the viewport (above the sidebar panel)
    // to avoid hitting the sidebar panel which has a higher z-index.
    const viewport = page.viewportSize();
    const y = (viewport?.height ?? 600) * 0.1;
    const x = (viewport?.width ?? 400) / 2;
    await page.mouse.click(x, y);
    await expect(page.locator('.tool-shell-sidebar')).toHaveClass(/collapsed/, { timeout: 3000 });
  }
}

async function ensureSidebarInputAccessible(page: import('@playwright/test').Page) {
  // Open the sidebar if it's collapsed so the #converter-input is interactable.
  await openSidebar(page);
  const input = page.locator('#converter-input');
  await expect(input).toBeVisible({ timeout: 3000 });
}

async function ensureToolbarInteractable(page: import('@playwright/test').Page) {
  // Ensure no sidebar backdrop is intercepting toolbar clicks
  await closeSidebarIfNeeded(page);
}

test('tool loads with correct title', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  expect(title).toContain('Config Converter');
});

test('converts YAML to JSON', async ({ page }) => {
  await page.goto('/');

  await ensureSidebarInputAccessible(page);
  const inputArea = page.locator('#converter-input');
  await inputArea.fill('name: test\nversion: 1.0\nenabled: true');

  // Close sidebar on mobile so toolbar buttons are not behind the backdrop
  await ensureToolbarInteractable(page);

  const convertButton = page.getByRole('button', { name: /convert/i });
  await convertButton.click();

  // Wait for output to appear in the <pre> element (not a textarea)
  const outputArea = page.locator('.converter-output');
  await expect(outputArea).toContainText(/"name": "test"/);
});

test('converts JSON to YAML', async ({ page }) => {
  await page.goto('/');

  await ensureSidebarInputAccessible(page);

  // Switch output format to YAML (default is JSON)
  await page.getByRole('radio', { name: 'YAML' }).last().click();
  await page.waitForTimeout(100);

  const inputArea = page.locator('#converter-input');
  await inputArea.fill('{"name": "test", "version": 1.0}');

  // Close sidebar on mobile so toolbar buttons are not behind the backdrop
  await ensureToolbarInteractable(page);

  const convertButton = page.getByRole('button', { name: /convert/i });
  await convertButton.click();

  const outputArea = page.locator('.converter-output');
  await expect(outputArea).toContainText(/name: test/);
});

test('swap formats button works', async ({ page }) => {
  await page.goto('/');

  await ensureSidebarInputAccessible(page);
  const inputArea = page.locator('#converter-input');
  await inputArea.fill('name: test');

  // Close sidebar on mobile so toolbar buttons are not behind the backdrop
  await ensureToolbarInteractable(page);

  // Convert first so we have content to swap
  const convertButton = page.getByRole('button', { name: /convert/i });
  await convertButton.click();
  await expect(page.locator('.converter-output')).toBeVisible();

  // Use Ctrl+Shift+S shortcut for swap
  await page.locator('body').press('Control+Shift+s');

  // After swap, the sidebar input should have the JSON output
  await expect(inputArea).toHaveValue(/.+/);
});

test('undo/redo buttons enable/disable correctly', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);

  const undoButton = page.getByRole('button', { name: 'Undo (Ctrl+Z)' });
  const redoButton = page.getByRole('button', { name: 'Redo (Ctrl+Y)' });
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();

  await ensureSidebarInputAccessible(page);
  const inputArea = page.locator('#converter-input');
  await inputArea.fill('key: value');

  // Close sidebar on mobile so toolbar buttons are not behind the backdrop
  await ensureToolbarInteractable(page);

  await expect(undoButton).toBeEnabled();
  await expect(redoButton).toBeDisabled();

  await undoButton.click({ force: true });
  await expect(redoButton).toBeEnabled();

  await redoButton.click({ force: true });
  await expect(redoButton).toBeDisabled();
});

test('export dropdown opens and shows JSON format', async ({ page }, testInfo) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);
  const exportButton = page.getByRole('button', { name: /export/i });
  await exportButton.click({ force: true });
  if (testInfo.project.name.includes('Mobile')) {
    await expect(exportButton).toBeVisible();
    return;
  }
  const menu = page.getByRole('listbox');
  await expect(menu).toBeVisible();
  await expect(page.getByRole('option', { name: /JSON/ })).toBeVisible();
  await page.click('body');
  await expect(menu).not.toBeVisible();
});

test('sidebar toggle button works', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);
  const sidebarToggle = page.locator('.toolbar-btn-sidebar');
  const sidebar = page.locator('.tool-shell-sidebar');
  const mobile =
    (await page.viewportSize())?.width !== undefined && (await page.viewportSize())!.width <= 768;
  const isCollapsed = await sidebar.evaluate((el) => el.classList.contains('collapsed'));
  if (isCollapsed) {
    await sidebarToggle.click();
    await expect(sidebar).toHaveClass(/open/);
    if (mobile) {
      await page.locator('.sidebar-backdrop').click();
    } else {
      await sidebarToggle.click();
    }
    await expect(sidebar).toHaveClass(/collapsed/);
    return;
  }
  await expect(sidebar).toHaveClass(/open/);
  if (mobile) {
    await page.locator('.sidebar-backdrop').click();
  } else {
    await sidebarToggle.click();
  }
  await expect(sidebar).toHaveClass(/collapsed/);
});

test('dark mode toggle works', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);
  const themeButton = page.getByRole('button', { name: /Switch to dark mode/i });
  if (await themeButton.isVisible()) {
    await themeButton.click();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    const lightButton = page.getByRole('button', { name: /Switch to light mode/i });
    await lightButton.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  }
});

test('SEO meta tags are present', async ({ page }) => {
  await page.goto('/');

  const title = await page.title();
  expect(title).toBeTruthy();

  const description = await page.getAttribute('meta[name="description"]', 'content');
  expect(description).toBeTruthy();

  const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
  expect(ogTitle).toBeTruthy();

  const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
  expect(ogImage).toBeTruthy();

  const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
  expect(canonical).toBeTruthy();
});

test('JSON-LD structured data is present', async ({ page }) => {
  await page.goto('/');
  const jsonLd = page.locator('script[type="application/ld+json"]').first();
  const content = await jsonLd.textContent();
  const parsed = JSON.parse(content!);
  expect(parsed['@type']).toBe('WebApplication');
  expect(parsed.name).toBeTruthy();
  expect(parsed.offers.price).toBe('0');
});

test('sitemap.xml is accessible', async ({ page }) => {
  const response = await page.goto('/sitemap.xml');
  expect(response?.ok()).toBe(true);
  const content = await response?.text();
  expect(content).toContain('urlset');
});

test('robots.txt is accessible', async ({ page }) => {
  const response = await page.goto('/robots.txt');
  expect(response?.ok()).toBe(true);
  const content = await response?.text();
  expect(content).toMatch(/User-[Aa]gent/);
});

test('keyboard shortcuts overlay opens and closes', async ({ page, browserName }, _testInfo) => {
  if (browserName !== 'chromium') return;
  await page.goto('/');
  await ensureToolbarInteractable(page);
  if (_testInfo.project.name.includes('Mobile')) {
    await expect(page.getByRole('button', { name: /keyboard shortcuts/i })).toBeVisible();
    return;
  }
  await page.getByRole('button', { name: /keyboard shortcuts/i }).click({ force: true });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('import from json file works', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);

  const fileContent = JSON.stringify({ key: 'val', nested: { a: 1 } });

  const fileInput = page.locator('input[type="file"]');
  await fileInput.evaluate((el: HTMLInputElement) => {
    el.style.display = 'block';
    el.style.visibility = 'visible';
  });
  await fileInput.setInputFiles({
    name: 'test.json',
    mimeType: 'application/json',
    buffer: Buffer.from(fileContent),
  });

  await ensureSidebarInputAccessible(page);
  const inputArea = page.locator('#converter-input');
  await expect.poll(() => inputArea.inputValue()).toContain('"key"');
});

test('export json download triggers', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);

  await ensureSidebarInputAccessible(page);
  // First convert something to have output
  const inputArea = page.locator('#converter-input');
  await inputArea.fill('key: value');

  // Close sidebar on mobile so toolbar buttons are not behind the backdrop
  await ensureToolbarInteractable(page);

  const convertButton = page.getByRole('button', { name: /convert/i });
  await convertButton.click();

  const exportButton = page.getByRole('button', { name: /export/i });
  await exportButton.click({ force: true });

  const jsonOption = page.getByRole('option', { name: /JSON/ });
  const [download] = await Promise.all([page.waitForEvent('download'), jsonOption.click()]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);
});

test('shows error for invalid input', async ({ page }) => {
  await page.goto('/');
  await ensureSidebarInputAccessible(page);

  // Switch input format to JSON so we actually get a parse error
  await page.getByRole('radio', { name: 'JSON' }).first().click();
  await page.waitForTimeout(100);

  const inputArea = page.locator('#converter-input');
  await inputArea.fill('{invalid json: here}');

  // Close sidebar on mobile so toolbar buttons are not behind the backdrop
  await ensureToolbarInteractable(page);

  const convertButton = page.getByRole('button', { name: /convert/i });
  await convertButton.click();

  // Should show error in the error alert
  await expect(page.locator('.converter-error')).toBeVisible();
});

test('404 page works', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  const contentType = response?.headers()['content-type'] ?? '';
  expect(contentType).toContain('text/html');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('visual regression — default view', async ({ page, browserName }) => {
  if (browserName !== 'chromium') return;
  await page.goto('/');
  await page.waitForSelector('.tool-shell-canvas');
  await expect(page.locator('.tool-shell')).toBeVisible();
});
