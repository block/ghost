---
status: exploring
---

# ghost drift

## Why it's interesting

Drift is where Ghost earns its keep. Authoring expressions is upstream work; comparing them under change is what ships. Drift is also the most CI-relevant tool — its dependency surface needs to stay lean (no map, no expression authoring, no fleet) so a CI job can install just `ghost-drift` and get to a verdict fast.

The user's emphasis on **remediation** and **targeting** sharpens the scope. Targeting is `track` — one repo declares another's expression as its reference, and drift becomes "are we drifting from the system we said we follow?" Remediation is the next loop after review: given that drift exists, what's the minimal change that closes the gap?

The biggest unlock is **registry-aware drift**. When map.md surfaces a `registry`, drift can attribute drift to specific components ("`Button.tsx` drifted +0.18 on radius") instead of vague repo-wide vectors. Same composite math, different scope.

## CLI surface

```bash
ghost drift compare a.md b.md                 # pairwise (N=2); --semantic, --temporal
ghost drift compare a.md b.md c.md ...        # composite (N≥3)
ghost drift ack                               # acknowledge drift; reads local expression.md
ghost drift track <expression-uri>            # declare another expression as reference
ghost drift diverge <dimension>               # declare intentional divergence
ghost drift emit review-command               # per-project slash command (or stays in expression)
ghost drift emit context-bundle               # review context for the host agent
```

Six verbs. All deterministic. Compare is the comparison primitive; ack/track/diverge are explicit evolution acts (Invariant 5). Emit derives artifacts.

## Recipes

Lives at `packages/ghost-drift/src/skill-bundle/references/`.

| Recipe | What it does |
|---|---|
| `review.md` | Read PR changes; flag drift against expression.md or tracked reference |
| `verify.md` | Generate → review loop for new UI |
| `remediate.md` | **New.** Given drift output, suggest minimal code changes to close the gap |

Remediation is the new piece. Today review *finds* drift; nothing says what to do about it. Remediate consumes drift output + the offending diff and proposes targeted fixes ("change `--radius-md` from 12px to 8px in `tokens.css` — that resolves 0.14 of the 0.18 radius drift").

## Registry-aware drift

When map.md has `registry`, drift gets a new mode:

```bash
ghost drift compare a.md b.md --by-component
```

Instead of one composite distance, output a per-component breakdown:

```
Button.tsx       0.18  (radius +0.12, palette +0.06)
Card.tsx         0.04  (within tolerance)
Dialog.tsx       0.22  (radius +0.18, spacing +0.04)
Input.tsx        0.02  (within tolerance)
```

The math is the same — embedding compare scoped to the file groups registry.json declares. The difference is attribution. CI can fail on per-component thresholds rather than repo-wide ones, which is what design system maintainers actually want.

Without registry, `--by-component` falls back to feature_areas from map.md (coarser). Without map.md, falls back to today's repo-wide compare. Graceful degradation.

## Targeting as a first-class concept

`track` is currently buried under "evolution." The user's framing — "choosing one expression to target another" — deserves elevation. Targeting:

- One repo declares another expression as reference (`ghost drift track github:block/ghost-ui`).
- Drift compares against that reference automatically on every run.
- The tracked reference is recorded in `.ghost-sync.json` (already exists) — versioned with the repo.
- `ack` records stance ("we acknowledge we drifted, here's why"), `diverge` records intent ("we deliberately differ on radius"). Together they form the governance loop.

Worth a top-level concept doc on Targeting, separate from the verb pages.

## Output artifacts

- **stdout** (default) — human-readable distance summary, exit code 0 / 1 based on threshold.
- **`drift.json`** (`--json`) — structured output for CI consumers.
- **`drift.md`** (`--report`) — narrative report (review recipe writes one of these per PR).

The narrative report is what the host agent attaches to PR comments. Frontmatter (members, distances, clusters) + body (prose summary of what drifted, written by the review recipe).

## Open questions

- **Remediation in drift vs separate tool?** Lean drift — natural follow-on. But if remediation grows complex (codemods, AST-aware fixes), it could split out later.
- **`emit review-command` location.** Could live in expression (artifact derived from expression.md) or drift (it does review work). Mild lean toward expression — the *producer* owns emit. Worth deciding.
- **Per-component thresholds.** Should `.ghost-sync.json` carry per-component drift budgets? Useful but adds config surface. Maybe deferred until real users ask.
- **Temporal vs cross-target.** `compare --temporal` looks at one expression over time. Fleet does cross-target. Is there a third axis (one repo over time × across targets) that wants its own surface? Probably not — fleet `--history` covers it.

## Reality check (post-audit)

After studying the existing implementation, here's what the audit confirmed and what shifted.

**Confirmed by the code:**
- Pairwise vs composite cleanly separable. They share `compareExpressions()` (in `core/embedding/compare.ts`) but otherwise have zero interdependency.
- `ack`/`track`/`diverge` form a tight unit — all three write to `.ghost-sync.json` via `acknowledge()` in `core/evolution/sync.ts`. `track` is `ack` with `stance="accepted"`; `diverge` is `ack` with `stance="diverging"`. Genuinely simple.
- Targeting is already first-class. `SyncManifest.tracks` carries a typed `Target` (`path|url|npm|registry|github|figma|doc-site`); `resolveTrackedExpression()` handles every type.
- Temporal infrastructure exists (`.ghost/history.jsonl` → `computeTemporalComparison()`) and has zero coupling to composite mode.
- `verify.md` recipe has no hidden dependencies on profile or map — purely expression → generation → review loop.
- `review-command` belongs with expression (deterministic over expression.md, no drift logic). Confirmed.

**What shifted:**
- **Embedding belongs in `@ghost/core`, not drift.** It's load-bearing for `compare`, `composite`, and `temporal`, AND fleet's composite leans on the same math. Keeping it inside drift would force fleet to depend on drift, which inverts the dependency graph. Move to shared core.
- **`--by-component` is greenfield.** `Registry`/`RegistryItem` types exist but are not threaded through `compareExpressions()`. New work: thread file-group scope through compare, add the flag, update the JSON output schema. The `review.md` recipe also needs a corresponding file→component mapping update so PR review can speak in component terms.
- **`.ghost-sync.json` does not yet support per-component drift budgets.** Today's schema is `dimensions: Record<string, DimensionAck>` — flat, not nested by component. Per-component budgets need a schema bump (`components: Record<string, Record<string, DimensionAck>>` or similar).
- **Context-bundle is heavier than review-command.** `writeContextBundle()` emits `prompt.md`, `SKILL.md`, `expression.md`, `tokens.css`, optionally `README` — a multi-file package. Review-command is a single slash-command file. Both currently live in `core/context/`. For a lean CI-installable drift, the open question is whether drift packages context-bundle at all or leaves it expression-only. Lean: keep both `emit` verbs in expression; drift gets neither.

## Out of scope

- Authoring expressions (that's expression).
- World model across many repos (that's fleet).
- LLM in CLI (Invariant 1).
- Auto-update on drift (Invariant 5 — drift surfaces signals; humans/agents act on them).
- Hardcoded thresholds — drift reports distance; the consumer picks a threshold.

## Next steps

1. Move embedding math (`core/embedding/`) into `@ghost/core` — it's the dependency root for both drift and fleet.
2. Inventory the rest of `core/` for the drift/expression/`@ghost/core` split. Keep `core/evolution/`, `core/compare.ts`, `core/reporters/` in drift; move `core/expression/`, `core/context/` to expression.
3. Spec `--by-component`: registry-threading through `compareExpressions()`, JSON output schema, and the corresponding file→component mapping in `review.md`.
4. Schema bump for `.ghost-sync.json` to support per-component drift budgets (deferred until a real consumer asks, but design the migration path now).
5. Draft `remediate.md` recipe — input (drift output + diff), output (targeted suggestions).
6. Write the Targeting concept doc as a peer to verb pages.
7. Confirm both `emit review-command` and `emit context-bundle` live in expression, not drift (audit-supported).
