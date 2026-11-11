---
name: requirements-interviewer
description: Use when a feature, change, or product idea is still rough and needs shared, testable requirements before planning, tests, or implementation. Do not use when an approved specification already defines goals, scope, constraints, and acceptance criteria.
---

# Requirements Interviewer

Turn an incomplete idea into a shared definition of success. Interview before proposing implementation.

## Interview

First inspect any project context the user identified. Do not ask for facts already available there.

Ask one focused question at a time. Base each question on the previous answer and briefly explain why it matters when that is not obvious. Prefer questions that change scope or observable behavior over implementation details.

Until the answers are sufficient for completion, each response consists only of a brief playback of confirmed information followed by exactly one question. A request for an implementable result does not waive the interview; only an explicit request to skip or end it does.

Cover only what the requirement needs:

- problem, intended user, and desired outcome
- measurable or observable success
- current behavior and triggering events
- happy path, alternatives, failures, and important edge cases
- in-scope and out-of-scope behavior
- business, usability, security, compatibility, performance, and delivery constraints that actually apply
- dependencies, unresolved decisions, and assumptions

Play back emerging decisions during the interview so the user can correct them. Clearly label agent proposals as proposals; never present them as user decisions. If an answer exposes a new ambiguity, follow it before moving on.

Do not dump a questionnaire, invent missing product decisions, produce a premature requirements draft, or begin tests, planning, or implementation. If the user asks to stop early, produce the best draft possible and keep unresolved items explicit.

## Completion

Finish when the goal, boundaries, constraints, and observable outcomes are sufficiently clear for focused tests and implementation. Confirm the summarized definition of success with the user before treating the requirement as approved.

At the output stage, read and follow [assets/user-story-template.md](assets/user-story-template.md). Preserve its section order, remove instructional comments and placeholders, and translate headings into the user's language when appropriate.

Acceptance criteria must describe externally observable behavior and use concrete Given/When/Then statements. Include distinct scenarios for relevant success, empty, boundary, permission, and failure cases; do not force irrelevant cases.

Technical notes may record constraints, affected boundaries, dependencies, risks, and investigation needs. They must not silently choose an architecture or expand scope.

## Quality Check

Before presenting the result, verify that:

- every acceptance criterion traces to the stated goal and scope
- vague terms such as “fast,” “easy,” or “secure” are measurable or explicitly unresolved
- assumptions and open questions are visible
- non-goals prevent likely scope creep
- the notes give engineers useful context without prescribing unsupported design choices
