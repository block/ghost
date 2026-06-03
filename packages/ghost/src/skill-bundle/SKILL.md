---
name: ghost
description: Author, validate, and review repo-local Ghost memory. Use when the user wants to set up a product fingerprint, update .ghost, brief work from product-experience context, review drift, verify generated UI, or use advanced comparison/drift stance workflows.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost
---

# Ghost - Product Fingerprints

Ghost captures product identity in a repo-local memory contract:

```text
.ghost/
  fingerprint.yml # canonical product-experience memory
  checks.yml      # optional deterministic gates grounded in memory
```

`fingerprint.yml` is the source of truth when it is checked in. Ordinary Git
workflow is the staging and approval boundary: uncommitted or unmerged changes
are drafts, and committed memory is canonical for Ghost. Checks are optional
deterministic gates. Ghost is not a lifecycle manager, proposal system,
design-system registry, or screenshot archive.

Generation uses **prose + inventory + exemplars**:

- Prose in `fingerprint.yml` explains what matters and why.
- Optional inventory in `cache/inventory.json` says what exists now.
- Exemplars in `fingerprint.yml` show concrete surfaces worth inspecting.

Checks and review validate output; they are not generation memory.

`fingerprint.yml` may start with only `schema: ghost.fingerprint/v1`. Add only
sections that contain real memory; Ghost normalizes omitted top-level sections
internally for checks, review, emit, and stack resolution.

Optional material may sit beside the core files: `config.yml` for
implementation routing, `intent.md` for human-authored intent, `decisions/` for
historical rationale, and `cache/` for explicit generated inventory. Use these
only when present or requested.

Advanced repos may contain nested bundles such as `apps/checkout/.ghost/`, and
host wrappers may use `--memory-dir <relative-dir>`. Ghost stays
adapter-neutral: wrappers consume JSON and map severities into their own review
or check format.

## Core CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost init [dir]` | Create `.ghost/fingerprint.yml` and `.ghost/checks.yml`. |
| `ghost scan [dir] [--format json]` | Report fingerprint memory presence and readiness. |
| `ghost lint [file-or-dir]` | Validate a bundle or artifact. |
| `ghost verify [dir] --root <dir>` | Validate evidence paths, exemplar paths, and typed check refs. |
| `ghost check --base <ref>` | Run active deterministic gates against a diff. |
| `ghost review --base <ref>` | Emit an advisory review packet grounded in memory, exemplars, checks, and diff evidence. |
| `ghost emit <kind>` | Emit `review-command` or the `context-bundle` generation packet. |
| `ghost skill install` | Install this unified skill bundle. |

## Advanced And Legacy CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost init --scope <path>` / `--memory-dir <relative-dir>` | Create or resolve scoped/custom memory. |
| `ghost stack [path...]` | Inspect resolved broad-to-local memory layers and merged output. |
| `ghost inventory [path]` | Emit raw repo signals for optional cache/source material. |
| `ghost lint --all` / `ghost verify --all` | Validate nested stack merges. |
| `ghost survey <op>` | Legacy/cache survey helpers for optional inventory workflows. |
| `ghost compare <a> <b> [...more]` | Compare root bundles or direct fingerprints. |
| `ghost ack` / `track` / `diverge` | Record stance toward tracked drift. |

## Workflows

- Fingerprint memory: follow [references/capture.md](references/capture.md).
- Author fingerprint patterns: follow [references/patterns.md](references/patterns.md).
- Recall product-experience context: follow [references/recall.md](references/recall.md).
- Shape a pre-generation brief: follow [references/brief.md](references/brief.md).
- Critique generated or changed work: follow [references/critique.md](references/critique.md).
- Review drift: follow [references/review.md](references/review.md).
- Verify generation: follow [references/verify.md](references/verify.md).
- Remediate drift: follow [references/remediate.md](references/remediate.md).
- Advanced compare bundles: follow [references/compare.md](references/compare.md).

## Always

- Treat checked-in `fingerprint.yml` as the source of truth.
- Generate from product prose, optional inventory, and curated exemplars.
- Run active checks from `checks.yml`; only active deterministic checks block.
- Use local evidence as provisional when fingerprint memory is silent.
- Treat memory changes as ordinary Git-reviewed edits.
- Validate with `ghost lint` and `ghost verify --root <target>` before declaring
  fingerprint memory complete.
- Run `ghost check` for deterministic gates and `ghost review` for advisory critique.
- Use optional config, intent, decisions, cache, nested stacks, and custom memory
  dirs only when present or requested.

## When Memory Is Silent

Silent fingerprint memory does not require stopping by default. When memory does
not cover the task, proceed from nearby product surfaces, local components,
token and copy conventions, optional rationale files when present, and ordinary
UX judgment when safe. Label that reasoning as provisional and
non-Ghost-backed.
Ask a human before making high-risk, irreversible, privacy/security/legal, or
product-identity-defining choices.

## Never

- Never treat advisory composition judgment as a CI gate.
- Never claim provisional judgment, local convention, or general UX reasoning as
  Ghost-backed memory.
- Never treat `intent.md` as authoritative unless human-authored or human-approved.
- Never treat rejected decisions as canonical inputs.
