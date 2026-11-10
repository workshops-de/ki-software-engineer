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

See [the architecture summary](ARCHITECTURE.md) for the technology stack, dependencies, application structure, and data flow.

## Local Development

| Command       | Description                                      |
| ------------- | ------------------------------------------------ |
| `npm install` | Installs the packages to develop the Angular app |
| `npm start`   | Starts the Angular app                           |

## Validation

| Command                | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `npm test`             | Run unit tests once in Chrome Headless                               |
| `npm run test:watch`   | Run unit tests in watch mode                                         |
| `npm run test:e2e`     | Run all application browser tests in Chromium                        |
| `npm run test:e2e:all` | Run browser tests in Chromium, Firefox, and WebKit                   |
| `npm run typecheck`    | Check application and test TypeScript                                |
| `npm run format:check` | Check source, test, configuration, and documentation formatting      |
| `npm run build`        | Build for production (Google Fonts inlining requires network access) |

Unit tests require Chrome; set `CHROME_BIN` if it is not automatically detected. Install Playwright's Chromium with
`npx playwright install chromium`, or all configured browsers with `npx playwright install`.
Application browser tests mock the API and do not need a running Bookmonkey API. External-site workshop examples
are preserved in `tests-examples/` and are excluded from the default suite.

## The API

| Command              | Description                                       |
| -------------------- | ------------------------------------------------- |
| `npx bookmonkey-api` | Installs and starts the HTTP API "Bookmonkey API" |

The API provides fake data that you can use in your Angular application.

The frontend's API origin is configured through the `API_BASE_URL` provider in
`src/app/app.config.ts`. Change that provider for a different backend; the book client appends `/books`.

> [!NOTE]
> The API starts at http://localhost:4730.
> When you open this page, you’ll find documentation for all endpoints. 🚀

## VS Code

If you are using [VS Code](https://code.visualstudio.com/) as you editor of choice, you might see a popup after opening this repository.
We added a few plugin recommendations to simplify writing code during the workshop:

1. Angular Language Service - Adds better syntax-highlighting & automatic refactorings
1. Prettier - Formats your code automatically in the same way across your project.
