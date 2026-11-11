import { expect, test } from '@playwright/test';

const book = {
  id: 'test-book',
  title: 'The Angular Book',
  subtitle: 'A practical guide',
  author: 'Alex Example',
  coAuthors: ['Sam Sample'],
  isbn: '9781234567890',
  publisher: 'Example Press',
  publishedAt: '2024-05-12',
  numPages: 320,
  price: '$29.00',
  abstract: 'Learn Angular step by step.\nIncludes practical examples.',
  cover: '',
  userId: 1
};

test('opens book details from the collection, supports reload and returns to the list', async ({ page }) => {
  await page.route('http://localhost:4730/books*', route => route.fulfill({ json: [book] }));
  await page.route('http://localhost:4730/books/*', route => route.fulfill({ json: book }));
  await page.goto('http://localhost:4200');
  const card = page.getByRole('link', { name: `View details for ${book.title}` });
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/books\/test-book$/);
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  for (const value of [
    book.subtitle,
    book.author,
    book.isbn,
    book.publisher,
    book.publishedAt,
    book.price,
    '320',
    'Sam Sample'
  ]) {
    await expect(page.getByText(value, { exact: true })).toBeVisible();
  }
  await expect(page.getByText(book.abstract)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to book collection' }).click();
  await expect(page.getByRole('heading', { name: 'Book Collection' })).toBeVisible();
});

test('shows a loading state until the detail request completes', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => (release = resolve));
  await page.route('http://localhost:4730/books/*', async route => {
    await pending;
    await route.fulfill({ json: book });
  });
  await page.goto('http://localhost:4200/books/test-book');
  await expect(page.getByRole('status')).toHaveText('Loading book details...');
  release();
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('handles missing information on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route('http://localhost:4730/books/*', route => route.fulfill({ json: { id: 'minimal' } }));
  await page.goto('http://localhost:4200/books/minimal');
  await expect(page.getByRole('heading', { name: 'Untitled book' })).toBeVisible();
  await expect(page.getByText('Unknown author')).toBeVisible();
  await expect(page.getByText('No cover available')).toBeVisible();
  await expect(page.getByText('No description available.')).toBeVisible();
  await expect(page.getByText('Not available', { exact: true })).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('replaces a broken cover image', async ({ page }) => {
  await page.route('http://localhost:4730/books/*', route =>
    route.fulfill({ json: { ...book, cover: 'http://localhost:4730/covers/missing.png' } })
  );
  await page.route('http://localhost:4730/covers/*', route => route.fulfill({ status: 404 }));
  await page.goto('http://localhost:4200/books/test-book');
  await expect(page.getByText('No cover available')).toBeVisible();
  await expect(page.getByRole('img')).toHaveCount(0);
});

test('shows a not-found message for an unknown book', async ({ page }) => {
  await page.route('http://localhost:4730/books/*', route => route.fulfill({ status: 404, json: {} }));
  await page.goto('http://localhost:4200/books/missing');
  await expect(page.getByRole('alert')).toContainText('Book not found');
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to book collection' })).toBeVisible();
});

test('allows retry after a server error', async ({ page }) => {
  let requests = 0;
  await page.route('http://localhost:4730/books/*', route => {
    requests++;
    return route.fulfill(requests === 1 ? { status: 500, json: {} } : { json: book });
  });
  await page.goto('http://localhost:4200/books/test-book');
  await expect(page.getByRole('alert')).toContainText('Unable to load book');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(requests).toBe(2);
});
