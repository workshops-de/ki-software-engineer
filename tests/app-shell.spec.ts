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
