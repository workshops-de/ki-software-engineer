import { expect, test } from '@playwright/test';
import { Book } from '../src/app/books/book';
import { apiUrl, appUrl, mockBookApp } from './support/book-app';

const book: Book = {
  id: 'shell-book',
  title: 'Shell Book',
  author: 'Example Author',
  isbn: '9781234567890',
  publisher: 'Example Press',
  numPages: 100,
  price: '10 credits',
  cover: '',
  abstract: 'Example abstract.',
  userId: 1
};

test.beforeEach(async ({ page }) => mockBookApp(page, book));

test('unknown paths return to the catalog inside the application shell', async ({ page }) => {
  await page.goto('/unknown-path');
  await expect(page).toHaveURL(`${appUrl}/`);
  await expect(page.getByRole('banner').getByRole('heading', { name: 'BookMonkey' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toContainText('Angular Workshop');
  await expect(page.getByRole('link', { name: book.title, exact: true })).toBeVisible();
});

test('the configured interceptor reports once while the catalog retains recovery', async ({ page }) => {
  const diagnostics: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error' && message.text().startsWith('[BookMonkey]')) {
      diagnostics.push(message.text());
    }
  });
  let requests = 0;
  await page.route(`${apiUrl}?*`, route =>
    ++requests === 1 ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: [book] })
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Unable to load books');
  expect(diagnostics).toHaveLength(1);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('link', { name: book.title, exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(diagnostics).toHaveLength(1);
  expect(requests).toBe(2);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`theme defaults to the ${colorScheme} system setting and follows changes`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('system');
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      colorScheme === 'dark' ? 'rgb(17, 24, 39)' : 'rgb(255, 255, 255)'
    );
    await page.emulateMedia({ colorScheme: colorScheme === 'dark' ? 'light' : 'dark' });
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      colorScheme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(17, 24, 39)'
    );
  });

  test(`explicit ${colorScheme} theme overrides the system and survives navigation and reload`, async ({ page }) => {
    const opposite = colorScheme === 'dark' ? 'light' : 'dark';
    const background = colorScheme === 'dark' ? 'rgb(17, 24, 39)' : 'rgb(255, 255, 255)';
    await page.emulateMedia({ colorScheme: opposite });
    await page.goto('/');
    const picker = page.getByRole('combobox', { name: 'Theme' });
    await picker.selectOption(colorScheme);
    await expect(page.locator('body')).toHaveCSS('background-color', background);
    await page.emulateMedia({ colorScheme });
    await page.emulateMedia({ colorScheme: opposite });
    await expect(page.locator('body')).toHaveCSS('background-color', background);
    await page.getByRole('link', { name: book.title, exact: true }).click();
    await expect(page.getByRole('article')).toBeVisible();
    await page.reload();
    await expect(picker).toHaveValue(colorScheme);
    await expect(page.locator('body')).toHaveCSS('background-color', background);
    await expect(page.getByRole('article')).toHaveCSS(
      'background-color',
      colorScheme === 'dark' ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)'
    );
    await picker.selectOption('system');
    await page.reload();
    await expect(picker).toHaveValue('system');
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      opposite === 'dark' ? 'rgb(17, 24, 39)' : 'rgb(255, 255, 255)'
    );
  });
}

test('dark theme applies to catalog cards, cover fallback, search, and errors', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const card = page.getByRole('link', { name: book.title, exact: true });
  await expect(card).toHaveCSS('background-color', 'rgb(31, 41, 55)');
  await expect(card.getByRole('heading')).toHaveCSS('color', 'rgb(243, 244, 246)');
  await expect(card.getByText('No cover available')).toHaveCSS('color', 'rgb(209, 213, 219)');
  await expect(page.getByRole('searchbox')).toHaveCSS('color', 'rgb(243, 244, 246)');
  await page.route(`${apiUrl}/*`, route => route.fulfill({ status: 503, json: {} }));
  await card.click();
  await expect(page.getByRole('alert')).toHaveCSS('background-color', 'rgb(55, 65, 81)');
  await expect(page.getByRole('heading', { name: 'Unable to load book' })).toHaveCSS('color', 'rgb(243, 244, 246)');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('invalid saved themes fall back to the system setting', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bookmonkey-theme', 'invalid-theme'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('system');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 24, 39)');
});

test('theme remains usable by keyboard on mobile when storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage disabled', 'SecurityError');
      }
    });
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const picker = page.getByRole('combobox', { name: 'Theme' });
  await expect(picker).toHaveValue('system');
  await picker.focus();
  await expect(picker).toBeFocused();
  await picker.press('End');
  await picker.press('Enter');
  await expect(picker).toHaveValue('dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 24, 39)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
