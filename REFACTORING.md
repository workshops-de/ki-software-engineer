# Refactoring findings

Original findings and implementation review: 2026-11-09. Sections 1-4 retain the findings from the
pre-refactoring baseline commit `f673fcb`, including the original inferred effects and proposed designs.
The implementation status below describes the resulting changes on branch `refactoring`.
Current architecture is documented in [ARCHITECTURE.md](./ARCHITECTURE.md).

`[OK]` identifies inspected facts, `[ANNAHME]` identifies inferred effects or proposed designs, and
`[OFFEN]` identifies unresolved verification or decisions. Priorities and expected benefits are proposals.

## Implementation status

- [OK] List search now uses typed actions, immediate cancellation of superseded work, debounced text
  changes, immediate clear/retry, and subscription cleanup through `AsyncPipe`.
- [OK] The list has distinct loading, success/empty, and local error states with retry. Earlier cards
  are removed when a new operation begins, and failures do not become successful empty results.
- [OK] List and detail request state use discriminated unions. List, detail, and card templates live
  in colocated HTML files and use built-in control flow; component/API/card boundaries remain intact.
- [OK] A root global error handler and HTTP reporting interceptor use the shared
  [ErrorReporter](./src/app/shared/error-reporter.service.ts). Reporting stays in the browser console;
  object errors are deduplicated by identity. Only unexpected unhandled failures show a generic toast.
  Expected request failures retain local feedback, and the interceptor rethrows without automatic retry.
- [OK] The global handler also deduplicates notifications by error identity, independently of diagnostic
  deduplication, so reporting the same error again does not replace or restart its toast.
- [OK] Reporting policy for the workshop: network failures and HTTP 5xx include source, method, endpoint
  without query parameters, and status; expected HTTP 4xx stay local. No external telemetry is configured.

## Original suggested order

| Priority | Improvement                                      | Reason for ordering                                                     |
| -------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| P1       | Cancellable list search and lifecycle cleanup    | Address overlapping requests and pending work after navigation.         |
| P1       | Explicit list error and recovery states          | Distinguish failures from successful empty results.                     |
| P2       | Consistent component logic and template patterns | Make state transitions and rendering easier to review.                  |
| P2       | Global error reporting with clear ownership      | Add shared reporting when its destination and requirements are defined. |

## 1. List search and lifecycle

**[OK] Observed:** [BookListComponent](./src/app/books/book-list.component.ts) schedules searches with
a 300 ms timeout. Each load creates an independent subscription. Later input clears the pending timer,
but does not cancel an active request. `clearSearch()` immediately loads the unfiltered list without
clearing the pending timer. There is no destruction hook or explicit subscription cleanup;
the timeout handle is typed as `any`.

**[ANNAHME] Impact:** A slow older response could overwrite newer results. Clearing while a timer is
pending could produce a second unfiltered request because the callback reads the current search term.
Pending work could also continue after leaving the list. These effects were not reproduced in a browser.

**[ANNAHME] Proposed approach:** Use a feature-owned, typed stream of search, clear, and retry actions.
Debounce text changes by 300 ms, suppress repeated search terms, and cancel superseded work with
`switchMap`. Clear must cancel both a pending debounce and the active request, then load immediately.
Keep retry separate from term deduplication so the same search can be retried. Consume one view-state
stream with `AsyncPipe`; no central store is required.

**Tradeoff:** This introduces more RxJS orchestration than the timer, but places cancellation, cleanup,
and ordering in one flow. Merely adding `debounceTime` before a request-level `switchMap` does not
specify immediate cancellation on new input; make that behavior explicit in the design and tests.

**Acceptance checks:** Control response timing and verify that rapid input cannot display stale data,
clear loads once immediately, retry works for an unchanged term, and leaving the view cancels pending work.

## 2. Expected request errors and recovery

**[OK] Observed:** The list error callback logs to the console and clears `loading`; it does not set
an error state or clear earlier books. Its empty view depends only on `books.length`. In contrast,
[BookDetailsComponent](./src/app/books/book-details.component.ts) models loading, a book, not-found,
and request-error results, with a retry action and inner-stream error handling.

**[ANNAHME] Impact:** A failed initial list request could display the successful-empty message, while
a failed later search could leave earlier results visible under a different search term.

**[ANNAHME] Proposed approach:** Model list loading, successful results, and request failure explicitly.
Treat zero books as a successful result, and provide an actionable local error view with retry.
Catch failures inside the switched request so later input and retries remain usable. If retaining
previous results during a failure is desired, identify them as previous results in the UI.

**Tradeoff:** Explicit states add rendering branches, but avoid making users infer request failure from
empty or unchanged results. Keep feature recovery local even if global reporting is added.

**Acceptance checks:** Cover initial failure, failure after success, successful empty search, network
failure, retry, and a successful new search after an error.

## 3. Clear patterns for logic and templates

**[OK] Observed:** The list, card, and details use inline templates and structural directives. The list
keeps independent fields and direct subscriptions; details use a typed state observable consumed once
with `AsyncPipe`. The detail state interface permits combinations of `loading`, `book`, and `error`
that its current producers do not emit. The API adapter already owns HTTP calls, and the card already
receives a `Book` input without making requests.

**[ANNAHME] Proposed approach:** Keep these existing responsibility boundaries:

- [BookApiClient](./src/app/books/book-api-client.service.ts): endpoint, encoding, and query construction.
- Feature components: user actions, request orchestration, recovery, and view state.
- [BookItemComponent](./src/app/books/book-item.component.ts): input-driven presentation and navigation.
- Templates: bindings, visible-state selection, and forwarding events to named handlers.

For substantially reworked flows, use a discriminated union with a `status` field so incompatible
request states cannot be represented. Keep cover failure as separate local UI state and reset it per
request. Move complex derived values into TypeScript or pure formatting helpers; the existing templates
are not evidence of a business-logic defect merely because they are inline.

When editing the large list or detail template, prefer a colocated external HTML file. Use built-in
`@if`, `@for`, and `@switch` for rewritten templates, with stable book IDs for collection tracking.
Extract child components only for coherent responsibilities; extract a feature service when orchestration
is reused or obscures presentation. Avoid a generic state framework for these two views.

**Tradeoff:** More files and explicit types add structure. Apply them incrementally so behavior changes
remain reviewable and template extraction does not become an unrelated application-wide migration.

**Acceptance checks:** Preserve keyboard navigation, direct detail loading and reload, mutually exclusive
request views, retry, optional-field handling, plain-text descriptions, cover fallback, and narrow layouts.

## 4. Global error handling

**[OK] Observed:** [app.config.ts](./src/app/app.config.ts) registers browser global error listeners and
`provideHttpClient()`. No custom `ErrorHandler` or HTTP interceptor is configured.
[ToastService](./src/app/shared/toast.service.ts) wraps Material snack bars and has no application callers.
Existing browser listeners should not be described as an absence of all global error handling.

**[ANNAHME] Proposed approach:** Establish three distinct responsibilities:

| Layer                      | Responsibility                                                       | User feedback                                                                               |
| -------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Feature request flow       | Expected errors, not-found, and recovery                             | Local error view and retry where appropriate.                                               |
| Optional HTTP interceptor  | Shared HTTP reporting when required; propagate failures to consumers | Avoid unconditional toasts for feature-owned errors.                                        |
| Custom root `ErrorHandler` | Unexpected, unhandled errors reaching Angular's handler              | A safe generic notification only if useful; detailed reporting goes to the chosen reporter. |

Register shared infrastructure in [app.config.ts](./src/app/app.config.ts) and keep reporting code in
[shared](./src/app/shared). Reuse the toast utility when transient notification is appropriate, with one
owner per user-facing message. Do not turn failed HTTP responses into empty successes, automatically
retry every request, or use the global handler as a substitute for feature recovery.

**Tradeoff:** Shared reporting can make diagnosis consistent, but adds infrastructure and duplicate-reporting
risk. Implement it after defining a concrete reporting need; an interceptor is optional for this workshop.

**[OFFEN] Decision:** Reporting destination, required diagnostic context, and notification policy are not
defined by the inspected repository. No external reporting service is selected in this proposal.

**Acceptance checks:** Verify unexpected-error reporting, propagation of intercepted HTTP failures,
continued local retry behavior, and absence of duplicate notifications for a single feature failure.

## Validation and implementation boundaries

**[OK] Baseline coverage:** [tests/book-details.spec.ts](./tests/book-details.spec.ts) contains ten
book-detail scenarios, including list-to-detail navigation and route-change cancellation, using controlled
API responses. It does not contain list-search ordering or list-error recovery scenarios.

New list regressions live in [tests/book-list.spec.ts](./tests/book-list.spec.ts), and shared error-handling
checks live in [tests/global-errors.spec.ts](./tests/global-errors.spec.ts). They cover the original
acceptance criteria with controlled API responses and browser events.

For implementation, first add focused regression coverage for the behavior being changed, then refactor
in small steps. Run `npm run build` and the relevant browser tests. The existing detail command is:

```sh
npx playwright test tests/book-details.spec.ts --workers=3 --reporter=line
```

Run new list-focused tests explicitly as well. Mocked tests establish controlled UI behavior; they do not
establish real-API search semantics. Keep existing API parameters, URL-encoded IDs, and the
[Book contract](./src/app/books/book.ts), including string-valued price, unless a task changes them.
Update [ARCHITECTURE.md](./ARCHITECTURE.md) after implementing changes to documented data flow.

The scoped [shared guidance](./src/AGENTS.md) and [book guidance](./src/app/books/AGENTS.md) capture the
recommended patterns. A store, query cache, SSR migration, and new dependencies are unnecessary for
the proposals above.

## References

The guidance and implementation review consulted these official sources. The original proposals above
are retained for traceability; current behavior is described in the implementation status:

- [Angular: unhandled errors](https://angular.dev/best-practices/error-handling)
- [Angular: HTTP interceptors](https://angular.dev/guide/http/interceptors)
- [Angular style guide](https://angular.dev/style-guide)

## Verifikationsstatus

- [OK] Refactored source inspected and `npm run build` passed after the final handler change.
- [OK] The application regression command below passed 90 cases: 30 scenarios across Chromium,
  Firefox, and WebKit (10 detail, 14 list, and 6 global-error scenarios per browser).
- [OK] Static review identified repeated-error toast duplication; the handler fix and a dedicated
  browser regression are included in the successful final run.
- [ANNAHME] The original impact descriptions explain source-derived risks in the baseline; they are not
  claims that the refactored application exhibits those failures.
- [OFFEN] Real-API search, the Karma suite, external-site example tests, production hosting, and
  remote telemetry were not verified in this refactoring task.

```sh
npx playwright test tests/book-details.spec.ts tests/book-list.spec.ts tests/global-errors.spec.ts --workers=3 --reporter=line
```
