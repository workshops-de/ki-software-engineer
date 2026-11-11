# Book feature guidance

Applies to this feature, alongside [repository guidance](../../../AGENTS.md) and
[shared technical guidance](../../AGENTS.md). See [ARCHITECTURE.md](../../../ARCHITECTURE.md)
for the fuller data flow and limitations.

## Responsibilities and API contract

- [BookListComponent](./book-list.component.ts) owns requests, search, list/carousel selection, and
  party activation. [BookItemComponent](./book-item.component.ts) and
  [BookCarouselComponent](./book-carousel.component.ts) present inputs and link to details; neither makes API calls.
- [BookDetailsComponent](./book-details.component.ts) owns route-driven loading, retry, and cover
  fallback. Preserve direct navigation/reload without a previously loaded list.
- Keep HTTP in [BookApiClient](./book-api-client.service.ts): base URL `http://localhost:4730/books`,
  `getBooks(pageSize = 10, searchTerm?)` with `_limit`/optional `q` via `HttpParams`, and `getBook(id)`
  with URL-encoded IDs. Verify real search semantics against the API, not comments or mocks.
- Preserve the [Book contract](./book.ts): `price` is a string, `subtitle` is optional, and the description
  is `abstract`. Do not invent fields or assume runtime response validation.
- Preserve [routes](../app.routes.ts): `/`, `/books/:id`, and wildcard redirect to `/`, with
  keyboard-accessible cover/card and return links.

## Request and view invariants

- List search uses typed actions, a 300 ms delay for text changes, and `switchMap` before that delay
  to cancel superseded delays/requests immediately. Suppress repeated terms; clear loads the unfiltered
  list immediately, and retry must work for an unchanged term.
- List/details use discriminated request states and one `AsyncPipe` subscription. Handle errors inside
  the switched request so input, retry, and route changes stay usable. Keep loading, success/empty, and
  errors distinct; details additionally distinguish HTTP 404.
- Details hide empty additional fields, interpolate `abstract` as text, and provide placeholders for
  missing/broken covers. Keep cover-failure state separate and reset it per request.
- Keep the colocated external templates and request/retry logic in TypeScript. Search and view selection
  are local, not URL-persisted or restored after returning from details.

## Carousel invariants

- Reuse successful list results without refetching on view selection; share loading, empty, error,
  and retry views. Keep selection/party state in the list and animation/gesture state in the carousel.
- Recognize `party` while carousel view is selected, including focused search and temporary loading.
  Escape stops party mode; returning to list clears party and partial key sequences.
- Preserve continuous party acceleration, fresh-start speed, and reduced-motion behavior. Cancel animation
  frames and remove component-owned listeners on teardown, including replacement by loading/error views.
- Preserve keyboard rotation/focus navigation, mouse/touch dragging without accidental link activation,
  vertical touch scrolling, cover placeholders, and narrow layouts. Keep specialized 3D/animation styling
  in [carousel CSS](./book-carousel.component.css).

## Feature validation

Extend affected mocked browser scenarios using role-based locators:

- [Details](../../../tests/book-details.spec.ts): navigation/reload, request states/retry, optional fields,
  plain text, covers, narrow layouts, and route-change cancellation.
- [List](../../../tests/book-list.spec.ts): debounce/cancellation, clear, cleanup, error versus empty, and recovery.
- [Carousel](../../../tests/book-carousel.spec.ts): view switching, pointer/keyboard interaction, navigation,
  party activation/acceleration/cleanup, placeholders, and responsive/reduced-motion behavior.
- [Global errors](../../../tests/global-errors.spec.ts): reporting, deduplication, and local recovery without duplicate toasts.

Use the build and selected browser specs from [root guidance](../../../AGENTS.md#commands-and-validation).
Tests inherit root guidance, not this directory's. Mocked responses do not verify real search semantics;
synthetic touch PointerEvents do not verify physical devices.
