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
  manifest.yml          # schema + id
  index.md              # the core node, true everywhere (optional)
  <surface>/index.md    # a surface's own prose
  <surface>/<node>.md   # a node placed in that surface
  checks/*.md           # optional ghost.check/v1 checks
```

The checked-in `.ghost/` package is the source of truth. Ordinary Git
workflow is the staging and approval boundary: uncommitted or unmerged changes
are drafts, and committed fingerprint changes are canonical for Ghost. Checks are
markdown rules an agent evaluates. Ghost is not a lifecycle manager, proposal system,
design-system registry, or screenshot archive.

The fingerprint is a graph of **nodes**, and the **directory tree is the graph**.
A node is a markdown file: descriptive frontmatter (`description`, `relates`,
`incarnation`) + a prose body. A node's **identity is its path** (`marketing/email.md`
→ `marketing/email`) and its **parent is its containing directory**. A surface
is just a directory, and a directory's own prose lives in its `index.md`
(`marketing/index.md` is the `marketing` surface; the package-root `index.md` is
the implicit `core` node, true everywhere). You write the body through three
authoring lenses, **intent + inventory + composition**. They guide what to
capture; they are not fields or node types:

- intent: the why and the stance.
- inventory: the materials and pointers to implementation the agent can inspect.
- composition: the patterns that make the surface feel intentional.

`description` is the retrieval payload, a one-line "what this is / when to
gather it" (like a tool's name + description); `ghost gather` with no argument
lists nodes by id + description for the agent to match against. The directory
places a node so it is inherited downward (`core` is the implicit root that
reaches every surface); `relates` links nodes laterally; `incarnation` tags a
medium-bound expression (essence is untagged). Free-form keys (`audience`, …)
pass through. See [references/capture.md](references/capture.md) for the full
node shape.

**How `gather` composes** a surface's slice:

- **full bodies along the path**: every file from the package root down to the
  surface's own folder, so a feature's `invariants.md` reaches every screen in
  that feature, and root files reach everywhere. A sibling folder's nodes never
  appear, not even as a pointer.
- **edges** (full bodies, one hop): the `relates` targets of every node on that
  path. Author a broad rule once at the level it is true (say
  `relates: { to: arcade }` on `features/`) and every descendant inherits it. A
  link to a node also offers that node's subtree as pointers.
- **pointers** (id + description, no body): the surface's own descendants and the
  subtree of any node it relates to. The agent reads the descriptions and pulls
  what it needs with a follow-up `gather`.

Naming a node that is not in the package is an error, not a silent empty
result. An inexact `gather <query>` ranks the closest nodes as `candidates`
(matching id, description, then body, by single words or a phrase) under the
stable code `ERR_UNKNOWN_SURFACE`; `checks` and `review` emit the same code with
closest-id `suggestions` (in `--format json`) and a "Did you mean" line
otherwise. Branch on the code and retry with a ranked candidate or suggestion.

Checks and review validate output; they are not generation input.

`manifest.yml` anchors the package with `schema: ghost.fingerprint-package/v1`.
The tree is the layout itself: ids and parents come from where files sit, so
moving a node is a rename. Reserved at the package root: `manifest.yml` and the
`checks/` subtree; every other `*.md` is a node.

Optional `ghost.check/v1` markdown checks live in `checks/*.md`; every check is
offered to the reviewer and the agent judges which apply.
Use `ghost signals` as a stdout-only reconnaissance helper when an agent needs
raw repo observations while authoring curated nodes.

One contract per package: a repo's `.ghost/` is the contract, and surfaces are
the only locality. Host wrappers may set `GHOST_PACKAGE_DIR=<relative-dir>` on
the child `ghost` process when they need repo-local Ghost files outside raw
`ghost`'s `.ghost` default, and `--package <dir>` targets an exact package (e.g.
one product in a monorepo). Ghost stays adapter-neutral: wrappers consume JSON
and map severities into their own review or check format.

A package can **extend** another by identity (the shared-brand pattern). The
manifest's `extends` maps a package id to where it lives:
`extends: { brand: ../brand/.ghost }`. Then nodes reference inherited context by
identity, never path: `relates: [{ to: brand:core/trust }]` (a `<package>:<path>`
ref). Inherited nodes are read-only and flow into gather/validate like local ones.

## Core CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost init [--template <name>]` | Scaffold `.ghost/` with a manifest and a core `index.md` node. |
| `ghost scan [dir] [--format json]` | Report node/surface contribution. |
| `ghost validate [file-or-dir]` | Validate the package: artifact shape and the node graph (links resolve, one root, acyclic). |
| `ghost checks --surface <ids>` | List the markdown checks and ground the named surfaces. |
| `ghost review --surface <ids> [--diff <patch>]` | Emit an advisory review packet: touched surfaces, the offered checks, and fingerprint grounding (diff embedded verbatim). |
| `ghost gather [node] [--as <incarnation>]` | Compose a node's context slice (full bodies along its path + relates edges, plus pointers), list the node menu, or rank the closest nodes for an inexact query. |
| `ghost skill install` | Install this unified skill bundle. |

## Advanced CLI Verbs

| Verb | Purpose |
|---|---|
| `GHOST_PACKAGE_DIR=<relative-dir> ghost init` / `ghost init --package <dir>` | Create or resolve a custom fingerprint package directory for host wrappers or a monorepo package. |
| `ghost signals [path]` | Emit raw repo signals for fingerprint authoring. |
| `ghost manifest [--format json]` | Emit a self-describing JSON manifest of every command and flag. |
| `ghost migrate [dir]` | Migrate a legacy `.ghost/` package onto the directory-tree node model. |

## Workflows

- Self-check before generating: follow [references/self-check.md](references/self-check.md).
- Collaborative authoring scenarios: follow [references/authoring-scenarios.md](references/authoring-scenarios.md).
- Fingerprint capture: follow [references/capture.md](references/capture.md).
- Author the inventory lens: follow [references/inventory.md](references/inventory.md).
- Recall surface-composition context: follow [references/recall.md](references/recall.md).
- Shape a pre-generation brief: follow [references/brief.md](references/brief.md).
- Critique generated or changed work: follow [references/critique.md](references/critique.md).
- Review changes: follow [references/review.md](references/review.md).
- Verify generation: follow [references/verify.md](references/verify.md).
- Remediate findings: follow [references/remediate.md](references/remediate.md).

When the user asks to set up a fingerprint with `auto-draft`, treat that as an
agent authoring mode, not a Ghost CLI command. Follow the auto-draft branch in
the capture and authoring-scenarios recipes: scan first, draft the smallest
evidence-backed node drafts, then ask the human to curate the claims.

## Always

- Treat checked-in Ghost package nodes as the source of truth.
- Generate from intent, inventory, and composition.
- Name touched surfaces to `ghost checks --surface` to ground them; the agent evaluates which markdown checks apply.
- Use local evidence as provisional when the fingerprint is silent.
- Treat auto-drafted fingerprint edits as ordinary uncommitted draft work until
  the human curates them and Git review accepts them.
- Treat fingerprint edits as ordinary Git-reviewed edits.
- Validate with `ghost validate` before declaring
  fingerprint nodes useful.
- Run `ghost checks` to list checks and ground surfaces, and `ghost review` for the advisory packet.
- Use a custom package dir (`--package` / `GHOST_PACKAGE_DIR`) only when present
  or requested.

## When Fingerprint Facets Are Silent

Silent fingerprint nodes do not require stopping by default. When the fingerprint does
not cover the task, proceed from nearby product surfaces, local components,
token and copy conventions, and ordinary UX reasoning when safe. Label that reasoning as provisional and
non-Ghost-backed.
Ask a human before making high-risk, irreversible, privacy/security/legal, or
product-surface-defining choices.

## Never

- Never treat advisory composition critique as a CI gate.
- Never claim provisional reasoning, local convention, or general UX reasoning as
  Ghost-backed.
