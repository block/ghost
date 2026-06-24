---
status: exploring
---

# ghost ui

> Fingerprint-first context: ghost-ui is reference inventory and evidence for
> fingerprints. It can improve generation and governance, but it is not the
> portable surface-composition contract itself. This is exploratory registry
> metadata, not a public CLI or package split plan.

## Why it's interesting

ghost-ui is the canonical registry witness. Ghost needs to work across Cash iOS
(Bazel, SwiftUI), Cash Android (Gradle, Compose), and arbitrary one-off web
repos, but ghost-ui can lean all the way into the shadcn registry convention and
prove the loop end-to-end. When the registry case works perfectly somewhere, it
should work here.

The opportunity is **registry.json**. Every shadcn registry has it. It already lists components, files, and dependencies. With minimal extension it becomes useful implementation vocabulary for component-level metadata — and ghost-ui is the place to demonstrate that without coupling other tools to it.

The contract: Ghost workflows can opportunistically light up component-level
features when `registry.json` is present and well tended. They never require it.
Tools see registries and filesystems; ghost-ui makes the registry case sing.

## What ghost-ui adds on top of "shadcn registry library"

A three-part demonstration:

1. **Stays a shadcn registry package.** The registry extension is additive and
   does not change the public `.ghost/fingerprint/` package model.
2. **Per-component dimension tags.** Each component in registry.json can carry optional `meta.fingerprint_dimensions: [palette, spacing, typography, surfaces]` declaring which design dimensions the component primarily expresses. Review and comparison workflows can use this for higher-confidence attribution.
3. **Shape-aware exemplar tags.** Examples can distinguish atoms from composed response shapes with optional `meta.exemplar_kind: "atom" | "shape"` and `meta.response_shapes: ["article" | "tracker" | "comparison" | "card"]`. This gives generators a narrow reference set before they compose a freeform answer.

All parts are optional from the tool side. Tools degrade gracefully when they're absent. ghost-ui is the place the registry case is maximally present.

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
        "fingerprint_dimensions": ["palette", "surfaces", "typography"]
      }
    }
  ]
}
```

The shadcn schema doesn't care about `meta`. Other registries (boss-ui, future shadcn variants) can adopt the convention without coordination — same way `keywords` works in `package.json`.

If `meta.fingerprint_dimensions` is missing, drift attributes to the component but not to specific dimensions. Pure progressive enhancement.

For exemplar metadata, `atom` means a primitive control such as badge, button, cell, or input. `shape` means a composed output: article for plans/timelines/worksheets, tracker for metrics/progress/reviews, comparison for tradeoffs/options, and card for compact focused recommendations. Card is one shape, not the default layout for every generated answer.

## CI loop

Ghost UI should exercise the loop through its checked-in fingerprint package and
registry source. Workflows that compare or review another product against
ghost-ui should own their own reports; `packages/ghost-ui` remains the observed
reference target.

## Component-level dimension provenance

Each component declares which design dimensions it expresses. `Button` is primarily palette + radius + type-scale. `Card` is primarily surface + spacing. `Tooltip` is primarily contrast + animation.

Why bother: without dimension tags, review and comparison have to infer
attribution from file content alone. With them, attribution becomes
deterministic: a palette shift in `Button.tsx` is a strong signal because Button
is declared to be palette-sensitive.

Implementation: prefer explicit registry metadata. A source comment such as
`// @ghost-dimensions palette,radius` can be a convenience input, but the
registry remains the durable reference.

## Cross-tool implications

| Workflow | When ghost-ui's conventions are present |
|---|---|
| **Fingerprint authoring** | The agent can read per-component dimension tags as evidence for which dimensions the design language emphasizes. |
| **Review and comparison** | Component-level attribution becomes higher confidence when registry metadata identifies the dimensions a component carries. |
| **Fleet analysis** | Registry-aware cohorts can be compared more precisely when members expose the same metadata convention. |

None of these *require* the convention. All of them benefit when it's present.

## ghost-mcp implications

The existing `ghost-mcp` server (under `packages/ghost-ui/src/mcp/`) re-exposes the registry to AI assistants. With the conventions above, the MCP can also re-expose:

- Per-component dimension tags as tool output.

This is the natural extension: the MCP becomes a focused registry server. For
example, "give me the Button component plus the dimensions it carries."

## Open questions

- **Dimension vocabulary.** Current fingerprint dimensions are palette / spacing / typography / surfaces. Are those the right tags for components? Probably yes, but registry metadata should stay useful even when no package-local fingerprint is present.
- **Comment sentinel format.** `// @ghost-dimensions palette,radius` is one option. JSDoc tag is another. Probably JSDoc tag for compatibility with existing component doc conventions.
- **CI fail vs report.** Should a Ghost UI scan workflow block on drift, or just report? Lean: block on artifact lint where that workflow owns artifacts, advisory on drift (report on PR comment, don't fail). Drift signals; humans decide.

## Out of scope

- Coupling other tools to ghost-ui specifically. Anything that requires `meta.fingerprint_dimensions` is wrong; everything that benefits from it when present is right.
- Republishing ghost-ui to npm. Stays registry-distributed via shadcn `add`.
- Renaming or restructuring the existing 97-component library. The conventions are additive metadata, not refactors.
- A "Ghost-flavored shadcn" registry format. The whole point is that shadcn's registry is enough — Ghost just reads it well.

## Next steps

1. Pick 5–10 components, add `meta.fingerprint_dimensions` to each. Validate the dimension vocabulary feels right.
2. Tag the example catalogue as atoms vs shapes where examples are composed outputs, then validate whether agents select narrower references.
3. Document the convention in the package README so other registries can adopt — this is the part that turns ghost-ui from "our reference" into "the reference."
