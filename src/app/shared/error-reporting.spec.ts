import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppErrorHandler, httpErrorInterceptor, reportError } from './error-reporting';

describe('Error reporting', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let log: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([httpErrorInterceptor])), provideHttpClientTesting()]
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    log = spyOn(console, 'error');
  });

  afterEach(() => http.verify());

  it('reports a failed request once without logging URLs or payloads and preserves the original error', () => {
    let received: HttpErrorResponse | undefined;
    const payload = { details: 'server-specific diagnostics' };
    client
      .get('/books/private-id?q=private-query')
      .subscribe({ error: (error: HttpErrorResponse) => (received = error) });
    http.expectOne('/books/private-id?q=private-query').flush(payload, { status: 503, statusText: 'Unavailable' });
    expect(log).toHaveBeenCalledOnceWith('[BookMonkey]', { source: 'http', method: 'GET', status: 503 });
    expect(received?.status).toBe(503);
    expect(received?.error).toBe(payload);
  });

  it('reports network failures while retaining their error channel', () => {
    let received: HttpErrorResponse | undefined;
    client.get('/books').subscribe({ error: (error: HttpErrorResponse) => (received = error) });
    http.expectOne('/books').error(new ProgressEvent('error'));
    expect(received?.status).toBe(0);
    expect(log).toHaveBeenCalledOnceWith('[BookMonkey]', { source: 'http', method: 'GET', status: 0 });
  });

  it('leaves expected 404 handling to the feature without a duplicate diagnostic', () => {
    let received: HttpErrorResponse | undefined;
    client.get('/books/missing').subscribe({ error: (error: HttpErrorResponse) => (received = error) });
    http.expectOne('/books/missing').flush({}, { status: 404, statusText: 'Not Found' });
    expect(received?.status).toBe(404);
    expect(log).not.toHaveBeenCalled();
  });

  it('does not report successful or canceled requests', () => {
    client.get('/books').subscribe();
    http.expectOne('/books').flush([]);
    const subscription = client.get('/books/slow').subscribe();
    const request = http.expectOne('/books/slow');
    subscription.unsubscribe();
    expect(request.cancelled).toBeTrue();
    expect(log).not.toHaveBeenCalled();
  });

  it('reports an unexpected runtime error with its original diagnostic information', () => {
    const error = new Error('Unexpected failure');
    new AppErrorHandler().handleError(error);
    expect(log).toHaveBeenCalledOnceWith('[BookMonkey]', { source: 'runtime', error });
  });

  it('reports bootstrap failures before dependency injection is available', () => {
    const error = new Error('Bootstrap failed');
    reportError({ source: 'bootstrap', error });
    expect(log).toHaveBeenCalledOnceWith('[BookMonkey]', { source: 'bootstrap', error });
  });
});
