# Refactoring status

Source review: 2026-11-10. The four findings from the original review on 2026-11-09
(baseline `f673fcb`) are addressed in the inspected implementation. Superseded code descriptions
and proposals remain in Git history; this summary is not a new exhaustive audit.
See [ARCHITECTURE.md](./ARCHITECTURE.md) for the application structure.

## Implemented findings

- **Search and lifecycle:** [BookListComponent](./src/app/books/book-list.component.ts) uses typed
  actions, a 300 ms text delay, immediate cancellation of superseded delays/requests, immediate
  clear/retry, and `AsyncPipe` cleanup. Retry remains independent of search-term deduplication.
- **Local request errors:** list and [details](./src/app/books/book-details.component.ts) expose
  mutually exclusive loading/success/error states; details distinguish 404. Empty results are success,
  failures remove earlier cards, and inner-stream error handling keeps later actions usable.
- **Logic and templates:** request state uses discriminated unions. List, detail, and card templates
  are colocated HTML with built-in control flow. Transport remains in
  [BookApiClient](./src/app/books/book-api-client.service.ts); presentation components make no API calls.
- **Shared error handling:** [app.config.ts](./src/app/app.config.ts) registers browser listeners,
  [GlobalErrorHandler](./src/app/shared/global-error-handler.ts), and an
  [HTTP interceptor](./src/app/shared/http-error.interceptor.ts). The interceptor reports network/5xx
  failures and rethrows without retry or toast; expected failures retain local feedback.
  [ErrorReporter](./src/app/shared/error-reporter.service.ts) logs to the browser console and deduplicates
  object errors by identity; the handler independently deduplicates generic notifications.
  HTTP context includes method, `request.url`, and status; logging the original error is not query redaction.

## Current context and limits

- The later [carousel](./src/app/books/book-carousel.component.ts) reuses the list's successful results.
  The list owns view selection/party activation; the carousel owns gestures and animation cleanup.
  Include [carousel regressions](./tests/book-carousel.spec.ts) when affected.
- State remains component-local, the API endpoint is fixed, response types have no runtime validation,
  and diagnostics have no remote destination. These are existing boundaries, not newly proposed work.
- Mocked browser tests do not establish real-API compatibility/search semantics or physical touch behavior.

## Validation and maintenance

- This documentation refresh inspected current source, configuration, and test definitions; it did not
  rerun the application build or browser tests.
- The 2026-11-09 refactoring review recorded a passing production build and 90 browser cases
  (10 detail, 14 list, and 6 global-error scenarios across three browsers). Those historical results
  predate carousel coverage and are not a green baseline for today's tree.
- Use current commands and test selection from [repository guidance](./AGENTS.md#commands-and-validation).
  Keep implementation conventions in [shared guidance](./src/AGENTS.md) and
  [book guidance](./src/app/books/AGENTS.md), rather than duplicating them here.
