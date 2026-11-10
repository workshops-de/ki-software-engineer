# Project guidance

## Context and scope

BookMonkey is an Angular workshop SPA for browsing, searching, and viewing books. Read
[ARCHITECTURE.md](ARCHITECTURE.md) before changing application behavior or dependencies; it documents the current
implementation, data flow, known risks, and verification limitations. Use [README.md](README.md) for local setup.
Confirm architectural observations against the current source when making changes.

These instructions apply throughout the repository. Additional instructions apply within their subtrees:

- [src/AGENTS.md](src/AGENTS.md): shared application implementation guidance.
- [src/app/books/AGENTS.md](src/app/books/AGENTS.md): book feature contracts and behavior.

## Working conventions

- Keep changes focused on the requested task and preserve unrelated work in the working tree.
- Follow the existing feature-oriented structure. Avoid adding a global store, repository layer, SSR setup, or new
  dependencies without a concrete requirement. Installed packages do not necessarily represent active architecture.
- Update `ARCHITECTURE.md` when changing documented responsibilities, routes, data flow, or tooling. Distinguish
  implemented behavior from recommendations and report only checks actually performed.
- Use the existing Prettier configuration. Format changed files explicitly; `npm run format.write` touches matching
  files throughout `src/` and does not include root documentation.
- Do not edit generated output in `dist/`, `.angular/`, `playwright-report/`, or `test-results/`.

## Development and validation

Run commands from the repository root:

- `npm install`: install dependencies.
- `npm start`: serve the SPA at `http://localhost:4200`.
- `npm test`: run Jasmine unit tests once in Chrome Headless; install Chrome or set `CHROME_BIN` to a compatible binary.
- `npm run test:watch`: run unit tests interactively in watch mode.
- `npm run test:e2e`: run all application browser tests in Chromium. `npm run test:e2e:all` uses all configured browsers.
- `npm run typecheck`: check application, unit-test, and browser-test TypeScript.
- `npm run format:check`: check project source, test, configuration, and documentation formatting.
- `npx bookmonkey-api`: separately start the development API at `http://localhost:4730` for manual testing.
- `npm run build`: validate the production Angular build. Google Fonts inlining can require network access.
- `node node_modules/typescript/bin/tsc --project tsconfig.app.json --noEmit`: check application TypeScript;
  this does not replace Angular template compilation or browser tests.
- `npx playwright test tests/book-details.spec.ts --project=chromium`: run focused book regression tests with
  intercepted API responses; no running Bookmonkey API is needed. Playwright starts or reuses the Angular dev server.
  If Chromium is missing, install it with `npx playwright install chromium`.
- `npx playwright test tests/book-catalog.spec.ts tests/book-details.spec.ts --project=chromium --reporter=line`:
  run all application book tests, including catalog search races, debounce clearing, and error recovery.
- `npx prettier --check <changed-files>` and `git diff --check`: check formatting and whitespace.

Choose checks appropriate to the change. For application behavior changes, run the build and relevant browser tests,
and extend focused regression coverage when behavior changes. Documentation-only edits need formatting and link review.

Application unit specs live next to their source files. Shared browser mocks and navigation helpers live under
`tests/support/`. External-site workshop examples live in `tests-examples/`, outside default test discovery.
Keep unit-test styles aligned with application styles. Report missing browser binaries or environment restrictions
when they affect validation rather than treating commands as passing.
