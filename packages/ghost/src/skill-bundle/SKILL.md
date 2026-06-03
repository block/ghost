---
name: ghost
description: Capture, validate, review, and evolve a repo-local Ghost fingerprint. Use when the user wants to capture a product fingerprint, update .ghost, brief work from product-experience context, review drift, verify generated UI, compare fingerprints, or record accepted divergence.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost
---

# Ghost - Product Fingerprints

Ghost captures product identity in a repo-local fingerprint bundle:

```text
.ghost/
  fingerprint.yml # canonical product-experience memory
  config.yml      # optional implementation roots and reference registries/libraries
  checks.yml      # optional deterministic gates
  intent.md       # optional human-authored intent
  decisions/      # optional accepted/rejected rationale
  cache/          # optional generated caches
```

`fingerprint.yml` is the source of truth when it is checked in. Ordinary Git
workflow is the staging and approval boundary: uncommitted or unmerged changes
are drafts, and committed memory is canonical for Ghost. `config.yml` maps
implementation roots and reference UI registries/libraries without making those
references product intent. Checks are deterministic gates. Decisions preserve
historical rationale. The CLI provides deterministic validation, comparison,
routing, and handoff packets.

Repos may also contain nested bundles such as `apps/checkout/.ghost/`. Resolve
the memory stack for the task path and read layers broad-to-local. Child entries
with the same `id` override parent entries; child-relative paths are normalized
to repo-root paths by the CLI.

Host wrappers may store memory under another safe relative directory and pass
`--memory-dir <relative-dir>` to stack-aware commands. Ghost stays
adapter-neutral: consume JSON and let the wrapper map severities into its own
review or check format.

## CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost init [dir] [--scope <path>] [--memory-dir <relative-dir>] [--with-intent] [--with-config] [--reference <path-or-registry>]` | Create a root or scoped memory skeleton. |
| `ghost scan [dir] [--include-nested] [--memory-dir <relative-dir>] [--format json]` | Report fingerprint memory presence and nested readiness. |
| `ghost stack [path...] [--memory-dir <relative-dir>]` | Inspect resolved broad-to-local memory layers and merged output. |
| `ghost inventory [path]` | Emit raw repo signals for optional cache/source material. |
| `ghost lint [file-or-dir] [--all] [--memory-dir <relative-dir>]` | Validate a bundle, artifact, or all nested stack merges. |
| `ghost verify [dir] --root <dir> [--all] [--memory-dir <relative-dir>]` | Validate fingerprint evidence, checks, optional decisions, and stack integrity. |
| `ghost survey <op>` | Legacy/cache survey helpers for optional inventory workflows. |
| `ghost check --base <ref> [--memory-dir <relative-dir>] [--package <dir>]` | Run active deterministic gates against a diff; default groups files by memory stack. |
| `ghost review --base <ref> [--memory-dir <relative-dir>] [--package <dir>]` | Emit an advisory review packet grounded in resolved stack evidence. |
| `ghost compare <a> <b> [...more]` | Compare root bundles or direct fingerprints. |
| `ghost ack` / `track` / `diverge` | Record stance toward tracked drift. |
| `ghost emit <kind>` | Emit `review-command` or `context-bundle`. |
| `ghost skill install` | Install this unified skill bundle. |

## Workflows

- Fingerprint Capture: follow [references/capture.md](references/capture.md).
- Author fingerprint patterns: follow [references/patterns.md](references/patterns.md).
- Recall product-experience context: follow [references/recall.md](references/recall.md).
- Shape a pre-generation brief: follow [references/brief.md](references/brief.md).
- Critique generated or changed work: follow [references/critique.md](references/critique.md).
- Review drift: follow [references/review.md](references/review.md).
- Verify generation: follow [references/verify.md](references/verify.md).
- Compare bundles: follow [references/compare.md](references/compare.md).
- Remediate drift: follow [references/remediate.md](references/remediate.md).

## Always

- Treat the resolved `.ghost/` memory stack as the source of truth.
- Use `.ghost/config.yml` for implementation/library routing; keep product
  meaning in `fingerprint.yml`, `intent.md`, or decisions.
- Validate with `ghost lint` and `ghost verify --root <target>` before declaring
  Fingerprint Capture complete; use `--all` when nested bundles exist.
- Run `ghost check` for deterministic gates and `ghost review` for advisory critique.
- Include accepted decisions with `ghost review --include-memory` when product-experience rationale matters.

## When Memory Is Silent

Silent fingerprint memory does not require stopping by default. When memory does
not cover the task, proceed from nearby product surfaces, local components,
token and copy conventions, accepted decisions or human intent, and ordinary UX
judgment when safe. Label that reasoning as provisional and non-Ghost-backed.
Ask a human before making high-risk, irreversible, privacy/security/legal, or
product-identity-defining choices.

## Never

- Never treat advisory composition judgment as a CI gate.
- Never claim provisional judgment, local convention, or general UX reasoning as
  Ghost-backed memory.
- Never treat `intent.md` as authoritative unless human-authored or human-approved.
- Never treat rejected decisions as canonical inputs.
