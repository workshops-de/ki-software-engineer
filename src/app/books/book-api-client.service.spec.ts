import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api-base-url';
import { BookApiClient } from './book-api-client.service';

describe('BookApiClient', () => {
  let client: BookApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test/v1/' }
      ]
    });
    client = TestBed.inject(BookApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the configured base, normalizes a trailing slash, and encodes IDs as one segment', () => {
    const id = 'book/with spaces?#';
    client.getBook(id).subscribe();
    const request = http.expectOne(`https://api.example.test/v1/books/${encodeURIComponent(id)}`);
    expect(request.request.method).toBe('GET');
    request.flush({ id });
  });

  it('defaults to ten books without a search parameter', () => {
    client.getBooks().subscribe();
    const request = http.expectOne('https://api.example.test/v1/books?_limit=10');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.has('q')).toBeFalse();
    request.flush([]);
  });

  it('passes a custom limit and search text without interpreting its characters', () => {
    const term = 'Angular & RxJS?';
    client.getBooks(25, term).subscribe();
    const request = http.expectOne(req => req.params.get('q') === term);
    expect(request.request.params.get('_limit')).toBe('25');
    request.flush([]);
  });

  it('preserves HTTP errors for feature-owned recovery', () => {
    let received: HttpErrorResponse | undefined;
    client.getBook('missing').subscribe({ error: (error: HttpErrorResponse) => (received = error) });
    http
      .expectOne('https://api.example.test/v1/books/missing')
      .flush('missing', { status: 404, statusText: 'Not Found' });
    expect(received?.status).toBe(404);
  });
});
