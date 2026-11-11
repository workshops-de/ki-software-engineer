---
name: developer-blue
description: Use when an Angular feature has reached GREEN and its implementation needs behavior-preserving structural cleanup before the next requirement. Do not use while tests fail, for feature work, or for speculative architecture redesign.
---

# Developer Blue

## Overview

Refactor a green Angular implementation without changing observable behavior. Use this after `developer-green`; improve one structural concern at a time and keep tests green after every step.

## Establish the Boundary

Read `ARCHITECTURE.md`, `REFACTORING.md`, the root and applicable nested `AGENTS.md` files, the Green implementation, and its tests. Inspect the current diff so unrelated user changes remain untouched.

Run focused tests before editing. If they are not green, stop: Blue cannot repair missing behavior or redefine expectations. Limit work to the current feature unless broader cleanup was explicitly requested. Refactor only demonstrated duplication, mixed responsibilities, inconsistent abstraction levels, unsafe async coordination, or documented standard violations.

## Refactor Incrementally

For each transformation:

1. Name the smell and behavior that must remain unchanged.
2. Make one coherent structural edit.
3. Update only mechanical test imports caused by moves or renames; never weaken assertions.
4. Run the narrowest affected tests and keep the edit only when they stay green.

Stop when the implementation is clear enough. Blue is not permission to redesign the application.

## Angular Project Standards

- Keep one Angular component class per TypeScript file.
- Route components orchestrate feature state and intent through one observable or signal view model. Presentational components receive focused inputs, render, and emit intent; they do not load or mutate feature state.
- Use external HTML for route/page or obscuring templates. Small presentational templates may remain inline.
- Split a component only when the extracted part has an independent responsibility, behavior, or reusable contract. Do not fragment markup into components merely to shorten a file.
- Prefer lazy RxJS or signal composition over constructor work, mutable coordination fields, raw timers, and manual subscriptions.
- Use `switchMap` for replaceable requests, RxJS timing operators instead of `setTimeout`, and `AsyncPipe` or lifecycle-aware interop for consumption.
- Represent mutually exclusive UI outcomes with a discriminated view state such as loading, success, empty/not-found, and error.
- Keep expected failures in feature state and unexpected failures at the application error boundary.
- Templates render state and emit intent; they do not construct requests, classify errors, or perform non-trivial transformations.

### SOLID without ceremony

| Principle | Apply in this project |
|---|---|
| Single responsibility | Separate transport, orchestration, and presentation when they change for different reasons |
| Open/closed | Prefer Angular composition and focused inputs/outputs for demonstrated variation |
| Liskov substitution | Preserve public component, service, and observable contracts during refactoring |
| Interface segregation | Keep component inputs and outputs small and purpose-specific; avoid catch-all configuration objects |
| Dependency inversion | Components depend on feature APIs or orchestration boundaries, never directly on `HttpClient` |

Do not create an interface for every class. Do not introduce NgRx, TanStack Query, a generic repository, a domain layer, or a new shared abstraction without a demonstrated requirement. Code enters `src/app/shared/` only for true application infrastructure or a stable concept already needed by at least two consumers.

Keep each class and method at one level of intent: a route component may express “load books for this query”; URL construction belongs to `BookApiClient`; rendering belongs to the template or a presentational component. Extract feature helpers only when the caller becomes clearer.

## Example

When a route component owns a search term, timer, subscriptions, loading flag, results, and error flag, replace them with one cancellation-aware view-model pipeline. Keep URL construction in the API client and render the discriminated state through `AsyncPipe`; do not add a global store.

## Verify the Refactor

After the focused tests, run:

1. `npm test -- --watch=false`;
2. the Playwright suite when browser-visible structure or routing changed;
3. `npm run build`.

Review the diff for behavior changes, API drift, weakened tests, dependencies, boundary leaks, and formatting churn. If code intentionally diverges from `ARCHITECTURE.md`, update it or record why the new direction is preferable.

## Result

Report smells removed, transformations, files moved or split, mechanical test edits, verification commands, and remaining debt. Never report Blue complete while a required test or build is red.

## Red Flags

| Rationalization | Required response |
|---|---|
| “SOLID requires an interface here” | Add a seam only when substitution or ownership requires it |
| “Smaller files are always better” | Split only at a real responsibility boundary |
| “While here, migrate state management” | Keep the existing lightweight stack unless requirements demand a migration |
| “The test only needs a small assertion update” | Preserve assertions; behavioral changes belong in a new Red-Green cycle |
| “Focused tests passed” | Run the complete verification sequence before completion |
