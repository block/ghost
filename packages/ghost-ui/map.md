---
schema: ghost.map/v1
id: ghost-ui
repo: block/ghost
mapped_at: 2026-04-27
platform: web
languages:
  - { name: typescript, files: 285, share: 0.93 }
  - { name: css, files: 4, share: 0.05 }
  - { name: javascript, files: 4, share: 0.02 }
build_system: pnpm
package_manifests:
  - package.json
  - tsconfig.json
  - tsconfig.lib.json
  - tsconfig.mcp.json
  - vite.lib.config.ts
  - components.json
composition:
  frameworks:
    - { name: react, version: "19.1.0" }
    - { name: vite, version: "^6.3.0" }
    - { name: tailwindcss, version: "^4.2.2" }
  rendering: react-dom
  styling:
    - tailwindcss-v4
    - css-custom-properties
  navigation: react-router
registry:
  path: ./registry.json
  components: 106
design_system:
  paths:
    - src/styles
    - src/components/theme
    - src/lib
  entry_files:
    - src/styles/main.css
    - src/styles/font-faces.css
    - src/lib/theme-presets.ts
    - src/lib/theme-defaults.ts
    - src/components/theme/ThemeProvider.tsx
  status: active
ui_surface:
  include:
    - "src/components/ui/**"
    - "src/components/ai-elements/**"
    - "src/components/theme/**"
  exclude:
    - "src/mcp/**"
    - "scripts/**"
    - "dist/**"
    - "dist-lib/**"
    - "dist-mcp/**"
    - "**/*.test.ts"
    - "**/*.test.tsx"
feature_areas:
  - name: ui-primitives
    paths: ["src/components/ui"]
    sub_areas: [input, layout, feedback, display, navigation]
  - name: ai-elements
    paths: ["src/components/ai-elements"]
    sub_areas: [chat, agent-state, artifacts]
  - name: theme
    paths: ["src/components/theme", "src/lib/theme-presets.ts", "src/lib/theme-defaults.ts", "src/lib/theme-utils.ts"]
  - name: tokens
    paths: ["src/styles"]
  - name: hooks
    paths: ["src/hooks"]
  - name: registry-tooling
    paths: ["scripts", "registry.json", ".shadcn"]
  - name: mcp-server
    paths: ["src/mcp"]
orientation_files:
  - README.md
  - expression.md
  - registry.json
  - src/styles/main.css
  - src/lib/theme-presets.ts
  - components.json
---

## Identity

`ghost-ui` is the reference design system for the Ghost project — a private, registry-distributed component library that exists so the Ghost loop has a real, evolving system to describe. It ships **106 registry items**: 97 `registry:ui` components (49 shadcn-style UI primitives + 48 AI-native elements), 1 base item, 2 style items, 1 lib item, and 5 theme presets. The package is `private` and is **not published to npm**; consumers `npx shadcn add` against `registry.json` or import the built library locally for workspace linking. The `ghost-mcp` bin (built from `src/mcp/`) ships alongside.

The system is single-design-language (no parallel/legacy theme — the five non-default presets share the base shape) and is the canonical witness for the Ghost five-tool decomposition: `expression.md` lives next to this file, `meta.expression` on registry items declares per-component dimension provenance, and the CI loop in `.github/workflows/ghost-ci.yml` (drafted, gated off) runs map → expression → drift on every PR.

## Topology

**Design system + token resolution** lives in three places, in resolution order: `src/styles/main.css` (the canonical token sheet — primitive `--color-*`, `--radius-*`, `--shadow-*`, `--spacing-*`, `--font-*` declarations plus a `:root` semantic layer and a `.dark` override), `src/lib/theme-presets.ts` (the five non-default preset overrides applied at runtime by writing CSS custom properties), and `src/components/theme/ThemeProvider.tsx` (the React provider that injects preset styles and toggles the `.dark` class). `src/styles/font-faces.css` is intentionally empty — the system ships no bundled fonts and falls back to `system-ui`.

**Customer UI** is everything under `src/components/ui/**`, `src/components/ai-elements/**`, and `src/components/theme/**`. Everything in `src/mcp/**` is excluded (it's the registry-server bin, not user-facing chrome), as is `scripts/**` (registry build scripts). The two component subtrees coexist deliberately: `ui/` is the shadcn-shaped registry surface (each component maps 1:1 to a `registry:ui` item with `target: components/ui/<name>.tsx`), while `ai-elements/` is a parallel set of higher-level surfaces that compose the primitives — same dimension vocabulary, different primary slot. A small number of components in `ui/` (sidebar, chart, sonner) carry product-feature texture rather than pure primitive duty; profilers should sample at least one from each area.

**Feature areas** are organized around shadcn registry categories rather than product surfaces because this is a library, not an application. Within `ui-primitives` the sub-areas (`input`, `layout`, `feedback`, `display`, `navigation`) match shadcn's own taxonomy and the `categories` field on each registry item, so an agent can sample by reading `categories` directly. `ai-elements` splits into chat (conversational primitives), agent-state (reasoning/task/tool surfaces), and artifacts (code, citations, web previews). The `theme` and `tokens` areas are the design system surface; `hooks` is the small set of utility hooks; `registry-tooling` and `mcp-server` are infrastructure agents should not profile for design language.

**Orientation files**, in reading order: `README.md` (one paragraph + use), `expression.md` (the 11 design decisions), `registry.json` (the canonical list of components — note the `meta.expression` and `meta.expression_dimensions` extensions), `src/styles/main.css` (every token in one file), `src/lib/theme-presets.ts` (proves what is themeable), `components.json` (shadcn config, declares `style: ghost` and the path aliases).

## Conventions

- **Component naming.** Files are kebab-case; exports are PascalCase. Compound components are flat exports from a single file (`Card`, `CardHeader`, `CardContent`, …) following shadcn convention.
- **Registry items.** Every UI component has exactly one entry in `registry.json` with `type: registry:ui`, a single `files[].target: components/ui/<name>.tsx`, a `categories: [<one of input/layout/feedback/display/navigation>]`, and the `registryDependencies` it expects (`utils` is universal). AI elements follow the same shape under `components/ai-elements/`.
- **Variant systems.** Components with variants use `class-variance-authority` (`cva`) with named `variants:` blocks; `compoundVariants` for cross-axis combinations. Variants bind to semantic Tailwind classes (`bg-primary`, `text-foreground`), not raw colors.
- **Slot attributes.** Every primitive carries `data-slot="<component-name>"` for runtime introspection; compound parts use `data-slot="<component>-<part>"` (e.g. `card-header`, `card-title`). The MCP server uses these to attribute usage.
- **Path aliases.** `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks` per `components.json`. The `cn` helper from `@/lib/utils` is imported by every variant-bearing component.
- **Token references.** Components reference Tailwind utility classes that map to the CSS custom properties in `src/styles/main.css` via `@theme inline` — never inline hex codes. Custom radii are named (`rounded-pill`, `rounded-card`, `rounded-input`), not numeric.
- **Test layout.** No tests live in this package today (the loop is the test). When tests do appear, the convention should be `<file>.test.tsx` co-located, excluded from the `ui_surface.include` glob.
- **Generated artifacts.** `dist/`, `dist-lib/`, `dist-mcp/`, `.shadcn/skills.md` are build outputs — never edited by hand. `registry.json` is partially regenerated by `scripts/build-base-vars.mjs` (the `cssVars` of `ghost-ui-base`) and `scripts/build-presets.mjs` (`registry:theme` items), but per-item content (including `meta.expression*` extensions) is hand-authored and survives those scripts.
- **MCP exclusion.** `src/mcp/**` is not customer UI — it's the `ghost-mcp` bin built via `tsconfig.mcp.json` to `dist-mcp/`. Profilers and drift comparisons should skip it.
