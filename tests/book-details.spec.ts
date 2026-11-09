import { expect, Page, test } from '@playwright/test';
import { Book } from '../src/app/books/book';

const appUrl = 'http://localhost:4200';
const apiUrl = 'http://localhost:4730/books';
const book: Book = {
  id: 'book-1',
  title: 'A Journey Through Angular',
  subtitle: 'Practical patterns',
  author: 'Alex Reader',
  isbn: '9781234567890',
  publisher: 'Example Press',
  numPages: 321,
  price: '29.95 credits',
  cover: 'https://covers.example.test/book.png',
  abstract: 'First paragraph.\n\nSecond paragraph with <strong>literal markup</strong>.',
  userId: 987654321
};

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://covers.example.test/**', route =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#dbeafe"/></svg>'
    })
  );
  await page.route(`${apiUrl}?*`, route => route.fulfill({ json: [book] }));
  await page.route(`${apiUrl}/*`, route => route.fulfill({ json: book }));
});

async function expectDetails(page: Page) {
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  for (const value of [book.subtitle!, book.author, book.isbn, book.publisher, String(book.numPages), book.price]) {
    await expect(page.getByText(value, { exact: true })).toBeVisible();
  }
  const abstract = page.getByTestId('book-abstract');
  await expect(abstract).toHaveText(book.abstract);
  expect(await abstract.textContent()).toBe(book.abstract);
  await expect(abstract).toHaveCSS('white-space', 'pre-wrap');
  await expect(abstract.locator('strong')).toHaveCount(0);
  await expect(page.getByText(String(book.userId), { exact: true })).toHaveCount(0);
}

test('catalog link supports keyboard navigation, displays details, and returns to catalog', async ({ page }) => {
  await page.goto(appUrl);
  const link = page.getByRole('link', { name: book.title, exact: true });
  await expect(link).toHaveAttribute('href', `/books/${book.id}`);
  await page.getByPlaceholder('Search for books...').focus();
  await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
  await expect(link).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`${appUrl}/books/${book.id}`);
  await expectDetails(page);
  await expect(page.getByRole('img', { name: book.title })).toBeVisible();
  await page.getByRole('link', { name: 'Back to books' }).click();
  await expect(page.getByRole('heading', { name: 'Book Collection' })).toBeVisible();
});

test('direct visits and refresh fetch the book independently', async ({ page }) => {
  let requests = 0;
  await page.route(`${apiUrl}/${book.id}`, route => {
    requests++;
    return route.fulfill({ json: book });
  });
  await page.goto(`${appUrl}/books/${book.id}`);
  await expectDetails(page);
  await page.reload();
  await expectDetails(page);
  expect(requests).toBe(2);
  await page.getByRole('link', { name: 'Back to books' }).click();
  await expect(page).toHaveURL(`${appUrl}/`);
});

for (const target of ['cover', 'author'] as const) {
  test(`opens details when clicking the card ${target}`, async ({ page }) => {
    await page.goto(appUrl);
    const card = page.getByRole('link', { name: book.title, exact: true });
    if (target === 'cover') {
      await card.getByRole('img', { name: book.title }).click();
    } else {
      await card.getByText(book.author, { exact: true }).click();
    }
    await expect(page).toHaveURL(`${appUrl}/books/${book.id}`);
    await expectDetails(page);
  });
}

test('shows loading until the request completes', async ({ page }) => {
  let release!: () => void;
  const responseGate = new Promise<void>(resolve => (release = resolve));
  await page.route(`${apiUrl}/${book.id}`, async route => {
    await responseGate;
    await route.fulfill({ json: book });
  });
  await page.goto(`${appUrl}/books/${book.id}`);
  await expect(page.getByRole('status')).toHaveText('Loading book...');
  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to books' })).toBeVisible();
  release();
  await expectDetails(page);
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('shows a distinct not-found state for 404', async ({ page }) => {
  await page.route(`${apiUrl}/missing`, route => route.fulfill({ status: 404, json: {} }));
  await page.goto(`${appUrl}/books/missing`);
  await expect(page.getByRole('alert')).toContainText('Book not found');
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to books' })).toBeVisible();
});

test('retries a failed request successfully', async ({ page }) => {
  let requests = 0;
  await page.route(`${apiUrl}/${book.id}`, route =>
    ++requests === 1 ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ json: book })
  );
  await page.goto(`${appUrl}/books/${book.id}`);
  await expect(page.getByRole('alert')).toContainText('Unable to load book');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expectDetails(page);
  expect(requests).toBe(2);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

for (const cover of ['', 'https://covers.example.test/broken.png']) {
  test(`catalog handles ${cover ? 'broken' : 'missing'} covers without losing navigation`, async ({ page }) => {
    await page.route('https://covers.example.test/broken.png', route => route.fulfill({ status: 404, body: '' }));
    await page.route(`${apiUrl}?*`, route => route.fulfill({ json: [{ ...book, cover }] }));
    await page.goto(appUrl);
    const card = page.getByRole('link', { name: book.title, exact: true });
    await expect(card.getByText('No cover available', { exact: true })).toBeVisible();
    await expect(card.getByRole('img')).toHaveCount(0);
    await card.click();
    await expectDetails(page);
  });

  test(`handles ${cover ? 'broken' : 'missing'} cover and absent subtitle on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route('https://covers.example.test/broken.png', route => route.fulfill({ status: 404, body: '' }));
    await page.route(`${apiUrl}/${book.id}`, route => route.fulfill({ json: { ...book, subtitle: undefined, cover } }));
    await page.goto(`${appUrl}/books/${book.id}`);
    await expect(page.getByText('No cover available', { exact: true })).toBeVisible();
    await expect(page.getByText(book.subtitle!, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('img')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

// Simulate same-document history navigation so the router reuses the details component.
async function navigateToBook(page: Page, id: string) {
  await page.evaluate(id => {
    history.pushState(null, '', `/books/${encodeURIComponent(id)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, id);
}

test('a failed cover is attempted again for a new book with the same URL', async ({ page }) => {
  let imageRequests = 0;
  await page.route(book.cover, route =>
    ++imageRequests === 1
      ? route.fulfill({ status: 404, body: '', headers: { 'cache-control': 'no-store' } })
      : route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"/>',
          headers: { 'cache-control': 'no-store' }
        })
  );
  await page.goto(`${appUrl}/books/${book.id}`);
  await expect(page.getByText('No cover available', { exact: true })).toBeVisible();
  await navigateToBook(page, 'another-book');
  await expect(page.getByRole('img', { name: book.title })).toBeVisible();
  await expect(page.getByText('No cover available', { exact: true })).toHaveCount(0);
  expect(imageRequests).toBe(2);
});

test('a catalog reload displays a valid cover after an earlier image failure', async ({ page }) => {
  await page.route('https://covers.example.test/broken.png', route => route.fulfill({ status: 404, body: '' }));
  await page.route(`${apiUrl}?*`, route => {
    const searching = new URL(route.request().url()).searchParams.has('q');
    return route.fulfill({
      json: [{ ...book, cover: searching ? book.cover : 'https://covers.example.test/broken.png' }]
    });
  });
  await page.goto(appUrl);
  await expect(page.getByText('No cover available', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Search for books...').fill('Angular');
  await expect(page.getByRole('img', { name: book.title })).toBeVisible();
  await expect(page.getByText('No cover available', { exact: true })).toHaveCount(0);
});

test('route changes clear old details and cancel pending requests', async ({ page }) => {
  const secondBook = { ...book, id: 'book-2', title: 'Second Book' };
  let release!: () => void;
  const responseGate = new Promise<void>(resolve => (release = resolve));
  await page.route(`${apiUrl}/slow`, async route => {
    await responseGate;
    await route.fulfill({ json: { ...book, id: 'slow', title: 'Obsolete Book' } });
  });
  await page.route(`${apiUrl}/${secondBook.id}`, route => route.fulfill({ json: secondBook }));
  await page.goto(`${appUrl}/books/${book.id}`);
  await expectDetails(page);
  const slowRequest = page.waitForRequest(`${apiUrl}/slow`);
  await navigateToBook(page, 'slow');
  await slowRequest;
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
  const canceled = page.waitForEvent('requestfailed', request => request.url() === `${apiUrl}/slow`);
  await navigateToBook(page, secondBook.id);
  await canceled;
  await expect(page.getByRole('heading', { name: secondBook.title, exact: true })).toBeVisible();
  release();
  await expect(page.getByRole('heading', { name: 'Obsolete Book' })).toHaveCount(0);
});

test('route changes recover after an error without recreating the detail component', async ({ page }) => {
  await page.route(`${apiUrl}/failed`, route => route.fulfill({ status: 500, json: {} }));
  await page.goto(`${appUrl}/books/${book.id}`);
  await expectDetails(page);
  await navigateToBook(page, 'failed');
  await expect(page.getByRole('alert')).toContainText('Unable to load book');
  await navigateToBook(page, book.id);
  await expectDetails(page);
});

test('encodes IDs as a single API path segment', async ({ page }) => {
  const id = 'book/with spaces?#';
  const request = page.waitForRequest(`${apiUrl}/${encodeURIComponent(id)}`);
  await page.goto(`${appUrl}/books/${encodeURIComponent(id)}`);
  await request;
  await expectDetails(page);
});
