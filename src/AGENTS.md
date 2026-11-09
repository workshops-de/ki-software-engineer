# Application implementation guidance

Applies to `src/` and its descendants, in addition to [the root guidance](../AGENTS.md).
See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full application structure and data flow.

## Structure and dependencies

- Keep Angular components standalone. `main.ts` bootstraps `App`; `app/app.config.ts` owns global providers and
  `app/app.routes.ts` owns application routes. Keep the root shell focused on layout and routing.
- Place feature-specific components, models, and HTTP adapters together under their feature folder. Use `app/shared/`
  for genuinely reusable concerns, such as the existing `ToastService`, rather than book-specific behavior.
- Keep HTTP transport in injectable API services and view state/orchestration in feature containers. Presentational
  components should render inputs and expose interactions without fetching their own data.
- The app uses Angular 20, RxJS, and Zone.js with event coalescing. Do not assume zoneless change detection, SSR,
  NgRx stores, or TanStack Query are configured merely because related dependencies are installed.

## TypeScript, templates, and styling

- Preserve strict TypeScript and Angular template checks. Use explicit model and state types; avoid introducing `any`
  or disabling compiler checks to work around errors.
- Follow the local component style and import standalone template dependencies explicitly. Existing templates mix
  structural directives and built-in control flow; avoid unrelated syntax migrations.
- Bind asynchronous request flows to component lifetime, using `AsyncPipe` where appropriate. When newer user intent
  supersedes a request, cancel obsolete work and keep error handling recoverable for later requests.
- Use Tailwind utilities for application layouts. `styles.css` imports Tailwind; `material-theme.scss` contains global
  Material snack-bar overrides. Keep global styling changes intentional.
- Preserve responsive layouts, semantic links/buttons, keyboard operation, visible focus, and accessible status/error
  feedback when changing views. Render API text through interpolation rather than HTML injection.
- Follow `.prettierrc`: two-space indentation, single quotes, semicolons, no trailing commas, and LF line endings.

For book-specific changes, also follow [app/books/AGENTS.md](app/books/AGENTS.md).
