import { expect, Locator, Page, Response, test } from '@playwright/test';
import { Book } from '../src/app/books/book';
import { apiUrl, mockBookApp } from './support/book-app';

// Issue #2. Verified against Bookmonkey API 3.3.0: _page/_limit/q and X-Total-Count.
const books: Book[] = Array.from({ length: 23 }, (_, i) => ({
  id: `paging-${i + 1}`,
  title: `${i < 13 ? 'Angular' : 'TypeScript'} book ${String(i + 1).padStart(2, '0')}`,
  author: 'Paging Author',
  isbn: `978000000${String(i + 1).padStart(4, '0')}`,
  publisher: 'Example Press',
  numPages: 100,
  price: '10 credits',
  cover: '',
  abstract: 'Paging example.',
  userId: 1
}));

type CatalogRequest = { page: number; limit: number; term: string };

function parameters(url: string): CatalogRequest {
  const query = new URL(url).searchParams;
  return {
    page: Number(query.get('_page') ?? 1),
    limit: Number(query.get('_limit') ?? 10),
    term: query.get('q') ?? ''
  };
}

async function mockCatalog(page: Page, data = books): Promise<CatalogRequest[]> {
  const requests: CatalogRequest[] = [];
  await mockBookApp(page, books[0]);
  await page.route(`${apiUrl}/*`, route => {
    const book = books.find(candidate => route.request().url() === `${apiUrl}/${candidate.id}`);
    return route.fulfill({ status: book ? 200 : 404, json: book ?? {} });
  });
  await page.route(`${apiUrl}?*`, route => {
    const request = parameters(route.request().url());
    requests.push(request);
    const matching = data.filter(book =>
      `${book.title} ${book.author}`.toLowerCase().includes(request.term.toLowerCase())
    );
    return route.fulfill({
      json: matching.slice((request.page - 1) * request.limit, request.page * request.limit),
      headers: { 'X-Total-Count': String(matching.length), 'Access-Control-Expose-Headers': 'X-Total-Count' }
    });
  });
  return requests;
}

function control(page: Page, name: RegExp): Locator {
  return page.getByRole('button', { name }).or(page.getByRole('link', { name }));
}

const next = (page: Page) => control(page, /^(Next|Weiter)$/i);
const previous = (page: Page) => control(page, /^(Previous|Back|Zurück)$/i);
const numbered = (page: Page, number: number) => control(page, new RegExp(`^(?:Page |Seite )?${number}$`, 'i'));
const cards = (page: Page) => page.locator('app-book-item');

async function expectBooks(page: Page, expected: Book[]): Promise<void> {
  await expect(cards(page).getByRole('heading')).toHaveText(expected.map(book => book.title));
}

async function search(page: Page, term: string, expected: Book[]): Promise<void> {
  const response = page.waitForResponse(
    response => response.url().startsWith(`${apiUrl}?`) && parameters(response.url()).term === term
  );
  await page.getByRole('searchbox').fill(term);
  await (await response).finished();
  await expectBooks(page, expected);
}

async function changePage(page: Page, target: Locator, expected: Book[]): Promise<void> {
  await expect(target).toBeVisible();
  await target.click();
  await expectBooks(page, expected);
}

async function pauseClock(page: Page): Promise<void> {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
}

async function renderResponse(page: Page, response: Promise<Response>): Promise<void> {
  await (await response).finished();
  await page.clock.runFor(32);
}

test('AK1: first visit shows exactly the first ten unfiltered books', async ({ page }) => {
  const requests = await mockCatalog(page);
  await page.goto('/');
  await expectBooks(page, books.slice(0, 10));
  expect(requests).toEqual([{ page: 1, limit: 10, term: '' }]);
});

test('AK2/AK3: numbers, next and previous reach all pages and expose current page and boundaries', async ({ page }) => {
  const requests = await mockCatalog(page);
  await page.goto('/');
  await expectBooks(page, books.slice(0, 10));
  await expect(previous(page)).toBeDisabled();
  await expect(page.locator('[aria-current="page"]')).toContainText('1');
  await changePage(page, numbered(page, 2), books.slice(10, 20));
  await expect(page.locator('[aria-current="page"]')).toContainText('2');
  await changePage(page, next(page), books.slice(20));
  await expect(next(page)).toBeDisabled();
  await expect(page.locator('[aria-current="page"]')).toContainText('3');
  await changePage(page, previous(page), books.slice(10, 20));
  await changePage(page, numbered(page, 1), books.slice(0, 10));
  expect(requests.map(request => request.page)).toEqual([1, 2, 3, 2, 1]);
  expect(requests.every(request => request.limit === 10 && request.term === '')).toBe(true);
});

for (const total of [0, 7, 10]) {
  test(`AK4: ${total} results offer no enabled page-changing navigation`, async ({ page }) => {
    await mockCatalog(page, books.slice(0, total));
    await page.goto('/');
    await expectBooks(page, books.slice(0, total));
    if (total === 0) await expect(page.getByText('No books available', { exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    const navigation = control(page, /^(Previous|Back|Zurück|Next|Weiter|(?:Page |Seite )?\d+)$/i);
    for (const item of await navigation.all()) {
      if ((await item.getAttribute('aria-current')) !== 'page') await expect(item).toBeDisabled();
    }
  });
}

for (const clear of ['button', 'input'] as const) {
  test(`AK5: search and clearing via ${clear} reset page two to page one`, async ({ page }) => {
    const requests = await mockCatalog(page);
    await page.goto('/');
    await expectBooks(page, books.slice(0, 10));
    await changePage(page, next(page), books.slice(10, 20));
    await search(page, 'Angular', books.slice(0, 10));
    await changePage(page, next(page), books.slice(10, 13));
    await expect(next(page)).toBeDisabled();
    if (clear === 'button') await page.getByRole('button', { name: 'Clear search', exact: true }).click();
    else await page.getByRole('searchbox').fill('');
    await expectBooks(page, books.slice(0, 10));
    expect(requests).toEqual([
      { page: 1, limit: 10, term: '' },
      { page: 2, limit: 10, term: '' },
      { page: 1, limit: 10, term: 'Angular' },
      { page: 2, limit: 10, term: 'Angular' },
      { page: 1, limit: 10, term: '' }
    ]);
  });
}

test('AK6: returning from details restores the search even on the first page', async ({ page }) => {
  await mockCatalog(page);
  await page.goto('/');
  await expectBooks(page, books.slice(0, 10));
  await search(page, 'TypeScript', books.slice(13));
  await page.getByRole('link', { name: books[13].title, exact: true }).click();
  await expect(page.getByRole('article')).toBeVisible();
  await page.getByRole('link', { name: 'Back to books', exact: true }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('TypeScript');
  await expectBooks(page, books.slice(13));
});

test('AK6: detail return retains page two and search; reload resets both without URL parameters', async ({ page }) => {
  await mockCatalog(page);
  await page.goto('/');
  await expectBooks(page, books.slice(0, 10));
  await search(page, 'Angular', books.slice(0, 10));
  await changePage(page, next(page), books.slice(10, 13));
  await page.getByRole('link', { name: books[10].title, exact: true }).click();
  await expect(page.getByRole('article')).toBeVisible();
  await page.getByRole('link', { name: 'Back to books', exact: true }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('Angular');
  await expectBooks(page, books.slice(10, 13));
  await expect(page.locator('[aria-current="page"]')).toContainText('2');
  expect(new URL(page.url()).search).toBe('');
  await page.reload();
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expectBooks(page, books.slice(0, 10));
  await expect(page.locator('[aria-current="page"]')).toContainText('1');
});

test('AK6: reload discards a search instead of persisting it', async ({ page }) => {
  await mockCatalog(page);
  await page.goto('/');
  await expectBooks(page, books.slice(0, 10));
  await search(page, 'TypeScript', books.slice(13));
  await page.reload();
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expectBooks(page, books.slice(0, 10));
  expect(new URL(page.url()).search).toBe('');
});

test('AK7: new search cancels a slow page request immediately and rejects its late response', async ({ page }) => {
  await mockCatalog(page);
  await page.goto('/');
  await expectBooks(page, books.slice(0, 10));
  await expect(next(page)).toBeVisible();
  await pauseClock(page);
  let release!: () => void;
  let finish!: () => void;
  const gate = new Promise<void>(resolve => (release = resolve));
  const finished = new Promise<void>(resolve => (finish = resolve));
  await page.route(`${apiUrl}?*`, async (route, request) => {
    if (parameters(request.url()).page !== 2) return route.fallback();
    await gate;
    await route.fulfill({ json: books.slice(10, 20), headers: { 'X-Total-Count': '23' } });
    finish();
  });
  try {
    const pending = page.waitForRequest(
      request => request.url().startsWith(`${apiUrl}?`) && parameters(request.url()).page === 2
    );
    await next(page).click();
    const active = await pending;
    const canceled = page.waitForEvent('requestfailed', request => request.url() === active.url());
    await page.getByRole('searchbox').fill('TypeScript');
    await canceled;
    await page.clock.runFor(32);
    await expect(page.getByRole('status')).toBeVisible();
    const response = page.waitForResponse(
      response => response.url().startsWith(`${apiUrl}?`) && parameters(response.url()).term === 'TypeScript'
    );
    await page.clock.runFor(300);
    await renderResponse(page, response);
    await expectBooks(page, books.slice(13));
    release();
    await finished;
    await page.clock.runFor(32);
    await expectBooks(page, books.slice(13));
  } finally {
    release();
  }
});

test('AK8: loading and page-two failure stay distinct; retry preserves page and query', async ({ page }) => {
  await mockCatalog(page);
  await page.goto('/');
  await expectBooks(page, books.slice(0, 10));
  await search(page, 'Angular', books.slice(0, 10));
  await expect(next(page)).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>(resolve => (release = resolve));
  let attempts = 0;
  const failedRequests: CatalogRequest[] = [];
  await page.route(`${apiUrl}?*`, async (route, request) => {
    const query = parameters(request.url());
    if (query.page !== 2) return route.fallback();
    failedRequests.push(query);
    if (++attempts === 1) {
      await gate;
      return route.fulfill({ status: 503, json: {} });
    }
    return route.fallback();
  });
  try {
    await next(page).click();
    await expect(page.getByRole('status')).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
    release();
    await expect(page.getByRole('alert')).toContainText('Unable to load books');
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByText('No books match your search', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /^(Retry|Erneut versuchen)$/i }).click();
    await expectBooks(page, books.slice(10, 13));
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(failedRequests).toEqual([
      { page: 2, limit: 10, term: 'Angular' },
      { page: 2, limit: 10, term: 'Angular' }
    ]);
  } finally {
    release();
  }
});

for (const theme of ['light', 'dark'] as const) {
  test(`AK9: paging is keyboard-operable, fits mobile and has readable ${theme} theme contrast`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(theme => localStorage.setItem('bookmonkey-theme', theme), theme);
    await mockCatalog(page);
    await page.goto('/');
    await expectBooks(page, books.slice(0, 10));
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(next(page)).toBeVisible();
    const navigation = control(page, /^(Previous|Back|Zurück|Next|Weiter|(?:Page |Seite )?\d+)$/i);
    for (const item of await navigation.all()) {
      const box = await item.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(375);
      if (await item.isDisabled()) continue;
      const contrast = await item.evaluate(node => {
        const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        let background: Element | null = node;
        while (
          background &&
          ['rgba(0, 0, 0, 0)', 'transparent'].includes(getComputedStyle(background).backgroundColor)
        ) {
          background = background.parentElement;
        }
        const luminance = (channels: number[]) =>
          channels
            .map(channel => {
              const value = channel / 255;
              return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
        const foreground = luminance(rgb(getComputedStyle(node).color));
        const surface = luminance(
          rgb(background ? getComputedStyle(background).backgroundColor : 'rgb(255, 255, 255)')
        );
        return (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
    await next(page).focus();
    await expect(next(page)).toBeFocused();
    await expect(next(page)).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Enter');
    await expectBooks(page, books.slice(10, 20));
    await numbered(page, 3).focus();
    await page.keyboard.press('Enter');
    await expectBooks(page, books.slice(20));
    await previous(page).focus();
    await page.keyboard.press('Enter');
    await expectBooks(page, books.slice(10, 20));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
