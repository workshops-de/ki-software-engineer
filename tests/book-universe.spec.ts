import { expect, Page, test } from '@playwright/test';
import { api, book } from './support/books';
import { PerspectiveCamera, Vector3 } from 'three';
import { cameraDistance, createGalaxy } from '../src/app/book-universe/universe-data';

// Explicit software rendering makes the actual WebGL path testable on headless CI hosts.
test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

const books = [
  book,
  { ...book, isbn: 'second', title: 'SQL essentials', author: 'José Reader', abstract: 'Database design with SQL' },
  { ...book, isbn: 'third', title: 'Advanced Angular', author: book.author }
];
async function setupUniverse(page: Page, options: { fallback?: boolean; mobile?: boolean } = {}): Promise<void> {
  if (options.mobile) await page.setViewportSize({ width: 390, height: 844 });
  if (options.fallback)
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (context: string, ...args: unknown[]) {
        if (context.startsWith('webgl')) return null;
        return Reflect.apply(original, this, [context, ...args]);
      } as typeof original;
    });
  await page.route(`${api}*`, route => {
    const url = new URL(route.request().url());
    if (url.pathname !== '/books') return route.fallback();
    if (url.pathname === '/books' && !url.search) expect(url.searchParams.has('_limit')).toBe(false);
    return route.fulfill({ json: books });
  });
  await page.route(`${api}/${book.isbn}`, route => route.fulfill({ json: book }));
  await page.goto('http://localhost:4200');
  await page.getByRole('link', { name: 'BookMonkey Universe öffnen' }).click();
  await expect(page.getByRole('heading', { name: 'BookMonkey Universe' })).toBeVisible();
  await expect(page.getByText('Deine Galaxie entsteht')).toBeHidden();
}

for (const mobile of [false, true]) {
  test(`header switches between Universe and collection${mobile ? ' on mobile' : ''}`, async ({ page }) => {
    await setupUniverse(page, { mobile });
    const header = page.getByRole('banner');
    const collectionLink = header.getByRole('link', { name: 'Büchersammlung öffnen', exact: true });
    await expect(collectionLink).toHaveAttribute('href', '/');
    await expect(collectionLink).toHaveAttribute('title', 'Büchersammlung öffnen');
    await collectionLink.click();
    await expect(page).toHaveURL('http://localhost:4200/');
    await expect(page.getByRole('heading', { name: 'Book Collection', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Galaxie durchsuchen' })).toHaveCount(0);

    const universeLink = header.getByRole('link', { name: 'BookMonkey Universe öffnen', exact: true });
    await expect(universeLink).toHaveAttribute('href', '/universe');
    await expect(universeLink).toHaveAttribute('title', 'BookMonkey Universe öffnen');
    await universeLink.focus();
    await universeLink.press('Enter');
    await expect(page).toHaveURL('http://localhost:4200/universe');
    await expect(page.getByRole('heading', { name: 'BookMonkey Universe', exact: true })).toBeVisible();
    await collectionLink.focus();
    await collectionLink.press('Enter');
    await expect(page.getByRole('heading', { name: 'Book Collection', exact: true })).toBeVisible();

    await page.goBack();
    await expect(collectionLink).toBeVisible();
    await page.goForward();
    await expect(universeLink).toBeVisible();

    await page.goto('http://localhost:4200/universe?view=galaxy#books');
    await expect(collectionLink).toHaveAttribute('href', '/');
    await collectionLink.click();
    await expect(page.getByRole('heading', { name: 'Book Collection', exact: true })).toBeVisible();
  });
}

test('Enterprise accompanies planet flights, arrives, stops and respects reduced motion', async ({ page }) => {
  await page.clock.install();
  await setupUniverse(page);
  const ship = page.getByText('USS ENTERPRISE · NCC-1701-D', { exact: true });
  const input = page.getByRole('combobox', { name: 'Galaxie durchsuchen' });
  await expect(ship).toBeHidden();
  await input.fill('practice');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await input.press('Enter');
  await page.clock.runFor(300);
  await expect(ship).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('enterprise-flight.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(50);
  // Resizing cancels the current flight; a new one uses the portrait camera aspect.
  await input.fill('SQL');
  await input.press('Enter');
  await page.clock.runFor(300);
  await expect(ship).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('enterprise-flight-mobile.png') });
  await page.clock.runFor(1000);
  await expect(ship).toBeHidden();

  await input.fill('SQL');
  await input.press('Enter');
  await page.clock.runFor(300);
  await expect(ship).toBeVisible();
  // Manual zoom cancels the camera flight and the accompanying ship.
  await page.locator('.bm-scene canvas').dispatchEvent('wheel', { deltaY: 80, deltaMode: 0 });
  await expect(ship).toBeHidden();

  await input.fill('practice');
  await input.press('Enter');
  await page.clock.runFor(300);
  await expect(ship).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.runFor(50);
  await expect(ship).toBeHidden();
  await input.fill('SQL');
  await input.press('Enter');
  await page.clock.runFor(300);
  await expect(ship).toBeHidden();
});

test('Discovery flies with the Enterprise and removes it on pause and navigation', async ({ page }) => {
  await page.clock.install();
  await setupUniverse(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  const ship = page.getByText('USS ENTERPRISE · NCC-1701-D', { exact: true });
  await page.getByRole('button', { name: 'Discovery starten' }).dispatchEvent('click');
  await page.clock.runFor(300);
  await expect(ship).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).dispatchEvent('click');
  await expect(ship).toBeHidden();
  await page.getByRole('button', { name: 'Nächstes Buch' }).dispatchEvent('click');
  await page.clock.runFor(300);
  await expect(ship).toBeVisible();
  await page.getByRole('button', { name: 'Beenden', exact: true }).dispatchEvent('click');
  await expect(ship).toBeHidden();
  await page.getByRole('link', { name: 'Büchersammlung öffnen', exact: true }).dispatchEvent('click');
  await expect(ship).toHaveCount(0);
});

test('loads full collection, selects by keyboard, opens existing details and returns to list', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await setupUniverse(page);
  const input = page.getByRole('combobox', { name: 'Galaxie durchsuchen' });
  await input.fill('practice');
  await expect(page.getByRole('option')).toHaveCount(1);
  await input.press('Enter');
  const panel = page.getByRole('complementary', { name: 'Ausgewähltes Buch' });
  await expect(panel.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Buchdetails öffnen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByText(book.title, { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await panel.getByRole('button', { name: 'Zurück zur Galaxie', exact: true }).click();
  await page.getByRole('link', { name: 'ZUR BÜCHERSAMMLUNG' }).click();
  await expect(page.getByRole('combobox')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('cluster filters, normalized search, clear, list and related books work', async ({ page }) => {
  await setupUniverse(page);
  await page.getByRole('button', { name: 'Themen erkunden' }).click();
  await page.getByRole('button', { name: 'Datenbanken' }).click();
  const input = page.getByRole('combobox');
  await input.fill('jose');
  await expect(page.getByRole('option')).toHaveCount(1);
  await input.fill('absent');
  await expect(page.getByText('Keine passenden Bücher gefunden.')).toBeVisible();
  await page.getByRole('button', { name: 'Suche löschen' }).click();
  await input.press('Escape');
  await page.getByRole('button', { name: 'Alle Themen' }).click();
  await page.getByRole('button', { name: 'Buchliste öffnen' }).click();
  const list = page.getByRole('complementary', { name: 'Bücher in der Galaxie' });
  await list.getByRole('button', { name: 'Angular in practice' }).click();
  const panel = page.getByRole('complementary', { name: 'Ausgewähltes Buch' });
  await panel.getByRole('button', { name: /Advanced Angular/ }).click();
  await expect(panel.getByRole('heading', { name: 'Advanced Angular' })).toBeVisible();
});

test('discovery supports pause, resume, stepping and manual interruption', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setupUniverse(page);
  await page.getByRole('button', { name: 'Discovery starten' }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Nächstes Buch' }).click();
  await expect(page.getByRole('complementary', { name: 'Ausgewähltes Buch' })).toBeVisible();
  await page.getByRole('button', { name: 'Vorheriges Buch' }).click();
  await page.getByRole('button', { name: 'Fortsetzen' }).click();
  await page.getByRole('combobox').fill('SQL');
  await expect(page.getByRole('button', { name: 'Fortsetzen' })).toBeVisible();
  await page.getByRole('button', { name: 'Beenden', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Discovery starten' })).toBeVisible();
});

test('mobile WebGL fallback remains searchable and opens book details', async ({ page }) => {
  await setupUniverse(page, { fallback: true, mobile: true });
  await expect(page.getByText('Die 3D-Darstellung ist nicht verfügbar.', { exact: false })).toBeVisible();
  await page.getByRole('combobox').fill('practice');
  await page.getByRole('combobox').press('Enter');
  await page.getByRole('button', { name: 'Buchdetails öffnen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('empty collection and API retry have distinct messages', async ({ page }) => {
  await page.route(`${api}*`, route => route.fulfill({ status: 503, json: {} }));
  await page.goto('http://localhost:4200/universe');
  await expect(page.getByText('Verbindung unterbrochen')).toBeVisible();
  await page.route(`${api}*`, route => route.fulfill({ json: [] }));
  await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
  await expect(page.getByText('Noch keine Welten zu entdecken')).toBeVisible();
});

test('repeated navigation disposes loops and context-loss fallback is usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Set<number>();
    Object.defineProperty(window, '__universeFrames', { get: () => pending.size });
    window.requestAnimationFrame = callback => {
      const id = original(time => {
        pending.delete(id);
        callback(time);
      });
      pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = id => {
      pending.delete(id);
      cancel(id);
    };
  });
  await setupUniverse(page);
  for (let index = 0; index < 3; index++) {
    await expect(page.locator('.bm-scene canvas')).toHaveCount(1);
    await page.getByRole('link', { name: 'ZUR BÜCHERSAMMLUNG' }).click();
    await expect(page.locator('.bm-scene canvas')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => Reflect.get(window, '__universeFrames'))).toBe(0);
    await page.getByRole('link', { name: 'BookMonkey Universe öffnen' }).click();
    await expect(page.getByText('Deine Galaxie entsteht')).toBeHidden();
  }
  await page.locator('.bm-scene canvas').dispatchEvent('webglcontextlost');
  await expect(page.getByText('Deine Galaxie als Buchliste')).toBeVisible();
  await page
    .getByRole('complementary', { name: 'Bücher in der Galaxie' })
    .getByRole('button', { name: 'SQL essentials' })
    .click();
  await expect(page.getByRole('heading', { name: 'SQL essentials', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('real WebGL raycasting supports hover, selection, camera flight and view toggles', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await setupUniverse(page);
  await page.route(`${api}`, route => route.fulfill({ json: [book] }));
  await page.reload();
  const canvas = page.locator('.bm-scene canvas');
  await expect(canvas).toBeVisible();
  const bounds = (await canvas.boundingBox())!;
  const galaxy = createGalaxy([book]);
  const planet = galaxy.planets[0];
  const radius = Math.max(15, Math.hypot(...planet.position) + planet.radius + 5);
  const distance = cameraDistance(radius, bounds.width / bounds.height);
  const camera = new PerspectiveCamera(50, bounds.width / bounds.height, 0.1, 20000);
  camera.position.set(0, distance * 0.75, distance * 0.66);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const point = new Vector3(...planet.position).project(camera);
  const x = bounds.x + ((point.x + 1) * bounds.width) / 2,
    y = bounds.y + ((1 - point.y) * bounds.height) / 2;
  await page.mouse.move(x, y);
  await expect(page.getByRole('tooltip')).toContainText(book.title);
  await page.mouse.click(x, y);
  await expect(page.getByRole('complementary', { name: 'Ausgewähltes Buch' })).toContainText(book.title);
  const label = page.locator('.space-label').filter({ hasText: book.title });
  const before = await label.getAttribute('style');
  await page.mouse.dblclick(x, y);
  await expect.poll(() => label.getAttribute('style')).not.toBe(before);
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await expect(label).toBeHidden();
  await page.getByRole('button', { name: 'Verbindungen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Verbindungen', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  expect(errors).toEqual([]);
});

test('saving through the existing editor reloads Universe metadata', async ({ page }) => {
  await setupUniverse(page);
  await page.getByRole('combobox').fill('practice');
  await page.getByRole('combobox').press('Enter');
  await page.getByRole('button', { name: 'Buchdetails öffnen' }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const updated = { ...book, title: 'Updated Angular universe' };
  await page.route(`${api}/${book.isbn}`, async route => {
    if (route.request().method() === 'PUT') {
      expect(route.request().postDataJSON()).toEqual(updated);
      return route.fulfill({ json: updated });
    }
    return route.fulfill({ json: updated });
  });
  await page.route(`${api}`, route => route.fulfill({ json: [updated, ...books.slice(1)] }));
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(updated.title);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(
    page.getByRole('complementary', { name: 'Ausgewähltes Buch' }).getByRole('heading', { name: updated.title })
  ).toBeVisible();
});
