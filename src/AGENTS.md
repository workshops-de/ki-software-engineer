# Shared technical guidance

Applies to this directory and its descendants, in addition to [repository guidance](../AGENTS.md).
Book-specific rules live in [app/books/AGENTS.md](./app/books/AGENTS.md).

## Boundaries and reactive state

- Use standalone components and dependency injection. Bootstrap: [main.ts](./main.ts); providers:
  [app.config.ts](./app/app.config.ts); routes: [app.routes.ts](./app/app.routes.ts); shared shell:
  [app.html](./app/app.html). Preserve zone-based change detection.
- Colocate feature UI, models, and API adapters; put genuinely reusable utilities in
  [shared](./app/shared). Keep state in the owning feature unless shared state is explicitly required.
- Keep one component per file and consistent abstraction levels: API adapters own transport/query
  construction, feature components own orchestration/view state, and children own presentation.
  Extract a service, helper, or child only for a clear responsibility or genuine reuse.
- Use Angular `HttpClient` and RxJS through feature API adapters. For new or substantially reworked
  request flows, prefer one typed view-state stream with a discriminated status. Consume it once with
  `AsyncPipe` and reuse the template alias rather than coordinating unrelated flags.
- Handle errors and lifecycle cleanup explicitly; cancel superseded work when needed. Avoid nested
  subscriptions, HTTP calls from templates, and duplicate subscriptions to cold requests.

## Error ownership

- Handle expected failures near the feature operation, with distinct not-found, retryable-error, and
  successful-empty states. Keep feedback actionable and free of raw exception details.
- The [HTTP interceptor](./app/shared/http-error.interceptor.ts) reports network/5xx failures and
  rethrows the original error. Do not replace failures with empty successes or retry every request.
- [GlobalErrorHandler](./app/shared/global-error-handler.ts) handles unexpected unhandled errors;
  [ErrorReporter](./app/shared/error-reporter.service.ts) logs to the browser console. Reporting and
  notifications independently deduplicate object errors by identity; no remote telemetry is configured.
- Give each user-facing error one owner: expected failures use local views; unexpected failures use
  generic feedback through [ToastService](./app/shared/toast.service.ts). Test recovery and shared
  reporting separately, including absence of duplicate toasts.
- HTTP diagnostics include method, `request.url`, status, and the original error. This is not a
  guarantee of URL/query redaction.

## Templates and implementation

- Templates bind data, select states, and forward events to named handlers. Keep expressions cheap
  and side-effect-free; move complex transformations/business decisions to TypeScript or pure helpers/pipes.
- Keep short templates inline; prefer colocated `*.component.html` for large or branching markup.
  For new or substantially rewritten templates, prefer `@if`, `@for`, and `@switch`, tracking stable IDs.
  Do not mix styles in a rewritten template or convert unrelated templates.
- Respect strict TypeScript and Angular checks in [tsconfig.json](../tsconfig.json); use explicit
  models, not `any` or weakened compiler options. Preserve surrounding injection style.
- Follow [Prettier](../.prettierrc) and the existing styling setup in [angular.json](../angular.json).
  Use Tailwind for layout; keep specialized 3D/animation CSS colocated with its component.
- Preserve semantic HTML, keyboard navigation, visible focus, useful image alternatives, responsive
  layouts, and accessible loading/error feedback. Render API text through interpolation; HTML rendering
  needs an explicit requirement and a suitable design.
