import { Page } from '@playwright/test';
import { Book } from '../../src/app/books/book';

export const appUrl = 'http://localhost:4200';
export const apiUrl = 'http://localhost:4730/books';

export async function mockBookApp(page: Page, book: Book): Promise<void> {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://covers.example.test/**', route =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#dbeafe"/></svg>'
    })
  );
  await page.route(`${apiUrl}?*`, route => route.fulfill({ json: [book] }));
  await page.route(`${apiUrl}/*`, route => route.fulfill({ json: book }));
}

/** Same-document navigation exercises Angular's reuse of a routed component. */
export async function navigateToBook(page: Page, id: string): Promise<void> {
  await page.evaluate(id => {
    history.pushState(null, '', `/books/${encodeURIComponent(id)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, id);
}
