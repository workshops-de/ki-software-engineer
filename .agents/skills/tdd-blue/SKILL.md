---
name: tdd-blue
description: Perform the TDD blue (refactor) phase after a green implementation by improving code clarity, duplication, and responsibility boundaries while preserving observable behavior and passing acceptance tests. Use after tdd-green or for a scoped behavior-preserving refactor with a green baseline; do not introduce new feature behavior or treat failing acceptance tests as refactoring work.
---

# TDD Blue Phase

Refactor a completed implementation to make it easier to understand and maintain
while keeping the agreed behavior and its tests green. Blue is the refactor phase
of the Red-Green-Refactor loop; it does not start another feature implementation.

## Establish scope and a green baseline

- Reuse the current story, Given/When/Then criteria, user corrections, green-phase
  handoff, changed paths, and test commands. Recover missing requirements with the
  available `context-recovery` skill or the identified source. Do not fetch an issue
  again when sufficient current context is already available.
- Read applicable `AGENTS.md` files and the relevant source and tests. Inspect the
  working tree and preserve existing user changes. Read architecture guidance before
  changing documented boundaries, ownership, or data flow.
- Establish that the relevant acceptance tests and required checks pass before
  refactoring. Reuse fresh executed results only when they cover the intended scope
  and the tested code is unchanged; otherwise run the appropriate baseline selection.
  A historical handoff or successful build alone does not prove a green test baseline.
- Distinguish failing application behavior from runner/setup blockers and unrelated
  failures. If the in-scope baseline is red, report it and stop dependent refactoring;
  restoring required behavior belongs to the green phase. If execution is prohibited
  or blocked, expose the verification limit and do not claim a verified green baseline.

## Choose a useful refactor

- Inspect the implementation completed for this story and directly affected helpers.
  Identify a concrete maintenance problem, such as repeated business logic, unclear
  naming, tangled responsibilities, or an unnecessarily complex control flow.
- Explain the intended simplification, its benefit, and any material tradeoff briefly.
  Prefer small changes supported by the existing design. Do not expand a local
  cleanup into a repository-wide rewrite, introduce speculative abstractions or new
  dependencies, or change architecture merely to match a preferred pattern.
- If the implementation is already clear enough for its scope, say that no useful
  refactor is warranted. Do not manufacture changes to complete the phase.
- Where a planned change affects meaningful behavior that lacks coverage, add a
  focused characterization test of that existing behavior and establish it passes
  before refactoring. Do not encode an identified bug as a new acceptance requirement
  or add tests that merely mirror the implementation's private structure.

## Refactor without changing the contract

- Make small, coherent structural changes, such as improving names, extracting
  genuinely shared logic, simplifying branches, or separating an existing
  responsibility along repository conventions. Keep each change reviewable and
  connect it to the maintenance problem it addresses.
- Preserve public contracts, observable UI/API behavior, and required error and
  lifecycle semantics. Follow agreed acceptance criteria rather than inventing new
  behavior, thresholds, validation rules, or messages during cleanup.
- Keep acceptance assertions, fixtures, and AC-to-test traceability intact. Tests
  may need mechanical import or setup changes when an internal structure moves;
  retain the same Given/When/Then scenarios and observable expectations. Explain
  any necessary test edit instead of silently rewriting the contract to fit the code.
- Do not weaken assertions, remove failing coverage, add skips or expected-failure
  markers, or bypass user interactions to keep the suite green. If an existing test
  is demonstrably wrong, separate that correction and its evidence from refactoring.
- If a real behavior defect or new requirement emerges, report it separately for a
  Red-Green cycle. Continue only independent, behavior-preserving work within the
  authorized scope; do not silently turn blue into a feature or bug-fix phase.
- Update architecture documentation when the refactor changes documented boundaries
  or data flow. Preserve repository constraints and generated-code ownership.

## Keep the checks green and hand off

- After each coherent refactor, run the smallest meaningful affected test selection.
  If it regresses, diagnose and correct the refactor or undo only your own relevant
  edits while preserving the user's existing work. Do not leave an introduced
  regression for the next phase or retry an unchanged failure indefinitely.
- Run affected feature regressions and relevant configured runner/browser variants
  after the final change, plus repository-required builds, formatting, and diff
  checks. Jasmine unit tests and Playwright browser tests verify different layers;
  retain both where the changed behavior depends on them. Select scope by affected
  behavior rather than including unrelated external-site examples automatically.
- Ensure the intended tests were discovered and executed. Separate baseline results,
  post-refactor test results, build results, and source-only conclusions. A zero-test
  run, skipped tests, or a build alone does not prove the refactor stayed green.
- Inspect the final diff for accidental behavioral changes and unrelated cleanup.
  Once required checks pass, stop; repeat checks only for new changes or unresolved
  concerns that justify doing so.
- Return the story/source, the maintenance problem and resulting simplification,
  changed paths, and exact commands with results. Preserve the AC mapping and use a
  compact verification summary such as:
  `test selection / layer / project | green baseline -> post-refactor result`.
  Distinguish verified PASS -> PASS from blocked, unexecuted, or unrelated failures.
  State material limits such as mocked APIs or synthetic inputs when applicable.
- Do not claim behavior equivalence beyond the evidence. If no refactor was useful,
  report that outcome and the checks actually performed. Do not commit, publish,
  deploy, or update the GitHub issue unless separately requested.
