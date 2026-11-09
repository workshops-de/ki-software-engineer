import { expect, test, Page } from '@playwright/test';
import type { Book } from '../src/app/books/book';
import { api, book, expectBookRequest, expectListRequest, setup } from './support/books';

async function open(page: Page) {
  await page.getByRole('button', { name: `Details for ${book.title}`, exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('opens with keyboard, loads current details and restores focus', async ({ page }) => {
  await setup(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => (release = resolve));
  await page.route(`${api}/${book.isbn}`, async route => {
    expectBookRequest(route);
    await pending;
    await route.fulfill({ json: { ...book, title: 'Current API title' } });
  });
  const button = page.getByRole('button', { name: `Details for ${book.title}`, exact: true });
  await button.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Loading book details...')).toBeVisible();
  release();
  for (const value of [
    'Current API title',
    book.subtitle!,
    book.author,
    book.isbn,
    book.publisher,
    String(book.numPages),
    book.price,
    book.abstract,
    'No cover available'
  ]) {
    await expect(dialog.getByText(value, { exact: true })).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();
});

test('cancel discards draft without changing the list or sending PUT', async ({ page }) => {
  await setup(page);
  let puts = 0;
  page.on('request', request => {
    if (request.method() === 'PUT') puts++;
  });
  await open(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(dialog.getByLabel('ISBN', { exact: true })).toHaveJSProperty('readOnly', true);
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(book.title);
  await dialog.getByLabel('Title', { exact: true }).fill('Unsaved draft');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog.getByText(book.title, { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(book.title);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  expect(puts).toBe(0);
});

test('validates required fields and positive integer pages', async ({ page }) => {
  await setup(page);
  let puts = 0;
  page.on('request', request => {
    if (request.method() === 'PUT') puts++;
  });
  await open(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog.getByLabel('Title', { exact: true }).fill('   ');
  await dialog.getByLabel('Author', { exact: true }).fill('');
  for (const value of ['0', '-1', '1.5', '']) {
    await dialog.getByLabel('Pages', { exact: true }).fill(value);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog.getByText('Pages must be a positive whole number.')).toBeVisible();
  }
  await expect(dialog.getByText('Title is required.')).toBeVisible();
  await expect(dialog.getByText('Author is required.')).toBeVisible();
  expect(puts).toBe(0);
});

test('saves full book once, prevents closing and refreshes current search', async ({ page }) => {
  await setup(page);
  const searches: (string | null)[] = [];
  let saved: Book | undefined;
  let puts = 0;
  let release!: () => void;
  const pending = new Promise<void>(resolve => (release = resolve));
  await page.route(`${api}*`, route => {
    const url = expectListRequest(route);
    searches.push(url.searchParams.get('q'));
    const current = saved ?? book;
    const query = url.searchParams.get('q')?.toLowerCase();
    const matches = !query || `${current.title} ${current.author}`.toLowerCase().includes(query);
    return route.fulfill({ json: matches ? [current] : [] });
  });
  await page.route(`${api}/${book.isbn}`, async route => {
    expectBookRequest(route, ['GET', 'PUT']);
    if (route.request().method() === 'PUT') {
      puts++;
      saved = route.request().postDataJSON();
      await pending;
      await route.fulfill({ json: saved });
    } else {
      expectBookRequest(route);
      await route.fulfill({ json: book });
    }
  });
  await page.getByRole('textbox', { name: 'Search for books' }).fill('Angular');
  await expect.poll(() => searches).toContain('Angular');
  await open(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
  const changes = {
    title: 'Angular revised',
    subtitle: 'New subtitle',
    author: 'New author',
    publisher: 'New publisher',
    numPages: 321,
    price: 'EUR 34.50',
    cover: 'https://example.test/cover.png',
    abstract: 'New description'
  };
  for (const [label, value] of Object.entries({
    Title: changes.title,
    Subtitle: changes.subtitle,
    Author: changes.author,
    Publisher: changes.publisher,
    Pages: String(changes.numPages),
    Price: changes.price,
    'Cover URL': changes.cover,
    Description: changes.abstract
  })) {
    await dialog.getByLabel(label, { exact: true }).fill(value);
  }
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByText('Saving changes...')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Saving...', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.mouse.click(1, 1);
  await expect(dialog).toBeVisible();
  expect(saved).toEqual({ ...book, ...changes });
  expect(puts).toBe(1);
  const before = searches.length;
  release();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Book updated successfully.')).toBeVisible();
  await expect(page.getByRole('heading', { name: changes.title, exact: true })).toBeVisible();
  expect(searches.length).toBeGreaterThan(before);
  expect(searches.at(-1)).toBe('Angular');
});

for (const status of [404, 500]) {
  test(`load error ${status} offers retry`, async ({ page }) => {
    await setup(page);
    await page.route(`${api}/${book.isbn}`, route => {
      expectBookRequest(route);
      return route.fulfill({ status, json: {} });
    });
    await open(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('alert')).toHaveText(
      status === 404
        ? 'This book could not be found. It may have been removed.'
        : 'Could not load book details. Please try again.'
    );
    await page.route(`${api}/${book.isbn}`, route => {
      expectBookRequest(route);
      return route.fulfill({ json: book });
    });
    await dialog.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(dialog.getByText(book.title, { exact: true })).toBeVisible();
  });
}

test('save failure preserves input and allows retry', async ({ page }) => {
  await setup(page);
  let puts = 0;
  await page.route(`${api}/${book.isbn}`, route => {
    expectBookRequest(route, ['GET', 'PUT']);
    if (route.request().method() === 'GET') return route.fulfill({ json: book });
    puts++;
    return puts === 1
      ? route.fulfill({ status: 500, json: {} })
      : route.fulfill({ json: route.request().postDataJSON() });
  });
  await open(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog.getByLabel('Title', { exact: true }).fill('Keep this draft');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Could not save your changes. Please try again.');
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Keep this draft');
  // Material hides the background from assistive technology while the dialog is open.
  await expect(page.getByRole('heading', { name: book.title, exact: true, includeHidden: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(puts).toBe(2);
});

test('mobile dialog fits viewport and replaces broken covers', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.route('https://example.test/**', route => route.abort());
  await setup(page);
  await page.route(`${api}/${book.isbn}`, route => {
    expectBookRequest(route);
    return route.fulfill({ json: { ...book, cover: 'https://example.test/missing.png' } });
  });
  await open(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('No cover available')).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.width).toBeLessThanOrEqual(375);
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog.getByLabel('Description', { exact: true }).fill('Mobile draft');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog.getByText(book.abstract)).toBeVisible();
});

for (const committed of [false, true]) {
  test(`a timed out save requires checking the server before editing (committed: ${committed})`, async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
    await setup(page);
    let serverBook = { ...book };
    let puts = 0;
    let gets = 0;
    const searches: (string | null)[] = [];
    await page.route(`${api}*`, route => {
      searches.push(expectListRequest(route).searchParams.get('q'));
      return route.fulfill({ json: [serverBook] });
    });
    await page.route(`${api}/${book.isbn}`, async route => {
      expectBookRequest(route, ['GET', 'PUT']);
      if (route.request().method() === 'GET') {
        gets++;
        return route.fulfill({ json: serverBook });
      }
      puts++;
      if (committed) serverBook = route.request().postDataJSON();
      // Simulate a connection that never confirms whether the server saved.
      // The request is canceled by the client timeout or browser teardown.
    });
    await open(page);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog.getByLabel('Title', { exact: true }).fill('Unconfirmed draft');
    await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => puts).toBe(1);
    await page.clock.runFor(14999);
    await expect(dialog.getByText('Saving changes...')).toBeVisible();
    await page.clock.runFor(1);
    await expect(dialog.getByRole('alert')).toContainText('The save result is unknown.');
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Unconfirmed draft');
    await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Reload saved version', exact: true }).click();
    await page.clock.resume();
    await expect(dialog.getByText(serverBook.title, { exact: true })).toBeVisible();
    expect(gets).toBe(2);
    expect(puts).toBe(1);
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(dialog.getByLabel('Title', { exact: true })).toBeEnabled();
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(serverBook.title);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect.poll(() => searches).toEqual([null]);
    await expect(page.getByRole('heading', { name: serverBook.title, exact: true })).toBeVisible();
    await expect(page.getByText('Book updated successfully.', { exact: true })).toHaveCount(0);
  });
}

test('a stalled detail load becomes a retryable error', async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await setup(page);
  await page.route(`${api}/${book.isbn}`, route => {
    expectBookRequest(route);
  });
  await open(page);
  const dialog = page.getByRole('dialog');
  await page.clock.pauseAt(new Date('2030-01-01T00:00:10Z'));
  await page.clock.runFor(15000);
  await expect(dialog.getByRole('alert')).toContainText('Could not load book details.');
  await page.route(`${api}/${book.isbn}`, route => {
    expectBookRequest(route);
    return route.fulfill({ json: book });
  });
  await dialog.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.clock.resume();
  await expect(dialog.getByText(book.title, { exact: true })).toBeVisible();
});

test('removes a saved book that no longer matches the current search', async ({ page }) => {
  await setup(page);
  let serverBook = { ...book };
  const searches: (string | null)[] = [];
  await page.route(`${api}*`, route => {
    const query = expectListRequest(route).searchParams.get('q');
    searches.push(query);
    const matches = !query || `${serverBook.title} ${serverBook.author}`.toLowerCase().includes(query.toLowerCase());
    return route.fulfill({ json: matches ? [serverBook] : [] });
  });
  await page.route(`${api}/${book.isbn}`, route => {
    expectBookRequest(route, ['GET', 'PUT']);
    if (route.request().method() === 'PUT') serverBook = route.request().postDataJSON();
    return route.fulfill({ json: serverBook });
  });
  await page.getByRole('textbox', { name: 'Search for books' }).fill('Angular');
  await expect.poll(() => searches).toEqual(['Angular']);
  await open(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog.getByLabel('Title', { exact: true }).fill('RxJS in practice');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('No books match your search', { exact: true })).toBeVisible();
  expect(searches).toEqual(['Angular', 'Angular']);
  expect(serverBook).toEqual({ ...book, title: 'RxJS in practice' });
});

test('a lost save connection allows closing and refreshes an unconfirmed server change', async ({ page }) => {
  await setup(page);
  let serverBook = { ...book };
  let puts = 0;
  await page.route(`${api}*`, route => {
    expectListRequest(route);
    return route.fulfill({ json: [serverBook] });
  });
  await page.route(`${api}/${book.isbn}`, route => {
    expectBookRequest(route, ['GET', 'PUT']);
    if (route.request().method() === 'GET') return route.fulfill({ json: serverBook });
    puts++;
    serverBook = route.request().postDataJSON();
    return route.abort('connectionreset');
  });
  await open(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog.getByLabel('Title', { exact: true }).fill('Saved without confirmation');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('The save result is unknown.');
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(serverBook.title);
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: serverBook.title, exact: true })).toBeVisible();
  await expect(page.getByText('Book updated successfully.', { exact: true })).toHaveCount(0);
  expect(puts).toBe(1);
});
