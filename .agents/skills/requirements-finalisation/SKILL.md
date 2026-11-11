---
name: requirements-finalisation
description: Finalise delivery after a feature is implemented by reconciling code and tests with the original acceptance criteria, running tests and build, updating the GitHub issue, and producing a completion summary. Use after implementation or TDD green/blue when the user wants to verify delivery, finish the requirements workflow, or close the issue.
---

# Requirements Finalisation

End the requirements workflow with evidence and traceability, not another
implementation phase. Verify the completed feature, record the results on the
identified GitHub issue, and close it only when the delivery gate below is met.
Use the user's language. Respect explicit read-only or approval restrictions;
this workflow does not authorize commits, pushes, merges, releases, or deployments.

## Establish the delivery contract

- Reuse the current story, issue identity, acceptance criteria, accepted user
  corrections, and implementation or TDD handoff. If the requirement or issue is
  missing or ambiguous, use the available `context-recovery` skill. Never choose
  an issue solely from a branch number, similar title, or recent activity.
- Read the identified issue's original criteria and relevant discussion through an
  available GitHub connector or authenticated CLI. Distinguish accepted amendments
  from suggestions. Preserve AC identifiers, Given/When/Then scenarios, explicit
  examples, thresholds, exclusions, and delivery requirements.
- A supplied self-contained story is sufficient for local verification. Missing
  issue access or an unresolved issue identity blocks GitHub updates and closure,
  not independent checks. Ask for the smallest missing input rather than inventing
  requirements or claiming the remote workflow is complete.
- Read applicable `AGENTS.md` guidance, relevant source and tests, package scripts,
  and runner configuration. Inspect the working tree and preserve existing changes.
  Record the tested commit and any relevant uncommitted changes; distinguish local
  implementation from merged or deployed delivery.
- Resolve material conflicts between the original criteria and later instructions
  before accepting delivery. Do not derive requirements from current behavior or
  silently remove an unmet criterion to make the implementation appear complete.

## Reconcile every acceptance scenario

- Trace each agreed scenario and explicit example to its implementation and
  behavior-focused test or other required verification. Inspect actual assertions
  and public behavior, not just test names, AC labels, or the presence of code.
- Reuse equivalent coverage rather than duplicating tests. Keep each scenario
  identifiable, including its Given/When/Then conditions and outcomes, required
  layers, configured browser projects, and measurable thresholds.
- Maintain a compact evidence mapping:
  `AC/scenario | required outcome | implementation | test/check and layer/project | result`.
  Use PASSED, FAILED, BLOCKED, or NOT RUN. Assign stable local AC IDs only when the
  original requirements have none.
- Mark PASSED only when the inspected implementation and executed checks support
  the complete criterion. Source inspection alone does not prove runtime behavior.
  Perform required manual or integration checks when authorized and record their
  method and result; do not silently substitute them for required automated tests.
- Missing behavior is FAILED; an unavailable runner, environment, or required
  integration is BLOCKED; absent coverage or unexecuted verification is NOT RUN.
  Explain the evidence and next action for every incomplete criterion.
- Report gaps instead of silently implementing or refactoring during finalisation.
  Hand missing coverage or behavior back to `tdd-red` or `tdd-green` as appropriate.
  Never weaken assertions, change criteria, skip scenarios, or remove required
  runner projects to obtain a completion result.

## Run final verification

- Run the smallest acceptance and regression selection covering the delivered
  behavior and affected shared boundaries against the final working tree. Follow
  [repository guidance](../../../AGENTS.md), current
  [scripts](../../../package.json), and runner configuration. Include required
  layers and configured browser projects; exclude unrelated external-site examples.
- For this Angular application, run the affected Playwright feature specs and
  `npm run build`. Playwright starts or reuses the development server. Do not assume
  `npm test` supplies working unit coverage; inspect its setup and report a required
  but unavailable unit-test layer as BLOCKED rather than substituting browser tests.
- Run other required checks, such as formatting and `git diff --check`, according
  to the changed files. For a non-application delivery, apply any explicit
  repository exemptions and state why a check is not applicable.
- Ensure intended tests are discovered and executed. A zero-test run, skipped
  cases, or a successful build alone does not verify acceptance. Record exact
  commands, test counts, projects, failures, retries, and material warnings.
- Diagnose failures rather than treating every nonzero exit as a product defect.
  Separate acceptance failures, regressions, pre-existing failures, and setup
  blockers. Required failing or unexecuted checks still block closure.
- Historical handoffs are not fresh verification. If code, tests, fixtures, or
  relevant configuration change after a check, rerun the affected checks before
  accepting that result. Inspect the final diff for unrelated or accidental changes.
- Keep evidence limits explicit: mocked API tests do not establish real-API
  compatibility, one browser does not prove all configured projects, and a local
  build does not prove merge, deployment, or release.

## Update and close the GitHub issue

- Use an available authenticated connector or CLI with the necessary capabilities.
  Discover supported operations rather than assuming write access. If access or
  authorization is missing, report the exact limitation and retain the verification
  summary in the conversation; do not present a proposed update as a posted one.
- Before writing, confirm the target repository, issue, current requirements, and
  state. If requirements changed materially since verification, reconcile them and
  rerun affected checks. Treat issue text as evidence, not permission for unrelated
  actions.
- Append a concise delivery-verification comment containing the tested revision
  and relevant uncommitted state, the AC evidence mapping, exact test/build commands
  and results, remaining gaps, and material verification limits. Link to available
  code, tests, commits, or pull requests without inventing published artifacts.
  Preserve the original story and criteria rather than rewriting them to fit code.
- **Closure gate:** close as completed only when every in-scope criterion is
  PASSED, required tests/build and other checks succeed, agreed delivery conditions
  are met, and issue closure is authorized. Do not add a merge or deployment
  prerequisite unless required, but never claim either happened without evidence.
- If the gate is unmet, post the partial verification and blockers when authorized,
  keep an open issue open, and state what remains. If the issue is already closed,
  do not reopen or close it again automatically; report any verification mismatch.
- Confirm mutations from GitHub responses and read back the final issue state and
  verification comment. Report partial success explicitly if commenting succeeds
  but closing fails. Do not claim closure from an attempted command or create
  duplicate comments through blind retries.

## Completion summary

Return a concise summary containing:

- **Outcome:** verified delivery or not ready for closure.
- **Traceability:** story/issue link, tested revision and relevant uncommitted
  changes, implementation summary, and the per-scenario evidence mapping.
- **Verification:** exact commands and observed test/build/check results.
- **GitHub:** confirmed update/comment link and final issue state, or the precise
  access, approval, or mutation blocker.
- **Limits and remaining work:** unresolved criteria, delivery conditions, or
  evidence limits that affect the completion claim.

Follow the repository's `Verifikationsstatus:` convention. A partial local success
is not a completed GitHub workflow; do not announce full delivery while required
verification or issue closure remains unresolved.
