import { expect, Page, test } from '@playwright/test';
import { api, book, expectListRequest, setup } from './support/books';

const collection = Array.from({ length: 12 }, (_, index) => ({
  ...book,
  id: `book-${index}`,
  isbn: `isbn-${index}`,
  title: `Leseidee ${index}`,
  author: `Autor ${index}`
}));
const trigger = (page: Page) => page.getByRole('button', { name: 'Zufälliges Buch auswürfeln', exact: true });

async function prepare(page: Page, random = 0.999999) {
  await page.addInitScript(value => {
    Math.random = () => value;
  }, random);
  await setup(page);
  await page.route(`${api}*`, route => {
    const url = new URL(route.request().url());
    if (url.search) {
      expectListRequest(route);
      return route.fulfill({ json: collection.slice(0, 10) });
    }
    expect(url.pathname).toBe('/books');
    expect(route.request().method()).toBe('GET');
    return route.fulfill({ json: collection });
  });
}

test('rolls for two seconds with changing covers, blocks another roll and permits repeats', async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await prepare(page);
  await trigger(page).click();
  const dialog = page.getByRole('dialog');
  const again = dialog.getByRole('button', { name: 'Noch einmal würfeln' });
  await expect(again).toBeDisabled();
  await expect(dialog.locator('.dice .face')).toHaveCount(6);
  await expect(dialog.locator('.dice')).toHaveCSS('transform-style', 'preserve-3d');
  await expect(dialog.getByRole('heading', { name: 'Leseidee 11', exact: true })).toBeVisible();
  await expect(dialog.getByText('Autor 11', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Kein Cover verfügbar', { exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
  await again.click();
  await page.clock.runFor(1999);
  await expect(again).toBeDisabled();
  await page.clock.runFor(1);
  await expect(dialog.getByRole('heading', { name: 'Leseidee 11', exact: true })).toBeVisible();
  await page.clock.resume();
});

for (const [random, index] of [
  [0, 0],
  [0.5, 6],
  [0.999999, 11]
]) {
  test(`selects collection index ${index} independently of the current search`, async ({ page }) => {
    await prepare(page, random);
    await page.getByRole('textbox', { name: 'Search for books' }).fill('unrelated search');
    await expect(page.getByRole('heading', { name: 'Leseidee 0', exact: true })).toBeVisible();
    let fullRequests = 0;
    page.on('request', request => {
      if (request.url() === api) fullRequests++;
    });
    await trigger(page).click();
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: `Leseidee ${index}`, exact: true })
    ).toBeVisible();
    expect(fullRequests).toBe(1);
    await page.keyboard.press('Escape');
    await expect(trigger(page)).toBeFocused();
    await expect(page.getByRole('textbox', { name: 'Search for books' })).toHaveValue('unrelated search');
  });
}

test('opens fresh ISBN details, refreshes the current search on save and restores header focus', async ({ page }) => {
  await prepare(page);
  await page.getByRole('textbox', { name: 'Search for books' }).fill('current search');
  const selected = collection[11];
  let gets = 0;
  await page.route(`${api}/${selected.isbn}`, route => {
    if (route.request().method() === 'GET') {
      gets++;
      return route.fulfill({ json: { ...selected, title: 'Fresh server title' } });
    }
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject({
      isbn: selected.isbn,
      id: selected.id,
      title: 'Saved title'
    });
    return route.fulfill({ json: { ...selected, title: 'Saved title' } });
  });
  await trigger(page).focus();
  await page.keyboard.press('Enter');
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Deine nächste Leseidee' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Buchdetails öffnen' }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog).toHaveCount(1);
  await expect(dialog.getByText('Fresh server title', { exact: true })).toBeVisible();
  expect(gets).toBe(1);
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog.getByLabel('Title', { exact: true }).fill('Saved title');
  const refresh = page.waitForRequest(request => new URL(request.url()).searchParams.get('q') === 'current search');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await refresh;
  await expect(dialog).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
  await expect(page.getByText('Book updated successfully.')).toBeVisible();
});

test('distinguishes load failure and empty collection and retries a failed request', async ({ page }) => {
  await prepare(page);
  let attempts = 0;
  await page.route(api, route => {
    attempts++;
    return attempts === 1 ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ json: [] });
  });
  await trigger(page).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText('konnte nicht geladen werden');
  await dialog.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(dialog.getByRole('status')).toContainText('noch keine Bücher');
  await expect(dialog.getByRole('button', { name: 'Buchdetails öffnen' })).toHaveCount(0);
  expect(attempts).toBe(2);
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`shows book covers on all six dice faces with ${reducedMotion} motion`, async ({ page }) => {
    await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
    await page.emulateMedia({ reducedMotion });
    await prepare(page);
    await page.route(api, route =>
      route.fulfill({
        json: collection.map((entry, index) => ({ ...entry, cover: `/preview-${index}.svg` }))
      })
    );
    await page.route('**/preview-*.svg', route =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120"><rect width="80" height="120" fill="blue" /></svg>'
      })
    );
    await trigger(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Leseidee 11', exact: true })).toBeVisible();
    await page.clock.pauseAt(new Date('2030-01-01T01:00:00Z'));
    await dialog.getByRole('button', { name: 'Noch einmal würfeln' }).click();
    await page.clock.runFor(16);
    const covers = dialog.locator('.dice .face img');
    await expect(covers).toHaveCount(6);
    for (let index = 0; index < 6; index++) {
      await expect(covers.nth(index)).toHaveAttribute('src', `/preview-${index}.svg`);
    }
    await page.clock.runFor(160);
    for (let index = 0; index < 6; index++) {
      await expect(covers.nth(index)).toHaveAttribute(
        'src',
        `/preview-${index + (reducedMotion === 'reduce' ? 0 : 1)}.svg`
      );
    }
    await expect(dialog.locator('.dice')).toHaveCSS('animation-name', reducedMotion === 'reduce' ? 'none' : /roll$/);
    await page.clock.resume();
  });
}

test('replaces broken covers on dice faces and in the result', async ({ page }) => {
  await prepare(page, 0);
  await page.route(api, route =>
    route.fulfill({
      json: [
        { ...collection[0], cover: '/missing-cover-a.png' },
        { ...collection[1], cover: '/missing-cover-b.png' }
      ]
    })
  );
  const requested = new Set<string>();
  await page.route('**/missing-cover-*.png', route => {
    requested.add(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 404, body: '' });
  });
  await trigger(page).click();
  const dialog = page.getByRole('dialog');
  await expect.poll(() => requested.size).toBe(2);
  await expect(dialog.locator('.face img')).toHaveCount(0);
  await expect(dialog.locator('.face')).toHaveText(Array(6).fill('Kein Cover verfügbar'));
  await expect(dialog.getByRole('heading', { name: 'Leseidee 0', exact: true })).toBeVisible();
  await expect(dialog.getByText('Kein Cover verfügbar', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('img')).toHaveCount(0);
});

test('closing stops the animation and a reopened dialog starts a fresh roll', async ({ page }) => {
  await prepare(page);
  await trigger(page).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Noch einmal würfeln' })).toBeDisabled();
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
  await trigger(page).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Noch einmal würfeln' })).toBeDisabled();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Leseidee 11', exact: true })).toBeVisible();
});

test('closing cancels a pending collection request', async ({ page }) => {
  await prepare(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route(api, async route => {
    await pending;
    await route.fulfill({ json: collection });
  });
  const requested = page.waitForRequest(api);
  await trigger(page).click();
  await requested;
  const aborted = page.waitForEvent('requestfailed', request => request.url() === api);
  await page.keyboard.press('Escape');
  await aborted;
  release();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`supports mobile, keyboard and reduced motion in ${scheme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await prepare(page);
    await trigger(page).focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Deine nächste Leseidee' })).toBeFocused();
    await expect(dialog.locator('.dice')).toHaveCSS('animation-name', 'none');
    await expect(dialog.locator('.dice .face')).toHaveCount(6);
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    await expect(dialog.getByRole('heading', { name: 'Leseidee 11', exact: true })).toBeVisible();
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Schließen', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger(page)).toBeFocused();
  });
}
