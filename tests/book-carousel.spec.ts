import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Book } from '../src/app/books/book';

const appUrl = 'http://localhost:4200';
const books: Book[] = Array.from({ length: 10 }, (_, index) => ({
  id: `book-${index + 1}`,
  title: `Book ${index + 1}`,
  author: `Author ${index + 1}`,
  isbn: `978000000000${index}`,
  publisher: 'Workshop Press',
  numPages: 200,
  price: 'EUR 20',
  abstract: 'A book to explore.',
  cover: `${appUrl}/covers/${index}.svg`,
  userId: 1
}));

const carousel = (page: Page) => page.getByRole('region', { name: '3D book carousel', exact: true });
const orbit = (page: Page) => page.locator('app-book-carousel .orbit');
const rotation = (page: Page) => orbit(page).evaluate(element => element.style.getPropertyValue('--rotation'));
const party = (page: Page) => page.getByRole('status').filter({ hasText: 'Party mode active' });

async function openCarousel(page: Page) {
  await page.goto(appUrl);
  await expect(page.getByRole('link', { name: 'View details for Book 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '3D carousel', exact: true }).click();
  await expect(carousel(page)).toBeVisible();
}

async function dragCoverWithMouse(page: Page) {
  const cover = page.getByRole('link', { name: 'View details for Book 1', exact: true });
  const box = (await cover.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  return cover;
}

test.beforeEach(async ({ page }) => {
  await page.route(`${appUrl}/covers/*.svg`, route => {
    const index = Number(new URL(route.request().url()).pathname.split('/').pop()?.split('.')[0]);
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="148" height="214"><rect width="148" height="214" rx="6" fill="hsl(${index * 36} 65% 35%)"/><path d="M20 40h108M20 50h75M20 170h108" stroke="white" stroke-width="3"/><circle cx="74" cy="110" r="30" fill="none" stroke="white" stroke-width="2"/></svg>`
    });
  });
  await page.route(/^http:\/\/localhost:4730\/books(?:\/|\?|$)/, route => {
    const url = new URL(route.request().url());
    const term = url.searchParams.get('q');
    const result =
      url.pathname === '/books'
        ? term === 'missing'
          ? []
          : books
        : books.find(book => url.pathname.endsWith(`/${book.id}`));
    return route.fulfill({ json: result, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
});

// Acceptance criteria: https://github.com/vhoyer-dev/ki-software-engineer/issues/1
test('AC1: Given the collection, when selecting the carousel, then it appears and the list can be restored', async ({
  page
}) => {
  // Given the collection can load its existing books.
  let requests = 0;
  page.on('request', request => {
    if (request.url().startsWith('http://localhost:4730/books')) requests++;
  });

  // When the user selects the carousel.
  await openCarousel(page);

  // Then the additional view appears and the original list remains selectable.
  await expect(page.getByRole('button', { name: '3D carousel', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(carousel(page).getByRole('link')).toHaveCount(10);
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await expect(carousel(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Book 1', exact: true })).toBeVisible();
  await expect(page.getByText('Author 1', { exact: true })).toBeVisible();
  expect(requests).toBe(1);
});

test('AC2: Given books with covers, when the normal carousel is displayed, then covers form a stationary 3D circle without titles', async ({
  page
}) => {
  // Given loaded covers and a controllable animation clock.
  await page.clock.install({ time: new Date('2026-11-10T12:00:00Z') });
  await openCarousel(page);
  await expect
    .poll(() =>
      carousel(page)
        .locator('img')
        .evaluateAll(
          (images, count) => images.length === count && images.every(image => image.naturalWidth > 0),
          books.length
        )
    )
    .toBe(true);
  await page.clock.pauseAt(new Date('2026-11-10T12:01:00Z'));

  // When displayed without user input, then covers occupy distinct positions on a 3D circle.
  await expect(carousel(page).getByRole('link')).toHaveCount(10);
  await expect(carousel(page).getByRole('heading')).toHaveCount(0);
  await expect(carousel(page)).not.toContainText(/Book \d|Author \d|Huiiii|Schneller/);
  await expect(page.locator('.cheer, .spark')).toHaveCount(0);
  expect(await carousel(page).evaluate(element => parseFloat(getComputedStyle(element).perspective))).toBeGreaterThan(
    0
  );
  expect(await orbit(page).evaluate(element => getComputedStyle(element).transformStyle)).toBe('preserve-3d');
  const transforms = await carousel(page)
    .getByRole('link')
    .evaluateAll(links => links.map(link => getComputedStyle(link).transform));
  expect(new Set(transforms).size).toBe(10);
  const positions = await carousel(page)
    .getByRole('link')
    .evaluateAll(links =>
      links.map(link => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(link).transform);
        return { x: matrix.m41, y: matrix.m42, z: matrix.m43 };
      })
    );
  const radii = positions.map(position => Math.hypot(position.x, position.z));
  expect(Math.min(...radii)).toBeGreaterThan(0);
  for (const [index, radius] of radii.entries()) {
    expect(radius).toBeCloseTo(radii[0], 1);
    expect(positions[index].y).toBeCloseTo(positions[0].y, 1);
  }
  expect(new Set(positions.map(position => Math.round(position.z))).size).toBeGreaterThan(1);

  // Then there is no automatic rotation during normal operation.
  const before = await rotation(page);
  await page.clock.runFor(1000);
  expect(await rotation(page)).toBe(before);
});

test('AC4: Given keyboard focus in the normal carousel, when pressing left or right, then it rotates in the corresponding direction', async ({
  page
}) => {
  // Given the normal carousel has keyboard focus.
  await openCarousel(page);
  await carousel(page).focus();
  // When pressing right, then it rotates right; left reverses that rotation.
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => rotation(page)).toBe('-36deg');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => rotation(page)).toBe('0deg');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'View details for Book 1', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  const second = page.getByRole('link', { name: 'View details for Book 2', exact: true });
  await expect(second).toBeFocused();
  await expect.poll(() => rotation(page)).toBe('-36deg');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`${appUrl}/books/book-2`);
});

test('AC5: Given a visible cover, when clicking it, then its book details open', async ({ page }) => {
  // Given a visible book cover.
  await openCarousel(page);
  // When the user clicks it.
  await page.getByRole('link', { name: 'View details for Book 1', exact: true }).click();
  // Then the corresponding detail route and content appear.
  await expect(page).toHaveURL(`${appUrl}/books/book-1`);
  await expect(page.getByRole('article').getByRole('heading', { name: 'Book 1', exact: true })).toBeVisible();
});

test('AC3 (mouse): Given the normal carousel, when dragging a cover, then it rotates without opening details', async ({
  page
}) => {
  // Given the normal carousel and a visible cover.
  await openCarousel(page);
  // When the user drags the cover with the mouse.
  await dragCoverWithMouse(page);
  // Then the carousel rotates and the drag does not navigate.
  await expect.poll(() => rotation(page)).toBe('45deg');
  await expect(page).toHaveURL(`${appUrl}/`);
});

test('AC5 (after mouse drag): Given a completed drag, when clicking a cover, then its book details still open', async ({
  page
}) => {
  // Given a completed mouse drag.
  await openCarousel(page);
  const cover = await dragCoverWithMouse(page);
  await carousel(page).focus();
  await page.keyboard.press('Tab');
  // When clicking the cover after the gesture, then normal detail navigation works.
  await cover.click();
  await expect(page).toHaveURL(`${appUrl}/books/book-1`);
});

test('AC3 (touch pointer): Given the normal carousel, when dragging with a touch pointer, then it rotates and cancellation ends the gesture', async ({
  page
}) => {
  // Given the normal carousel.
  await openCarousel(page);
  // When a touch pointer drags and then cancels the gesture.
  // Synthetic PointerEvents cover touch handling consistently in all three engines.
  await carousel(page).evaluate(element => {
    const dispatch = (type: string, x: number) =>
      element.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 42,
          pointerType: 'touch',
          isPrimary: true,
          button: 0,
          clientX: x,
          clientY: 200
        })
      );
    // Synthetic pointers cannot acquire native pointer capture.
    element.setPointerCapture = () => {};
    dispatch('pointerdown', 100);
    dispatch('pointermove', 180);
    dispatch('pointercancel', 180);
    dispatch('pointermove', 240);
  });
  // Then only the drag before cancellation changes the rotation.
  await expect.poll(() => rotation(page)).toBe('36deg');
  await page.getByRole('button', { name: 'Rotate right', exact: true }).click();
  await expect.poll(() => rotation(page)).toBe('0deg');
  expect(await carousel(page).evaluate(element => getComputedStyle(element).touchAction)).toBe('pan-y');
});

for (const focus of ['view selector', 'carousel'] as const) {
  test(`AC6 (${focus}): Given an inactive party in the carousel view, when typing party, then it activates without dedicated controls`, async ({
    page
  }) => {
    // Given the carousel is open with focus at a normal interaction point.
    await openCarousel(page);
    if (focus === 'carousel') await carousel(page).focus();
    await expect(party(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /party/i })).toHaveCount(0);
    await expect(carousel(page).getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('textbox')).toHaveCount(1);

    // When typing the sequence without a dedicated input field.
    await page.keyboard.type('party');

    // Then party mode activates at either focus location.
    await expect(party(page)).toBeAttached();
  });
}

test('AC6 (search input): Given the carousel view, when typing party in search, then party activates despite loading', async ({
  page
}) => {
  // Given the carousel view with its existing search field.
  await openCarousel(page);
  // When typing party in that field, then the sequence is recognized there too.
  await page.getByRole('textbox', { name: 'Search for books', exact: true }).pressSequentially('party');
  await expect(carousel(page)).toBeVisible();
  await expect(party(page)).toBeAttached();
  await page.keyboard.press('Escape');
  await expect(party(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: '3D carousel', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('AC7: Given active party mode, when the carousel is displayed, then it rotates automatically with sparks and cheers below covers', async ({
  page
}) => {
  // Given an active party with the animation clock paused for layout assertions.
  await page.clock.install({ time: new Date('2026-11-10T12:00:00Z') });
  await openCarousel(page);
  await page.clock.pauseAt(new Date('2026-11-10T12:01:00Z'));
  await page.keyboard.type('party');
  // Advance the paused clock so Angular can render the keyboard-triggered state.
  await page.clock.runFor(100);
  await expect(party(page)).toBeAttached();

  // When displayed, then sparks and cheers replace visible book metadata.
  await expect(page.locator('.spark')).toHaveCount(28);
  await expect(page.locator('.spark').first()).toBeVisible();
  await expect(page.locator('.cheer')).toHaveCount(10);
  const cheer = page.locator('.cheer').first();
  await expect(cheer).toHaveText('Huiiii!');
  await expect(cheer).toBeVisible();
  await expect(carousel(page)).not.toContainText(/Book \d|Author \d/);
  const coverBox = (await carousel(page).locator('img').first().boundingBox())!;
  const cheerBox = (await cheer.boundingBox())!;
  expect(cheerBox.y).toBeGreaterThanOrEqual(coverBox.y + coverBox.height);

  // Then animation progresses without user rotation input.
  // The issue defines no numeric threshold for "fast"; do not invent one here.
  const before = await rotation(page);
  await page.clock.runFor(1000);
  expect(await rotation(page)).not.toBe(before);
  await expect(page.getByRole('button', { name: 'Rotate right', exact: true })).toBeDisabled();
});

test('AC8: Given active party mode, when pressing Escape, then effects stop and arrow keys and dragging work again', async ({
  page
}) => {
  // Given a party that is already rotating.
  await page.clock.install({ time: new Date('2026-11-10T12:00:00Z') });
  await openCarousel(page);
  await page.clock.pauseAt(new Date('2026-11-10T12:01:00Z'));
  await page.keyboard.type('party');
  await page.clock.runFor(100);
  await expect(party(page)).toBeAttached();
  const before = await rotation(page);
  await page.clock.runFor(1000);
  expect(await rotation(page)).not.toBe(before);

  // When the user presses Escape.
  await page.keyboard.press('Escape');
  await page.clock.runFor(100);

  // Then automatic motion and effects stop.
  await expect(party(page)).toHaveCount(0);
  await expect(page.locator('.spark, .cheer')).toHaveCount(0);
  const stopped = await rotation(page);
  await page.clock.runFor(1000);
  expect(await rotation(page)).toBe(stopped);

  // And normal keyboard and drag controls are usable again.
  await carousel(page).focus();
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(100);
  await expect.poll(() => rotation(page)).not.toBe(stopped);
  const afterArrow = await rotation(page);
  const stageBox = (await carousel(page).boundingBox())!;
  await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + 20);
  await page.mouse.down();
  await page.mouse.move(stageBox.x + stageBox.width / 2 + 80, stageBox.y + 20, { steps: 8 });
  await page.mouse.up();
  await page.clock.runFor(100);
  await expect.poll(() => rotation(page)).not.toBe(afterArrow);
  await expect(page).toHaveURL(`${appUrl}/`);
});

test('keeps accelerating during party, stops immediately, and starts a new party at its initial speed', async ({
  page
}) => {
  await page.clock.install({ time: new Date('2026-11-10T12:00:00Z') });
  await openCarousel(page);
  await page.clock.pauseAt(new Date('2026-11-10T12:01:00Z'));
  await page.keyboard.type('party');
  await page.clock.runFor(100);
  const sample = async () => {
    const start = parseFloat(await rotation(page));
    await page.clock.runFor(1000);
    return parseFloat(await rotation(page)) - start;
  };
  const first = await sample();
  const second = await sample();
  const third = await sample();
  expect(first).toBeGreaterThan(180);
  expect(second).toBeGreaterThan(first + 50);
  expect(third).toBeGreaterThan(second + 50);
  await page.keyboard.press('Escape');
  const stopped = await rotation(page);
  await page.clock.runFor(1000);
  expect(await rotation(page)).toBe(stopped);
  await page.keyboard.type('party');
  await page.clock.runFor(100);
  expect(await sample()).toBeLessThan(second);
  await page.clock.resume();
});

test('cleans up party and partial sequences on leaving the carousel or navigating to details', async ({ page }) => {
  await openCarousel(page);
  await page.keyboard.type('par');
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await page.getByRole('button', { name: '3D carousel', exact: true }).click();
  await page.keyboard.type('ty');
  await expect(party(page)).toHaveCount(0);
  await page.keyboard.type('party');
  await expect(party(page)).toBeAttached();
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await page.keyboard.type('party');
  await page.getByRole('button', { name: '3D carousel', exact: true }).click();
  await expect(party(page)).toHaveCount(0);
  await expect.poll(() => rotation(page)).toBe('0deg');
  await page.getByRole('link', { name: 'View details for Book 1', exact: true }).click();
  await page.keyboard.type('party');
  await page.getByRole('link', { name: 'Back to book collection', exact: true }).click();
  await page.getByRole('button', { name: '3D carousel', exact: true }).click();
  await expect(party(page)).toHaveCount(0);
});

test('reuses empty/error recovery and supplies missing and broken cover placeholders', async ({ page }) => {
  await page.route(/^http:\/\/localhost:4730\/books(?:\?|$)/, route => {
    const term = new URL(route.request().url()).searchParams.get('q');
    return route.fulfill({
      status: term === 'error' ? 500 : 200,
      json:
        term === 'error'
          ? {}
          : term === 'missing'
            ? []
            : [
                { ...books[0], cover: '' },
                { ...books[1], cover: `${appUrl}/broken.png` }
              ],
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  });
  await page.route(`${appUrl}/broken.png`, route => route.fulfill({ status: 404, body: '' }));
  await openCarousel(page);
  await expect(page.locator('.placeholder')).toHaveCount(2);
  await page.getByRole('textbox').fill('missing');
  await expect(page.getByText('No books match your search', { exact: true })).toBeVisible();
  await expect(carousel(page)).toHaveCount(0);
  await page.getByRole('textbox').fill('error');
  await expect(page.getByRole('alert')).toContainText('Could not load books');
  await expect(carousel(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(carousel(page)).toBeVisible();
});

test('fits a narrow viewport with one book and honors reduced motion for party effects', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route(/^http:\/\/localhost:4730\/books(?:\?|$)/, route =>
    route.fulfill({
      json: [books[0]],
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  );
  await openCarousel(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.type('party');
  await expect(party(page)).toBeAttached();
  expect(
    await page
      .locator('.spark')
      .first()
      .evaluate(element => getComputedStyle(element).animationName)
  ).toBe('none');
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'View details for Book 1', exact: true }).click();
  await expect(page).toHaveURL(`${appUrl}/books/book-1`);
});

test('renders the full carousel on desktop and a narrow viewport without page overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openCarousel(page);
  await expect
    .poll(() =>
      carousel(page)
        .locator('img')
        .evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))
    )
    .toBe(true);
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
  await page.keyboard.type('party');
  await expect(party(page)).toBeAttached();
  await page.screenshot({ path: testInfo.outputPath('party.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
});
