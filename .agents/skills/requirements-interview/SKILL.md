---
name: requirements-interview
description: Interview the user step by step to clarify a feature's goals, constraints, and scope, then produce a user story with Given/When/Then acceptance criteria and technical notes. Use when the user wants guided requirements discovery or help turning an unclear feature idea into a testable story.
---

# Requirements Interview

Turn the user's feature idea into a clear, testable user story through a conversation. Use the user's language. The deliverable is requirements; do not start implementation or create external work items unless separately requested.

## Interview

- Reuse requirements already supplied in the conversation or relevant provided artifacts. Do not ask the user to repeat answered questions. When existing behavior matters, distinguish inspected sources from the user's desired behavior.
- Ask **one focused question per turn**, then wait for the answer before choosing the next question. Do not send a questionnaire or bundle several decisions into one question.
- Start with the most important missing context, usually the problem or desired outcome. If the user only invokes the skill, ask: "What feature or problem would you like to explore?"
- Adapt follow-ups to each answer. Offer a few short, neutral options when useful, while allowing a free-text answer. Use a question tool if available and suitable; otherwise ask in chat. Never assume a default option is an answer.
- Clarify vague terms through concrete examples or observable outcomes. Ask about contradictions before silently resolving them. Briefly recap decisions when that helps confirm a change in direction; avoid repeating the whole interview each turn.
- Treat "I don't know" or skipped questions as unresolved. Offer a recommendation when helpful, label it as a proposal, and keep it separate from agreed requirements until accepted.

Cover the following topics only to the extent relevant to the feature, in the order that resolves uncertainty best:

- **Goal and value:** whose problem this solves, why it matters, and how success will be observed.
- **Actors and workflow:** who uses it, what triggers it, prerequisites, the normal path, and the expected result.
- **Scope:** the smallest useful version, explicit exclusions, and optional or later work.
- **Rules and exceptions:** business rules, inputs and validation, permissions, empty states, failure behavior, and relevant boundary cases.
- **Constraints:** existing systems and dependencies, compatibility, delivery constraints, and relevant performance, accessibility, security, or privacy needs. Ask for measurable thresholds only where needed; do not invent targets.
- **Technical context:** known affected components, data or API changes, integrations, migrations, and implementation restrictions. Let the user leave technical decisions open.

Do not turn this coverage guide into a fixed sequence or a mandatory checklist of unrelated topics. Prioritize questions that change scope or acceptance criteria.

## Converge

Once the actor, goal, useful scope, and main observable behavior are clear, summarize the proposed story and any material uncertainty. Ask one focused review question about whether the summary reflects the intended feature. If a blocking ambiguity remains, ask about that ambiguity first.

After confirmation, deliver the final story without another approval loop. If the user asks to finish early or requests a draft, produce the best available draft immediately and expose unresolved decisions. Do not describe a draft with unresolved acceptance behavior as ready for implementation.

If the request contains independent goals that need separate stories, explain the split and clarify the first useful slice rather than silently expanding one story into an epic.

## Deliverable

Use this structure, translating prose and headings to the user's language while retaining **Given / When / Then** in acceptance criteria:

### Title

A short title naming the intended behavior.

### User story

As a [actor], I want [capability], so that [value or outcome].

### Scope

- In scope: agreed behavior for this story.
- Out of scope: explicit exclusions or deferred work, when established.

### Acceptance criteria

Number scenarios AC1, AC2, and so on. Give each a short behavior-focused name and write:

- **Given** a concrete initial context or precondition,
- **When** the actor or system performs one triggering action,
- **Then** an observable, testable result follows.

Use **And** for additional conditions or outcomes when needed. Cover the agreed normal path and relevant failures or boundaries. Avoid vague criteria such as "works correctly" or implementation steps that have no required observable outcome. Do not invent limits, roles, error messages, or business rules to fill gaps. Keep criteria consistent with the agreed scope; place unresolved behavior in open questions.

### Technical notes

Record established technical constraints and dependencies. Separate confirmed decisions, inspected current behavior, and implementation proposals. Include affected components or contracts only when supported by the interview or inspected sources. State "No technical decisions established" if appropriate. Technical notes must not silently add acceptance requirements or prescribe an unagreed architecture.

### Open questions and assumptions

Include only unresolved questions and explicitly labeled assumptions that still matter. Identify decisions that block implementation or validation. Omit this section when none remain.

Before delivering, check that each acceptance criterion follows from supplied or confirmed requirements, describes a verifiable outcome, and agrees with the story and scope. This is a review of the requirements, not evidence that the feature has been implemented or tested.
