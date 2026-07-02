---
name: haunt
description: Grade high-altitude compositional drift against a repo's design fingerprint. Use when reviewing a diff or PR for hierarchy, density, restraint, product-stance, or composition drift that linters can't see, when auditing the whole inventory for sprawl (haunt integrity), and when authoring or updating a .haunt/ package (inventory, checks).
license: Apache-2.0
metadata:
  cli: ghost-haunt
---

# Haunt — Adherence & Drift

Haunt grades **high-altitude compositional drift**: hierarchy collapsing,
density creeping, restraint eroding, product stance slipping — the drift a
linter can't see, a prose tool can't reach, and a stack owner won't police. It
bridges to the design-system code a repo already owns (code is the source of
truth) and checks it against the brand truths in the repo's `.ghost/`
fingerprint.

The CLI does the deterministic work: it assembles the evidence and offers the
checks. **You render the findings.** Haunt never edits and never grades on its
own — it hands you a packet, you produce findings.

```text
.haunt/
  manifest.yml   # schema + id
  inventory/     # the materials — prose + `paths` to where they live in code.
  checks/        # ghost.check/v1 assertions — `references` bind them to prose.
```

Brand truths (principles, surface composition, stance) do **not** live in
`.haunt/` — they live in `.ghost/` as fingerprint nodes, and checks point at
them. **A `.ghost/` fingerprint is required for `ghost-haunt review`**; without one
review degrades to generic lint, so the CLI refuses and points you at
`npm i -D @anarchitecture/ghost-fingerprint && ghost init`.

The checked-in `.haunt/` package is the source of truth. Ordinary Git workflow
is the approval boundary: uncommitted changes are drafts, committed changes are
canonical.

## Core CLI Verbs

| Verb | Purpose |
|---|---|
| `ghost-haunt validate [--package <dir>] [--ghost-dir <dir>]` | Validate the package: shape (flat dirs, no nesting) and check `references` (local ids resolve; fingerprint targets are checked against `.ghost/` when it resolves). |
| `ghost-haunt review [--diff <patch>] [--base <ref>] [--ghost-dir <dir>] [--json]` | Emit an advisory review packet from the package, the fingerprint, and a diff: matched materials, referenced fingerprint prose, offered checks, coverage gaps, and the diff. Requires `.ghost/`. |
| `ghost-haunt integrity [--package <dir>] [--ghost-dir <dir>] [--json]` | Emit an advisory integrity packet: the whole inventory partitioned by material, each bound to its prose, its checks (with baselines), and its siblings — the sprawl audit. Requires `.ghost/`. |

Diff sources for `review`: `--diff <file>`, `--diff=-` (stdin), or omit to run
`git diff <base>` (default `HEAD`).

**Two tenses, one substrate.** `review` grades a change (the diff is the
observable); `integrity` grades the whole ("does what we own still cohere with
what we said, and with itself?"). Both consume the same inventory and checks;
sprawl is invisible at diff granularity, so run integrity locally when the
system feels like it's drifting, and on PRs whenever the diff touches
inventory `paths` (review's matched materials are that signal).

## The `references` grammar

Every check declares `references` (min 1) — the prose it enforces. One pointer
grammar system-wide, shared with `ghost.check/v1`'s `source:`:

- `modals` — a bare local **inventory** id (local-first: a bare slug checks
  local inventory before the fingerprint catalog).
- `checkout/payment` — a **fingerprint node** path id.
- `checkout/payment > Confirmation` — a fingerprint node with a heading
  anchor; the packet slices the node body to that section (case-insensitive,
  any heading level, first match wins).

## The stance: review reports, it does not edit

`ghost-haunt review` is **advisory**. It reports drift as findings against the
fingerprint and never edits code. Two distinct jobs, and you must not blur them:

- **Review** — inspect the packet, report prioritized findings. Do not edit.
- **Fix (harden)** — only when the user asks you to fix. When you do, *preserve
  the settled product direction*: you are closing drift, not redesigning the
  surface. An audit must not silently become a redesign.

## The review loop

1. Run `ghost-haunt review` (or `--json` for structured input). The packet already did
   the deterministic routing: diff → inventory (via `paths`) → offered checks.
   Checks that reference only fingerprint nodes are **always offered** — brand
   truths are always in play; no mechanical hop connects a diff to one. A
   mixed check (local + fingerprint references) is scoped to its material: the
   local reference is the trigger, the fingerprint reference the baseline.
   Drift outside a material's paths is integrity's job, not review's.
2. **Weigh which offered checks apply.** Every check is offered; you decide
   relevance against the diff and the referenced prose. A check that doesn't fit
   this change is skipped, not forced.
3. For each applicable check, grade the drift using the evidence the packet
   gives you:
   - **baseline** — the referenced prose: local inventory prose, or fingerprint
     node bodies (sliced to the anchored heading section) — the *stated*
     composition.
   - **observable** — the matched files via inventory `paths`. Read the actual
     code; the packet names where it lives, it does not extract it for you.
   - **diff** — what changed.
4. **Report coverage gaps, do not grade them.** If the packet lists an
   `unbridged-file` or `unreferenced-inventory` gap, surface it plainly — that
   is the fingerprint admitting it can't measure there, not a pass.

## The integrity loop (the sprawl audit)

1. Run `ghost-haunt integrity` (or `--json`). The packet is a **map, not a
   payload**: it embeds authored prose (materials, checks, baselines) and
   points at code with glob pointers plus verified match counts — no file
   lists. You explore from the pointers with your own file tools.
2. For each material section, grade against **two baselines**: the stated
   truths (fingerprint prose and check baselines), and the inventory's own
   latent pattern — how the sibling materials solve the same job. Sensing
   that pattern is your job; an outlier finding must name the pattern it
   breaks.
3. Five sprawl axes orient the audit — contract congruence, naming coherence,
   token discipline, variant proliferation, pattern forks — but they are
   orientation, not grading instructions: don't grade what no check covers;
   note it as a gap.
4. Report the packet's gaps plainly: `dead-paths` (a material's globs match
   nothing — the map rotted) and `unreferenced-material` (no check guards it
   against sprawl).
5. Group findings per material, same P0–P3 evidence-cited format as review.

## Two kinds of check

A check's kind falls out of what it references — the packet tags it:

- **structural** (references local `inventory`): often mechanical, close to
  what a linter would catch. Grade against the concrete code fact.
- **high-altitude** (references fingerprint nodes): the signature. There is no
  `pixelmatch` for restraint — these need your reading of intent vs. code.

## Finding format

Lead with the highest-severity findings. For each finding:

- **Severity** — `P0` blocks the primary task or causes severe/unrecoverable
  harm · `P1` likely task failure, misleading consequence, or missing critical
  state · `P2` meaningful friction, weak hierarchy, or inconsistency · `P3` minor
  craft or consistency.
- **Location** — `file:line`, or the material it concerns.
- **Baseline** — the referenced prose it diverges from (e.g.
  `checkout > Density`).
- **Observable** — what the diff does that pulls away from the baseline.
- **Fix** — the smallest coherent change.

If nothing drifts, say so plainly. Do not manufacture findings to fill a report.

## Authoring the package

When asked to set up or update `.haunt/`, see `references/authoring.md`. The one
rule that governs everything: **write observable decisions, not adjectives.**
"Destructive actions use Verb + Noun" is checkable; "buttons should be clear" is
not. Keep code pointers in inventory `paths`, keep brand stance in `.ghost/`
fingerprint nodes, and keep a coverage-gap honest about what you don't yet cover.
