# Book feature guidance

Applies to this feature, alongside [repository guidance](../../../AGENTS.md) and
[shared technical guidance](../../AGENTS.md). See [ARCHITECTURE.md](../../../ARCHITECTURE.md)
for the fuller data flow and limitations.

## Responsibilities and API contract

- [BookListComponent](./book-list.component.ts) owns list, loading, and search state.
  [BookItemComponent](./book-item.component.ts) presents a `Book` input and links to its details;
  keep API requests out of the card.
- [BookDetailsComponent](./book-details.component.ts) owns route-driven detail loading, error/retry
  behavior, and cover fallback. Preserve direct navigation and reload support without relying on
  a previously loaded list.
- Keep HTTP operations in [BookApiClient](./book-api-client.service.ts) and the shared data contract
  in [book.ts](./book.ts). The current base URL is `http://localhost:4730/books`.
- Preserve `getBooks(pageSize = 10, searchTerm?)` using `_limit` and optional `q` via `HttpParams`,
  and `getBook(id)` using a URL-encoded ID. Do not infer real search semantics from the query name
  or source comments; verify against the API when changing search behavior.
- `Book.price` is a string, `subtitle` is optional, and the description is `abstract`. Do not invent
  fields such as genre or publication date, or assume runtime response validation exists.
- Routes are registered in [app.routes.ts](../app.routes.ts): `/` for the list and `/books/:id` for
  details, with a wildcard redirect to the list. Preserve keyboard-accessible card and return links.

## State and edge cases

- Details use route parameters plus a retry trigger with `switchMap` and `AsyncPipe`. Keep cancellation
  of superseded requests and handle request errors inside the inner stream so retries and later
  route changes remain usable.
- Preserve distinct loading, success, HTTP 404, and other request-error states; offer retry for
  request failures. Hide empty additional fields, render `abstract` as plain text, and show a
  placeholder for missing or broken covers. Reset cover failure state for each request.
- The list currently uses a 300 ms timeout debounce and direct subscriptions. It has no explicit
  request cancellation, destruction cleanup, or separate error view. Pending timers and stale
  responses are known source-derived risks, not verified runtime failures. When changing this flow,
  account for clearing search, rapid input, overlapping requests, and leaving the view.
- Do not assume list search is persisted in the URL or restored after returning from details.

## Preferred improvements when touching this feature

These patterns are recommendations, not descriptions of completed refactors.

- When reworking list search, replace the manual timer and independent requests with one typed
  search/reload stream. Debounce text changes by 300 ms, suppress repeated search terms, and use
  `switchMap` for request cancellation. Clear search should cancel pending input and immediately
  request the unfiltered list; an explicit retry must still work for an unchanged search term.
- Keep request error handling inside the switched request so later input and retries still work.
  Represent list failures explicitly rather than showing the successful-empty message or relying
  on console output. Follow the shared error-handling guidance for reporting and notification ownership.
- When refactoring state, use a discriminated union for mutually exclusive request states and let
  the template select the corresponding view. Keep local cover-failure state separate and reset it
  when loading another book.
- Prefer colocated external HTML files when changing the large list or detail templates. Keep
  request pipelines, retry decisions, and derived display values in TypeScript; retain the card as
  a presentation component. Preserve existing navigation, text rendering, and accessible feedback.

## Feature validation

- Existing browser coverage is in [tests/book-details.spec.ts](../../../tests/book-details.spec.ts).
  When changing feature behavior, extend relevant scenarios there, following its controlled API
  responses and role-based locators. Tests live outside this directory and inherit root guidance.
- Cover navigation/direct reload, loading, not-found, retry/network errors, optional fields,
  cover fallback, narrow layouts with long text, and route-change cancellation when affected.
- When changing list orchestration, add focused browser coverage for rapid input, clear during a
  pending debounce/request, stale-response prevention, error versus empty results, and recovery.
  When adding shared reporting, verify that feature errors do not trigger duplicate notifications.
- Use the targeted Playwright command from the root guidance and the production build for application
  changes. Report mocked browser checks separately from any real-API smoke checks.
