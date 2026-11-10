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
