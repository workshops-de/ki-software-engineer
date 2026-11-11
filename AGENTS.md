# Repository guidance

Applies throughout this repository. More specific guidance lives in [src/AGENTS.md](./src/AGENTS.md)
and [src/app/books/AGENTS.md](./src/app/books/AGENTS.md).

## Scope

- Use [README.md](./README.md) for setup and [package.json](./package.json) for scripts. `npm start`
  starts only the frontend; `npx bookmonkey-api` separately starts the external, unpinned API on port 4730.
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) before architectural changes; update it when documented
  boundaries, data flow, or setup change. Check current source rather than relying on historical results.
- Keep changes focused. Do not introduce a store, query cache, SSR, lazy loading, or dependencies without
  a requirement. Explain scoped simplifications and their tradeoffs; propose broader refactors separately.

## Commands and validation

- Run `npm run build` for application changes and select the affected browser specs. Playwright file
  filters are regular expressions; use file names to avoid path-separator escaping. Complete mocked regressions:

```sh
npx playwright test book-details.spec.ts book-list.spec.ts book-carousel.spec.ts global-errors.spec.ts --workers=3 --reporter=line
```

- [Playwright](./playwright.config.ts) starts/reuses the dev server and runs Chromium, Firefox, and
  WebKit. Feature tests mock the API; no real API is needed or verified. Exclude unrelated external-site
  examples from feature checks and verify real-API search semantics separately when affected.
- `npm test` uses the Karma builder, but there are no source unit specs or direct Karma/Jasmine
  dependencies. Execution readiness is unverified; do not assume this supplies working unit coverage.
- `npm run format.write` targets `src` only. Use the installed Prettier CLI with explicit paths for
  root documentation or tests; avoid unrelated formatting.
- Documentation-only changes need formatting, relative-link checks, and `git diff --check`, not
  application builds or browser tests unless a runtime concern is exposed.

## Verification and transparency

Distinguish current implementation, recommendations, assumptions, and historical checks. Report exact
executed commands, results, and material limits; source inspection or a previous pass is not a new test run.
End substantive responses with a short `Verifikationsstatus:` section using only applicable categories:

- `[OK]`: verified through supplied evidence, source inspection, tool output, or executed tests.
- `[INFO]`: existing knowledge without independent verification in this conversation.
- `[ANNAHME]`: interpretation, hypothesis, estimate, or inferred behavior.
- `[OFFEN]`: unknown or unresolved.

Keep it concrete and compact; one line can suffice. Do not use emojis or ASCII boxes.
