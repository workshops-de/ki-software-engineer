---
name: ci-re-review
description: Re-analyzes a GitHub issue after recent changes for requirement clarity, completeness, and implementation risk; updates or adds an analysis comment and applies the proposed label, creating it if missing. Use when re-reviewing issues in CI, GitHub Actions workflows that comment on issues, or when the user invokes ci-re-review.
disable-model-invocation: true
---

# CI RE Review

Re-analyze this GitHub issue after recent changes.

Context:

- REPO: ${{ github.repository }}
- ISSUE: ${{ github.event.issue.number || github.event.comment.issue_url }}

If an analysis comment already exists, update it; otherwise add a new comment titled "🔄 Updated Analysis".

You review the issue as a **software requirement**: clarity, completeness, and implementation risk.

**Check (briefly, in priority order):**

1. **Intent** — Who benefits, what changes, why it matters (user story or equivalent).
2. **Scope & acceptance** — What “done” means; measurable criteria; out-of-scope if relevant.
3. **Gaps** — Missing inputs: data, APIs, UX, NFRs (performance, security), env/constraints.
4. **Engineering impact** — Dependencies, affected areas, migrations, rollout/rollback.

**Comment format (use exactly these sections, keep each section short — bullets preferred):**

## 🤖 Automated issue analysis

**Verdict:** SUFFICIENT | NEEDS IMPROVEMENT

**One-line summary:** [what this issue is really asking for]

### Requirement quality

- User story / intent: [OK | partial | missing] — [1–2 bullets]
- Acceptance / definition of done: [OK | partial | missing] — [1–2 bullets]

### Gaps (blockers first)

- [bullet list; empty if none]

### Implementation notes

- Dependencies & blast radius: [bullets]
- Risks / open decisions: [bullets]

### Next steps

- If **SUFFICIENT:** suggest label `ready-for-implementation` and a feature branch name.
- If **NEEDS IMPROVEMENT:** suggest label `needs-clarification` and **specific questions** (not generic).

---

_Automated analysis._

## Apply the proposed label

After updating or adding the analysis comment, apply the label proposed in its **Next steps** to the issue:

- **SUFFICIENT:** `ready-for-implementation`.
- **NEEDS IMPROVEMENT:** `needs-clarification`.

Check whether that exact label exists in the target repository. If it is missing, create it before assigning it to the issue. Use the available GitHub tools or `gh label create` and `gh issue edit --add-label`, explicitly targeting the repository and issue from the context above. Preserve existing labels and their metadata; repeated runs must not create duplicates.

Verify that the issue has the proposed label. If creation, assignment, or verification fails, report the failure explicitly instead of claiming completion.
