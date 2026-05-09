---
name: profile
description: Interpret .ghost/fingerprint/survey.json into .ghost/fingerprint/profile.md.
handoffs:
  - label: Run deterministic drift checks
    command: ghost-drift check
    prompt: Run ghost-drift check against the current diff
  - label: Emit advisory review packet
    command: ghost-drift review
    prompt: Emit an advisory review packet for the current diff
---

# Recipe: Profile Into `profile.md`

**Goal:** write `.ghost/fingerprint/profile.md` from an existing
`.ghost/fingerprint/map.md` and `.ghost/fingerprint/survey.json`.

`profile.md` is non-enforcing guidance. It shapes generation and advisory
review, but it never fails CI by itself. Deterministic gates live only in
`.ghost/fingerprint/checks.yml`.

## Prerequisites

- `.ghost/fingerprint/map.md` exists and lints.
- `.ghost/fingerprint/survey.json` exists and lints.
- Use these bounded views first:

```bash
ghost-fingerprint survey summarize .ghost/fingerprint/survey.json
ghost-fingerprint survey catalog .ghost/fingerprint/survey.json
ghost-fingerprint survey patterns .ghost/fingerprint/survey.json
```

Read raw `survey.json` only for targeted row lookup.

## Write The Profile

Keep `profile.md` selective:

> Put a fact in `profile.md` only if it can change generated UI or advisory review.

Frontmatter stores compact observed values:

- `id`, `source`, `timestamp`
- `references`
- `observation.personality` / `observation.resembles`
- `decisions[].dimension`
- `palette`, `spacing`, `typography`, `surfaces`

The body stores:

- `# Character`: 2–4 sentences about the design language's stance.
- `# Signature`: 2–4 sentences about what native output tends to look like.
- `# Decisions`: `### <dimension>` blocks with evidence bullets.

Do not include `checks[]` in frontmatter.

## Propose Checks Separately

While profiling, keep a scratch list of candidate deterministic gates. Good
candidates are lintable:

- forbidden raw colors
- required token usage
- banned imports or components
- path-scoped layout/component patterns
- required repo-specific wrappers

For each candidate, provide:

- id
- title
- detector type and pattern/value
- scope/path
- observed support
- examples
- repair

Do not write a candidate into `checks.yml` unless the human curator promotes it.
Subjective hierarchy, rhythm, and composition observations belong in profile
prose or advisory review unless they can be made deterministic.

## Validate

```bash
ghost-fingerprint lint .ghost/fingerprint
ghost-fingerprint verify-profile .ghost/fingerprint/profile.md .ghost/fingerprint/survey.json --root .
```

Fix profile fidelity errors by going back to survey evidence. If the survey is
missing a value the repo actually uses, rerun or repair the survey; do not invent
values in the profile.
