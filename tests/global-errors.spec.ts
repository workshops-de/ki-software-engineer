import { expect, test } from '@playwright/test';
import type { ConsoleMessage } from '@playwright/test';
import type { Book } from '../src/app/books/book';

const appUrl = 'http://localhost:4200';
const apiUrl = 'http://localhost:4730/books';
const unexpectedMessage = 'An unexpected error occurred. Please reload the page.';
const book: Book = {
  id: 'book-1',
  isbn: '9781234567890',
  title: 'Error handling workshop',
  author: 'Alex Reader',
  publisher: 'Workshop Press',
  numPages: 100,
  price: 'EUR 10.00',
  cover: '',
  abstract: 'A test book.',
  userId: 1
};

test.beforeEach(async ({ page }) => {
  await page.route(/^http:\/\/localhost:4730\/books(?:\/|\?|$)/, route =>
    route.fulfill({
      json: new URL(route.request().url()).pathname === '/books' ? [] : book,
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  );
});

test('reports a browser error and displays safe feedback without changing the feature state', async ({ page }) => {
  const reports: ConsoleMessage[] = [];
  page.on('console', message => {
    if (message.type() === 'error' && message.text().startsWith('BookMonkey error')) {
      reports.push(message);
    }
  });
  await page.goto(appUrl);
  await expect(page.getByText('No books available', { exact: true })).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('Internal diagnostic detail') }));
  });

  await expect(page.getByText(unexpectedMessage, { exact: true })).toBeVisible();
  await expect.poll(() => reports.length).toBe(1);
  expect(await reports[0].args()[1].jsonValue()).toEqual({ source: 'unhandled' });
  expect(await reports[0].args()[2].evaluate(error => error.message)).toBe('Internal diagnostic detail');
  await expect(page.locator('mat-snack-bar-container')).not.toContainText('Internal diagnostic detail');
  await expect(page.getByText('No books available', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByText(unexpectedMessage, { exact: true })).toHaveCount(0);
});

test('reports an unhandled promise rejection through the global handler', async ({ page }) => {
  const report = page.waitForEvent(
    'console',
    message => message.type() === 'error' && message.text().startsWith('BookMonkey error')
  );
  await page.goto(appUrl);
  await expect(page.getByText('No books available', { exact: true })).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: new Error('Rejected background operation')
      })
    );
  });

  expect(await (await report).args()[2].evaluate(error => error.message)).toBe('Rejected background operation');
  await expect(page.getByText(unexpectedMessage, { exact: true })).toBeVisible();
});

test('reports and notifies the same error object only once', async ({ page }) => {
  const reports: ConsoleMessage[] = [];
  page.on('console', message => {
    if (message.type() === 'error' && message.text().startsWith('BookMonkey error')) {
      reports.push(message);
    }
  });
  await page.goto(appUrl);
  await expect(page.getByText('No books available', { exact: true })).toBeVisible();

  await page.evaluate(() => {
    const error = new Error('One failure observed twice');
    window.dispatchEvent(new ErrorEvent('error', { error }));
    window.dispatchEvent(new ErrorEvent('error', { error }));
  });

  await expect(page.getByText(unexpectedMessage, { exact: true })).toBeVisible();
  await expect(page.locator('mat-snack-bar-container')).toHaveCount(1);
  expect(reports).toHaveLength(1);
  expect(await reports[0].args()[2].evaluate(error => error.message)).toBe('One failure observed twice');
});

test('reports server failure once while preserving local error recovery and avoiding a toast', async ({ page }) => {
  const reports: ConsoleMessage[] = [];
  page.on('console', message => {
    if (message.type() === 'error' && message.text().startsWith('BookMonkey error')) {
      reports.push(message);
    }
  });
  let attempts = 0;
  await page.route(`${apiUrl}/book-1`, route => {
    attempts++;
    return route.fulfill({
      status: attempts === 1 ? 500 : 200,
      json: attempts === 1 ? {} : book,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  });

  await page.goto(`${appUrl}/books/book-1`);
  await expect(page.getByRole('alert')).toContainText('Could not load book');
  expect(reports).toHaveLength(1);
  expect(await reports[0].args()[1].jsonValue()).toEqual({
    source: 'http',
    method: 'GET',
    url: `${apiUrl}/book-1`,
    status: 500
  });
  await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);

  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(attempts).toBe(2);
  expect(reports).toHaveLength(1);
  await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
});

test('keeps expected not-found responses local without global reporting or notification', async ({ page }) => {
  const reports: ConsoleMessage[] = [];
  page.on('console', message => {
    if (message.text().startsWith('BookMonkey error')) {
      reports.push(message);
    }
  });
  await page.route(`${apiUrl}/missing`, route =>
    route.fulfill({ status: 404, json: {}, headers: { 'Access-Control-Allow-Origin': '*' } })
  );

  await page.goto(`${appUrl}/books/missing`);
  await expect(page.getByRole('heading', { name: 'Book not found', exact: true })).toBeVisible();
  expect(reports).toHaveLength(0);
  await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
});

test('reports network failure while retaining the local retry action without a toast', async ({ page }) => {
  const report = page.waitForEvent(
    'console',
    message => message.type() === 'error' && message.text().startsWith('BookMonkey error')
  );
  await page.route(`${apiUrl}/book-1`, route => route.abort('failed'));
  await page.goto(`${appUrl}/books/book-1`);

  await expect(page.getByRole('alert')).toContainText('Could not load book');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(await (await report).args()[1].jsonValue()).toEqual({
    source: 'http',
    method: 'GET',
    url: `${apiUrl}/book-1`,
    status: 0
  });
  await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
});
