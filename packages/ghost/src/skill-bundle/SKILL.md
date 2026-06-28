---
name: ghost
description: Author, validate, and review repo-local Ghost fingerprints. Use when the user wants to set up a product-surface fingerprint, update .ghost, brief work from surface-composition context, review changes, or verify generated UI.
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
  manifest.yml
  intent.yml
  inventory.yml
  composition.yml
  surfaces.yml
  checks/*.md
```

The checked-in `.ghost/` package is the source of truth. Ordinary Git
workflow is the staging and approval boundary: uncommitted or unmerged changes
are drafts, and committed fingerprint changes are canonical for Ghost. Checks are
markdown rules an agent evaluates. Ghost is not a lifecycle manager, proposal system,
design-system registry, or screenshot archive.

Generation uses **intent + inventory + composition**:

- `intent.yml` captures the intent behind the surface.
- `inventory` points to building blocks and precedents the agent can inspect
  or use, including exemplars.
- `composition.yml` captures the patterns that make the surface feel
  intentional.

Checks and review validate output; they are not generation input.

`manifest.yml` anchors the package with
`schema: ghost.fingerprint-package/v1`. Add only sections that contain real
facet content; Ghost normalizes omitted facet files or sections internally for
checks, review, emit, and surface resolution.

Optional `ghost.check/v1` markdown checks live in `checks/*.md`, routed by surface.
Use `ghost signals` as a stdout-only reconnaissance helper when an agent needs
raw repo observations while authoring curated fingerprint facets.

One contract per package: a repo's `.ghost/` is the contract, and surfaces are
the only locality. Host wrappers may set `GHOST_PACKAGE_DIR=<relative-dir>` on
the child `ghost` process when they need repo-local Ghost files outside raw
`ghost`'s `.ghost` default, and `--package <dir>` targets an exact package (e.g.
one product in a monorepo). Ghost stays adapter-neutral: wrappers consume JSON
and map severities into their own review or check format.

## Core CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost init` | Create `.ghost/` with manifest and facets. |
| `ghost scan [dir] [--format json]` | Report sparse fingerprint contribution facets. |
| `ghost lint [file-or-dir]` | Validate a fingerprint package or artifact. |
| `ghost verify [dir] --root <dir>` | Validate evidence paths, exemplar paths, and typed check refs. |
| `ghost checks --surface <ids>` | Select and ground the markdown checks governing the named surfaces. |
| `ghost review --surface <ids> [--diff <patch>]` | Emit an advisory review packet: touched surfaces, routed checks, and fingerprint grounding (diff embedded verbatim). |
| `ghost gather [surface]` | Compose a surface's context slice (own + inherited + edge), or list the surface menu. |
| `ghost emit <kind>` | Emit `review-command`. |
| `ghost skill install` | Install this unified skill bundle. |

## Advanced CLI Verbs

| Verb | Purpose |
|---|---|
| `GHOST_PACKAGE_DIR=<relative-dir> ghost init` / `ghost init --package <dir>` | Create or resolve a custom fingerprint package directory for host wrappers or a monorepo package. |
| `ghost signals [path]` | Emit raw repo signals for fingerprint authoring. |
| `ghost migrate [dir]` | Migrate a legacy `.ghost/` package onto the surface model. |

## Workflows

- Collaborative authoring scenarios: follow [references/authoring-scenarios.md](references/authoring-scenarios.md).
- Fingerprint capture: follow [references/capture.md](references/capture.md).
- Author fingerprint patterns: follow [references/patterns.md](references/patterns.md).
- Capture voice and language: follow [references/voice.md](references/voice.md).
- Recall surface-composition context: follow [references/recall.md](references/recall.md).
- Shape a pre-generation brief: follow [references/brief.md](references/brief.md).
- Critique generated or changed work: follow [references/critique.md](references/critique.md).
- Review changes: follow [references/review.md](references/review.md).
- Verify generation: follow [references/verify.md](references/verify.md).
- Remediate findings: follow [references/remediate.md](references/remediate.md).

When the user asks to set up a fingerprint with `auto-draft`, treat that as an
agent authoring mode, not a Ghost CLI command. Follow the auto-draft branch in
the capture and authoring-scenarios recipes: scan first, draft the smallest
evidence-backed facet entries, then ask the human to curate the claims.

## Always

- Treat checked-in Ghost package facet files as the source of truth.
- Generate from intent, inventory, and composition.
- Name touched surfaces to `ghost checks --surface`; the agent evaluates the markdown checks it governs.
- Use local evidence as provisional when fingerprint facets are silent.
- Treat auto-drafted fingerprint edits as ordinary uncommitted draft work until
  the human curates them and Git review accepts them.
- Treat fingerprint edits as ordinary Git-reviewed edits.
- Validate with `ghost lint` and `ghost verify --root <target>` before declaring
  fingerprint facets useful.
- Run `ghost checks` to route checks and `ghost review` for the advisory packet.
- Use a custom package dir (`--package` / `GHOST_PACKAGE_DIR`) only when present
  or requested.

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
