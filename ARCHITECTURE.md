# Project Architecture

This document describes the current `workshop` branch of **BookMonkey**, an Angular workshop application. It is based on the repository's source code and configuration. The application displays a book collection and supports text search against a separately running demo API.

## Technology and dependencies

Versions below are the declarations in [package.json](package.json); ranges such as `^20.2.0` are not exact installed versions. The lockfile records dependency resolution.

| Technology / dependency | Declared version | Role in this project |
| --- | --- | --- |
| Angular core, common, compiler, forms, router, browser platform | 20.2.1 | Standalone components, dependency injection, routing, template-driven search input, and HTTP requests. |
| Angular animations | 20.2.1 | Animation providers are registered at application startup. |
| Zone.js | 0.15.0 | Zone-based change detection with event coalescing. |
| RxJS | 7.8.0 | `HttpClient` returns observables consumed by the book list. |
| Angular Material / CDK | ^20.2.0 / 20.2.0 | A snack-bar service and SCSS overrides exist; the current book list does not use the toast service. |
| Tailwind CSS / its PostCSS plugin | 4.1.12 | Utility classes style the layout and book cards. PostCSS processes the Tailwind import. |
| TypeScript | 5.9.2 | Strict type checking, with strict Angular template and injection checks. |
| Angular CLI / build tooling | 20.2.0 | Development server and application builds. |
| Playwright Test | ^1.55.0 | Browser testing configuration for Chromium, Firefox, and WebKit. Existing tests are starter examples. |
| Prettier | 3.6.2 | Formatting; the npm formatting script targets files under `src/`. |
| `tslib` | 2.3.0 | TypeScript runtime helpers. |

Additional declared dependencies are not wired into the current application flow:

- `@ngrx/signals` (20.0.1), `@angular-architects/ngrx-toolkit` (^20.1.0), and `@tanstack/angular-query-experimental` (^5.85.5): no store or query integration appears in the application source.
- `@angular/platform-server` and `@angular/ssr` (20.2.1), Express (5.1.0), and Express types: installed, but no server entry point or SSR configuration is present in `angular.json`. The current application is rendered in the browser.
- Node types support tooling. Node.js and npm are needed for development, but the repository does not pin their versions through an `engines` field or a runtime version file.

The **Bookmonkey API** is an external development dependency started with `npx bookmonkey-api`. Its implementation is outside this repository, and its package/version is not pinned in this project's manifest.

## Architecture

The application uses Angular standalone components rather than an application NgModule. It has one feature area, `books`, and a small shared service directory.

```text
src/main.ts
  -> bootstrapApplication(App, appConfig)
     -> App: header, router outlet, footer
        -> route "": BookListComponent
           -> BookApiClient -> HTTP GET -> Bookmonkey API
           -> BookItemComponent for each returned book

shared/ToastService -> Angular Material snack bar
                      (currently not called by the book feature)
```

### Entry point and application configuration

[`src/main.ts`](src/main.ts) bootstraps the root component using [`app.config.ts`](src/app/app.config.ts). Providers enable browser error listeners, zone-based change detection, routing, `HttpClient`, and animations. Bootstrap failures are logged to the console.

[`App`](src/app/app.ts) supplies the page shell through its HTML template. [`app.routes.ts`](src/app/app.routes.ts) maps the empty path to `BookListComponent` and redirects all unknown paths to that route. There are no detail routes, route guards, or lazy-loaded feature routes.

### Presentation and local state

[`BookListComponent`](src/app/books/book-list.component.ts) owns the book array, loading flag, search term, and a search timer. It loads books on initialization, binds the input with `ngModel`, and delays search requests by 300 milliseconds using `setTimeout`. Clearing the search immediately requests the unfiltered list.

The template displays a loading indicator, a responsive grid, or an empty state. It tracks rendered books by ID. [`BookItemComponent`](src/app/books/book-item.component.ts) receives a `Book` input and displays its cover, title, optional subtitle, author, and ISBN. It does not fetch data itself.

State is held in ordinary component fields. There is no application-wide store, query cache, or signal-based state implementation in the current source.

### Data access and model

[`BookApiClient`](src/app/books/book-api-client.service.ts) is a root-provided service that wraps `HttpClient`. Its `getBooks(pageSize, searchTerm)` method sends:

```text
GET http://localhost:4730/books?_limit=10
GET http://localhost:4730/books?_limit=10&q=<search term>
```

`HttpParams` handles query parameter encoding. The default limit is 10; a component input can change the limit, but the UI has no pagination controls or page offset. Search matching is delegated to the API's `q` parameter; the frontend does not implement field-specific filtering.

[`Book`](src/app/books/book.ts) is a TypeScript interface describing API records, including identifiers, bibliographic information, cover URL, abstract, price, and user ID. `HttpClient.get<Book[]>` provides compile-time typing but does not validate response data at runtime.

There is no backend implementation, database schema, authentication flow, or write operation in this repository. The browser communicates directly with the external demo API.

## Development and build workflow

From the repository root, install dependencies with `npm install` (or use `npm ci` for installation from the lockfile). Keep these commands running in separate terminals:

```sh
# Terminal 1: Angular development server
npm start

# Terminal 2: demo API
npx bookmonkey-api
```

The frontend uses `http://localhost:4200`; the API uses `http://localhost:4730`. They are separate origins, so the API must allow the frontend's requests through CORS.

`npm run build` uses the production configuration by default, including output hashing and bundle budgets (500 kB initial warning, 1 MB initial error). `npm start` uses the development configuration with source maps and disabled optimization. Tailwind and the Material SCSS overrides are configured as global styles.

`npm test` invokes the configured Angular Karma builder. `npx playwright test` uses `playwright.config.ts`, which starts or reuses the Angular development server. It does not start the Bookmonkey API. No CI workflow is checked into this repository.

## Weaknesses and improvement opportunities

These findings describe observable code and configuration limitations. They are not a dependency vulnerability audit or a penetration test; no specific CVE or exploitable backend vulnerability is asserted.

| Priority | Finding and evidence | Impact and suggested improvement |
| --- | --- | --- |
| High | Search requests can overlap. `loadBooks()` creates an independent subscription for each request without cancelling earlier ones. | An older response can overwrite results for a newer search, and an earlier completion can clear the loading flag while another request is pending. Use a search stream with `debounceTime`, `distinctUntilChanged`, and `switchMap`, with loading/error state tied to the active request. |
| High | HTTP failures only call `console.error`; there is no error state in the list template. | An initial failure looks like an empty collection, while a later failure can leave stale results visible. Show an explicit error and retry action; consider using the existing toast service for supplementary feedback. |
| High | The API URL is hardcoded to plain HTTP on `localhost`. | A deployed browser would contact the visitor's own machine; an HTTPS frontend can also encounter mixed-content restrictions. Inject deployment-specific API configuration or use a same-origin API path with an appropriate development proxy. |
| High | Checked-in browser tests visit `playwright.dev`, not BookMonkey. No application unit tests are present. The Karma target has no declared Karma/Jasmine test dependencies. | Current tests provide no regression coverage for loading, searching, errors, or cards, and the unit-test setup is incomplete. Configure a working test runner and add application tests, especially for out-of-order responses and failure states. Mock HTTP for deterministic browser tests, or explicitly manage the demo API lifecycle. |
| Medium | The debounce timer is typed as `any` and is not cleared on component destruction or when clearing the search. Requests are also not tied to component destruction. | Pending callbacks can cause redundant requests after clearing or leaving the view. Use typed timer cleanup or a lifecycle-managed RxJS stream with `takeUntilDestroyed`. Ordinary HTTP requests complete, but pending work should still be cancelled when no longer needed. |
| Medium | API responses are trusted through a TypeScript interface alone. | Unexpected or missing fields can break rendering or silently display incorrect data. Validate external records at the service boundary where the reliability of the API requires it. |
| Medium | The search input has only a placeholder; the icon-only clear button has no accessible name. Loading status has no live-region semantics. | Screen-reader users have less context and may miss state changes. Add a visible or programmatic input label, an accessible button name, and an appropriate status announcement. |
| Medium | `npx bookmonkey-api` is unpinned, and no Node/npm version is documented or enforced. | Different machines or installation dates can produce different development behavior. Pin the demo API and document compatible runtime versions. |
| Low | Several state-management and server packages are unused by the current implementation. | They add installation and maintenance work and obscure the actual architecture. Remove unnecessary packages or document their intended workshop role; installed packages do not necessarily enter the browser bundle. |
| Low | Only the first limited result set is available; there is no pagination or total count. Cover images have no lazy loading or load-error fallback. | Users cannot browse beyond the returned subset, and invalid cover URLs produce broken images. Add pagination when required and improve image loading/fallback behavior. |

### Existing strengths

The project already separates data access from rendering, uses a small typed domain model, enables strict compiler checks, and tracks book cards by ID. Its limited feature scope and standalone component structure make it approachable for a workshop. Production bundle budgets provide a basic size constraint. The main next steps are to make asynchronous search reliable, expose request failures, and establish meaningful application tests.
