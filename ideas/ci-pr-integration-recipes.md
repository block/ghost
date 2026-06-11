# Idea: CI / PR integration recipes

_Captured 2026-06-11._

## Problem

People ask "how do I run Ghost on a PR — does it comment something?" Today the
honest answer is: Ghost ships no PR bot and posts no comments. It deliberately
stays a calculator. That's the right OSS boundary, but the missing piece is
**copy-paste examples** so integrators don't have to figure out the glue from
scratch.

## Design principle (keep this intact)

Ghost the **tool** stays neutral — it commits only to two stable contracts and
refuses to own the last mile:

| Contract | What it is | So that… |
| --- | --- | --- |
| `ghost check --format json` | Documented schema (`ghost.check-report/v1`): result, changed_files, routed_files, findings | …any CI parses pass/fail + findings with no LLM |
| `ghost review` (text packet) | Self-contained agent prompt on stdout (fingerprint layers + checks + diff) | …any agent consumes it with zero integration code |

Everything else — which CI, which agent, whether it comments — is the
integrator's choice. This neutrality is exactly what makes it broad (same shape
as ESLint emitting JSON/SARIF and letting reviewdog/Danger post it).

Ghost the **docs/examples** should still hand people forkable starting points
for common stacks. Examples lower adoption friction without locking the tool in.

## Universal glue shape

1. CI runs `ghost check` / `ghost review` on the PR diff — **Ghost's job (stable output)**
2. Integrator decides what to do with the output — **your glue (10–30 lines)**
3. Post / gate / ignore using your platform's tools (gh, glab, API, Slack…) — **your last mile**

## Two comment strategies (map to the two contracts)

- **Deterministic comment / blocking gate** → consume `check --format json`, fail
  on exit code. No agent. Reproducible. Good default for a required check.
- **Agent critique comment** → pipe `review` to *your* agent, post what it writes.
  The BYOA taste layer. Advisory only (Ghost intentionally won't let an LLM block
  a build).

Most orgs run both: check gates, review adds a non-blocking design critique.

## Recipes to write

| Recipe | Demonstrates |
| --- | --- |
| GitHub Actions — deterministic gate | `ghost check --format json` → fail job on exit code. No agent. |
| GitHub Actions — agent review comment | `ghost review` → pipe to agent → `gh pr comment`. BYOA layer. |
| GitLab CI | Same two steps with `glab`. Proves host-agnostic core. |
| Generic / any CI (plain shell) | Platform-free version for Jenkins/CircleCI/Buildkite. |
| Pre-commit / local | `ghost check --base HEAD` before pushing. |

## Rules that keep examples OSS-broad

1. **Annotate "Ghost's part" vs "your glue"** in every example, so a reader on a
   different stack sees the seam and can swap the last mile. Forkable, not
   prescriptive.
2. **Keep the agent step pluggable** — show it as `... | your-agent ...` with one
   or two concrete fills (Claude Code, Codex), never a single hardcoded vendor.
3. Frame everything as **recipes, not the blessed way**.

## Where this should live (decide before writing)

- `apps/docs` — a "CI & PR Integration" docs page. Most discoverable; matches the
  ESLint Integrations model. (Lean toward this.)
- `packages/ghost/src/skill-bundle/references/` — as skill recipes, so an installed
  agent can set up the CI for the user. (Also do this.)
- Top-level `examples/` — liftable files. Optional.

Recommendation: **docs page + skill reference**, with workflow YAML inlined so
it's literally copy-paste.

## Open questions

- Should `ghost emit` grow a `ci-workflow` kind that scaffolds a starter workflow
  file, the way it already emits `review-command` and `context-bundle`? Would keep
  the "neutral tool" line while still being helpful.
- Do we document SARIF output for `check` so GitHub code-scanning / reviewdog work
  out of the box?

## Next step

Check where docs/skill references currently live and match existing style, then
draft the CI Recipes page content for review before it lands.
