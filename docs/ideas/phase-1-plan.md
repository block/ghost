---
status: exploring
---

# Phase 1 plan: the `ghost.surfaces/v1` schema module

This note is the execution spec for Phase 1 of `implementation-plan.md`. It is
the first line of real code in the surface-model cutover. Phase 1 is **purely
additive**: it introduces a new module and changes no existing behavior, so it
lands green without breaking anything (the breaking line is Phase 3).

Scope is deliberately narrow: schema + types + a thin module export + tests.
**Lint validation (cycles, dangling refs) is Phase 2, not here.** Phase 1 only
proves the shape parses and the basic Zod constraints hold.

## Deliverable

A new module `packages/ghost/src/ghost-core/surfaces/` that mirrors the existing
`ghost-core/fingerprint/` module layout:

```text
ghost-core/surfaces/
  types.ts      # constants, TS interfaces, lint report types
  schema.ts     # Zod schema for surfaces.yml
  index.ts      # public re-exports (mirrors fingerprint/index.ts)
```

Plus a test file `packages/ghost/test/ghost-core/surfaces-schema.test.ts`, and a
one-line addition to `ghost-core/index.ts` re-exporting the new module under a
`// --- Surfaces (ghost.surfaces/v1) ---` section header (matching the existing
section-comment convention).

No CLI wiring, no loader, no consumers. Those are later phases.

## `types.ts`

Constants and interfaces, following `fingerprint/types.ts` conventions exactly.

```ts
export const GHOST_SURFACES_SCHEMA = "ghost.surfaces/v1" as const;
export const GHOST_SURFACES_YML_FILENAME = "surfaces.yml" as const;

// The fixed, Ghost-owned edge vocabulary (surface-schema.md: closed set).
// A code constant, never package data.
export const GHOST_SURFACE_EDGE_KINDS = ["composes", "governed-by"] as const;
export type GhostSurfaceEdgeKind = (typeof GHOST_SURFACE_EDGE_KINDS)[number];

export const GHOST_SURFACE_ROOT_ID = "core" as const;

export interface GhostSurfaceEdge {
  kind: GhostSurfaceEdgeKind;
  to: string;
}

export interface GhostSurface {
  id: string;
  description?: string;
  parent?: string;
  edges?: GhostSurfaceEdge[];
}

export interface GhostSurfacesDocument {
  schema: typeof GHOST_SURFACES_SCHEMA;
  surfaces: GhostSurface[];
}

// Lint report types reuse the fingerprint shape verbatim so Phase 2 and the
// CLI can treat all facet lint reports uniformly.
export type GhostSurfacesLintSeverity = "error" | "warning" | "info";
export interface GhostSurfacesLintIssue {
  severity: GhostSurfacesLintSeverity;
  rule: string;
  message: string;
  path?: string;
}
export interface GhostSurfacesLintReport {
  issues: GhostSurfacesLintIssue[];
}
```

## `schema.ts`

Zod, following `fingerprint/schema.ts` conventions (`.strict()`, slug regex
reused, descriptive error messages).

```ts
import { z } from "zod";
import {
  GHOST_SURFACE_EDGE_KINDS,
  GHOST_SURFACES_SCHEMA,
} from "./types.js";

// Flat slug, NO dots-as-hierarchy. surface-schema.md: the tree lives only in
// `parent`; a dotted id would be a second, conflicting source of truth.
const SurfaceIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, {
    message:
      "surface id must be a flat slug (lowercase alphanumeric plus _ -, no dots; the tree lives in parent)",
  });

const SurfaceEdgeSchema = z
  .object({
    kind: z.enum(GHOST_SURFACE_EDGE_KINDS),
    to: SurfaceIdSchema,
  })
  .strict();

const SurfaceSchema = z
  .object({
    id: SurfaceIdSchema,
    description: z.string().min(1).optional(),
    parent: SurfaceIdSchema.optional(),
    edges: z.array(SurfaceEdgeSchema).optional(),
  })
  .strict();

export const GhostSurfacesSchema = z
  .object({
    schema: z.literal(GHOST_SURFACES_SCHEMA),
    surfaces: z.array(SurfaceSchema).optional().default([]),
  })
  .strict();
```

Note the **deliberate boundary**: the slug regex *excludes the dot* (`.`), which
is what mechanically bans dotted-id hierarchy at the schema layer. That is a
Phase 1 guarantee. Structural rules that need the whole document — parent
references an existing id, no cycles, edge `to` exists, single root — are
**graph-level checks deferred to Phase 2 lint**, because Zod validates a node in
isolation and cannot see the rest of the tree.

## `index.ts`

Mirror `fingerprint/index.ts`: re-export schema, types, and constants. (No lint
export yet — that is Phase 2.)

```ts
export { GhostSurfacesSchema } from "./schema.js";
export {
  GHOST_SURFACE_EDGE_KINDS,
  GHOST_SURFACE_ROOT_ID,
  GHOST_SURFACES_SCHEMA,
  GHOST_SURFACES_YML_FILENAME,
  type GhostSurface,
  type GhostSurfaceEdge,
  type GhostSurfaceEdgeKind,
  type GhostSurfacesDocument,
  type GhostSurfacesLintIssue,
  type GhostSurfacesLintReport,
  type GhostSurfacesLintSeverity,
} from "./types.js";
```

And in `ghost-core/index.ts`, add under a new section comment:

```ts
// --- Surfaces (ghost.surfaces/v1) ---
export {
  GhostSurfacesSchema,
  GHOST_SURFACES_SCHEMA,
  GHOST_SURFACES_YML_FILENAME,
  GHOST_SURFACE_EDGE_KINDS,
  GHOST_SURFACE_ROOT_ID,
  type GhostSurface,
  type GhostSurfaceEdge,
  type GhostSurfaceEdgeKind,
  type GhostSurfacesDocument,
} from "./surfaces/index.js";
```

## Tests

`test/ghost-core/surfaces-schema.test.ts`, following
`fingerprint-yml-schema.test.ts` style. Cases:

- **Accepts** a minimal document (`{ schema, surfaces: [] }`) and defaults
  `surfaces` to `[]` when absent.
- **Accepts** a realistic tree: `core`, `email` (parent `core`),
  `email-marketing` (parent `email`), `checkout` with two typed edges.
- **Rejects** a dotted id (`email.marketing`) with the slug message.
- **Rejects** a parent given as an array (single parent only — falls out of
  `parent` being a scalar; assert the strict parse fails).
- **Rejects** an unknown edge kind (`kind: see-also`).
- **Rejects** an unknown top-level key (`.strict()` guard).
- **Accepts** an edge `to` that does not exist as a surface — and a comment in
  the test notes this is intentionally a **Phase 2 lint** concern, not a schema
  concern. This documents the schema/lint boundary so a future contributor does
  not "fix" it in the wrong layer.

## Acceptance

Phase 1 is done when:

- `pnpm build` and `pnpm typecheck` pass with the new module.
- `pnpm test` passes including the new test file.
- `pnpm check` passes (biome, file-size, terminology, docs, cli-manifest — the
  manifest is unchanged because no CLI command was added).
- `@anarchitecture/ghost/core` exports the new symbols (extend
  `public-exports.test.ts` only if it asserts core symbols; otherwise leave it).
- Nothing in existing behavior changed: no existing file's logic is edited, only
  `ghost-core/index.ts` gains export lines.

## Out of scope (explicitly)

- Lint / graph validation (cycles, dangling parent/edge refs, near-miss ids,
  reserved `core`) → **Phase 2**.
- Loading `surfaces.yml` from disk, CLI `lint`/`verify` wiring → Phase 2+.
- Node `surface:` placement on description facets → **Phase 3** (the breaking
  line).
- Any removal of `topology` / `applies_to` / `ghost.map/v1` → Phase 3–4.

## Commit

One commit: `feat(surfaces): add ghost.surfaces/v1 schema module (additive)`.
No changeset yet — Phase 1 ships no user-visible behavior; the `major` changeset
is assembled across the breaking phases (3+) per `implementation-plan.md`
Phase 0.

## Read-back

Phase 1 succeeds if a contributor can import `GhostSurfacesSchema` from
`@anarchitecture/ghost/core`, parse a valid `surfaces.yml` shape, see dotted ids
and unknown edge kinds rejected at the schema layer, and understand from the
tests exactly which validation is deferred to Phase 2 lint — all without any
existing behavior changing.
