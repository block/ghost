---
name: ghost
description: Capture, apply, validate, and govern repo-local Ghost fingerprints. Use when the user wants to set up or update a product-experience fingerprint, recall fingerprint context, brief or generate UI from Ghost, verify generated work, govern changes, review drift, or compare fingerprint packages.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost
---

# Ghost - Product Fingerprints

Ghost fingerprints are portable product-experience contracts for agentic work.
They capture the judgment, evidence, and composition rules agents need before
they generate or revise a product surface, and deterministic tooling uses the
same package afterward to validate and govern the result.

The canonical repo-local package is:

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
are drafts, and committed fingerprint changes are canonical for Ghost. Checks
are optional deterministic gates. Ghost is not a lifecycle manager, proposal
system, design-system registry, or screenshot archive.

Generation uses **prose + inventory + composition**:

- `fingerprint/prose.yml` explains what matters and why.
- `inventory` points to building blocks and precedents the agent can inspect
  or use, including exemplars.
- `fingerprint/composition.yml` explains how those blocks become experience.

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

## Fingerprint Lifecycle CLI

### Author And Validate

| Verb | Purpose |
|---|---|
| `ghost init [dir]` | Create `.ghost/fingerprint/` with manifest, core layers, and enforcement checks. |
| `ghost scan [dir] [--format json]` | Report fingerprint layer readiness for prose, inventory, and composition. |
| `ghost lint [file-or-dir]` | Validate a fingerprint package or artifact. |
| `ghost verify [dir] --root <dir>` | Validate evidence paths, exemplar paths, and typed check refs. |
| `ghost lint --all` / `ghost verify --all` | Validate nested stack merges. |
| `ghost skill install` | Install this unified skill bundle. |

### Generate

| Verb | Purpose |
|---|---|
| `ghost emit context-bundle` | Emit the generation packet from checked-in fingerprint layers. |
| `ghost emit review-command` | Emit a review command grounded in the same fingerprint contract. |

### Govern

| Verb | Purpose |
|---|---|
| `ghost check --base <ref>` | Run active deterministic gates against a diff. |
| `ghost review --base <ref>` | Emit an advisory governance packet grounded in fingerprint layers, exemplars, checks, and diff evidence. |
| `ghost ack` / `track` / `diverge` | Record stance toward tracked fingerprint drift or intentional divergence. |

### Compare And Adapt

| Verb | Purpose |
|---|---|
| `ghost stack [path...]` | Inspect resolved broad-to-local fingerprint stack and merged output. |
| `ghost compare <a> <b> [...more]` | Compare root fingerprint packages. |
| `ghost init --scope <path>` / `--memory-dir <relative-dir>` | Create or resolve scoped/custom fingerprint packages. |
| `ghost describe` | Print optional intent or markdown section ranges. |

### Source Material

| Verb | Purpose |
|---|---|
| `ghost inventory [path]` | Emit raw repo signals for optional generated cache/source material. |

## Workflows

- Capture a fingerprint: follow [references/capture.md](references/capture.md).
- Recall applicable fingerprint context: follow [references/recall.md](references/recall.md).
- Shape a fingerprint application brief: follow [references/brief.md](references/brief.md).
- Generate or revise UI from a fingerprint: follow [references/generate.md](references/generate.md).
- Verify generated work or fingerprint edits: follow [references/verify.md](references/verify.md).
- Govern changed work against the fingerprint: follow [references/review.md](references/review.md).
- Critique generated or changed work directly: follow [references/critique.md](references/critique.md).
- Remediate alignment findings: follow [references/remediate.md](references/remediate.md).
- Compare fingerprint relationships: follow [references/compare.md](references/compare.md).
- Author composition patterns: follow [references/patterns.md](references/patterns.md).

## Always

- Treat checked-in `fingerprint/` core files as the source of truth.
- Generate from prose, inventory, and composition.
- Run active checks from `fingerprint/enforcement/checks.yml`; only active deterministic checks block.
- Use local evidence as provisional when fingerprint layers are silent.
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
UX judgment when safe. Label that reasoning as provisional and
non-Ghost-backed.
Ask a human before making high-risk, irreversible, privacy/security/legal, or
product-identity-defining choices.

## Never

- Never treat advisory composition judgment as a CI gate.
- Never claim provisional judgment, local convention, or general UX reasoning as
  Ghost-backed.
- Never treat `fingerprint/memory/intent.md` as authoritative unless human-authored or human-approved.
- Never treat rejected decisions as canonical inputs.
