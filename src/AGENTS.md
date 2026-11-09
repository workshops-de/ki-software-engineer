# Shared technical guidance

Applies to this directory and its descendants, in addition to [repository guidance](../AGENTS.md).
Book-specific rules live in [app/books/AGENTS.md](./app/books/AGENTS.md).

## Application boundaries

- Use Angular standalone components and dependency injection. Bootstrap is in [main.ts](./main.ts);
  application-wide providers belong in [app.config.ts](./app/app.config.ts), routes in
  [app.routes.ts](./app/app.routes.ts), and shared shell markup in [app.html](./app/app.html).
- Keep feature UI, data models, and API adapters together in their feature directory. Put genuinely
  reusable utilities in [shared](./app/shared), without moving feature behavior into the shell.
- Keep state in the owning feature component unless the task explicitly requires shared state.
  NgRx, TanStack Query, and SSR packages are declared but not currently configured in the application.
- The application uses zone-based change detection. Do not silently switch its bootstrap model.
- Use Angular `HttpClient` and RxJS for HTTP access through feature API adapters. For new or changed
  asynchronous flows, handle errors and lifecycle cleanup explicitly; prefer template-owned
  subscriptions with `AsyncPipe` where appropriate and cancel superseded requests when necessary.

## Error handling pattern

These are recommended boundaries for new or changed error handling. Currently, the application
registers browser global error listeners, but has no custom `ErrorHandler` or HTTP interceptor.

- Handle expected request failures near the feature operation, where recovery and user feedback
  can be decided. Model not-found, retryable failure, and successful empty results separately.
- Use a root-provided Angular `ErrorHandler` for unexpected, unhandled errors when centralized
  reporting is required. Register it in [app.config.ts](./app/app.config.ts); keep shared reporting
  code in [shared](./app/shared). It is a fallback, not the normal request-recovery path.
- For cross-cutting HTTP reporting, use a functional interceptor registered through `provideHttpClient`
  with `withInterceptors`. Propagate failures to feature consumers; do not replace them with empty
  success responses or apply automatic retries to every request.
- Give user-facing error feedback one owner. Expected feature failures should use the local error
  view; centralized reporting should not also produce a duplicate toast. If transient notification
  is appropriate, reuse [ToastService](./app/shared/toast.service.ts), which is currently unused.
- Keep user messages actionable and free of raw exception details. Test local recovery and shared
  reporting separately when introducing this infrastructure.

References: [Angular error handling](https://angular.dev/best-practices/error-handling) and
[HTTP interceptors](https://angular.dev/guide/http/interceptors).

## Logic and template pattern

- Keep transport and query construction in API adapters, request orchestration and view state in
  feature components, and input/output presentation in child components. Extract a feature-local
  service or pure helper when logic is reused or obscures the component's presentation responsibility.
- For new or substantially reworked request flows, prefer one typed view-state stream with a
  discriminated status such as `loading`, `success`, `not-found`, or `error`. Derive displayed values
  in TypeScript rather than coordinating unrelated booleans across template branches.
- Consume a request-backed view model once with `AsyncPipe` and reuse its template alias. Avoid
  nested subscriptions, HTTP calls from templates, and multiple subscriptions to the same cold request.
- Templates should bind data, choose visible states, and forward events to named handlers. Move
  complex transformations and business decisions to TypeScript; keep template expressions cheap
  and free of side effects. Prefer pure helpers or pipes for reusable formatting.
- Keep short templates inline. When editing a large or branching template, prefer a colocated
  `*.component.html` file; extract a child component when a section has a coherent responsibility.
  Keep logic in the component's TypeScript file and follow the existing styling setup.
- For new or substantially rewritten templates, prefer Angular's built-in `@if`, `@for`, and `@switch`
  control flow; track collections by stable IDs. Existing structural directives can remain in
  untouched templates. Avoid mixing styles within a newly rewritten template.

Reference: [Angular style guide](https://angular.dev/style-guide). These recommendations guide
incremental changes; they do not require a repository-wide conversion.

## Implementation conventions

- Respect strict TypeScript and Angular template/injection checks in [tsconfig.json](../tsconfig.json).
  Use explicit models and avoid introducing `any` or weakening compiler options to bypass errors.
- Follow the surrounding component style; do not convert unrelated components or templates as part
  of a feature change. Both constructor injection and `inject()` already exist.
- Follow [Prettier configuration](../.prettierrc): two spaces, single quotes in TypeScript, semicolons,
  no trailing commas, and LF endings.
- Use Tailwind utility classes for component layout and styling. Global Tailwind setup is in
  [styles.css](./styles.css); Material overrides are in [material-theme.scss](./material-theme.scss).
  Build styles and assets are configured in [angular.json](../angular.json); assets come from
  [public](../public).
- Preserve semantic HTML, keyboard navigation, visible focus, useful image alternatives, and responsive
  layouts. Expose loading and error feedback accessibly when changing asynchronous views.
- Render API text through Angular interpolation. Do not switch descriptions or other untrusted text
  to HTML rendering without an explicit requirement and a suitable design.
