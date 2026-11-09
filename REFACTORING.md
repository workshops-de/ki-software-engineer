# Book feature refactoring review

Reviewed on 2026-11-09 against the current working tree, including staged and unstaged changes.
Context: [ARCHITECTURE.md](ARCHITECTURE.md) and the scoped `AGENTS.md` files.
The findings below record the original review. The implementation status describes the subsequent feature refactoring.

## Implementation status

Applied to the recently added detail feature and its card/API integration on 2026-11-09:

- Moved the detail template into `book-detail.component.html`, leaving request and retry orchestration in the container.
- Added feature-local `BookCoverComponent` for cards and details. It owns image failure state and resets on input changes;
  detail loading destroys the previous cover view. Removed the image-reset side effect from the HTTP stream.
- Made the card's book input required and used built-in control flow in the revised card template.
- Introduced `API_BASE_URL`, supplied in `app.config.ts`, and injected it into the API client. Local development defaults
  to `http://localhost:4730`; endpoint construction and encoded IDs remain in the client.
- Made error guidance neutral, gave the abstract a stable test ID, and bound its `textContent` to preserve literal text
  and exact whitespace independently of HTML formatting.
- Split cancellation and recovery browser scenarios and added cover failure/recovery coverage for cards and details.

Subsequently applied the catalog request refactoring:

- Replaced independent subscriptions, mutable loading/results fields, and an untyped timer with one intent/state stream.
  New intent cancels the previous debounce and request immediately; typed input waits 300 ms, while initial load, clear,
  and retry run immediately. Identical input changes are ignored without preventing retries of the same term.
- Bound all pending work to the template's single `AsyncPipe` subscription. Search text is derived from the current intent.
- Added a distinct recoverable error view and removed stale results on new intent. Successful empty results retain their
  own message; errors are not converted to empty arrays.
- Moved the catalog template to adjacent HTML with built-in control flow, an accessible clear button, and loading status.
- Added nine browser tests covering debounce timing, obsolete request cancellation and late responses, clearing via button
  and input during debounce, initial/search failure recovery, retry, empty results, and destruction-time cancellation.

Unit-test tooling remains follow-up work.
Global diagnostics remain conditional on an actual reporting requirement; recoverable detail errors remain local.
No global store, reporting backend, or automatic HTTP retry policy was introduced.

Validation: all 25 focused Chromium tests passed (nine catalog and 16 detail/card tests). The production build passed after network access was allowed for
Google Fonts inlining. Firefox and WebKit were not run. The original source line anchors below are historical.

## Scope and assessment

The feature adds book details, routing, API retrieval, card navigation, and browser coverage. The detail flow already
has useful safeguards: typed view state, one `AsyncPipe` subscription, cancellation on route changes and retries,
request-local error recovery, encoded IDs, and plain-text abstract rendering. Preserve these during refactoring.

The strongest maintenance issues are inconsistent catalog/detail request patterns, presentation code mixed into large
component files, and duplicated image behavior. Catalog orchestration and hardcoded configuration predate the detail
feature; they are integration risks, not newly introduced defects. Constructors in the inspected components and
services only inject dependencies. **No constructor side effects were found.** Creating the detail observable in a field
initializer does not itself subscribe or start an HTTP request.

## Findings, ordered by priority

### 1. High: catalog requests have competing owners and no lifecycle cleanup

**Evidence:** [book-list.component.ts](src/app/books/book-list.component.ts), `loadBooks()`, `onSearchChange()`,
`clearSearch()`, and `searchTimeout` (lines 86-119). This is pre-existing catalog code.

Each load creates an independent subscription and mutates `books` and `loading`. A slower earlier response can replace
newer results, and completion of one request can hide loading while another is pending. Clearing search does not cancel
the pending debounce timer: it can send an immediate unfiltered request followed by another unfiltered request when the
timer fires. Neither the timer nor outstanding subscriptions are bound to destruction. `searchTimeout: any` also bypasses
the strict type checks used elsewhere.

**Better approach:** adopt a single catalog intent stream covering initial load, typed search, clear, and retry. An outer
`switchMap` should replace the entire pending debounce/request flow on every new intent. Delay typed searches by 300 ms;
initial, clear, and retry intents should load immediately. This cancels old requests as soon as intent changes, rather
than only after the next debounce finishes. Emit typed loading/success/error states from the inner request flow, catch
errors there, and subscribe once with `AsyncPipe`. If an imperative subscription remains, bind it to destruction and
clean up timers. Do not merely add `finalize(() => loading = false)` to competing requests; the shared-flag race remains.

**Acceptance:** slow old responses never overwrite newer intent; clearing during debounce produces one immediate
unfiltered load; navigation away cancels work; a failed search can be followed by a successful search or retry.

### 2. High: error recovery and reporting have inconsistent policies

**Evidence:** [book-list.component.ts](src/app/books/book-list.component.ts), `loadBooks()` error callback (lines 101-104);
[book-detail.component.ts](src/app/books/book-detail.component.ts), error branch and `catchError`;
[app.config.ts](src/app/app.config.ts); [toast.service.ts](src/app/shared/toast.service.ts).

The catalog logs an error and then renders existing results or an empty-results message, which can misrepresent a failed
request. Details render a recoverable error correctly but discard diagnostic information when mapping failures to status.
The text “Please check your connection” also suggests a cause that is not established for a server error. Global browser
error listeners are registered, but there is no custom reporting policy or HTTP interceptor. The existing toast service
is unused by both flows.

**Better approach:** define three explicit responsibilities:

| Responsibility                        | Proposed owner                                                                                                             | Behavior                                                                                                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Expected request failure and recovery | Feature request stream                                                                                                     | Keep detail 404 distinct; show catalog/detail error state and deliberate retry. Keep `catchError` inside the replaceable request stream.                                                         |
| Shared HTTP diagnostics               | A functional interceptor registered through `provideHttpClient(withInterceptors(...))`, if centralized reporting is needed | Report actionable failures once with operation/status context, then rethrow the original error so features retain recovery semantics. Avoid routine not-found noise and omit sensitive payloads. |
| Unexpected unhandled exceptions       | A custom root `ErrorHandler`, if a reporting destination is introduced                                                     | Report unexpected failures centrally. Do not use it as the catalog/detail state machine.                                                                                                         |

Use neutral error text such as “Unable to load books. Please try again.” Decide explicitly whether stale results remain
visible with an error banner or are replaced. Keep notifications owned by the feature unless a truly global event needs
one; automatically toasting every HTTP failure would duplicate inline alerts. Never convert an error to `[]` in an
interceptor, because that turns failure into apparently successful empty results. Preserve user-driven retry rather than
adding unconditional global retries.

Angular recommends handling recoverable errors where the operation context is available and reserving `ErrorHandler`
primarily for unexpected failures. See [Angular error handling](https://angular.dev/best-practices/error-handling).
Interceptors provide a shared HTTP boundary; see [Angular interceptors](https://angular.dev/guide/http/interceptors).
These references support the proposed separation; no reporting service is currently implemented here.

**Acceptance:** catalog failure is distinguishable from an empty catalog; detail 404 remains distinct; recovery still
works after failure; reporting occurs once per reportable failed request with no duplicate toast/inline announcement.

### 3. Medium: large inline templates obscure the logic and presentation boundary

**Evidence:** [book-detail.component.ts](src/app/books/book-detail.component.ts), inline template (lines 15-89), and
[book-list.component.ts](src/app/books/book-list.component.ts), inline template (lines 12-79).

The new detail component places routing, retry orchestration, error classification, image state, and a full responsive
detail layout in one file. The catalog follows a similar pattern. Long utility-class strings and decorative SVG markup
make logic changes harder to scan. Details use `@if`/`@switch`, while the catalog/card use structural directives, so the
feature also presents two template conventions to maintainers. Neither convention is inherently faulty.

**Better approach:** move the large templates into adjacent `.html` files using `templateUrl`. Keep the detail container
responsible for route/retry/request state and the template responsible for rendering that state and emitting actions.
Use built-in control flow for templates being substantially revised, without turning this into a repository-wide syntax
migration. Extract a presentational detail-content component only if its independent responsibility warrants it; moving
HTML already improves readability without requiring several small components.

The two detail error panels repeat a short wrapper, heading, and paragraph. This is modest duplication: consolidate it
locally if error presentation expands, rather than immediately adding a generic configurable alert framework. Explicit
metadata `<dt>`/`<dd>` pairs remain readable and do not need a dynamic rendering engine.

**Acceptance:** container code makes request orchestration easy to find, with no HTTP work in presentation components;
existing semantic headings, status/alert roles, keyboard focus, responsive layout, and plain-text abstracts remain intact.

### 4. Medium: repeated cover markup already has divergent behavior

**Evidence:** [book-item.component.ts](src/app/books/book-item.component.ts), cover block (lines 17-26), versus
[book-detail.component.ts](src/app/books/book-detail.component.ts), cover block and `coverFailed` (lines 53-67, 98, 107).

Cards handle an absent cover URL but do not handle an image request failure. Details handle both cases. In details,
the request stream also resets `coverFailed` through `tap`, coupling HTTP orchestration to image presentation state.
The two cover blocks repeat aspect-ratio, image sizing, fallback content, and accessibility decisions.

**Better approach:** extract a small feature-local `BookCoverComponent` with URL/title inputs and internal image failure
state. Reset failure state when the cover input changes; the detail loading branch should destroy the old cover view
between requests, including retries of the same URL. Keep layout variants explicit and small (for example, host classes),
and keep the shared component free of routing or HTTP book retrieval. Remove the detail stream's image-reset `tap`
once image state belongs to the cover view.

**Acceptance:** missing and broken covers behave consistently in cards and details. A broken cover followed by a valid
cover, and a retry of the same formerly broken URL, both attempt image loading again. Preserve image alternatives and
the card's existing accessible link name.

### 5. Medium: API configuration and input contracts are implicit

**Evidence:** [book-api-client.service.ts](src/app/books/book-api-client.service.ts), `apiUrl` (line 8);
[book-item.component.ts](src/app/books/book-item.component.ts), `@Input() book!: Book` (line 43).

The service hardcodes a development-only host, so deployment configuration requires editing transport code. The card's
non-null assertion hides the requirement that every caller provide a book; Angular cannot enforce that requirement as
it would for a required input.

**Better approach:** inject a centrally configured API base URL with a localhost development default. Keep endpoint
construction, `HttpParams`, and ID encoding in the client. Declare the card input required, for example
`@Input({ required: true }) book!: Book`, without requiring a broader signal-input migration. The simple `Book` interface
is adequate at this scale; add a DTO mapping or runtime validation only when a concrete external-contract need appears.

**Acceptance:** the client works with an alternate configured host, preserves `_limit`/`q` and encoded IDs, and template
compilation catches a card invocation that omits its required book input.

### 6. Medium: regression coverage makes some refactors harder to trust

**Evidence:** [tests/book-details.spec.ts](tests/book-details.spec.ts), `expectDetails()` and the route-change scenario;
[tsconfig.spec.json](tsconfig.spec.json), [package.json](package.json), and [playwright.config.ts](playwright.config.ts).

Detail coverage is substantive, including cancellation and recovery. However, `article p.whitespace-pre-wrap` couples
abstract assertions to a particular tag/class combination. The route-change test combines cancellation, stale-content
clearing, and recovery in one long scenario, making failures harder to isolate. Catalog race/error behavior and card
image failures lack focused coverage. The unit-test scaffold references Jasmine without the required setup; the default
Playwright suite includes unrelated external-site examples.

**Better approach:** retain behavior assertions for literal markup, paragraph whitespace, focus visibility, and mobile
overflow. Target the abstract through a stable semantic boundary or a dedicated test ID rather than a styling utility.
Keep shared fixtures and response helpers local until reuse justifies a separate module. Split the long route scenario
into focused cancellation and recovery cases while preserving same-component router reuse. Add catalog race/clear/error
and card cover tests before changing those flows. Restore a supported unit-test setup in a separate tooling change if
stream or component unit tests are needed; do not silently broaden this feature refactor into a test-framework migration.

## Suggested implementation order

1. Add focused regression cases for catalog races, clear during debounce, error recovery, and card image failures.
2. Replace catalog request orchestration with one lifecycle-bound state stream and explicit failure UI.
3. Agree on reporting ownership; add shared diagnostics only with an actual reporting requirement, preserving local recovery.
4. Extract cover presentation and move large templates to `.html` files. Preserve the detail stream's existing cancellation.
5. Configure the API base URL, enforce required card inputs, and reduce brittle test selectors.

Keep each step reviewable. A global store, generic request-state framework, repository abstraction, and broad dependency
cleanup are unnecessary for these findings. Revisit shared request helpers only after the two flows show stable,
substantial duplication; their triggers and error states differ today.

## Verification and limits

This was a source and diff review, not a new runtime reproduction. Source anchors refer to the reviewed working tree and
may move during implementation. Findings about races follow from independent subscriptions and pending timers;
the proposed acceptance cases should demonstrate them before changes and protect the fixes afterward.

For implementation, run `npm run build` and
`npx playwright test tests/book-details.spec.ts --project=chromium`, plus the new focused catalog tests. Run formatting
and whitespace checks on changed files. The production build may need network access for Google Fonts. The existing
architecture document records earlier successful build/browser checks; those are not new verification for this review.
No application code was changed or application tests run during the original review. Subsequent implementation and
validation are recorded under Implementation status above.
