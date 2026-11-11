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

Use "## 🤖 Automated issue analysis" as the comment heading for both new comments and updates. Update an existing analysis comment from this automation on the target issue; also recognize the legacy heading "🔄 Updated Analysis". Otherwise create one comment. Preserve unrelated comments.

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

## Publish and verify the analysis comment

Use real line breaks and blank lines in the Markdown body. Preserve inline-code backticks. Do not wrap the entire comment in a code fence or pass a JSON-escaped string as the body.

When using a structured GitHub tool, supply the Markdown body as a string with actual line breaks. When using `gh`, first write the exact body to a UTF-8 file. In Bash, use a quoted heredoc so Markdown backticks and dollar signs stay literal:

```bash
comment_file="$(mktemp)"
cat > "$comment_file" <<'MARKDOWN'
## 🤖 Automated issue analysis

...complete analysis using the sections above...
MARKDOWN
```

Replace the example content with the complete analysis before publishing. Use `gh issue comment "$ISSUE_NUMBER" --repo "$REPOSITORY" --body-file "$comment_file"` to create a comment. To update an existing comment, use its verified numeric ID with `gh api --method PATCH "repos/$REPOSITORY/issues/comments/$COMMENT_ID" -F "body=@$comment_file"`. Resolve the variables from the target issue and its existing comments before running these commands.

Do not place the full Markdown inside shell `--body "..."` or `-f body="..."` arguments. Bash leaves `\n` literal in double quotes and executes unescaped Markdown backticks as command substitutions. Do not use `echo -e` or blanket escape replacement to repair content; write the intended Markdown directly.

After creating or updating the comment, read that exact comment back. Decode the API JSON before checking its `body`: JSON serialization normally escapes line breaks, which alone is not an error. Compare the decoded body with the intended Markdown, including real line breaks, blank lines, and inline-code backticks. When available, also inspect `body_html` to confirm that headings, paragraphs, and lists render separately.

If verification finds a mismatch, correct the same comment once using the file or structured body and verify again. If it still differs, stop and report the comment URL and mismatch; do not add duplicate comments or claim successful publication. Remove the temporary body file after verification.

## Apply the proposed label

After updating or adding the analysis comment, apply the label proposed in its **Next steps** to the issue:

- **SUFFICIENT:** `ready-for-implementation`.
- **NEEDS IMPROVEMENT:** `needs-clarification`.

Check whether that exact label exists in the target repository. If it is missing, create it before assigning it to the issue. Use the available GitHub tools or `gh label create` and `gh issue edit --add-label`, explicitly targeting the repository and issue from the context above. Preserve existing labels and their metadata; repeated runs must not create duplicates.

Verify that the issue has the proposed label. If creation, assignment, or verification fails, report the failure explicitly instead of claiming completion.
