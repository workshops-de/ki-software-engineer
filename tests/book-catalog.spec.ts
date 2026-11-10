import { expect, Page, Response, test } from '@playwright/test';
import { Book } from '../src/app/books/book';
import { apiUrl, appUrl, mockBookApp, navigateToBook } from './support/book-app';

const book: Book = {
  id: 'catalog-book',
  title: 'Catalog Book',
  author: 'Catalog Author',
  isbn: '9781234567890',
  publisher: 'Example Press',
  numPages: 100,
  price: '10 credits',
  cover: '',
  abstract: 'An example book.',
  userId: 1
};

test.beforeEach(async ({ page }) => mockBookApp(page, book));

async function openCatalog(page: Page) {
  await page.goto(appUrl);
  await expect(page.getByRole('link', { name: book.title, exact: true })).toBeVisible();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
}

async function navigateToDetails(page: Page) {
  const response = page.waitForResponse(`${apiUrl}/${book.id}`);
  await navigateToBook(page, book.id);
  await page.clock.runFor(32);
  await renderResponse(page, response);
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
}

// The paused clock also pauses Angular's animation-frame change detection scheduler.
// Wait for HTTP completion, then advance a frame before asserting the rendered state.
async function renderResponse(page: Page, response: Promise<Response>) {
  await (await response).finished();
  await page.clock.runFor(32);
}

test('debounces typing and sends only the latest term with the catalog limit', async ({ page }) => {
  await openCatalog(page);
  const searches: string[] = [];
  await page.route(`${apiUrl}?*`, route => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.get('_limit')).toBe('10');
    searches.push(params.get('q') ?? '');
    return route.fulfill({ json: [book] });
  });
  const input = page.getByPlaceholder('Search for books...');
  await input.fill('Ang');
  await page.clock.runFor(200);
  await input.fill('Angular');
  await page.clock.runFor(299);
  expect(searches).toEqual([]);
  await expect(page.getByRole('status')).toContainText('Loading books...');
  const request = page.waitForRequest(`${apiUrl}?*`);
  const response = page.waitForResponse(`${apiUrl}?*`);
  await page.clock.runFor(1);
  await request;
  await renderResponse(page, response);
  await expect(page.getByRole('link', { name: book.title, exact: true })).toBeVisible();
  expect(searches).toEqual(['Angular']);
});

test('new search intent cancels a slow request before the next debounce completes', async ({ page }) => {
  await openCatalog(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => (release = resolve));
  let finish!: () => void;
  const completed = new Promise<void>(resolve => (finish = resolve));
  await page.route(`${apiUrl}?*`, async route => {
    const term = new URL(route.request().url()).searchParams.get('q');
    if (term === 'old') {
      await gate;
      await route.fulfill({ json: [{ ...book, title: 'Obsolete result' }] });
      finish();
    } else {
      await route.fulfill({ json: [{ ...book, title: 'Latest result' }] });
    }
  });
  try {
    const oldRequest = page.waitForRequest(request => new URL(request.url()).searchParams.get('q') === 'old');
    await page.getByPlaceholder('Search for books...').fill('old');
    await page.clock.runFor(300);
    await oldRequest;
    const canceled = page.waitForEvent(
      'requestfailed',
      request => new URL(request.url()).searchParams.get('q') === 'old'
    );
    await page.getByPlaceholder('Search for books...').fill('latest');
    await canceled;
    await expect(page.getByRole('status')).toBeVisible();
    const response = page.waitForResponse(`${apiUrl}?*`);
    await page.clock.runFor(300);
    await renderResponse(page, response);
    await expect(page.getByRole('link', { name: 'Latest result', exact: true })).toBeVisible();
    release();
    await completed;
    await expect(page.getByRole('link', { name: 'Obsolete result', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Latest result', exact: true })).toBeVisible();
  } finally {
    release();
  }
});

for (const clear of ['button', 'input'] as const) {
  test(`clearing during debounce via ${clear} immediately loads once and cancels the timer`, async ({ page }) => {
    await openCatalog(page);
    const terms: (string | null)[] = [];
    await page.route(`${apiUrl}?*`, route => {
      terms.push(new URL(route.request().url()).searchParams.get('q'));
      return route.fulfill({ json: [book] });
    });
    const input = page.getByPlaceholder('Search for books...');
    await input.fill('pending');
    await page.clock.runFor(100);
    const clearedRequest = page.waitForRequest(`${apiUrl}?*`);
    const response = page.waitForResponse(`${apiUrl}?*`);
    if (clear === 'button') {
      await page.getByRole('button', { name: 'Clear search', exact: true }).click();
    } else {
      await input.fill('');
    }
    await clearedRequest;
    await renderResponse(page, response);
    await expect(input).toHaveValue('');
    await expect(page.getByRole('link', { name: book.title, exact: true })).toBeVisible();
    await page.clock.runFor(1000);
    expect(terms).toEqual([null]);
  });
}

test('initial failure is distinct from empty results and retries immediately', async ({ page }) => {
  let requests = 0;
  await page.route(`${apiUrl}?*`, route =>
    ++requests === 1 ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ json: [book] })
  );
  await page.goto(appUrl);
  await expect(page.getByRole('alert')).toContainText('Unable to load books');
  await expect(page.getByText('No books available', { exact: true })).toHaveCount(0);
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const response = page.waitForResponse(`${apiUrl}?*`);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await renderResponse(page, response);
  await expect(page.getByRole('link', { name: book.title, exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(requests).toBe(2);
});

test('a failed search removes stale results and can retry the same term or search again', async ({ page }) => {
  await openCatalog(page);
  const terms: (string | null)[] = [];
  await page.route(`${apiUrl}?*`, route => {
    const term = new URL(route.request().url()).searchParams.get('q');
    terms.push(term);
    return terms.length === 1
      ? route.fulfill({ status: 503, json: {} })
      : route.fulfill({ json: [{ ...book, title: term === 'next' ? 'Next result' : 'Recovered result' }] });
  });
  const input = page.getByPlaceholder('Search for books...');
  await input.fill('failed');
  await page.clock.runFor(32);
  await expect(page.getByRole('link', { name: book.title, exact: true })).toHaveCount(0);
  const failure = page.waitForResponse(`${apiUrl}?*`);
  await page.clock.runFor(300);
  await renderResponse(page, failure);
  await expect(page.getByRole('alert')).toContainText('Unable to load books');
  await expect(page.getByText('No books match your search', { exact: true })).toHaveCount(0);
  const retry = page.waitForResponse(`${apiUrl}?*`);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await renderResponse(page, retry);
  await expect(page.getByRole('link', { name: 'Recovered result', exact: true })).toBeVisible();
  await input.fill('next');
  const next = page.waitForResponse(`${apiUrl}?*`);
  await page.clock.runFor(300);
  await renderResponse(page, next);
  await expect(page.getByRole('link', { name: 'Next result', exact: true })).toBeVisible();
  expect(terms).toEqual(['failed', 'failed', 'next']);
});

test('a new search recovers directly after failure and empty results remain a success state', async ({ page }) => {
  await openCatalog(page);
  await page.route(`${apiUrl}?*`, route =>
    new URL(route.request().url()).searchParams.get('q') === 'failed'
      ? route.fulfill({ status: 500, json: {} })
      : route.fulfill({ json: [] })
  );
  const input = page.getByPlaceholder('Search for books...');
  await input.fill('failed');
  const failure = page.waitForResponse(`${apiUrl}?*`);
  await page.clock.runFor(300);
  await renderResponse(page, failure);
  await expect(page.getByRole('alert')).toBeVisible();
  await input.fill('empty');
  const empty = page.waitForResponse(`${apiUrl}?*`);
  await page.clock.runFor(300);
  await renderResponse(page, empty);
  await expect(page.getByText('No books match your search', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const cleared = page.waitForResponse(`${apiUrl}?*`);
  await page.getByRole('button', { name: 'Clear search', exact: true }).first().click();
  await renderResponse(page, cleared);
  await expect(page.getByText('No books available', { exact: true })).toBeVisible();
});

test('leaving the catalog cancels a pending debounce', async ({ page }) => {
  await openCatalog(page);
  const searches: string[] = [];
  await page.route(`${apiUrl}?*`, route => {
    searches.push(route.request().url());
    return route.fulfill({ json: [book] });
  });
  await page.getByPlaceholder('Search for books...').fill('pending');
  await navigateToDetails(page);
  await page.clock.runFor(1000);
  expect(searches).toEqual([]);
});

test('leaving the catalog cancels an active search request', async ({ page }) => {
  await openCatalog(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => (release = resolve));
  await page.route(`${apiUrl}?*`, async route => {
    await gate;
    await route.fulfill({ json: [book] });
  });
  try {
    const request = page.waitForRequest(`${apiUrl}?*`);
    await page.getByPlaceholder('Search for books...').fill('pending');
    await page.clock.runFor(300);
    const active = await request;
    const canceled = page.waitForEvent('requestfailed', failed => failed.url() === active.url());
    await navigateToDetails(page);
    await canceled;
  } finally {
    release();
  }
});
