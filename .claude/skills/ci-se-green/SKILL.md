---
name: ci-se-green
description: Implements minimal production code so failing tests pass (Green phase) using failure output from CI or the user, without running tests, build, or lint locally—GitHub Actions verifies afterward. Use in CI/agent flows after developer-red or when fixing failing tests in automation.
disable-model-invocation: true
---

# CI SE Greem

Implement the requirements from the following issue COMPLETELY in the current branch.

REPO: ${{ github.repository }}
ISSUE_NUMBER: ${{ github.event.issue.number }}
BRANCH: ${{ steps.prepare-branch.outputs.branch_name }}

**IMPORTANT: You are already in the feature branch. Implement the feature completely and create the necessary commits.**

Implements minimal production code so that existing failing tests pass. Complements developer-red, which scaffolds failing tests. **Do not** run `npm test`, Playwright, `npm run build`, or linters here; a GitHub Action will run them after your changes.

## Prerequisites

- Failing test output (from CI logs, pasted output, or artifacts)—enough to see assertions, selectors, and expected behavior
- Failing unit tests target `src/**/*.spec.ts` and/or UI tests in `tests/**/*.spec.ts` when relevant
- Requirements (user story with acceptance criteria) when available

## Workflow

1. **Parse failures** – From the supplied output, identify what each test expects (assertions, selectors, behavior)
2. **Implement minimally** – Add the smallest amount of production code to satisfy each failing test
3. **Hand off to CI** – Stop after code changes; do not execute local test, build, or lint commands

## Principles

- Stick to [Coding Guidelines](./references/coding-guidelines.md)
- **Minimal** – Only add code that makes tests pass; avoid speculative features
- **Don’t change tests** – Fix implementation, not expectations (unless the test is wrong)
- **One test at a time** – Prefer incremental fixes so failures remain understandable

## Angular Implementation

- Follow **Angular 20 best practices**: standalone components, signals, native control flow (`@if`, `@for`, `@switch`), `input()` / `output()`, OnPush
- For **components**: add template bindings, handlers, and logic to satisfy expectations
- For **services**: add methods, HTTP calls (mock in tests), and return values
- Use `TestBed` and `HttpClientTestingModule` / `provideHttpClientTesting()` as already configured in specs

## Output Checklist

- [ ] Implementation maps to each reported failure from the supplied output
- [ ] No local `npm test`, Playwright, `npm run build`, or lint commands were executed
- [ ] Code follows AGENTS.md style (Angular 20, signals, OnPush)
