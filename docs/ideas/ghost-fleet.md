---
status: exploring
---

# ghost fleet

## Why it's interesting

Per-repo views answer "is *this* repo drifting?" Fleet answers "what does our design world look like?" The existing `~/Development/ghost-fleet` repo proves the value — 50+ Block frontends, distance matrices, cluster reports — but it's a Block-internal orchestration layer with hardcoded targets and bespoke scripts. The decomposition turns that into a generalized verb anyone can run over their own collection.

The unlock is **two orthogonal axes**: design language (expression) and implementation (map). Drift compare is single-axis (expression). Fleet groups by map — "how do all the SwiftUI repos cluster in expression-space?" "what does the design world look like for shadcn-based registries vs not?" — and that orthogonality is what makes a *world model* rather than a bigger compare.

## What it is — and is not

A read-only **elevation view** over a directory of (map.md, expression.md) members. It does not author, does not update members, does not re-profile. It composes, slices, and renders.

- Composite analysis: pairwise matrix + centroid + clusters across N members.
- Group-by axes from map.md: platform, build_system, registry presence, primary framework, primary styling.
- Tracks-graph: the directed graph of who declares whom as reference (consumes `.ghost-sync.json` per member).
- Temporal: drift across the fleet over time (consumes per-member history).

## Architecture — same skill + CLI split

| Layer | What it does | Where it lives |
|---|---|---|
| `ghost fleet` (skill) | LLM-driven recipe: synthesize the world-model narrative for fleet.md | `packages/ghost-fleet/src/skill-bundle/` |
| `ghost fleet view` (CLI) | Deterministic composite, group-by, tracks-graph, output artifacts | CLI |

The math is deterministic — composite distances, clustering, group-by. The narrative ("Cash family clusters tight; Tidal pulls away on warmth and density; Afterpay sits in its own region") is judgement and lives in the skill. Same split as map/expression.

## CLI surface

```bash
ghost fleet members <dir>                  # list registered members + freshness
ghost fleet view <dir>                     # default world view → fleet.md + fleet.json
ghost fleet view <dir> --groupby platform  # slice by map axis (platform | build_system | registry | rendering | styling)
ghost fleet tracks <dir>                   # render tracks-graph (who-tracks-whom)
ghost fleet temporal <dir>                 # time-series across members
ghost fleet emit skill                     # install skill into host agent
```

Five verbs (six with emit). All read-only. The directory layout fleet expects is one subdirectory per member containing both `map.md` and `expression.md`.

```
fleet/
├── members/
│   ├── cash-android/
│   │   ├── map.md
│   │   └── expression.md
│   ├── cash-ios/
│   │   ├── map.md
│   │   └── expression.md
│   └── ...
└── reports/
    ├── fleet.md
    ├── fleet.json
    └── fleet.tracks.json
```

## fleet.md schema sketch

Mirrors expression.md / map.md — frontmatter (machine) + body (prose).

```yaml
---
schema: ghost.fleet/v1
id: block-frontends
generated_at: 2026-04-27

members:
  - { id: cash-android, platform: android, registry: null, expression_at: 2026-04-26 }
  - { id: cash-ios, platform: ios, registry: null, expression_at: 2026-04-26 }
  - { id: ghost-ui, platform: web, registry: shadcn, expression_at: 2026-04-25 }
  ...

distances:                         # pairwise only — clustering is skill-layer
  - { a: cash-android, b: cash-ios, distance: 0.04 }
  - { a: cash-android, b: ghost-ui, distance: 0.18 }
  ...

tracks:
  - { from: cash-web, to: cash-design-system }
  - { from: dashboard, to: ghost-ui }
  ...

groupings:
  by_platform:
    android: [cash-android]
    ios: [cash-ios]
    web: [cash-web, ghost-ui, dashboard, ...]
  by_registry:
    shadcn: [ghost-ui, dashboard]
    none: [cash-android, cash-ios, ...]
  ...
---

# Note: clusters do not appear in frontmatter. They are a projection the
# skill computes from `distances` + `groupings` and renders into the body.
# Keeping them out of frontmatter matches the prior art's narrow JSON
# (pairwise-only) and avoids freezing a clustering algorithm into the schema.

## World shape
Two-paragraph narrative. Where things cluster, where they spread, what
account axes account for distance. No verdict — distance is data, not blame.

## Cohorts
Per-cluster narrative. What binds each cohort, what an outlier inside it
looks like. (E.g., cash-family is tight on warmth and density but ghost-ui
pulls toward higher contrast.)

## Tracks
Narrative over the tracks-graph. Who declares whom. Where the graph has
loops, leaf nodes, or unexpected references.
```

## Profiling modes — target / module / rollup

The prior art enforces a three-mode profiling pathway that my initial draft elided. It's load-bearing — large federated repos can't be profiled as a whole, and the mode determines both how fleet stores members and how the recipe reasons.

| Mode | When | Output |
|---|---|---|
| **target** (monolithic) | Default. One coherent product or library. | `expression.md` per repo. |
| **module** | Federated repos where one expression can't honestly cover the whole (Cash iOS, Cash Android, Tidal iOS, Rocketship). The repo's map.md lists `feature_areas`; each area gets its own profile pass. | `expression.md` per area. |
| **rollup** | Synthesis pass over modular outputs. Reads all module expressions and writes a repo-level expression that captures both coherence and fragmentation. | One repo-level `expression.md` whose `notes` field declares "synthesized from N modules." |

A modular repo therefore produces N+1 expressions: N module-level + 1 rollup. Both live in fleet's expressions directory side-by-side.

**Implications fleet's CLI must answer:**

- `ghost fleet view` consumes **rollups** by default — they're the repo-level units.
- `--include-modules` widens the view to include module-level expressions as first-class members (useful when asking "where does Cash iOS Banking sit relative to Cash Web?").
- A member's mode must be declared. Likely in map.md frontmatter (`profiling_mode: monolithic | modular`) plus a `modules:` list when modular. Fleet reads that to know which expressions are rollups vs leaves.

**Skill recipe layering:**

The existing prompts assemble from fragments — preamble + cli-usage + manifest-injection + (holistic | module | rollup) guidance + output-format. The fleet world-model skill should mirror that fragment architecture rather than ship one monolithic recipe. Three guidance fragments at minimum: how to reason over targets, modules, and rollups respectively. The neutral-profile invariant depends on getting that calibration right.

## Group-by — the axes that matter

From map.md frontmatter, fleet exposes these axes:

- `platform` — web / ios / android / desktop / flutter
- `build_system` — gradle / bazel / xcode / pnpm / etc.
- `registry` — shadcn / none
- `composition.rendering` — react / swiftui / compose / uikit / ...
- `composition.styling[0]` — primary styling

A given fleet view can stack axes (`--groupby platform,registry`) — useful for finding "all shadcn-based web repos" as a sub-cohort.

## Temporal — fleet history

Each member has its own expression history (in their `.ghost-sync.json` or git). Fleet temporal aggregates: "the fleet's average distance from the centroid drifted +0.04 over Q1." This is the dashboard view design system leadership actually wants.

Stored as `fleet.history.json` keyed by date; the skill renders narrative.

## Open questions

- **Member registration.** `add` verb that pins a snapshot, or just point at a directory of subdirs? Lean directory-based — reproducibility comes from the on-disk state, not a manifest.
- **Live fetch vs snapshot.** When a member's expression-uri is `github:org/repo`, does fleet fetch on every run or rely on a vendored snapshot? Vendored is reproducible; live is current. Probably vendored with a `--refresh` flag.
- **Identity.** Does a fleet have a name and version itself, or is it just a directory of members? Lean named — `ghost.fleet/v1` as schema, fleet ID in frontmatter, so multiple fleets can coexist (Block-frontends, Cash-only, Tidal-only).
- **Visualization.** The existing ghost-fleet has an apps/viz Next.js app. Does that move into ghost-ui? Stay external? Probably external — fleet emits JSON; visualization is a downstream consumer.

## Reality check (post-audit)

After studying `~/Development/ghost-fleet`, here's what the prior art confirmed and what shifted.

**Confirmed:**
- Member-as-elevation read-only over (map.md, expression.md) pairs.
- Group-by axes from map.md (platform, build_system, registry, rendering, styling).
- Tracks-graph belongs in fleet but tracking *relationships* are authored in per-repo `.ghost-sync.json` — fleet just reads them.
- Neutral / equal-weight profile pass is the core invariant. No hierarchy phases.
- Vendored snapshot beats live fetch for reproducibility.
- Visualization stays external (the existing `apps/viz` is a downstream JSON consumer; fleet doesn't own it).

**What shifted:**
- **Three profiling modes (target / module / rollup), not one.** Captured above as its own section. This is the single biggest miss in the original draft.
- **Schema narrows.** Today's `fleet.distances.json` is `{ pairwise: [{a, b, distance}] }` — flat pairwise array, no clusters. Clustering is a skill/viz-layer projection over the matrix, not orchestrator output. My initial schema overspecified `clusters:` in frontmatter; it's been moved to body-only narrative.
- **Layered prompt fragments are the architecture, not a stylistic choice.** Preamble + cli-usage + manifest-injection + (holistic | module | rollup) guidance + output-format. The world-model skill should mirror this layering. A monolithic recipe will conflate the three modes and break the neutral-profile invariant.
- **Mode signaling.** A member's profiling mode (monolithic vs modular) and its module list must be declared somewhere fleet can read deterministically. Likely map.md frontmatter (`profiling_mode`, `modules`). Original draft didn't surface this.
- **CLI contract for modular repos.** `ghost fleet view` consumes rollups by default; `--include-modules` widens. Original draft treated members as atomic.

## Out of scope

- Authoring expressions (that's expression).
- Per-repo drift verdicts (that's drift).
- Mutating members (members are read-only inputs to fleet).
- Live re-profiling (Invariant 5 — fleet shows the world as members declare it; it doesn't refresh members).
- Cross-org snitching — fleet is a tool, not a leaderboard.

## Next steps

1. Spec the `ghost.fleet/v1` schema in detail (pairwise array format, tracks edge type, groupings shape — clusters live in body, not frontmatter).
2. Spec `profiling_mode` + `modules` in map.md frontmatter so fleet can deterministically distinguish leaves from rollups.
3. Decide member directory convention. Existing prior art uses `fleet/v2/expressions/<id>/` for monolithic and `fleet/v2/expressions/<id>_<module>/` for module passes. Worth keeping or formalizing as `members/<id>/modules/<module>/`?
4. Draft the world-model skill as **three layered fragments** (target / module / rollup guidance) plus shared preamble + output-format. Mirror the prior art's fragment architecture.
5. Map the existing `~/Development/ghost-fleet/scripts/fleet-compare.sh` workflow onto the new verb surface to confirm nothing load-bearing is lost.
6. Spec temporal — how per-member history is persisted and aggregated into `fleet.history.json`.
7. Decide the CLI rule for modular repos: `ghost fleet view` consumes rollups by default, `--include-modules` widens. Document on the verb page.
