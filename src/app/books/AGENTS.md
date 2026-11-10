# Book feature guidance

Applies to this folder and descendants, alongside [root](../../../AGENTS.md) and [src](../../AGENTS.md) instructions.
Read the catalog and book-details flows in [ARCHITECTURE.md](../../../ARCHITECTURE.md) for implementation context.

## Responsibilities and API contract

- `BookListComponent` owns catalog loading and search; `BookItemComponent` renders one input book and links to details.
  `BookDetailComponent` owns route-driven detail state. Keep HTTP calls in `BookApiClient` and shared book fields in
  the `Book` interface.
- `API_BASE_URL` is provided in `app.config.ts`, defaulting to `http://localhost:4730`; the API client appends `/books`.
  Catalog requests use `_limit` (default 10), optional `q` for server-side search, and `_page` after page one.
  `getBooksPage()` reads the exposed `X-Total-Count` header for navigation; `getBooks()` retains its array-returning
  first-page contract. Preserve these parameters when changing request handling.
- Fetch details independently through `getBook(id)`, encoding the ID as one URL path segment with `encodeURIComponent`.
  Direct visits and refreshes must work without previously loading the catalog.
- The routes are `/` for the catalog and `/books/:id` for details, with an application wildcard redirect to the catalog.
  Use Angular router links for navigation; keep “Back to books” available in every detail state.

## Behavior to preserve

- Details distinguish loading, success, HTTP 404 (not found), and other errors (with retry). Clear stale details when a
  new request starts. Route ID changes and retries must cancel obsolete requests, and errors must not terminate the
  stream needed for subsequent navigation or retries. Keep subscriptions bound to component lifetime.
- `BookCoverComponent` owns missing/failed cover fallback and resets failure state on input changes. Detail loading
  destroys the old cover view so a new request can retry the same cover URL. Handle absent
  subtitles without empty placeholders.
- Display title, author, ISBN, publisher, page count, price, and abstract. Preserve the API price string. Render abstracts
  as plain text with paragraph breaks; do not interpret embedded markup or expose `userId` in the detail view.
- Preserve keyboard-operable title links, focus indicators, loading status, error alerts, and mobile layouts.
- Catalog requests use one intent stream and one `AsyncPipe` subscription. New input cancels the previous debounce and
  HTTP request immediately. Nonempty input waits 300 ms; initial load, clear (including deleting all text), and retry
  load immediately. Preserve explicit loading/success/error states and request-local error recovery. Cover typing,
  clearing during debounce, obsolete responses, recovery after failure, and navigation cleanup when changing this flow.
- `BookCatalogSelection` retains only page and search in memory across route navigation. Returning from details
  fetches that selection anew; a full reload starts unfiltered on page one. Do not persist it in storage or the URL.
  New/cleared searches reset the page; retry preserves page and term. Hide navigation for zero or one result page.

## Regression coverage

Use [tests/book-details.spec.ts](../../../tests/book-details.spec.ts) as the application browser-test reference.
It intercepts API, cover-image, and font responses for deterministic checks. Extend relevant coverage for changed
behavior, including direct navigation, retry/error recovery, route-change cancellation, ID encoding, and cover fallback
where affected. Keep catalog-specific scenarios focused on controlled responses rather than external-site examples.
Run the focused Chromium command documented in the root guidance and the production build for feature changes.
Catalog coverage lives in [tests/book-catalog.spec.ts](../../../tests/book-catalog.spec.ts). Run both files with
`npx playwright test tests/book-catalog.spec.ts tests/book-details.spec.ts --project=chromium --reporter=line`.
