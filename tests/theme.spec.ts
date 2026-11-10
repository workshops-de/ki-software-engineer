import { expect, test, Locator, Page } from '@playwright/test';
import { api, book, setup } from './support/books';

const storageKey = 'bookmonkey-theme';
const picker = (page: Page) => page.getByRole('combobox', { name: 'Farbschema' });

async function expectTheme(page: Page, theme: 'light' | 'dark') {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('html')).toHaveCSS('color-scheme', theme);
}

// Resolve CSS colors through canvas, including Tailwind's OKLCH and Material's light-dark().
async function expectSurface(locator: Locator, dark: boolean) {
  await expect(locator).toBeVisible();
  await expect
    .poll(() =>
      locator.evaluate((element, isDark) => {
        const context = document.createElement('canvas').getContext('2d')!;
        const style = getComputedStyle(element);
        const brightness = (color: string) => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
          return { value: (r + g + b) / 3, alpha: a };
        };
        const background = brightness(style.backgroundColor);
        const text = brightness(style.color);
        return (
          background.alpha === 255 &&
          (isDark ? background.value < 100 && text.value > 150 : background.value > 200 && text.value < 150)
        );
      }, dark)
    )
    .toBe(true);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`defaults to system and follows live changes from ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await setup(page);
    await expect(picker(page)).toHaveValue('system');
    await expectTheme(page, scheme);
    await page.getByRole('button', { name: `Details for ${book.title}` }).click();
    await expectSurface(page.locator('.mat-mdc-dialog-surface'), scheme === 'dark');
    const other = scheme === 'dark' ? 'light' : 'dark';
    await page.emulateMedia({ colorScheme: other });
    await expectTheme(page, other);
    await expectSurface(page.locator('body'), other === 'dark');
    await expectSurface(page.locator('.mat-mdc-dialog-surface'), other === 'dark');
  });
}

for (const preference of ['light', 'dark', 'system']) {
  test(`restores the saved ${preference} preference`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await setup(page);
    await picker(page).selectOption(preference);
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(preference);
    await page.reload();
    await expect(picker(page)).toHaveValue(preference);
    await expectTheme(page, preference === 'light' ? 'light' : 'dark');
  });
}

test('manual choices survive system changes and System resumes following them', async ({ page }) => {
  await setup(page);
  for (const preference of ['light', 'dark'] as const) {
    await picker(page).selectOption(preference);
    for (const colorScheme of ['dark', 'light'] as const) {
      await page.emulateMedia({ colorScheme });
      await expectTheme(page, preference);
    }
  }
  await picker(page).selectOption('system');
  await expectTheme(page, 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectTheme(page, 'dark');
});

test('all options are labelled, keyboard accessible and visibly focused', async ({ page }) => {
  await setup(page);
  await picker(page).focus();
  await picker(page).press('Home');
  await picker(page).press('Enter');
  await expect(picker(page)).toHaveValue('system');
  for (const value of ['light', 'dark']) {
    await picker(page).press('ArrowDown');
    await picker(page).press('Enter');
    await expect(picker(page)).toHaveValue(value);
    await expectTheme(page, value as 'light' | 'dark');
    await expect(picker(page)).toBeFocused();
    await expect(picker(page)).toHaveCSS('outline-style', 'solid');
    await expect(picker(page)).toHaveCSS('outline-width', '2px');
  }
});

for (const blocked of ['read', 'write']) {
  test(`keeps working when storage ${blocked} is blocked`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(mode => {
      Object.defineProperty(Storage.prototype, mode === 'read' ? 'getItem' : 'setItem', {
        value() {
          throw new DOMException('Storage blocked', 'SecurityError');
        }
      });
    }, blocked);
    await page.emulateMedia({ colorScheme: 'light' });
    await setup(page);
    for (const value of ['dark', 'light', 'system']) {
      await picker(page).selectOption(value);
      await expect(picker(page)).toHaveValue(value);
      await expectTheme(page, value === 'dark' ? 'dark' : 'light');
    }
    await page.emulateMedia({ colorScheme: 'dark' });
    await expectTheme(page, 'dark');
    await page.getByRole('button', { name: `Details for ${book.title}` }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('ignores an invalid stored preference', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, 'invalid'), storageKey);
  await page.emulateMedia({ colorScheme: 'dark' });
  await setup(page);
  await expect(picker(page)).toHaveValue('system');
  await expectTheme(page, 'dark');
});

for (const scheme of ['light', 'dark'] as const) {
  test(`themes mobile cards, search, dialogs, validation and toast in ${scheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await setup(page);
    await picker(page).selectOption(scheme);
    const dark = scheme === 'dark';
    await expectSurface(page.locator('body'), dark);
    await expectSurface(page.locator('header'), dark);
    await expectSurface(page.locator('footer'), dark);
    await expectSurface(picker(page), dark);
    await expectSurface(page.locator('app-book-item > div'), dark);
    await expect(page.getByRole('textbox', { name: 'Search for books' })).toBeVisible();
    await page.getByRole('button', { name: `Details for ${book.title}` }).click();
    const dialog = page.getByRole('dialog');
    await expectSurface(page.locator('.mat-mdc-dialog-surface'), dark);
    await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
    await dialog.getByLabel('Title', { exact: true }).fill('');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog.getByText('Title is required.')).toBeVisible();
    await dialog.getByLabel('Title', { exact: true }).fill('Updated title');
    await page.route(`${api}/${book.isbn}`, route => route.fulfill({ json: { ...book, title: 'Updated title' } }));
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Book updated successfully.')).toBeVisible();
    await expectSurface(page.locator('.mdc-snackbar__surface'), dark);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`themes loading, empty and error states in ${scheme}`, async ({ page }) => {
    await setup(page);
    await picker(page).selectOption(scheme);
    let release!: () => void;
    const pending = new Promise<void>(resolve => (release = resolve));
    await page.route(`${api}*`, async route => {
      await pending;
      await route.fulfill({ json: [] });
    });
    await page.getByRole('textbox', { name: 'Search for books' }).fill('missing');
    await expect(page.getByText('Loading books...', { exact: true })).toBeVisible();
    await expectSurface(page.locator('body'), scheme === 'dark');
    release();
    await expect(page.getByText('No books match your search', { exact: true })).toBeVisible();
    await expectSurface(page.locator('.col-span-full'), scheme === 'dark');
    await page.route(`${api}*`, route => route.fulfill({ status: 500, json: {} }));
    await page.getByRole('button', { name: 'Clear Search', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Could not load books.');
    await expectTheme(page, scheme);
  });
}
