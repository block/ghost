---
status: settled
---

# Phase 0 — settled decisions

Decisions that unblock the five-tool decomposition. Captured here so worktree agents reference one canonical source rather than scrolling open questions across five plan files.

## Decision 1 — Skill bundle strategy: per-tool, no meta-emit

Each package ships its own `src/skill-bundle/` with `SKILL.md` + `references/`. Each tool's CLI carries its own emit verb (`ghost map emit skill`, `ghost expression emit skill`, etc.). No top-level `ghost emit skill --all`.

Cross-recipe references happen through verb names in prose ("then run `ghost drift ack`"). No hard coupling between bundles.

The `discover.md` and `generate.md` recipes are **dropped from scope** — not migrated, not re-homed. Today's expression skill bundle ships them; the new ones don't.

```
packages/ghost-map/src/skill-bundle/
├── SKILL.md
└── references/
    ├── map.md            # the recipe
    └── schema.md         # condensed map.md spec

packages/ghost-expression/src/skill-bundle/
├── SKILL.md
└── references/
    ├── profile.md        # supports mode: target | module | rollup
    └── schema.md         # condensed expression.md spec

packages/ghost-drift/src/skill-bundle/
├── SKILL.md
└── references/
    ├── review.md
    ├── verify.md
    └── remediate.md      # new

packages/ghost-fleet/src/skill-bundle/
├── SKILL.md
└── references/
    ├── target.md         # the three layered fragments
    ├── module.md
    └── rollup.md
```

## Decision 2 — Package layout

```
ghost/
├── packages/
│   ├── ghost/              # thin meta CLI (verb dispatcher only, no business logic)
│   ├── ghost-core/         # internal @ghost/core; not published
│   ├── ghost-map/          # new
│   ├── ghost-expression/   # new — carries the canonical artifact + emit verbs
│   ├── ghost-drift/        # kept on npm under existing name; contents shrink
│   ├── ghost-fleet/        # new
│   └── ghost-ui/           # private, structurally unchanged
├── apps/
│   └── docs/
└── ...
```

**Rules of the road:**

- `ghost-drift` keeps its npm name (existing consumers don't migrate package.json). Contents shrink to drift-only verbs and recipes.
- `@ghost/core` is the internal shared package. Scoped so it reads as foundational. **Not published** — workspace-only consumption.
- Top-level `ghost` is a thin verb dispatcher (`ghost <verb>` → routes to whichever sub-tool is installed, git/kubectl-style). No bundling, no orchestration.
- pnpm workspaces stays. New packages added to `pnpm-workspace.yaml`.
- Changesets: keep existing ignores (`ghost-ui`, `apps/docs`); add `ghost-core` and `ghost` (both private/non-publishing).

## Migration map

Where each existing module lands.

| Today's location | New home |
|---|---|
| `packages/ghost-drift/src/core/embedding/` | `@ghost/core` |
| `packages/ghost-drift/src/core/expression/` (parse/compose/diff/lint/layout) | `ghost-expression` |
| `packages/ghost-drift/src/core/context/` (review-command, context-bundle generators) | `ghost-expression` |
| `packages/ghost-drift/src/core/evolution/` (sync, history, ack manifest, tracked-expression resolution) | `ghost-drift` |
| `packages/ghost-drift/src/core/compare.ts`, `composite.ts`, `temporal.ts` | `ghost-drift` |
| `packages/ghost-drift/src/core/reporters/` (drift formatters) | `ghost-drift` |
| `packages/ghost-drift/src/target-resolver.ts` | `@ghost/core` |
| `packages/ghost-drift/src/core/config.ts` | `@ghost/core` (only the truly shared parts) |
| `packages/ghost-drift/src/skill-bundle.ts` (loader) | `@ghost/core` (parameterized by source dir) |
| `packages/ghost-drift/src/emit-command.ts` | `ghost-expression` |
| `packages/ghost-drift/src/evolution-commands.ts` | `ghost-drift` |
| `packages/ghost-drift/src/{bin,cli}.ts` | split per package |
| `packages/ghost-drift/src/skill-bundle/references/profile.md`, `schema.md` | `ghost-expression/src/skill-bundle/` |
| `packages/ghost-drift/src/skill-bundle/references/review.md`, `verify.md` | `ghost-drift/src/skill-bundle/` |
| `packages/ghost-drift/src/skill-bundle/references/discover.md`, `generate.md` | **dropped** |

## Breaking-change implication

`ghost-drift` losing `lint`/`describe`/`emit review-command`/`emit context-bundle` from its CLI is a **major version bump** on npm. Plan covered this in `ghost-drift.md`'s Out-of-scope, but worth re-stating: when the migration lands, drift's old verbs print a deprecation message pointing to `ghost-expression`. Hard removal can come in the next major after that.

## Phasing for worktrees

| Phase | Worktrees (parallel within phase) | Why this phase |
|---|---|---|
| **1** | `@ghost/core` extraction · `ghost-map` greenfield · `ghost-ui` conventions | All three mostly additive. Core is greenfield code-move; map is a new package; ui is registry.json metadata + fixtures. Minimal overlap. |
| **2** | `ghost-drift` refactor · `ghost-expression` refactor | Both consume `@ghost/core` from Phase 1. Both touch the existing `ghost-drift` package contents. Land after Phase 1 so the dependency root is stable. |
| **3** | `ghost-fleet` greenfield | Depends on a stable `map.md` schema (Phase 1) and the `mode:` parameter on the profile recipe (Phase 2). Going last avoids re-spec churn. |

Phase 1 worktree scopes are first-deliverable milestones, not full plan implementations. Each plan stays the long-form roadmap; worktrees ship slices.
