import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:4730/books*', route => route.fulfill({ json: [] }));
});

test('follows the system by default and responds to system changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('http://localhost:4317');
  await expect(page.getByLabel('Appearance')).toHaveValue('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('keeps a guest choice during the visit and allows returning to system', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('http://localhost:4317');
  await page.getByLabel('Appearance').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByLabel('Appearance')).toHaveValue('dark');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Appearance').selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('a new guest session starts with the system setting', async ({ browser }) => {
  const first = await browser.newContext();
  const page = await first.newPage();
  await page.route('http://localhost:4730/books*', route => route.fulfill({ json: [] }));
  await page.goto('http://localhost:4317');
  await page.getByLabel('Appearance').selectOption('dark');
  await first.close();
  const second = await browser.newContext();
  const nextPage = await second.newPage();
  await nextPage.route('http://localhost:4730/books*', route => route.fulfill({ json: [] }));
  await nextPage.goto('http://localhost:4317');
  await expect(nextPage.getByLabel('Appearance')).toHaveValue('system');
  await second.close();
});
