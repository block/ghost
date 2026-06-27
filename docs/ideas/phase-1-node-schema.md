---
status: exploring
---

# Phase 1: the node schema (the keystone)

First build phase after one-road (shipped). Grounded in the current code, not a
greenfield sketch. Read `context-graph.md` (the model) and
`graph-implementation-plan.md` (the sequencing) first; this note is the
execution spec for Phase 1 only.

## Goal and boundary

Define the **node** — the single artifact every fingerprint is made of — as a
schema + types + parser, **in isolation**, with no loader and no consumer
rewiring. The phase is done when:

- a `ghost.node/v1` markdown+frontmatter artifact has a Zod schema and types,
- it parses (reusing the check parser), validates per-node, and round-trips,
- it is unit-tested,
- **nothing else changes** — the existing facet loader, `resolveSurfaceSlice`,
  checks, compare all still compile and pass against the old model.

Phase 1 is additive. The node model lands beside the facet model; the loader
fold (Phase 2) is what switches the system over. This keeps Phase 1 reviewable
and green.

## What a node is (the conformance envelope)

A node is one markdown file: YAML frontmatter + prose body. The frontmatter is
the machinery's handle; the body is design expression (written through the
intent/inventory/composition lenses, which are authorship guidance only — never
schema).

```yaml
---
# REQUIRED
id: checkout/trust-signals     # unique, addressable

# OPTIONAL (defaults keep small scale invisible)
under: checkout                # parent node — the tree + cascade (omitted at root)
relates:                       # lateral links, typed + optional qualifier
  - to: core/trust
    as: reinforces             # reinforces | contrasts | variant  (closed set)
medium: web                    # any | web | email | billboard | slide | voice |
                               #   generated-screen | <custom>   (default: manifest medium)
---
Prose body. The design expression. Intent / inventory / composition are how it
is written, not fields.
```

**Valid iff:** has `id`, parses (frontmatter + body), and `under`/`relates`
targets are well-formed refs. Cross-node resolution (does the target exist? one
root? no cycles?) is **Phase 8 lint** — Zod cannot see other nodes, exactly as
`surfaces.yml` already defers graph rules.

## Decisions locked before writing (from the design thread)

1. **`node` is machinery vocabulary.** Schema id `ghost.node/v1`, types
   `GhostNode*`. Never user-facing prose.
2. **intent/inventory/composition have zero schema footprint.** Free markdown
   body. No conventional headings, no body validation.
3. **One node = one concept**, scaffolded one-file-per-node (a Phase 5 `init`
   concern; the schema is layout-free).
4. **`relates` qualifier vocabulary (closed):** `reinforces`, `contrasts`,
   `variant` to start. `governs`/`projects` are deferred (Scenario D / explicit
   projection) — not in the v1 enum.
5. **`medium` is an open enum** (known media + custom string), single-valued for
   v1 (multi-valued deferred).

## The id grammar (permissive schema, opinionated guidance)

Two existing id rules collide — fingerprint nodes (`SlugIdSchema`) allow dots,
surfaces (`SurfaceIdSchema`) ban them (a dotted id would pretend to be a `parent`
link). The resolution is **not** to pick a stricter grammar. It is to apply the
project philosophy: **conformance is machine-tractability; guidance steers taste;
Git review is the approval boundary — not strict lint.**

- **The tree is `under`, and only `under`.** An id is just a name and carries no
  structural meaning, ever. This is the one principle that actually matters, and
  it holds regardless of the id's characters. So the surfaces concern (an id
  encoding the tree) is dissolved by *contract*, not by banning characters.
- **Schema is permissive:** an id is a non-empty lowercase slug, unique within
  the package. It does not mandate a separator style.
  - Charset: `^[a-z0-9][a-z0-9._-]*$` (lowercase alphanumeric plus `.` `_` `-`).
    Liberal on purpose — a hand-authored id that uses something other than the
    default still validates.
- **Default convention = dashes** (`checkout-trust-signals`). This lives in the
  **skill guidance, `init` scaffolding, and agent authoring** — the things that
  *emit* ids steer to dashes. A human can hand-author otherwise; Git review is
  the check, not an error-level lint rule.
- **No strict style lint.** At most a soft `info` nudge toward the dash
  convention — never an error. (Style-Dictionary move: easy default, flexible
  underneath.)
- **The worked scenarios' ids become dashed:** `checkout/trust-signals` →
  `checkout-trust-signals`, `launch.billboard` → `launch-billboard`. Readable,
  flat, no hierarchy mixing.

Cross-package refs (`@scope/pkg#id`) are **parsed but not resolved** in Phase 1
(resolution is Phase 6). The grammar should *accept* the `package#` prefix so
the schema doesn't reject valid future refs; resolution is a later phase.

## Files to add (all additive, under ghost-core/node/)

```
ghost-core/node/
  types.ts      # GHOST_NODE_SCHEMA, GhostNode, GhostNodeRelation, qualifier enum,
                #   medium type, lint report types (mirror surfaces/check shape)
  schema.ts     # Zod: node frontmatter schema + id/ref grammar
  parse.ts      # parseNode(raw) → { frontmatter, body } reusing parseCheckMarkdown
  serialize.ts  # serializeNode(node) → markdown (round-trip; needed by migrate/init later)
  index.ts      # public surface for the module
```

Reuse, do not duplicate:
- **`parseCheckMarkdown`** (ghost-core/check/parse.ts) is exactly the
  frontmatter+body splitter — lift it to a shared helper or import it directly.
- Mirror the **lint report shape** (`{ issues, errors, warnings, info }`) used by
  surfaces/check/fingerprint so the CLI treats all reports uniformly.

## Schema sketch (ghost.node/v1)

```ts
export const GHOST_NODE_SCHEMA = "ghost.node/v1" as const;

const NodeIdSchema = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/, …)  // permissive slug
const NodeRefSchema = z.string()…                      // [<pkg>#]<id>  (pkg accepted, not resolved)

export const GHOST_NODE_RELATION_KINDS = ["reinforces", "contrasts", "variant"] as const;

const NodeRelationSchema = z.object({
  to: NodeRefSchema,
  as: z.enum(GHOST_NODE_RELATION_KINDS).optional(),   // default: untyped relate
}).strict();

export const GhostNodeFrontmatterSchema = z.object({
  id: NodeIdSchema,
  under: NodeRefSchema.optional(),
  relates: z.array(NodeRelationSchema).optional(),
  medium: z.string().min(1).optional(),               // open enum; lint may warn on unknowns
}).strict();
```

Plus a `parseNode` that returns `{ frontmatter: GhostNodeFrontmatter, body }`
and a thin `lintGhostNode(raw)` that reports per-node (missing id, malformed
ref, unknown qualifier) — graph rules deferred.

## Tests (Phase 1 scope only)

A `test/ghost-core/node-schema.test.ts`:
- valid minimal node (id only) parses and validates.
- id grammar (permissive): accepts `core`, `checkout-trust-signals`, and even
  `email.marketing` (liberal charset); rejects only genuinely malformed ids —
  uppercase, leading separator, empty. No separator-style is an error.
- `relates` qualifier: accepts the three kinds; rejects unknown.
- `under`/`relates` ref grammar: accepts local + `@scope/pkg#id`; rejects
  malformed.
- `medium` optional; arbitrary string accepted.
- round-trip: `serializeNode(parseNode(x)) ≈ x` for a representative node.
- body is preserved verbatim (frontmatter stripped, prose intact).

**No** loader test, **no** gather/checks change — those are later phases.

## Wiring (minimal, additive)

- Export the node module from `ghost-core/index.ts` (new `ghost.node/v1` block).
- Do **not** add it to `file-kind.ts` dispatch yet (that routes lint; wiring it
  in is Phase 2/8 when the loader and lint actually consume nodes). Keep Phase 1
  free of consumer changes.
- `public-exports.test.ts`: add the node module's presence to the export
  assertions only if we expose it on a public subpath now; otherwise defer the
  export-surface decision to when a consumer needs it.

## Explicitly NOT in Phase 1

- The loader fold (Phase 2) — nodes still are not read from disk into the graph.
- Removing the facet schemas/types — they stay until Phase 2 switches the loader.
- `medium` in gather/checks (Phase 3/4).
- Cross-package ref *resolution* (Phase 6) — grammar only.
- Graph-level lint: target-exists, one-root, no-cycles (Phase 8).
- The `surface`→`node` rename of existing symbols — that happens as the loader
  and consumers move (Phase 2+), not in this additive phase.

## Open micro-decisions (decide while building, low stakes)

1. **Lift `parseCheckMarkdown` to a shared `ghost-core/markdown.ts`, or import
   from check?** Lean: lift to shared — both checks and nodes are the same
   envelope; one splitter.
2. **Default `relates.as` — untyped or required?** Lean optional (OKF's untyped
   link is valid; the qualifier is the machinery handle when present).
3. **Should `id` segments cap depth?** Lean no cap; `under` carries hierarchy,
   id is just a name. Lint can warn on absurd depth later.

## Read-back

Phase 1 succeeds if `ghost.node/v1` exists as schema + types + parser +
serializer, validates a node in isolation (id required, permissive lowercase
slug; the tree lives only in `under`; typed-and-optional `relates`; optional
`medium`; `package#` prefix accepted but unresolved), round-trips, is
unit-tested, and the rest of the system is untouched and green. Dashes are the
emitted convention (skill/init/agent), not a lint rule. The keystone is in place
for the Phase 2 loader fold to read nodes into the existing
`GhostFingerprintDocument` graph.
