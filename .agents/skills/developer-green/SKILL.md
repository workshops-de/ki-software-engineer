---
name: developer-green
description: Use when verified failing tests define an approved feature and production code must be implemented to reach GREEN before refactoring. Do not use for writing new tests, unresolved requirements, or already-green behavior.
---

# Developer Green

## Overview

Turn a trustworthy RED state into GREEN with the smallest production change that satisfies the tests and approved requirements. Tests are the executable contract, not implementation material to reshape for convenience.

Use this after `scaffolding-red-tests` or an equivalent RED phase.

## Establish a Trustworthy RED

Read the applicable `AGENTS.md` files, approved requirements, failing tests, neighboring production code, and test configuration. Run the narrowest command that selects the supplied tests before editing production code.

For every failing test, record:

| Test | Observed failure | Expected behavior | Production boundary |
|---|---|---|---|
| Exact test name | Actual message/value | Matcher and requirement imply | Smallest file or API that owns it |

Parse assertions together with their Given/When setup. Matchers define observable outcomes; fixtures, spies, and mocks identify boundaries but do not automatically prescribe internal design.

Proceed only when each selected test:

- runs rather than failing to compile or initialize;
- fails for the behavior it is meant to introduce;
- agrees with the approved acceptance criterion; and
- can coexist with the other tests and preserved behavior.

If a test already passes, is ambiguous, contradicts a requirement or another test, asserts an unsupported implementation detail, or fails because its setup is broken, stop. Explain the evidence and ask the developer before changing that test.

## Protect the Tests

Do not edit, delete, skip, focus, weaken, replace, or regenerate tests to obtain GREEN. Do not loosen matchers, update snapshots, add arbitrary waits, or change fixtures so the required behavior disappears.

When a test is demonstrably wrong, propose the smallest correction and wait for explicit approval. After an approved correction, run it and confirm the corrected test reaches a valid RED state before implementing production code.

## Implement the Minimum

Work one failing behavior at a time:

1. Identify the smallest production boundary responsible for the expectation.
2. Implement only the behavior and concrete cases demanded by the current tests and requirements.
3. Run the targeted test immediately.
4. If it remains red, change production code based on the failure evidence; do not negotiate with the assertion.
5. Continue until all selected RED tests pass.

Follow existing feature boundaries and public APIs. Keep transport concerns in API clients and expected failures in explicit feature view state. Do not add speculative abstractions, dependencies, unrelated refactors, or untested behavior. A straightforward conditional is preferable to a generalized framework when both satisfy the contract.

### Example

Given `expect(viewState()).toEqual({ kind: 'empty' })` after an API returns `[]`, implement only the empty-result transition at the feature state owner. Do not introduce a generic state machine, change the matcher to accept `undefined`, or special-case the test fixture.

## Verify GREEN

Run verification from narrow to broad:

1. each targeted Jasmine or Playwright test after its production change;
2. all supplied RED-phase tests together;
3. `npm test -- --watch=false`;
4. the full Playwright suite when UI tests or browser behavior changed;
5. `npm run build`.

All intended tests must pass without skipped or focused cases. If an unrelated or pre-existing failure appears, name it and diagnose it; never hide it or claim the suite is green.

## Result

Report the expectation-to-production mapping, production files changed, commands run, passing counts, and any unresolved failures. State explicitly whether tests were changed; if so, identify the developer approval and the valid RED result observed after the correction.

## Red Flags

| Rationalization | Required response |
|---|---|
| “The test is too strict” | Compare it with the approved requirement; ask before changing it |
| “Updating the snapshot is faster” | Implement the required output |
| “This helper will be useful later” | Omit it until a test requires it |
| “The focused tests pass, so we are done” | Run the complete verification sequence |
| “That failure is unrelated” | Name and diagnose it; do not report all-green |
