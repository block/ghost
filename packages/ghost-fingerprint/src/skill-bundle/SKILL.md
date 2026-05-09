---
name: ghost-fingerprint
description: Author and validate the repo-local Ghost fingerprint package. Use when the user wants to create or update .ghost/fingerprint, write map.md/survey.json/profile.md/checks.yml, lint the package, describe a profile, diff profiles, or emit derived artifacts.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost-fingerprint
---

# Ghost Fingerprint — Repo-Local Design Memory

Ghost Fingerprint is the package, not a single Markdown file:

```text
.ghost/fingerprint/
  map.md
  survey.json
  profile.md
  checks.yml
```

Checks fail builds. Profile shapes judgment. Survey grounds both. The package is
the fingerprint.

You do the synthesis. The `ghost-fingerprint` CLI gives deterministic answers
for package initialization, schema validation, layout, profile fidelity, survey
summaries, and structural profile diffs.

## CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost-fingerprint init-package [dir]` | Create `map.md`, `survey.json`, `profile.md`, and `checks.yml` under `.ghost/fingerprint` or the provided package directory. |
| `ghost-fingerprint lint [file-or-dir]` | Validate a full package by default, or an individual `profile.md`, `map.md`, `survey.json`, or `checks.yml`. |
| `ghost-fingerprint verify-profile <profile.md> <survey.json> [--root <dir>]` | Validate that profile values are backed by survey evidence. This does not enforce checks. |
| `ghost-fingerprint inventory [path]` | Emit raw repo signals for the map recipe. |
| `ghost-fingerprint scan-status [dir] [--include-scopes]` | Report package stage presence: `map`, `survey`, `profile`, `checks`. |
| `ghost-fingerprint describe [profile.md]` | Print profile section ranges and token estimates. Defaults to `.ghost/fingerprint/profile.md`. |
| `ghost-fingerprint diff <a.md> <b.md>` | Structural prose-level diff between two profiles. |
| `ghost-fingerprint survey <op>` | Survey ops: `merge`, `fix-ids`, `summarize`, `catalog`, `patterns`. |
| `ghost-fingerprint emit <kind>` | Derive static artifacts. Kinds: `review-command`, `context-bundle`, `skill`. |

When the CLI is unavailable, follow the same recipes manually with file reads,
search, and careful validation. Do not block on installation.

## Workflows

- Full scan: follow [references/scan.md](references/scan.md).
- Map the repo: follow [references/map.md](references/map.md). Output `.ghost/fingerprint/map.md`.
- Survey design evidence: follow [references/survey.md](references/survey.md). Output `.ghost/fingerprint/survey.json`.
- Profile design language: follow [references/profile.md](references/profile.md). Output `.ghost/fingerprint/profile.md`.
- Promote deterministic checks: write human-selected gates into `.ghost/fingerprint/checks.yml` using `ghost.checks/v1`.
- Lint the package: run `ghost-fingerprint lint`.
- Verify profile fidelity: run `ghost-fingerprint verify-profile .ghost/fingerprint/profile.md .ghost/fingerprint/survey.json --root <target>`.

Drift detection and PR checking live in the sibling `ghost-drift` skill:
`ghost-drift check` is blocking; `ghost-drift review` is advisory.

## Package Rules

- `map.md` routes changed files to scopes and examples.
- `survey.json` records observed evidence and counts.
- `profile.md` is non-enforcing guidance for generation and advisory review.
- `checks.yml` is the only deterministic gate layer in v1.
- Do not put `checks[]` in profile frontmatter.
- Do not invent tokens or values. If a value is absent from the survey, omit it or resurvey.
- Keep `checks.yml` human-promoted. Candidate checks belong in notes until a human selects them.
- Prefer lintable checks: regex, imports, components, required tokens, and path-scoped patterns.

## Always

- Initialize or target `.ghost/fingerprint/` before authoring.
- Use `ghost-fingerprint survey summarize`, `catalog`, and `patterns` to ground profile prose and proposed checks.
- Validate the whole package with `ghost-fingerprint lint`.
- Treat profile prose as judgment-shaping, not CI-enforcing.

## Never

- Never describe root-level `fingerprint.md` as canonical.
- Never promote a subjective taste call directly into `checks.yml` unless it has a deterministic detector and evidence.
- Never write prose into structured frontmatter or structural gates into profile prose.
