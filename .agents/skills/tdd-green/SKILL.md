---
name: tdd-green
description: Implement the TDD green phase for a GitHub user story or supplied acceptance criteria by making confirmed failing acceptance tests pass with focused production changes. Use after a red-phase handoff or for test-first implementation with existing failing tests, including Jasmine and Playwright. Preserve passing behavior and stop before the refactor phase.
---

# TDD Green Phase

Make the story's acceptance tests pass through the smallest coherent implementation
that satisfies the agreed behavior. Preserve the acceptance contract and existing
passing behavior, then hand off before the refactor phase.

## Establish the requirement and current red baseline

- Reuse the identified story, Given/When/Then criteria, user corrections, and
  red-phase handoff, including AC IDs, test locations, runner projects, commands,
  and failure reasons. If the requirement is missing or ambiguous, use the
  available `context-recovery` skill or recover the identified source directly.
  Do not fetch the same issue again when sufficient current context is available.
- Read applicable `AGENTS.md` files, relevant source, test setup, and nearby tests.
  Inspect the working tree before editing and preserve unrelated or unfinished work.
- Reproduce the relevant failures against the current working tree using the
  smallest meaningful test selection. A previous report is context, not a fresh
  baseline. Record each scenario as RED, PASS, BLOCKED, or NOT RUN.
- Confirm that each RED case fails because the required behavior is missing or
  incorrect. Compilation errors, unavailable browsers, broken fixtures, and runner
  startup failures are setup blockers. Diagnose a browser timeout before treating
  it as an acceptance failure; identify the actual missing or blocked interaction.
- If a required scenario lacks an executable test, use the available `tdd-red`
  skill or write a behavior-focused test before implementing that scenario. Keep
  one traceable test case per Given/When/Then scenario, including explicit examples.
- Preserve already passing scenarios. If everything in scope already passes, report
  that result without forcing a failure or making unnecessary production changes.
  If execution is prohibited, report NOT RUN and do not claim a verified transition.

## Implement the missing behavior

- Connect each change to an agreed acceptance criterion or a necessary enabling
  change. Trace the failure through the real public interface and implementation
  before changing code. Follow the repository's existing architecture and ownership.
- Implement only what the criteria require, using existing components, services,
  state, and dependencies where suitable. Do not add speculative features, a new
  framework, broad restructuring, or unrelated cleanup. Read and update architecture
  documentation when required by the repository and the actual boundary change.
- Keep fixtures and mocks at external boundaries. Implement the behavior in the
  application rather than mocking it away or adding code that recognizes test
  names, fixture IDs, or the test environment solely to return expected answers.
- Preserve test assertions and scenario coverage. Do not delete or skip failures,
  mark them as expected, weaken expectations, or remove a failing browser project
  to obtain green. Do not bypass required user interactions with forced actions or
  replace behavior checks with snapshots of the current implementation.
- Correct a demonstrably invalid test or fixture only when the requirement or
  inspected contract supports the correction. Explain the evidence, preserve the
  intended scenario, and rerun it. An invalid original test does not establish a
  verified red-to-green transition; establish a valid baseline where possible.
- Do not invent business rules, thresholds, exact copy, or public contracts to
  satisfy ambiguous criteria. Ask for blocking decisions while continuing with
  independent criteria. Obtain any required authorization for broader setup or
  dependency changes; a green-phase request does not expand deployment permissions.

## Verify the transition

- Run the originally failing selection after the relevant implementation change.
  If it still fails, inspect the new output and correct the supported cause. Change
  the approach when evidence changes; do not retry unchanged failures indefinitely.
  Stop a dependent path when it requires an unresolved decision or unavailable setup.
- Once the targeted behavior passes, run the affected feature regressions and
  configured browser projects or runner variants relevant to the change. Preserve
  coverage across Jasmine unit tests and Playwright browser tests when both exist;
  one runner or browser passing does not prove the others pass.
- Run repository-required builds and checks for application changes. Select the
  regression scope by affected behavior and shared boundaries; do not fall back to
  unrelated external-site examples or a full repository suite without a reason.
- Ensure the intended tests were discovered and executed. A zero-test run, skipped
  tests, or a successful build alone does not establish green. Separate test results,
  build results, and source-only conclusions. Mocked browser checks do not establish
  real API compatibility, and synthetic inputs do not establish physical-device behavior.
- After required checks pass, inspect the diff for scope and unintended changes.
  Do not continue into the separate refactor phase or repeat successful checks
  without new changes, failures, or unresolved concerns that justify doing so.

## Hand off

Return the story source, the implementation change and its purpose, changed paths,
and a compact mapping:
`AC/scenario | test title or location | layer/project | before -> after`.

Report exact commands and observed results. Distinguish verified RED -> PASS from
criteria that were already passing, blocked, unexecuted, or remain uncovered.
Identify remaining failures and whether they were observed in the baseline or
introduced by this work. Call the requested scope green only when its acceptance
tests and required checks pass; a narrower success is a partial result.

Stop after the green-phase handoff. Do not commit, publish, deploy, or modify the
GitHub issue unless the user separately requested those actions.
