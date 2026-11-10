import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../api-base-url';
import { Book } from './book';
import { BookListComponent } from './book-list.component';

// Issue #2: exercise the existing component/HTTP boundary without prescribing a new paging method.
describe('BookListComponent — issue #2 paging', () => {
  let fixture: ComponentFixture<BookListComponent>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const api = 'https://api.example.test/books';
  const books: Book[] = Array.from({ length: 23 }, (_, i) => ({
    id: `paging-${i + 1}`,
    title: `Paging book ${i + 1}`,
    author: 'Example Author',
    isbn: `978000000${String(i + 1).padStart(4, '0')}`,
    publisher: 'Example Press',
    numPages: 100,
    price: '10 credits',
    cover: '',
    abstract: 'Paging fixture.',
    userId: 1
  }));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BookListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BookListComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  function request(page: number, term = ''): TestRequest {
    const pending = http.expectOne(req => req.url === api);
    expect(pending.request.method).toBe('GET');
    expect(pending.request.params.get('_limit')).toBe('10');
    // Omitting _page is the API's first-page default, so existing first-page callers remain valid.
    expect(pending.request.params.get('_page') ?? '1').toBe(String(page));
    expect(pending.request.params.get('q') ?? '').toBe(term);
    return pending;
  }

  function respond(pending: TestRequest, page: number, total = 23): void {
    pending.flush(books.slice((page - 1) * 10, Math.min(page * 10, total)), {
      headers: { 'X-Total-Count': String(total) }
    });
    fixture.detectChanges();
  }

  function control(name: RegExp): HTMLElement | undefined {
    return Array.from(element.querySelectorAll<HTMLElement>('button, a')).find(node =>
      name.test(node.getAttribute('aria-label') ?? node.textContent?.trim() ?? '')
    );
  }

  function click(name: RegExp): boolean {
    const target = control(name);
    expect(target).withContext(`Missing paging control ${name}`).toBeDefined();
    if (!target) return false;
    target.click();
    fixture.detectChanges();
    return true;
  }

  it('AK1: initially renders the first ten unfiltered books', () => {
    respond(request(1), 1);
    expect(element.querySelectorAll('app-book-item').length).toBe(10);
    expect(element.textContent).toContain(books[0].title);
    expect(element.textContent).not.toContain(books[10].title);
  });

  it('AK2/AK3: numbers and next/previous request distinct pages and respect both boundaries', () => {
    respond(request(1), 1);
    const previous = control(/^(Previous|Back|Zurück)$/i);
    expect(previous).withContext('First page needs a disabled previous control').toBeDefined();
    if (!previous) return;
    expect(previous.matches(':disabled, [aria-disabled="true"]')).toBeTrue();
    if (!click(/^(?:Page |Seite )?2$/i)) return;
    respond(request(2), 2);
    expect(element.querySelector('[aria-current="page"]')?.textContent).toMatch(/2/);
    expect(element.textContent).toContain(books[10].title);
    if (!click(/^(Next|Weiter)$/i)) return;
    respond(request(3), 3);
    expect(element.querySelectorAll('app-book-item').length).toBe(3);
    expect(control(/^(Next|Weiter)$/i)?.matches(':disabled, [aria-disabled="true"]')).toBeTrue();
    if (!click(/^(Previous|Back|Zurück)$/i)) return;
    respond(request(2), 2);
    expect(element.querySelectorAll('app-book-item').length).toBe(10);
  });

  for (const total of [0, 10]) {
    it(`AK4: ${total} results expose no enabled page-changing controls`, () => {
      respond(request(1), 1, total);
      const navigation = Array.from(element.querySelectorAll<HTMLElement>('button, a')).filter(node =>
        /^(Previous|Back|Zurück|Next|Weiter|(?:Page |Seite )?\d+)$/i.test(
          node.getAttribute('aria-label') ?? node.textContent?.trim() ?? ''
        )
      );
      expect(
        navigation.filter(node => !node.matches(':disabled, [aria-disabled="true"], [aria-current="page"]'))
      ).toEqual([]);
      expect(element.querySelectorAll('app-book-item').length).toBe(total);
      expect(element.querySelector('[role="alert"]')).toBeNull();
      if (total === 0) expect(element.textContent).toContain('No books available');
    });
  }

  it('AK5/AK7: changing search on page two resets to page one after the existing debounce', fakeAsync(() => {
    respond(request(1), 1);
    if (!click(/^(Next|Weiter)$/i)) return;
    respond(request(2), 2);
    fixture.componentInstance.onSearchChange('Angular & RxJS');
    fixture.detectChanges();
    tick(299);
    http.expectNone(req => req.url === api);
    tick(1);
    respond(request(1, 'Angular & RxJS'), 1, 13);
    expect(element.querySelector('[aria-current="page"]')?.textContent).toMatch(/1/);
    if (!click(/^(Next|Weiter)$/i)) return;
    respond(request(2, 'Angular & RxJS'), 2, 13);
    fixture.componentInstance.clearSearch();
    fixture.detectChanges();
    respond(request(1), 1);
    tick(300);
    http.expectNone(req => req.url === api);
  }));

  it('AK7: a new search cancels an obsolete page request before its debounce expires', fakeAsync(() => {
    respond(request(1), 1);
    if (!click(/^(Next|Weiter)$/i)) return;
    const obsolete = request(2);
    fixture.componentInstance.onSearchChange('latest');
    fixture.detectChanges();
    expect(obsolete.cancelled).toBeTrue();
    expect(element.querySelector('[role="status"]')).not.toBeNull();
    tick(299);
    http.expectNone(req => req.url === api);
    tick(1);
    respond(request(1, 'latest'), 1, 13);
    expect(element.querySelector('[role="alert"]')).toBeNull();
  }));

  it('AK8: page-two failure stays distinct from empty results and retry preserves page and search', fakeAsync(() => {
    respond(request(1), 1);
    fixture.componentInstance.onSearchChange('Angular');
    fixture.detectChanges();
    tick(300);
    respond(request(1, 'Angular'), 1, 13);
    if (!click(/^(Next|Weiter)$/i)) return;
    const failed = request(2, 'Angular');
    expect(element.querySelector('[role="status"]')).not.toBeNull();
    failed.flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Unable to load books');
    expect(element.textContent).not.toContain('No books match your search');
    fixture.componentInstance.retry();
    fixture.detectChanges();
    respond(request(2, 'Angular'), 2, 13);
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelectorAll('app-book-item').length).toBe(3);
  }));
});
