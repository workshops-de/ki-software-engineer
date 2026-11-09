import { expect, Page, test } from '@playwright/test';
import type { Book } from '../src/app/books/book';

const appUrl = 'http://localhost:4200';
const apiUrl = 'http://localhost:4730/books';
const book: Book = {
  id: 'book-1',
  isbn: '9781234567890',
  title: 'The Angular Workshop',
  subtitle: 'Build a book collection',
  author: 'Alex Reader',
  publisher: 'Workshop Press',
  numPages: 320,
  price: 'EUR 29.90',
  cover: `${appUrl}/test-cover.svg`,
  abstract: 'Learn Angular step by step.\n<b>This stays plain text.</b>',
  userId: 1
};

async function mockBooks(page: Page, details: Partial<Book> = {}) {
  const response = { ...book, ...details };
  await page.route(/^http:\/\/localhost:4730\/books(?:\/|\?|$)/, route => {
    const pathname = new URL(route.request().url()).pathname;
    const found = pathname === '/books' || pathname === `/books/${response.id}`;
    return route.fulfill({
      status: found ? 200 : 404,
      json: pathname === '/books' ? [response] : found ? response : {},
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.route(`${appUrl}/test-cover.svg`, route =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><rect width="120" height="160" fill="navy"/></svg>'
    })
  );
  await mockBooks(page);
});

test('opens book details and returns to the collection using the keyboard', async ({ page }) => {
  await page.goto(appUrl);
  const card = page.getByRole('link', { name: `View details for ${book.title}` });
  await expect(card).toHaveAttribute('href', '/books/book-1');
  await page.getByRole('textbox').focus();
  await page.keyboard.press('Tab');
  await expect(card).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`${appUrl}/books/book-1`);
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();

  const back = page.getByRole('link', { name: 'Back to book collection' });
  await back.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`${appUrl}/`);
  await expect(page.getByRole('heading', { name: 'Book Collection', exact: true })).toBeVisible();
});

test('loads all book details directly and after a reload, rendering descriptions as text', async ({ page }) => {
  await page.goto(`${appUrl}/books/book-1`);
  const article = page.getByRole('article');
  await expect(article.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  for (const value of [book.subtitle!, book.author, book.isbn, book.publisher, String(book.numPages), book.price]) {
    await expect(article.getByText(value, { exact: true })).toBeVisible();
  }
  await expect(article.getByText('<b>This stays plain text.</b>', { exact: false })).toBeVisible();
  await expect(article.locator('b')).toHaveCount(0);
  const cover = article.getByRole('img', { name: `Cover of ${book.title}` });
  await expect(cover).toBeVisible();
  await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);

  await page.reload();
  await expect(article.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
});

test('shows a loading state until the book arrives', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => (release = resolve));
  await page.route(`${apiUrl}/book-1`, async route => {
    await pending;
    await route.fulfill({ json: book, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.goto(`${appUrl}/books/book-1`);
  await expect(page.getByRole('status')).toHaveText('Loading book...');
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  release();
  await expect(page.getByRole('article')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.locator('[aria-busy="false"]')).toBeVisible();
});

test('shows a distinct not-found state for an unknown book', async ({ page }) => {
  await page.goto(`${appUrl}/books/missing`);
  await expect(page.getByRole('heading', { name: 'Book not found', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to book collection' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
});

test('allows retrying a failed request', async ({ page }) => {
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
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(attempts).toBe(2);
});

test('shows the retry action for a network failure', async ({ page }) => {
  await page.route(`${apiUrl}/book-1`, route => route.abort('failed'));
  await page.goto(`${appUrl}/books/book-1`);
  await expect(page.getByRole('alert')).toContainText('Could not load book');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('hides missing additional information and replaces a missing cover', async ({ page }) => {
  await mockBooks(page, {
    subtitle: undefined,
    publisher: '',
    isbn: '',
    numPages: 0,
    price: '',
    abstract: '',
    cover: ''
  });
  await page.goto(`${appUrl}/books/book-1`);
  const article = page.getByRole('article');
  await expect(article.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  await expect(article.locator('dt')).toHaveCount(0);
  await expect(article.getByRole('heading', { name: 'Description' })).toHaveCount(0);
  await expect(article.getByText(book.subtitle!)).toHaveCount(0);
  await expect(article.getByRole('img')).toHaveCount(0);
  await expect(article.getByText('No cover available')).toBeVisible();
});

test('replaces a broken cover image', async ({ page }) => {
  await page.route(`${appUrl}/test-cover.svg`, route => route.fulfill({ status: 404, body: '' }));
  await page.goto(`${appUrl}/books/book-1`);
  await expect(page.getByRole('article').getByText('No cover available')).toBeVisible();
  await expect(page.getByRole('article').getByRole('img')).toHaveCount(0);
});

test('fits a narrow viewport including long book titles and metadata', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockBooks(page, { title: 'A'.repeat(120), publisher: 'B'.repeat(120) });
  await page.goto(`${appUrl}/books/book-1`);
  await expect(page.getByRole('article')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A'.repeat(120), exact: true })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width);
});

test('cancels the pending book request when the route ID changes', async ({ page }) => {
  const canceled = page.waitForEvent('requestfailed', request => request.url() === `${apiUrl}/book-1`);
  // Keep the first response pending to expose stale data or missing cancellation.
  await page.route(`${apiUrl}/book-1`, () => {});
  const secondBook = { ...book, id: 'book-2', title: 'The Second Book' };
  await page.route(`${apiUrl}/book-2`, route =>
    route.fulfill({ json: secondBook, headers: { 'Access-Control-Allow-Origin': '*' } })
  );
  const started = page.waitForRequest(`${apiUrl}/book-1`);
  await page.goto(`${appUrl}/books/book-1`);
  await started;
  await expect(page.getByRole('status')).toBeVisible();
  await page.evaluate(() => {
    window.history.pushState({}, '', '/books/book-2');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await canceled;
  await expect(page.getByRole('heading', { name: secondBook.title, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toHaveCount(0);
});
