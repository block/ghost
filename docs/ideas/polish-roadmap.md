---
status: exploring
---

# Polish roadmap: the four deferred cuts

The cutover (Phases 1–8) is complete. Four items were deliberately parked. They
are **not independent** — a full read shows a dependency chain, and doing them in
the wrong order means rewiring the same consumers twice. This note settles the
order and scopes each as its own cut.

## The dependency finding

- **`review` / `emit` still depend on two legacy things at once:** the
  `validate.yml` checks (`context.checksRaw`) **and** the dormant Job 2 selection
  in `context/entrypoint.ts` (`matchScopes`, `globalFallbackRefs`,
  `appliesTo.scopes/surfaceTypes` — the path-selection made inert in Phase 3).
- **`validate/v1`** is consumed by `review`, `core/check.ts`, `fingerprint-stack`,
  `verify-package`, and the `checks/` module.
- **`survey`** is a large module (`ghost-core/survey/*`) still imported by
  `verify-fingerprint`, `comparable-fingerprint`, `patterns/lint`,
  `perceptual-prior`, `fingerprint-package`, and `file-kind` — far beyond the
  deleted command.
- **External contract references** in bindings are self-contained — they touch
  only the binding schema/lint/resolver, nothing the other three need.

So: **`review`/`emit` sit on top of both `validate` and the dormant entrypoint.**
You cannot cleanly remove `validate/v1` while `review` still emits its checks.
And moving `review`/`emit` onto `gather`/`checks` is what *frees* `validate` and
the dormant entrypoint to be deleted. That dictates the order.

## The order

### Cut A — move `review` / `emit` onto `gather` + `checks` (do first)

The keystone. Until `review` stops consuming `validate.yml` and the Job 2
entrypoint, neither can be removed.

- Rebuild `review` on the surface-native path: resolve the diff's surfaces
  (Phase 7a binding), select governing markdown checks (Cut 3), and ground them
  (Cut 4) — i.e. `review` becomes a formatting wrapper over what `ghost checks`
  already computes, plus the diff. Drop `buildContextEntrypoint` /
  `buildSelectedContext` (the dormant Job 2 path).
- Reframe `emit review-command` to emit from the surface slice
  (`package-review-command.ts` currently builds from the merged/legacy context).
- Decide: keep `review` as a command (advisory packet) or fold it into
  `ghost checks --review`. Recommendation: keep `review` as the human-facing
  advisory command, reimplemented on the new rails; `emit` stays for the
  review-command artifact.
- This is the one with real design in it — the others are deletions.

### Cut B — delete the dormant Job 2 entrypoint (after A)

Once `review` no longer calls `buildContextEntrypoint`, the Job 2 selection
machinery (`matchScopes`, `globalFallbackRefs`, `appliesTo` scoring,
`selected-context`, the `graph.ts` applicability half) has **no live caller**.
Delete it. Keep `graph.ts`'s structure/content half only if something still uses
it; otherwise delete `entrypoint.ts`, `selected-context.ts`, `selection-reasons.ts`
too. The compiler is the worklist.

### Cut C — deprecate / remove `ghost.validate/v1` (after A)

With `review` off `validate.yml`, the only remaining consumers are `core/check.ts`
(the legacy deterministic gate), `verify-package`, and `fingerprint-stack`.
Decide the end state:

- **Option 1 (recommended): keep `ghost check` as the deterministic gate**, but
  stop treating `validate/v1` as the *governance future* — it coexists with
  `ghost.check/v1` markdown checks (deterministic gate vs. agent-evaluated
  review). Document the split; remove nothing.
- **Option 2: full removal** — delete `validate/v1`, the `ghost check` command,
  `checks/` module, and migrate any deterministic checks to markdown. Bigger,
  and loses the only no-LLM gate. Defer unless there is a reason.

Lead with Option 1 (a docs/positioning cut, not a deletion) and only escalate to
Option 2 if you decide deterministic checks have no place.

### Cut D — external contract references in bindings (independent, anytime)

Self-contained; can land before or after the others. Extend `ghost.binding/v1`
`contract:` beyond in-repo `.`:

- Accept an npm package name or a resource id; resolve the referenced contract's
  `surfaces.yml` (npm: from `node_modules`; resource id: a configured resolver).
- Version pinning / stance: `ack` / `track` already model stance toward a moving
  reference — reuse, do not reinvent.
- Lint: relax `binding-contract-unsupported`; validate the reference resolves.
- Scope guard: ship npm-name resolution first; defer arbitrary resource-id
  resolvers to a follow-up if they need host config.

## Sequence summary

```
A (review/emit → gather/checks)   ← keystone; unblocks B and C
├─ B (delete dormant Job 2 entrypoint)
└─ C (validate/v1 positioning, Option 1)
D (external contract refs)        ← independent, anytime
```

Do **A first**, then B and C (either order), and D whenever. Each is its own
plan + build + green commit — no bundling.

## What stays out of scope

- The `ghost-core/survey` module removal is **not** in this roadmap as a near-term
  cut: it is imported by `comparable-fingerprint`, `patterns/lint`,
  `perceptual-prior`, and `verify-fingerprint` — removing it is a deep, separate
  excavation with its own questions (does `compare`/`verify` still need survey
  evidence?). **Flag it; do not sequence it here.** It earns its own investigation
  note when/if survey truly has no consumer.

## Read-back

This roadmap is right if: `review`/`emit` move onto the surface rails first
(Cut A), which frees the dormant Job 2 entrypoint (Cut B) and the `validate/v1`
positioning (Cut C) to follow; external contract references (Cut D) land
independently; and the survey-module removal is explicitly held back as a deeper,
separate excavation rather than rushed in.
