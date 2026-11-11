---
name: tdd-red
description: Create the TDD red phase from a GitHub user story or supplied acceptance criteria, mapping each Given/When/Then scenario to an executable test case using the project's frameworks, such as Jasmine for unit tests and Playwright for browser tests. Use for test-first scaffolding; stop before implementing the feature or refactoring production code.
---

# TDD Red Phase

Turn acceptance criteria into behavior-focused tests and establish which ones fail
because the required behavior is missing. Deliver test code and evidence, then stop
before the green or refactor phases.

## Establish the story and test environment

- Reuse the current issue URL, repository, story text, acceptance criteria, and later
  user corrections. If the active requirement is missing or ambiguous, use the
  available `context-recovery` skill; otherwise recover it through repository
  context and an available GitHub connector or authenticated CLI. For example:
  `gh issue view ISSUE_NUMBER --repo OWNER/REPO --comments`.
- Read the identified issue and relevant discussion when accessible. Distinguish
  agreed criteria from suggestions and record whether the source was read live or
  supplied by the user. If access fails, request the issue text; do not invent it
  or choose an issue solely from a similar title or branch number.
- Read applicable `AGENTS.md` files, package scripts, test configuration, nearby
  tests, and the relevant public interfaces. Reuse existing test conventions and
  helpers. A declared package or configured builder does not prove a runner works.
- Use the requested framework when available. Otherwise choose the existing runner
  at the appropriate layer. Jasmine unit tests and Playwright browser tests serve
  different purposes; do not call browser tests unit tests or silently substitute
  one layer for a specifically requested layer.
- Missing dependencies, runner configuration, or public interfaces are setup gaps.
  Report the smallest necessary enabling change. Do not install packages, change
  configuration, or add production stubs merely to manufacture a red result.

## Map every acceptance scenario

- Preserve existing AC identifiers; assign stable local IDs such as AC1 only when
  none exist. Each complete Given/When/Then scenario becomes a distinct test case,
  with its AC ID in the test title. Expand explicit example rows into separate
  executable cases; parameterization is fine when each row is reported separately.
- Keep **Given** as fixture/setup, **When** as the triggering action, and **Then**
  as observable assertions. Include their **And** conditions and outcomes in the
  same scenario. Do not split one scenario into unrelated tests or combine several
  scenarios into a single smoke test.
- Choose the lowest layer that faithfully exercises the criterion: isolated logic
  or component behavior for unit tests, browser interaction for user journeys.
  Cover every scenario at least once; do not duplicate every AC in both runners
  unless requested or needed for distinct behavior.
- Map to an existing equivalent test when appropriate instead of adding a duplicate.
  If both layers are explicitly requested, provide meaningful coverage in each and
  explain any AC that cannot be represented faithfully at a requested layer.
- Derive expected values from the story, not from current implementation output.
  Do not invent business rules, exact copy, limits, or contracts to fill gaps. Ask
  for blocking clarification and continue with independent, unambiguous criteria.

## Scaffold executable tests

Write real arrangements, actions, and assertions. Use an AC-bearing title such as
`AC2: Given an empty collection, when opened, then show the empty state`, and mark
the setup, action, and assertions with Given / When / Then comments where useful.

For **Jasmine**, follow the existing `describe` / `it` organization and Angular
`TestBed` setup when applicable. Exercise real public behavior with isolated
collaborators. Handle asynchronous completion using the project's established
pattern. Assert returned values, rendered output, or required observable effects;
do not assert private implementation details or mock the behavior under test.

For **Playwright**, use the configured projects, base URL or established app URL,
fixtures, and API mocking conventions. Register network fixtures before navigation
or the triggering action. Prefer role/label locators and awaited observable
assertions over arbitrary sleeps. Mock external boundaries, not the UI behavior
being accepted. Mocked responses do not verify real API compatibility.

Keep scenarios independent. Add only necessary test files, fixtures, and helpers.
Preserve unrelated work. Do not implement the feature, refactor application code,
weaken existing assertions, or add skipped/pending tests, expected-failure markers,
unconditional failures, or empty bodies as substitutes for a red test.

If a new API or UI element does not exist yet, target an agreed public contract
only when it can be exercised meaningfully. A missing import or invented selector
alone is not evidence that the acceptance behavior has been tested.

## Verify red and hand off

- Run the smallest relevant test selection permitted by the task and repository.
  Use noninteractive execution where supported. Ensure new cases are discovered;
  a zero-test run is not evidence. Run each affected runner when both layers changed.
- Classify each scenario from actual output:
  - **RED:** a discovered, executed case fails because the required behavior is
    absent or incorrect. Identify the failed expectation or missing required
    interaction and connect it to the AC.
  - **PASS:** the criterion already passes. Preserve this result; never force a
    failure by changing expectations or breaking the implementation.
  - **BLOCKED:** compilation, missing imports, runner/browser availability, server
    startup, fixtures, or another setup problem prevents a meaningful assertion.
  - **NOT RUN:** execution was prohibited or not performed; give the reason.
- For browser timeouts, distinguish a missing required element or interaction from
  a page that never loaded, a bad locator, or a fixture error. Do not report every
  timeout or nonzero exit code as successful red-phase verification.
- Correct mistakes in new test code or fixtures and rerun the affected selection.
  If reaching a meaningful failure requires production implementation or broader
  setup changes, stop that path and report the blocker. Do not enter the green phase.
- Return the story source, changed test paths, and a compact mapping:
  `AC/scenario | test title or file location | layer | RED/PASS/BLOCKED/NOT RUN`.
  Include the exact commands run and observed failure reasons. Keep ambiguous or
  uncovered criteria visible; do not call the whole story red when some cases are
  blocked, passing, or unexecuted.
