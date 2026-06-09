---
name: ghost
description: Author, validate, and review repo-local Ghost fingerprints. Use when the user wants to set up a product-surface fingerprint, update .ghost, brief work from surface-composition context, review drift, verify generated UI, or compare fingerprint packages.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost
---

# Ghost - Product-Surface Fingerprints

Ghost captures the composition of a product surface: the intent behind it, the
materials it draws from, and the patterns that make it feel intentional.

```text
.ghost/
  config.yml
  fingerprint/
    manifest.yml
    prose.yml
    inventory.yml
    composition.yml
    enforcement/checks.yml
    memory/intent.md
    memory/decisions/
    sources/cache/
```

`fingerprint/` is the source of truth when it is checked in. Ordinary Git
workflow is the staging and approval boundary: uncommitted or unmerged changes
are drafts, and committed fingerprint changes are canonical for Ghost. Checks are optional
deterministic gates. Ghost is not a lifecycle manager, proposal system,
design-system registry, or screenshot archive.

Generation uses **prose + inventory + composition**:

- `fingerprint/prose.yml` captures the intent behind the surface.
- `inventory` points to building blocks and precedents the agent can inspect
  or use, including exemplars.
- `fingerprint/composition.yml` captures the patterns that make the surface feel
  intentional.

Checks and review validate output; they are not generation input.

`fingerprint/manifest.yml` anchors the package with
`schema: ghost.fingerprint-package/v1`. Add only sections that contain real
layer content; Ghost normalizes omitted layer files or sections internally for
checks, review, emit, and stack resolution.

Optional support material lives under purpose folders:
`fingerprint/enforcement/checks.yml` for deterministic gates,
`fingerprint/memory/intent.md` for human-approved intent,
`fingerprint/memory/decisions/` for rationale history, and
`fingerprint/sources/cache/` for generated observations. `.ghost/config.yml`
stays outside the portable package as local routing config.

Advanced repos may contain nested fingerprint packages such as `apps/checkout/.ghost/`, and
host wrappers may use `--memory-dir <relative-dir>`. Ghost stays
adapter-neutral: wrappers consume JSON and map severities into their own review
or check format.

## Core CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost init [dir]` | Create `.ghost/fingerprint/` with manifest, core layers, and enforcement checks. |
| `ghost scan [dir] [--format json]` | Report fingerprint layer readiness for prose, inventory, and composition. |
| `ghost lint [file-or-dir]` | Validate a fingerprint package or artifact. |
| `ghost verify [dir] --root <dir>` | Validate evidence paths, exemplar paths, and typed check refs. |
| `ghost check --base <ref>` | Run active deterministic gates against a diff. |
| `ghost review --base <ref>` | Emit an advisory review packet grounded in fingerprint layers, exemplars, checks, and diff evidence. |
| `ghost emit <kind>` | Emit `review-command` or the `context-bundle` generation packet. |
| `ghost skill install` | Install this unified skill bundle. |

## Advanced CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost init --scope <path>` / `--memory-dir <relative-dir>` | Create or resolve scoped/custom fingerprint packages. |
| `ghost stack [path...]` | Inspect resolved broad-to-local fingerprint stack and merged output. |
| `ghost inventory [path]` | Emit raw repo signals for optional generated cache/source material. |
| `ghost lint --all` / `ghost verify --all` | Validate nested stack merges. |
| `ghost compare <a> <b> [...more]` | Compare root fingerprint packages. |
| `ghost ack` / `track` / `diverge` | Record stance toward tracked drift. |

## Workflows

- Collaborative authoring scenarios: follow [references/authoring-scenarios.md](references/authoring-scenarios.md).
- Fingerprint capture: follow [references/capture.md](references/capture.md).
- Author fingerprint patterns: follow [references/patterns.md](references/patterns.md).
- Recall surface-composition context: follow [references/recall.md](references/recall.md).
- Shape a pre-generation brief: follow [references/brief.md](references/brief.md).
- Critique generated or changed work: follow [references/critique.md](references/critique.md).
- Review drift: follow [references/review.md](references/review.md).
- Verify generation: follow [references/verify.md](references/verify.md).
- Remediate drift: follow [references/remediate.md](references/remediate.md).
- Advanced compare bundles: follow [references/compare.md](references/compare.md).

When the user asks to set up a fingerprint with `auto-draft`, treat that as an
agent authoring mode, not a Ghost CLI command. Follow the auto-draft branch in
the capture and authoring-scenarios recipes: scan first, draft the smallest
evidence-backed core layer entries, then ask the human to curate the claims.

## Always

- Treat checked-in `fingerprint/` core files as the source of truth.
- Generate from prose, inventory, and composition.
- Run active checks from `fingerprint/enforcement/checks.yml`; only active deterministic checks block.
- Use local evidence as provisional when fingerprint layers are silent.
- Treat auto-drafted fingerprint edits as ordinary uncommitted draft work until
  the human curates them and Git review accepts them.
- Treat fingerprint edits as ordinary Git-reviewed edits.
- Validate with `ghost lint` and `ghost verify --root <target>` before declaring
  fingerprint layers complete.
- Run `ghost check` for deterministic gates and `ghost review` for advisory critique.
- Use optional config, intent, decisions, generated cache, nested stacks, and custom fingerprint
  dirs only when present or requested.

## When Fingerprint Layers Are Silent

Silent fingerprint layers do not require stopping by default. When the fingerprint does
not cover the task, proceed from nearby product surfaces, local components,
token and copy conventions, optional rationale files when present, and ordinary
UX reasoning when safe. Label that reasoning as provisional and
non-Ghost-backed.
Ask a human before making high-risk, irreversible, privacy/security/legal, or
product-surface-defining choices.

## Never

- Never treat advisory composition critique as a CI gate.
- Never claim provisional reasoning, local convention, or general UX reasoning as
  Ghost-backed.
- Never treat `fingerprint/memory/intent.md` as authoritative unless human-authored or human-approved.
- Never treat rejected decisions as canonical inputs.
