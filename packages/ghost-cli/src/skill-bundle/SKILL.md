---
name: ghost-drift
description: Detect and manage visual-language drift in design languages. Use when the user wants to write or update a fingerprint.md, review frontend code changes for design drift, compare design fingerprints, verify generated UI against a fingerprint, or discover public design languages. Triggers on phrases like "profile this design language", "check for drift", "review this PR for design issues", "write a fingerprint.md", "compare fingerprints", or whenever a `fingerprint.md` file is present and styling/design work is happening.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost
---

# Ghost — Design Drift Detection

Ghost captures a project's visual language as an **`fingerprint.md`** file (YAML frontmatter + three-layer Markdown: Character → Signature → Decisions → Values).

Ghost's CLI is a set of **deterministic primitives**. It never calls an LLM. Synthesis, interpretation, and generation happen in **you, the host agent**; Ghost hands you the arithmetic (vector distance, schema validation, manifest writes) you call on when you need a stable answer.

## CLI primitives

| Verb | Purpose |
|---|---|
| `ghost compare <a.md> <b.md> [...more]` | Pairwise distance + per-dimension delta (N=2) or fleet analysis (N≥3). Pure math over fingerprint embeddings. `--semantic` and `--temporal` flags add qualitative enrichment for N=2. |
| `ghost lint [fingerprint.md]` | Validate schema + body/frontmatter coherence. Use this before declaring a fingerprint valid. |
| `ghost ack` / `ghost adopt <parent.md>` / `ghost diverge <dim>` | Record stance toward parent (aligned / accepted / diverging) in `.ghost-sync.json`. Reads the local `fingerprint.md`. |
| `ghost emit review-command` / `ghost emit context-bundle` / `ghost emit skill` | Derive per-project artifacts from `fingerprint.md`. |

That's it. Six verbs. If you find yourself reaching for `ghost review` or `ghost profile` — those are *your* workflows, not CLI commands. Follow the recipes below.

## Workflows (your job, not the CLI's)

When the user asks you to:

- "Profile my design language" / "write a fingerprint.md" → [references/profile.md](references/profile.md)
- "Review this PR/these changes for drift" → [references/review.md](references/review.md)
- "Verify this generated UI matches the fingerprint" → [references/verify.md](references/verify.md)
- "Generate a component matching our design language" → [references/generate.md](references/generate.md)
- "Compare these two fingerprints" → run `ghost compare <a> <b>`; if they ask *why* they drifted, add `--semantic`. See [references/compare.md](references/compare.md) for interpretation.
- "Find design languages like X" / "discover" → [references/discover.md](references/discover.md)

## The fingerprint.md format

An `fingerprint.md` has:

- **YAML frontmatter (machine layer):** `id`, `schema`, `source`, `timestamp`, `observation.personality`, `observation.closestSystems`, `decisions[].dimension`/`.evidence`, `palette`, `spacing`, `typography`, `surfaces`, `roles`.
- **Markdown body (prose layer):** `# Character` (`observation.summary`), `# Signature` (bullets from `distinctiveTraits`), `# Decisions` with `### <dimension>` rationale blocks.

Each field lives in exactly one layer — no duplication. Putting prose in frontmatter is a lint error. Full spec: [references/schema.md](references/schema.md). Starting template: [assets/fingerprint.template.md](assets/fingerprint.template.md).

## Always

- Use `fingerprint.md` as the canonical filename (no slug prefix, no dotfile).
- Resolve variable chains end-to-end. Follow `var(--primary) → --primary: var(--brand-500) → --brand-500: #0066cc` to the concrete value.
- Emit colors as hex in frontmatter. The CLI recomputes oklch when it needs it.
- Every `palette` entry should be cited in at least one decision's `evidence`, or dropped — uncited tokens are noise.
- Validate with `ghost lint` before declaring success.

## Never

- Never invent tokens. If you did not observe a value in the source, omit the field. A missing field is better than a fabricated one.
- Never use the W3C Design Tokens or Style Dictionary format. Ghost's `fingerprint.md` is the artifact.
- Never stop at the first variable indirection. Follow the chain.
- Never write prose into frontmatter or structural data into the body — the partition is load-bearing.
