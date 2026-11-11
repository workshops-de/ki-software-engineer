<h1 align="center">Modern Angular Workshop</h1>

<p align="center">
  <img alt="workshops-de-logo-blue" src="docs/logo-workshops-de.png" width="120">
  <br>
  <em>The best way to start embracing AI for your all-day development tasks</em>
  <br>
</p>

<p align="center">
  <a href="https://workshops.de/seminare-schulungen-kurse/angular-ai-agent-driven-development" target="_blank"><strong>workshops.de</strong></a>
  <br>
</p>

## Architecture

Ein Architekturreview mit Aufbau, Datenfluss, Risikobewertungen und priorisierten Empfehlungen findest du in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Local Development

| Command       | Description                                      |
| ------------- | ------------------------------------------------ |
| `npm install` | Installs the packages to develop the Angular app |
| `npm start`   | Starts the Angular app                           |

## Color scheme

The header has an icon button that cycles through System → Hell → Dunkel → System.
Its monitor, sun, or moon icon shows the current mode; the tooltip names the current
and next mode. System is the default and follows live
changes to the device color scheme. The choice is stored locally under
`bookmonkey-theme`; if browser storage is blocked, it still works for the session.
The theme also applies to Material dialogs and toast messages.

Run `npx playwright test tests/theme.spec.ts` to check theme selection, persistence,
system changes, keyboard access, blocked storage, and mobile surfaces in both themes.

## The API

### BookMonkey Universe

The planet icon in the header opens `/universe`, a lazy-loaded Three.js galaxy of
the full collection from the existing `getAllBooks()` endpoint. Start the frontend
with `npm start` and the separate API with `npx bookmonkey-api` as usual. No extra
server, API key, example books, or graphics assets are needed.

In Universe, the same header control shows a list icon and returns to the normal
book collection at `/`. Its tooltip and accessible label name the destination.

`src/app/book-universe/` contains the standalone Angular screen (local Signals,
search, panels and Discovery controls), `universe-data.ts` (pure classification,
layout, relationships, search and camera calculations), and `universe-renderer.ts`
(GPU resources, OrbitControls, picking, labels and camera flights). Book models,
list behavior and API endpoints remain unchanged. The existing `BookDialogService`
opens fresh details by ISBN; confirmed and unconfirmed editor saves reload Universe.

The current model has no categories, tags, rating or publication year. Topics are
explicitly marked as inferred: normalized title, subtitle and description are
checked in priority order for Angular, Security, databases, architecture,
performance, JavaScript/TypeScript and web-development keywords; unmatched books
go into “Weitere Themen”. The exact dictionaries live in `universe-data.ts`.
Sorting by ISBN, a stable ISBN hash and a golden-angle spiral make positions
reproducible independently of API order. Cluster spacing adapts to collection size.
Planet radii use the square root of page count, clamped to 0.8–1.8; missing or
nonpositive counts use radius 1. Invalid records and duplicate ISBNs are counted
and skipped visibly.

Relationships score an identical normalized author string at 6, a shared inferred
topic at 2 (excluding the fallback topic), and shared nontrivial words at up to 3.
The strongest candidates with score ≥3 are retained, capped at three edges per
book; six candidates per source bound intermediate storage. Reasons appear beside
related books. This is a deterministic heuristic, not a claim about actual book
categories or semantic similarity. Pair comparison is quadratic with bounded
keyword sets; layout tests cover 50, 200, 500 and 1,000 books.

Drag to orbit, scroll/pinch to zoom, right-drag to pan, click to select and
double-click to fly to a book. Search supports accents, multiple words, arrow keys,
Enter and Escape. The HTML book list also makes every book selectable without
canvas interaction. Discovery visits clusters and ISBN-sorted books with start,
pause, resume, previous, next and stop controls; manual camera input and hidden
tabs pause it. Reduced motion disables rotation, floating and extended flights.

During camera flights, a procedural Galaxy-class USS Enterprise NCC-1701-D appears
in chase view with an oval saucer, twin glowing warp nacelles and a gentle bank.
It fades out on arrival and disappears on cancellation, Discovery pause/stop or
navigation. Reduced motion skips the ship animation. The model uses shared Three.js
geometry and materials, requires no external assets and is disposed with the scene.

Planets and halos use shared instanced geometry, links are batched, labels are
bounded and culled, and device pixel ratio is capped. ResizeObserver refits on
aspect changes. The renderer owns and releases listeners, controls, labels,
observers, animation loops, geometry, materials and WebGL resources. Missing WebGL,
initialization failure and context loss show an operable searchable HTML fallback.
On phones details appear as a bottom sheet. Frame rate remains device-dependent;
the 1,000-book logic tests are not a GPU benchmark.

```sh
npm run build
npx playwright test tests/universe-data.spec.ts tests/book-universe.spec.ts --workers=1
```

Tests use the existing Playwright runner, including browser-independent logic
tests, actual WebGL picking and flight, keyboard search, details/edit refresh,
mobile fallback, context loss and repeated route cleanup. Chromium tests explicitly
enable SwiftShader for headless machines. See the upstream
[InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) and
[OrbitControls](https://threejs.org/docs/pages/OrbitControls.html) documentation.

### Random reading idea

The dice button in the header opens a dialog with a two-second 3D dice animation
with changing book cover previews on all six faces instead of dice pips. It selects from the entire collection independently
of the current search. Every book has the same chance; consecutive rolls may pick
the same book. The result offers another roll or the existing book details editor.
Saving there refreshes the list with its current search.

The dialog supports keyboard focus, both themes, reduced motion, missing/broken
covers (including the dice faces), empty collections, and retry after a load failure.
Reduced motion keeps both the dice and its cover previews still. Closing cancels pending
requests and animation timers. Collection requests time out after 15 seconds.

`GET /books` without `q` or `_limit` supplies the full selection pool. Verified
against the local API on 2026-11-10: 250 books with 250 distinct ISBNs, compared
with 10 books from `GET /books?_limit=10`.

Run `npx playwright test tests/book-random.spec.ts` for the mocked dice flow.

### Details and editing

Book details use `GET /books/:isbn`; editing sends the full book to `PUT /books/:isbn`,
including its unchanged `id`, `userId`, and ISBN. `price` remains a string.
See the [Bookmonkey API documentation](https://www.npmjs.com/package/bookmonkey-api).

### ISBN validation

`isValidIsbn(value)` in `src/app/books/isbn.ts` checks ISBN-10 and ISBN-13 format
and checksums. It accepts whitespace, hyphens, and a final `X` or `x` for ISBN-10;
ISBN-13 requires a `978` or `979` prefix. Empty strings, other characters, wrong
lengths, and incorrect check digits return `false`. It does not verify registration,
separator placement, or whether a book exists. The function is independent of the
editor, where the ISBN remains read-only and is preserved as the API key.

Run `npx playwright test tests/isbn.spec.ts --project=chromium` for the function
tests using the existing Playwright runner; these tests do not launch a browser.

### Book details checks

```sh
npm run build
npx playwright install
npx playwright test tests/book-details.spec.ts tests/book-search.spec.ts
```

The Playwright suite starts Angular and mocks API responses; no running API is needed.
It covers keyboard access, details, draft cancellation, validation, saving and search
refresh, load/save failures, and a mobile viewport with a broken cover.
Search checks cover debouncing, stale responses, clearing, empty results, and retry.
Detail requests time out after 15 seconds. An unconfirmed save keeps the draft visible
and allows closing; reload the saved version before editing again. Reloading discards
the draft. Closing after an unconfirmed save refreshes the list without claiming success.

The local API was unreachable during implementation. When it is available, verify
the live contract using a disposable book: GET by ISBN returns a complete `Book`,
PUT by the same ISBN accepts and returns the complete updated book, preserves
`id`/`userId` and string `price`, and a subsequent GET returns the saved values.
Also check a missing ISBN returns HTTP 404 and that browser CORS permits GET/PUT.

| Command              | Description                                       |
| -------------------- | ------------------------------------------------- |
| `npx bookmonkey-api` | Installs and starts the HTTP API "Bookmonkey API" |

The API provides fake data that you can use in your Angular application.

> [!NOTE]
> The API starts at http://localhost:4730.
> When you open this page, you’ll find documentation for all endpoints. 🚀

## VS Code

If you are using [VS Code](https://code.visualstudio.com/) as you editor of choice, you might see a popup after opening this repository.
We added a few plugin recommendations to simplify writing code during the workshop:

1. Angular Language Service - Adds better syntax-highlighting & automatic refactorings
1. Prettier - Formats your code automatically in the same way across your project.
