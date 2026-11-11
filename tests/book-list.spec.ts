import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import type { Book } from '../src/app/books/book';

const appUrl = 'http://localhost:4200';
const apiUrl = 'http://localhost:4730/books';
const listEndpoint = /^http:\/\/localhost:4730\/books(?:\?|$)/;
const book: Book = {
  id: 'book-1',
  isbn: '9781234567890',
  title: 'The Angular Workshop',
  author: 'Alex Reader',
  publisher: 'Workshop Press',
  numPages: 320,
  price: 'EUR 29.90',
  cover: '',
  abstract: 'Learn Angular step by step.',
  userId: 1
};
const latestBook: Book = { ...book, id: 'book-2', title: 'RxJS in Practice' };

const search = (page: Page) => page.getByRole('textbox', { name: 'Search for books', exact: true });
const cards = (page: Page) => page.getByRole('link', { name: /^View details for / });
const card = (page: Page, result: Book) =>
  page.getByRole('link', { name: `View details for ${result.title}`, exact: true });
const clear = (page: Page) => page.getByRole('button', { name: 'Clear search', exact: true });
const emptyState = (page: Page) => page.getByText(/^(No books available|No books match your search)$/);

function respond(route: Route, results: Book[] = [book], status = 200) {
  return route.fulfill({
    status,
    json: status === 200 ? results : {},
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

async function mockCollection(
  page: Page,
  handler: (route: Route, term: string) => void | Promise<void> = route => respond(route)
) {
  const requests: URL[] = [];
  await page.route(listEndpoint, route => {
    const url = new URL(route.request().url());
    requests.push(url);
    return handler(route, url.searchParams.get('q') ?? '');
  });
  return requests;
}

function expectSearches(requests: URL[], terms: string[]) {
  // Compare decoded parameters so query ordering and URL encoding remain implementation details.
  expect(requests.map(url => Object.fromEntries(url.searchParams))).toEqual(
    terms.map(term => ({ _limit: '10', ...(term ? { q: term } : {}) }))
  );
}

function isSearch(url: string, term: string) {
  const parsed = new URL(url);
  return (
    parsed.origin === 'http://localhost:4730' && parsed.pathname === '/books' && parsed.searchParams.get('q') === term
  );
}

async function enterSearch(page: Page, term: string) {
  await search(page).fill(term);
}

async function expectFailure(page: Page) {
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText('Could not load books');
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(cards(page)).toHaveCount(0);
  await expect(emptyState(page)).toHaveCount(0);
  // Expected feature failures must not also open the existing Material toast UI.
  await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
}

async function leaveCollection(page: Page) {
  // Match the detail regression test: navigate through the router without reloading the document.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/books/book-1');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(`${appUrl}/books/book-1`);
  await expect(page.getByRole('article').getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  await expect(search(page)).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.route(`${apiUrl}/book-1`, route =>
    route.fulfill({ json: book, headers: { 'Access-Control-Allow-Origin': '*' } })
  );
});

test('shows only loading until the initial collection arrives, then exposes detail links', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => (release = resolve));
  const requests = await mockCollection(page, async route => {
    await pending;
    await respond(route);
  });
  await page.goto(appUrl);
  await expect(page.getByRole('status')).toHaveText('Loading books...');
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(emptyState(page)).toHaveCount(0);

  release();
  await expect(card(page, book)).toBeVisible();
  await expect(card(page, book)).toHaveAttribute('href', '/books/book-1');
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(emptyState(page)).toHaveCount(0);
  expectSearches(requests, ['']);
});

test('debounces rapid input for 300 ms and sends only the latest term', async ({ page }) => {
  // Let Angular finish rendering before pausing its animation-frame and timer scheduler.
  await page.clock.install({ time: new Date('2026-11-09T12:00:00Z') });
  const requests = await mockCollection(page, (route, term) => respond(route, term ? [latestBook] : [book]));
  await page.goto(appUrl);
  await expect(card(page, book)).toBeVisible();
  await page.clock.pauseAt(new Date('2026-11-09T12:01:00Z'));

  await search(page).fill('Angular');
  await page.clock.runFor(200);
  await search(page).fill('Angular & RxJS');
  await page.clock.runFor(299);
  expectSearches(requests, ['']);
  await page.clock.runFor(1);
  // HTTP completion schedules Angular rendering; resume frames before awaiting the UI.
  await page.clock.resume();
  await expect(card(page, latestBook)).toBeVisible();
  await expect(card(page, book)).toHaveCount(0);
  expectSearches(requests, ['', 'Angular & RxJS']);
});

test('cancels an active search immediately on different input and shows the latest results', async ({ page }) => {
  const requests = await mockCollection(page, (route, term) => {
    if (term === 'slow') return; // Deliberately withhold the superseded response.
    return respond(route, term ? [latestBook] : [book]);
  });
  await page.goto(appUrl);
  await expect(card(page, book)).toBeVisible();
  const started = page.waitForRequest(request => isSearch(request.url(), 'slow'));
  await enterSearch(page, 'slow');
  await started;
  await expect(page.getByRole('status')).toHaveText('Loading books...');
  const canceled = page.waitForEvent('requestfailed', request => isSearch(request.url(), 'slow'));

  await search(page).fill('RxJS');
  // The canceled request must not supply the next view; only the latest term may do so.
  await canceled;
  await expect(card(page, latestBook)).toBeVisible();
  await expect(cards(page)).toHaveCount(1);
  await expect(card(page, book)).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  // Observe beyond the debounce window to detect delayed duplicate or stale work.
  await page.waitForTimeout(400);
  expectSearches(requests, ['', 'slow', 'RxJS']);
  await expect(card(page, latestBook)).toBeVisible();
});

test('clear cancels a pending debounce and reloads immediately exactly once', async ({ page }) => {
  const requests = await mockCollection(page);
  await page.goto(appUrl);
  await expect(card(page, book)).toBeVisible();
  await search(page).fill('pending');

  await clear(page).click();
  await expect(search(page)).toHaveValue('');
  await expect.poll(() => requests.length).toBe(2);
  await expect(card(page, book)).toBeVisible();
  expectSearches(requests, ['', '']);
  // Observe beyond the debounce window to detect delayed duplicate or stale work.
  await page.waitForTimeout(400);
  expectSearches(requests, ['', '']);
});

test('clear cancels an active request and reloads immediately exactly once', async ({ page }) => {
  const requests = await mockCollection(page, (route, term) => {
    if (term) return;
    return respond(route);
  });
  await page.goto(appUrl);
  await expect(card(page, book)).toBeVisible();
  const started = page.waitForRequest(request => isSearch(request.url(), 'slow'));
  await enterSearch(page, 'slow');
  await started;
  await expect(page.getByRole('status')).toHaveText('Loading books...');
  const canceled = page.waitForEvent('requestfailed', request => isSearch(request.url(), 'slow'));

  await clear(page).click();
  await canceled;
  await expect(search(page)).toHaveValue('');
  await expect(card(page, book)).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expectSearches(requests, ['', 'slow', '']);
  // Observe beyond the debounce window to detect delayed duplicate or stale work.
  await page.waitForTimeout(400);
  expectSearches(requests, ['', 'slow', '']);
});

test('leaving the collection cancels a pending search debounce', async ({ page }) => {
  const requests = await mockCollection(page);
  await page.goto(appUrl);
  await expect(card(page, book)).toBeVisible();
  await search(page).fill('pending');

  await leaveCollection(page);
  // Observe beyond the debounce window to detect delayed duplicate or stale work.
  await page.waitForTimeout(400);
  expectSearches(requests, ['']);
  await expect(page.getByRole('article')).toBeVisible();
});

test('leaving the collection cancels its active request', async ({ page }) => {
  const requests = await mockCollection(page, (route, term) => {
    if (term) return;
    return respond(route);
  });
  await page.goto(appUrl);
  await expect(card(page, book)).toBeVisible();
  const started = page.waitForRequest(request => isSearch(request.url(), 'slow'));
  await enterSearch(page, 'slow');
  await started;
  await expect(page.getByRole('status')).toHaveText('Loading books...');
  const canceled = page.waitForEvent('requestfailed', request => isSearch(request.url(), 'slow'));

  await leaveCollection(page);
  await canceled;
  // Observe beyond the debounce window to detect delayed duplicate or stale work.
  await page.waitForTimeout(400);
  expectSearches(requests, ['', 'slow']);
  await expect(page.getByRole('article')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
});

test('shows an initial HTTP failure as a local error rather than an empty collection', async ({ page }) => {
  const requests = await mockCollection(page, route => respond(route, [], 500));
  await page.goto(appUrl);
  await expectFailure(page);
  expectSearches(requests, ['']);
});

test('shows an initially empty successful collection without an error or retry', async ({ page }) => {
  const requests = await mockCollection(page, route => respond(route, []));
  await page.goto(appUrl);
  await expect(page.getByText('No books available', { exact: true })).toBeVisible();
  await expect(page.getByText('No books match your search', { exact: true })).toHaveCount(0);
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
  expectSearches(requests, ['']);
});

test('shows a successful empty search and clears it back to the collection', async ({ page }) => {
  const requests = await mockCollection(page, (route, term) => respond(route, term ? [] : [book]));
  await page.goto(appUrl);
  await expect(card(page, book)).toBeVisible();
  await enterSearch(page, 'missing');
  await expect(page.getByText('No books match your search', { exact: true })).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);

  // Prefer the optional empty-state action when present; the search-field clear works too.
  await page
    .getByRole('button', { name: /^Clear search$/i })
    .last()
    .click();
  await expect(search(page)).toHaveValue('');
  await expect(card(page, book)).toBeVisible();
  await expect(emptyState(page)).toHaveCount(0);
  // Observe beyond the debounce window to detect delayed duplicate or stale work.
  await page.waitForTimeout(400);
  expectSearches(requests, ['', 'missing', '']);
});

test('removes earlier cards when a search fails after a successful load', async ({ page }) => {
  const requests = await mockCollection(page, (route, term) => (term ? respond(route, [], 503) : respond(route)));
  await page.goto(appUrl);
  await expect(card(page, book)).toBeVisible();
  await enterSearch(page, 'unavailable');
  await expectFailure(page);
  await expect(search(page)).toHaveValue('unavailable');
  expectSearches(requests, ['', 'unavailable']);
});

test('retries the same failed search term immediately and returns to results', async ({ page }) => {
  let attempts = 0;
  const requests = await mockCollection(page, (route, term) => {
    if (!term) return respond(route);
    attempts++;
    return attempts === 1 ? respond(route, [], 500) : respond(route, [latestBook]);
  });
  await page.goto(appUrl);
  await expect(card(page, book)).toBeVisible();
  await enterSearch(page, 'RxJS');
  await expectFailure(page);

  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  // Retrying the same term must not be suppressed by search deduplication.
  await expect(card(page, latestBook)).toBeVisible();
  await expect(search(page)).toHaveValue('RxJS');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
  // Observe beyond the debounce window to detect delayed duplicate or stale work.
  await page.waitForTimeout(400);
  expectSearches(requests, ['', 'RxJS', 'RxJS']);
  expect(attempts).toBe(2);
});

test('shows a network failure locally and can retry the initial collection', async ({ page }) => {
  let attempts = 0;
  const requests = await mockCollection(page, route => {
    attempts++;
    return attempts === 1 ? route.abort('failed') : respond(route);
  });
  await page.goto(appUrl);
  await expectFailure(page);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(card(page, book)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  expectSearches(requests, ['', '']);
});

test('accepts a different search after an error without requiring retry', async ({ page }) => {
  const requests = await mockCollection(page, (route, term) => {
    if (term === 'broken') return respond(route, [], 500);
    return respond(route, term ? [latestBook] : [book]);
  });
  await page.goto(appUrl);
  await expect(card(page, book)).toBeVisible();
  await enterSearch(page, 'broken');
  await expectFailure(page);

  await enterSearch(page, 'RxJS');
  await expect(card(page, latestBook)).toBeVisible();
  await expect(cards(page)).toHaveCount(1);
  await expect(card(page, book)).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
  expectSearches(requests, ['', 'broken', 'RxJS']);
});
