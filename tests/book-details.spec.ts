import { expect, test, Page } from '@playwright/test';
import type { Book } from '../src/app/books/book';

const book: Book = {
  id: 'internal-42',
  isbn: '9781234567890',
  userId: 7,
  title: 'Angular in practice',
  subtitle: 'A practical guide',
  author: 'Jane Reader',
  publisher: 'Example Press',
  numPages: 250,
  price: '$29.90',
  cover: '',
  abstract: 'Build accessible applications.'
};
const api = 'http://localhost:4730/books';

async function setup(page: Page) {
  await page.route(`${api}*`, route => route.fulfill({ json: [book] }));
  await page.route(`${api}/${book.isbn}`, route => route.fulfill({ json: book }));
  await page.goto('http://localhost:4200');
}

async function open(page: Page) {
  await page.getByRole('button', { name: `Details for ${book.title}`, exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('opens with keyboard, loads current details and restores focus', async ({ page }) => {
  await setup(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => (release = resolve));
  await page.route(`${api}/${book.isbn}`, async route => {
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
    searches.push(new URL(route.request().url()).searchParams.get('q'));
    return route.fulfill({ json: [saved ?? book] });
  });
  await page.route(`${api}/${book.isbn}`, async route => {
    if (route.request().method() === 'PUT') {
      puts++;
      saved = route.request().postDataJSON();
      await pending;
      await route.fulfill({ json: saved });
    } else await route.fulfill({ json: book });
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
    await page.route(`${api}/${book.isbn}`, route => route.fulfill({ status, json: {} }));
    await open(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('alert')).toHaveText(
      status === 404
        ? 'This book could not be found. It may have been removed.'
        : 'Could not load book details. Please try again.'
    );
    await page.route(`${api}/${book.isbn}`, route => route.fulfill({ json: book }));
    await dialog.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(dialog.getByText(book.title, { exact: true })).toBeVisible();
  });
}

test('save failure preserves input and allows retry', async ({ page }) => {
  await setup(page);
  let puts = 0;
  await page.route(`${api}/${book.isbn}`, route => {
    if (route.request().method() !== 'PUT') return route.fulfill({ json: book });
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
  await page.route(`${api}/${book.isbn}`, route =>
    route.fulfill({ json: { ...book, cover: 'https://example.test/missing.png' } })
  );
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
