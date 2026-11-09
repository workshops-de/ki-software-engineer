# Repository guidance

Applies throughout this repository. More specific guidance lives in [src/AGENTS.md](./src/AGENTS.md)
and [src/app/books/AGENTS.md](./src/app/books/AGENTS.md).

## Context and scope

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) before architectural changes. It describes the current
  BookMonkey Angular workshop application, including known limitations and historical verification.
  Check the relevant source before relying on it; past test results are not evidence for new changes.
- Use [README.md](./README.md) for local setup and [package.json](./package.json) for available scripts.
- Keep changes focused on the requested behavior. Do not introduce a store, query cache, SSR, lazy
  loading, or new dependencies just because related packages appear in the manifest.
- Update the architecture document when changing documented boundaries, data flow, or setup.
- Propose a simpler or more consistent approach when the requested work exposes duplicated logic,
  unclear state ownership, or inconsistent error handling. Explain the benefit and tradeoff; apply
  improvements within the task's scope and describe broader refactors as follow-up proposals.
- Distinguish the current implementation from recommended patterns in the scoped guidance. An
  architectural recommendation is not evidence that the corresponding behavior is implemented.

## Commands and validation

- `npm install`: install dependencies from the existing manifest and lockfile.
- `npm start`: start the Angular development server at `http://localhost:4200`.
- `npx bookmonkey-api`: separately start the workshop API at `http://localhost:4730`; this package
  is not a project dependency and its version is not pinned here.
- `npm run build`: production build; use for application changes.
- `npx playwright test tests/book-details.spec.ts --workers=3 --reporter=line`: targeted book-detail
  browser tests with mocked API responses in Chromium, Firefox, and WebKit. Playwright starts or
  reuses the development server. These tests do not require the real API.
- For the complete application regression scope, also include `tests/book-list.spec.ts` and
  `tests/global-errors.spec.ts` in that command. These cover search/recovery and shared error handling.
- Select tests relevant to the change. The full Playwright suite also includes external-site examples;
  mocked feature tests do not verify real-API compatibility or search semantics.
- `npm test` invokes the configured Karma builder, but its execution readiness is unverified.
  Do not assume it is a working unit-test suite.
- `npm run format.write` formats supported files under `src` only. For root documentation or tests,
  invoke the installed Prettier CLI with explicit file paths. Avoid unrelated formatting changes.
- For documentation-only edits, check formatting, relative links, and `git diff --check`; application
  builds and browser tests are unnecessary unless the edit exposes a runtime concern.

## Verification and transparency

Never present assumptions, inferred behavior, or unexecuted checks as verified facts. Distinguish
documented behavior, behavior tested in this task, and theoretical expectations. Report which checks
ran, their results, and relevant checks that remain unperformed.

End every substantive response with a short `Verifikationsstatus:` section. Include only applicable
categories, with concrete details:

- `[OK]`: actually verified through supplied evidence, source inspection, tool output, or executed tests.
- `[INFO]`: derived from existing knowledge without independent verification in this conversation.
- `[ANNAHME]`: interpretation, hypothesis, estimate, or inferred behavior.
- `[OFFEN]`: unknown, unresolved, or not reliably answerable.

Keep this section unobtrusive; a single status line suffices for simple replies. Do not use emojis
or ASCII boxes.
