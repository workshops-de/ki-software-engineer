---
name: requirements-updater
description: Use when implementation for a GitHub issue appears finished and delivery must be reconciled with the original acceptance criteria before reporting completion or closing the issue. Do not use while requirements or implementation are still in progress.
---

# Requirements Updater

Finish a requirement with evidence and traceability. A demo, diff, or earlier test run is not completion evidence.

## Establish the Contract

**REQUIRED SUB-SKILL:** Use `getting-github-issue-context` to resolve the exact issue and load its discussion, links, and state. Retrieval is read-only.

Read project instructions, the diff, tests, and linked work. Treat the issue and approved follow-up decisions as authoritative. Distinguish amendments from original criteria; never rewrite a criterion to match the implementation.

Create a reconciliation table before claiming completion:

| Criterion and source | Implementation evidence | Test evidence | Status |
|---|---|---|---|
| Exact criterion or scenario | File, behavior, commit, or PR | Test name and fresh command result | Verified, missing, or conflicting |

Report manual observations separately. Mark ambiguous, contradicted, or untested criteria unresolved.

## Verify Delivery

**REQUIRED SUB-SKILL:** Use `verification-before-completion`.

Derive the commands from repository instructions and configuration. Run fresh:

1. focused tests covering the acceptance criteria;
2. the required full test suite, including browser tests when applicable;
3. the production build;
4. any requirement-specific checks such as accessibility, migration, or compatibility verification.

Record commands, exit status, and meaningful counts or failures. Skipped, prior, environment-blocked, or focused-only results do not prove delivery.

Delivery requires every criterion verified, every required command passing, and no implementation/requirement conflict. Otherwise keep the issue open and report exact gaps and next RED/GREEN work. Do not repair code, weaken tests, or redefine scope here.

## Preview the GitHub Update

Prepare an exact preview containing:

- repository and issue;
- the full comment with delivered behavior, reconciliation, verification, and known links;
- the proposed state: remain open or close.

Ask for explicit approval. Do not comment, edit, label, or close before it, even when the initial request asked to finalize. Implementation approval is not mutation approval.

After approval, apply only the previewed mutation. Any change requires a new preview and approval. Never close after a failed gate; an approved blocker comment may leave the issue open.

## Completion Summary

After the mutation attempt, report:

- delivered scope and files or commits;
- criterion totals by verified, missing, and conflicting;
- every verification command and result;
- issue URL, final state, and comment result;
- blockers, deviations, or follow-up work.

Distinguish local verification from GitHub mutation success. State failed comment or close operations plainly.
