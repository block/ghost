---
status: parked
---

# Parked: the `ghost.survey/v1` module

This note records a deliberate decision **not** to act. Survey is isolated, works,
and hurts nothing — so it stays, undocumented in the user-facing surface, until
there is a concrete reason to revisit. This note exists so the reasoning is found,
not rediscovered.

## What survey is

`ghost.survey/v1` is a **machine-scan cache** — a `survey.json` a scanner emits
with raw repo observations (sources, value rows, tokens, components,
ui_surfaces). It predates the surface model and is the last surviving piece of
the pre-reset world (same era as `map.md`, `resources.yml`, the old `relay`). It
lives in `packages/ghost/src/ghost-core/survey/` (~14 files).

The `ghost survey <op>` **command** was removed in Phase 8. The **module**
remained because other code still imports it.

## Why it is parked, not removed

The importers split in two:

- **Vestigial (mechanical to cut):** `scan/file-kind.ts` routes `.json` to the
  survey linter; `scan/fingerprint-package.ts` / `scan/constants.ts` carry a
  `survey` path slot; `fingerprint-commands.ts` has leftover refs. These only
  *recognize* survey files.
- **Load-bearing (the real question):** `comparable-fingerprint.ts` reads
  `survey.json` to build comparison input, and `ghost-core/perceptual-prior.ts`
  uses `surveyCount` for presence/absence escalation. So **`ghost compare` may
  depend on survey evidence.**

That makes removal an *excavation*, not a deletion. The open question at its
center:

> Does `ghost compare` still need survey evidence, or can it compare from the
> fingerprint's own `evidence` / `exemplars` alone?

Answering it is a change to how comparison works — its own design call, in a
corner of Ghost (compare / perceptual-prior) the surface reset never touched.
Rushing it would either silently degrade `compare` or invent a new
compare-evidence path without a plan. That violates the read-first-then-cut
discipline that held the whole reset together.

## Stance

- **Not debt.** Survey is isolated and functional; nothing is blocked.
- **Not exposed.** No user-facing command or doc points at it; it is internal
  plumbing only.
- **Surfaced only if a reason appears** — e.g. survey genuinely loses its last
  consumer, or comparison is reworked and the evidence-source question comes up
  on its own.

## If it is ever revisited

First move is a read of `comparable-fingerprint.ts` + `perceptual-prior.ts` to
answer the compare-evidence question. Only then decide whether survey lives
(and is re-justified in the surface world) or is removed (vestigial importers
first, then the load-bearing two, then the module). Do not start by deleting
files.
