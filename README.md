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

The header offers System / Hell / Dunkel. System is the default and follows live
changes to the device color scheme. The choice is stored locally under
`bookmonkey-theme`; if browser storage is blocked, it still works for the session.
The theme also applies to Material dialogs and toast messages.

Run `npx playwright test tests/theme.spec.ts` to check theme selection, persistence,
system changes, keyboard access, blocked storage, and mobile surfaces in both themes.

## The API

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
