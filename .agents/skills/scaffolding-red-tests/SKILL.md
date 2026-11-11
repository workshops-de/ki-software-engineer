---
name: scaffolding-red-tests
description: Use when an approved user story with Given/When/Then acceptance criteria is ready for RED-phase test design before production implementation. Do not use while requirements are unresolved or for adding tests after implementation.
---

# Scaffolding RED Tests

## Overview

Turn approved acceptance criteria into executable, intentionally failing tests. One complete Given/When/Then scenario becomes one traceable test case; production code remains untouched.

Use this after `requirements-interviewer` has produced requirements that the developer approved.

## Confirmation Gate

Before creating files or running a test command, inspect the repository read-only and present a compact proposal:

| Criterion | Test level | Planned file and test name | Why this level |
|---|---|---|---|
| AC identifier or scenario | Jasmine unit/component or Playwright UI | Exact target | Behavior covered at this boundary |

Also list the exact commands you intend to run. Then ask:

> Soll ich diese RED-Tests jetzt anlegen und ausführen? Du kannst „nur Unit“, „nur UI“, „anlegen ohne Ausführen“ oder eine Auswahl nennen.

Stop until the developer answers. This gate applies even when the initial request already asks to generate tests. Treat the answer as the execution boundary: do not create or run unapproved test levels, files, browsers, or suites.

## Map Requirements to Tests

Read the applicable `AGENTS.md` files, existing neighboring tests, `package.json`, Angular test configuration, and Playwright configuration before proposing the matrix.

- Map each complete Given/When/Then scenario to exactly one test case.
- Keep `And` clauses in their Given, When, or Then phase as setup, action, or assertion; they do not create extra tests.
- Map every Scenario Outline example row to a separately named test case or generated case.
- Preserve the acceptance-criterion identifier in the test name or an adjacent comment.
- Use Jasmine unit/component tests for isolated logic, component rendering, feature view state, and async coordination.
- Use Playwright only for behavior whose value depends on a real browser journey, routing, or integration between visible surfaces.
- Do not duplicate a scenario at both levels unless the proposal explains the distinct risk each test covers.

## Scaffold the RED Phase

After approval, create only the selected tests. Follow existing project helpers, selectors, naming, and file placement. Prefer observable behavior over implementation details and mocks; mock transport boundaries only when isolation requires it.

Do not add production implementations, production stubs, dependencies, or test-runner configuration. If the approved scenario cannot become an executable test with the current public surface, report that constraint and ask before expanding scope.

Each new test must:

1. arrange the Given state;
2. perform the When action;
3. assert the Then outcome using concrete values from the requirement;
4. fail because the required behavior is absent.

Run only the approved new test files with the narrowest available command, for example:

```bash
npm test -- --watch=false --include='src/app/books/example.component.spec.ts'
npx playwright test tests/example.spec.ts
```

A valid RED result starts the intended runner, selects the intended test, and fails with an assertion or runtime message that identifies the missing behavior. Syntax errors, unresolved imports, broken fixtures, missing browsers, and configuration failures are not RED; repair the test setup and rerun within the approved boundary. Never weaken the expected outcome merely to obtain a cleaner failure.

## Result

Report:

- the criterion-to-test mapping;
- files created or changed;
- commands actually run;
- the expected failure for each test;
- any approved tests not run and why;
- the next production behavior needed to enter GREEN.

Do not claim the suite passes: the deliverable is a controlled, requirement-traceable RED state.

## Common Mistakes

| Mistake | Correction |
|---|---|
| Starting Jasmine and Playwright automatically | Show the matrix and wait for the developer's selection |
| Turning every Given/When/Then line into a separate test | One complete scenario is one test case |
| Testing the same scenario at both levels by default | Choose the cheapest boundary that proves the behavior |
| Accepting compile or setup errors as RED | Make the test executable, then verify the behavioral failure |
| Implementing enough production code to make tests compile | Stop and request explicit scope expansion |
