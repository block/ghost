---
status: exploring
---

# ghost ui

## Why it's interesting

ghost-ui is the canonical witness. The other four tools must remain stack-agnostic — they need to work on Cash iOS (Bazel, SwiftUI), Cash Android (Gradle, Compose), and arbitrary one-off web repos. ghost-ui's job is the opposite: lean *all the way in* on the convention, and prove the loop end-to-end. When the system works perfectly somewhere, it should work here.

The opportunity is **registry.json**. Every shadcn registry has it. It already lists components, files, and dependencies. With minimal extension it becomes the universal substrate for component-level expression provenance — and ghost-ui is the place to demonstrate that without coupling other tools to it.

The contract: other tools opportunistically light up component-level features when registry.json is present and well-tended. They never *require* it. Tools see registries and tools see filesystems; ghost-ui makes the registry case sing.

## What ghost-ui adds on top of "shadcn registry library"

A four-layer demonstration:

1. **Ships its own map.md and expression.md at the package root.** These are the canonical fixtures — the example every other repo profiles against, the one CI runs map/expression/drift on.
2. **CI runs map → expression → drift on every PR.** Eats own dog food. If a PR moves the design system without updating expression, drift fails. If map.md goes stale (a new component category appears), map catches it.
3. **Augments registry.json with optional `meta.expression`.** Points at the package's expression.md. Drift consumers can opt into per-component attribution.
4. **Per-component dimension tags.** Each component in registry.json carries an optional `meta.expression_dimensions: [palette, radius]` declaring which design dimensions the component primarily expresses. Drift uses this for higher-confidence attribution.

All four layers are optional from the tool side. Tools degrade gracefully when they're absent. ghost-ui is the place they're maximally present.

## Registry.json extension — opportunistic, not breaking

Today's registry.json is shadcn-shaped. The extension is purely additive metadata under a namespaced key:

```json
{
  "name": "ghost-ui",
  "homepage": "...",
  "items": [
    {
      "name": "button",
      "type": "registry:ui",
      "files": ["components/ui/button.tsx"],
      "meta": {
        "expression": "../expression.md",
        "expression_dimensions": ["palette", "radius", "type-scale"]
      }
    }
  ]
}
```

The shadcn schema doesn't care about `meta`. Other registries (boss-ui, future shadcn variants) can adopt the convention without coordination — same way `keywords` works in `package.json`.

If `meta.expression` is missing, drift falls back to repo-wide compare. If `meta.expression_dimensions` is missing, drift attributes to the component but not to specific dimensions. Pure progressive enhancement.

## CI loop — the demo

A workflow at `.github/workflows/ghost-ci.yml`:

```yaml
on: [pull_request]
jobs:
  ghost:
    steps:
      - uses: actions/checkout@v5
      - run: pnpm install
      - run: ghost map lint map.md
      - run: ghost expression lint expression.md
      - run: ghost drift compare expression.md $(git show main:expression.md) --by-component
      - run: ghost drift emit review-command
```

Ghost-ui is the first repo where this CI workflow runs in production. It becomes the integration test for the whole loop.

## Component-level expression provenance

Each component declares which design dimensions it expresses. `Button` is primarily palette + radius + type-scale. `Card` is primarily surface + spacing. `Tooltip` is primarily contrast + animation.

Why bother: without dimension tags, drift has to guess attribution from file content alone. With them, drift attribution becomes deterministic — a 0.12 palette shift in `Button.tsx` is a strong signal because Button is *declared* to be palette-sensitive. A 0.12 palette shift in `Tooltip.tsx` matters less because Tooltip's declared dimensions don't include palette.

Implementation: a sentinel comment in each component file (`// @ghost-dimensions palette,radius`) that map reads, OR an explicit field in registry.json. Probably both — registry.json is canonical, the comment is convenience.

## Cross-tool implications

| Tool | When ghost-ui's conventions are present |
|---|---|
| **map** | Detects registry.json automatically; surfaces `meta.expression` in map.md.registry. No new code path — just a richer output. |
| **expression** | Profile recipe can read per-component dimension tags as evidence for which dimensions the design language emphasizes. |
| **drift** | `--by-component` mode is fully deterministic; per-dimension attribution becomes high-confidence. |
| **fleet** | Group-by `registry:shadcn` returns the cohort that exposes per-component data; the cohort enables sharper cross-repo analysis. |

None of these *require* the convention. All of them benefit when it's present.

## ghost-mcp implications

The existing `ghost-mcp` server (under `packages/ghost-ui/src/mcp/`) re-exposes the registry to AI assistants. With the conventions above, the MCP can also re-expose:

- The package's expression.md as a resource (so an assistant pulling a Button component also sees the design language it expresses).
- Per-component dimension tags as tool output.

This is the natural extension — the MCP becomes a one-stop registry server: "give me the Button component plus the design language and dimensions it carries."

## Open questions

- **Sidecar vs registry.json `meta`.** Could put expression metadata in a sidecar `ghost.json` at registry root rather than extending registry.json. Sidecar is cleaner separation; `meta` is one fewer file. Probably `meta` — fewer files wins for adoption.
- **Dimension vocabulary.** Current expression.md dimensions are palette / spacing / typography / surfaces. Are those the right tags for components? Probably yes (matches the 49-dim embedding). Worth confirming when ghost-ui's first expression.md is written.
- **Comment sentinel format.** `// @ghost-dimensions palette,radius` is one option. JSDoc tag is another. Probably JSDoc tag for compatibility with existing component doc conventions.
- **CI fail vs report.** Should ghost-ui's CI block on drift, or just report? Lean: block on lint (map + expression must be valid), advisory on drift (report on PR comment, don't fail). Drift signals; humans decide.

## Out of scope

- Coupling other tools to ghost-ui specifically. Anything that requires `meta.expression_dimensions` is wrong; everything that benefits from it when present is right.
- Republishing ghost-ui to npm. Stays registry-distributed via shadcn `add`.
- Renaming or restructuring the existing 97-component library. The conventions are additive metadata, not refactors.
- A "Ghost-flavored shadcn" registry format. The whole point is that shadcn's registry is enough — Ghost just reads it well.

## Next steps

1. Write the canonical `expression.md` for ghost-ui as a fixture (the cleanest, most self-explanatory expression on the planet).
2. Generate the canonical `map.md` for ghost-ui (manual until `ghost map` ships, then regenerate).
3. Add `meta.expression` to the existing registry.json. One field, no breaking changes.
4. Pick 5–10 components, add `meta.expression_dimensions` to each. Validate the dimension vocabulary feels right.
5. Draft the GitHub Actions workflow. Run it on a draft PR end-to-end before announcing.
6. Document the convention in the package README so other registries can adopt — this is the part that turns ghost-ui from "our reference" into "the reference."
