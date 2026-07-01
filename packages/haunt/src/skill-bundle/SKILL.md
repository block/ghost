---
name: haunt
description: Grade high-altitude compositional drift against a repo's design fingerprint. Use when reviewing a diff or PR for hierarchy, density, restraint, product-stance, or composition drift that linters can't see — and when authoring or updating a .haunt/ package (tenets, inventory, surfaces, checks).
license: Apache-2.0
metadata:
  cli: haunt
---

# Haunt — Adherence & Drift

Haunt grades **high-altitude compositional drift**: hierarchy collapsing,
density creeping, restraint eroding, product stance slipping — the drift a
linter can't see, a prose tool can't reach, and a stack owner won't police. It
bridges to the design-system code a repo already owns (code is the source of
truth) and checks it against a repo-local `.haunt/` fingerprint.

The CLI does the deterministic work: it assembles the evidence and offers the
checks. **You render the judgment.** Haunt never edits and never grades on its
own — it hands you a packet, you produce findings.

```text
.haunt/
  manifest.yml   # schema + id
  tenets/        # broad principles — the why / the stance. Prose. No paths.
  inventory/     # the materials — prose + `paths` to where they live in code.
  surfaces/      # feature areas — how principles land; honors tenets, uses inventory.
  checks/        # assertions — ground up into tenets/surfaces/inventory.
  exemplars/     # shipped decisions worth repeating.
```

The checked-in `.haunt/` package is the source of truth. Ordinary Git workflow
is the approval boundary: uncommitted changes are drafts, committed changes are
canonical.

## Core CLI Verbs

| Verb | Purpose |
|---|---|
| `haunt validate [--package <dir>]` | Validate the package: shape (flat tiers, no nesting) and the edge graph (`honors`/`uses`/`grounds` resolve). |
| `haunt review [--diff <patch>] [--base <ref>] [--json]` | Emit an advisory review packet from the package and a diff: matched materials, baseline prose, offered checks, coverage gaps, and the diff. |

Diff sources for `review`: `--diff <file>`, `--diff=-` (stdin), or omit to run
`git diff <base>` (default `HEAD`).

## The stance: review reports, it does not edit

`haunt review` is **advisory**. It reports drift as findings against the
fingerprint and never edits code. Two distinct jobs, and you must not blur them:

- **Review** — inspect the packet, report prioritized findings. Do not edit.
- **Fix (harden)** — only when the user asks you to fix. When you do, *preserve
  the settled product direction*: you are closing drift, not redesigning the
  surface. An audit must not silently become a redesign.

## The review loop

1. Run `haunt review` (or `--json` for structured input). The packet already did
   the deterministic routing: diff → inventory (via `paths`) → surfaces (`uses`)
   → tenets (`honors`) → offered checks.
2. **Judge which offered checks apply.** Every check is offered; you decide
   relevance against the diff and the grounded prose. A check that doesn't fit
   this change is skipped, not forced.
3. For each applicable check, grade the drift using the three evidence pieces the
   packet gives you:
   - **baseline** — the grounded tenet/surface prose (the *stated* composition).
   - **observable** — the matched files via inventory `paths`. Read the actual
     code; the packet names where it lives, it does not extract it for you.
   - **diff** — what changed.
4. **Report coverage gaps, do not grade them.** If the packet lists an
   `unbridged-file` or `ungraded-inventory` gap, surface it plainly — that is the
   fingerprint admitting it can't measure there, not a pass.

## Two kinds of check

A check's kind falls out of what it `grounds` in — the packet tags it:

- **structural** (grounds in `inventory`): often mechanical, close to what a
  linter would catch. Grade against the concrete code fact.
- **high-altitude (judgment)** (grounds in `tenets`): the signature. There is no
  `pixelmatch` for restraint — these need your reading of intent vs. code.

## Finding format

Lead with the highest-severity findings. For each finding:

- **Severity** — `P0` blocks the primary task or causes severe/unrecoverable
  harm · `P1` likely task failure, misleading consequence, or missing critical
  state · `P2` meaningful friction, weak hierarchy, or inconsistency · `P3` minor
  craft or consistency.
- **Location** — `file:line`, or the material/surface it concerns.
- **Baseline** — the grounded prose ref it diverges from (e.g.
  `tenets/composition`).
- **Observable** — what the diff does that pulls away from the baseline.
- **Fix** — the smallest coherent change.

If nothing drifts, say so plainly. Do not manufacture findings to fill a report.

## Authoring the fingerprint

When asked to set up or update `.haunt/`, see `references/authoring.md`. The one
rule that governs everything: **write observable decisions, not adjectives.**
"Destructive actions use Verb + Noun" is checkable; "buttons should be clear" is
not. Keep deterministic facts in checks, keep judgment in tenet prose with its
rationale, and keep a coverage-gap honest about what you don't yet cover.
