---
name: getting-github-issue-context
description: Use when a GitHub issue provides the requirements or background for planning, implementation, debugging, or review in this project.
---

# Getting GitHub Issue Context

## Overview

Load the authoritative issue discussion before drawing implementation conclusions. A numeric GitHub issue number is required; do not guess which issue the user means.

## Required Input

Determine the issue number from the conversation. `#42`, `issue 42`, and a GitHub issue URL ending in `/issues/42` all provide issue number `42`.

If multiple distinct issue numbers could be intended, ask the user which one to use and stop. Do not choose between conflicting inputs.

If no issue number is known, ask only:

> Welche GitHub-Issue-Nummer soll ich verwenden?

Stop and wait for the answer. A title, search result, branch name, or "most likely" issue is not a substitute for the number.

## Retrieve the Issue

1. If an issue URL was supplied, use its owner and repository. Otherwise derive the repository from the current checkout's `origin` remote. If `origin` is missing or is not a GitHub repository, ask for the `owner/repository` name or a full issue URL while retaining the known issue number.
2. Use the connected GitHub tools to fetch the numbered issue and its comments. Include linked pull requests or referenced issues when available and relevant.
3. If the issue is not found in the resolved repository, report the repository and issue number that were checked. Do not silently search for a different issue.
4. Inspect relevant project files only after the issue content establishes which parts of the repository matter.

Read-only retrieval does not authorize issue edits, comments, state changes, assignments, or other GitHub mutations.

## Context Result

Return a compact implementation-oriented summary containing:

- issue identity: repository, number, title, URL, and state;
- intent and requested behavior from the issue body;
- explicit acceptance criteria and constraints;
- relevant labels, assignees, comments, decisions, dependencies, and linked work;
- likely affected project areas, when supported by repository inspection;
- unresolved questions or contradictions.

Separate explicit issue statements from inferences. Do not invent acceptance criteria, decisions, or technical requirements.

## Quick Reference

| Situation | Action |
|---|---|
| Number is missing | Ask for the issue number and stop |
| Number is present | Resolve the repository and fetch that issue |
| Full issue URL is present | Use its repository and trailing issue number |
| Issue is not found | Report the exact repository and number checked |
| GitHub mutation seems useful | Ask for authorization before changing anything |

## Common Mistakes

- Asking for a link or pasted issue text even though the number and repository are already available.
- Guessing from recent issues, titles, branches, or commit messages when the number is missing.
- Summarizing only the issue body while ignoring clarifying comments and linked work.
- Presenting inferred implementation details as requirements from the issue.
