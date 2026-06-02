---
name: ghost
description: Capture, validate, review, and evolve a repo-local Ghost fingerprint. Use when the user wants to capture a product fingerprint, update .ghost, brief work from accepted product-experience context, review drift, verify generated UI, compare fingerprints, or record accepted divergence.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost
---

# Ghost - Product Fingerprints

Ghost captures product identity in a repo-local fingerprint bundle:

```text
.ghost/
  fingerprint.yml
  config.yml       # optional implementation roots and reference registries/libraries
  checks.yml        # optional deterministic gates
  intent.md         # optional human-approved intent
  decisions/        # optional accepted/rejected rationale
  proposals/        # optional candidate updates
  cache/            # optional generated caches
```

`fingerprint.yml` is the canonical product-experience memory. `config.yml`
maps implementation roots and reference UI registries/libraries without making
those references product intent. Checks are deterministic gates. Proposals
capture thresholded missing memory, intentional divergence, experience gaps, and
check candidates until a human promotes them. The host agent reads and writes
the fingerprint; the CLI provides deterministic validation, comparison,
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
| `ghost verify [dir] --root <dir> [--all] [--memory-dir <relative-dir>]` | Validate fingerprint evidence, checks, optional decisions/proposals, and stack integrity. |
| `ghost survey <op>` | Legacy/cache survey helpers for optional inventory workflows. |
| `ghost check --base <ref> [--memory-dir <relative-dir>] [--package <dir>]` | Run active deterministic gates against a diff; default groups files by memory stack. |
| `ghost review --base <ref> [--memory-dir <relative-dir>] [--package <dir>]` | Emit an advisory review packet grounded in resolved stack evidence. |
| `ghost proposal <create|list|resolve> [--memory-dir <relative-dir>]` | Create, list, or close scoped proposals without auto-promoting memory. |
| `ghost compare <a> <b> [...more]` | Compare root bundles or direct fingerprints. |
| `ghost ack` / `track` / `diverge` | Record stance toward tracked drift. |
| `ghost emit <kind>` | Emit `review-command` or `context-bundle`. |
| `ghost skill install` | Install this unified skill bundle. |

## Workflows

- Fingerprint Capture: follow [references/capture.md](references/capture.md).
- Author fingerprint patterns: follow [references/patterns.md](references/patterns.md).
- Recall accepted product-experience context: follow [references/recall.md](references/recall.md).
- Shape a pre-generation brief: follow [references/brief.md](references/brief.md).
- Critique generated or changed work: follow [references/critique.md](references/critique.md).
- Review drift: follow [references/review.md](references/review.md).
- Verify generation: follow [references/verify.md](references/verify.md).
- Compare bundles: follow [references/compare.md](references/compare.md).
- Remediate drift: follow [references/remediate.md](references/remediate.md).
- Propose a candidate fingerprint update: follow [references/propose.md](references/propose.md).
- Promote a human-approved proposal: follow [references/promote.md](references/promote.md).

## Always

- Treat the resolved `.ghost/` memory stack as the source of truth.
- Use `.ghost/config.yml` for implementation/library routing; keep product
  meaning in `fingerprint.yml` or approved memory.
- Validate with `ghost lint` and `ghost verify --root <target>` before declaring Fingerprint Capture complete; use `--all` when nested bundles exist.
- Run `ghost check` for deterministic gates and `ghost review` for advisory critique.
- Include accepted decisions with `ghost review --include-memory` when product-experience rationale matters.

## Never

- Never treat advisory composition judgment as a CI gate.
- Never invent product-experience memory absent from `fingerprint.yml`.
- Never treat `intent.md` as authoritative unless human-authored or human-approved.
- Never treat proposals or rejected decisions as canonical inputs.
