import { expect, test } from '@playwright/test';
import { api, book, expectListRequest, setup } from './support/books';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await setup(page);
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
});

test('debounces typing and hides results for the previous search immediately', async ({ page }) => {
  const searches: string[] = [];
  await page.route(`${api}*`, route => {
    const url = expectListRequest(route);
    searches.push(url.searchParams.get('q') ?? '');
    return route.fulfill({ json: [book] });
  });
  const input = page.getByRole('textbox', { name: 'Search for books' });
  await input.fill('Ang');
  await page.clock.runFor(200);
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toHaveCount(0);
  await expect(page.getByText('Loading books...', { exact: true })).toBeVisible();
  await input.fill('Angular');
  await page.clock.runFor(299);
  expect(searches).toEqual([]);
  await page.clock.runFor(1);
  await page.clock.resume();
  await expect.poll(() => searches).toEqual(['Angular']);
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
});

test('ignores an older response arriving during the next search debounce', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => (release = resolve));
  const searches: string[] = [];
  await page.route(`${api}*`, async route => {
    const query = expectListRequest(route).searchParams.get('q') ?? '';
    searches.push(query);
    if (query === 'old') await pending;
    await route.fulfill({ json: [{ ...book, title: query === 'old' ? 'Outdated result' : 'Latest result' }] });
  });
  const input = page.getByRole('textbox', { name: 'Search for books' });
  await input.fill('old');
  await page.clock.runFor(300);
  await expect.poll(() => searches).toEqual(['old']);
  await input.fill('new');
  release();
  await page.clock.runFor(200);
  await expect(page.getByText('Loading books...', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Outdated result' })).toHaveCount(0);
  await page.clock.runFor(100);
  await page.clock.resume();
  await expect(page.getByRole('heading', { name: 'Latest result' })).toBeVisible();
  expect(searches).toEqual(['old', 'new']);
});

test('clear cancels the pending debounce and reloads once without a query', async ({ page }) => {
  const searches: (string | null)[] = [];
  await page.route(`${api}*`, route => {
    searches.push(expectListRequest(route).searchParams.get('q'));
    return route.fulfill({ json: [book] });
  });
  await page.getByRole('textbox', { name: 'Search for books' }).fill('pending');
  await page.clock.runFor(200);
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect.poll(() => searches).toEqual([null]);
  await page.clock.runFor(1000);
  expect(searches).toEqual([null]);
  await expect(page.getByRole('textbox', { name: 'Search for books' })).toHaveValue('');
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
});

test('distinguishes a list failure from empty results and retries the current query', async ({ page }) => {
  let fail = true;
  const searches: (string | null)[] = [];
  await page.route(`${api}*`, route => {
    searches.push(expectListRequest(route).searchParams.get('q'));
    return route.fulfill(fail ? { status: 500, json: {} } : { json: [] });
  });
  await page.getByRole('textbox', { name: 'Search for books' }).fill('missing');
  await page.clock.runFor(300);
  await page.clock.resume();
  await expect(page.getByRole('alert')).toContainText('Could not load books.');
  await expect(page.getByText('No books match your search', { exact: true })).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('No books match your search', { exact: true })).toBeVisible();
  expect(searches).toEqual(['missing', 'missing']);
});

test('recovers from a failed initial list request', async ({ page }) => {
  await page.clock.resume();
  let fail = true;
  const searches: (string | null)[] = [];
  await page.route(`${api}*`, route => {
    searches.push(expectListRequest(route).searchParams.get('q'));
    return route.fulfill(fail ? { status: 500, json: {} } : { json: [book] });
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Could not load books.');
  await expect(page.getByText('No books available', { exact: true })).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(searches).toEqual([null, null]);
});
