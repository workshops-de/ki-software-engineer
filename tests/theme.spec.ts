import { expect, test, Locator, Page } from '@playwright/test';
import { api, book, expectBookRequest, setup } from './support/books';

type Scheme = 'light' | 'dark';
type Preference = 'system' | Scheme;
const modes: Preference[] = ['system', 'light', 'dark'];
const names = { system: 'System', light: 'Hell', dark: 'Dunkel' };
const picker = (page: Page) => page.getByRole('button', { name: /^Farbschema:/ });

async function expectPreference(page: Page, mode: Preference) {
  const label = new RegExp(`^Farbschema: ${names[mode]}\\.`);
  await expect(picker(page)).toHaveAccessibleName(label);
  await expect(picker(page)).toHaveAttribute('title', label);
}

async function chooseTheme(page: Page, target: Preference) {
  for (let step = 0; step < 3; step++) {
    const label = await picker(page).getAttribute('aria-label');
    const current = modes.findIndex(mode => label?.startsWith(`Farbschema: ${names[mode]}.`));
    expect(current).toBeGreaterThanOrEqual(0);
    const next = modes[(current + 1) % modes.length];
    await picker(page).click();
    await expectPreference(page, next);
    if (next === target) return;
  }
  throw new Error(`Could not select ${target}`);
}

// Resolve actual rendered colors, including Tailwind OKLCH and Material light-dark().
async function expectSurface(locator: Locator, scheme: Scheme) {
  await expect(locator).toBeVisible();
  await expect
    .poll(() =>
      locator.evaluate((element, dark) => {
        const context = document.createElement('canvas').getContext('2d')!;
        context.fillStyle = getComputedStyle(element).backgroundColor;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
        return alpha === 255 && (dark ? (r + g + b) / 3 < 128 : (r + g + b) / 3 > 128);
      }, scheme === 'dark')
    )
    .toBe(true);
}

async function expectTheme(page: Page, scheme: Scheme) {
  await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
  await expect(page.locator('html')).toHaveCSS('color-scheme', scheme);
}

async function expectShell(page: Page, scheme: Scheme) {
  await expectTheme(page, scheme);
  for (const selector of ['body', 'header', 'footer', 'app-book-item > div']) {
    await expectSurface(page.locator(selector), scheme);
  }
  await expect(page.getByRole('textbox', { name: 'Search for books' })).toBeVisible();
}

test.describe('Issue #1: theme selection', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`AK-1: defaults to System on a ${scheme} device`, async ({ page }) => {
      // Given no saved preference and a system scheme.
      await page.emulateMedia({ colorScheme: scheme });
      // When the application opens.
      await setup(page);
      // Then System and its actual colors apply.
      await expectPreference(page, 'system');
      await expectShell(page, scheme);
    });

    test(`AK-2: manual ${scheme} themes mobile surfaces, editor and toast`, async ({ page }) => {
      // Given a mobile viewport and the opposite system scheme.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ colorScheme: scheme === 'dark' ? 'light' : 'dark' });
      await setup(page);
      // When a manual preference is selected.
      await chooseTheme(page, scheme);
      // Then all surfaces, editor and resulting toast follow it.
      await expectShell(page, scheme);
      await page.getByRole('button', { name: `Details for ${book.title}` }).click();
      const dialog = page.getByRole('dialog');
      await expectSurface(page.locator('.mat-mdc-dialog-surface'), scheme);
      await dialog.getByRole('button', { name: 'Edit', exact: true }).click();
      await expectSurface(page.locator('.mat-mdc-dialog-surface'), scheme);
      await dialog.getByLabel('Title', { exact: true }).fill('');
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(dialog.getByText('Title is required.')).toBeVisible();
      await dialog.getByLabel('Title', { exact: true }).fill('Updated title');
      await page.route(`${api}/${book.isbn}`, async route => {
        expectBookRequest(route, ['PUT']);
        expect(route.request().postDataJSON()).toMatchObject({ ...book, title: 'Updated title' });
        await route.fulfill({ json: { ...book, title: 'Updated title' } });
      });
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByText('Book updated successfully.')).toBeVisible();
      await expectSurface(page.locator('.mdc-snackbar__surface'), scheme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    for (const state of ['loading', 'empty', 'error'] as const) {
      test(`AK-2-${state}: ${state} follows ${scheme}`, async ({ page }) => {
        // Given a selected theme and controlled responses.
        await setup(page);
        await chooseTheme(page, scheme);
        let release!: () => void;
        const pending = new Promise<void>(resolve => (release = resolve));
        await page.route(`${api}*`, async route => {
          if (state === 'loading') await pending;
          await route.fulfill({ status: state === 'error' ? 500 : 200, json: state === 'error' ? {} : [] });
        });
        try {
          // When a search produces the requested state.
          await page.getByRole('textbox', { name: 'Search for books' }).fill('missing');
          // Then the state is visible in the selected scheme.
          if (state === 'loading') await expect(page.getByText('Loading books...', { exact: true })).toBeVisible();
          if (state === 'empty') {
            await expect(page.getByText('No books match your search', { exact: true })).toBeVisible();
            await expectSurface(page.locator('.col-span-full'), scheme);
          }
          if (state === 'error') {
            await expect(page.getByRole('alert')).toContainText('Could not load books.');
            await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
          }
          await expectTheme(page, scheme);
          await expectSurface(page.locator('body'), scheme);
        } finally {
          release();
        }
      });
    }

    test(`AK-4: returns from ${scheme} to current system scheme`, async ({ page }) => {
      // Given manual selection and a changed device preference.
      await setup(page);
      await chooseTheme(page, scheme);
      const system = scheme === 'light' ? 'dark' : 'light';
      await page.emulateMedia({ colorScheme: system });
      // When returning to System.
      await chooseTheme(page, 'system');
      // Then the current device preference applies.
      await expectPreference(page, 'system');
      await expectShell(page, system);
    });

    test(`AK-6: System follows changes from ${scheme} and back`, async ({ page }) => {
      // Given System is active.
      await page.emulateMedia({ colorScheme: scheme });
      await setup(page);
      // When the device changes in either direction, then all surfaces follow.
      for (const changed of [scheme === 'dark' ? 'light' : 'dark', scheme] as const) {
        await page.emulateMedia({ colorScheme: changed });
        await expectShell(page, changed);
        await expectPreference(page, 'system');
      }
    });

    test(`AK-7: manual ${scheme} survives system changes`, async ({ page }) => {
      // Given manual selection.
      await setup(page);
      await chooseTheme(page, scheme);
      // When the device changes, then the manual preference stays active.
      for (const changed of ['dark', 'light'] as const) {
        await page.emulateMedia({ colorScheme: changed });
        await expectPreference(page, scheme);
        await expectShell(page, scheme);
      }
    });
  }

  for (const preference of modes) {
    test(`AK-3: restores saved ${preference}`, async ({ page }) => {
      // Given a preference selected and stored through the UI.
      await page.emulateMedia({ colorScheme: 'dark' });
      await setup(page);
      await chooseTheme(page, preference);
      expect(await page.evaluate(() => localStorage.getItem('bookmonkey-theme'))).toBe(preference);
      // When revisiting with a different system scheme.
      await page.emulateMedia({ colorScheme: 'light' });
      await page.reload();
      // Then the selection persists; System resolves to the current device.
      await expectPreference(page, preference);
      await expectShell(page, preference === 'dark' ? 'dark' : 'light');
    });

    test(`AK-5: keyboard reaches all options starting from ${preference}`, async ({ page }) => {
      // Given any selected mode and focus reached with keyboard navigation.
      await setup(page);
      await chooseTheme(page, preference);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(picker(page)).toBeFocused();
      // When keyboard activation visits every option.
      const initial = modes.indexOf(preference);
      for (let step = 1; step <= modes.length; step++) {
        await page.keyboard.press(step % 2 ? 'Enter' : 'Space');
        // Then selection is labelled and keyboard focus is visible.
        await expectPreference(page, modes[(initial + step) % modes.length]);
        await expect(picker(page)).toBeFocused();
        await expect(picker(page)).toHaveCSS('outline-style', 'solid');
        await expect(picker(page)).toHaveCSS('outline-width', '2px');
        await expect(picker(page)).not.toHaveCSS('outline-color', 'rgba(0, 0, 0, 0)');
      }
    });

    for (const blocked of ['write', 'read-and-write'] as const) {
      test(`AK-8: ${preference} works with blocked storage ${blocked}`, async ({ page }) => {
        // Given browser storage rejects writes, optionally also reads.
        await page.emulateMedia({ colorScheme: 'dark' });
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(blockReads => {
          const deny = () => {
            throw new DOMException('Storage blocked', 'SecurityError');
          };
          Object.defineProperty(Storage.prototype, 'setItem', { value: deny });
          if (blockReads) Object.defineProperty(Storage.prototype, 'getItem', { value: deny });
        }, blocked === 'read-and-write');
        await setup(page);
        // When selecting any preference.
        await chooseTheme(page, preference);
        // Then session selection works and the application remains usable.
        await expectPreference(page, preference);
        await expectShell(page, preference === 'light' ? 'light' : 'dark');
        await page.getByRole('textbox', { name: 'Search for books' }).fill('Angular');
        await expect(page.getByRole('heading', { name: book.title, exact: true })).toBeVisible();
        expect(errors).toEqual([]);
      });
    }
  }
});
