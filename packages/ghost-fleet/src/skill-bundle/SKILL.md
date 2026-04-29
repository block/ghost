---
name: ghost-fleet
description: Reason about a fleet of design systems — pairwise distances, cohorts, tracks-graph, world-shape narrative. Use when the user has a directory of (map.md, expression.md) members and wants to understand how they relate, where they cluster, who declares whom as reference, or how the fleet's shape should be summarized for design system leadership. Triggers on phrases like "what does our design world look like", "compare these systems as a fleet", "where do our apps cluster", "who tracks whom", "summarize the fleet", "fleet view", or whenever a `fleet/` directory with member subdirectories is being explored.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost-fleet
---

# Ghost Fleet — Reasoning Over Many Members

Fleet is the **elevation view** across many `(map.md, expression.md)` pairs. Per-repo views answer "is this repo drifting?" Fleet answers "what does our design world look like?"

This skill helps you turn the output of `ghost-fleet view` into a **world-model narrative** in the body of `fleet.md`. The CLI is the calculator: pairwise distances, group-by tables, tracks-graph. You give it the prose.

## CLI verbs

| Verb | Purpose |
|---|---|
| `ghost-fleet members <dir>` | List registered members + freshness signal. Use to confirm coverage before view. |
| `ghost-fleet view <dir>` | Compute pairwise distances, group-by tables, tracks-graph; emit `fleet.md` + `fleet.json` into `<dir>/reports/`. |
| `ghost-fleet emit skill` | Install this bundle into a host agent's skill directory. |

Three verbs. Tracks-graph extraction (`tracks`), temporal aggregation (`temporal`), and group-by axis stacking are not yet implemented — the milestone is intentionally narrow. Read [references/target.md](references/target.md) for the reasoning recipe.

## Inputs the CLI expects

A directory shaped like this:

```
fleet/
├── members/
│   ├── <member-id>/
│   │   ├── map.md
│   │   ├── expression.md
│   │   └── .ghost-sync.json   # optional — surfaced as a tracks edge
│   └── ...
└── reports/                    # written by `ghost-fleet view`
    ├── fleet.md
    └── fleet.json
```

Each member is read-only. Fleet does **not** re-profile, refresh, or fetch — Invariant 5 (expressions evolve by deliberate act). If a member is stale, regenerate its `expression.md` in that member's repo and re-run `ghost-fleet view`.

## Workflow — synthesizing fleet.md

When the user asks you to "summarize the fleet" or "produce a world view":

1. Run `ghost-fleet members <dir>` to confirm coverage. Note any rows that aren't `ok` — missing or broken members are worth surfacing.
2. Run `ghost-fleet view <dir>`. This writes `fleet.md` (frontmatter + skeleton body) and `fleet.json` (structured sidecar).
3. Read `fleet.md`. The frontmatter gives you `members`, `distances` (pairwise array), `tracks`, and `groupings` (five axes).
4. Fill in the three required body sections:
   - `## World shape` — the broad picture. Where does the fleet center? How wide is its spread? What axes (palette, spacing, typography, surfaces) account for the largest distances? Distance is data, not blame.
   - `## Cohorts` — the cluster narrative. Read the pairwise array and the groupings. Identify natural cohorts (often: same platform, same registry, or shared design ancestry). Name them. Note outliers inside each cohort and the dimension they pull on.
   - `## Tracks` — narrative over the tracks-graph. Who declares whom as reference? Are there leaves (members nobody tracks)? Loops? Cross-cohort references that warrant attention?
5. Re-read your draft. Confirm the frontmatter and the body do not duplicate each other (Invariant 3 — partition is strict). Numbers belong in frontmatter; interpretation belongs in body.

For the heuristics and reasoning patterns, see [references/target.md](references/target.md).

## What this milestone does not do

- **Modular and rollup profiling.** Fleet currently treats every member as a monolithic target. `references/module.md` and `references/rollup.md` will arrive when the modular profile pathway lands in `ghost-expression`. Until then, federated repos must be profiled as a single rollup expression.
- **Tracks-graph projection beyond the recorded edges.** Fleet emits exactly what each member declared in `.ghost-sync.json`. It does not infer transitive references.
- **Temporal aggregation.** Per-member history aggregation (`fleet.history.json`) is deferred.
- **Axis stacking.** `--groupby platform,registry` and similar filters are deferred to a follow-up.

## Always

- Treat the frontmatter as the ground truth. Distances are numbers; the body is interpretation.
- Use member ids exactly as the CLI emits them. If a member's id changed, that's an authoring concern in the member's `map.md`, not a fleet concern.
- Surface coverage gaps. If `ghost-fleet members` reports `missing` or `error`, name them in your narrative or in the report header — silently dropping a member is dishonest.
- Resolve track edges to member ids when possible. The CLI surfaces whatever the member wrote (a target string, an id, a path); your narrative should clarify whether the edge points at another member or at an external reference.

## Never

- Never re-profile a member from inside the fleet recipe. Members are read-only inputs (Invariant 5).
- Never invent clusters from thin air — anchor every cohort in either the pairwise distances or a group-by axis.
- Never write distances back into the body. Numbers go in frontmatter; the body explains them.
- Never rename a member in the CLI's output. If the id is wrong, fix the member's `map.md` and re-run.
