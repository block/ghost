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
    intent.yml
    inventory.yml
    composition.yml
    validate.yml
```

`fingerprint/` is the source of truth when it is checked in. Ordinary Git
workflow is the staging and approval boundary: uncommitted or unmerged changes
are drafts, and committed fingerprint changes are canonical for Ghost. Checks are optional
deterministic gates. Ghost is not a lifecycle manager, proposal system,
design-system registry, or screenshot archive.

Generation uses **intent + inventory + composition**:

- `fingerprint/intent.yml` captures the intent behind the surface.
- `inventory` points to building blocks and precedents the agent can inspect
  or use, including exemplars.
- `fingerprint/composition.yml` captures the patterns that make the surface feel
  intentional.

Checks and review validate output; they are not generation input.

`fingerprint/manifest.yml` anchors the package with
`schema: ghost.fingerprint-package/v1`. Add only sections that contain real
facet content; Ghost normalizes omitted facet files or sections internally for
checks, review, emit, and stack resolution.

Optional deterministic gates live in `fingerprint/validate.yml`.
`.ghost/config.yml` stays outside the portable package as local routing config.
Use `ghost signals` as a stdout-only reconnaissance helper when an agent needs
raw repo observations while authoring curated fingerprint facets.

Advanced repos may contain nested fingerprint packages such as
`apps/checkout/.ghost/`. Host wrappers may set
`GHOST_MEMORY_DIR=<relative-dir>` on the child `ghost` process, or pass
`--memory-dir <relative-dir>` explicitly, when they need repo-local Ghost files
outside raw `ghost`'s `.ghost` default. Ghost stays adapter-neutral: wrappers
consume JSON and map severities into their own review or check format.

## Core CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost init [dir]` | Create `.ghost/fingerprint/` with manifest, facets, and deterministic checks. |
| `ghost scan [dir] [--format json]` | Report sparse fingerprint contribution facets. |
| `ghost lint [file-or-dir]` | Validate a fingerprint package or artifact. |
| `ghost verify [dir] --root <dir>` | Validate evidence paths, exemplar paths, and typed check refs. |
| `ghost check --base <ref>` | Run active deterministic gates against a diff. |
| `ghost review --base <ref>` | Emit an advisory review packet grounded in fingerprint facets, exemplars, checks, and diff evidence. |
| `ghost relay gather [target]` | Gather fingerprint-grounded context for an agent target. |
| `ghost emit <kind>` | Emit `review-command`. |
| `ghost skill install` | Install this unified skill bundle. |

## Advanced CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost init --scope <path>` / `--memory-dir <relative-dir>` | Create or resolve scoped/custom fingerprint packages for nested packages or host wrappers. |
| `ghost stack [path...]` | Inspect resolved broad-to-local fingerprint stack and merged output. |
| `ghost signals [path]` | Emit raw repo signals for fingerprint authoring. |
| `ghost lint --all` / `ghost verify --all` | Validate nested stack merges. |
| `ghost compare <a> <b> [...more]` | Compare root fingerprint packages. |
| `ghost ack` / `track` / `diverge` | Record stance toward tracked drift. |

## Workflows

- Collaborative authoring scenarios: follow [references/authoring-scenarios.md](references/authoring-scenarios.md).
- Fingerprint capture: follow [references/capture.md](references/capture.md).
- Author fingerprint patterns: follow [references/patterns.md](references/patterns.md).
- Capture voice and language: follow [references/voice.md](references/voice.md).
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
evidence-backed facet entries, then ask the human to curate the claims.

## Always

- Treat checked-in `fingerprint/` facet files as the source of truth.
- Generate from intent, inventory, and composition.
- Run active checks from `fingerprint/validate.yml`; only active deterministic checks block.
- Use local evidence as provisional when fingerprint facets are silent.
- Treat auto-drafted fingerprint edits as ordinary uncommitted draft work until
  the human curates them and Git review accepts them.
- Treat fingerprint edits as ordinary Git-reviewed edits.
- Validate with `ghost lint` and `ghost verify --root <target>` before declaring
  fingerprint facets useful.
- Run `ghost check` for deterministic gates and `ghost review` for advisory critique.
- Use optional config, nested stacks, and custom fingerprint dirs only when
  present or requested.

## When Fingerprint Facets Are Silent

Silent fingerprint facets do not require stopping by default. When the fingerprint does
not cover the task, proceed from nearby product surfaces, local components,
token and copy conventions, and ordinary UX reasoning when safe. Label that reasoning as provisional and
non-Ghost-backed.
Ask a human before making high-risk, irreversible, privacy/security/legal, or
product-surface-defining choices.

## Never

- Never treat advisory composition critique as a CI gate.
- Never claim provisional reasoning, local convention, or general UX reasoning as
  Ghost-backed.
